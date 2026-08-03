

// ============================================================
// hooks/usePushNotifications.ts
// Gestion complète des notifications push FCM
// ============================================================
// Fonctionnalités :
//  - Demande la permission Notification au navigateur
//  - Récupère le token FCM (lié au navigateur + VAPID key)
//  - Enregistre / met à jour le token dans Supabase (push_subscriptions)
//  - Supprime le token lors de la déconnexion
//  - Retourne le statut permission pour le composant UI
// ============================================================
 
import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getFirebaseMessaging, getFirebaseSwRegistration } from '../config/firebase';
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
 
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
 
export function usePushNotifications({ userId }: UsePushNotificationsOptions): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
 
  // ── Initialisation : lire la permission actuelle du navigateur ──
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
  }, []);
 
  // ── Écoute des messages quand l'app est au premier plan ──────
  useEffect(() => {
    if (!userId) return;
 
    let unsubForeground: (() => void) | null = null;
 
    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
 
      unsubForeground = onMessage(messaging, (payload) => {
        console.log('[FCM] Message au premier plan:', payload);
        // Les notifications au premier plan ne s'affichent pas automatiquement.
        // Elles sont gérées par les toasts dans App.tsx via Supabase Realtime.
        // Ici on peut éventuellement déclencher un toast custom si besoin.
      });
    })();
 
    return () => {
      if (unsubForeground) unsubForeground();
    };
  }, [userId]);
 
  // ── Sauvegarder le token FCM dans Supabase ───────────────────
  const saveFcmToken = useCallback(async (token: string) => {
    if (!userId) return;
 
    const deviceInfo = navigator.userAgent.substring(0, 200);
 
    // Upsert : si le token existe déjà (même navigateur), mettre à jour
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { userId, fcm_token: token, device_info: deviceInfo, updated_at: new Date().toISOString() },
        { onConflict: 'fcm_token' }
      );
 
    if (error) {
      console.error('[FCM] Erreur enregistrement token:', error.message);
    } else {
      console.log('[FCM] Token enregistré ✅');
      setIsSubscribed(true);
    }
  }, [userId]);
 
  // ── Demander la permission + récupérer le token FCM ──────────
  const requestPermission = useCallback(async () => {
    if (!userId) return;
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }
 
    if (!VAPID_KEY) {
      console.error('[FCM] VITE_FIREBASE_VAPID_KEY manquante dans le .env — impossible de continuer.');
      return;
    }
 
    setIsLoading(true);
    try {
      // 1. Demander la permission au navigateur
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
 
      if (result !== 'granted') {
        console.log('[FCM] Permission refusée:', result);
        return;
      }
 
      // 2. Obtenir une instance Firebase Messaging
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.warn('[FCM] Firebase Messaging non supporté sur ce navigateur.');
        setPermission('unsupported');
        return;
      }
 
      // 3. Récupérer la registration du service worker FCM.
      //    ⚠️ On n'utilise PLUS navigator.serviceWorker.ready ici :
      //    cette promesse ne se résout que si un SW a déjà pris le contrôle
      //    de la page, ce qui n'arrive jamais tant qu'aucun SW n'est
      //    enregistré → c'est ce qui causait le blocage infini.
      //    getFirebaseSwRegistration() enregistre le SW explicitement et
      //    résout dès que l'enregistrement est prêt.
      const registration = await getFirebaseSwRegistration();
      if (!registration) {
        console.error('[FCM] Impossible d\'enregistrer le service worker (voir public/firebase-messaging-sw.js).');
        return;
      }
 
      // 4. Récupérer le token FCM (nécessite HTTPS + VAPID key)
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
 
      if (!token) {
        console.warn('[FCM] Impossible d\'obtenir un token FCM. Vérifiez la VAPID key.');
        return;
      }
 
      console.log('[FCM] Token obtenu:', token.substring(0, 20) + '...');
 
      // 5. Sauvegarder dans Supabase
      await saveFcmToken(token);
 
    } catch (error) {
      console.error('[FCM] Erreur lors de la demande de permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, saveFcmToken]);
 
  // ── Se désabonner ────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const messaging = await getFirebaseMessaging();
      if (messaging) {
        await deleteToken(messaging);
      }
 
      // Supprimer tous les tokens de cet utilisateur dans Supabase
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('userId', userId);
 
      setIsSubscribed(false);
      setPermission('default');
    } catch (error) {
      console.error('[FCM] Erreur désabonnement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
 
  return { permission, isSubscribed, isLoading, requestPermission, unsubscribe };
}
 








