"use client";

import { useState } from "react";
import { Clock, X, LogIn, LogOut, House, Building2 } from "lucide-react";

type Punch = { tipo: "in" | "out"; timestamp: string };
export type Modalidade = "home_office" | "presencial";
export type DayInfo = {
  minutes: number;
  punches: Punch[];
  modalidade: Modalidade | null;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Cor de fundo da célula conforme a modalidade (ou neutro só com horas).
function cellTint(mod: Modalidade | null, hasHours: boolean) {
  if (mod === "home_office") return "bg-indigo-600/15 hover:bg-indigo-600/25";
  if (mod === "presencial") return "bg-amber-600/15 hover:bg-amber-600/25";
  if (hasHours) return "bg-foreground/5 hover:bg-foreground/10";
  return "cursor-default";
}

export function HoursCalendar({
  cells,
  days,
  totalMinutes,
  year,
  month,
}: {
  cells: (number | null)[];
  days: Record<number, DayInfo>;
  totalMinutes: number;
  year: number;
  month: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const info = selected != null ? days[selected] : undefined;

  // Contagem de modalidade no mês.
  let homeDays = 0;
  let presDays = 0;
  for (const key in days) {
    const mod = days[key].modalidade;
    if (mod === "home_office") homeDays++;
    else if (mod === "presencial") presDays++;
  }

  const dateLabel =
    selected != null
      ? new Date(year, month, selected).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })
      : "";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold opacity-70">
          <Clock className="h-4 w-4" />
          Horas e modalidade por dia
        </span>
        <span className="text-sm">
          Total: <span className="font-semibold">{fmtDur(totalMinutes)}</span>
        </span>
      </div>

      {/* Descrição geral do que é o quê */}
      <p className="text-xs leading-relaxed opacity-60">
        O número em cada dia é o total de horas; a cor indica a
        modalidade. Toque num dia para ver as entradas e saídas.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-indigo-600/70" />
          <House className="h-4 w-4" />
          Home Office
          <span className="font-semibold">{homeDays}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-600/70" />
          <Building2 className="h-4 w-4" />
          Presencial
          <span className="font-semibold">{presDays}</span>
        </span>
      </div>

      <div className="rounded-2xl border border-black/10 bg-background p-3 dark:border-white/15">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div
              key={i}
              className="py-1 text-center text-xs font-medium opacity-40"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day == null) return <div key={i} className="aspect-square" />;
            const d = days[day];
            const hasHours = !!d && d.minutes > 0;
            const hasData = !!d && (d.minutes > 0 || d.modalidade != null);
            return (
              <button
                key={i}
                type="button"
                disabled={!hasData}
                onClick={() => setSelected(day)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg ${cellTint(
                  d?.modalidade ?? null,
                  hasHours
                )}`}
              >
                <span className="text-sm font-medium">{day}</span>
                {hasHours ? (
                  <span className="text-[10px] leading-none opacity-70">
                    {fmtDur(d.minutes)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected != null && info && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setSelected(null)}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold capitalize">{dateLabel}</p>
                <p className="text-sm opacity-60">
                  Total: {fmtDur(info.minutes)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {info.modalidade && (
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                {info.modalidade === "home_office" ? (
                  <>
                    <House className="h-4 w-4 text-indigo-600" />
                    Home Office
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 text-amber-600" />
                    Presencial
                  </>
                )}
              </p>
            )}

            {info.punches.length === 0 ? (
              <p className="py-6 text-center text-sm opacity-50">
                Sem entradas ou saídas neste dia.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {info.punches.map((p, i) => {
                  const isIn = p.tipo === "in";
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 dark:border-white/15"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {isIn ? (
                          <LogIn className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <LogOut className="h-4 w-4 text-rose-600" />
                        )}
                        {isIn ? "Entrada" : "Saída"}
                      </span>
                      <span className="text-sm opacity-60">
                        {fmtTime(p.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
