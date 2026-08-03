import PDFDocument from "pdfkit";
import { auth } from "@/auth";
import {
  findUserById,
  getRegistrosByUser,
  getModalidadesByUser,
  getUserTimezone,
  type Registro,
} from "@/lib/data";
import { formatTime, dateKey } from "@/lib/tz";

// pdfkit precisa do runtime Node (streams/buffers e leitura das fontes), não do Edge.
export const runtime = "nodejs";

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
function timeOf(iso: string, tz: string) {
  return formatTime(iso, tz);
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

// --- Layout (A4 em pontos) -------------------------------------------------
const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const CONTENT_W = PAGE.width - PAGE.margin * 2;
const BOTTOM = PAGE.height - PAGE.margin;

const GRAY_FILL = "#EFEFEF";
const GRAY_LINE = "#BFBFBF";
const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

type Doc = PDFKit.PDFDocument;
type Cell = { w: number; text: string; align?: "left" | "center" | "right" };

/** Desenha uma linha da tabela (com bordas). Retorna o novo y (após a linha). */
function drawRow(
  doc: Doc,
  x: number,
  y: number,
  cells: Cell[],
  opts: { bold?: boolean; fill?: boolean; size?: number } = {}
): number {
  const size = opts.size ?? 9;
  const padX = 5;
  const padY = 4;
  const totalW = cells.reduce((s, c) => s + c.w, 0);

  doc.font(opts.bold ? FONT_BOLD : FONT).fontSize(size);

  // Altura da linha: cabe o conteúdo que mais quebra (ex.: marcações longas).
  let rowH = size + padY * 2;
  for (const c of cells) {
    const h = doc.heightOfString(c.text || " ", { width: c.w - padX * 2 });
    rowH = Math.max(rowH, h + padY * 2);
  }

  if (opts.fill) {
    doc.save().rect(x, y, totalW, rowH).fill(GRAY_FILL).restore();
  }

  let cx = x;
  doc.fillColor("#000");
  for (const c of cells) {
    doc.lineWidth(0.5).strokeColor(GRAY_LINE).rect(cx, y, c.w, rowH).stroke();
    doc
      .font(opts.bold ? FONT_BOLD : FONT)
      .fontSize(size)
      .fillColor("#000")
      .text(c.text || "", cx + padX, y + padY, {
        width: c.w - padX * 2,
        align: c.align ?? "left",
      });
    cx += c.w;
  }
  return y + rowH;
}

function buildPdf(input: {
  name: string;
  year: number;
  month: number; // 0-based
  daysInMonth: number;
  byDay: Map<number, Registro[]>;
  presenciais: number[]; // dias presenciais (ordenados)
  tz: string;
}): Promise<Buffer> {
  const { name, year, month, daysInMonth, byDay, presenciais, tz } = input;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const x = PAGE.margin;

    // =====================================================================
    // PÁGINA 1 — Registro de horas
    // =====================================================================
    doc.font(FONT_BOLD).fontSize(16).fillColor("#000").text("Registro de Horas", x, PAGE.margin);
    let y = doc.y + 8;
    doc.font(FONT_BOLD).fontSize(11).text(`Nome: ${name}`, x, y);
    y = doc.y + 2;
    doc.font(FONT).fontSize(10).text(`Mês de referência: ${pad(month + 1)}/${year}`, x, y);
    y = doc.y + 12;

    // Colunas: Dia | Marcações | Total de horas
    const cDia = 120;
    const cTot = 85;
    const cMarc = CONTENT_W - cDia - cTot;

    const drawHorasHeader = (yy: number) =>
      drawRow(
        doc,
        x,
        yy,
        [
          { w: cDia, text: "Dia" },
          { w: cMarc, text: "Marcações" },
          { w: cTot, text: "Total de horas", align: "center" },
        ],
        { bold: true, fill: true }
      );

    y = drawHorasHeader(y);

    let totalMin = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, month, day);
      const wd = dt.getDay();
      const list = byDay.get(day) ?? [];
      const marc =
        list.length > 0
          ? list
              .map((p) => `${timeOf(p.timestamp, tz)}(${p.tipo === "in" ? "E" : "S"})`)
              .join("  ")
          : "-";
      const min = workedMinutes(list);
      totalMin += min;

      // Quebra de página: repete o cabeçalho.
      if (y + 20 > BOTTOM) {
        doc.addPage();
        y = drawHorasHeader(PAGE.margin);
      }

      y = drawRow(doc, x, y, [
        { w: cDia, text: `${pad(day)}/${pad(month + 1)}/${year} ${WD_ABBR[wd]}` },
        { w: cMarc, text: marc },
        { w: cTot, text: min > 0 ? fmtHM(min) : "-", align: "center" },
      ]);
    }

    // Linha final: total de horas.
    if (y + 20 > BOTTOM) {
      doc.addPage();
      y = PAGE.margin;
    }
    y = drawRow(
      doc,
      x,
      y,
      [
        { w: cDia, text: "Total de horas" },
        { w: cMarc, text: "" },
        { w: cTot, text: fmtHM(totalMin), align: "center" },
      ],
      { bold: true, fill: true }
    );

    doc
      .font(FONT)
      .fontSize(9)
      .fillColor("#000")
      .text("Legenda: (E) = Entrada. (S) = Saída.", x, y + 8);

    // =====================================================================
    // PÁGINA 2 — Deslocamento (dias presenciais)
    // =====================================================================
    doc.addPage();
    let y2 = PAGE.margin;

    doc.font(FONT_BOLD).fontSize(16).fillColor("#000").text("Deslocamento — Escritório", x, y2, {
      width: CONTENT_W,
      align: "center",
    });
    y2 = doc.y + 12;
    doc.font(FONT_BOLD).fontSize(11).text(`Prestador de serviço - ${name}`, x, y2);
    y2 = doc.y + 2;
    doc.font(FONT).fontSize(10).text(`Mês de referência: ${pad(month + 1)}/${year}`, x, y2);
    y2 = doc.y + 14;

    doc.font(FONT_BOLD).fontSize(11).text("Dias de deslocamento", x, y2);
    y2 = doc.y + 6;

    const dDiaMes = 170;
    const dDiaSem = 200;

    const drawDeslocHeader = (yy: number) =>
      drawRow(
        doc,
        x,
        yy,
        [
          { w: dDiaMes, text: "Dia do mês" },
          { w: dDiaSem, text: "Dia da semana" },
        ],
        { bold: true, fill: true }
      );

    y2 = drawDeslocHeader(y2);

    if (presenciais.length === 0) {
      y2 = drawRow(doc, x, y2, [
        { w: dDiaMes + dDiaSem, text: "Nenhum dia presencial neste mês.", align: "center" },
      ]);
    } else {
      for (const day of presenciais) {
        if (y2 + 20 > BOTTOM) {
          doc.addPage();
          y2 = drawDeslocHeader(PAGE.margin);
        }
        const dt = new Date(year, month, day);
        y2 = drawRow(doc, x, y2, [
          { w: dDiaMes, text: `${pad(day)}/${pad(month + 1)}/${year}` },
          { w: dDiaSem, text: WD_FULL[dt.getDay()] },
        ]);
      }
    }

    // Linha final: total de dias de deslocamento.
    if (y2 + 20 > BOTTOM) {
      doc.addPage();
      y2 = PAGE.margin;
    }
    drawRow(
      doc,
      x,
      y2,
      [
        { w: dDiaMes, text: "Total de dias" },
        { w: dDiaSem, text: String(presenciais.length), align: "center" },
      ],
      { bold: true, fill: true }
    );

    doc.end();
  });
}

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
    return new Response("Registro não encontrado.", { status: 404 });
  }

  const tz = await getUserTimezone(userId);
  const registros = await getRegistrosByUser(userId);
  const modalidades = await getModalidadesByUser(userId);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesKey = `${year}-${pad(month + 1)}`;

  // Registros do mês agrupados por dia (1..daysInMonth), no fuso do usuário.
  const byDay = new Map<number, Registro[]>();
  for (const r of registros) {
    const [y, mo, dd] = dateKey(r.timestamp, tz).split("-").map(Number);
    if (y !== year || mo - 1 !== month) continue;
    const list = byDay.get(dd) ?? [];
    list.push(r);
    byDay.set(dd, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Dias presenciais do mês (para o deslocamento).
  const presenciais: number[] = [];
  for (const m of modalidades) {
    if (!m.dia.startsWith(mesKey)) continue;
    if (m.tipo !== "presencial") continue;
    presenciais.push(Number(m.dia.slice(8, 10)));
  }
  presenciais.sort((a, b) => a - b);

  const pdf = await buildPdf({
    name: funcionario.name,
    year,
    month,
    daysInMonth,
    byDay,
    presenciais,
    tz,
  });

  const slug = funcionario.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `horas-${slug}-${mesKey}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
