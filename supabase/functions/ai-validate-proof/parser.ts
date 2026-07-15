// parser.ts
// Extracts and validates the JSON payload embedded in the AI provider's response.

import { RawAIResult } from './types.ts';

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

  // Handles ```json ... ``` fenced blocks some models still add despite instructions.
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) return fencedMatch[1];

  // Fallback: grab the outermost { ... } block.
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * Takes the raw HTTP response text from the AI provider (the full chat
 * completion payload), extracts message.content, and parses/validates
 * the JSON object the model was asked to produce.
 * Throws a descriptive error at every step that can fail.
 */
export function parseAIResponse(rawProviderText: string): RawAIResult {
  let providerPayload: any;
  try {
    providerPayload = JSON.parse(rawProviderText);
  } catch {
    throw new Error('Unable to parse AI provider raw response as JSON');
  }

  const content = providerPayload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('AI provider response is missing choices[0].message.content');
  }

  const jsonCandidate = extractJsonCandidate(content);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    throw new Error(`AI provider returned non-JSON content: ${content}`);
  }

  const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));
  if (missing.length > 0) {
    throw new Error(`AI JSON missing required fields: ${missing.join(', ')}`);
  }

  return parsed as RawAIResult;
}
