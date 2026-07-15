<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VLYcdily2bU82-klOePjDWxNrK0K7KIA

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`

2. Configure environment variables:
   - Copy [.env.example](.env.example) to `.env.local`
   - Fill in your Firebase and Gemini API keys in `.env.local`

3. Run the app:
   `npm run dev`

**Note:** `.env.local` is automatically ignored by git for security purposes. Never commit your API keys.

## Paiements (GomboPlus)

L’intégration GomboPlus est faite côté **Firebase Functions** (les clés ne doivent pas être dans le front).

- Secrets à configurer (prod): `GOMBO_PUBLIC_KEY`, `GOMBO_PRIVATE_KEY`
- Fonctions: `gomboCreateMobileDeposit` et `gomboCheckTransactionStatus` (région `us-central1`)

Local (emulator):
- Copier `functions/.env.example` vers `functions/.env` et renseigner les variables.
