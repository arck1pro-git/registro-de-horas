import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase de SERVIDOR — usa a secret key, que ignora as RLS de Storage.
// NUNCA importe isto em componentes client. A chave não é NEXT_PUBLIC.
// Inicialização preguiçosa: só valida/cria quando realmente for usado.
let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local."
    );
  }

  client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Bucket de Storage onde ficam as fotos de perfil. */
export const AVATAR_BUCKET = "fotos-marketing";
