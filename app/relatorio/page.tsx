import { auth } from "@/auth";
import {
  getRegistrosByUser,
  getModalidadesByUser,
  type Registro,
} from "@/lib/data";
import { HoursCalendar, type DayInfo } from "@/app/hours-calendar";

/** Minutos trabalhados no dia, pareando entrada → saída em ordem. */
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

function buildCells(year: number, month: number): (number | null)[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default async function Relatorio() {
  const session = await auth();
  const user = session?.user;
  const registros = user?.id ? await getRegistrosByUser(user.id) : [];
  const modalidades = user?.id ? await getModalidadesByUser(user.id) : [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const cells = buildCells(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Registros de ponto do mês agrupados por dia.
  const byDay = new Map<number, Registro[]>();
  for (const r of registros) {
    const d = new Date(r.timestamp);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    const list = byDay.get(day) ?? [];
    list.push(r);
    byDay.set(day, list);
  }

  // Modalidade do mês por dia.
  const modByDay = new Map<number, "home_office" | "presencial">();
  for (const m of modalidades) {
    const [y, mo, d] = m.dia.split("-").map(Number);
    if (y !== year || mo - 1 !== month) continue;
    modByDay.set(d, m.tipo);
  }

  // Um único mapa por dia com horas + batidas + modalidade.
  const days: Record<number, DayInfo> = {};
  let totalMinutes = 0;
  const allDays = new Set<number>([...byDay.keys(), ...modByDay.keys()]);
  for (const day of allDays) {
    const list = byDay.get(day) ?? [];
    const minutes = workedMinutes(list);
    days[day] = {
      minutes,
      punches: list.map((r) => ({ tipo: r.tipo, timestamp: r.timestamp })),
      modalidade: modByDay.get(day) ?? null,
    };
    totalMinutes += minutes;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 md:py-8">
      <header>
        <h1 className="text-xl font-semibold leading-tight">Relatório</h1>
        <p className="text-sm capitalize opacity-60">{monthTitle}</p>
      </header>

      {/* Calendário único: horas + modalidade */}
      <HoursCalendar
        cells={cells}
        days={days}
        totalMinutes={totalMinutes}
        year={year}
        month={month}
      />
    </main>
  );
}
