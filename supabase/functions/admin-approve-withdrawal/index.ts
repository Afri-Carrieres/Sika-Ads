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
  return json as Record<string, unknown>;
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

    const { data: adminData } = await supabase
      .from('users').select('role').eq('id', user.id).single();

    if (adminData?.role !== 'ADMIN' && adminData?.role !== 'MODERATOR') {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { withdrawalId } = body;
    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: 'Missing withdrawalId' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawals').select('*').eq('id', withdrawalId).single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Withdrawal not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const wStatus = String(withdrawal.status || '').toLowerCase();
    if (wStatus !== 'pending' && wStatus !== 'pending_approval') {
      return new Response(JSON.stringify({ error: 'Withdrawal already processed' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const amount = Number(withdrawal.amount || 0);
    const phone = String(withdrawal.phone || '').trim();
    const operator = String(withdrawal.provider || '').toLowerCase();
    const country = String(withdrawal.country || 'TG').toUpperCase();

    if (!amount || !phone || !operator) {
      return new Response(JSON.stringify({ error: 'Invalid withdrawal data' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!withdrawal.balanceDebited) {
      const { data: userData } = await supabase
        .from('users').select('balance').eq('id', withdrawal.userId).single();

      const balance = Number(userData?.balance || 0);
      if (balance < amount) {
        await supabase.from('withdrawals').update({
          status: 'failed', failureReason: 'insufficient_balance'
        }).eq('id', withdrawalId);
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      await supabase.from('users').update({ balance: balance - amount }).eq('id', withdrawal.userId);
      await supabase.from('withdrawals').update({
        balanceDebited: true, debitedAt: new Date().toISOString()
      }).eq('id', withdrawalId);
    }

    await supabase.from('withdrawals').update({
      status: 'processing', processingAt: new Date().toISOString(), processingBy: user.id
    }).eq('id', withdrawalId);

    try {
      const transaction_ref = `WTH-${withdrawalId.substring(0, 8)}-${Date.now()}`;
      const result = await gomboFetch('mobile-services/mobile-withdrawal/', {
        amount: Math.round(amount),
        currency: 'XOF',
        number: phone,
        recipient_number: phone,
        operator,
        country,
        transaction_ref,
      });

      await supabase.from('withdrawals').update({
        status: 'completed',
        paymentReference: result.reference || transaction_ref,
        processedAt: new Date().toISOString(),
        processedBy: user.id,
        gomboResponse: result,
      }).eq('id', withdrawalId);

      return new Response(JSON.stringify({
        success: true, reference: result.reference || transaction_ref
      }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (gomboErr: unknown) {
      await supabase.from('withdrawals').update({
        status: 'pending',
        lastError: gomboErr instanceof Error ? gomboErr.message : String(gomboErr),
        lastErrorAt: new Date().toISOString(),
      }).eq('id', withdrawalId);

      throw gomboErr;
    }
  } catch (error) {
    console.error('admin-approve-withdrawal error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
