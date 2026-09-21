-- ====================================================================
-- SCRIPT DE CORRECTION DÉFINITIF : Insertion dans la table public.users
-- Exécutez ce script dans le SQL Editor de Supabase (Dashboard -> SQL Editor)
-- ====================================================================

-- 1. Mettre à jour les contraintes de statut et de rôle sur public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (
  status = ANY (ARRAY['pending_verification'::text, 'active'::text, 'blocked'::text, 'rejected'::text])
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role = ANY (ARRAY['AMBASSADOR'::text, 'MODERATOR'::text, 'ADMIN'::text])
);

-- 2. S'assurer que toutes les colonnes de vérification existent avec leurs références
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_document_path text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- 3. Fonction déclencheur ultra-fiable pour créer le profil public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_name text;
  base_code text;
  final_ref_code text;
  code_exists boolean;
  attempts integer := 0;
BEGIN
  -- Déterminer le nom du profil
  user_name := coalesce(metadata->>'full_name', metadata->>'name', split_part(new.email, '@', 1), 'Ambassadeur');

  -- Générer un code de parrainage unique
  base_code := upper(regexp_replace(
    coalesce(metadata->>'referralCode', left(user_name, 3), 'AMB'),
    '[^A-Z0-9]', '', 'g'
  ));
  IF length(base_code) < 3 THEN
    base_code := 'AMB';
  END IF;

  -- Garantie d'unicité du code de parrainage
  LOOP
    final_ref_code := left(base_code, 3) || floor(random() * 9000 + 1000)::text;
    SELECT EXISTS (SELECT 1 FROM public.users WHERE "referralCode" = final_ref_code) INTO code_exists;
    EXIT WHEN NOT code_exists OR attempts > 10;
    attempts := attempts + 1;
  END LOOP;

  -- Insérer dans public.users avec la casse exacte des colonnes (guillemets obligatoires)
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
      user_name,
      new.email,
      coalesce(metadata->>'momoNumber', metadata->>'phone', ''),
      'AMBASSADOR',
      'active',
      0, 0, 0,
      final_ref_code,
      0, 0
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.users (
        id, name, email, "momoNumber", role, status, balance, "totalEarned", clicks, "referralCode", "referralCount", "referralEarnings"
      ) VALUES (
        new.id, user_name, new.email, coalesce(metadata->>'momoNumber', metadata->>'phone', ''), 'AMBASSADOR', 'active', 0, 0, 0, final_ref_code, 0, 0
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Échec création profil public.users pour %: %', new.id, SQLERRM;
    END;
  END;

  RETURN new;
END;
$$;

-- 4. Réattacher le déclencheur sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. RATTRAPAGE AUTOMATIQUE : Crée le profil public.users pour tous les comptes enregistrés qui n'ont pas encore de profil !
INSERT INTO public.users (
  id, name, email, "momoNumber", role, status, balance, "totalEarned", clicks, "referralCode", "referralCount", "referralEarnings"
)
SELECT 
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Utilisateur'),
  au.email,
  coalesce(au.raw_user_meta_data->>'momoNumber', au.raw_user_meta_data->>'phone', ''),
  'AMBASSADOR',
  'active',
  0, 0, 0,
  upper(left(coalesce(au.raw_user_meta_data->>'full_name', 'AMB'), 3)) || floor(random() * 9000 + 1000)::text,
  0, 0
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;



