import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUser } from "@/lib/data";

// POST /api/users  { name, email, password }  -> cria um usuário (role 'user').
// Somente admin. A role é sempre 'user' — nunca vem do cliente.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e senha." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 4 caracteres." },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({ name, email, password });
    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (err) {
    // 23505 = violação de UNIQUE (e-mail já cadastrado).
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail." },
        { status: 409 }
      );
    }
    throw err;
  }
}
