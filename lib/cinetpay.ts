// Intégration CinetPay (paiement Mobile Money / carte, zone UEMOA/CEMAC).
// Documentation : https://docs.cinetpay.com

const BASE_URL = "https://api-checkout.cinetpay.com/v2";

interface InitierPaiementParams {
  transactionId: string;
  montantFcfa: number;
  description: string;
}

export async function initierPaiement({ transactionId, montantFcfa, description }: InitierPaiementParams) {
  const reponse = await fetch(`${BASE_URL}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: montantFcfa,
      currency: "XOF",
      description,
      notify_url: `${process.env.NEXTAUTH_URL}/api/credits/webhook`,
      return_url: `${process.env.NEXTAUTH_URL}/credits/retour`,
      channels: "ALL", // Mobile Money + carte bancaire
    }),
  });

  const data = await reponse.json();

  if (data.code !== "201") {
    throw new Error(data.message ?? "Échec de l'initialisation du paiement CinetPay.");
  }

  return { url: data.data.payment_url as string };
}

// Ne JAMAIS créditer le compte sur la seule foi du webhook (il peut être falsifié) :
// on revérifie toujours le statut réel de la transaction auprès de CinetPay.
export async function verifierPaiement(transactionId: string) {
  const reponse = await fetch(`${BASE_URL}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
    }),
  });

  const data = await reponse.json();
  // data.data.status vaut "ACCEPTED" en cas de paiement réellement confirmé.
  return { statutAccepte: data.data?.status === "ACCEPTED", brut: data };
}
