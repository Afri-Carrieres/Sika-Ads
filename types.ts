
export enum UserRole {
  AMBASSADOR = 'AMBASSADOR',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export interface Referral {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  earningsGenerated: number;
  createdAt: string;
}

export interface DailyStats {
  lastSharedDate: string;
  sharedCount: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  status: 'active' | 'blocked';
  balance: number;
  totalEarned: number;
  clicks: number;
  momoNumber: string;
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  dailyStats?: DailyStats;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl?: string | null;
  totalBudget: number;
  remainingBudget: number;
  cpc: number;
  cpv: number;
  category: string;
  status: 'pending' | 'active' | 'completed' | 'paused' | 'rejected';
  advertiserName?: string;
  advertiserPhone?: string;
  advertiserEmail?: string; // ✅ Email pour contact
  paymentStatus?: 'pending_payment' | 'paid' | 'failed';
  paymentReference?: string;
  paymentOperator?: string;
  adminStatus?: 'pending_review' | 'approved' | 'rejected';
  budgetPack?: string;
  priority?: boolean;
  createdBy?: 'user' | 'admin';
  advertiserId?: string;
  createdAt?: any;
  updatedAt?: any;
  // Nouveaux statuts pour validation paiement campagne
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: any;
  paymentConfirmedBy?: string;
  // Statut de paiement pour les campagnes créées par les utilisateurs
  campaignPaymentStatus?: 'pending_payment' | 'payment_received' | 'payment_verified' | 'payment_rejected';
  paymentAmount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  // ✅ Champs manquants ajoutés
  platform?: string; // WhatsApp | Facebook | Instagram
  maxAmbassadors?: number; // Nombre d'ambassadeurs estimés
  targetViews?: number; // Vues cibles calculées
  viewsCurrent?: number; // Vues actuelles
}

export interface AIAnalysis {
  // Champs existants
  fraudAlert: boolean; // Indique si une fraude potentielle a été détectée
  isValid: boolean; // Indique si la preuve semble valide (complémentaire à fraudAlert)
  confidence: number; // Confiance globale de l'IA dans son évaluation (0-100)
  viewsCount: number; // Nombre de vues détectées par l'IA
  reason: string; // Motif détaillé de l'évaluation (pourquoi valide/invalide/fraude)

  // Nouveaux champs pour analyse granulaire
  fraudType?: 'none' | 'photoshop_manipulation' | 'bot_views_pattern' | 'early_deletion_pattern' | 'metadata_mismatch' | 'ui_inconsistency' | 'other_fraud';
  
  // Scores de confiance pour des aspects spécifiques
  imageAuthenticityConfidence?: number; // Confiance que l'image n'a pas été altérée (0-100)
  viewCountDetectionConfidence?: number; // Confiance dans la précision du nombre de vues détecté (0-100)
  platformUICompliance?: number; // Score de conformité de l'interface utilisateur avec la plateforme (0-100)
  
  // Détails des éléments de fraude détectés
  fraudEvidenceDetails?: string[]; // Ex: ["EXIF data missing", "Font mismatch in view count area", "Inconsistent timestamp"]
  
  // Action suggérée à l'administrateur
  suggestedAction?: 'approve' | 'reject' | 'manual_review';
  
  // Horodatage de l'analyse IA
  analysisTimestamp?: string;
}

export interface Proof {
  id: string;
  userId: string;
  userName?: string;
  campaignName: string;
  campaignId?: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  size: number;
  type: string;
  status: 'pending' | 'validated' | 'rejected';
  aiValidation: boolean;
  submittedAt: string;
  rejectionReason?: string;
  viewsCount?: number;
  aiAnalysis?: AIAnalysis;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'campaign' | 'status' | 'payout' | 'announcement' | 'rejected';
  read: boolean;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  type?: string;
  status: string;
  provider?: string;
  phone?: string;
  createdAt: any;
  date?: string; // Kept for backwards compatibility if needed during migration
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}
