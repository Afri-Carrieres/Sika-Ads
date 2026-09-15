-- Lockdown hardening: remove legacy permissive RLS policies that OR-weaken
-- the strict policies deployed in 20260708/20260802/20260915.
--
-- Postgres evaluates ALL policies for a command+role with OR, so a single
-- leftover permissive policy cancels the whole lockdown. Every policy dropped
-- here is either a privilege-escalation / forge hole or fully superseded by the
-- strict policies from 20260915. Client behaviour was audited against each drop
-- (see views/, components/ and hooks/useUserData.ts).

-- campaigns
-- "Allow insert campaigns" (WITH CHECK auth.role()='authenticated') let any
-- user insert a forged active/paid campaign. "Allow update campaigns" had no
-- WITH CHECK (owner could write monetization columns; now neutralized by the
-- protect trigger but dropped anyway for defense in depth). Reads were public
-- (no anonymous page queries campaigns). Deletes were is_admin only, a strict
-- subset of the new campaigns_delete_staff.
drop policy if exists "Allow insert campaigns" on public.campaigns;
drop policy if exists "Allow update campaigns" on public.campaigns;
drop policy if exists "Allow read campaigns" on public.campaigns;
drop policy if exists "Allow delete campaigns" on public.campaigns;

-- users
-- The two public insert policies allowed a user to insert a row with any
-- role/balance/status (privilege escalation to ADMIN). Remaining read/update
-- policies are redundant with users_select_self_or_staff / users_update_self_or_staff.
-- The delete policy is replaced: staff-only delete would break ProfilePage
-- self account deletion (views/ProfilePage.tsx), so it becomes self-or-staff.
drop policy if exists "Allow insert own profile" on public.users;
drop policy if exists "Users can create their own profile" on public.users;
drop policy if exists "Allow read user profile" on public.users;
drop policy if exists "Users can read their own profile" on public.users;
drop policy if exists "Staff can read all user profiles" on public.users;
drop policy if exists "Allow update own profile or staff" on public.users;
drop policy if exists "Allow delete profile" on public.users;
drop policy if exists "users_delete_staff" on public.users;
create policy "users_delete_self_or_staff"
  on public.users
  for delete to authenticated
  using ((auth.uid() = id) or public.is_staff());

-- proofs
-- Legacy self/staff policies are fully superseded by the proofs_*_self_or_staff
-- policies (selection, insert, update via trigger-gated, and delete).
drop policy if exists "Allow insert proofs" on public.proofs;
drop policy if exists "Allow select proofs" on public.proofs;
drop policy if exists "Allow update proofs" on public.proofs;
drop policy if exists "Allow delete proofs" on public.proofs;

-- withdrawals
-- "Allow insert withdrawals" (WITH CHECK userId = auth.uid()) let clients insert
-- payout rows directly, bypassing the request-withdrawal edge function that
-- debits the balance. Select/update/delete are redundant with the strict ones.
drop policy if exists "Allow insert withdrawals" on public.withdrawals;
drop policy if exists "Allow select withdrawals" on public.withdrawals;
drop policy if exists "Allow update/delete withdrawals" on public.withdrawals;

-- notifications
-- "Allow authenticated users to insert notifications" (WITH CHECK true) let any
-- user push arbitrary notifications to anyone. The remaining legacy select /
-- update / delete policies are redundant with the strict self-or-staff ones.
drop policy if exists "Allow authenticated users to insert notifications" on public.notifications;
drop policy if exists "Allow manage notifications" on public.notifications;
drop policy if exists "Allow users to view their own notifications" on public.notifications;
drop policy if exists "Allow select notifications" on public.notifications;
drop policy if exists "Allow users to update their own notifications" on public.notifications;
drop policy if exists "Allow users and admins to delete notifications" on public.notifications;

-- announcements
-- Legacy "Allow select announcements" had no FOR clause, so it applied the USING
-- true check to INSERT/UPDATE/DELETE too (any role could write announcements).
-- Select/insert/update/delete are now governed by the strict staff + authenticated
-- policies from 20260915.
drop policy if exists "Allow select announcements" on public.announcements;
drop policy if exists "Allow manage announcements" on public.announcements;

-- notes / referrals
-- Superseded by the scoped notes_* and referrals_select_self policies.
drop policy if exists "Allow all notes for owner" on public.notes;
drop policy if exists "Allow all referrals for owner or staff" on public.referrals;

-- campaign_share_events
-- "Allow authenticated users to insert share events" (WITH CHECK true) let a user
-- log share events for other users. The client always sends its own user id
-- (views/CampaignShareOption.tsx), so restrict to self. campaign_clicks keeps its
-- public insert (anonymous /ref redirect tracking in App.tsx).
drop policy if exists "Allow authenticated users to insert share events" on public.campaign_share_events;
create policy "users can insert own share events"
  on public.campaign_share_events
  for insert to authenticated
  with check ("user_id" = auth.uid());