
// ai.ts
// Isolates all communication with the RodiumAI provider.

const RODIUM_URL = 'https://api.rodiumai.io/v1/chat/completions';

const SYSTEM_PROMPT = `You are an automated compliance officer for Sika Ads. Analyze the provided social media screenshot proof and optional video recording proof.
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
  "videoAuthenticityConfidence": number,
  "videoConsistencyScore": number,
  "fraudEvidenceDetails": string[]
}
Do not include markdown fences. Do not include explanations. Return only JSON.`;

/**
 * Calls the RodiumAI / OpenAI chat completions endpoint with the given image (and optional video).
 * Returns the raw response body as text (not yet parsed as the final result).
 * Throws if the HTTP call itself fails.
 */
export async function callAI(imageUrl: string, apiKey: string, videoUrl?: string): Promise<string> {
  const userContent: Array<any> = [
    {
      type: 'text',
      text: videoUrl
        ? `Vous êtes un agent de conformité automatisé pour Sika Ads. Analysez la capture d'écran ET la vidéo d'enregistrement d'écran fournies comme preuves de publication/vues sur statut/story.
Effectuez une analyse croisée rigoureuse :
1. Authenticité de la capture et conformité de l'interface (WhatsApp Status, Facebook Story, Instagram Story).
2. Vérification que la vidéo et la capture correspondent exactement au même écran, aux mêmes vues, aux mêmes timestamps et à la même campagne.
3. Détection de manipulation numérique (Photoshop, montage vidéo, fausses vues, superposition).
4. Détection du nombre réel de vues.

Renvoyez UNIQUEMENT un objet JSON valide contenant exactement les champs suivants :
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
  "videoAuthenticityConfidence": number,
  "videoConsistencyScore": number,
  "fraudEvidenceDetails": string[]
}
L'évaluation doit être en langue française et bien détaillée.`
        : `Vous êtes un agent de conformité automatisé pour Sika Ads. Analysez la capture d'écran de réseau social fournie (statut/story).
Vérifiez l'authenticité de l'interface, le nombre de vues affiché, et détectez d'éventuelles falsifications (Photoshop, typographie anormale, etc.).
Renvoyez UNIQUEMENT un objet JSON valide contenant exactement les champs suivants :
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
  "videoAuthenticityConfidence": number,
  "videoConsistencyScore": number,
  "fraudEvidenceDetails": string[]
}
L'évaluation doit être en langue française et bien détaillée.`
    },
    { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
  ];

  if (videoUrl) {
    userContent.push({
      type: 'text',
      text: `Lien de la vidéo d'enregistrement fournie par l'utilisateur : ${videoUrl}. Prenez en compte cette vidéo pour renforcer la confiance et vérifier l'authenticité en direct de la navigation.`
    });
  }

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
          content: userContent
        }
      ],
      max_tokens: 500,
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
