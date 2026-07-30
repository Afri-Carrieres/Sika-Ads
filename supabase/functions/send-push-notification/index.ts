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
      title,
      body: messageBody,
      icon,
      data,
    } = body as {
      userId?: string;
      userIds?: string[];
      title: string;
      body: string;
      icon?: string;
      data?: Record<string, string>;
    };

    console.log('[send-push] Requête reçue:', { userId, userIds, title });

    if (!title || !messageBody) {
      return jsonResponse({ error: 'title et body sont requis' }, 400);
    }

    const targetUserIds: string[] = userIds || (userId ? [userId] : []);
    if (targetUserIds.length === 0) {
      return jsonResponse({ error: 'userId ou userIds requis' }, 400);
    }

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    const projectId = Deno.env.get('VITE_FIREBASE_PROJECT_ID') || 'adwallet-7b9bc';

    if (!serviceAccountJson) {
      console.error('[send-push] FIREBASE_SERVICE_ACCOUNT_JSON non configuré');
      return jsonResponse({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON non configuré' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('id, fcm_token')
      .in('userId', targetUserIds);

    if (dbError) {
      console.error('[send-push] Erreur DB:', dbError);
      return jsonResponse({ error: dbError.message }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] Aucun token FCM trouvé pour ces utilisateurs');
      return jsonResponse({ sent: 0, message: 'Aucun token FCM trouvé pour ces utilisateurs' }, 200);
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



// // ============================================================
// // supabase/functions/send-push-notification/index.ts
// // Edge Function Supabase pour envoyer des notifications push FCM
// // ============================================================
// // SECRETS REQUIS (supabase secrets set):
// //   FIREBASE_SERVICE_ACCOUNT_JSON  ← JSON du compte de service Firebase
// //
// // APPEL DEPUIS UNE AUTRE EDGE FUNCTION:
// //   await supabase.functions.invoke('send-push-notification', {
// //     body: {
// //       userId: 'uuid',                  // Un seul utilisateur
// //       // OU
// //       userIds: ['uuid1', 'uuid2'],     // Plusieurs utilisateurs
// //       title: 'SikaAds 🎉',
// //       body: 'Votre gain a été validé ! +500 FCFA',
// //       icon: '/Web-Icon.png',           // optionnel
// //       data: {                          // optionnel, données custom
// //         type: 'payout',
// //         url: '/#/app/wallet'
// //       }
// //     }
// //   })
// // ============================================================

// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// // ── Obtenir un Access Token OAuth2 depuis le Service Account ──
// async function getFirebaseAccessToken(serviceAccountJson: string): Promise<string> {
//   const serviceAccount = JSON.parse(serviceAccountJson);

//   const now = Math.floor(Date.now() / 1000);
//   const payload = {
//     iss: serviceAccount.client_email,
//     sub: serviceAccount.client_email,
//     aud: 'https://oauth2.googleapis.com/token',
//     iat: now,
//     exp: now + 3600,
//     scope: 'https://www.googleapis.com/auth/firebase.messaging',
//   };

//   // Créer le JWT signé avec la clé privée RSA du service account
//   const header = { alg: 'RS256', typ: 'JWT' };
//   const base64url = (obj: object) =>
//     btoa(JSON.stringify(obj))
//       .replace(/\+/g, '-')
//       .replace(/\//g, '_')
//       .replace(/=/g, '');

//   const signingInput = `${base64url(header)}.${base64url(payload)}`;

//   // Importer la clé privée PEM
//   const pemKey = serviceAccount.private_key;
//   const pemBody = pemKey
//     .replace('-----BEGIN PRIVATE KEY-----', '')
//     .replace('-----END PRIVATE KEY-----', '')
//     .replace(/\s+/g, '');
//   const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

//   const cryptoKey = await crypto.subtle.importKey(
//     'pkcs8',
//     keyDer,
//     { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
//     false,
//     ['sign']
//   );

//   const signature = await crypto.subtle.sign(
//     'RSASSA-PKCS1-v1_5',
//     cryptoKey,
//     new TextEncoder().encode(signingInput)
//   );

//   const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
//     .replace(/=/g, '');

//   const jwt = `${signingInput}.${signatureB64}`;

//   // Échanger le JWT contre un Access Token Google OAuth2
//   const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: new URLSearchParams({
//       grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
//       assertion: jwt,
//     }),
//   });

//   const tokenData = await tokenResponse.json();
//   if (!tokenData.access_token) {
//     throw new Error(`Impossible d'obtenir le token OAuth2: ${JSON.stringify(tokenData)}`);
//   }

//   return tokenData.access_token;
// }

// // ── Envoyer une notification FCM à un token ───────────────────
// async function sendFcmNotification(
//   accessToken: string,
//   projectId: string,
//   fcmToken: string,
//   notification: { title: string; body: string; icon?: string },
//   data?: Record<string, string>
// ): Promise<{ success: boolean; invalidToken?: boolean }> {
//   const message: Record<string, unknown> = {
//     token: fcmToken,
//     notification: {
//       title: notification.title,
//       body:  notification.body,
//       image: notification.icon,
//     },
//     webpush: {
//       notification: {
//         icon:  notification.icon || '/Web-Icon.png',
//         badge: '/Web-Icon.png',
//         vibrate: [200, 100, 200],
//         requireInteraction: false,
//       },
//       fcm_options: {
//         link: data?.url || '/',
//       },
//     },
//   };

//   // Convertir toutes les valeurs data en string (exigence FCM)
//   if (data && Object.keys(data).length > 0) {
//     message.data = Object.fromEntries(
//       Object.entries(data).map(([k, v]) => [k, String(v)])
//     );
//   }

//   const response = await fetch(
//     `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
//     {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ message }),
//     }
//   );

//   if (response.ok) {
//     return { success: true };
//   }

//   const errorData = await response.json().catch(() => ({}));
//   console.error('[FCM] Erreur envoi:', errorData);

//   // Détecter les tokens invalides/expirés pour nettoyage
//   const errorCode = errorData?.error?.details?.[0]?.errorCode;
//   const invalidToken =
//     errorCode === 'UNREGISTERED' ||
//     errorCode === 'INVALID_ARGUMENT' ||
//     response.status === 404;

//   return { success: false, invalidToken };
// }

// // ── Handler principal ─────────────────────────────────────────
// Deno.serve(async (req: Request) => {
//   // CORS
//   if (req.method === 'OPTIONS') {
//     return new Response(null, {
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       },
//     });
//   }

//   if (req.method !== 'POST') {
//     return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405 });
//     console.log("Méthode non autorisée");
    
//   }

//   try {
//     // Récupérer les paramètres
//     const body = await req.json();
//     const {
//       userId,
//       userIds,
//       title,
//       body: messageBody,
//       icon,
//       data,
//     } = body as {
//       userId?: string;
//       userIds?: string[];
//       title: string;
//       body: string;
//       icon?: string;
//       data?: Record<string, string>;
//     };

//     // Valider les champs requis
//     if (!title || !messageBody) {
//       return new Response(
//         JSON.stringify({ error: 'title et body sont requis' }),
//         { status: 400 }
//       );
//     }

//     const targetUserIds: string[] = userIds || (userId ? [userId] : []);
//     if (targetUserIds.length === 0) {
//       return new Response(
//         JSON.stringify({ error: 'userId ou userIds requis' }),
//         { status: 400 }
//       );
//     }

//     // Récupérer les secrets Firebase
//     const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
//     const projectId = Deno.env.get('VITE_FIREBASE_PROJECT_ID') || 'adwallet-7b9bc';

//     if (!serviceAccountJson) {
//       return new Response(
//         JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON non configuré' }),
//         { status: 500 }
//       );
//     }

//     // Client Supabase avec service_role pour lire push_subscriptions
//     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

//     // Récupérer les tokens FCM des utilisateurs ciblés
//     const { data: subscriptions, error: dbError } = await supabase
//       .from('push_subscriptions')
//       .select('id, fcm_token')
//       .in('userId', targetUserIds);

//     if (dbError) {
//       console.error('[send-push] Erreur DB:', dbError);
//       return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
//     }

//     if (!subscriptions || subscriptions.length === 0) {
//       console.log('[send-push] Aucun token FCM trouvé pour ces utilisateurs');
//       return new Response(
//         JSON.stringify({ sent: 0, message: 'Aucun token FCM trouvé pour ces utilisateurs' }),
//         { status: 200 }
//       );
//     }

//     // Obtenir le token OAuth2 Firebase
//     const accessToken = await getFirebaseAccessToken(serviceAccountJson);

//     // Envoyer les notifications + collecter les tokens invalides
//     const invalidTokenIds: string[] = [];
//     let sentCount = 0;

//     await Promise.all(
//       subscriptions.map(async (sub: { id: string; fcm_token: string }) => {
//         const result = await sendFcmNotification(
//           accessToken,
//           projectId,
//           sub.fcm_token,
//           { title, body: messageBody, icon },
//           data
//         );

//         if (result.success) {
//           sentCount++;
//         } else if (result.invalidToken) {
//           invalidTokenIds.push(sub.id);
//         }
//       })
//     );

//     // Nettoyer les tokens invalides/expirés
//     if (invalidTokenIds.length > 0) {
//       console.log(`[send-push] Nettoyage de ${invalidTokenIds.length} tokens expirés`);
//       await supabase
//         .from('push_subscriptions')
//         .delete()
//         .in('id', invalidTokenIds);
//     }

//     return new Response(
//       JSON.stringify({
//         sent: sentCount,
//         total: subscriptions.length,
//         expired_cleaned: invalidTokenIds.length,
//       }),
//       {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*',
//         },
//       }
//     );

//   } catch (error) {
//     console.error('[send-push] Erreur inattendue:', error);
//     return new Response(
//       JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' }),
//       { status: 500 }
//     );
//   }
// });
