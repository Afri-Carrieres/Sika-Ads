import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const MIN_WITHDRAWAL = 2000;

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

    const { data: userData, error: userErr } = await supabase
      .from('users').select('balance, name').eq('id', user.id).single();

    if (userErr || !userData) {
      return new Response(JSON.stringify({ error: 'user_not_found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const balance = Number(userData.balance || 0);
    if (balance < numAmount) {
      return new Response(JSON.stringify({ error: 'insufficient_balance' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const withdrawalId = `${user.id}_${clientReqId}`;

    const { error: insertErr } = await supabase.from('withdrawals').insert({
      id: withdrawalId,
      userId: user.id,
      userName: userData.name || 'Utilisateur',
      amount: numAmount,
      provider: providerLower,
      phone: phoneTrimmed,
      country: countryUpper,
      status: 'pending',
      createdAt: new Date().toISOString(),
      clientRequestId: clientReqId,
      balanceDebited: true,
      debitedAt: new Date().toISOString(),
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ withdrawalId }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      throw insertErr;
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ balance: balance - numAmount })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ withdrawalId }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('request-withdrawal error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
