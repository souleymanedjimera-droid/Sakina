import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // On échoue tôt et clairement plutôt que d'avoir une erreur obscure au premier appel.
  console.warn("STRIPE_SECRET_KEY n'est pas défini — la vérification d'identité ne fonctionnera pas.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});
