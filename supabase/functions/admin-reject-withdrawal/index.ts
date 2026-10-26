import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://www.sika-ads.com', 'https://sikaads-7b9bc.web.app', 'https://sikaads-7b9bc.firebaseapp.com', 'http://localhost:3000'];

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

    const { data: rejected, error: rejectErr } = await supabase.rpc('reject_withdrawal', {
      p_withdrawal_id: withdrawalId,
    });

    if (rejectErr) throw rejectErr;
    if (!rejected) {
      return new Response(JSON.stringify({ error: 'Withdrawal already processed' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('admin-reject-withdrawal error:', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
