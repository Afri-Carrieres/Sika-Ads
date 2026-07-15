-- Migration: create campaign_clicks table
-- Run this with your Supabase migrations tooling or psql against your DB.

CREATE TABLE IF NOT EXISTS public.campaign_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  referrer text NULL,
  platform text NULL,
  user_agent text NULL,
  ip text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_clicks_campaign ON public.campaign_clicks (campaign_id);
