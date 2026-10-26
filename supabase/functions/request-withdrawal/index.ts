import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://www.sika-ads.com', 'https://sikaads-7b9bc.web.app', 'https://sikaads-7b9bc.firebaseapp.com', 'http://localhost:3000'];

const MIN_WITHDRAWAL = 1000;

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://www.sika-ads.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { amount, provider, phone, country = 'TG', clientRequestId } = body;

    const numAmount = Number(amount || 0);
    const providerLower = String(provider || '').trim().toLowerCase();
    const phoneTrimmed = String(phone || '').trim();
    const countryUpper = String(country || 'TG').trim().toUpperCase();
    const clientReqId = String(clientRequestId || '').trim();

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return new Response(JSON.stringify({ error: 'invalid_amount' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (!Number.isInteger(numAmount)) {
      return new Response(JSON.stringify({ error: 'amount_must_be_integer' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (numAmount < MIN_WITHDRAWAL) {
      return new Response(JSON.stringify({ error: 'below_minimum_withdrawal' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (!['yas', 'moov'].includes(providerLower)) {
      return new Response(JSON.stringify({ error: 'invalid_provider' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (!phoneTrimmed) {
      return new Response(JSON.stringify({ error: 'missing_phone' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (!clientReqId) {
      return new Response(JSON.stringify({ error: 'missing_clientRequestId' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const withdrawalId = `${user.id}_${clientReqId}`;

    const { data: createdWithdrawalId, error: requestErr } = await supabase.rpc('request_withdrawal', {
      p_user_id: user.id,
      p_withdrawal_id: withdrawalId,
      p_amount: numAmount,
      p_provider: providerLower,
      p_phone: phoneTrimmed,
      p_country: countryUpper,
      p_client_request_id: clientReqId,
    });

    if (requestErr) {
      if (requestErr.message.includes('insufficient_balance')) {
        return new Response(JSON.stringify({ error: 'insufficient_balance' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      if (requestErr.message.includes('user_not_found')) {
        return new Response(JSON.stringify({ error: 'user_not_found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      throw requestErr;
    }

    return new Response(JSON.stringify({ withdrawalId: createdWithdrawalId }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('request-withdrawal error:', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
