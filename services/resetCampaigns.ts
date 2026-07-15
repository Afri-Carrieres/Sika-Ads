// services/resetCampaigns.ts

import { supabase } from "../supabase";

export const deleteAllCampaigns = async () => {
  try {
    const { error } = await supabase.from("campaigns").delete().neq("id", "");
    if (error) throw error;
    console.log("Toutes les campagnes ont été supprimées ✅");
  } catch (error) {
    console.error("Erreur suppression campagnes :", error);
  }
};