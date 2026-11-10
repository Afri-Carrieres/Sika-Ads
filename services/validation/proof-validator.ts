import { supabase } from "../../supabase";
import { ProofValidationResult, validateProofWithAI } from "../geminiService";

export interface ProofValidationInput {
  userId: string;
  imageFile: File;
  campaignName: string;
  campaignId: string;
  expectedPlatform?: string;
}

export interface ProofSubmissionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  imageHash: string;
  validationToken?: string;
  analysis?: ProofValidationResult;
}

const MIN_FILE_SIZE = 50 * 1024;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MIN_WIDTH = 540;
const MIN_HEIGHT = 720;

const readImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Le fichier sélectionné ne peut pas être lu comme une image."));
    };
    image.src = url;
  });

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Impossible de lire l’image."));
    };
    reader.onerror = () => reject(new Error("Impossible de lire l’image."));
    reader.readAsDataURL(file);
  });

const hashFile = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

export class ProofValidator {
  async validate(data: ProofValidationInput): Promise<ProofSubmissionValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const file = data.imageFile;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      errors.push("Seules les images JPG et PNG sont acceptées.");
    }
    if (file.size < MIN_FILE_SIZE) {
      errors.push("L’image est trop petite (minimum 50 Ko).");
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push("L’image est trop volumineuse (maximum 2 Mo).");
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings, score: 0, imageHash: "" };
    }

    const [image, imageHash] = await Promise.all([readImage(file), hashFile(file)]);
    if (image.width < MIN_WIDTH || image.height < MIN_HEIGHT) {
      errors.push("La résolution minimale requise est de 540 × 720 pixels.");
    }
    if (errors.length > 0) {
      return { valid: false, errors, warnings, score: 0, imageHash };
    }

    const { data: preflight, error: preflightError } = await supabase.rpc(
      "check_proof_submission",
      { submitted_image_hash: imageHash },
    );
    if (preflightError) throw preflightError;
    if (!preflight?.allowed) {
      return {
        valid: false,
        errors: [preflight?.message || "La soumission de preuve n’est pas autorisée."],
        warnings,
        score: 0,
        imageHash,
      };
    }

    const analysis = await validateProofWithAI(
      await fileToDataUrl(file),
      null,
      undefined,
      [],
      1,
      {
        throwOnError: true,
        preflight: true,
        campaignName: data.campaignName,
        campaignId: data.campaignId,
        expectedPlatform: data.expectedPlatform,
      },
    );
    const score = analysis.confidence / 100;

    if (!analysis.submissionAllowed || score < 0.3) {
      return {
        valid: false,
        errors: [analysis.reason || "La preuve ne semble pas conforme."],
        warnings,
        score,
        imageHash,
        analysis,
      };
    }
    if (!analysis.validationToken) {
      throw new Error("La vérification sécurisée de la preuve n’a pas abouti. Réessayez.");
    }

    if (score <= 0.6 || analysis.suggestedAction === "manual_review") {
      warnings.push("La preuve sera envoyée en révision manuelle.");
    }

    return {
      valid: true,
      errors,
      warnings,
      score,
      imageHash,
      validationToken: analysis.validationToken,
      analysis,
    };
  }
}
