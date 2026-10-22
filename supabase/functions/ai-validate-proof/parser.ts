// parser.ts
// Extrait et valide le JSON contenu dans la réponse du fournisseur IA.

import { RawAIResult } from './types.ts';

// Champs réellement indispensables. Les champs optionnels (needsManualReview,
// videoAuthenticityConfidence, videoConsistencyScore) sont gérés par le normalizer.
const REQUIRED_FIELDS: (keyof RawAIResult)[] = [
  'isValid',
  'confidence',
  'viewsCount',
  'fraudAlert',
  'reason', 
  'fraudType',
  'imageAuthenticityConfidence',
  'viewCountDetectionConfidence',
  'platformUICompliance',
  'fraudEvidenceDetails'
];

function extractJsonCandidate(content: string): string {
  const trimmed = content.trim();

  // Blocs ```json ... ``` que certains modèles ajoutent malgré les instructions.
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) return fencedMatch[1];

  // Repli : le bloc { ... } le plus externe.
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/** Certains fournisseurs renvoient message.content sous forme de tableau de parties. */
function contentToString(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return null;
}

/**
 * Prend le texte brut de la réponse HTTP du fournisseur (payload chat completion complet),
 * extrait message.content, puis parse et valide l'objet JSON attendu.
 * Lève une erreur descriptive à chaque étape pouvant échouer.
 */
export function parseAIResponse(rawProviderText: string): RawAIResult {
  let providerPayload: any;
  try {
    providerPayload = JSON.parse(rawProviderText);
  } catch {
    throw new Error('Unable to parse AI provider raw response as JSON');
  }

  const choice = providerPayload?.choices?.[0];
  const content = contentToString(choice?.message?.content);

  if (content === null || content.trim() === '') {
    const refusal = choice?.message?.refusal;
    if (typeof refusal === 'string' && refusal) {
      throw new Error(`AI provider refused to answer: ${refusal}`);
    }
    throw new Error('AI provider response is missing choices[0].message.content');
  }

  const jsonCandidate = extractJsonCandidate(content);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    const truncated = choice?.finish_reason === 'length';
    const hint = truncated ? ' (response truncated: finish_reason=length, increase max_tokens)' : '';
    throw new Error(`AI provider returned non-JSON content${hint}: ${content.slice(0, 500)}`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI provider JSON is not an object');
  }

  const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));
  if (missing.length > 0) {
    throw new Error(`AI JSON missing required fields: ${missing.join(', ')}`);
  }

  return parsed as RawAIResult;
}


// // parser.ts
// // Extracts and validates the JSON payload embedded in the AI provider's response.

// import { RawAIResult } from './types.ts';

// const REQUIRED_FIELDS: (keyof RawAIResult)[] = [
//   'isValid',
//   'confidence',
//   'viewsCount',
//   'fraudAlert',
//   'reason',
//   'fraudType',
//   'imageAuthenticityConfidence',
//   'viewCountDetectionConfidence',
//   'platformUICompliance',
//   'fraudEvidenceDetails'
// ];

// function extractJsonCandidate(content: string): string {
//   const trimmed = content.trim();

//   // Handles ```json ... ``` fenced blocks some models still add despite instructions.
//   const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
//   if (fencedMatch?.[1]) return fencedMatch[1];

//   // Fallback: grab the outermost { ... } block.
//   const firstBrace = trimmed.indexOf('{');
//   const lastBrace = trimmed.lastIndexOf('}');
//   if (firstBrace !== -1 && lastBrace > firstBrace) {
//     return trimmed.slice(firstBrace, lastBrace + 1);
//   }

//   return trimmed;
// }

// /**
//  * Takes the raw HTTP response text from the AI provider (the full chat
//  * completion payload), extracts message.content, and parses/validates
//  * the JSON object the model was asked to produce.
//  * Throws a descriptive error at every step that can fail.
//  */
// export function parseAIResponse(rawProviderText: string): RawAIResult {
//   let providerPayload: any;
//   try {
//     providerPayload = JSON.parse(rawProviderText);
//   } catch {
//     throw new Error('Unable to parse AI provider raw response as JSON');
//   }

//   const content = providerPayload?.choices?.[0]?.message?.content;
//   if (typeof content !== 'string') {
//     throw new Error('AI provider response is missing choices[0].message.content');
//   }

//   const jsonCandidate = extractJsonCandidate(content);

//   let parsed: any;
//   try {
//     parsed = JSON.parse(jsonCandidate);
//   } catch {
//     throw new Error(`AI provider returned non-JSON content: ${content}`);
//   }

//   const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));
//   if (missing.length > 0) {
//     throw new Error(`AI JSON missing required fields: ${missing.join(', ')}`);
//   }

//   return parsed as RawAIResult;
// }
