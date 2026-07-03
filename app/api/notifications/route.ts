import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setFcmToken } from "@/lib/data";

// POST /api/notifications  { token }  -> salva o token FCM do usuário logado.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string" || token.length < 20) {
    return NextResponse.json({ error: "token inválido." }, { status: 400 });
  }

  await setFcmToken(session.user.id, token);
  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications  -> remove o token (desativa notificações).
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await setFcmToken(session.user.id, null);
  return NextResponse.json({ ok: true });
}
