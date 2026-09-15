import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://www.sika-ads.com",
  "https://sikaads-7b9bc.web.app",
  "https://sikaads-7b9bc.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.sika-ads.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function isSocialCrawler(ua: string | null): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  return (
    s.includes('whatsapp') ||
    s.includes('facebookexternalhit') ||
    s.includes('facebot') ||
    s.includes('twitterbot') ||
    s.includes('telegrambot') ||
    s.includes('linkedinbot') ||
    s.includes('slackbot') ||
    s.includes('discordbot') ||
    s.includes('pinterest') ||
    s.includes('google-structured-data-testing-tool') ||
    s.includes('bingbot') ||
    s.includes('applebot') ||
    s.includes('meta-externalagent') ||
    s.includes('skypeuripreview')
  );
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || null;
    const campaignId = url.searchParams.get('campaignId');
    const platform = url.searchParams.get('platform') || null;

    // Supabase auto-injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Functions
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://www.sika-ads.com';

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return new Response('Configuration error', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (!campaignId) {
      return Response.redirect(`${FRONTEND_URL}/#/`, 302);
    }

    // 1. Fetch campaign data for metadata and destination
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, title, description, imageUrl, targetUrl')
      .eq('id', campaignId)
      .single();

    const title = campaign?.title || 'Campagne Sika Ads';
    const description = campaign?.description || 'Découvrez cette offre sponsorisée sur Sika Ads.';
    const imageUrl = campaign?.imageUrl || `${FRONTEND_URL}/logo.png`;
    const destinationUrl = campaign?.targetUrl || `${FRONTEND_URL}/#/${campaignId ? 'marketplace' : ''}`;

    const userAgent = req.headers.get('user-agent') || null;
    const isBot = isSocialCrawler(userAgent);

    // 2. If requested by a social media bot (WhatsApp, Facebook, Twitter...), return HTML with Open Graph tags
    if (isBot) {
      const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Sika Ads">
  <meta property="og:url" content="${escapeHtml(req.url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(title)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

  <!-- Redirect for non-crawler preview browsers -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(destinationUrl)}">
  <script>window.location.replace("${escapeHtml(destinationUrl)}");</script>
</head>
<body>
  <p>Redirection vers <a href="${escapeHtml(destinationUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders,
        },
      });
    }

    // 3. For real visitors: log the click (do not log bots)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    try {
      await supabase.from('campaign_clicks').insert([{
        campaign_id: campaignId,
        referrer: ref,
        platform,
        user_agent: userAgent,
        ip,
      }]);
    } catch (err) {
      console.warn('Failed to insert click:', err);
    }

    // 4. Redirect human visitor to targetUrl or marketplace
    return Response.redirect(destinationUrl, 302);
  } catch (err) {
    console.error('Track-click error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
