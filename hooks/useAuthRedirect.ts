// hooks/useAuthRedirect.ts
import { useEffect } from 'react';
import { supabase } from '../supabase';

interface UseAuthRedirectOptions {
  onRecovery?: () => void; // callback si type=recovery détecté
}

export function useAuthRedirect({ onRecovery }: UseAuthRedirectOptions = {}) {
  useEffect(() => {
    const hash = window.location.hash; // ex: "#/#access_token=xxx&type=recovery..."

    const secondHashIndex = hash.indexOf('#', 1);
    if (secondHashIndex === -1) return; // pas de token Supabase dans l'URL

    const tokenPart = hash.substring(secondHashIndex + 1);
    const params = new URLSearchParams(tokenPart);

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type'); // 'recovery' ou absent pour OAuth classique

    if (!access_token || !refresh_token) return;

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        console.error('Erreur setSession:', error.message);
        return;
      }

      // Nettoie l'URL sans perdre la route de reset-password
      const cleanHash = hash.substring(0, secondHashIndex); // "#/"
      const newUrl = window.location.pathname + window.location.search + cleanHash + 'reset-password';
      window.history.replaceState(null, '', newUrl);

      // On gère nous-mêmes le cas 'recovery', car l'event PASSWORD_RECOVERY
      // de Supabase ne se déclenche pas sur un setSession manuel
      if (type === 'recovery' && onRecovery) {
        onRecovery();
      }
      // Pour OAuth Google (pas de 'type'), setSession() déclenche bien
      // SIGNED_IN tout seul → onAuthStateChange dans App.tsx le captera.
    });
  }, [onRecovery]);
}