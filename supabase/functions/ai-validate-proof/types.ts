// types.ts

export interface RequestBody {
  proofId: string;
  imageUrl: string;
}

export interface RawAIResult {
  isValid: boolean;
  confidence: number;
  viewsCount: number;
  fraudAlert: boolean;
  reason: string;
  fraudType: string;
  imageAuthenticityConfidence: number;
  viewCountDetectionConfidence: number;
  platformUICompliance: number;
  fraudEvidenceDetails: string[];
}

export interface NormalizedAIResult extends RawAIResult {}

export interface FunctionResponse {
  success: boolean;
  proofId: string;
  result?: NormalizedAIResult;
  error?: string;
  details?: string;
}
