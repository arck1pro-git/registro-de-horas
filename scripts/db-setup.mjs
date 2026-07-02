// Aplica o schema.sql (cria as tabelas e as contas iniciais). NÃO insere
// dados de ponto/modalidade — para dados de demonstração use `npm run db:seed`.
//
// Uso:  npm run db:setup   (carrega DATABASE_URL de .env.local via --env-file)

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida. Configure em .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const schema = await readFile(join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("✓ schema aplicado (tabelas + contas)");
  console.log("  Dados de demonstração são opcionais: rode `npm run db:seed`.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
