// supabase.ts
// Handles the Supabase connection (Service Role) and the `proofs` table update.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NormalizedAIResult } from './types.ts';

export function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets');
  }

  // Service Role bypasses RLS: this function must run server-side only.
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

/**
 * Derives the `status` column ('validated' | 'rejected') from the AI result.
 * A proof is only auto-validated when the AI thinks it's genuine AND
 * did not raise a fraud alert. Anything else falls back to 'rejected'
 * so a human can review it via `rejectionReason` / `aiAnalysis`.
 */
function resolveStatus(result: NormalizedAIResult): 'validated' | 'rejected' {
  return result.isValid && !result.fraudAlert ? 'validated' : 'rejected';
}

/**
 * Persists the normalized AI result on the corresponding row of `proofs`.
 * Maps to the actual schema:
 *  - aiValidation      boolean  -> result.isValid
 *  - viewsCount        integer  -> result.viewsCount
 *  - aiAnalysis        jsonb    -> full normalized result (scores, fraud details, etc.)
 *  - status            text     -> derived 'validated' | 'rejected'
 *  - rejectionReason   text     -> result.reason, only set when rejected
 */
export async function updateProof(
  supabase: SupabaseClient,
  proofId: string,
  result: NormalizedAIResult
): Promise<void> {
  const status = resolveStatus(result);

  const { error } = await supabase
    .from('proofs')
    .update({
      aiValidation: result.isValid,
      viewsCount: result.viewsCount,
      aiAnalysis: result,
      status,
      rejectionReason: status === 'rejected' ? result.reason : null
    })
    .eq('id', proofId);

  if (error) {
    console.error('[supabase.ts] Failed to update proof', proofId, error);
    throw new Error(`Failed to update proof ${proofId}: ${error.message}`);
  }
}
