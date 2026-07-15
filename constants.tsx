
import { Campaign, User, UserRole, Notification, Proof } from './types';

export const MOCK_USER: User = {
  id: 'u-123',
  name: 'Jean-Pierre Koffi',
  email: 'jp.koffi@example.tg',
  status: 'active',
  role: UserRole.AMBASSADOR,
  balance: 4500,
  totalEarned: 12800,
  clicks: 145,
  momoNumber: '+228 90 00 00 00',
  referralCode: 'JEAN228',
  referralCount: 12,
  referralEarnings: 4500
};

export const MOCK_ADMIN_USERS: User[] = [
  MOCK_USER,
  {
    id: 'u-456',
    name: 'Alice Akpovi',
    email: 'alice.akpovi@gmail.com',
    status: 'active',
    role: UserRole.AMBASSADOR,
    balance: 12000,
    totalEarned: 45000,
    clicks: 890,
    momoNumber: '+228 91 11 22 33',
    referralCode: 'ALICE228',
    referralCount: 25,
    referralEarnings: 15000
  }
];

export const CATEGORIES = ['Tech', 'Mode', 'Food', 'Beauty', 'Service', 'Formation', 'Emplois/Stages'];

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c-1',
    title: 'Nouveau Burger Spicy - FastFood TG',
    description: 'Faites découvrir le nouveau burger épicé à votre communauté ! Gagnez de l\'argent pour chaque vue vérifiée.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://fastfood.tg/menu/spicy',
    totalBudget: 50000,
    remainingBudget: 35000,
    cpc: 15,
    cpv: 100,
    category: 'Food',
    status: 'active'
  },
  {
    id: 'c-2',
    title: 'Soldes Tech 2024 - Lomé Connect',
    description: 'Jusqu\'à -50% sur les laptops et smartphones. Partagez la promo high-tech de l\'année !',
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://lomeconnect.tg/deals',
    totalBudget: 100000,
    remainingBudget: 82000,
    cpc: 25,
    cpv: 150,
    category: 'Tech',
    status: 'active'
  },
  {
    id: 'c-3',
    title: 'Collection Été - Nana Chic',
    description: 'Découvrez les nouveaux pagnes et accessoires tendance pour cet été à Lomé.',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://nanachic.tg/collection',
    totalBudget: 30000,
    remainingBudget: 28000,
    cpc: 20,
    cpv: 120,
    category: 'Mode',
    status: 'active'
  },
  {
    id: 'c-archive-1',
    title: 'Ancienne Promo Pizza - Pizza Hut TG',
    description: 'Offre expirée. Cette campagne est terminée car le budget a été entièrement consommé.',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://pizzahut.tg',
    totalBudget: 20000,
    remainingBudget: 0,
    cpc: 10,
    cpv: 50,
    category: 'Food',
    status: 'completed'
  },
  {
    id: 'c-4',
    title: 'Soin Éclat - Beauty Palace',
    description: 'Routine visage complète pour un teint radieux. Offre spéciale -30%.',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://beautypalace.tg/soins',
    totalBudget: 45000,
    remainingBudget: 40000,
    cpc: 18,
    cpv: 110,
    category: 'Beauty',
    status: 'active'
  },
  {
    id: 'c-5',
    title: 'Formation Dev Web - Lomé Digital',
    description: 'Devenez développeur en 6 mois. Inscriptions ouvertes pour la nouvelle cohorte.',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://lomedigital.tg/formation',
    totalBudget: 75000,
    remainingBudget: 70000,
    cpc: 30,
    cpv: 200,
    category: 'Formation',
    status: 'active'
  },
  {
    id: 'c-6',
    title: 'Lavage Auto Pro - GreenWash',
    description: 'Lavage écologique à domicile. Votre voiture brille sans gaspiller d\'eau.',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://greenwash.tg/reserver',
    totalBudget: 25000,
    remainingBudget: 22000,
    cpc: 15,
    cpv: 80,
    category: 'Service',
    status: 'active'
  },
  {
    id: 'c-7',
    title: 'Stage Marketing - Ad Agency',
    description: 'Nous recrutons 5 stagiaires passionnés par le digital. Postulez dès maintenant !',
    imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800&auto=format&fit=crop',
    targetUrl: 'https://adagency.tg/jobs',
    totalBudget: 15000,
    remainingBudget: 12000,
    cpc: 10,
    cpv: 50,
    category: 'Emplois/Stages',
    status: 'active'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    title: 'Preuve validée !',
    message: 'Votre preuve pour la campagne FastFood TG a été validée. +100 FCFA ajoutés.',
    type: 'status',
    read: false,
    createdAt: new Date().toISOString()
  }
];

export const MOCK_PROOFS: (Proof & { campaignTitle: string; userName: string })[] = [
  {
    id: 'p-1',
    userId: 'u-123',
    campaignName: 'Nouveau Burger Spicy',
    campaignTitle: 'Nouveau Burger Spicy',
    userName: 'Jean-Pierre Koffi',
    downloadURL: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop',
    fileName: 'screenshot-burger.jpg',
    storagePath: 'proofs/u-123/screenshot-burger.jpg',
    size: 256000,
    type: 'image/jpeg',
    status: 'pending',
    aiValidation: false,
    submittedAt: '2024-05-21T10:00:00Z',
    aiAnalysis: {
      isValid: true,
      confidence: 0.92,
      viewsCount: 45,
      fraudAlert: false,
      reason: "Capture d'écran authentique avec contenu publicitaire clair."
    }
  }
];