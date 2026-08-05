

// ============================================================
// hooks/usePushNotifications.ts
// Gestion des notifications push Web Push natif (sans Firebase)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsOptions {
  userId: string | null;
}

interface UsePushNotificationsReturn {
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function usePushNotifications({ userId }: UsePushNotificationsOptions): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PushPermissionState);
  }, []);

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    if (!userId) return;

    const deviceInfo = navigator.userAgent.substring(0, 200);
    const payload = JSON.stringify(subscription.toJSON());

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          userId,
          fcm_token: payload,
          device_info: deviceInfo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'fcm_token' }
      );

    if (error) {
      console.error('[WebPush] Erreur d\'enregistrement:', error.message);
      return;
    }

    console.log('[WebPush] Abonnement enregistré ✅');
    setIsSubscribed(true);
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (!userId) return;
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('[WebPush] VITE_VAPID_PUBLIC_KEY manquante dans le .env — impossible de continuer.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== 'granted') {
        console.log('[WebPush] Permission refusée:', result);
        return;
      }

      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription
        ? existingSubscription
        : await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });

      await saveSubscription(subscription);
    } catch (error) {
      console.error('[WebPush] Erreur lors de la demande de permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('userId', userId);

      setIsSubscribed(false);
      setPermission('default');
    } catch (error) {
      console.error('[WebPush] Erreur lors du désabonnement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { permission, isSubscribed, isLoading, requestPermission, unsubscribe };
}


