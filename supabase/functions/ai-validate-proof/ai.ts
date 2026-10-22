
// ai.ts
// Isole toute la communication avec le fournisseur RodiumAI.

const RODIUM_URL = 'https://api.rodiumai.io/v1/chat/completions';

// Modèle configurable via un secret Supabase (RODIUMAI_MODEL).
// gpt-4o-mini lit moins bien les petits chiffres sur capture : testez 'openai/gpt-4o'.
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

// Mettez à false si le fournisseur refuse le paramètre response_format.
const USE_JSON_MODE = true;

export class AIProviderError extends Error {
  constructor(public readonly status: number) {
    super(`AI provider failed with HTTP ${status}`);
    this.name = 'AIProviderError';
  }
}

export interface CampaignContext {
  name?: string;
  expectedPlatform?: string; // ex: 'WhatsApp Status' | 'Facebook Story' | 'Instagram Story'
  viewsRequired?: boolean;
}

export interface CallAIOptions {
  /** Images extraites de la vidéo (URLs), dans l'ordre chronologique. Max 4 recommandé. */
  videoFrameUrls?: string[];
  campaign?: CampaignContext;
}

const SYSTEM_PROMPT = `Vous êtes un agent de conformité chargé de vérifier les preuves de publication soumises par les ambassadeurs de Sika Ads sur les statuts WhatsApp, les stories Facebook et les stories Instagram. Une preuve est une capture d'écran, parfois accompagnée d'images issues d'un enregistrement d'écran.

MISSION
1. Déterminer si la preuve montre un statut ou une story pertinent.
2. Lire le nombre de vues affiché.
3. Signaler une falsification UNIQUEMENT si vous pouvez décrire un indice concret et localisé.

PRINCIPES
- L'absence de certitude n'est pas une preuve de fraude. Une preuve authentique ne doit pas être rejetée à cause d'un élément secondaire flou, absent ou non vérifiable.
- Ne décrivez et ne jugez que ce qui est réellement visible. Ne prétendez jamais avoir vérifié un élément que vous ne voyez pas.
- N'inventez jamais une valeur, un indice ou un détail d'interface.

LECTURE DU NOMBRE DE VUES (étape la plus importante)
1. Repérez la zone des vues : icône en forme d'œil, mentions du type « Vu par », « vues », « spectateurs », « viewers », ou compteur associé à la liste des personnes ayant vu le statut/la story.
2. Lisez le nombre chiffre par chiffre. Convertissez les abréviations : « 1,2 k » ou « 1.2K » = 1200 ; « 3 mil » = 3000. Ignorez les séparateurs de milliers (« 1 250 » = 1250).
3. Si plusieurs nombres sont visibles (réactions, réponses, partages, heure, contacts), retenez uniquement celui qui représente les VUES.
4. Si plusieurs valeurs de vues existent (capture et images de la vidéo), retenez la valeur la plus lisible de la capture, sauf contradiction claire. Une hausse plausible entre deux instants est normale.
5. Si le nombre est masqué, coupé ou réellement illisible : viewsCount = 0, viewCountDetectionConfidence faible, et expliquez pourquoi dans "reason". Ne devinez pas.

AUTHENTICITÉ
Indices concrets qui justifient un signalement (à décrire précisément : où et quoi) :
- Chiffre des vues dont la police, la taille, l'alignement ou la netteté diffèrent nettement du reste de l'interface.
- Bords, halo, rectangle ou artefacts de superposition autour du nombre de vues.
- Zone localement floue ou lissée uniquement autour du compteur alors que le reste est net.
- Interface qui ne correspond manifestement pas à la plateforme annoncée.
- Contradiction importante et inexpliquée entre la capture et les images de la vidéo (publication différente, vues très différentes).
Éléments NON suffisants à eux seuls (ne jamais en faire un motif de rejet ni de fraude) :
- Compression, faible résolution, flou global, recadrage.
- Interface différente selon la version de l'application, la langue ou le mode sombre.
- Absence de timestamp, nom du compte masqué, notifications visibles.
- Nombre de vues légèrement différent entre deux instants.

DÉCISION
- isValid = true : un statut/une story pertinent est visible, le nombre de vues est lisible, et aucun indice concret de falsification n'est observé.
- isValid = false : uniquement si (a) la capture ne montre pas de statut/story ou est hors sujet, (b) le nombre de vues est illisible alors qu'il est requis, (c) des indices concrets de falsification sont décrits, ou (d) une contradiction importante empêche de relier les fichiers à la même publication.
- needsManualReview = true : lorsque les éléments sont insuffisants pour conclure dans un sens ou dans l'autre. Dans ce cas, isValid = false, fraudAlert = false, et "reason" explique ce qui manque.
- fraudAlert = true : uniquement si "fraudEvidenceDetails" contient au moins un indice concret observé. Sinon fraudAlert = false et fraudType = "Aucune fraude établie".
- Une anomalie seulement suspectée est formulée comme suspicion, jamais comme un fait.

SCORES (nombres de 0 à 100, ne jamais copier des valeurs d'exemple)
- confidence : confiance globale dans la décision.
- imageAuthenticityConfidence : authenticité apparente de la capture.
- viewCountDetectionConfidence : fiabilité de la lecture du nombre de vues.
- platformUICompliance : cohérence de l'interface avec la plateforme identifiée.
- videoAuthenticityConfidence et videoConsistencyScore : renseignez-les UNIQUEMENT si des images de la vidéo vous sont réellement fournies. Sinon, mettez null (jamais 0, jamais une valeur "prudente").
Un score faible signifie "incertain", pas "fraude".

CHAMP "reason" (en français, 3 à 6 phrases)
Citez dans l'ordre : la plateforme identifiée ; l'endroit et la valeur exacte des vues lues ; ce qui est cohérent et ce qui est non vérifiable ; l'état de la vidéo (analysée, non analysable, absente) ; la conclusion.

FORMAT DE SORTIE
Renvoyez UNIQUEMENT un objet JSON valide, sans Markdown ni texte autour, avec exactement ces champs :
{
  "isValid": boolean,
  "needsManualReview": boolean,
  "confidence": number,
  "viewsCount": number,
  "fraudAlert": boolean,
  "reason": string,
  "fraudType": string,
  "imageAuthenticityConfidence": number,
  "viewCountDetectionConfidence": number,
  "platformUICompliance": number,
  "videoAuthenticityConfidence": number | null,
  "videoConsistencyScore": number | null,
  "fraudEvidenceDetails": string[]
}`;

function buildContextText(
  videoUrl: string | undefined,
  frameCount: number,
  campaign?: CampaignContext
): string {
  const lines: string[] = ['FICHIERS REÇUS POUR CETTE ANALYSE :'];

  lines.push("- Une capture d'écran (première image ci-dessous).");

  if (frameCount > 0) {
    lines.push(
      `- ${frameCount} image(s) extraite(s) de la vidéo d'enregistrement d'écran, en ordre chronologique (images suivantes). Vérifiez qu'elles montrent le même statut/la même story que la capture et comparez les vues. Une évolution plausible du nombre de vues est acceptable.`
    );
  } else if (videoUrl) {
    lines.push(
      "- Une vidéo a été soumise mais elle n'est PAS visionnable par cet outil. Ne la décrivez pas, ne la jugez pas, ne l'utilisez ni pour valider ni pour rejeter. Mettez videoAuthenticityConfidence = null et videoConsistencyScore = null, et indiquez dans \"reason\" que la vidéo n'a pas pu être analysée."
    );
  } else {
    lines.push(
      '- Aucune vidéo. Évaluez la capture seule. Mettez videoAuthenticityConfidence = null et videoConsistencyScore = null. L\'absence de vidéo n\'est pas un motif de rejet.'
    );
  }

  if (campaign) {
    lines.push('CONTEXTE DE LA CAMPAGNE :');
    if (campaign.name) lines.push(`- Campagne : ${campaign.name}`);
    if (campaign.expectedPlatform) lines.push(`- Plateforme attendue : ${campaign.expectedPlatform}`);
    if (campaign.viewsRequired !== undefined) {
      lines.push(`- Nombre de vues obligatoire : ${campaign.viewsRequired ? 'oui' : 'non'}`);
    }
  }

  lines.push('Répondez uniquement avec le JSON demandé.');
  return lines.join('\n');
}

/**
 * Appelle l'endpoint chat completions de RodiumAI avec la capture
 * (et éventuellement des images extraites de la vidéo).
 * Retourne le corps brut de la réponse (texte). Lève une erreur si l'appel HTTP échoue.
 *
 * NB : un modèle de chat ne peut pas "regarder" une URL de vidéo. Pour analyser la vidéo,
 * passez 2 à 4 images extraites dans options.videoFrameUrls.
 */
export async function callAI(
  imageUrl: string,
  apiKey: string,
  videoUrl?: string,
  options: CallAIOptions = {}
): Promise<string> {
  const frames = (options.videoFrameUrls ?? []).filter(Boolean).slice(0, 4);

  const userContent: Array<any> = [
    { type: 'text', text: buildContextText(videoUrl, frames.length, options.campaign) },
    { type: 'text', text: "Capture d'écran :" },
    { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
  ];

  frames.forEach((url, i) => {
    userContent.push({ type: 'text', text: `Image ${i + 1}/${frames.length} extraite de la vidéo :` });
    userContent.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  });

  const model = Deno.env.get('RODIUMAI_MODEL') || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    // 500 tokens tronquait le JSON (raison détaillée en français) → échec de parsing.
    max_tokens: 1200,
    temperature: 0,
    stream: false
  };

  if (USE_JSON_MODE) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(RODIUM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    console.error('[ai.ts] Provider request failed with HTTP status', response.status);
    throw new AIProviderError(response.status);
  }

  return await response.text();
}

// // ai.ts
// // Isolates all communication with the RodiumAI provider.

// const RODIUM_URL = 'https://api.rodiumai.io/v1/chat/completions';

// const SYSTEM_PROMPT = `You are an automated compliance officer for Sika Ads. Analyze the provided social media screenshot proof and optional video recording proof.
// Return ONLY a valid JSON object with exactly these fields:
// {
//   "isValid": boolean,
//   "confidence": number,
//   "viewsCount": number,
//   "fraudAlert": boolean,
//   "reason": string,
//   "fraudType": string,
//   "imageAuthenticityConfidence": number,
//   "viewCountDetectionConfidence": number,
//   "platformUICompliance": number,
//   "videoAuthenticityConfidence": number,
//   "videoConsistencyScore": number,
//   "fraudEvidenceDetails": string[]
// }
// Do not include markdown fences. Do not include explanations. Return only JSON.`;

// /**
//  * Calls the RodiumAI / OpenAI chat completions endpoint with the given image (and optional video).
//  * Returns the raw response body as text (not yet parsed as the final result).
//  * Throws if the HTTP call itself fails.
//  */
// export async function callAI(imageUrl: string, apiKey: string, videoUrl?: string): Promise<string> {
//   const userContent: Array<any> = [
//     {
//       type: 'text',
//       text: videoUrl
//         ? `Vous êtes un agent de conformité automatisé pour Sika Ads. Analysez la capture d'écran ET la vidéo d'enregistrement d'écran fournies comme preuves de publication/vues sur statut/story.
// Effectuez une analyse croisée rigoureuse :
// 1. Authenticité de la capture et conformité de l'interface (WhatsApp Status, Facebook Story, Instagram Story).
// 2. Vérification que la vidéo et la capture correspondent exactement au même écran, aux mêmes vues, aux mêmes timestamps et à la même campagne.
// 3. Détection de manipulation numérique (Photoshop, montage vidéo, fausses vues, superposition).
// 4. Détection du nombre réel de vues.

// Renvoyez UNIQUEMENT un objet JSON valide contenant exactement les champs suivants :
// {
//   "isValid": boolean,
//   "confidence": number,
//   "viewsCount": number,
//   "fraudAlert": boolean,
//   "reason": string,
//   "fraudType": string,
//   "imageAuthenticityConfidence": number,
//   "viewCountDetectionConfidence": number,
//   "platformUICompliance": number,
//   "videoAuthenticityConfidence": number,
//   "videoConsistencyScore": number,
//   "fraudEvidenceDetails": string[]
// }
// L'évaluation doit être en langue française et bien détaillée.`
//         : `Vous êtes un agent de conformité automatisé pour Sika Ads. Analysez la capture d'écran de réseau social fournie (statut/story).
// Vérifiez l'authenticité de l'interface, le nombre de vues affiché, et détectez d'éventuelles falsifications (Photoshop, typographie anormale, etc.).
// Renvoyez UNIQUEMENT un objet JSON valide contenant exactement les champs suivants :
// {
//   "isValid": boolean,
//   "confidence": number,
//   "viewsCount": number,
//   "fraudAlert": boolean,
//   "reason": string,
//   "fraudType": string,
//   "imageAuthenticityConfidence": number,
//   "viewCountDetectionConfidence": number,
//   "platformUICompliance": number,
//   "videoAuthenticityConfidence": number,
//   "videoConsistencyScore": number,
//   "fraudEvidenceDetails": string[]
// }
// L'évaluation doit être en langue française et bien détaillée.`
//     },
//     { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
//   ];

//   if (videoUrl) {
//     userContent.push({
//       type: 'text',
//       text: `Lien de la vidéo d'enregistrement fournie par l'utilisateur : ${videoUrl}. Prenez en compte cette vidéo pour renforcer la confiance et vérifier l'authenticité en direct de la navigation.`
//     });
//   }

//   const response = await fetch(RODIUM_URL, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`
//     },
//     body: JSON.stringify({
//       model: 'openai/gpt-4o-mini',
//       messages: [
//         { role: 'system', content: SYSTEM_PROMPT },
//         {
//           role: 'user',
//           content: userContent
//         }
//       ],
//       max_tokens: 500,
//       temperature: 0.2,
//       stream: false
//     })
//   });

//   const text = await response.text();

//   if (!response.ok) {
//     console.error('[ai.ts] Provider error', response.status, text);
//     throw new Error(`AI provider failed (${response.status}): ${text}`);
//   }

//   return text;
// }
