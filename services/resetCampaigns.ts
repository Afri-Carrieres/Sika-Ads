// services/resetCampaigns.ts

export const deleteAllCampaigns = async () => {
  // Désactivé pour raison de sécurité : permettre à un client d'effacer toutes
  // les campagnes depuis le navigateur est trop dangereux. Les suppressions
  // de masse doivent être effectuées côté serveur (SQL / service role).
  console.warn(
    "deleteAllCampaigns() est désactivé : la suppression de masse doit se faire côté serveur."
  );
};