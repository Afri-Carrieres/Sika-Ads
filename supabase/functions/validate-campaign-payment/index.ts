import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GOMBO_BASE_URL = 'https://api.gomboplus.com/api';

async function gomboFetch(path: string, body: Record<string, unknown>) {
  const publicKey = Deno.env.get('GOMBO_PUBLIC_KEY_SECRET');
  const privateKey = Deno.env.get('GOMBO_PRIVATE_KEY_SECRET');
  if (!publicKey || !privateKey) throw new Error('Missing GOMBO keys');

  const res = await fetch(`${GOMBO_BASE_URL}/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Public-Key': publicKey,
      'X-Private-Key': privateKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

  if (!res.ok) {
    const message = typeof json === 'object' && json && 'message' in json
      ? String((json as Record<string, unknown>).message)
      : `gombo_http_${res.status}`;
    throw new Error(`${message}:${text || ''}`.slice(0, 2000));
  }
  return json;
}

function isGomboSuccess(status: unknown, message?: unknown): boolean {
  const s = (String(status || '') + ' ' + String(message || ''))
    .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['SUCCESS', 'COMPLETED', 'COMPLETE', 'SUCCESSFUL', 'APPROVED', 'VALIDATED', 'SUCCES']
    .some((k) => s.includes(k));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { campaignId, transactionReference } = body;

    if (!campaignId || !transactionReference) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { data: campaign, error: campaignErr } = await supabase
      .from('campaigns').select('*').eq('id', campaignId).single();

    if (campaignErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (campaign.advertiserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Not your campaign' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (campaign.paymentReference !== transactionReference) {
      return new Response(JSON.stringify({ error: 'Reference mismatch' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const paymentStatus = await gomboFetch('mobile-services/check-transaction-status/', {
      transaction_reference: transactionReference,
    }) as Record<string, unknown>;

    if (!isGomboSuccess(paymentStatus.status, paymentStatus.message)) {
      return new Response(JSON.stringify({ error: 'Payment not confirmed' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await supabase.from('campaigns').update({
      paymentStatus: 'paid',
      campaignPaymentStatus: 'payment_received',
      paymentConfirmed: true,
      status: 'active',
      paymentConfirmedAt: new Date().toISOString(),
      paymentConfirmedBy: user.id,
    }).eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true, campaignId, message: 'Campaign payment validated and activated'
    }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('validate-campaign-payment error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
