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

    // Promouvoir l'utilisateur courant en ADMIN (bootstrap du premier compte)
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

    console.log("Base initialisée avec succès 🚀");
  } catch (error) {
    console.error("Erreur init DB :", error);
  }
};