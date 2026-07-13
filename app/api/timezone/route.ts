import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setUserTimezone } from "@/lib/data";
import { isValidTimezone } from "@/lib/tz";

// POST /api/timezone  { timezone }  -> define o fuso do próprio usuário logado.
// A partir daí os registros dele passam a ser exibidos/agrupados nesse fuso.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const timezone = typeof body?.timezone === "string" ? body.timezone : "";

  if (!isValidTimezone(timezone)) {
    return NextResponse.json({ error: "Fuso inválido." }, { status: 400 });
  }

  await setUserTimezone(session.user.id, timezone);
  return NextResponse.json({ ok: true, timezone });
}
