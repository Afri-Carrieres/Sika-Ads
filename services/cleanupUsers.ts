import { supabase } from '../supabase';

/**
 * Deletes all users from the database except those with the role 'ADMIN' or 'MODERATOR'
 */
export const cleanupNonAdminUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;

    if (!currentUser) {
        console.error("Tu dois être connecté pour effectuer cette action!");
        return { success: false, message: "Non authentifié" };
    }

    try {
        console.log("Démarrage du nettoyage des utilisateurs...");

        // First, verify the current user is an admin or moderator
        const { data: currentUserDoc, error: adminCheckError } = await supabase
            .from("users")
            .select("role")
            .eq("id", currentUser.id)
            .single();

        if (adminCheckError || !currentUserDoc) {
            console.error("Utilisateur actuel introuvable dans la base de données.");
            return { success: false, message: "Utilisateur non trouvé" };
        }

        if (currentUserDoc.role !== 'ADMIN' && currentUserDoc.role !== 'MODERATOR') {
            console.error("Permission refusée. Seuls les ADMIN et MODERATOR peuvent faire cela.");
            return { success: false, message: "Permission refusée" };
        }

        // Get all users who are not admin or moderator
        const { data: nonAdmins, error: fetchError } = await supabase
            .from('users')
            .select('id, name, role')
            .not('role', 'in', '("ADMIN","MODERATOR")');

        if (fetchError) {
            console.error("Erreur lors de la récupération des utilisateurs:", fetchError);
            return { success: false, message: fetchError.message };
        }

        if (!nonAdmins || nonAdmins.length === 0) {
            console.log("ℹ️ Aucun utilisateur à supprimer trouvé.");
            return {
                success: true,
                message: `Nettoyage terminé. 0 utilisateurs supprimés.`,
                deletedCount: 0,
                errors: []
            };
        }

        const idsToDelete = nonAdmins.map(u => u.id);
        console.log(`Suppression de ${idsToDelete.length} utilisateurs...`);

        // Clean up linked data
        await supabase.from('proofs').delete().in('userId', idsToDelete);
        await supabase.from('notifications').delete().in('userId', idsToDelete);
        
        // Clean up the users themselves
        const { error: deleteError } = await supabase.from('users').delete().in('id', idsToDelete);

        if (deleteError) {
            console.error("Erreur lors de la suppression des profils:", deleteError);
            return { success: false, message: deleteError.message };
        }

        console.log("✅ Nettoyage terminé avec succès !");

        return {
            success: true,
            message: `Nettoyage terminé. ${idsToDelete.length} utilisateurs supprimés.`,
            deletedCount: idsToDelete.length,
            errors: []
        };

    } catch (error: any) {
        console.error("❌ Erreur lors du nettoyage des utilisateurs:", error);
        return { success: false, message: error.message || "Erreur inconnue", error };
    }
};
