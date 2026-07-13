import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getModalidadesByUser,
  setModalidade,
  deleteModalidade,
  getUserTimezone,
  type ModalidadeTipo,
} from "@/lib/data";
import { dateKey } from "@/lib/tz";

const TIPOS: ModalidadeTipo[] = ["home_office", "presencial"];
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const isAdmin = session.user.role === "admin";
  const userId = isAdmin && body?.userId ? String(body.userId) : session.user.id;

  // dia padrão = hoje no fuso do próprio usuário.
  const dia = body?.dia
    ? String(body.dia)
    : dateKey(new Date(), await getUserTimezone(userId));
  if (!DIA_RE.test(dia)) {
    return NextResponse.json(
      { error: "dia deve estar no formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const modalidade = await setModalidade(userId, tipo, dia);
  return NextResponse.json({ modalidade }, { status: 201 });
}

// DELETE /api/modalidade?dia=YYYY-MM-DD[&userId=X]  (somente admin)
//   Remove a modalidade do dia — usado ao apagar o dia inteiro.
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const dia = params.get("dia");
  if (!dia || !DIA_RE.test(dia)) {
    return NextResponse.json(
      { error: "dia deve estar no formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const userId = params.get("userId") ?? session.user.id;
  await deleteModalidade(userId, dia);
  return NextResponse.json({ ok: true });
}
