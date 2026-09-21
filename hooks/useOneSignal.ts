// ============================================================
// hooks/useOneSignal.ts
// Hook React pour l'intégration officielle OneSignal Web Push
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface UseOneSignalOptions {
  userId: string | null;
  userRole?: string;
}

interface UseOneSignalReturn {
  isInitialized: boolean;
  permission: boolean; // true si accordé
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
}

const ONESIGNAL_APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID as string) || '';

// Utiliser window pour survivre aux rechargements HMR (évite "SDK already initialized")
declare global {
  interface Window {
    __oneSignalInitialized?: boolean;
  }
}

export function useOneSignal({ userId, userRole }: UseOneSignalOptions): UseOneSignalReturn {
  const [isInitialized, setIsInitialized] = useState(!!window.__oneSignalInitialized);
  const [permission, setPermission] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initialiser le SDK OneSignal via OneSignalDeferred (recommandé v16)
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) {
      console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID absente dans le fichier .env.');
      return;
    }

    if (!window.__oneSignalInitialized) {
      window.__oneSignalInitialized = true;
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (os: any) => {
        try {
          await os.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/onesignal/' },
          });

          setIsInitialized(true);
          console.log('[OneSignal] SDK initialisé avec succès ✅');

          setPermission(os.Notifications?.permission ?? false);
          setIsSubscribed(!!os.User?.PushSubscription?.optedIn);

          os.Notifications?.addEventListener('change', (permissionChange: boolean) => {
            setPermission(permissionChange);
          });

          os.User?.PushSubscription?.addEventListener('change', (subscriptionChange: any) => {
            setIsSubscribed(!!subscriptionChange.current.optedIn);
          });
        } catch (err: any) {
          const errMsg = String(err?.message || err);
          if (errMsg.includes('SDK already initialized')) {
            setIsInitialized(true);
            return;
          }
          if (errMsg.includes('Can only be used on')) {
            console.warn('[OneSignal] Domaine non autorisé en local (ajouter localhost dans le dashboard OneSignal) :', errMsg);
            return;
          }
          console.error('[OneSignal] Échec initialisation SDK:', err);
        }
      });
    } else {
      setIsInitialized(true);
      if (window.OneSignal) {
        try {
          setPermission(window.OneSignal.Notifications?.permission ?? false);
          setIsSubscribed(!!window.OneSignal.User?.PushSubscription?.optedIn);
        } catch (_) {}
      }
    }
  }, []);

  // 2. Synchroniser l'utilisateur Supabase Auth avec OneSignal (Login / Tags)
  useEffect(() => {
    if (!isInitialized) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (os: any) => {
      if (userId) {
        try {
          await os.login(userId);
          console.log(`[OneSignal] Utilisateur connecté : ${userId}`);
          if (userRole) {
            os.User?.addTag('role', userRole);
          }
        } catch (err) {
          console.warn('[OneSignal] Erreur lors de la connexion utilisateur:', err);
        }
      } else {
        try {
          await os.logout();
        } catch (_) {}
      }
    });
  }, [userId, userRole, isInitialized]);

  // 3. Demande d'autorisation de notifications push
  const requestPermission = useCallback(async () => {
    if (!ONESIGNAL_APP_ID) {
      alert("Demandez à l'administrateur de définir VITE_ONESIGNAL_APP_ID dans les variables d'environnement Vercel / .env.");
      return;
    }

    setIsLoading(true);
    try {
      const os = window.OneSignal;
      if (os?.Notifications) {
        await os.Notifications.requestPermission();
        const granted = os.Notifications.permission;
        setPermission(granted);

        if (granted) {
          await os.User?.PushSubscription?.optIn();
          setIsSubscribed(true);
          console.log('[OneSignal] Permission accordée et abonnement activé ✅');

          const pushId = os.User?.PushSubscription?.id;
          if (userId && pushId) {
            await supabase.from('push_subscriptions').upsert(
              {
                userId,
                fcm_token: pushId,
                device_info: navigator.userAgent.substring(0, 200),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'fcm_token' }
            );
          }
        }
      }
    } catch (err) {
      console.error('[OneSignal] Erreur lors de la demande de permission:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    isInitialized,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
  };
}
