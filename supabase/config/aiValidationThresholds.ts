/**
 * Configuration des seuils de validation automatique par l'IA
 * Utilisée pour déterminer si une preuve doit être auto-validée, auto-rejetée, ou requiert une révision manuelle
 */

export const AI_VALIDATION_CONFIG = {
  // Critères pour auto-approbation
  autoApprove: {
    minConfidence: 95, // Confiance minimale globale requise (0-100)
    fraudAlertMustBeFalse: true, // Aucune alerte de fraude ne doit être présente
    minImageAuthenticityConfidence: 90, // Confiance minimale sur l'authenticité de l'image
    minViewCountDetectionConfidence: 85, // Confiance minimale sur la détection du nombre de vues
    minVideoAuthenticityConfidence: 85, // Confiance minimale sur la vidéo (si présente)
    minVideoConsistencyScore: 85, // Cohérence capture/vidéo minimale (si présente)
  },

  // Critères pour auto-rejet
  autoReject: {
    fraudTypesToAutoReject: [
      'photoshop_manipulation',
      'metadata_mismatch',
      'video_editing_manipulation',
      'video_mismatch'
    ],
    maxImageAuthenticityConfidence: 60, // Si confiance d'authenticité < 60%, rejeter
    maxVideoConsistencyScore: 50, // Si cohérence image/vidéo < 50% alors qu'une vidéo est soumise
    maxVideoAuthenticityConfidence: 50, // Si authenticité vidéo < 50%
    fraudTypesWithStrictThreshold: {
      'bot_views_pattern': { maxConfidence: 50 },
      'ui_inconsistency': { maxConfidence: 40 },
      'early_deletion_pattern': { maxConfidence: 55 },
    },
  },

  // Tous les autres cas
  manualReview: {
    description: 'Cases nécessitant une révision humaine',
    conditions: [
      'suggestedAction === "manual_review"',
      'confidence entre 70 et 95',
      'fraudType détecté mais confiance insuffisante pour auto-rejet',
      'Combinaison de scores contradictoires (ex: viewsCount élevé mais imageAuthenticityConfidence faible)',
      'Vidéo présente mais score de cohérence moyen (50-84%)',
    ],
  },

  // Configuration des messages et actions
  notificationMessages: {
    autoApproved: {
      ambassador: '✅ Votre preuve (capture et vidéo) a été validée automatiquement par notre système d\'analyse IA.',
      admin: 'Preuve auto-validée (confiance: {confidence}%)',
    },
    autoRejected: {
      ambassador: '❌ Votre preuve a été rejetée. Raison: {reason}. Détails: {fraudType}',
      admin: 'Preuve auto-rejetée ({fraudType}) - {reason}',
    },
    manualReview: {
      ambassador: '⏳ Votre preuve est en cours de révision par notre équipe. Nous vous contacterons bientôt.',
      admin: 'À examiner manuellement - Confiance: {confidence}%, Action suggérée: {suggestedAction}',
    },
  },
};

/**
 * Détermine l'action à prendre basée sur l'analyse IA
 * @param analysis L'analyse IA complète
 * @returns L'action recommandée ('approve' | 'reject' | 'manual_review')
 */
export function determineAutoAction(analysis: any): 'approve' | 'reject' | 'manual_review' {
  // Cas d'auto-approbation
  const passesImageMetrics = 
    analysis.confidence >= AI_VALIDATION_CONFIG.autoApprove.minConfidence &&
    !analysis.fraudAlert &&
    (analysis.imageAuthenticityConfidence ?? 100) >= AI_VALIDATION_CONFIG.autoApprove.minImageAuthenticityConfidence &&
    (analysis.viewCountDetectionConfidence ?? 100) >= AI_VALIDATION_CONFIG.autoApprove.minViewCountDetectionConfidence;

  const passesVideoMetrics = 
    (analysis.videoAuthenticityConfidence === undefined || analysis.videoAuthenticityConfidence >= AI_VALIDATION_CONFIG.autoApprove.minVideoAuthenticityConfidence) &&
    (analysis.videoConsistencyScore === undefined || analysis.videoConsistencyScore >= AI_VALIDATION_CONFIG.autoApprove.minVideoConsistencyScore);

  if (passesImageMetrics && passesVideoMetrics) {
    return 'approve';
  }

  // Cas d'auto-rejet - types de fraude stricts
  if (
    analysis.fraudType &&
    AI_VALIDATION_CONFIG.autoReject.fraudTypesToAutoReject.includes(analysis.fraudType)
  ) {
    return 'reject';
  }

  // Cas d'auto-rejet - authenticité d'image trop faible
  if (
    analysis.imageAuthenticityConfidence !== undefined &&
    analysis.imageAuthenticityConfidence < AI_VALIDATION_CONFIG.autoReject.maxImageAuthenticityConfidence
  ) {
    return 'reject';
  }

  // Cas d'auto-rejet - incohérence vidéo / fausse vidéo flagrante
  if (
    analysis.videoConsistencyScore !== undefined &&
    analysis.videoConsistencyScore < AI_VALIDATION_CONFIG.autoReject.maxVideoConsistencyScore
  ) {
    return 'reject';
  }

  if (
    analysis.videoAuthenticityConfidence !== undefined &&
    analysis.videoAuthenticityConfidence < AI_VALIDATION_CONFIG.autoReject.maxVideoAuthenticityConfidence
  ) {
    return 'reject';
  }

  // Cas d'auto-rejet - autres types de fraude avec seuils stricts
  if (analysis.fraudType && analysis.fraudType in AI_VALIDATION_CONFIG.autoReject.fraudTypesWithStrictThreshold) {
    const threshold = AI_VALIDATION_CONFIG.autoReject.fraudTypesWithStrictThreshold[analysis.fraudType as keyof typeof AI_VALIDATION_CONFIG.autoReject.fraudTypesWithStrictThreshold];
    if (analysis.confidence <= threshold.maxConfidence) {
      return 'reject';
    }
  }

  // Par défaut: révision manuelle
  return 'manual_review';
}
