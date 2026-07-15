# Plan: Vues de Gestion des Paiements Admin

## 📊 Analyse du Projet - Résumé des Informations

### Structure Actuelle
- **AdminPanel.tsx**: Panel admin existant avec onglets (overview, validation, users, payouts, team, campaigns)
- **WalletView.tsx**: Permet aux utilisateurs de demander des retraits (collection `withdrawals`)
- **App.tsx**: Gestion des routes et redirections
- **Layout.tsx**: Navigation latérale avec onglets admin

### Collection Firestore Concernées
- `withdrawals` - Demandes de retraits des ambassadors
- `campaigns` - Campagnes créées (par users et admin)

---

## 🎯 Fonctionnalités à Implémenter

### 1. Vue "Demandes de Retraits" (Retraits des Ambassadeurs)
**Objectif**: Permettre à l'admin/moderateur de valider ou rejeter les demandes de retraits des ambassadors

**Données à afficher**:
- Nom de l'ambassadeur
- Montant demandé
- Opérateur (Mixx/Moov)
- Numéro de téléphone
- Date de la demande
- Statut (pending/completed/failed)

**Actions admin**:
- ✅ Valider le retrait (met à jour le statut en 'completed')
- ❌ Rejeter le retrait (rembourse le solde à l'ambassadeur)

### 2. Vue "Paiements des Campagnes" (Campagnes payées par les utilisateurs)
**Objectif**: Permettre à l'admin de valider les paiements des campagnes créées par les utilisateurs

**Problème actuel**: Les campagnes sont activées immédiatement après paiement sans validation admin

**Nouvelle logique**:
1. Utilisateur crée une campagne → statut 'pending_payment'
2. Utilisateur paie → campagne reste 'pending_payment'
3. Admin valide le paiement → statut devient 'active', budget ajouté

**Données à afficher**:
- Titre de la campagne
- Nom de l'annonceur
- Montant payé
- Pack budgétaire (Essai/Populaire/Massif/VIP)
- Date de création
- Statut du paiement

---

## 📝 Plan de Modification

### Fichier 1: `types.ts`
- Ajouter `CampaignPaymentStatus` dans l'interface Campaign
- Status possibles: 'pending_payment', 'payment_received', 'payment_rejected'

### Fichier 2: `views/AdminPanel.tsx`
- Ajouter nouvelle vue `withdrawals` pour les retraits
- Ajouter nouvelle vue `campaignPayments` pour les paiements campagnes
- Ajouter logique de validation des retraits
- Ajouter logique de validation des paiements campagnes

### Fichier 3: `components/Layout.tsx`
- Ajouter onglet "Retraits" (admin-withdrawals) pour Staff
- Ajouter onglet "Paiements Campagnes" (admin-campaign-payments) pour Admin

### Fichier 4: `App.tsx`
- Ajouter routage vers les nouvelles vues admin

---

## 🔄 Dépendances
- Modification de `types.ts` (ajout de nouveaux statuts)
- Modification de `AdminPanel.tsx` (nouvelles vues)
- Modification de `Layout.tsx` (nouveaux onglets)
- Modification de `App.tsx` (routage)

---

## ✅ Étapes de Validation
1. Tester la création d'une campagne utilisateur → statut pending_payment
2. Tester l'affichage dans la vue Paiements Campagnes
3. Tester la validation du paiement par admin → campagne activée
4. Tester une demande de retrait → vue Retraits
5. Tester validation/rejet du retrait

