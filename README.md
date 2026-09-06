# Sakîna — plateforme de rencontre halal en vue du mariage

## Installation

```bash
npm install
cp .env.example .env      # renseignez toutes les variables (DB, Stripe, S3, Pusher)
npx prisma migrate dev --name init
npm run dev
```

Le site tourne ensuite sur http://localhost:3000.

## Fonctionnalités codées

- **Base de données** (`prisma/schema.prisma`) : utilisateurs, profils, walis, vérifications,
  intérêts/matchs, messages, signalements, appels.
- **Authentification** email + mot de passe (NextAuth, bcrypt).
- **Inscription** avec contrôle de majorité et wali optionnel.
- **Vérification d'identité réelle** (`app/verification`, `app/api/verification/...`) :
  Stripe Identity capture et héberge la pièce d'identité et le selfie — **nous ne stockons
  jamais ces documents nous-mêmes**. Le webhook (`app/api/verification/webhook`) reçoit le
  résultat et rend le profil visible automatiquement si validé.
- **Photo de profil** (`app/profil/photo`, `app/api/photos/...`) : upload direct
  navigateur → S3 via URL pré-signée (le fichier ne transite jamais par notre serveur).
  La photo reste masquée en découverte et n'est révélée (`app/api/matches/[matchId]`)
  qu'après un match réciproque.
- **Découverte** filtrée par genre opposé, profils vérifiés/visibles uniquement.
- **Intérêts & matchs** : un match n'est créé qu'en cas de réciprocité.
- **Messagerie encadrée** : filtre de mots-clés, copie automatique au wali si activé.
- **Appel audio intégré, sans vidéo** (`components/AppelAudio.tsx`,
  `app/api/calls/...`) : WebRTC pair-à-pair, signalisation via Pusher (canal privé
  réservé aux deux participants du match). Le microphone est demandé avec
  `{ audio: true, video: false }` — **aucune caméra n'est jamais sollicitée**, et
  aucun flux audio ne transite ni n'est enregistré par notre serveur : seules les
  métadonnées (qui, quand, durée) sont journalisées dans le modèle `Appel`, à des
  fins de sécurité/modération.
- **Modération** (`app/admin/moderation`) : traitement des signalements ; la validation
  d'identité est maintenant automatique via Stripe mais reste modifiable manuellement.
- **Quota de messages payant** (`app/credits`, `app/api/credits/...`) : chaque compte
  reçoit 20 messages gratuits à l'inscription (`User.messagesRestants`, ajustable dans
  `prisma/schema.prisma`). Une fois épuisés, l'envoi est bloqué (erreur `QUOTA_EPUISE`,
  HTTP 402) et l'interface redirige vers `/credits`. Trois packs fixes définis dans
  `lib/packs.ts` : 300 messages (700 FCFA), 600 messages (1000 FCFA), 1000 messages
  (2000 FCFA). Paiement Mobile Money/carte via **CinetPay** ; le webhook ne fait jamais
  confiance à la notification seule et revérifie systématiquement le statut auprès de
  l'API CinetPay avant de créditer le compte (`lib/cinetpay.ts`).

## Ce qu'il reste à faire avant un vrai lancement

1. **Serveur TURN** : les STUN publics (Google) suffisent pour la plupart des connexions,
   mais certains réseaux (NAT symétrique, réseaux d'entreprise) ont besoin d'un serveur TURN
   relais pour établir l'appel audio. Solutions : coturn auto-hébergé, ou un service managé
   (Twilio Network Traversal, Xirsys, Cloudflare Calls).
2. **Webhook Stripe** : à configurer dans le dashboard Stripe avec l'URL
   `https://votre-domaine.com/api/verification/webhook` et l'événement
   `identity.verification_session.verified` (+ `requires_input`).
3. **Bucket S3** : créer le bucket, activer CORS pour autoriser les PUT depuis votre domaine,
   et restreindre les permissions IAM de la clé utilisée au strict nécessaire (PutObject sur
   ce bucket uniquement).
4. **Conformité RGPD** : religion, situation matrimoniale, voix (appels) sont des données
   sensibles — politique de confidentialité, consentement explicite, hébergement adapté.
5. **Modération humaine à l'échelle** et **paiement premium** si besoin (Stripe Billing
   s'intègre proprement).
6. **Déploiement** : Vercel (Next.js) + PostgreSQL managée (Neon, Supabase...) + Pusher
   (déjà hébergé) + S3 + Stripe. Un serveur TURN, lui, doit tourner en continu (VM dédiée).
7. **Audit de sécurité** avant ouverture au public, en particulier sur l'authentification,
   l'accès aux messages/appels, et la gestion des clés API — sujet sensible vu la nature
   intime de la plateforme.
8. **Compte marchand CinetPay** : créer un compte sur cinetpay.com, récupérer `apikey` et
   `site_id`, configurer l'URL de notification `https://votre-domaine.com/api/credits/webhook`
   dans leur dashboard, et tester d'abord en mode sandbox avant le mode réel.

## Principes "halal" encodés dans la logique métier

- Intention de mariage obligatoire et non modifiable.
- Wali optionnel avec copie automatique des messages une fois le match établi.
- Aucune photo visible avant réciprocité d'intérêt.
- Appel **audio uniquement** — la vidéo n'est jamais demandée ni négociée côté code,
  ce qui évite tout recours à des messageries externes non encadrées.
- Filtre anti-partage de coordonnées bancaires dans les messages.
- Visibilité du profil conditionnée à une vérification d'identité (Stripe Identity).
