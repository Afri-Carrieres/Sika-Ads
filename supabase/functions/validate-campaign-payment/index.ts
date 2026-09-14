import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GOMBO_BASE_URL = 'https://api.gomboplus.com/api';

async function gomboFetch(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
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
  let json: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === 'object') {
      json = parsed as Record<string, unknown>;
    }
  } catch {
    json = { rawText: text };
  }

  return { ...json, _httpStatus: res.status, _httpOk: res.ok };
}

function isGomboNotFound(resObj: Record<string, unknown>): boolean {
  const msg = String(resObj.message || '').toLowerCase();
  const httpStatus = Number(resObj._httpStatus || 0);
  return (
    msg.includes('no transaction') ||
    msg.includes('not found') ||
    msg.includes('introuvable') ||
    msg.includes('no transaction matches') ||
    (httpStatus === 404)
  );
}

/**
 * Gombo response structure:
 *   { status: "succes", code: 200, message: "...", content: { status: "failed"|"success"|..., ... } }
 *
 * - root `status`    = result of the API call itself ("succes" means the request worked)
 * - content.`status` = the ACTUAL transaction status ("failed", "success", "pending", etc.)
 */
function extractTransactionStatus(resObj: Record<string, unknown>): string {
  const content = resObj.content;
  if (content && typeof content === 'object') {
    const contentObj = content as Record<string, unknown>;
    return String(contentObj.status || '').toLowerCase().trim();
  }
  return String(resObj.status || '').toLowerCase().trim();
}

function isTransactionSuccess(txnStatus: string): boolean {
  const s = txnStatus.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['SUCCESS', 'COMPLETED', 'COMPLETE', 'SUCCESSFUL', 'APPROVED', 'VALIDATED', 'SUCCES']
    .some((k) => s.includes(k));
}

function isTransactionFailure(txnStatus: string): boolean {
  const s = txnStatus.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['FAILED', 'CANCELLED', 'CANCELED', 'ECHOUA', 'ECHOUER', 'ECHOUE', 'ANNULE', 'ECHEC']
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

    // Check ownership or admin status
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'MODERATOR';

    if (campaign.advertiserId !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Not authorized to validate this campaign' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Flexible reference matching: accept paymentReference or internalTransactionRef
    if (campaign.paymentReference && campaign.paymentReference !== transactionReference) {
      const ref1 = String(campaign.paymentReference).trim().toLowerCase();
      const ref2 = String(transactionReference).trim().toLowerCase();
      const intRef = String(campaign.internalTransactionRef || '').trim().toLowerCase();
      const txnRef2 = String(transactionReference).trim().toLowerCase();

      const refMatch = ref1.includes(ref2) || ref2.includes(ref1);
      const internalMatch = intRef && (intRef === txnRef2 || intRef.includes(txnRef2) || txnRef2.includes(intRef));

      if (!refMatch && !internalMatch) {
        return new Response(JSON.stringify({ error: 'Reference mismatch' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    const paymentStatus = await gomboFetch('mobile-services/check-transaction-status/', {
      transaction_reference: transactionReference,
    });

    // If Gombo hasn't indexed the transaction yet -> return pending
    if (isGomboNotFound(paymentStatus)) {
      return new Response(JSON.stringify({
        success: false,
        campaignId,
        status: 'pending',
        transactionStatus: 'pending',
        message: 'Transaction en cours de traitement, veuillez patienter.',
      }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Read the REAL transaction status from content.status
    const txnStatus = extractTransactionStatus(paymentStatus);
    const content = (paymentStatus.content && typeof paymentStatus.content === 'object')
      ? paymentStatus.content as Record<string, unknown>
      : {};

    // 1. Transaction SUCCESS -> Activate campaign automatically
    if (isTransactionSuccess(txnStatus)) {
      await supabase.from('campaigns').update({
        paymentStatus: 'paid',
        campaignPaymentStatus: 'payment_received',
        paymentConfirmed: true,
        status: 'active',
        paymentReference: transactionReference,
        paymentConfirmedAt: new Date().toISOString(),
        paymentConfirmedBy: user.id,
        updatedAt: new Date().toISOString(),
      }).eq('id', campaignId);

      return new Response(JSON.stringify({
        success: true,
        campaignId,
        status: 'active',
        transactionStatus: txnStatus,
        message: 'Campaign payment validated and activated'
      }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 2. Transaction FAILED / CANCELLED -> Mark campaign as failed
    if (isTransactionFailure(txnStatus)) {
      const failureMsg = String(content.message || paymentStatus.message || txnStatus || 'Payment failed');
      await supabase.from('campaigns').update({
        paymentStatus: 'failed',
        campaignPaymentStatus: 'payment_failed',
        status: 'failed',
        paymentError: failureMsg,
        updatedAt: new Date().toISOString(),
      }).eq('id', campaignId);

      return new Response(JSON.stringify({
        success: false,
        campaignId,
        status: 'failed',
        transactionStatus: txnStatus,
        error: 'Payment failed',
        details: paymentStatus
      }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 3. Transaction PENDING / IN PROGRESS -> Do not activate or fail yet
    return new Response(JSON.stringify({
      success: false,
      campaignId,
      status: 'pending',
      transactionStatus: txnStatus || 'pending',
      message: 'Payment is still pending confirmation',
      details: paymentStatus
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
