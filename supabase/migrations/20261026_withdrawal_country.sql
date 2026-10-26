alter table public.withdrawals
  add column if not exists "country" text not null default 'TG';
