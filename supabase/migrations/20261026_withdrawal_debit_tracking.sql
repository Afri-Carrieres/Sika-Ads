alter table public.withdrawals
  add column if not exists "balanceDebited" boolean not null default false,
  add column if not exists "debitedAt" timestamp with time zone;
