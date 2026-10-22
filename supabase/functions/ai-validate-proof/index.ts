// index.ts
// Edge Function entry point. Pure orchestration, no business logic here.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RequestBody, FunctionResponse } from './types.ts';
import { AIProviderError, callAI } from './ai.ts';
import { parseAIResponse } from './parser.ts';
import { normalizeAIResult } from './normalizer.ts';
import { updateProof, getSupabaseClient } from './supabase.ts';

const ALLOWED_ORIGINS = [
  'https://www.sika-ads.com',
  'https://sikaads-7b9bc.web.app',
  'https://sikaads-7b9bc.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];
const FRAME_PREFIX = 'https://zgzomwsujqtzjfmfhuow.supabase.co/storage/v1/object/public/proofs/';

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
  const { proofId, imageUrl, videoUrl, videoFrameUrls, reanalyze } = payload ?? {};
  const frames = (Array.isArray(videoFrameUrls) ? videoFrameUrls : [videoFrameUrls])
    .filter((u: unknown): u is string => typeof u === 'string' && u.startsWith(FRAME_PREFIX))
    .slice(0, 4);
  if (!proofId || typeof proofId !== 'string') {
    throw new Error('proofId is required and must be a string');
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('imageUrl is required and must be a string');
  }
  return {
    proofId,
    imageUrl,
    videoUrl: typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : undefined,
    videoFrameUrls: frames,
    reanalyze: reanalyze === true
  };
};

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

  // Client scoped to the user's JWT — used only for auth verification
  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Pure service_role client — bypasses RLS for privileged writes
  const adminClient = getSupabaseClient();

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ success: false, proofId: 'unknown', error: 'unauthorized' }, 401);
  }

  let proofId = 'unknown';
  let failureStage = 'request_parsing';

  try {
    const body = await req.json();

    const parsedRequest = validateRequest(body);
    proofId = parsedRequest.proofId;

    failureStage = 'proof_lookup';
    const { data: proofRow, error: proofError } = await adminClient
      .from('proofs')
      .select('userId, status')
      .eq('id', proofId)
      .single();

    if (proofError || !proofRow) {
      return jsonResponse({ success: false, proofId, error: 'proof_not_found' }, 404);
    }

    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = callerProfile?.role === 'ADMIN' || callerProfile?.role === 'MODERATOR';

    if (proofRow.userId !== user.id && !isStaff) {
      return jsonResponse({ success: false, proofId, error: 'forbidden' }, 403);
    }

    const alreadyProcessed = proofRow.status === 'validated' || proofRow.status === 'rejected';
    if (alreadyProcessed && !(parsedRequest.reanalyze && isStaff)) {
      return jsonResponse({ success: false, proofId, error: 'already_processed' }, 409);
    }

    failureStage = 'ai_provider';
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

    console.log(
      `[index.ts] Validating proof ${proofId} with image, videoUrl: ${parsedRequest.videoUrl ? 'present' : 'none'}, video frames: ${parsedRequest.videoFrameUrls?.length ?? 0}`
    );

    const rawProviderText = await callAI(
      parsedRequest.imageUrl,
      apiKey,
      parsedRequest.videoUrl,
      { videoFrameUrls: parsedRequest.videoFrameUrls }
    );

    failureStage = 'ai_response_parsing';
    const rawResult = parseAIResponse(rawProviderText);
    const normalizedResult = normalizeAIResult(rawResult);

    console.log(`[index.ts] Normalized result for ${proofId}:`, normalizedResult);

    failureStage = 'proof_update';
    await updateProof(
      adminClient,
      proofId,
      normalizedResult,
      { previousStatus: proofRow.status }
    );

    console.log(`[index.ts] Proof ${proofId} updated successfully`);

    return jsonResponse({ success: true, proofId, result: normalizedResult });
  } catch (error) {
    console.error(`[index.ts] Error at stage ${failureStage} while processing proof ${proofId}:`, error);
    const providerFailure = failureStage === 'ai_provider';
    const details = error instanceof AIProviderError
      ? `ai_provider_http_${error.status}`
      : providerFailure
        ? 'ai_provider_network_or_request'
        : failureStage;
    return jsonResponse(
      {
        success: false,
        proofId,
        error: providerFailure ? 'AI provider request failed' : 'Validation failed',
        details
      },
      providerFailure ? 502 : 500
    );
  }
});
