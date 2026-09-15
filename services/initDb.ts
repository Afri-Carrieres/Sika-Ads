// services/initDb.ts

export const initializeDatabase = async () => {
  // Désactivé pour raison de sécurité : l'auto-promotion en ADMIN côté client
  // permettait à n'importe quel utilisateur connecté de s'octroyer le rôle ADMIN.
  // Le bootstrap du premier administrateur doit être effectué côté serveur
  // (SQL/migration ou service role), jamais depuis le navigateur.
  console.warn(
    "initializeDatabase() est désactivé : la promotion ADMIN doit se faire côté serveur."
  );
};