// normalizer.ts
// Cleans up and normalizes whatever the model returned into a consistent shape.

import { RawAIResult, NormalizedAIResult } from './types.ts';

/**
 * Converts a 0-1 float confidence score to a 0-100 integer scale.
 * If the model already returned a 0-100 value, it is left as-is (clamped).
 */
function toPercent(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function normalizeAIResult(raw: RawAIResult): NormalizedAIResult {
  return {
    isValid: Boolean(raw.isValid),
    confidence: toPercent(raw.confidence),
    viewsCount: Math.max(0, Math.round(Number(raw.viewsCount) || 0)),
    fraudAlert: Boolean(raw.fraudAlert),
    reason: raw.reason ?? '',
    fraudType: raw.fraudType && raw.fraudType.trim() !== '' ? raw.fraudType.trim() : 'none',
    imageAuthenticityConfidence: toPercent(raw.imageAuthenticityConfidence),
    viewCountDetectionConfidence: toPercent(raw.viewCountDetectionConfidence),
    platformUICompliance: toPercent(raw.platformUICompliance),
    fraudEvidenceDetails: Array.isArray(raw.fraudEvidenceDetails) ? raw.fraudEvidenceDetails : []
  };
}
