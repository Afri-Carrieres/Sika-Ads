import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NormalizedAIResult } from './types.ts';
import { determineAutoAction } from '../../config/aiValidationThresholds.ts';

export function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

function resolveStatus(action: 'approve' | 'reject' | 'manual_review'): 'validated' | 'rejected' | 'pending' {
  if (action === 'approve') return 'validated';
  if (action === 'reject') return 'rejected';
  return 'pending';
}

export async function updateProof(
  supabase: SupabaseClient,
  proofId: string,
  result: NormalizedAIResult
): Promise<void> {
  const suggestedAction = determineAutoAction(result);
  const status = resolveStatus(suggestedAction);

  const enrichedAnalysis = {
    ...result,
    suggestedAction,
    analysisTimestamp: new Date().toISOString()
  };

  const { error } = await supabase
    .from('proofs')
    .update({
      aiValidation: result.isValid,
      viewsCount: result.viewsCount,
      aiAnalysis: enrichedAnalysis,
      status,
      rejectionReason: status === 'rejected' ? result.reason : null
    })
    .eq('id', proofId);

  if (error) {
    console.error('[supabase.ts] Failed to update proof', proofId, error);
    throw new Error(`Failed to update proof ${proofId}: ${error.message}`);
  }

  result.suggestedAction = suggestedAction;
}
