export interface PackMessages {
  id: string;
  messages: number;
  montantFcfa: number;
  label: string;
}

// Les 3 packs demandés. Modifier ici suffit — le prix affiché, le paiement CinetPay
// et le crédit du quota utilisent tous cette même liste, pas de duplication.
export const PACKS: PackMessages[] = [
  { id: "pack_300", messages: 300, montantFcfa: 700, label: "300 messages" },
  { id: "pack_600", messages: 600, montantFcfa: 1000, label: "600 messages" },
  { id: "pack_1000", messages: 1000, montantFcfa: 2000, label: "1000 messages" },
];

export function trouverPack(packId: string): PackMessages | undefined {
  return PACKS.find((p) => p.id === packId);
}
