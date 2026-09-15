-- Allow a newly authenticated user to create only their own public profile.
alter table public.users enable row level security;

create or replace function public.is_staff_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('ADMIN', 'MODERATOR')
  );
$$;

drop policy if exists "Users can create their own profile" on public.users;
create policy "Users can create their own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Staff can read all user profiles" on public.users;
create policy "Staff can read all user profiles"
on public.users
for select
to authenticated
using (
  public.is_staff_user()
);