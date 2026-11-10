create table if not exists public.user_abuse_tracking (
  user_id uuid primary key references public.users(id) on delete cascade,
  rejected_submissions integer not null default 0,
  rejected_campaigns integer not null default 0,
  warnings_count integer not null default 0,
  is_suspended boolean not null default false,
  suspension_reason text,
  suspension_until timestamptz,
  last_violation timestamptz,
  last_violation_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.abuse_activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  action_type text not null check (action_type in ('campaign', 'proof')),
  content_hash text,
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists abuse_activity_user_action_time_idx
  on public.abuse_activity_log (user_id, action_type, created_at desc);
create index if not exists abuse_activity_hash_time_idx
  on public.abuse_activity_log (user_id, content_hash, created_at desc)
  where content_hash is not null;

create table if not exists public.abuse_violation_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  violation_type text not null check (violation_type in ('rejected_submission', 'rejected_campaign')),
  content_score numeric,
  reason text,
  reference_id text,
  created_at timestamptz not null default now(),
  unique (reference_id, violation_type)
);

create index if not exists abuse_violation_user_time_idx
  on public.abuse_violation_log (user_id, created_at desc);

alter table public.proofs
  add column if not exists "imageHash" text,
  add column if not exists "validationToken" uuid;

alter table public.campaigns
  add column if not exists "moderationToken" uuid;

create table if not exists public.campaign_moderation_tokens (
  token uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  budget numeric not null,
  image_url text not null,
  score numeric not null check (score >= 0.5 and score <= 1),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.proof_prevalidation_tokens (
  token uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null,
  content_hash text not null,
  file_size integer not null,
  content_type text not null,
  image_width integer not null,
  image_height integer not null,
  score numeric not null check (score >= 0.3 and score <= 1),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.proof_prevalidation_tokens enable row level security;
revoke all on public.proof_prevalidation_tokens from anon, authenticated;

alter table public.campaign_moderation_tokens enable row level security;
revoke all on public.campaign_moderation_tokens from anon, authenticated;

alter table public.user_abuse_tracking enable row level security;
alter table public.abuse_activity_log enable row level security;
alter table public.abuse_violation_log enable row level security;

drop policy if exists "abuse_tracking_staff_read" on public.user_abuse_tracking;
create policy "abuse_tracking_staff_read"
  on public.user_abuse_tracking for select to authenticated
  using (public.is_staff());

drop policy if exists "abuse_violation_staff_read" on public.abuse_violation_log;
create policy "abuse_violation_staff_read"
  on public.abuse_violation_log for select to authenticated
  using (public.is_staff());

grant select on public.user_abuse_tracking, public.abuse_violation_log to authenticated;
revoke all on public.abuse_activity_log from anon, authenticated;

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
    from auth.users as au where au.id = current_user_id;
  select status, "momoNumber", "totalEarned"
    into profile_status, phone_number, earned_amount
    from public.users where id = current_user_id;

  if profile_status is distinct from 'active' then
    return jsonb_build_object('allowed', false, 'message', 'Votre compte doit être vérifié et actif pour créer une campagne.');
  end if;

  select coalesce(ua.is_suspended, false), ua.suspension_until
    into is_suspended, suspension_until
    from public.user_abuse_tracking ua where ua.user_id = current_user_id;
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
       select 1 from public.users
       where id = current_user_id and verification_reviewed_at is not null
     ) then
    return jsonb_build_object('allowed', false, 'message', 'Une vérification d’identité est nécessaire pour les comptes ayant généré plus de 1 000 000 FCFA.');
  end if;

  perform pg_advisory_xact_lock(hashtext(current_user_id::text));
  select greatest(
    (select count(*)::integer from public.abuse_activity_log
      where user_id = current_user_id and action_type = 'campaign'),
    (select count(*)::integer from public.campaigns
      where "advertiserId" = current_user_id)
  ) into campaign_count;
  select greatest(
    (select count(*)::integer from public.abuse_activity_log
      where user_id = current_user_id and action_type = 'campaign' and created_at >= now() - interval '7 days'),
    (select count(*)::integer from public.campaigns
      where "advertiserId" = current_user_id and "createdAt" >= now() - interval '7 days')
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

create or replace function public.check_proof_submission(submitted_image_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  profile_status text;
  is_suspended boolean;
  suspension_until timestamptz;
  daily_count integer;
  weekly_count integer;
begin
  if current_user_id is null then
    return jsonb_build_object('allowed', false, 'message', 'Connectez-vous pour soumettre une preuve.');
  end if;
  if public.is_staff() then
    return jsonb_build_object('allowed', true);
  end if;

  select status into profile_status from public.users where id = current_user_id;
  if profile_status is distinct from 'active' then
    return jsonb_build_object('allowed', false, 'message', 'Votre compte doit être vérifié et actif pour soumettre une preuve.');
  end if;
  select coalesce(ua.is_suspended, false), ua.suspension_until
    into is_suspended, suspension_until
    from public.user_abuse_tracking ua where ua.user_id = current_user_id;
  if coalesce(is_suspended, false)
     and (suspension_until is null or suspension_until > now()) then
    return jsonb_build_object('allowed', false, 'message', 'Votre compte est suspendu. Vous ne pouvez pas soumettre de preuve pour le moment.');
  end if;

  perform pg_advisory_xact_lock(hashtext(current_user_id::text));
  select greatest(
    (select count(*)::integer from public.abuse_activity_log
      where user_id = current_user_id and action_type = 'proof' and created_at >= date_trunc('day', now())),
    (select count(*)::integer from public.proofs
      where "userId" = current_user_id and "submittedAt" >= date_trunc('day', now()))
  ) into daily_count;
  select greatest(
    (select count(*)::integer from public.abuse_activity_log
      where user_id = current_user_id and action_type = 'proof' and created_at >= now() - interval '7 days'),
    (select count(*)::integer from public.proofs
      where "userId" = current_user_id and "submittedAt" >= now() - interval '7 days')
  ) into weekly_count;

  if daily_count >= 5 then
    return jsonb_build_object('allowed', false, 'message', 'La limite quotidienne de 5 preuves est atteinte.');
  end if;
  if weekly_count >= 50 then
    return jsonb_build_object('allowed', false, 'message', 'La limite hebdomadaire de 50 preuves est atteinte.');
  end if;
  if submitted_image_hash is not null and exists (
    select 1 from public.abuse_activity_log
      where user_id = current_user_id and action_type = 'proof'
        and content_hash = submitted_image_hash and created_at >= now() - interval '24 hours'
  ) then
    return jsonb_build_object('allowed', false, 'message', 'Cette image a déjà été soumise au cours des dernières 24 heures.');
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

create or replace function public.enforce_campaign_creation_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  check_result jsonb;
  token_user_id uuid;
  token_title text;
  token_description text;
  token_budget numeric;
  token_image_url text;
  token_score numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then
    return new;
  end if;
  if new."advertiserId" is distinct from auth.uid()
     or new."createdBy" is distinct from 'user'
     or new.status is distinct from 'pending'
     or coalesce(new.priority, false)
     or coalesce(new."paymentConfirmed", false)
     or new."paymentAmount" is distinct from new."totalBudget" then
    raise exception using errcode = '42501', message = 'Données de campagne non autorisées.';
  end if;

  check_result := public.check_campaign_creation(coalesce(new."paymentAmount", new."totalBudget"));
  if not coalesce((check_result->>'allowed')::boolean, false) then
    raise exception using errcode = '42501', message = check_result->>'message';
  end if;
  if length(trim(coalesce(new.title, ''))) < 5
     or length(trim(coalesce(new.title, ''))) > 100
     or length(trim(coalesce(new.description, ''))) < 10
     or length(trim(coalesce(new.description, ''))) > 300 then
    raise exception using errcode = '23514', message = 'Le titre ou la description de la campagne n’est pas valide.';
  end if;

  if new."moderationToken" is null then
    raise exception using errcode = '42501', message = 'La vérification du contenu de la campagne est requise.';
  end if;
  select user_id, title, description, budget, image_url, score
    into token_user_id, token_title, token_description, token_budget, token_image_url, token_score
    from public.campaign_moderation_tokens
    where token = new."moderationToken"
      and used_at is null
      and expires_at > now()
    for update;
  if not found
     or token_user_id is distinct from new."advertiserId"
     or token_title is distinct from trim(new.title)
     or token_description is distinct from trim(new.description)
     or token_budget is distinct from coalesce(new."paymentAmount", new."totalBudget")
     or token_image_url is distinct from new."imageUrl"
     or token_score < 0.5 then
    raise exception using errcode = '42501', message = 'La vérification de cette campagne a expiré ou ne correspond plus à son contenu.';
  end if;
  update public.campaign_moderation_tokens
    set used_at = now()
    where token = new."moderationToken";
  return new;
end;
$$;

drop trigger if exists trg_enforce_campaign_creation_guard on public.campaigns;
create trigger trg_enforce_campaign_creation_guard
before insert on public.campaigns
for each row execute function public.enforce_campaign_creation_guard();

create or replace function public.log_campaign_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new."createdBy" = 'user' and new."advertiserId" is not null then
    insert into public.abuse_activity_log (user_id, action_type, reference_id)
    values (new."advertiserId", 'campaign', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_campaign_activity on public.campaigns;
create trigger trg_log_campaign_activity
after insert on public.campaigns
for each row execute function public.log_campaign_activity();

create or replace function public.enforce_proof_submission_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  check_result jsonb;
  token_user_id uuid;
  token_campaign_id uuid;
  token_image_hash text;
  token_file_size integer;
  token_content_type text;
  token_image_width integer;
  token_image_height integer;
  token_score numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then
    return new;
  end if;
  if new."userId" is distinct from auth.uid()
     or new.status is distinct from 'pending'
     or coalesce(new."aiValidation", false)
     or new."aiAnalysis" is not null then
    raise exception using errcode = '42501', message = 'Données de preuve non autorisées.';
  end if;
  if new.size is null or new.size < 51200 or new.size > 2097152
     or new.type is null or new.type not in ('image/jpeg', 'image/png') then
    raise exception using errcode = '23514', message = 'La preuve doit être une image JPG ou PNG de 50 Ko à 2 Mo.';
  end if;
  if new."imageHash" is null or new."imageHash" !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '23514', message = 'L’empreinte de la preuve est invalide.';
  end if;
  if new."validationToken" is null then
    raise exception using errcode = '42501', message = 'La vérification de la preuve est requise.';
  end if;

  check_result := public.check_proof_submission(new."imageHash");
  if not coalesce((check_result->>'allowed')::boolean, false) then
    raise exception using errcode = '42501', message = check_result->>'message';
  end if;
  if new."campaignId" is null or not exists (
    select 1 from public.campaigns
    where id = new."campaignId" and status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'La campagne sélectionnée n’est plus active.';
  end if;
  select user_id, campaign_id, content_hash, file_size, content_type,
         image_width, image_height, score
    into token_user_id, token_campaign_id, token_image_hash, token_file_size,
         token_content_type, token_image_width, token_image_height, token_score
    from public.proof_prevalidation_tokens
    where token = new."validationToken"
      and used_at is null
      and expires_at > now()
    for update;
  if not found
     or token_user_id is distinct from new."userId"
     or token_campaign_id is distinct from new."campaignId"
     or token_image_hash is distinct from new."imageHash"
     or token_file_size is distinct from new.size
     or token_content_type is distinct from new.type
     or token_image_width < 540
     or token_image_height < 720
     or token_score < 0.3 then
    raise exception using errcode = '42501', message = 'La vérification de cette preuve a expiré ou ne correspond plus à son fichier.';
  end if;
  update public.proof_prevalidation_tokens
    set used_at = now()
    where token = new."validationToken";
  return new;
end;
$$;

drop trigger if exists trg_enforce_proof_submission_guard on public.proofs;
create trigger trg_enforce_proof_submission_guard
before insert on public.proofs
for each row execute function public.enforce_proof_submission_guard();

create or replace function public.log_proof_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then
    return new;
  end if;
  insert into public.abuse_activity_log (user_id, action_type, content_hash, reference_id)
  values (new."userId", 'proof', new."imageHash", new.id);
  return new;
end;
$$;

drop trigger if exists trg_log_proof_activity on public.proofs;
create trigger trg_log_proof_activity
after insert on public.proofs
for each row execute function public.log_proof_activity();

create or replace function public.record_user_violation(
  target_user_id uuid,
  violation_type text,
  content_score numeric default null,
  violation_reason text default null,
  reference_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  rejected_total integer;
  next_suspension timestamptz;
  should_ban boolean;
begin
  if violation_type not in ('rejected_submission', 'rejected_campaign') then
    raise exception using errcode = '22023', message = 'Invalid violation type';
  end if;
  insert into public.abuse_violation_log (user_id, violation_type, content_score, reason, reference_id)
  values (target_user_id, violation_type, content_score, left(violation_reason, 500), reference_id)
  on conflict on constraint abuse_violation_log_reference_id_violation_type_key
  do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return jsonb_build_object('recorded', false);
  end if;

  insert into public.user_abuse_tracking (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;
  update public.user_abuse_tracking
  set rejected_submissions = rejected_submissions
        + case when violation_type = 'rejected_submission' then 1 else 0 end,
      rejected_campaigns = rejected_campaigns
        + case when violation_type = 'rejected_campaign' then 1 else 0 end,
      last_violation = now(),
      last_violation_type = violation_type,
      updated_at = now()
  where user_id = target_user_id;

  select rejected_submissions + rejected_campaigns
    into rejected_total
    from public.user_abuse_tracking where user_id = target_user_id;

  should_ban := rejected_total >= 15
    or (content_score is not null and content_score < 0.2 and rejected_total >= 3);
  if should_ban then
    update public.users set status = 'blocked' where id = target_user_id;
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Compte bloqué après des violations répétées',
        suspension_until = null, updated_at = now()
    where user_id = target_user_id;
  elsif rejected_total >= 7 then
    next_suspension := now() + interval '7 days';
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Violations répétées',
        suspension_until = next_suspension, updated_at = now()
    where user_id = target_user_id;
  elsif rejected_total >= 3 then
    next_suspension := now() + interval '24 hours';
    update public.user_abuse_tracking
    set is_suspended = true, suspension_reason = 'Violations répétées',
        suspension_until = next_suspension, updated_at = now()
    where user_id = target_user_id;
  end if;

  return jsonb_build_object(
    'recorded', true,
    'rejection_count', rejected_total,
    'suspended_until', next_suspension,
    'banned', should_ban
  );
end;
$$;

revoke all on function public.record_user_violation(uuid, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.record_user_violation(uuid, text, numeric, text, text) to service_role;

create or replace function public.record_campaign_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'rejected'
     and new.status = 'rejected'
     and new."createdBy" = 'user' then
    perform public.record_user_violation(
      new."advertiserId",
      'rejected_campaign',
      null,
      'Campagne rejetée par un administrateur',
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_campaign_rejection on public.campaigns;
create trigger trg_record_campaign_rejection
after update of status on public.campaigns
for each row execute function public.record_campaign_rejection();

create or replace function public.record_proof_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ai_score numeric;
begin
  if old.status is distinct from 'rejected' and new.status = 'rejected' then
    ai_score := nullif(new."aiAnalysis"->>'confidence', '')::numeric / 100;
    perform public.record_user_violation(
      new."userId",
      'rejected_submission',
      ai_score,
      coalesce(new."rejectionReason", new."aiAnalysis"->>'reason', 'Preuve rejetée'),
      new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_proof_rejection on public.proofs;
create trigger trg_record_proof_rejection
after update of status on public.proofs
for each row execute function public.record_proof_rejection();

revoke all on function public.check_campaign_creation(numeric) from public, anon;
revoke all on function public.check_proof_submission(text) from public, anon;
grant execute on function public.check_campaign_creation(numeric) to authenticated;
grant execute on function public.check_proof_submission(text) to authenticated;
