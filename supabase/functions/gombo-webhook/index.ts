import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function isGomboSuccess(status: unknown, message?: unknown): boolean {
  const s = (String(status || '') + ' ' + String(message || ''))
    .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['SUCCESS', 'COMPLETED', 'COMPLETE', 'SUCCESSFUL', 'APPROVED', 'VALIDATED', 'SUCCES']
    .some((k) => s.includes(k));
}

function isGomboFailure(status: unknown, message?: unknown): boolean {
  const s = (String(status || '') + ' ' + String(message || ''))
    .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['FAILED', 'CANCELLED', 'CANCELED', 'ECHOUA', 'ECHOUER', 'ECHOUE', 'ANNULE', 'ECHEC']
    .some((k) => s.includes(k));
}

async function verifyHmac(payload: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('GOMBO_WEBHOOK_SECRET');
  if (!secret || !signature) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  if (expected.length !== signature.length) return false;

  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-gombo-signature');

  const webhookSecret = Deno.env.get('GOMBO_WEBHOOK_SECRET');
  if (webhookSecret && signature) {
    if (!await verifyHmac(rawBody, signature)) {
      return new Response(JSON.stringify({ error: 'invalid_signature' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { status, transaction_ref, reference, transaction_reference, status_message, message, error } = body;
  const refToUse = (transaction_reference || transaction_ref || reference || (body as Record<string, unknown>).txn_ref || (body as Record<string, unknown>).ref) as string;
  const statusToCheck = String(status || message || '').trim();
  const messageToCheck = String(status_message || message || error || '').trim();

  if (!refToUse) {
    return new Response(JSON.stringify({ error: 'missing_reference' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (isGomboSuccess(statusToCheck, messageToCheck)) {
    const { data: campaigns } = await supabase
      .from('campaigns').select('id').eq('paymentReference', refToUse).limit(1);

    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ error: 'campaign_not_found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await supabase.from('campaigns').update({
      paymentStatus: 'paid',
      campaignPaymentStatus: 'payment_received',
      status: 'active',
      paymentConfirmed: true,
      paymentConfirmedAt: new Date().toISOString(),
      paymentConfirmedBy: 'gombo_webhook_auto',
    }).eq('id', campaigns[0].id);

    return new Response(JSON.stringify({ success: true, campaignId: campaigns[0].id }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (isGomboFailure(statusToCheck, messageToCheck)) {
    const { data: campaigns } = await supabase
      .from('campaigns').select('id').eq('paymentReference', refToUse).limit(1);

    if (campaigns && campaigns.length > 0) {
      await supabase.from('campaigns').update({
        paymentStatus: 'failed',
        campaignPaymentStatus: 'payment_failed',
        paymentError: String(messageToCheck || statusToCheck || 'Unknown error'),
      }).eq('id', campaigns[0].id);
    }

    return new Response(JSON.stringify({ success: false, error: 'payment_failed' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({ accepted: true, message: 'Status pending' }), {
    status: 202, headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});
