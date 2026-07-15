-- Migration: create campaign_share_events table
-- Run this with your Supabase migrations tooling or psql against your DB.

CREATE TABLE IF NOT EXISTS public.campaign_share_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platforms text NOT NULL,
  user_id uuid NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Optional index for faster aggregation per campaign/platform
CREATE INDEX IF NOT EXISTS idx_campaign_share_events_campaign_platform ON public.campaign_share_events (campaign_id, platforms);
