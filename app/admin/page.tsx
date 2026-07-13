import { redirect } from "next/navigation";
import { Shield, LogOut, Download } from "lucide-react";
import { auth } from "@/auth";
import { logout } from "@/app/actions";
import {
  getFuncionarios,
  getRegistrosByUser,
  getModalidadesByUser,
  findUserById,
  getUserTimezone,
  type Registro,
} from "@/lib/data";
import { EmployeeSelect } from "./employee-select";
import { MonthSelect } from "./month-select";
import { DayEditor } from "./day-editor";
import { NewUserButton } from "./new-user-button";
import { AdminSidebar } from "./admin-sidebar";
import { UsersPanel } from "./users-panel";
import { formatTime, dateKey } from "@/lib/tz";

type Row = {
  dateKey: string;
  dateLabel: string;
  minutes: number;
  punches: { id: string; tipo: "in" | "out"; time: string }[];
  modality: "home_office" | "presencial" | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

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

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; mes?: string; view?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const funcionarios = await getFuncionarios();
  const { userId, mes, view } = await searchParams;
  const activeView = view === "usuarios" ? "usuarios" : "registros";
  const selectedId =
    userId && funcionarios.some((f) => f.id === userId)
      ? userId
      : funcionarios[0]?.id;

  // Mês de referência (YYYY-MM); padrão = mês atual.
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    year = y;
    month = m - 1;
  }
  const mesKey = `${year}-${pad(month + 1)}`;

  const funcionario = selectedId ? await findUserById(selectedId) : undefined;
  // Fuso do funcionário selecionado: os registros dele são exibidos/agrupados nele.
  const tz = selectedId ? await getUserTimezone(selectedId) : undefined;
  const allRegistros = selectedId ? await getRegistrosByUser(selectedId) : [];
  const allModalidades = selectedId
    ? await getModalidadesByUser(selectedId)
    : [];
  // Escopa ao mês selecionado.
  const registros = allRegistros.filter((r) =>
    dateKey(r.timestamp, tz).startsWith(mesKey)
  );
  const modalidades = allModalidades.filter((m) => m.dia.startsWith(mesKey));

  // Modalidade por dia (chave "YYYY-MM-DD").
  const modalityByKey = new Map<string, "home_office" | "presencial">();
  for (const m of modalidades) modalityByKey.set(m.dia, m.tipo);

  // Agrupa os registros de ponto por dia (já vêm em ordem crescente).
  const byDay = new Map<string, Registro[]>();
  for (const r of registros) {
    const key = dateKey(r.timestamp, tz);
    const list = byDay.get(key) ?? [];
    list.push(r);
    byDay.set(key, list);
  }

  // Une os dias que têm ponto e/ou modalidade.
  const allKeys = new Set<string>([...byDay.keys(), ...modalityByKey.keys()]);
  const rows: Row[] = [...allKeys]
    .sort()
    .map((dateKey) => {
      const list = byDay.get(dateKey) ?? [];
      const [y, mo, d] = dateKey.split("-").map(Number);
      return {
        dateKey,
        dateLabel: new Date(y, mo - 1, d).toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        minutes: workedMinutes(list),
        punches: list.map((r) => ({
          id: r.id,
          tipo: r.tipo,
          time: formatTime(r.timestamp, tz),
        })),
        modality: modalityByKey.get(dateKey) ?? null,
      };
    });

  return (
    <main className="flex w-full flex-1 flex-col md:flex-row">
      <AdminSidebar active={activeView} />

      <div className="min-w-0 flex-1 p-6 md:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight">
                Painel do administrador
              </h1>
              <p className="text-sm opacity-60">
                {activeView === "usuarios"
                  ? "Usuários e credenciais"
                  : "Registros por pessoa e edição manual"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeView === "registros" && funcionario && selectedId && (
              <>
                <DayEditor userId={selectedId} variant="header" />
                <a
                  href={`/api/export?userId=${selectedId}&mes=${mesKey}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </a>
              </>
            )}
            {activeView === "usuarios" && <NewUserButton />}
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/15"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </header>

        {activeView === "usuarios" ? (
          <UsersPanel
            users={funcionarios.map((f) => ({
              id: f.id,
              name: f.name,
              email: f.email,
              password: f.password,
            }))}
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium opacity-70">Nome</label>
                <EmployeeSelect
                  funcionarios={funcionarios.map((f) => ({
                    id: f.id,
                    name: f.name,
                  }))}
                  selectedId={selectedId}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium opacity-70">Mês</label>
                <MonthSelect value={mesKey} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-background dark:border-white/15">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/10 bg-foreground/5 text-left dark:border-white/15">
                      <th className="px-4 py-3 font-semibold">Dia</th>
                      <th className="px-4 py-3 font-semibold">Horas totais</th>
                      <th className="px-4 py-3 font-semibold">Registros</th>
                      <th className="px-4 py-3 font-semibold">Modalidade</th>
                      <th className="w-16 px-4 py-3 font-semibold text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center opacity-50"
                        >
                          Nenhum registro para esta pessoa.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.dateKey}
                          className="border-b border-black/5 last:border-0 dark:border-white/10"
                        >
                          <td className="px-4 py-3 capitalize">
                            {row.dateLabel}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {fmtDur(row.minutes)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {row.punches.length === 0 ? (
                                <span className="opacity-40">—</span>
                              ) : (
                                row.punches.map((p, i) => (
                                  <span
                                    key={i}
                                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                      p.tipo === "in"
                                        ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                                        : "bg-rose-600/10 text-rose-700 dark:text-rose-400"
                                    }`}
                                  >
                                    {p.tipo === "in" ? "E" : "S"} {p.time}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.modality === "home_office" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                                Home Office
                              </span>
                            ) : row.modality === "presencial" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                                Presencial
                              </span>
                            ) : (
                              <span className="opacity-40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {selectedId && (
                              <DayEditor
                                userId={selectedId}
                                dateKey={row.dateKey}
                                dateLabel={row.dateLabel}
                                punches={row.punches}
                                modality={row.modality}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
