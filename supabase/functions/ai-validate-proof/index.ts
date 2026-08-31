import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RequestBody, FunctionResponse } from './types.ts';
import { callAI } from './ai.ts';
import { parseAIResponse } from './parser.ts';
import { normalizeAIResult } from './normalizer.ts';
import { getSupabaseClient, updateProof } from './supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

async function authenticateRequest(req: Request): Promise<{ userId: string; isStaff: boolean } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';
  return { userId: user.id, isStaff };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let proofId = 'unknown';

  try {
    const auth = await authenticateRequest(req);
    if (!auth || !auth.isStaff) {
      return jsonResponse(
        { success: false, proofId: 'unknown', error: 'Unauthorized: staff access required' },
        401
      );
    }

    const body = await req.json();
    console.log('[index.ts] Received body:', JSON.stringify(body));

    const parsedRequest = validateRequest(body);
    proofId = parsedRequest.proofId;

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

    console.log(`[index.ts] Validating proof ${proofId} for user ${auth.userId}`);

    const rawProviderText = await callAI(parsedRequest.imageUrl, apiKey);
    const rawResult = parseAIResponse(rawProviderText);
    const normalizedResult = normalizeAIResult(rawResult);

    console.log(`[index.ts] Normalized result for ${proofId}:`, normalizedResult);

    const supabase = getSupabaseClient();
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
        details: String(error instanceof Error ? error.message : error)
      },
      500
    );
  }
});
