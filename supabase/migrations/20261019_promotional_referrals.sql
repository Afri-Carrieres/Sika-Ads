create table if not exists public.promo_ambassadors (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique,
  assigned_by uuid references public.users(id),
  starting_referral_count integer not null default 0,
  starting_referral_earnings numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_referral_rewards (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id) on delete cascade,
  referred_name text not null default 'Ambassadeur',
  points integer not null default 2 check (points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.promo_conversion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  points integer not null check (points >= 10),
  amount_fcfa integer not null check (amount_fcfa > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  accounting_applied boolean not null default false,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_accounting_authorizations (
  transaction_id bigint not null,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (transaction_id, user_id)
);
revoke all on table public.promo_accounting_authorizations from public, anon, authenticated;

alter table public.promo_ambassadors enable row level security;
alter table public.promo_referral_rewards enable row level security;
alter table public.promo_conversion_requests enable row level security;

drop policy if exists "promo_ambassadors_select_self_or_staff" on public.promo_ambassadors;
create policy "promo_ambassadors_select_self_or_staff"
on public.promo_ambassadors for select to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "promo_referral_rewards_select_owner_or_staff" on public.promo_referral_rewards;
create policy "promo_referral_rewards_select_owner_or_staff"
on public.promo_referral_rewards for select to authenticated
using (promoter_user_id = auth.uid() or public.is_staff());

drop policy if exists "promo_conversion_requests_select_owner_or_staff" on public.promo_conversion_requests;
create policy "promo_conversion_requests_select_owner_or_staff"
on public.promo_conversion_requests for select to authenticated
using (user_id = auth.uid() or public.is_staff());

grant select on public.promo_ambassadors to authenticated;
grant select on public.promo_referral_rewards to authenticated;
grant select on public.promo_conversion_requests to authenticated;

create or replace function public.validate_promotional_code(promo_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.promo_ambassadors
    where code = upper(trim(coalesce(promo_code, '')))
  ) or exists (
    select 1 from public.users
    where "referralCode" = upper(trim(coalesce(promo_code, '')))
  )
$$;

create or replace function public.assign_promotional_code(p_user_id uuid, promo_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(coalesce(promo_code, '')));
  starting_count integer;
  starting_earnings numeric;
begin
  if not public.has_role('ADMIN') then
    raise exception 'admin_required';
  end if;
  if normalized_code !~ '^[A-Z0-9]{3,20}$' then
    raise exception 'invalid_promo_code';
  end if;

  select "referralCount", "referralEarnings"
  into starting_count, starting_earnings
  from public.users where id = p_user_id for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  update public.users set "referralCode" = normalized_code where id = p_user_id;

  insert into public.promo_ambassadors (
    user_id, code, assigned_by, starting_referral_count, starting_referral_earnings
  )
  values (p_user_id, normalized_code, auth.uid(), starting_count, starting_earnings)
  on conflict (user_id) do update
    set code = excluded.code, assigned_by = excluded.assigned_by, created_at = now();
end;
$$;

create or replace function public.request_promotional_conversion()
returns table (request_id uuid, points integer, amount_fcfa integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  available_points numeric;
  starting_earnings numeric;
  redeem_points integer;
  redeem_amount integer;
  created_request_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  select u."referralEarnings" - pa.starting_referral_earnings
  into available_points
  from public.users u
  join public.promo_ambassadors pa on pa.user_id = u.id
  where u.id = current_user_id
  for update of u;
  if not found then
    raise exception 'promotional_code_not_assigned';
  end if;

  redeem_amount := floor(coalesce(available_points, 0) / 10)::integer;
  redeem_points := redeem_amount * 10;
  if redeem_amount < 1 then
    raise exception 'minimum_conversion_is_10_points';
  end if;

  insert into public.promo_conversion_requests (user_id, points, amount_fcfa)
  values (current_user_id, redeem_points, redeem_amount)
  returning id into created_request_id;

  return query select created_request_id, redeem_points, redeem_amount;
end;
$$;

create or replace function public.review_promotional_conversion(p_request_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  conversion public.promo_conversion_requests%rowtype;
begin
  if not public.has_role('ADMIN') then
    raise exception 'admin_required';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision';
  end if;

  select * into conversion
  from public.promo_conversion_requests
  where id = p_request_id and status = 'pending'
  for update;
  if not found then
    raise exception 'request_already_processed_or_missing';
  end if;

  update public.promo_conversion_requests
  set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now()
  where id = conversion.id;
end;
$$;

create or replace function public.apply_promotional_conversion_accounting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.promo_accounting_authorizations (transaction_id, user_id)
    values (txid_current(), new.user_id)
    on conflict do nothing;
    update public.users
    set "referralEarnings" = "referralEarnings" - new.points
    where id = new.user_id and "referralEarnings" >= new.points;
    if not found then
      raise exception 'insufficient_promotional_points';
    end if;
    delete from public.promo_accounting_authorizations
    where transaction_id = txid_current() and user_id = new.user_id;
    new.accounting_applied := true;
    return new;
  end if;

  if old.status <> new.status and old.status = 'pending' and not old.accounting_applied then
    raise exception 'conversion_accounting_missing';
  end if;

  if old.status <> new.status and old.status = 'pending' and new.status = 'approved' then
    insert into public.promo_accounting_authorizations (transaction_id, user_id)
    values (txid_current(), new.user_id)
    on conflict do nothing;
    update public.users
    set balance = balance + new.amount_fcfa,
        "totalEarned" = "totalEarned" + new.amount_fcfa
    where id = new.user_id;
    delete from public.promo_accounting_authorizations
    where transaction_id = txid_current() and user_id = new.user_id;
  elsif old.status <> new.status and old.status = 'pending' and new.status = 'rejected' then
    insert into public.promo_accounting_authorizations (transaction_id, user_id)
    values (txid_current(), new.user_id)
    on conflict do nothing;
    update public.users
    set "referralEarnings" = "referralEarnings" + new.points
    where id = new.user_id;
    delete from public.promo_accounting_authorizations
    where transaction_id = txid_current() and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_promo_conversion_insert on public.promo_conversion_requests;
create trigger on_promo_conversion_insert
before insert on public.promo_conversion_requests
for each row execute function public.apply_promotional_conversion_accounting();

drop trigger if exists on_promo_conversion_review on public.promo_conversion_requests;
create trigger on_promo_conversion_review
before update of status on public.promo_conversion_requests
for each row execute function public.apply_promotional_conversion_accounting();

create or replace function public.award_promotional_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  promo_code text;
  promoter_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.email_confirmed_at is not null or new.email_confirmed_at is null then
      return new;
    end if;
  elsif new.email_confirmed_at is null then
    return new;
  end if;

  promo_code := upper(trim(coalesce(new.raw_user_meta_data->>'promoCode', '')));
  if promo_code = '' then
    return new;
  end if;

  select user_id into promoter_id
  from public.promo_ambassadors
  where code = promo_code;

  if promoter_id is null or promoter_id = new.id then
    return new;
  end if;

  insert into public.promo_referral_rewards (referred_user_id, promoter_user_id, referred_name, points)
  values (
    new.id,
    promoter_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Ambassadeur'),
    2
  )
  on conflict (referred_user_id) do nothing;

  if found then
    insert into public.promo_accounting_authorizations (transaction_id, user_id)
    values (txid_current(), promoter_id)
    on conflict do nothing;
    update public.users
    set "referralCount" = "referralCount" + 1,
        "referralEarnings" = "referralEarnings" + 2
    where id = promoter_id;
    delete from public.promo_accounting_authorizations
    where transaction_id = txid_current() and user_id = promoter_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_promo_referral on auth.users;
create trigger on_auth_user_promo_referral
after insert or update of email_confirmed_at on auth.users
for each row execute function public.award_promotional_referral();

create or replace function public.protect_users_monetization_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user = 'service_role' then
    return new;
  end if;
  if exists (
    select 1 from public.promo_accounting_authorizations
    where transaction_id = txid_current() and user_id = new.id
  ) then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.balance is distinct from old.balance
     or new."totalEarned" is distinct from old."totalEarned"
     or new.clicks is distinct from old.clicks
     or new."referralCount" is distinct from old."referralCount"
     or new."referralEarnings" is distinct from old."referralEarnings"
     or new."referralCode" is distinct from old."referralCode"
  then
    raise exception using errcode = '42501', message = 'Non-staff users cannot modify privileged columns';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_promotional_code(text) from public;
grant execute on function public.validate_promotional_code(text) to anon, authenticated;
revoke all on function public.assign_promotional_code(uuid, text) from public;
grant execute on function public.assign_promotional_code(uuid, text) to authenticated;
revoke all on function public.request_promotional_conversion() from public;
grant execute on function public.request_promotional_conversion() to authenticated;
revoke all on function public.review_promotional_conversion(uuid, text) from public;
grant execute on function public.review_promotional_conversion(uuid, text) to authenticated;
revoke all on function public.award_promotional_referral() from public;