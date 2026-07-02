import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserImage } from "@/lib/data";
import { getSupabaseAdmin, AVATAR_BUCKET } from "@/lib/supabase-admin";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// POST /api/avatar  (multipart: campo "file")
// Recebe o arquivo, envia ao Supabase Storage (server-side, ignora RLS),
// salva a URL pública no usuário logado e a devolve.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Envie um arquivo no campo 'file'." },
      { status: 400 }
    );
  }
  if (!EXT[file.type]) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG, WEBP ou GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande (máx. 5 MB)." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${session.user.id}/${Date.now()}.${EXT[file.type]}`;
  const supabaseAdmin = getSupabaseAdmin();

  const { error: upErr } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) {
    return NextResponse.json(
      { error: `Falha no upload: ${upErr.message}` },
      { status: 502 }
    );
  }

  const { data } = supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  await updateUserImage(session.user.id, data.publicUrl);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}

// DELETE /api/avatar  — remove a foto de perfil do usuário logado.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  await updateUserImage(session.user.id, null);
  return NextResponse.json({ ok: true });
}
