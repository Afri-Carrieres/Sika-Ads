create table public.users (
  id uuid not null,
  name text not null,
  email text null,
  role text not null default 'AMBASSADOR'::text,
  status text not null default 'active'::text,
  balance numeric not null default 0,
  "totalEarned" numeric not null default 0,
  clicks integer not null default 0,
  "momoNumber" text not null,
  "referralCode" text null,
  "referralCount" integer not null default 0,
  "referralEarnings" numeric not null default 0,
  "dailyStats" jsonb null default '{"sharedCount": 0, "lastSharedDate": ""}'::jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "dailyCount" uuid null,
  daily_upload_count integer not null default 0,
  daily_upload_date date null,
  constraint users_pkey primary key (id),
  constraint users_referralCode_key unique ("referralCode"),
  constraint users_dailyCount_fkey foreign KEY ("dailyCount") references users (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint users_role_check check (
    (
      role = any (
        array[
          'AMBASSADOR'::text,
          'MODERATOR'::text,
          'ADMIN'::text
        ]
      )
    )
  ),
  constraint users_status_check check (
    (
      status = any (array['active'::text, 'blocked'::text])
    )
  )
) TABLESPACE pg_default;