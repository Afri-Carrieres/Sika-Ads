// ============================================================
// supabase/functions/send-push-notification/index.ts
// Edge Function Supabase pour envoyer des notifications push Web Push
// ============================================================
// SECRETS REQUIS (Supabase secrets):
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT (optionnel, ex: mailto:contact@sikaads.tg)
//
// APPEL DEPUIS UNE AUTRE EDGE FUNCTION OU LE FRONT :
//   await supabase.functions.invoke('send-push-notification', {
//     body: {
//       userId: 'uuid',
//       // OU
//       userIds: ['uuid1', 'uuid2'],
//       // OU
//       broadcast: true,
//       title: 'SikaAds 🎉',
//       body: 'Votre gain a été validé ! +500 FCFA',
//       icon: '/Web-Icon.png',
//       data: {
//         type: 'payout',
//         url: '/#/app/wallet'
//       }
//     }
//   })
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@sikaads.tg';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function parseSubscription(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.endpoint) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

async function sendWebPushNotification(
  subscriptionPayload: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<{ success: boolean; invalidSubscription?: boolean }> {
  try {
    await webpush.sendNotification(subscriptionPayload as never, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number; status?: number }).statusCode
      ?? (error as { statusCode?: number; status?: number }).status
      ?? 0;

    const invalidSubscription = statusCode === 404 || statusCode === 410 || statusCode === 400;
    return { success: false, invalidSubscription };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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

    if (!title || !messageBody) {
      return jsonResponse({ error: 'title et body sont requis' }, 400);
    }

    const isBroadcast = broadcast === true;
    const targetUserIds: string[] = userIds || (userId ? [userId] : []);
    if (!isBroadcast && targetUserIds.length === 0) {
      return jsonResponse({ error: 'userId ou userIds requis si broadcast n\'est pas activé' }, 400);
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('[send-push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurés');
      return jsonResponse({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurés' }, 500);
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
      return jsonResponse({ sent: 0, message: 'Aucun abonnement Web Push trouvé' }, 200);
    }

    const invalidSubscriptionIds: string[] = [];
    let sentCount = 0;

    await Promise.all(
      subscriptions.map(async (sub: { id: string; fcm_token: string }) => {
        const parsedSubscription = parseSubscription(sub.fcm_token);
        if (!parsedSubscription) {
          invalidSubscriptionIds.push(sub.id);
          return;
        }

        const payload = {
          title,
          body: messageBody,
          icon: icon || '/Web-Icon.png',
          data: data || {},
        };

        const result = await sendWebPushNotification(parsedSubscription, payload);
        if (result.success) {
          sentCount += 1;
        } else if (result.invalidSubscription) {
          invalidSubscriptionIds.push(sub.id);
        }
      })
    );

    if (invalidSubscriptionIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', invalidSubscriptionIds);
    }

    return jsonResponse(
      {
        sent: sentCount,
        total: subscriptions.length,
        expired_cleaned: invalidSubscriptionIds.length,
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
