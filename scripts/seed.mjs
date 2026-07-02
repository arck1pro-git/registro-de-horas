// Popula dados de DEMONSTRAÇÃO do mês atual para os funcionários 1 e 2.
// OPCIONAL — não roda no db:setup. Uso:  npm run db:seed
//
// Horários "quebrados" (minutos irregulares, ex.: 7:52, 9:23, 18:17) e
// modalidade sorteada a cada dia. Idempotente: apaga e recria os dados demo
// desses dois usuários a cada execução (roda o schema antes, se preciso).

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

/** Inteiro aleatório em [a, b]. */
function rInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

/** Minuto "quebrado": 1..59, nunca 00 nem múltiplo de 5. */
function brokenMin() {
  const m = rInt(1, 58);
  return m % 5 === 0 ? m + 1 : m;
}

async function main() {
  const schema = await readFile(join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(schema);

  // Zera os dados demo (mantém as contas e quaisquer outros dados).
  await pool.query(`DELETE FROM registros WHERE user_id IN ('1', '2')`);
  await pool.query(`DELETE FROM modalidade WHERE user_id IN ('1', '2')`);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");

  let regs = 0;
  let mods = 0;

  for (const userId of ["1", "2"]) {
    for (let day = 1; day <= daysInMonth; day++) {
      const weekday = new Date(year, month, day).getDay();
      if (weekday === 0 || weekday === 6) continue; // pula fins de semana

      // Modalidade sorteada por dia (varia livremente).
      const modTipo = Math.random() < 0.5 ? "home_office" : "presencial";
      const dia = `${year}-${pad(month + 1)}-${pad(day)}`;
      await pool.query(
        `INSERT INTO modalidade (user_id, tipo, dia) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, dia) DO UPDATE SET tipo = EXCLUDED.tipo`,
        [userId, modTipo, dia]
      );
      mods++;

      // Jornada com horários irregulares e ordem garantida
      // (entrada < almoço-saída < almoço-volta < saída).
      const punches = [
        [rInt(7, 9), brokenMin(), "in"], // chegada (manhã)
        [rInt(11, 12), brokenMin(), "out"], // saída p/ almoço
        [13, brokenMin(), "in"], // volta do almoço
        [rInt(17, 19), brokenMin(), "out"], // saída (fim do dia)
      ];
      for (const [h, m, tipo] of punches) {
        const ts = new Date(year, month, day, h, m).toISOString();
        await pool.query(
          `INSERT INTO registros (user_id, tipo, timestamp) VALUES ($1, $2, $3)`,
          [userId, tipo, ts]
        );
        regs++;
      }
    }
  }

  console.log(`✓ dados demo: ${regs} registros, ${mods} modalidades`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
