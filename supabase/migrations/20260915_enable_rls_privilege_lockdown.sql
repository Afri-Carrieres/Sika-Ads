-- ============================================================
-- RLS lockdown for core tables (security review: C1/C2)
-- 2026-09-15
--
-- Trust boundary:
--   * Browser clients (anon key + user JWT) are scoped by these
--     policies: they can only reach their own rows as AMBASSADOR,
--     staff (ADMIN/MODERATOR) get full access.
--   * Server writes (edge functions using the service role key)
--     bypass RLS; the BEFORE UPDATE triggers skip their protection
--     when session_user = 'service_role' so that legitimate
--     server debits/credits/activations keep working.
--   * Auxiliary role/balance/payment fields are protected by
--     BEFORE UPDATE triggers: a non-staff client can never change
--     them (defense in depth on top of the row policies).
--
-- Idempotent: DROP IF EXISTS + CREATE.
-- ============================================================

-- ------------------------------------------------------------
-- Helpers (SECURITY DEFINER avoids RLS recursion on public.users)
-- ------------------------------------------------------------
create or replace function public.has_role(role_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = role_name
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('ADMIN', 'MODERATOR')
  )
$$;

revoke all on function public.has_role(text) from public;
revoke all on function public.is_staff() from public;
grant execute on function public.has_role(text) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- ------------------------------------------------------------
-- TABLE: users
-- ------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users_select_self_or_staff" on public.users;
create policy "users_select_self_or_staff"
on public.users for select
to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists "users_insert_self_defaults" on public.users;
create policy "users_insert_self_defaults"
on public.users for insert
to authenticated
with check (
  (
    id = auth.uid()
    and role = 'AMBASSADOR'
    and status = 'active'
    and balance = 0
    and "totalEarned" = 0
    and clicks = 0
    and "referralCount" = 0
    and "referralEarnings" = 0
  )
  or public.is_staff()
);

drop policy if exists "users_update_self_or_staff" on public.users;
create policy "users_update_self_or_staff"
on public.users for update
to authenticated
using (id = auth.uid() or public.is_staff())
with check (id = auth.uid() or public.is_staff());

drop policy if exists "users_delete_staff" on public.users;
create policy "users_delete_staff"
on public.users for delete
to authenticated
using (public.is_staff());

-- Block non-staff clients from editing monetization/privilege columns
create or replace function public.protect_users_monetization_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted server context (edge functions with service role key)
  if session_user = 'service_role' then
    return new;
  end if;
  -- Staff are allowed to manage any field
  if public.is_staff() then
    return new;
  end if;
  -- Non-staff self-edit: freeze privileged columns
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
    raise exception using
      errcode = '42501',
      message = 'Non-staff users cannot modify privileged columns';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_users_monetization_columns on public.users;
create trigger trg_protect_users_monetization_columns
before update on public.users
for each row execute function public.protect_users_monetization_columns();

-- ------------------------------------------------------------
-- TABLE: campaigns
-- ------------------------------------------------------------
alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_all_authenticated" on public.campaigns;
create policy "campaigns_select_all_authenticated"
on public.campaigns for select
to authenticated
using (true);

drop policy if exists "campaigns_insert_self_or_staff" on public.campaigns;
create policy "campaigns_insert_self_or_staff"
on public.campaigns for insert
to authenticated
with check (
  (
    "advertiserId" = auth.uid()
    and "createdBy" = 'user'
    and status = 'pending'
    and priority = false
    and "paymentConfirmed" = false
  )
  or public.is_staff()
);

drop policy if exists "campaigns_update_self_or_staff" on public.campaigns;
create policy "campaigns_update_self_or_staff"
on public.campaigns for update
to authenticated
using ("advertiserId" = auth.uid() or public.is_staff())
with check ("advertiserId" = auth.uid() or public.is_staff());

drop policy if exists "campaigns_delete_staff" on public.campaigns;
create policy "campaigns_delete_staff"
on public.campaigns for delete
to authenticated
using (public.is_staff());

-- Activation / payment fields are server-owned: non-staff cannot change them
create or replace function public.protect_campaigns_payment_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user = 'service_role' then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new."paymentStatus" is distinct from old."paymentStatus"
     or new."campaignPaymentStatus" is distinct from old."campaignPaymentStatus"
     or new."paymentConfirmed" is distinct from old."paymentConfirmed"
     or new."paymentConfirmedAt" is distinct from old."paymentConfirmedAt"
     or new."paymentReference" is distinct from old."paymentReference"
     or new."paymentOperator" is distinct from old."paymentOperator"
     or new.priority is distinct from old.priority
     or new."createdBy" is distinct from old."createdBy"
     or new."advertiserId" is distinct from old."advertiserId"
     or new."paymentAmount" is distinct from old."paymentAmount"
  then
    raise exception using
      errcode = '42501',
      message = 'Non-staff users cannot modify payment/activation fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_campaigns_payment_columns on public.campaigns;
create trigger trg_protect_campaigns_payment_columns
before update on public.campaigns
for each row execute function public.protect_campaigns_payment_columns();

-- ------------------------------------------------------------
-- TABLE: proofs
-- ------------------------------------------------------------
alter table public.proofs enable row level security;

drop policy if exists "proofs_select_self_or_staff" on public.proofs;
create policy "proofs_select_self_or_staff"
on public.proofs for select
to authenticated
using ("userId" = auth.uid() or public.is_staff());

drop policy if exists "proofs_insert_self_or_staff" on public.proofs;
create policy "proofs_insert_self_or_staff"
on public.proofs for insert
to authenticated
with check ("userId" = auth.uid() or public.is_staff());

drop policy if exists "proofs_update_self_or_staff" on public.proofs;
create policy "proofs_update_self_or_staff"
on public.proofs for update
to authenticated
using ("userId" = auth.uid() or public.is_staff())
with check ("userId" = auth.uid() or public.is_staff());

drop policy if exists "proofs_delete_self_or_staff" on public.proofs;
create policy "proofs_delete_self_or_staff"
on public.proofs for delete
to authenticated
using ("userId" = auth.uid() or public.is_staff());

create or replace function public.protect_proofs_validation_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user = 'service_role' then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new."viewsCount" is distinct from old."viewsCount"
     or new."aiAnalysis" is distinct from old."aiAnalysis"
     or new."rejectionReason" is distinct from old."rejectionReason"
  then
    raise exception using
      errcode = '42501',
      message = 'Non-staff users cannot modify validation fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_proofs_validation_columns on public.proofs;
create trigger trg_protect_proofs_validation_columns
before update on public.proofs
for each row execute function public.protect_proofs_validation_columns();

-- ------------------------------------------------------------
-- TABLE: withdrawals
-- ------------------------------------------------------------
alter table public.withdrawals enable row level security;

drop policy if exists "withdrawals_select_self_or_staff" on public.withdrawals;
create policy "withdrawals_select_self_or_staff"
on public.withdrawals for select
to authenticated
using ("userId" = auth.uid() or public.is_staff());

-- Writes are server-only (request-withdrawal / admin-approve-* edge functions)
drop policy if exists "withdrawals_update_staff" on public.withdrawals;
create policy "withdrawals_update_staff"
on public.withdrawals for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- ------------------------------------------------------------
-- TABLE: notifications
-- ------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_self_or_staff" on public.notifications;
create policy "notifications_select_self_or_staff"
on public.notifications for select
to authenticated
using ("userId" = auth.uid() or public.is_staff());

drop policy if exists "notifications_insert_staff" on public.notifications;
create policy "notifications_insert_staff"
on public.notifications for insert
to authenticated
with check (public.is_staff());

drop policy if exists "notifications_update_self_or_staff" on public.notifications;
create policy "notifications_update_self_or_staff"
on public.notifications for update
to authenticated
using ("userId" = auth.uid() or public.is_staff())
with check ("userId" = auth.uid() or public.is_staff());

drop policy if exists "notifications_delete_staff" on public.notifications;
create policy "notifications_delete_staff"
on public.notifications for delete
to authenticated
using (public.is_staff());

-- Self can only flip the "read" flag, nothing else
create or replace function public.protect_notifications_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user = 'service_role' then
    return new;
  end if;
  if public.is_staff() then
    return new;
  end if;
  if new."userId" is distinct from old."userId"
     or new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.type is distinct from old.type
     or new."createdAt" is distinct from old."createdAt"
  then
    raise exception using
      errcode = '42501',
      message = 'Non-staff users can only update the read flag';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_notifications_columns on public.notifications;
create trigger trg_protect_notifications_columns
before update on public.notifications
for each row execute function public.protect_notifications_columns();

-- ------------------------------------------------------------
-- TABLE: announcements
-- ------------------------------------------------------------
alter table public.announcements enable row level security;

drop policy if exists "announcements_select_all_authenticated" on public.announcements;
create policy "announcements_select_all_authenticated"
on public.announcements for select
to authenticated
using (true);

drop policy if exists "announcements_insert_staff" on public.announcements;
create policy "announcements_insert_staff"
on public.announcements for insert
to authenticated
with check (public.is_staff());

drop policy if exists "announcements_update_staff" on public.announcements;
create policy "announcements_update_staff"
on public.announcements for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "announcements_delete_staff" on public.announcements;
create policy "announcements_delete_staff"
on public.announcements for delete
to authenticated
using (public.is_staff());

-- ------------------------------------------------------------
-- TABLE: notes
-- ------------------------------------------------------------
alter table public.notes enable row level security;

drop policy if exists "notes_select_self" on public.notes;
create policy "notes_select_self"
on public.notes for select
to authenticated
using ("userId" = auth.uid());

drop policy if exists "notes_insert_self" on public.notes;
create policy "notes_insert_self"
on public.notes for insert
to authenticated
with check ("userId" = auth.uid());

drop policy if exists "notes_update_self" on public.notes;
create policy "notes_update_self"
on public.notes for update
to authenticated
using ("userId" = auth.uid())
with check ("userId" = auth.uid());

drop policy if exists "notes_delete_self" on public.notes;
create policy "notes_delete_self"
on public.notes for delete
to authenticated
using ("userId" = auth.uid());

-- ------------------------------------------------------------
-- TABLE: referrals
-- ------------------------------------------------------------
alter table public.referrals enable row level security;

drop policy if exists "referrals_select_self" on public.referrals;
create policy "referrals_select_self"
on public.referrals for select
to authenticated
using ("userId" = auth.uid() or public.is_staff());