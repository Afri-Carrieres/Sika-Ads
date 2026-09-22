// ============================================================
// services/onesignalService.ts
// Service d'envoi de notifications push via OneSignal API / Edge Functions
// ============================================================

import { supabase } from '../supabase';

export interface PushNotificationPayload {
  title: string;
  message: string;
  url?: string;
  segment?: 'Total Subscriptions' |'Ambassadors';
  targetUserIds?: string[];
  scheduleDelayHours?: number;
}

/**
 * Envoie une notification push globale ou ciblée via l'Edge Function Supabase 'send-onesignal-push'
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await supabase.functions.invoke('send-onesignal-push', {
      body: payload,
    });

    if (response.error) {
      console.error('[OneSignal Service] Erreur Edge Function:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('[OneSignal Service] Notification envoyée avec succès:', response.data);
    return { success: true, data: response.data };
  } catch (err: any) {
    console.error('[OneSignal Service] Exception lors de l\'envoi:', err);
    return { success: false, error: err.message || 'Erreur d\'envoi push' };
  }
}

/**
 * Alerte automatique à tous les ambassadeurs lorsqu'une nouvelle campagne est activée par l'admin
 */
export async function sendCampaignActivatedPush(campaignTitle: string, campaignId: string): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '🚀 Nouvelle Campagne Disponible !',
    message: `La campagne "${campaignTitle}" est maintenant active. Partagez-la vite pour générer des gains !`,
    url: `https://www.sika-ads.com/app/marketplace`,
    segment: 'Total Subscriptions',
  };

  await sendPushNotification(payload);
}

/**
 * Rappel automatique à un utilisateur pour soumettre sa preuve de partage avant la fin des 24h
 */
export async function sendProofReminderPush(userId: string, campaignTitle: string, hoursRemaining: number = 4): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '⏰ Rappel Preuve de Partage (Urgent)',
    message: `Il vous reste environ ${hoursRemaining}h pour soumettre votre preuve pour "${campaignTitle}" et valider vos gains !`,
    url: `https://www.sika-ads.com/app/task-history`,
    targetUserIds: [userId],
  };

  await sendPushNotification(payload);
}
