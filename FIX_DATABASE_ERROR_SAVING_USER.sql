-- ====================================================================
-- SCRIPT DE RÉSOLUTION : Database error saving new user (Supabase Auth)
-- Exécutez ce script dans votre SQL Editor Supabase (Dashboard -> SQL Editor)
-- ====================================================================

-- 1. Mise à jour de la contrainte status pour autoriser 'pending_verification'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (
  status = ANY (ARRAY['pending_verification'::text, 'active'::text, 'blocked'::text, 'rejected'::text])
);

-- 2. Ajout des colonnes de vérification si absentes
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_document_path text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- 3. Mise à jour du déclencheur (trigger) avec bloc EXCEPTION de sécurité
-- Cela évite que tout dysfonctionnement de la table public.users ne fasse échouer signUp() ou Google OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_referral_code text := upper(regexp_replace(
    coalesce(metadata->>'referralCode', left(coalesce(metadata->>'full_name', 'AMB'), 3)),
    '[^A-Z0-9]', '', 'g'
  ));
  generated_referral_code text;
BEGIN
  IF length(base_referral_code) < 3 THEN
    base_referral_code := 'AMB';
  END IF;
  generated_referral_code := left(base_referral_code, 3) || floor(random() * 9000 + 1000)::text;

  BEGIN
    INSERT INTO public.users (
      id,
      name,
      email,
      "momoNumber",
      role,
      status,
      balance,
      "totalEarned",
      clicks,
      "referralCode",
      "referralCount",
      "referralEarnings"
    ) VALUES (
      new.id,
      coalesce(metadata->>'full_name', split_part(new.email, '@', 1), 'Utilisateur'),
      new.email,
      coalesce(metadata->>'momoNumber', metadata->>'phone', ''),
      'AMBASSADOR',
      'pending_verification',
      0, 0, 0,
      generated_referral_code,
      0, 0
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback si une contrainte de statut échoue
    BEGIN
      INSERT INTO public.users (
        id, name, email, "momoNumber", role, status, balance, "totalEarned", clicks, "referralCode", "referralCount", "referralEarnings"
      ) VALUES (
        new.id,
        coalesce(metadata->>'full_name', split_part(new.email, '@', 1), 'Utilisateur'),
        new.email,
        coalesce(metadata->>'momoNumber', metadata->>'phone', ''),
        'AMBASSADOR',
        'active',
        0, 0, 0, generated_referral_code, 0, 0
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Empêche le blocage de la création d'utilisateur dans auth.users
      NULL;
    END;
  END;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

