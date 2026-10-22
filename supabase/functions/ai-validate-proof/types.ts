// types.ts

export type SuggestedAction = 'approve' | 'reject' | 'manual_review';

export interface RequestBody {
  proofId: string;
  imageUrl: string;
  videoUrl?: string;
  /** Images extraites côté client depuis le bucket public proofs, ordre chronologique, max 4. */
  videoFrameUrls?: string[];
  reanalyze?: boolean;
}

/**
 * Réponse brute du modèle, NON fiable : les types sont volontairement larges
 * car le modèle peut renvoyer des chaînes, des null ou des fractions (0-1).
 * Le normalizer se charge de tout ramener à des valeurs sûres.
 */
export interface RawAIResult {
  isValid: boolean;
  needsManualReview?: boolean;
  confidence: number;
  viewsCount: number | string;
  fraudAlert: boolean;
  reason: string;
  fraudType: string;
  imageAuthenticityConfidence: number;
  viewCountDetectionConfidence: number;
  platformUICompliance: number;
  videoAuthenticityConfidence?: number | null;
  videoConsistencyScore?: number | null;
  fraudEvidenceDetails: string[];
}

/**
 * Résultat nettoyé, utilisé par determineAutoAction et stocké dans aiAnalysis.
 * Les scores vidéo sont `undefined` quand la vidéo n'a pas été analysée
 * ("non évalué" ≠ 0).
 */
export interface NormalizedAIResult {
  isValid: boolean;
  needsManualReview: boolean;
  confidence: number;
  viewsCount: number;
  fraudAlert: boolean;
  reason: string;
  fraudType: string;
  imageAuthenticityConfidence: number;
  viewCountDetectionConfidence: number;
  platformUICompliance: number;
  videoAuthenticityConfidence?: number;
  videoConsistencyScore?: number;
  fraudEvidenceDetails: string[];
  /** Corrections appliquées par le normalizer (traçabilité). Absent si aucune. */
  normalizationNotes?: string[];
  suggestedAction?: SuggestedAction;
}

export interface FunctionResponse {
  success: boolean;
  proofId: string;
  result?: NormalizedAIResult;
  error?: string;
  details?: string;
}

// // types.ts

// export interface RequestBody {
//   proofId: string;
//   imageUrl: string;
//   videoUrl?: string;
// }

// export interface RawAIResult {
//   isValid: boolean;
//   confidence: number;
//   viewsCount: number;
//   fraudAlert: boolean;
//   reason: string;
//   fraudType: string;
//   imageAuthenticityConfidence: number;
//   viewCountDetectionConfidence: number;
//   platformUICompliance: number;
//   videoAuthenticityConfidence?: number;
//   videoConsistencyScore?: number;
//   fraudEvidenceDetails: string[];
// }

// export interface NormalizedAIResult extends RawAIResult {
//   suggestedAction?: 'approve' | 'reject' | 'manual_review';
// }

// export interface FunctionResponse {
//   success: boolean;
//   proofId: string;
//   result?: NormalizedAIResult;
//   error?: string;
//   details?: string;
// }
