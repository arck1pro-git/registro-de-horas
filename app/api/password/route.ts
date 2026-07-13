import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUser } from "@/lib/data";

// POST /api/password  { password }  -> troca a senha do próprio usuário logado.
// Depois de trocar, o cliente deve deslogar e entrar com a nova senha.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 4) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 4 caracteres." },
      { status: 400 }
    );
  }

  const user = await updateUser(session.user.id, { password });
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
