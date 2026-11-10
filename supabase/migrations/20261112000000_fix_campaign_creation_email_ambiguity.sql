create or replace function public.check_campaign_creation(requested_budget numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  account_created_at timestamptz;
  v_email_confirmed_at timestamptz;
  profile_status text;
  phone_number text;
  earned_amount numeric;
  account_age_days integer;
  campaign_count integer;
  weekly_count integer;
  is_suspended boolean;
  suspension_until timestamptz;
begin
  if current_user_id is null then
    return jsonb_build_object('allowed', false, 'message', 'Connectez-vous pour créer une campagne.');
  end if;

  if public.is_staff() then
    return jsonb_build_object('allowed', true);
  end if;

  if requested_budget is null or requested_budget < 1000 then
    return jsonb_build_object('allowed', false, 'message', 'Le budget minimum est de 1000 FCFA.');
  end if;
  if requested_budget > 50000 then
    return jsonb_build_object('allowed', false, 'message', 'Le budget maximum est de 50000 FCFA.');
  end if;

  select au.created_at, au.email_confirmed_at
    into account_created_at, v_email_confirmed_at
    from auth.users as au
    where au.id = current_user_id;
  select u.status, u."momoNumber", u."totalEarned"
    into profile_status, phone_number, earned_amount
    from public.users as u
    where u.id = current_user_id;

  if profile_status is distinct from 'active' then
    return jsonb_build_object('allowed', false, 'message', 'Votre compte doit être vérifié et actif pour créer une campagne.');
  end if;

  select coalesce(ua.is_suspended, false), ua.suspension_until
    into is_suspended, suspension_until
    from public.user_abuse_tracking as ua
    where ua.user_id = current_user_id;
  if coalesce(is_suspended, false)
     and (suspension_until is null or suspension_until > now()) then
    return jsonb_build_object('allowed', false, 'message', 'Votre compte est suspendu. Vous ne pouvez pas créer de campagne pour le moment.');
  end if;

  account_age_days := greatest(0, floor(extract(epoch from (now() - account_created_at)) / 86400)::integer);
  if account_age_days < 7 then
    if v_email_confirmed_at is null then
      return jsonb_build_object('allowed', false, 'message', 'Confirmez votre adresse e-mail avant de créer une campagne.');
    end if;
    if nullif(trim(phone_number), '') is null then
      return jsonb_build_object('allowed', false, 'message', 'Renseignez un numéro de téléphone dans votre profil avant de créer une campagne.');
    end if;
  elsif account_age_days < 30 then
    if nullif(trim(phone_number), '') is null then
      return jsonb_build_object('allowed', false, 'message', 'Renseignez un numéro de téléphone dans votre profil avant de créer une campagne.');
    end if;
  end if;

  if coalesce(earned_amount, 0) > 1000000
     and not exists (
       select 1
       from public.users as u
       where u.id = current_user_id and u.verification_reviewed_at is not null
     ) then
    return jsonb_build_object('allowed', false, 'message', 'Une vérification d’identité est nécessaire pour les comptes ayant généré plus de 1 000 000 FCFA.');
  end if;

  perform pg_advisory_xact_lock(hashtext(current_user_id::text));
  select greatest(
    (select count(*)::integer
       from public.abuse_activity_log as activity
      where activity.user_id = current_user_id and activity.action_type = 'campaign'),
    (select count(*)::integer
       from public.campaigns as campaign
      where campaign."advertiserId" = current_user_id)
  ) into campaign_count;
  select greatest(
    (select count(*)::integer
       from public.abuse_activity_log as activity
      where activity.user_id = current_user_id
        and activity.action_type = 'campaign'
        and activity.created_at >= now() - interval '7 days'),
    (select count(*)::integer
       from public.campaigns as campaign
      where campaign."advertiserId" = current_user_id
        and campaign."createdAt" >= now() - interval '7 days')
  ) into weekly_count;

  if account_age_days < 7 and campaign_count >= 1 then
    return jsonb_build_object('allowed', false, 'message', 'Les nouveaux comptes peuvent créer une seule campagne.');
  end if;
  if account_age_days >= 7 and account_age_days < 30 and campaign_count >= 5 then
    return jsonb_build_object('allowed', false, 'message', 'La limite est de 5 campagnes pour les comptes de moins de 30 jours.');
  end if;
  if weekly_count >= 10 then
    return jsonb_build_object('allowed', false, 'message', 'La limite hebdomadaire de 10 campagnes est atteinte.');
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;
