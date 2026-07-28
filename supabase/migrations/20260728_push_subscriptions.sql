-- ============================================================
-- Migration: Push Subscriptions pour FCM Web Push
-- ============================================================
-- Stocke les tokens FCM par utilisateur pour envoyer des
-- notifications push Chrome / Android via Firebase Cloud Messaging.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  "userId"    uuid    NOT NULL,
  fcm_token   text    NOT NULL,
  device_info text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_userId_fkey
    FOREIGN KEY ("userId") REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT push_subscriptions_fcm_token_key UNIQUE (fcm_token)
) TABLESPACE pg_default;

-- Index pour accélérer la récupération des tokens par utilisateur
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_userId
  ON public.push_subscriptions ("userId");

-- RLS : activer la sécurité au niveau des lignes
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique : un utilisateur peut lire/écrire/supprimer ses propres tokens
CREATE POLICY "Users can manage their own push tokens"
  ON public.push_subscriptions
  FOR ALL
  USING  (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Politique : les Edge Functions (service_role) peuvent tout lire
-- (Nécessaire pour que la Edge Function send-push-notification puisse
--  récupérer les tokens d'un utilisateur donné)
CREATE POLICY "Service role can read all push tokens"
  ON public.push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Trigger: mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_push_subscriptions_updated_at();
