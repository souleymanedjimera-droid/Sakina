"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusherClient";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

const SERVEUR_STUN = { urls: "stun:stun.l.google.com:19302" };

async function obtenirServeursIce(): Promise<RTCIceServer[]> {
  try {
    const reponse = await fetch("/api/calls/turn-credentials");
    if (!reponse.ok) return [SERVEUR_STUN];
    const { urls, username, credential } = await reponse.json();
    return [SERVEUR_STUN, { urls, username, credential }];
  } catch {
    // En cas d'indisponibilité du serveur TURN, on retombe sur le STUN seul :
    // l'appel fonctionnera pour la plupart des réseaux, mais pas tous.
    return [SERVEUR_STUN];
  }
}

type EtatAppel = "inactif" | "sonnerie_sortante" | "sonnerie_entrante" | "en_cours";

export default function AppelAudio({ matchId }: { matchId: string }) {
  const { data: session } = useSession();
  const monUserId = (session?.user as any)?.id;

  const [etat, setEtat] = useState<EtatAppel>("inactif");
  const [muet, setMuet] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const connexionRef = useRef<RTCPeerConnection | null>(null);
  const fluxLocalRef = useRef<MediaStream | null>(null);
  const appelIdRef = useRef<string | null>(null);
  const audioDistantRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!monUserId) return;
    const pusher = getPusherClient();
    const canal = pusher.subscribe(`private-match-${matchId}`);

    canal.bind("signal", async (data: { type: string; payload: any; de: string }) => {
      if (data.de === monUserId) return; // on ignore ses propres messages

      if (data.type === "offre") {
        setEtat("sonnerie_entrante");
        (window as any).__offreEnAttente = data.payload;
      } else if (data.type === "reponse") {
        await connexionRef.current?.setRemoteDescription(new RTCSessionDescription(data.payload));
      } else if (data.type === "candidat") {
        try {
          await connexionRef.current?.addIceCandidate(new RTCIceCandidate(data.payload));
        } catch {
          // Ignoré : un candidat peut arriver après la fermeture de la connexion.
        }
      } else if (data.type === "raccrocher") {
        terminerAppel(false);
      }
    });

    return () => {
      pusher.unsubscribe(`private-match-${matchId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, monUserId]);

  async function envoyerSignal(type: string, payload: any) {
    await fetch("/api/calls/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, type, payload }),
    });
  }

  async function creerConnexion() {
    const iceServers = await obtenirServeursIce();
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate) envoyerSignal("candidat", e.candidate);
    };

    // Réception du flux distant : uniquement de l'audio, jamais de vidéo.
    pc.ontrack = (e) => {
      if (audioDistantRef.current) {
        audioDistantRef.current.srcObject = e.streams[0];
      }
    };

    connexionRef.current = pc;
    return pc;
  }

  async function obtenirFluxAudioLocal() {
    // video: false explicitement — aucune caméra n'est jamais sollicitée sur cette plateforme.
    const flux = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    fluxLocalRef.current = flux;
    return flux;
  }

  async function demarrerAppel() {
    setErreur(null);
    try {
      const flux = await obtenirFluxAudioLocal();
      const pc = await creerConnexion();
      flux.getTracks().forEach((piste) => pc.addTrack(piste, flux));

      const offre = await pc.createOffer();
      await pc.setLocalDescription(offre);
      await envoyerSignal("offre", offre);

      const { appelId } = await fetch("/api/calls/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, action: "debut" }),
      }).then((r) => r.json());
      appelIdRef.current = appelId;

      setEtat("sonnerie_sortante");
    } catch (e) {
      setErreur("Impossible d'accéder au microphone. Vérifiez les autorisations de votre navigateur.");
    }
  }

  async function repondreAppel() {
    setErreur(null);
    try {
      const flux = await obtenirFluxAudioLocal();
      const pc = await creerConnexion();
      flux.getTracks().forEach((piste) => pc.addTrack(piste, flux));

      const offre = (window as any).__offreEnAttente;
      await pc.setRemoteDescription(new RTCSessionDescription(offre));
      const reponse = await pc.createAnswer();
      await pc.setLocalDescription(reponse);
      await envoyerSignal("reponse", reponse);

      setEtat("en_cours");
    } catch (e) {
      setErreur("Impossible d'accéder au microphone. Vérifiez les autorisations de votre navigateur.");
    }
  }

  async function terminerAppel(prevenirAutrePartie = true) {
    if (prevenirAutrePartie) await envoyerSignal("raccrocher", {});
    connexionRef.current?.close();
    connexionRef.current = null;
    fluxLocalRef.current?.getTracks().forEach((t) => t.stop());
    fluxLocalRef.current = null;

    if (appelIdRef.current) {
      await fetch("/api/calls/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, action: "fin", appelId: appelIdRef.current }),
      });
      appelIdRef.current = null;
    }
    setEtat("inactif");
  }

  function basculerMuet() {
    fluxLocalRef.current?.getAudioTracks().forEach((t) => (t.enabled = muet));
    setMuet(!muet);
  }

  return (
    <div className="border border-sakinaSand rounded p-4 mb-4">
      <audio ref={audioDistantRef} autoPlay />
      {erreur && <p className="text-xs text-red-600 mb-2">{erreur}</p>}

      {etat === "inactif" && (
        <button onClick={demarrerAppel}
          className="flex items-center gap-2 text-sm bg-sakinaGreen text-sakinaIvory rounded px-4 py-2">
          <Phone size={16} /> Appel audio
        </button>
      )}

      {etat === "sonnerie_sortante" && (
        <div className="flex items-center justify-between text-sm">
          <span>Appel en cours...</span>
          <button onClick={() => terminerAppel()} className="text-red-600"><PhoneOff size={18} /></button>
        </div>
      )}

      {etat === "sonnerie_entrante" && (
        <div className="flex items-center justify-between text-sm">
          <span>Appel entrant</span>
          <div className="flex gap-3">
            <button onClick={repondreAppel} className="text-sakinaGreen"><Phone size={18} /></button>
            <button onClick={() => terminerAppel()} className="text-red-600"><PhoneOff size={18} /></button>
          </div>
        </div>
      )}

      {etat === "en_cours" && (
        <div className="flex items-center justify-between text-sm">
          <span>Appel en cours</span>
          <div className="flex gap-3">
            <button onClick={basculerMuet}>{muet ? <MicOff size={18} /> : <Mic size={18} />}</button>
            <button onClick={() => terminerAppel()} className="text-red-600"><PhoneOff size={18} /></button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-sakinaInk/50 mt-2">
        Appel audio uniquement — aucune caméra n'est jamais activée sur cette plateforme.
      </p>
    </div>
  );
}
