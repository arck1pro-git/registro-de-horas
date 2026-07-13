import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUser, updateUser } from "@/lib/data";

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

// PATCH /api/users  { id, name?, email?, password? }  -> edita um usuário.
// Somente admin. A role nunca é alterada por aqui.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const fields: { name?: string; email?: string; password?: string } = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "O nome não pode ficar vazio." },
        { status: 400 }
      );
    }
    fields.name = name;
  }

  if (body?.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    fields.email = email;
  }

  if (body?.password !== undefined) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter ao menos 4 caracteres." },
        { status: 400 }
      );
    }
    fields.password = password;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "Nada para atualizar." },
      { status: 400 }
    );
  }

  try {
    const user = await updateUser(id, fields);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail." },
        { status: 409 }
      );
    }
    throw err;
  }
}
