/**
 * Désactivé pour raison de sécurité : la suppression en masse d'utilisateurs
 * (et de leurs données liées) depuis le navigateur est trop dangereuse.
 * Doit être effectuée côté serveur (SQL / service role).
 */
export const cleanupNonAdminUsers = async () => {
    console.warn(
        "cleanupNonAdminUsers() est désactivé : le nettoyage doit être effectué côté serveur."
    );
    return { success: false, message: "Désactivé" };
};
