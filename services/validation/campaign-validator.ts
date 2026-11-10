import { supabase } from "../../supabase";

export interface CampaignValidationInput {
  userId: string;
  name: string;
  description: string;
  budget: number;
  imageFile: File;
  imageUrl: string;
}

export interface CampaignValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score?: number;
  moderationToken?: string;
}

const MIN_BUDGET = 1000;
const MAX_BUDGET = 50000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MIN_IMAGE_SIZE = 10 * 1024;

export class CampaignValidator {
  async validate(data: CampaignValidationInput): Promise<CampaignValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(data.budget) || data.budget < MIN_BUDGET) {
      errors.push("Le budget minimum est de 1000 FCFA.");
    } else if (data.budget > MAX_BUDGET) {
      errors.push("Le budget maximum est de 50000 FCFA.");
    }

    if (data.name.trim().length < 5 || data.name.trim().length > 100) {
      errors.push("Le titre doit contenir entre 5 et 100 caractères.");
    }
    if (data.description.trim().length < 10 || data.description.trim().length > 300) {
      errors.push("La description doit contenir entre 10 et 300 caractères.");
    }
    if (!["image/jpeg", "image/png"].includes(data.imageFile.type)) {
      errors.push("L’image doit être au format JPG ou PNG.");
    }
    if (data.imageFile.size < MIN_IMAGE_SIZE) {
      errors.push("L’image est trop petite (minimum 100 Ko).");
    } else if (data.imageFile.size > MAX_IMAGE_SIZE) {
      errors.push("L’image est trop volumineuse (maximum 5 Mo).");
    }

    if (errors.length > 0) return { valid: false, errors, warnings };

    const { data: account, error: accountError } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) {
      return {
        valid: false,
        errors: ["Impossible de vérifier votre compte. Veuillez réessayer."],
        warnings,
      };
    }

    const { data: preflight, error: preflightError } = await supabase.rpc(
      "check_campaign_creation",
      { requested_budget: data.budget },
    );
    if (preflightError) throw preflightError;
    if (!preflight?.allowed) {
      return {
        valid: false,
        errors: [preflight?.message || "La création de cette campagne n’est pas autorisée."],
        warnings,
      };
    }

    const { data: moderation, error: moderationError } = await supabase.functions.invoke(
      "validate-campaign-content",
      {
        body: {
          imageUrl: data.imageUrl,
          title: data.name,
          description: data.description,
          budget: data.budget,
        },
      },
    );

    if (moderationError) throw moderationError;
    if (!moderation?.success || typeof moderation.score !== "number") {
      throw new Error(moderation?.error || "La vérification du contenu est indisponible.");
    }

    if (!moderation.compliant || moderation.score < 0.5) {
      errors.push(
        moderation.reason || "L’image semble non conforme aux règles de la plateforme.",
      );
    } else if (moderation.score < 0.7) {
      warnings.push("Le contenu est incertain et pourra faire l’objet d’une vérification manuelle.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: moderation.score,
      moderationToken: moderation.moderationToken,
    };
  }
}
