-- ============================================================
-- RLS Policies pour campaign_share_events et campaign_clicks
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- -----------------------------------------------
-- TABLE: campaign_share_events
-- -----------------------------------------------
ALTER TABLE public.campaign_share_events ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs connectés peuvent enregistrer leurs partages
CREATE POLICY "Allow authenticated users to insert share events" 
ON public.campaign_share_events 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Les utilisateurs connectés peuvent lire leurs propres événements de partage
CREATE POLICY "Allow authenticated users to view their own share events" 
ON public.campaign_share_events 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL);

-- -----------------------------------------------
-- TABLE: campaign_clicks
-- -----------------------------------------------
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut insérer un clic (y compris visiteurs anonymes)
CREATE POLICY "Allow anyone to insert clicks" 
ON public.campaign_clicks 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Les utilisateurs connectés peuvent lire les clics
CREATE POLICY "Allow authenticated users to view clicks" 
ON public.campaign_clicks 
FOR SELECT 
TO authenticated 
USING (true);
