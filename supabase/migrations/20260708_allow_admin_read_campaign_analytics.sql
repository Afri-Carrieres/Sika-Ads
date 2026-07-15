-- Allow staff/admin to read campaign analytics data from tracking tables
-- This fixes the admin dashboard not showing share counts and share distribution charts.

ALTER TABLE public.campaign_share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view their own share events" ON public.campaign_share_events;
CREATE POLICY "Allow staff and admins to view share events"
ON public.campaign_share_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR user_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'MODERATOR')
  )
);

DROP POLICY IF EXISTS "Allow authenticated users to view clicks" ON public.campaign_clicks;
CREATE POLICY "Allow staff and admins to view clicks"
ON public.campaign_clicks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'MODERATOR')
  )
  OR auth.uid() IS NOT NULL
);
