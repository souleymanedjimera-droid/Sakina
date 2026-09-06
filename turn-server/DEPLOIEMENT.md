# Déployer le serveur TURN (coturn)

Le TURN sert de relais quand deux appareils ne peuvent pas se connecter directement
(NAT symétrique, réseau d'entreprise, certaines box 4G/5G). Sans lui, une partie de vos
utilisateurs — pas tous — n'arriverait pas à passer d'appel audio.

## 1. Provisionner un VPS

Un petit VPS suffit (1 vCPU / 1 Go de RAM). Recommandation : une région proche de vos
utilisateurs (ex. Paris/Francfort pour un public européen). Fournisseurs adaptés :
Scaleway, OVH, Hetzner, DigitalOcean.

⚠️ coturn doit tourner sur une machine dédiée qui reste allumée en continu — contrairement
au reste de l'application (Vercel), il ne peut pas être "serverless".

## 2. DNS

Créez un enregistrement A : `turn.votre-domaine.com` → IP publique du VPS.

## 3. Pare-feu

Ouvrez, en TCP **et** UDP :
- `3478` (TURN standard)
- `5349` (TURN chiffré TLS)
- `49152-49500` (plage de ports relayés — UDP uniquement, définie dans `turnserver.conf`)

```bash
ufw allow 3478
ufw allow 5349
ufw allow 49152:49500/udp
```

## 4. Certificat TLS

```bash
apt install certbot
certbot certonly --standalone -d turn.votre-domaine.com
```
Le certificat est généré dans `/etc/letsencrypt/live/turn.votre-domaine.com/` — c'est le
chemin déjà référencé dans `turnserver.conf`. Pensez au renouvellement automatique
(`certbot renew` via cron, déjà configuré par défaut sur la plupart des installations).

## 5. Configurer et lancer coturn

Sur le VPS :

```bash
git clone <votre-repo> && cd sakina/turn-server
# Éditez turnserver.conf :
#  - realm et server-name → votre sous-domaine
#  - static-auth-secret → un secret long et aléatoire (openssl rand -hex 32)
#    → copiez cette même valeur dans TURN_SECRET côté application Next.js
docker compose up -d
```

## 6. Vérifier que ça fonctionne

Utilisez l'outil de test WebRTC de Mozilla ou Google : cherchez "Trickle ICE test" en
ligne, renseignez :
- URL : `turn:turn.votre-domaine.com:3478`
- Username / Credential : générez-les temporairement via `GET /api/calls/turn-credentials`
  une fois connecté à l'application (ou à la main avec le script ci-dessous).

Un candidat de type `relay` doit apparaître : c'est la preuve que le relais TURN fonctionne.

```bash
# Générer manuellement des identifiants de test (mêmes règles que lib/turn.ts)
python3 - <<'PY'
import hmac, hashlib, base64, time
secret = "VOTRE_TURN_SECRET"
username = f"{int(time.time()) + 3600}:test"
credential = base64.b64encode(hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()).decode()
print("username:", username)
print("credential:", credential)
PY
```

## 7. Surveillance

Surveillez `/var/log/turnserver.log` et l'usage réseau/CPU du VPS. Un pic anormal de trafic
relayé peut signaler un abus (quelqu'un utilisant votre TURN en dehors de l'application) —
le mécanisme de secret partagé avec expiration (1h) limite déjà fortement ce risque, mais
une supervision reste recommandée.
