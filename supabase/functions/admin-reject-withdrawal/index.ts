import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    if (!Number.isFinite(amount) || amount <= 0) {
      await supabase.from('withdrawals').update({
        status: 'failed', failureReason: 'invalid_amount'
      }).eq('id', withdrawalId);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const alreadyRefunded = Boolean(withdrawal.refundedAt);
    const balanceDebited = Boolean(withdrawal.balanceDebited);
    const userId = String(withdrawal.userId || '');

    if (balanceDebited && userId && !alreadyRefunded) {
      const { data: userData } = await supabase
        .from('users').select('balance').eq('id', userId).single();

      const currentBalance = Number(userData?.balance || 0);
      await supabase.from('users').update({
        balance: currentBalance + amount
      }).eq('id', userId);

      await supabase.from('withdrawals').update({
        refundedAt: new Date().toISOString(), refundedBy: user.id
      }).eq('id', withdrawalId);
    }

    await supabase.from('withdrawals').update({
      status: 'failed',
      failureReason: 'rejected_by_admin',
    }).eq('id', withdrawalId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('admin-reject-withdrawal error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
