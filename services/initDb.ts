// services/initDb.ts

import { supabase } from "../supabase";

export const initializeDatabase = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUser = session?.user;

  if (!currentUser) {
    console.error("Tu dois être connecté !");
    return;
  }

  try {
    console.log("Initialisation de la base...");

    // ===================================================
    // 1️⃣ ADMIN
    // ===================================================

    await supabase.from("users").upsert({
      id: currentUser.id,
      name: currentUser.user_metadata?.name || "Admin Principal",
      email: currentUser.email,
      role: "ADMIN",
      status: "active",
      balance: 0,
      totalEarned: 0,
      clicks: 0,
      momoNumber: "90000000",
      referralCode: "ADMIN001",
      referralCount: 0,
      referralEarnings: 0,
      createdAt: new Date().toISOString()
    });

    // ===================================================
    // 2️⃣ AMBASSADOR EXEMPLE
    // ===================================================

    const ambassadorId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await supabase.from("users").insert({
      id: ambassadorId,
      name: "Jean Ambassadeur",
      email: "jean@gmail.com",
      role: "AMBASSADOR",
      status: "active",
      balance: 1500,
      totalEarned: 5000,
      clicks: 120,
      momoNumber: "91223344",
      referralCode: "JEAN91",
      referralCount: 2,
      referralEarnings: 1000,
      createdAt: new Date().toISOString()
    });

    // ===================================================
    // 3️⃣ CAMPAGNE
    // ===================================================

    const { data: campaignData, error: campaignError } = await supabase.from("campaigns").insert({
      title: "Campagne Moov Africa",
      description: "Partagez sur votre statut.",
      imageUrl: "https://via.placeholder.com/800x400",
      totalBudget: 100000,
      remainingBudget: 100000,
      cpc: 25,
      cpv: 10,
      category: "Services",
      status: "active",
      createdAt: new Date().toISOString()
    }).select().single();

    if (campaignError || !campaignData) {
      throw campaignError || new Error("Failed to insert campaign example");
    }

    // ===================================================
    // 4️⃣ PREUVE
    // ===================================================

    const proofId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await supabase.from("proofs").insert({
      id: proofId,
      userId: ambassadorId,
      userName: "Jean Ambassadeur",
      campaignId: campaignData.id,
      campaignName: "Campagne Moov Africa",
      downloadURL: "https://via.placeholder.com/400x400",
      status: "pending",
      viewsCount: 0,
      submittedAt: new Date().toISOString(),
      aiAnalysis: {
        isValid: true,
        confidence: 0.87
      }
    });

    // ===================================================
    // 5️⃣ NOTIFICATION
    // ===================================================

    await supabase.from("notifications").insert({
      userId: ambassadorId,
      title: "Nouvelle campagne disponible",
      message: "Une nouvelle campagne est active.",
      type: "campaign",
      read: false,
      createdAt: new Date().toISOString()
    });

    // ===================================================
    // 6️⃣ WITHDRAWAL
    // ===================================================

    await supabase.from("withdrawals").insert({
      userId: ambassadorId,
      userName: "Jean Ambassadeur",
      amount: 2000,
      status: "pending",
      provider: "T-Money",
      phone: "91223344",
      date: new Date().toISOString()
    });

    console.log("Base initialisée avec succès 🚀");

  } catch (error) {
    console.error("Erreur init DB :", error);
  }
};