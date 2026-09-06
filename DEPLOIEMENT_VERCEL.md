# Déployer Sakîna sur Vercel

## 1. Mettre le code sur GitHub

Le dossier contient déjà un dépôt git initialisé (un premier commit est fait). Chez vous :

```bash
cd sakina
# Créez un dépôt vide sur github.com (sans README), puis :
git remote add origin https://github.com/votre-compte/sakina.git
git branch -M main
git push -u origin main
```

## 2. Créer une base de données PostgreSQL

Vercel ne fournit pas de PostgreSQL "gratuit" par défaut pour un nouveau projet — le plus simple :
- **Neon** (neon.tech) ou **Vercel Postgres** (propose maintenant Neon en interne) : créez un projet,
  copiez la chaîne de connexion (`postgresql://...`).

## 3. Importer le projet sur Vercel

1. Allez sur vercel.com → **Add New → Project**.
2. Sélectionnez votre dépôt GitHub `sakina`. Vercel détecte automatiquement Next.js.
3. **Avant de cliquer sur Deploy**, dépliez "Environment Variables" et renseignez (voir `.env.example`) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | votre chaîne PostgreSQL (Neon) |
| `NEXTAUTH_SECRET` | générez avec `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://votre-projet.vercel.app` (mettez à jour après le 1er déploiement si besoin) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | dashboard Stripe |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` | votre bucket S3 |
| `PUSHER_APP_ID` / `PUSHER_SECRET` / `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | dashboard Pusher |
| `TURN_SECRET` / `NEXT_PUBLIC_TURN_HOST` | votre serveur TURN (voir `turn-server/`) |
| `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` | dashboard CinetPay |

4. Cliquez **Deploy**.

## 4. Appliquer les migrations sur la base de production

Depuis votre machine, une fois `DATABASE_URL` de production connu :

```bash
DATABASE_URL="votre-url-neon" npx prisma migrate deploy
```

(`migrate deploy`, pas `migrate dev`, en production : il applique les migrations existantes
sans en générer de nouvelles ni poser de questions interactives.)

## 5. Mettre à jour les webhooks externes avec l'URL Vercel

Une fois le domaine connu (`https://votre-projet.vercel.app` ou votre domaine personnalisé) :
- **Stripe** : dashboard → Webhooks → ajouter `https://votre-domaine/api/verification/webhook`,
  événement `identity.verification_session.verified` (+ `requires_input`).
- **CinetPay** : leur dashboard → notify_url `https://votre-domaine/api/credits/webhook`
  (déjà envoyé automatiquement à chaque paiement via `NEXTAUTH_URL`, mais certains comptes
  CinetPay demandent aussi de le déclarer dans leur interface).
- Mettez à jour `NEXTAUTH_URL` dans les variables d'environnement Vercel avec l'URL définitive,
  puis redéployez (Vercel → Deployments → Redeploy).

## 6. Le serveur TURN reste à part

Rappel : coturn (dossier `turn-server/`) ne peut pas tourner sur Vercel (serverless, pas de
processus permanent, pas de ports UDP ouverts). Il doit être déployé séparément sur un VPS
(voir `turn-server/DEPLOIEMENT.md`). Le reste du site fonctionne sans lui, mais certains appels
audio échoueront sur les réseaux les plus restrictifs tant qu'il n'est pas en place.

## 7. Vérifier que tout tourne

Une fois déployé, testez dans l'ordre : inscription → vérification d'identité (mode test Stripe) →
upload photo → découverte → intérêt réciproque entre deux comptes de test → messagerie →
achat d'un pack (mode sandbox CinetPay) → appel audio.
