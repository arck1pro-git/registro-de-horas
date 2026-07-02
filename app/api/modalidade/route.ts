import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getModalidadesByUser,
  setModalidade,
  type ModalidadeTipo,
} from "@/lib/data";

const TIPOS: ModalidadeTipo[] = ["home_office", "presencial"];
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

function hoje(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// GET /api/modalidade            -> modalidades do usuário logado
// GET /api/modalidade?userId=X   -> modalidades de X (somente admin)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";
  const requested = new URL(request.url).searchParams.get("userId");
  const targetId = requested && isAdmin ? requested : session.user.id;

  const modalidades = await getModalidadesByUser(targetId);
  return NextResponse.json({ modalidades });
}

// POST /api/modalidade
//   body: { tipo: "home_office" | "presencial", dia?, userId? }
//   dia padrão = hoje. userId só é respeitado quando admin.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tipo = body?.tipo as ModalidadeTipo | undefined;
  if (!tipo || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "tipo deve ser 'home_office' ou 'presencial'." },
      { status: 400 }
    );
  }

  const dia = body?.dia ? String(body.dia) : hoje();
  if (!DIA_RE.test(dia)) {
    return NextResponse.json(
      { error: "dia deve estar no formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const isAdmin = session.user.role === "admin";
  const userId = isAdmin && body?.userId ? String(body.userId) : session.user.id;

  const modalidade = await setModalidade(userId, tipo, dia);
  return NextResponse.json({ modalidade }, { status: 201 });
}
