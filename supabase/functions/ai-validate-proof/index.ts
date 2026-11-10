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
  const {
    proofId,
    preflight,
    imageUrl,
    videoUrl,
    videoFrameUrls,
    reanalyze,
    campaignName,
    campaignId,
    expectedPlatform,
  } = payload ?? {};
  const frames = (Array.isArray(videoFrameUrls) ? videoFrameUrls : [videoFrameUrls])
    .filter((u: unknown): u is string => typeof u === 'string' && u.startsWith(FRAME_PREFIX))
    .slice(0, 4);
  if (preflight !== true && (!proofId || typeof proofId !== 'string')) {
    throw new Error('proofId is required and must be a string');
  }
  if (
    typeof imageUrl !== 'string' ||
    !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(imageUrl) ||
    imageUrl.length > 3_000_000
  ) {
    throw new Error('imageUrl is required and must be a string');
  }
  if (
    preflight === true &&
    (typeof campaignId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(campaignId))
  ) {
    throw new Error('campaignId is required for proof preflight');
  }
  return {
    proofId: typeof proofId === 'string' ? proofId : undefined,
    preflight: preflight === true,
    imageUrl,
    videoUrl: typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : undefined,
    videoFrameUrls: frames,
    reanalyze: reanalyze === true,
    campaignName: typeof campaignName === 'string' ? campaignName.slice(0, 120) : undefined,
    campaignId: typeof campaignId === 'string' ? campaignId : undefined,
    expectedPlatform: typeof expectedPlatform === 'string' ? expectedPlatform.slice(0, 80) : undefined,
  };
};

async function getImageMetadata(dataUrl: string): Promise<{
  contentType: string;
  size: number;
  hash: string;
  width: number;
  height: number;
}> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Unsupported proof image format');
  const [, contentType, base64] = match;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.byteLength < 50 * 1024 || bytes.byteLength > 2 * 1024 * 1024) {
    throw new Error('Proof image size is outside the allowed range');
  }

  let width = 0;
  let height = 0;
  if (contentType === 'image/png') {
    if (
      bytes.length < 24 ||
      bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x4e ||
      bytes[3] !== 0x47
    ) {
      throw new Error('Invalid PNG image');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error('Invalid JPEG image');
    }
    const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (frameMarkers.has(marker)) {
        if (segmentLength < 7 || offset + 8 >= bytes.length) break;
        height = (bytes[offset + 5] << 8) | bytes[offset + 6];
        width = (bytes[offset + 7] << 8) | bytes[offset + 8];
        break;
      }
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  if (width < 540 || height < 720) {
    throw new Error('Proof image resolution is below 540x720');
  }

  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { contentType, size: bytes.byteLength, hash, width, height };
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
    proofId = parsedRequest.proofId || 'preflight';

    let proofRow: { userId: string; status: string } | null = null;
    let isStaff = false;
    let campaignContext:
      | { name: string; expectedPlatform?: string; viewsRequired: boolean }
      | undefined;
    if (!parsedRequest.preflight) {
      failureStage = 'proof_lookup';
      const { data, error: proofError } = await adminClient
        .from('proofs')
        .select('userId, status')
        .eq('id', proofId)
        .single();

      if (proofError || !data) {
        return jsonResponse({ success: false, proofId, error: 'proof_not_found' }, 404);
      }
      proofRow = data;

      const { data: callerProfile } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      isStaff = callerProfile?.role === 'ADMIN' || callerProfile?.role === 'MODERATOR';

      if (proofRow.userId !== user.id && !isStaff) {
        return jsonResponse({ success: false, proofId, error: 'forbidden' }, 403);
      }

      const alreadyProcessed = proofRow.status === 'validated' || proofRow.status === 'rejected';
      if (alreadyProcessed && !(parsedRequest.reanalyze && isStaff)) {
        return jsonResponse({ success: false, proofId, error: 'already_processed' }, 409);
      }
    } else {
      const { data: campaign, error: campaignError } = await adminClient
        .from('campaigns')
        .select('title, platform, status')
        .eq('id', parsedRequest.campaignId)
        .maybeSingle();
      if (campaignError || !campaign || campaign.status !== 'active') {
        return jsonResponse(
          { success: false, proofId, error: 'campaign_not_active' },
          400
        );
      }
      campaignContext = {
        name: campaign.title,
        expectedPlatform: campaign.platform || parsedRequest.expectedPlatform,
        viewsRequired: true,
      };
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
      {
        videoFrameUrls: parsedRequest.videoFrameUrls,
        campaign: campaignContext,
      }
    );

    failureStage = 'ai_response_parsing';
    const rawResult = parseAIResponse(rawProviderText);
    const normalizedResult = normalizeAIResult(rawResult);

    console.log(`[index.ts] Normalized result for ${proofId}:`, normalizedResult);

    if (parsedRequest.preflight) {
      const imageMetadata = await getImageMetadata(parsedRequest.imageUrl);
      const score = normalizedResult.confidence / 100;
      const submissionAllowed =
        score >= 0.3 &&
        (score <= 0.6 || (normalizedResult.isValid && !normalizedResult.fraudAlert));
      normalizedResult.suggestedAction =
        score <= 0.6 ? 'manual_review' : submissionAllowed ? 'approve' : 'reject';

      let validationToken: string | undefined;
      if (!submissionAllowed) {
        const { error: violationError } = await adminClient.rpc('record_user_violation', {
          target_user_id: user.id,
          violation_type: 'rejected_submission',
          content_score: score,
          violation_reason: normalizedResult.reason.slice(0, 500),
          reference_id: crypto.randomUUID(),
        });
        if (violationError) {
          console.error('[index.ts] Failed to record rejected preflight', violationError);
          throw new Error('Unable to record the rejected proof preflight');
        }
      } else {
        validationToken = crypto.randomUUID();
        const { error: tokenError } = await adminClient
          .from('proof_prevalidation_tokens')
          .insert({
            token: validationToken,
            user_id: user.id,
            campaign_id: parsedRequest.campaignId,
            content_hash: imageMetadata.hash,
            file_size: imageMetadata.size,
            content_type: imageMetadata.contentType,
            image_width: imageMetadata.width,
            image_height: imageMetadata.height,
            score,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          });
        if (tokenError) {
          console.error('[index.ts] Failed to create proof preflight token', tokenError);
          throw new Error('Unable to secure the proof preflight');
        }
      }

      return jsonResponse({
        success: true,
        proofId,
        result: normalizedResult,
        submissionAllowed,
        validationToken,
      });
    }

    failureStage = 'proof_update';
    await updateProof(
      adminClient,
      proofId,
      normalizedResult,
      { previousStatus: proofRow!.status }
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
