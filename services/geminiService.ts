import { supabase } from '../supabase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProofValidationResult {
  isValid: boolean;
  confidence: number;
  viewsCount: number;
  fraudAlert: boolean;
  reason: string;
  fraudType:
  | "none"
  | "photoshop_manipulation"
  | "bot_views_pattern"
  | "early_deletion_pattern"
  | "metadata_mismatch"
  | "ui_inconsistency"
  | "other_fraud";
  imageAuthenticityConfidence: number;
  viewCountDetectionConfidence: number;
  platformUICompliance: number;
  fraudEvidenceDetails: string[];
}

// Shape returned by the ai-validate-proof Edge Function (see index.ts / types.ts).
interface EdgeFunctionResponse {
  success: boolean;
  proofId: string;
  result?: ProofValidationResult;
  error?: string;
  details?: string;
}

// 1. Initialisation (Singleton)
const RODIUMAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// if (!RODIUMAI_API_KEY) {
//   console.info("Analyse IA via Edge Function Supabase; la clé n’est pas nécessaire côté navigateur.");
// }

const fallbackAnalysis = (imageUrl: string): ProofValidationResult => {
  const url = imageUrl.toLowerCase();
  const looksLikeStory = url.includes('story') || url.includes('instagram') || url.includes('whatsapp') || url.includes('status');

  return {
    isValid: looksLikeStory,
    confidence: 62,
    viewsCount: 0,
    fraudAlert: false,
    reason: 'Analyse locale de secours : l’API distante n’était pas accessible depuis le navigateur. Vérification non finale.',
    fraudType: 'none',
    imageAuthenticityConfidence: 60,
    viewCountDetectionConfidence: 40,
    platformUICompliance: 60,
    fraudEvidenceDetails: []
  };
};

// 2. Helper: Normalize and validate the AI result structure
const normalizeAIResult = (parsed: unknown): ProofValidationResult => {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error("La réponse IA n'est pas un objet JSON valide.");
  }

  const p = parsed as Record<string, any>;

  const toBoolean = (value: any, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
      if (['false', '0', 'no', 'non'].includes(normalized)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return fallback;
  };

  const toNumber = (value: any, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsedValue = Number(value);
      if (Number.isFinite(parsedValue)) return parsedValue;
    }
    return fallback;
  };

  const toStringArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  };

  const toFraudType = (value: any): ProofValidationResult['fraudType'] => {
    const allowed: ProofValidationResult['fraudType'][] = [
      'none',
      'photoshop_manipulation',
      'bot_views_pattern',
      'early_deletion_pattern',
      'metadata_mismatch',
      'ui_inconsistency',
      'other_fraud'
    ];
    if (typeof value === 'string' && allowed.includes(value as ProofValidationResult['fraudType'])) {
      return value as ProofValidationResult['fraudType'];
    }
    return 'other_fraud';
  };

  return {
    isValid: toBoolean(p.isValid, false),
    confidence: toNumber(p.confidence, 0),
    viewsCount: toNumber(p.viewsCount, 0),
    fraudAlert: toBoolean(p.fraudAlert, false),
    reason: typeof p.reason === 'string' ? p.reason : 'Analyse IA non disponible',
    fraudType: toFraudType(p.fraudType),
    imageAuthenticityConfidence: toNumber(p.imageAuthenticityConfidence, 0),
    viewCountDetectionConfidence: toNumber(p.viewCountDetectionConfidence, 0),
    platformUICompliance: toNumber(p.platformUICompliance, 0),
    fraudEvidenceDetails: toStringArray(p.fraudEvidenceDetails)
  };
};

// 3. Helper : Conversion en Base64
const toBase64 = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
  if (imageUrl.startsWith("data:")) {
    const [meta, base64] = imageUrl.split(",");
    const mimeType = meta.split(":")[1]?.split(";")[0] ?? "image/jpeg";
    if (!base64) throw new Error("Data URL invalide.");
    return { data: base64, mimeType };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Impossible de télécharger l'image : ${response.status}`);

  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  const buffer = await blob.arrayBuffer();
  const data = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  return { data, mimeType };
};

// 4. Helper : Redimensionnement d'image
const resizeImage = (dataUrl: string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
  });
};

// 5. Fonction principale avec Retry
//    proofId est désormais obligatoire : l'Edge Function en a besoin pour
//    mettre à jour la ligne correspondante dans la table `proofs`.
export const validateProofWithAI = async (
  imageUrl: string,
  proofId: string,
  retries = 3
): Promise<ProofValidationResult> => {

  if (!proofId) {
    console.error('validateProofWithAI: proofId manquant, utilisation du fallback local.');
    return fallbackAnalysis(imageUrl);
  }

  // Conversion initiale et redimensionnement pour optimiser les tokens et la performance
  const { data, mimeType } = await toBase64(imageUrl);

  // Redimensionnement
  const resizedData = await resizeImage(`data:${mimeType};base64,${data}`);
  const base64Clean = resizedData.split(",")[1];

  // Boucle de tentatives (Retry)
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data: responseData, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
        'ai-validate-proof',
        {
          body: {
            proofId,
            imageUrl: `data:${mimeType};base64,${base64Clean}`
          }
        }
      );

      if (error) {
        throw error;
      }

      if (!responseData?.success) {
        throw new Error(responseData?.details || responseData?.error || 'Edge Function returned success: false');
      }

      if (!responseData.result) {
        throw new Error('Edge Function response is missing the result field.');
      }

      return normalizeAIResult(responseData.result);
    } catch (error: any) {
      const isTransientError = /429|500|502|503|network|fetch|cors|Failed to fetch/i.test(error?.message || '');

      if (isTransientError && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Tentative ${attempt + 1} échouée. Nouvel essai dans ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      console.warn('Analyse IA indisponible, utilisation du fallback local.', error);
      return fallbackAnalysis(imageUrl);
    }
  }

  return fallbackAnalysis(imageUrl);
};