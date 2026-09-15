// index.ts
// Edge Function entry point. Pure orchestration, no business logic here.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RequestBody, FunctionResponse } from './types.ts';
import { callAI } from './ai.ts';
import { parseAIResponse } from './parser.ts';
import { normalizeAIResult } from './normalizer.ts';
import { updateProof } from './supabase.ts';

const ALLOWED_ORIGINS = [
  'https://www.sika-ads.com',
  'https://sikaads-7b9bc.web.app',
  'https://sikaads-7b9bc.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

let corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://www.sika-ads.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function recomputeCors(req: Request): void {
  const origin = req.headers.get('Origin');
  corsHeaders = {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://www.sika-ads.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: FunctionResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function validateRequest(payload: any): RequestBody {
  const { proofId, imageUrl } = payload ?? {};
  if (!proofId || typeof proofId !== 'string') {
    throw new Error('proofId is required and must be a string');
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('imageUrl is required and must be a string');
  }
  return { proofId, imageUrl };
}

serve(async (req: Request) => {
  recomputeCors(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ success: false, proofId: 'unknown', error: 'missing_authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ success: false, proofId: 'unknown', error: 'unauthorized' }, 401);
  }

  let proofId = 'unknown';

  try {
    const body = await req.json();

    const parsedRequest = validateRequest(body);
    proofId = parsedRequest.proofId;

    const { data: proofRow, error: proofError } = await supabase
      .from('proofs')
      .select('userId, status')
      .eq('id', proofId)
      .single();

    if (proofError || !proofRow) {
      return jsonResponse({ success: false, proofId, error: 'proof_not_found' }, 404);
    }

    if (proofRow.status === 'validated' || proofRow.status === 'rejected') {
      return jsonResponse({ success: false, proofId, error: 'already_processed' }, 409);
    }

    const { data: callerProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = callerProfile?.role === 'ADMIN' || callerProfile?.role === 'MODERATOR';

    if (proofRow.userId !== user.id && !isStaff) {
      return jsonResponse({ success: false, proofId, error: 'forbidden' }, 403);
    }

    const apiKey = Deno.env.get('RODIUMAI_API_KEY');
    if (!apiKey) {
      console.error('[index.ts] Missing RODIUMAI_API_KEY secret');
      return jsonResponse(
        {
          success: false,
          proofId,
          error: 'AI provider not configured',
          details: 'RODIUMAI_API_KEY is missing in Supabase secrets'
        },
        503
      );
    }

    console.log(`[index.ts] Validating proof ${proofId}`);

    const rawProviderText = await callAI(parsedRequest.imageUrl, apiKey);
    const rawResult = parseAIResponse(rawProviderText);
    const normalizedResult = normalizeAIResult(rawResult);

    console.log(`[index.ts] Normalized result for ${proofId}:`, normalizedResult);

    await updateProof(supabase, proofId, normalizedResult);

    console.log(`[index.ts] Proof ${proofId} updated successfully`);

    return jsonResponse({ success: true, proofId, result: normalizedResult });
  } catch (error) {
    console.error(`[index.ts] Error while processing proof ${proofId}:`, error);
    return jsonResponse(
      {
        success: false,
        proofId,
        error: 'Validation failed',
        details: 'internal_error'
      },
      500
    );
  }
});
