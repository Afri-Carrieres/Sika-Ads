// ai.ts
// Isolates all communication with the RodiumAI provider.

const RODIUM_URL = 'https://api.rodiumai.io/v1/chat/completions';

const SYSTEM_PROMPT = `You are an automated compliance officer. Analyze the provided social media screenshot.
Return ONLY a valid JSON object with exactly these fields:
{
  "isValid": boolean,
  "confidence": number,
  "viewsCount": number,
  "fraudAlert": boolean,
  "reason": string,
  "fraudType": string,
  "imageAuthenticityConfidence": number,
  "viewCountDetectionConfidence": number,
  "platformUICompliance": number,
  "fraudEvidenceDetails": string[]
}
Do not include markdown. Do not include explanations. Return only JSON.`;

/**
 * Calls the RodiumAI chat completions endpoint with the given image.
 * Returns the raw response body as text (not yet parsed as the final result).
 * Throws if the HTTP call itself fails.
 */
export async function callAI(imageUrl: string, apiKey: string): Promise<string> {
  const response = await fetch(RODIUM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "Vous êtes un agent de conformité automatisé. Analysez la capture d'écran de réseau social fournie. Renvoyez UNIQUEMENT un objet JSON valide contenant exactement les champs suivants : { \"isValid\": boolean, \"confidence\": number, \"viewsCount\": number, \"fraudAlert\": boolean, \"reason\": string, \"fraudType\": string, \"imageAuthenticityConfidence\": number, \"viewCountDetectionConfidence\": number, \"platformUICompliance\": number, \"fraudEvidenceDetails\": string[] } N'incluez pas de balisage Markdown. En langue française et bien détaillé"
              // text: 'Analyze this screenshot. Return strict JSON. Determine if it is a genuine social story/status, estimate views, and detect obvious fraud cues.'
            },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.2,
      stream: false
    })
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('[ai.ts] Provider error', response.status, text);
    throw new Error(`AI provider failed (${response.status}): ${text}`);
  }

  return text;
}
