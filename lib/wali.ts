// Stub d'envoi de copie au wali. À brancher sur un vrai fournisseur
// (Resend, Postmark, SES...) avant mise en production.
// Ne contient volontairement aucune clé API en dur.

interface CopieWaliParams {
  waliContact: string;
  auteurPrenom: string;
  contenu: string;
}

export async function envoyerCopieWali({ waliContact, auteurPrenom, contenu }: CopieWaliParams) {
  // TODO production : remplacer par un vrai envoi (email ou SMS selon le format de waliContact)
  console.log(`[wali] Copie envoyée à ${waliContact} — message de ${auteurPrenom} : "${contenu}"`);
  return true;
}
