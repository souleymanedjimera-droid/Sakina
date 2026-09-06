"use client";

import { useEffect, useState } from "react";

interface VerificationDto {
  id: string;
  user: { email: string; profil: { prenom: string; ville: string } | null };
  pieceIdentiteUrl: string;
  selfieUrl: string;
}

interface SignalementDto {
  id: string;
  motif: string;
  details: string | null;
  auteur: { email: string };
  cible: { email: string; profil: { prenom: string } | null };
}

export default function ModerationPage() {
  const [verifications, setVerifications] = useState<VerificationDto[]>([]);
  const [signalements, setSignalements] = useState<SignalementDto[]>([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const reponse = await fetch("/api/admin/moderation");
    const data = await reponse.json();
    if (reponse.ok) {
      setVerifications(data.verificationsEnAttente);
      setSignalements(data.signalementsOuverts);
    }
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function traiterVerification(id: string, decision: "VALIDEE" | "REJETEE") {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "verification", id, decision }),
    });
    charger();
  }

  async function traiterSignalement(id: string, decision: "TRAITE" | "REJETE") {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signalement", id, decision }),
    });
    charger();
  }

  if (chargement) return <p className="p-8 text-sm">Chargement...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium mb-6">Modération</h1>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-3">Vérifications d'identité en attente</h2>
        {verifications.length === 0 && <p className="text-sm text-sakinaInk/60">Rien en attente.</p>}
        <div className="grid gap-3">
          {verifications.map((v) => (
            <div key={v.id} className="border border-sakinaSand rounded p-4 flex justify-between items-center">
              <div className="text-sm">
                <strong>{v.user.profil?.prenom ?? "?"}</strong> — {v.user.email} ({v.user.profil?.ville})
              </div>
              <div className="flex gap-2">
                <button onClick={() => traiterVerification(v.id, "VALIDEE")}
                  className="text-xs bg-sakinaGreen text-sakinaIvory rounded px-3 py-1.5">Valider</button>
                <button onClick={() => traiterVerification(v.id, "REJETEE")}
                  className="text-xs border border-sakinaSand rounded px-3 py-1.5">Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Signalements ouverts</h2>
        {signalements.length === 0 && <p className="text-sm text-sakinaInk/60">Aucun signalement ouvert.</p>}
        <div className="grid gap-3">
          {signalements.map((s) => (
            <div key={s.id} className="border border-sakinaSand rounded p-4 flex justify-between items-center">
              <div className="text-sm">
                <strong>{s.motif}</strong> — visé : {s.cible.profil?.prenom ?? s.cible.email}
                {s.details && <p className="text-xs text-sakinaInk/60 mt-1">{s.details}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => traiterSignalement(s.id, "TRAITE")}
                  className="text-xs bg-sakinaGreen text-sakinaIvory rounded px-3 py-1.5">Marquer traité</button>
                <button onClick={() => traiterSignalement(s.id, "REJETE")}
                  className="text-xs border border-sakinaSand rounded px-3 py-1.5">Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
