// ============================================================
// hooks/useOneSignal.ts
// Hook React pour l'intégration officielle OneSignal Web Push
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import OneSignal from 'react-onesignal';
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

  // 1. Initialiser le SDK OneSignal (une seule fois)
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) {
      console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID absente dans le fichier .env.');
      return;
    }

    if (!window.__oneSignalInitialized) {
      window.__oneSignalInitialized = true;
      OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // On utilise notre propre composant PushNotificationBanner UI
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      })
        .then(() => {
          setIsInitialized(true);
          console.log('[OneSignal] SDK initialisé avec succès ✅');

          // Vérifier les permissions et souscriptions actuelles
          setPermission(OneSignal.Notifications.permission);
          setIsSubscribed(!!OneSignal.User.PushSubscription.optedIn);

          // Écouter les changements de permission
          OneSignal.Notifications.addEventListener('change', (permissionChange) => {
            setPermission(permissionChange);
          });

          // Écouter les changements de souscription
          OneSignal.User.PushSubscription.addEventListener('change', (subscriptionChange) => {
            setIsSubscribed(!!subscriptionChange.current.optedIn);
          });
        })
        .catch((err) => {
          const errMsg = String(err?.message || err);
          if (errMsg.includes('SDK already initialized')) {
            setIsInitialized(true);
            return;
          }
          if (errMsg.includes('Can only be used on')) {
            console.warn('[OneSignal] Domaine non autorisé en local (nécessite d\'ajouter localhost dans le dashboard OneSignal) :', errMsg);
            return;
          }
          console.error('[OneSignal] Échec initialisation SDK:', err);
        });
    } else {
      // SDK déjà initialisé (ex: HMR) — récupérer l'état courant
      setIsInitialized(true);
      try {
        setPermission(OneSignal.Notifications.permission);
        setIsSubscribed(!!OneSignal.User.PushSubscription.optedIn);
      } catch (_) {
        // Ignorer si le SDK n'est pas encore prêt
      }
    }
  }, []);

  // 2. Synchroniser l'utilisateur Supabase Auth avec OneSignal (Login / Tags)
  useEffect(() => {
    if (!isInitialized) return;

    if (userId) {
      // Associer le profil Supabase à OneSignal (External ID)
      OneSignal.login(userId).then(() => {
        console.log(`[OneSignal] Utilisateur connecté : ${userId}`);
        if (userRole) {
          OneSignal.User.addTag('role', userRole);
        }
      }).catch((err) => {
        console.warn('[OneSignal] Erreur lors de la connexion utilisateur:', err);
      });
    } else {
      // Déconnexion
      OneSignal.logout().catch(() => {});
    }
  }, [userId, userRole, isInitialized]);

  // 3. Demande d'autorisation de notifications push
  const requestPermission = useCallback(async () => {
    if (!ONESIGNAL_APP_ID) {
      alert("Demandez à l'administrateur de définir VITE_ONESIGNAL_APP_ID dans les variables d'environnement Vercel / .env.");
      return;
    }

    setIsLoading(true);
    try {
      await OneSignal.Notifications.requestPermission();
      const granted = OneSignal.Notifications.permission;
      setPermission(granted);

      if (granted) {
        await OneSignal.User.PushSubscription.optIn();
        setIsSubscribed(true);
        console.log('[OneSignal] Permission accordée et abonnement activé ✅');

        // Facultatif: enregistrer l’ID device dans push_subscriptions
        const pushId = OneSignal.User.PushSubscription.id;
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
