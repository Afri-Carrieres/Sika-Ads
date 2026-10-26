alter table public.withdrawals
  add column if not exists "clientRequestId" text,
  add column if not exists "processingAt" timestamp with time zone,
  add column if not exists "processingBy" uuid,
  add column if not exists "failureReason" text,
  add column if not exists "paymentReference" text,
  add column if not exists "processedAt" timestamp with time zone,
  add column if not exists "processedBy" uuid,
  add column if not exists "gomboResponse" jsonb,
  add column if not exists "lastError" text,
  add column if not exists "lastErrorAt" timestamp with time zone,
  add column if not exists "refundedAt" timestamp with time zone,
  add column if not exists "refundedBy" uuid;
