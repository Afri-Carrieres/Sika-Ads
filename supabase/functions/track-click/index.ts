import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || null;
    const campaignId = url.searchParams.get('campaignId');
    const platform = url.searchParams.get('platform') || null;

    // Supabase auto-injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Functions
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://sika-ads.netlify.app';

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return new Response('Configuration error', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (!campaignId) {
      return Response.redirect(FRONTEND_URL + '/#/', 302);
    }

    // Capture IP from headers if available
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

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
      // continue to redirect even if logging fails
    }

    // Redirect to SPA landing or direct campaign page
    const redirectTo = `${FRONTEND_URL}/#/${campaignId ? `marketplace` : ''}`;
    return Response.redirect(redirectTo, 302);
  } catch (err) {
    console.error('Track-click error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
