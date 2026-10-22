// normalizer.ts
// Nettoie et normalise la réponse du modèle en une forme cohérente et sûre.

import { RawAIResult, NormalizedAIResult } from './types.ts';

const NO_FRAUD = 'none';

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['true', 'oui', 'yes', '1'].includes(value.trim().toLowerCase());
  }
  return false; // null, undefined, autre
}

/** Convertit en nombre fini, ou undefined si impossible (null, "N/A", NaN...). */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').replace(',', '.').trim();
    if (cleaned === '') return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Ramène un score sur 0-100. Une fraction strictement comprise entre 0 et 1
 * (ex: 0.95) est interprétée comme un pourcentage. 1 reste 1 (le prompt demande 0-100).
 */
function toPercent(value: unknown): number {
  const n = toNumber(value);
  if (n === undefined) return 0;
  const percent = n > 0 && n < 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

/** Score optionnel : null / absent / illisible => undefined ("non évalué"), jamais 0. */
function toOptionalPercent(value: unknown): number | undefined {
  return toNumber(value) === undefined ? undefined : toPercent(value);
}

/** Nombre de vues : accepte un nombre ou une chaîne ("1 250", "1,2k", "3 mil"). */
function toViews(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }
  if (typeof value !== 'string') return 0;

  const s = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = s.match(/^([\d.,]+)(k|mil)?$/);
  if (!match) return 0;

  const [, digits, suffix] = match;
  if (suffix) {
    // "1,2k" / "1.2k" => 1200
    const n = Number(digits.replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 1000)) : 0;
  }
  // Sans suffixe : "," et "." sont des séparateurs de milliers ("1.250" => 1250)
  const n = Number(digits.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function normalizeFraudType(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  const lower = text.toLowerCase();
  if (
    lower === '' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'aucune' ||
    lower.startsWith('aucune fraude')
  ) {
    return NO_FRAUD;
  }
  return text;
}

export function normalizeAIResult(raw: RawAIResult): NormalizedAIResult {
  const notes: string[] = [];

  const evidence = Array.isArray(raw.fraudEvidenceDetails)
    ? raw.fraudEvidenceDetails
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item !== '')
    : [];

  let isValid = toBool(raw.isValid);
  let fraudAlert = toBool(raw.fraudAlert);
  let needsManualReview = toBool(raw.needsManualReview);
  let fraudType = normalizeFraudType(raw.fraudType);

  // Garde-fou 1 : une alerte de fraude sans indice concret n'est pas recevable.
  // On ne rejette pas, on envoie en vérification manuelle.
  if (fraudAlert && evidence.length === 0) {
    fraudAlert = false;
    fraudType = NO_FRAUD;
    needsManualReview = true;
    isValid = false;
    notes.push('fraudAlert ignoré : aucun indice concret dans fraudEvidenceDetails. Vérification manuelle requise.');
  }

  // Garde-fou 2 : une preuve ne peut pas être valide avec une alerte de fraude active.
  if (fraudAlert && isValid) {
    isValid = false;
    notes.push('isValid forcé à false : fraudAlert actif.');
  }

  // Garde-fou 3 : "à vérifier manuellement" et "valide" sont incompatibles.
  if (needsManualReview && isValid) {
    isValid = false;
    notes.push('isValid forcé à false : needsManualReview actif.');
  }

  const reason =
    typeof raw.reason === 'string' && raw.reason.trim() !== ''
      ? raw.reason.trim()
      : 'Aucune explication fournie par le modèle.';

  const result: NormalizedAIResult = {
    isValid,
    needsManualReview,
    confidence: toPercent(raw.confidence),
    viewsCount: toViews(raw.viewsCount),
    fraudAlert,
    reason,
    fraudType,
    imageAuthenticityConfidence: toPercent(raw.imageAuthenticityConfidence),
    viewCountDetectionConfidence: toPercent(raw.viewCountDetectionConfidence),
    platformUICompliance: toPercent(raw.platformUICompliance),
    videoAuthenticityConfidence: toOptionalPercent(raw.videoAuthenticityConfidence),
    videoConsistencyScore: toOptionalPercent(raw.videoConsistencyScore),
    fraudEvidenceDetails: evidence
  };

  if (notes.length > 0) {
    result.normalizationNotes = notes;
  }

  return result;
}

// // normalizer.ts
// // Cleans up and normalizes whatever the model returned into a consistent shape.

// import { RawAIResult, NormalizedAIResult } from './types.ts';

// /**
//  * Converts a 0-1 float confidence score to a 0-100 integer scale.
//  * If the model already returned a 0-100 value, it is left as-is (clamped).
//  */
// function toPercent(value: number): number {
//   if (typeof value !== 'number' || Number.isNaN(value)) return 0;
//   const percent = value <= 1 ? value * 100 : value;
//   return Math.max(0, Math.min(100, Math.round(percent)));
// }

// export function normalizeAIResult(raw: RawAIResult): NormalizedAIResult {
//   return {
//     isValid: Boolean(raw.isValid),
//     confidence: toPercent(raw.confidence),
//     viewsCount: Math.max(0, Math.round(Number(raw.viewsCount) || 0)),
//     fraudAlert: Boolean(raw.fraudAlert),
//     reason: raw.reason ?? '',
//     fraudType: raw.fraudType && raw.fraudType.trim() !== '' ? raw.fraudType.trim() : 'none',
//     imageAuthenticityConfidence: toPercent(raw.imageAuthenticityConfidence),
//     viewCountDetectionConfidence: toPercent(raw.viewCountDetectionConfidence),
//     platformUICompliance: toPercent(raw.platformUICompliance),
//     videoAuthenticityConfidence: raw.videoAuthenticityConfidence !== undefined ? toPercent(raw.videoAuthenticityConfidence) : undefined,
//     videoConsistencyScore: raw.videoConsistencyScore !== undefined ? toPercent(raw.videoConsistencyScore) : undefined,
//     fraudEvidenceDetails: Array.isArray(raw.fraudEvidenceDetails) ? raw.fraudEvidenceDetails : []
//   };
// }
