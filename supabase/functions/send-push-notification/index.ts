// ============================================================
// supabase/functions/send-push-notification/index.ts
// Edge Function Supabase pour envoyer des notifications push FCM
// ============================================================
// SECRETS REQUIS (supabase secrets set):
//   FIREBASE_SERVICE_ACCOUNT_JSON  ← JSON du compte de service Firebase
//   VITE_FIREBASE_PROJECT_ID       ← ex: adwallet-7b9bc (optionnel, valeur par défaut ci-dessous)
//
// APPEL DEPUIS UNE AUTRE EDGE FUNCTION OU LE FRONT:
//   await supabase.functions.invoke('send-push-notification', {
//     body: {
//       userId: 'uuid',                  // Un seul utilisateur
//       // OU
//       userIds: ['uuid1', 'uuid2'],     // Plusieurs utilisateurs
//       // OU
//       // broadcast: true,                // Envoyer à tous les tokens FCM enregistrés
//       title: 'SikaAds 🎉',
//       body: 'Votre gain a été validé ! +500 FCFA',
//       icon: '/Web-Icon.png',           // optionnel
//       data: {                          // optionnel, données custom
//         type: 'payout',
//         url: '/#/app/wallet'
//       }
//     }
//   })
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Headers CORS communs — appliqués à TOUTES les réponses ────
// ⚠️ Avant, seule la réponse de succès (200) avait ces headers.
// Un navigateur bloque toute réponse cross-origin sans ces headers,
// même une erreur 400/500 — d'où le net::ERR_FAILED côté front dès
// qu'une branche d'erreur était atteinte.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// ── Obtenir un Access Token OAuth2 depuis le Service Account ──
async function getFirebaseAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  const pemKey = serviceAccount.private_key;
  const pemBody = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Impossible d'obtenir le token OAuth2: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// ── Envoyer une notification FCM à un token ───────────────────
async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  notification: { title: string; body: string; icon?: string },
  data?: Record<string, string>
): Promise<{ success: boolean; invalidToken?: boolean }> {
  const message: Record<string, unknown> = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
      image: notification.icon,
    },
    webpush: {
      notification: {
        icon: notification.icon || '/Web-Icon.png',
        badge: '/Web-Icon.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
      },
      fcm_options: {
        link: data?.url || '/',
      },
    },
  };

  if (data && Object.keys(data).length > 0) {
    message.data = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );

  if (response.ok) {
    return { success: true };
  }

  const errorData = await response.json().catch(() => ({}));
  console.error('[FCM] Erreur envoi:', errorData);

  const errorCode = errorData?.error?.details?.[0]?.errorCode;
  const invalidToken =
    errorCode === 'UNREGISTERED' ||
    errorCode === 'INVALID_ARGUMENT' ||
    response.status === 404;

  return { success: false, invalidToken };
}

// ── Handler principal ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Méthode non autorisée:', req.method);
    return jsonResponse({ error: 'Méthode non autorisée' }, 405);
  }

  try {
    const body = await req.json();
    const {
      userId,
      userIds,
      broadcast,
      title,
      body: messageBody,
      icon,
      data,
    } = body as {
      userId?: string;
      userIds?: string[];
      broadcast?: boolean;
      title: string;
      body: string;
      icon?: string;
      data?: Record<string, string>;
    };

    console.log('[send-push] Requête reçue:', { userId, userIds, broadcast, title });

    if (!title || !messageBody) {
      return jsonResponse({ error: 'title et body sont requis' }, 400);
    }

    const isBroadcast = broadcast === true;
    const targetUserIds: string[] = userIds || (userId ? [userId] : []);
    if (!isBroadcast && targetUserIds.length === 0) {
      return jsonResponse({ error: 'userId ou userIds requis si broadcast n\'est pas activé' }, 400);
    }

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    const projectId = Deno.env.get('VITE_FIREBASE_PROJECT_ID') || 'adwallet-7b9bc';

    if (!serviceAccountJson) {
      console.error('[send-push] FIREBASE_SERVICE_ACCOUNT_JSON non configuré');
      return jsonResponse({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON non configuré' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const query = supabase.from('push_subscriptions').select('id, fcm_token');
    const subscriptionsQuery = isBroadcast ? query : query.in('userId', targetUserIds);
    const { data: subscriptions, error: dbError } = await subscriptionsQuery;

    if (dbError) {
      console.error('[send-push] Erreur DB:', dbError);
      return jsonResponse({ error: dbError.message }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] Aucun token FCM trouvé', isBroadcast ? 'pour un broadcast global' : 'pour ces utilisateurs');
      return jsonResponse({ sent: 0, message: 'Aucun token FCM trouvé' }, 200);
    }

    const accessToken = await getFirebaseAccessToken(serviceAccountJson);

    const invalidTokenIds: string[] = [];
    let sentCount = 0;

    await Promise.all(
      subscriptions.map(async (sub: { id: string; fcm_token: string }) => {
        const result = await sendFcmNotification(
          accessToken,
          projectId,
          sub.fcm_token,
          { title, body: messageBody, icon },
          data
        );

        if (result.success) {
          sentCount++;
        } else if (result.invalidToken) {
          invalidTokenIds.push(sub.id);
        }
      })
    );

    if (invalidTokenIds.length > 0) {
      console.log(`[send-push] Nettoyage de ${invalidTokenIds.length} tokens expirés`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', invalidTokenIds);
    }

    return jsonResponse(
      {
        sent: sentCount,
        total: subscriptions.length,
        expired_cleaned: invalidTokenIds.length,
      },
      200
    );
  } catch (error) {
    console.error('[send-push] Erreur inattendue:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      500
    );
  }
});
