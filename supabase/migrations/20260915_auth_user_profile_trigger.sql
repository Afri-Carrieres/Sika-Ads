-- Prepare the users table for the verification workflow.
alter table public.users
  drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check check (
    status = any (array['pending_verification'::text, 'active'::text, 'blocked'::text, 'rejected'::text])
  );

alter table public.users
  add column if not exists verification_document_path text,
  add column if not exists verification_submitted_at timestamp with time zone,
  add column if not exists verification_reviewed_at timestamp with time zone,
  add column if not exists verification_reviewed_by uuid references auth.users(id),
  add column if not exists verification_rejection_reason text;

-- Create the public profile server-side when Supabase Auth creates a user.
-- This also works when email confirmation is enabled and no client session exists.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_referral_code text := upper(regexp_replace(
    coalesce(metadata->>'referralCode', left(coalesce(metadata->>'full_name', 'AMB'), 3)),
    '[^A-Z0-9]', '', 'g'
  ));
  generated_referral_code text := left(base_referral_code, 3) || floor(random() * 9000 + 1000)::text;
begin
  insert into public.users (
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
    referralCount,
    referralEarnings
  ) values (
    new.id,
    coalesce(metadata->>'full_name', split_part(new.email, '@', 1), 'Utilisateur'),
    new.email,
    coalesce(metadata->>'momoNumber', ''),
    'AMBASSADOR',
    'pending_verification',
    0,
    0,
    0,
    generated_referral_code,
    0,
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();