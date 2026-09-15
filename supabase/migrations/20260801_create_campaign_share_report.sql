-- Migration: view for campaign share + click aggregates

CREATE MATERIALIZED VIEW IF NOT EXISTS public.campaign_share_report AS
SELECT
  c.id AS campaign_id,
  c.title AS campaign_title,
  coalesce(s.platform, 'unknown') AS platform,
  coalesce(sum(s.count), 0) AS shares,
  coalesce(sum(cl.count), 0) AS clicks
FROM public.campaigns c
LEFT JOIN (
  SELECT campaign_id, platforms AS platform, count(*)::int as count
  FROM public.campaign_share_events
  GROUP BY campaign_id, platforms
) s ON s.campaign_id = c.id
LEFT JOIN (
  SELECT campaign_id, platform, count(*)::int as count
  FROM public.campaign_clicks
  GROUP BY campaign_id, platform
) cl ON cl.campaign_id = c.id AND cl.platform = s.platform
GROUP BY c.id, c.title, coalesce(s.platform, 'unknown');

-- Note: Materialized view can be refreshed regularly or converted to plain view if preferred.
