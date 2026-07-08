import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  addRegistro,
  addRegistroAt,
  updateRegistro,
  deleteRegistro,
  getRegistrosByUser,
  getModalidadeForDay,
  type RegistroTipo,
} from "@/lib/data";
import { dateKey } from "@/lib/tz";

const TIPOS: RegistroTipo[] = ["in", "out"];

function hojeKey(): string {
  return dateKey(new Date());
}

// GET /api/registros            -> registros do usuário logado
// GET /api/registros?userId=X   -> registros de X (somente admin)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";
  const requested = new URL(request.url).searchParams.get("userId");
  const targetId = requested && isAdmin ? requested : session.user.id;

  const registros = await getRegistrosByUser(targetId);
  return NextResponse.json({ registros });
}

// POST /api/registros
//   body: { tipo: "in" | "out", userId?, timestamp? }
//   userId/timestamp só são respeitados quando o solicitante é admin.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tipo = body?.tipo as RegistroTipo | undefined;
  if (!tipo || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "tipo deve ser 'in' ou 'out'." },
      { status: 400 }
    );
  }

  const isAdmin = session.user.role === "admin";
  const userId = isAdmin && body?.userId ? String(body.userId) : session.user.id;

  // Admin pode fixar a data-hora; usuário comum registra "agora".
  if (isAdmin && body?.timestamp) {
    const when = new Date(body.timestamp);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json(
        { error: "timestamp inválido." },
        { status: 400 }
      );
    }
    const registro = await addRegistroAt(userId, tipo, when.toISOString());
    return NextResponse.json({ registro }, { status: 201 });
  }

  // Fluxo do funcionário: só permite bater ponto se a modalidade do dia
  // já foi registrada.
  const modalidade = await getModalidadeForDay(userId, hojeKey());
  if (!modalidade) {
    return NextResponse.json(
      { error: "Registre a modalidade do dia antes de registrar." },
      { status: 400 }
    );
  }

  const registro = await addRegistro(userId, tipo);
  return NextResponse.json({ registro }, { status: 201 });
}

// PATCH /api/registros  (somente admin)
//   body: { id, tipo?, timestamp? } — edita um registro existente.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id ? String(body.id) : null;
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const tipo = body?.tipo as RegistroTipo | undefined;
  if (tipo && !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "tipo deve ser 'in' ou 'out'." },
      { status: 400 }
    );
  }

  let timestamp: string | undefined;
  if (body?.timestamp) {
    const when = new Date(body.timestamp);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "timestamp inválido." }, { status: 400 });
    }
    timestamp = when.toISOString();
  }

  if (!tipo && !timestamp) {
    return NextResponse.json(
      { error: "Informe tipo e/ou timestamp." },
      { status: 400 }
    );
  }

  const registro = await updateRegistro(id, { tipo, timestamp });
  if (!registro) {
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ registro });
}

// DELETE /api/registros?id=X  (somente admin)
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  await deleteRegistro(id);
  return NextResponse.json({ ok: true });
}
