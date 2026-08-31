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
  
  if (!publicKey || !privateKey) {
    throw new Error('Missing GOMBO_PUBLIC_KEY_SECRET or GOMBO_PRIVATE_KEY_SECRET');
  }

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
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

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
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const keywords = ['SUCCESS', 'COMPLETED', 'COMPLETE', 'SUCCESSFUL', 'APPROVED', 'VALIDATED', 'SUCCES'];
  return keywords.some((keyword) => s.includes(keyword));
}

function isGomboFailure(status: unknown, message?: unknown): boolean {
  const s = (String(status || '') + ' ' + String(message || ''))
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const keywords = ['FAILED', 'CANCELLED', 'CANCELED', 'ECHOUA', 'ECHOUER', 'ECHOUE', 'ANNULE', 'ECHEC'];
  return keywords.some((keyword) => s.includes(keyword));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { transaction_reference } = body;

    if (!transaction_reference) {
      return new Response(JSON.stringify({ error: 'Missing transaction_reference' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const result = await gomboFetch('mobile-services/check-transaction-status/', {
      transaction_reference,
    });

    const resObj = result as Record<string, unknown>;

    if (isGomboSuccess(resObj.status, resObj.message)) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('paymentReference', transaction_reference)
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        await supabase
          .from('campaigns')
          .update({
            paymentStatus: 'paid',
            campaignPaymentStatus: 'payment_received',
            status: 'active',
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
            paymentConfirmedBy: 'gombo_check_transaction',
          })
          .eq('id', campaigns[0].id);
      }
    } else if (isGomboFailure(resObj.status, resObj.message)) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('paymentReference', transaction_reference)
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        await supabase
          .from('campaigns')
          .update({
            paymentStatus: 'failed',
            campaignPaymentStatus: 'payment_failed',
            paymentError: String(resObj.message || resObj.status || 'Unknown error'),
          })
          .eq('id', campaigns[0].id);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('gombo-check-transaction-status error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
