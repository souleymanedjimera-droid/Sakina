import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function estModerateur(session: any) {
  const role = session?.user?.role;
  return role === "MODERATEUR" || role === "ADMIN";
}

// GET : vérifications en attente + signalements ouverts
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!estModerateur(session)) {
    return NextResponse.json({ erreur: "Accès réservé à la modération." }, { status: 403 });
  }

  const [verificationsEnAttente, signalementsOuverts] = await Promise.all([
    prisma.verification.findMany({
      where: { statut: "EN_ATTENTE" },
      include: { user: { include: { profil: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.signalement.findMany({
      where: { statut: "OUVERT" },
      include: { auteur: true, cible: { include: { profil: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ verificationsEnAttente, signalementsOuverts });
}

// POST { type: "verification" | "signalement", id, decision }
// decision pour verification : "VALIDEE" | "REJETEE"
// decision pour signalement : "TRAITE" | "REJETE"
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!estModerateur(session)) {
    return NextResponse.json({ erreur: "Accès réservé à la modération." }, { status: 403 });
  }

  const { type, id, decision, note } = await req.json();

  if (type === "verification") {
    const verification = await prisma.verification.update({
      where: { id },
      data: { statut: decision, noteModerateur: note, traitePar: (session!.user as any).id },
    });

    // Un profil ne devient visible dans la découverte qu'une fois la vérification validée
    if (decision === "VALIDEE") {
      await prisma.profil.update({
        where: { userId: verification.userId },
        data: { visible: true },
      });
    }

    return NextResponse.json({ message: "Vérification mise à jour.", verification });
  }

  if (type === "signalement") {
    const signalement = await prisma.signalement.update({
      where: { id },
      data: { statut: decision },
    });
    return NextResponse.json({ message: "Signalement mis à jour.", signalement });
  }

  return NextResponse.json({ erreur: "type invalide." }, { status: 400 });
}
