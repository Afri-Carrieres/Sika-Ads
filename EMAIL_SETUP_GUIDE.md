# 📧 Guide d'Installation Resend - SikaAds

## ✅ Checklist de Configuration

### 1. Secrets Firebase
Assurez-vous que vos secrets Firebase sont définis. Exécutez:

```bash
firebase functions:config:set resend.api_key="re_xxxxxxxxxxxxxx" resend.from="noreply@sikaads.app"
```

Ou via Firebase Console → Project Settings → Service Account:

**Secrets à définir:**
- `RESEND_API_KEY`: Votre clé API Resend (format: `re_...`)
- `RESEND_FROM`: Votre adresse d'envoi (ex: `noreply@sikaads.app`)

### 2. Vérification de la Configuration

```bash
# Voir les secrets définis
firebase functions:config:get

# Pour vérifier dans les logs Firebase
firebase functions:log --follow
```

### 3. Adresse d'Envoi Valide

**Important:** L'adresse doit être:
- ✅ Un domaine vérifié dans Resend (sikaads.app)
- ✅ Format: `name@sikaads.app` (ex: `noreply@sikaads.app`)
- ❌ NOT using `onboarding@resend.dev` (test uniquement)

### 4. Procédure de Test

#### Test 1: Créer un utilisateur (déclenche sendWelcomeEmail)
```bash
# Via Firebase Console ou API
curl -X POST https://us-central1-sikaads.cloudfunctions.net/createUser \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

#### Test 2: Vérifier les logs
```bash
firebase functions:log --follow
```

Vous verrez les logs:
```
✅ Resend configuration validated
📧 Sending email (attempt 1/3)
✅ Email sent successfully
```

#### Test 3: Vérifier les erreurs
Si vous voir une erreur, elle s'affichera:
```
❌ RESEND_API_KEY not defined
⚠️ Email send failed (attempt 1/3)
```

## 🔧 Structure Améliorée

### emailService.ts
- **validateConfig()**: Vérifie API key et FROM address au démarrage
- **sendEmailWithRetry()**: Envoie avec 3 tentatives (backoff exponentiel)
- **Logging détaillé**: Chaque étape est tracée

### index.ts (Cloud Functions)
- **Try-catch blocks**: Capture toutes les erreurs d'email
- **Logging structuré**: userId, email, status pour chaque opération
- **Graceful fallback**: Continue même si email échoue

## 📊 Logs à Chercher

### Success (✅)
```
✅ Resend configuration validated
📧 Sending email (attempt 1/3)
✅ Email sent successfully
emailId: "..."
```

### Failure (❌)
```
❌ RESEND_API_KEY not defined
⚠️ Email send failed (attempt 1/3)
Resend API error: {...}
```

## 🚀 Déploiement

```bash
# 1. Définir les secrets
firebase functions:config:set resend.api_key="YOUR_KEY" resend.from="YOUR_FROM"

# 2. Déployer
firebase deploy --only functions

# 3. Vérifier les logs
firebase functions:log --follow
```

## 🆘 Troubleshooting

### Les mails ne partent pas du tout
1. ✅ Vérifier `RESEND_API_KEY` dans Firebase Console
2. ✅ Vérifier `RESEND_FROM` dans Firebase Console
3. ✅ Vérifier les logs: `firebase functions:log`

### Erreur: "API key missing"
```
Cause: RESEND_API_KEY n'est pas défini
Solution: firebase functions:config:set resend.api_key="your_key"
```

### Erreur: "Invalid from address"
```
Cause: RESEND_FROM n'utilise pas votre domaine vérifié
Solution: firebase functions:config:set resend.from="noreply@sikaads.app"
```

### Erreur: "Domain not verified"
```
Cause: Le domaine n'est pas configuré dans Resend
Solution:
  1. Aller sur https://resend.com/domains
  2. Ajouter sikaads.app
  3. Vérifier les DNS records
  4. Attendre la validation
```

## 📱 Format d'Adresse

**Correct:**
- `noreply@sikaads.app`
- `SikaAds Togo <noreply@sikaads.app>`

**Incorrect:**
- `onboarding@resend.dev` (test seulement)
- `admin@votredomaine.com` (domaine non vérifié)

## 🔍 Vérification Rapide

```bash
# Voir tous les logs en temps réel
firebase functions:log --follow

# Chercher les erreurs d'email
firebase functions:log --follow | grep -i "email\|resend\|error"

# Voir un utilisateur spécifique
firebase firestore:inspect users/USER_ID
```

## ✨ Ce Qui a Été Amélioré

1. **Validation au Démarrage** - Vérifie config avant d'envoyer
2. **Retry Automatique** - 3 tentatives avec backoff exponentiel
3. **Logging Détaillé** - Chaque étape tracée avec contexte
4. **Gestion d'Erreur** - Try-catch globaux dans les functions
5. **Format d'Adresse** - Correct "Name <email@domain.com>"
6. **Débogage Facile** - Logs clairs pour identifier problèmes
