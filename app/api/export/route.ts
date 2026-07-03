import ExcelJS from "exceljs";
import { auth } from "@/auth";
import {
  findUserById,
  getRegistrosByUser,
  getModalidadesByUser,
  type Registro,
} from "@/lib/data";

// exceljs precisa do runtime Node (streams/buffers), não do Edge.
export const runtime = "nodejs";

// --- Dados fixos do modelo (Folha de Ponto) --------------------------------
const EMPREGADOR = {
  razaoSocial: "ARCK1PRO BUSINESS E1 LTDA",
  cnpj: "43.343.224/0001-09",
  endereco:
    "RUA MARIO WALENDOWSKY, 146 - B - PEREQUE - Porto Belo / SC - CEP 88210-000",
};
const EXPEDIENTE =
  "- De segunda-feira a sexta-feira de 08:30 as 17:30 e intervalo de 12:00 as 13:00.";
const JORNADA_DIARIA_MIN = 8 * 60; // 08:00 previstas em dias úteis

const WD_ABBR = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const WD_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos como HH:MM (horas podem passar de 24, ex.: 169:58). */
function fmtHM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}
function fmtSaldo(min: number) {
  return (min < 0 ? "-" : "") + fmtHM(Math.abs(min));
}
function timeOf(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minutos trabalhados pareando entrada → saída em ordem. */
function workedMinutes(list: Registro[]) {
  let total = 0;
  let open: number | null = null;
  for (const r of list) {
    const t = new Date(r.timestamp).getTime();
    if (r.tipo === "in") open = t;
    else if (r.tipo === "out" && open != null) {
      total += (t - open) / 60000;
      open = null;
    }
  }
  return Math.round(total);
}

const THIN = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Não autenticado.", { status: 401 });
  }
  if (session.user.role !== "admin") {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return new Response("userId é obrigatório.", { status: 400 });
  }

  // Mês de referência (YYYY-MM); padrão = mês atual.
  const now = new Date();
  const mesParam = url.searchParams.get("mes");
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-based
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const funcionario = await findUserById(userId);
  if (!funcionario) {
    return new Response("Funcionário não encontrado.", { status: 404 });
  }

  const registros = await getRegistrosByUser(userId);
  const modalidades = await getModalidadesByUser(userId);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesKey = `${year}-${pad(month + 1)}`;

  // Registros do mês agrupados por dia (1..daysInMonth).
  const byDay = new Map<number, Registro[]>();
  for (const r of registros) {
    const d = new Date(r.timestamp);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    const list = byDay.get(day) ?? [];
    list.push(r);
    byDay.set(day, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Modalidade do mês por dia.
  const modByDay = new Map<number, "home_office" | "presencial">();
  for (const m of modalidades) {
    if (!m.dia.startsWith(mesKey)) continue;
    const day = Number(m.dia.slice(8, 10));
    modByDay.set(day, m.tipo);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Registro de Horas";
  wb.created = now;

  // =========================================================================
  // ABA 1 — Folha de Ponto
  // =========================================================================
  const s1 = wb.addWorksheet("Folha de Ponto", {
    views: [{ showGridLines: false }],
  });
  s1.columns = [
    { width: 18 }, // Dia
    { width: 46 }, // Marcações
    { width: 11 }, // Previstas
    { width: 12 }, // Trabalhadas
    { width: 9 }, // Abonos
    { width: 10 }, // Saldo
  ];

  let r = 1;
  const titleRow = (text: string, opts: Partial<ExcelJS.Font> = {}) => {
    s1.mergeCells(r, 1, r, 6);
    const c = s1.getCell(r, 1);
    c.value = text;
    c.font = { bold: true, ...opts };
    c.alignment = { horizontal: "center" };
    r++;
  };
  const fullRow = (text: string, opts: Partial<ExcelJS.Font> = {}) => {
    s1.mergeCells(r, 1, r, 6);
    const c = s1.getCell(r, 1);
    c.value = text;
    c.font = { ...opts };
    r++;
  };
  const sectionRow = (text: string) => {
    s1.mergeCells(r, 1, r, 6);
    const c = s1.getCell(r, 1);
    c.value = text;
    c.font = { bold: true };
    c.alignment = { horizontal: "center" };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    r++;
  };

  titleRow("Folha de Ponto", { size: 14 });
  fullRow(
    `Apuração: de 01/${pad(month + 1)}/${year} a ${pad(daysInMonth)}/${pad(month + 1)}/${year}`,
  );
  s1.getCell(r - 1, 1).alignment = { horizontal: "center" };
  fullRow(
    `Emitido em ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  );
  s1.getCell(r - 1, 1).alignment = { horizontal: "center" };
  r++;

  sectionRow("DADOS DO EMPREGADOR");
  fullRow(
    `Razão Social: ${EMPREGADOR.razaoSocial}          CNPJ: ${EMPREGADOR.cnpj}`,
  );
  fullRow(`Endereço: ${EMPREGADOR.endereco}`);
  r++;

  sectionRow("DADOS DO TRABALHADOR");
  fullRow(`Nome: ${funcionario.name}`, { bold: true });
  fullRow("Data de admissão:          Cargo:          Departamento:          Setor:");
  fullRow("CPF:          CTPS:          Série:          PIS / PASEP:          eSocial:");
  r++;

  sectionRow("EXPEDIENTE(S)");
  fullRow(EXPEDIENTE);
  r++;

  sectionRow("REGISTROS");

  // Cabeçalho da tabela
  const head = ["Dia", "Marcações", "Previstas", "Trabalhadas", "Abonos", "Saldo"];
  const headRow = s1.getRow(r);
  head.forEach((h, i) => {
    const c = headRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.alignment = { horizontal: i === 0 || i === 1 ? "left" : "center" };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    c.border = BORDER_ALL;
  });
  r++;

  let totalPrev = 0;
  let totalTrab = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, month, day);
    const wd = dt.getDay();
    const isWeekday = wd >= 1 && wd <= 5;
    const list = byDay.get(day) ?? [];

    const marc =
      list.length > 0
        ? list
            .map((p) => `${timeOf(p.timestamp)}(${p.tipo === "in" ? "E" : "S"})`)
            .join("  ")
        : "-";
    const trab = workedMinutes(list);
    const prev = isWeekday ? JORNADA_DIARIA_MIN : 0;
    totalPrev += prev;
    totalTrab += trab;

    const hasData = list.length > 0 || isWeekday;
    const row = s1.getRow(r);
    const cells = [
      `${pad(day)}/${pad(month + 1)}/${year} ${WD_ABBR[wd]}`,
      marc,
      prev > 0 ? fmtHM(prev) : "-",
      trab > 0 ? fmtHM(trab) : "-",
      "-",
      hasData ? fmtSaldo(trab - prev) : "-",
    ];
    cells.forEach((v, i) => {
      const c = row.getCell(i + 1);
      c.value = v;
      c.alignment = { horizontal: i === 0 || i === 1 ? "left" : "center" };
      c.border = BORDER_ALL;
    });
    r++;
  }

  // Linha de TOTAL
  const totalRow = s1.getRow(r);
  const totalCells = ["TOTAL", "", fmtHM(totalPrev), fmtHM(totalTrab), "-", ""];
  totalCells.forEach((v, i) => {
    const c = totalRow.getCell(i + 1);
    c.value = v;
    c.font = { bold: true };
    c.alignment = { horizontal: i === 0 || i === 1 ? "left" : "center" };
    c.border = BORDER_ALL;
  });
  r += 2;

  fullRow("Legenda: (E) = Entrada. (S) = Saída.");
  r++;
  fullRow(EMPREGADOR.razaoSocial, { bold: true });
  s1.getCell(r - 1, 1).alignment = { horizontal: "left" };
  const trabNomeRow = s1.getRow(r - 1);
  trabNomeRow.getCell(6).value = funcionario.name;
  fullRow("Responsável");
  s1.getRow(r - 1).getCell(6).value = "Trabalhador";

  // =========================================================================
  // ABA 2 — Deslocamento (dias presenciais)
  // =========================================================================
  const s2 = wb.addWorksheet("Deslocamento", {
    views: [{ showGridLines: false }],
  });
  s2.columns = [{ width: 18 }, { width: 18 }];

  let r2 = 1;
  s2.mergeCells(r2, 1, r2, 2);
  const t = s2.getCell(r2, 1);
  t.value = "DESLOCAMENTO - ESCRITÓRIO";
  t.font = { bold: true, size: 14 };
  t.alignment = { horizontal: "center" };
  t.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  r2 += 2;

  s2.getCell(r2, 1).value = `Prestador de serviço - ${funcionario.name}`;
  s2.getCell(r2, 1).font = { bold: true };
  r2++;
  s2.getCell(r2, 1).value = `Mês de referência: ${pad(month + 1)}/${year}`;
  r2 += 2;

  s2.getCell(r2, 1).value = "Dias de deslocamento";
  s2.getCell(r2, 1).font = { bold: true };
  r2++;

  const dHead = s2.getRow(r2);
  ["Dia do mês", "Dia da semana"].forEach((h, i) => {
    const c = dHead.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    c.border = BORDER_ALL;
  });
  r2++;

  const presenciais = [...modByDay.entries()]
    .filter(([, tipo]) => tipo === "presencial")
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (presenciais.length === 0) {
    s2.mergeCells(r2, 1, r2, 2);
    const c = s2.getCell(r2, 1);
    c.value = "Nenhum dia presencial neste mês.";
    c.alignment = { horizontal: "center" };
    c.font = { italic: true };
    c.border = BORDER_ALL;
    r2++;
  } else {
    for (const day of presenciais) {
      const dt = new Date(year, month, day);
      const row = s2.getRow(r2);
      const c1 = row.getCell(1);
      c1.value = `${pad(day)}/${pad(month + 1)}/${year}`;
      c1.border = BORDER_ALL;
      const c2 = row.getCell(2);
      c2.value = WD_FULL[dt.getDay()];
      c2.border = BORDER_ALL;
      r2++;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const slug = funcionario.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `folha-ponto-${slug}-${mesKey}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
