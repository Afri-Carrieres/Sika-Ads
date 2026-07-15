# TODO: Implémentation des Vues de Paiements Admin

## Objectif
Créer deux nouvelles vues dans le panel admin :
1. **Demandes de Retraits** - Valider/rejeter les retraits des ambassadors
2. **Paiements des Campagnes** - Valider les paiements des campagnes créées par les utilisateurs

---

## Étapes à completed

### 1. ✅ Analyser le code existant
- [x] Lire AdminPanel.tsx
- [x] Lire types.ts
- [x] Lire PLAN_PAYMENTS.md
- [x] Lire Layout.tsx
- [x] Lire App.tsx
- [x] Lire WalletView.tsx

### 2. 🔄 Mettre à jour types.ts
- [ ] Ajouter `CampaignPaymentStatus` type

### 3. 🔄 Mettre à jour AdminPanel.tsx
- [ ] Ajouter vue `withdrawals` (retraits)
- [ ] Ajouter vue `campaignPayments` (paiements campagnes)
- [ ] Ajouter logique de validation des retraits
- [ ] Ajouter logique de validation des paiements campagnes

### 4. 🔄 Mettre à jour Layout.tsx
- [ ] Ajouter onglet "Retraits" pour Staff
- [ ] Ajouter onglet "Paiements Campagnes" pour Admin

### 5. 🔄 Mettre à jour App.tsx
- [ ] Ajouter synchronisation du nouvel onglet

---

j'ai fini par comprendre  pourquoi le statut des campagne ne change pas dans mon payload la reference de transaction comporte un début de tout les transaction que j'ai voici un json de payload 

Payload: {
  "transaction_reference": "GOMBOYAS-CMP-h0aFuWMX-1777543593135",
  "transaction_type": "CASHIN",
  "status_message": "COMPLETED",
  "amount": "100.00",
  "fees": "5.00",
  "total_amount": "95.00",
  "created_at": "2026-04-30T10:06:33.580919+00:00",
  "updated_at": "2026-04-30T10:06:44.073294+00:00",
  "number": "72664906",
  "country": "TG",
  "operator": "yas"
}

j'ai remarqué que la transaction reference commence par GOMBOYAS ou GOMBOMOOV en fonction de l'opérateur de transaction alors que dans mon firestore j'ai une transaction du genre 
CMP-h0aFuWMX-1777543593135 ce qui empêche le changement de statut et de payement de mes transaction dans firestore et leur afficharge automatique

## Statut: En cours

