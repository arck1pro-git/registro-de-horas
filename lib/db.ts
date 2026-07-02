import { Pool } from "pg";

// Pool único reaproveitado entre hot-reloads no dev (evita esgotar conexões).
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

export const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._pgPool = pool;
}

/** Executa uma query e devolve apenas as linhas, já tipadas. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
      throw new Error(
        "Não foi possível conectar ao PostgreSQL. Verifique se o servidor está " +
          "rodando e se DATABASE_URL (.env.local) está correto, depois rode " +
          `\`npm run db:setup\`. (${code})`
      );
    }
    throw err;
  }
}
