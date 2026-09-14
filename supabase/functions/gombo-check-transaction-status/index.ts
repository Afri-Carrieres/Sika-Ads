import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const GOMBO_BASE_URL = 'https://api.gomboplus.com/api';

/**
 * Fetch Gombo API. Always returns the parsed JSON body — even on HTTP errors.
 * Only throws for genuine network failures (no connection, DNS, etc.).
 * This lets callers inspect error bodies gracefully instead of crashing.
 */
async function gomboFetch(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
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
  let json: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === 'object') {
      json = parsed as Record<string, unknown>;
    }
  } catch {
    json = { rawText: text };
  }

  // Include HTTP status so callers can distinguish success from error
  // We do NOT throw — callers decide what to do
  return { ...json, _httpStatus: res.status, _httpOk: res.ok };
}

/**
 * Gombo response structure:
 *   { status: "succes", code: 200, message: "...", content: { status: "failed"|"success"|..., ... } }
 *
 * - root `status`    = result of the API call itself ("succes" means the request worked)
 * - content.`status` = the ACTUAL transaction status ("failed", "success", "pending", etc.)
 *
 * We must read content.status for the real transaction outcome.
 */
function extractTransactionStatus(resObj: Record<string, unknown>): string {
  const content = resObj.content;
  if (content && typeof content === 'object') {
    const contentObj = content as Record<string, unknown>;
    return String(contentObj.status || '').toLowerCase().trim();
  }
  // Fallback: some endpoints put status at root level
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

/**
 * "No Transaction matches the given query" means Gombo hasn't indexed the
 * transaction yet — it's a transient state. Keep polling.
 */
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

    // gomboFetch no longer throws on HTTP errors — always returns parsed body
    const resObj = await gomboFetch('mobile-services/check-transaction-status/', {
      transaction_reference,
    });

    // Strip internal tracking fields before sending response to client
    const { _httpStatus, _httpOk, ...cleanRes } = resObj;

    // ── Case 1: Transaction not found yet (transient) → return pending ──
    if (isGomboNotFound(resObj)) {
      console.log(`[gombo-check] Transaction "${transaction_reference}" not indexed yet — returning pending.`);
      return new Response(JSON.stringify({
        status: 'pending',
        message: 'Transaction en cours de traitement, veuillez patienter.',
        reference: transaction_reference,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Extract the REAL transaction status from content.status
    // (root status = API call result, content.status = transaction outcome)
    const txnStatus = extractTransactionStatus(resObj);
    const content = (resObj.content && typeof resObj.content === 'object')
      ? resObj.content as Record<string, unknown>
      : {};

    console.log(`[gombo-check] ref="${transaction_reference}" api_status="${resObj.status}" txn_status="${txnStatus}"`);

    // Helper: find campaign by paymentReference or internalTransactionRef
    async function findCampaignId(): Promise<string | null> {
      const { data: byRef } = await supabase
        .from('campaigns')
        .select('id')
        .eq('paymentReference', transaction_reference)
        .limit(1);
      if (byRef && byRef.length > 0) return byRef[0].id;

      const { data: byInternal } = await supabase
        .from('campaigns')
        .select('id')
        .eq('internalTransactionRef', transaction_reference)
        .limit(1);
      if (byInternal && byInternal.length > 0) return byInternal[0].id;

      return null;
    }

    // ── Case 2: Transaction confirmed as SUCCESS ──
    if (isTransactionSuccess(txnStatus)) {
      const campaignId = await findCampaignId();
      if (campaignId) {
        await supabase
          .from('campaigns')
          .update({
            paymentStatus: 'paid',
            campaignPaymentStatus: 'payment_received',
            status: 'active',
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
            paymentConfirmedBy: 'gombo_check_transaction',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', campaignId);
        console.log(`[gombo-check] Campaign ${campaignId} → ACTIVE (payment confirmed)`);
      }

      return new Response(JSON.stringify({
        ...cleanRes,
        status: 'success',        // normalized for frontend polling
        transactionStatus: txnStatus,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // ── Case 3: Transaction confirmed as FAILED/CANCELLED ──
    if (isTransactionFailure(txnStatus)) {
      const campaignId = await findCampaignId();
      const errorMsg = String(content.message || resObj.message || txnStatus || 'Paiement échoué');
      if (campaignId) {
        await supabase
          .from('campaigns')
          .update({
            paymentStatus: 'failed',
            campaignPaymentStatus: 'payment_failed',
            status: 'failed',
            paymentError: errorMsg,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', campaignId);
        console.log(`[gombo-check] Campaign ${campaignId} → FAILED (${errorMsg})`);
      }

      return new Response(JSON.stringify({
        ...cleanRes,
        status: 'failed',         // normalized for frontend polling
        transactionStatus: txnStatus,
        message: errorMsg,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // ── Case 4: Unknown / still processing → keep polling ──
    return new Response(JSON.stringify({
      ...cleanRes,
      status: 'pending',
      transactionStatus: txnStatus || 'pending',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    // Only genuine network/DNS errors reach here
    console.error('gombo-check-transaction-status network error:', error);
    // Return pending so frontend keeps polling instead of treating as fatal error
    return new Response(JSON.stringify({
      status: 'pending',
      message: 'Vérification temporairement indisponible, nouvelle tentative en cours...',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
