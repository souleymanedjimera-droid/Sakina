import crypto from "crypto";

// Mécanisme standard "TURN REST API" : on ne crée jamais de compte TURN permanent.
// Le username est un timestamp d'expiration + l'id utilisateur ; le mot de passe est
// un HMAC-SHA1 du username signé avec un secret partagé connu uniquement du serveur
// applicatif et du serveur coturn (jamais exposé au navigateur).
export function genererCredentialsTurn(userId: string, dureeValiditeSecondes = 3600) {
  const secret = process.env.TURN_SECRET;
  if (!secret) {
    throw new Error("TURN_SECRET n'est pas configuré.");
  }

  const expiration = Math.floor(Date.now() / 1000) + dureeValiditeSecondes;
  const username = `${expiration}:${userId}`;

  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");

  return { username, credential };
}
