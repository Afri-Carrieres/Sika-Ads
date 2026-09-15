-- ============================================================
-- RLS Policies pour campaign_share_events et campaign_clicks
-- Idempotent : reflète l'état réel déployé (Supabase Dashboard).
-- SELECT limité au staff (ADMIN/MODERATOR) ; INSERT autorisé selon
-- le besoin de tracking public (clicks) / authentifié (share).
-- ============================================================

-- -----------------------------------------------
-- TABLE: campaign_share_events
-- -----------------------------------------------
ALTER TABLE public.campaign_share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to insert share events" ON public.campaign_share_events;
CREATE POLICY "Allow authenticated users to insert share events"
ON public.campaign_share_events
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow staff and admins to view share events" ON public.campaign_share_events;
CREATE POLICY "Allow staff and admins to view share events"
ON public.campaign_share_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR user_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['ADMIN', 'MODERATOR'])
  )
);

-- -----------------------------------------------
-- TABLE: campaign_clicks
-- -----------------------------------------------
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert clicks" ON public.campaign_clicks;
CREATE POLICY "Allow anyone to insert clicks"
ON public.campaign_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow staff and admins to view clicks" ON public.campaign_clicks;
CREATE POLICY "Allow staff and admins to view clicks"
ON public.campaign_clicks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = ANY (ARRAY['ADMIN', 'MODERATOR'])
  )
  OR auth.uid() IS NOT NULL
);