"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  X,
  Check,
  Trash2,
  LogIn,
  LogOut,
  CalendarPlus,
  House,
  Building2,
} from "lucide-react";

type Modalidade = "home_office" | "presencial";

export type Punch = { id: string; tipo: "in" | "out"; time: string };

/** Linha em edição. Sem `id` = registro novo; `deleted` = a remover ao salvar. */
type Draft = {
  key: string;
  id?: string;
  tipo: "in" | "out";
  time: string;
  deleted?: boolean;
};

let seq = 0;
const nextKey = () => `new-${seq++}`;

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayEditor({
  userId,
  dateKey,
  dateLabel,
  punches = [],
  modality = null,
  variant = "row",
}: {
  userId: string;
  /** Dia a editar. Ausente = modo "novo registro" com seletor de data. */
  dateKey?: string;
  dateLabel?: string;
  punches?: Punch[];
  /** Modalidade atual do dia (null = ainda não definida). */
  modality?: Modalidade | null;
  variant?: "row" | "header";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dateKey ?? todayKey());
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [modalidade, setModalidade] = useState<Modalidade | null>(modality);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [isPending, startTransition] = useTransition();

  function abrir() {
    setError(null);
    setConfirmingClear(false);
    setDate(dateKey ?? todayKey());
    setDrafts(
      punches.map((p) => ({ key: p.id, id: p.id, tipo: p.tipo, time: p.time }))
    );
    setModalidade(modality);
    setOpen(true);
  }

  function fechar() {
    if (!isPending) setOpen(false);
  }

  function addPunch(tipo: "in" | "out") {
    setDrafts((ds) => [
      ...ds,
      { key: nextKey(), tipo, time: tipo === "in" ? "08:00" : "17:00" },
    ]);
  }

  function patchDraft(key: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((ds) =>
      ds
        // registros já existentes viram "deleted"; novos somem da lista.
        .map((d) => (d.key === key && d.id ? { ...d, deleted: true } : d))
        .filter((d) => !(d.key === key && !d.id))
    );
  }

  const visiveis = drafts.filter((d) => !d.deleted);

  /**
   * Apaga o dia inteiro: todas as batidas (entradas/saídas) e a modalidade.
   * Assim o card some da lista em vez de apenas zerar.
   */
  function apagarDia() {
    setError(null);
    startTransition(async () => {
      try {
        for (const p of punches) {
          const res = await fetch(`/api/registros?id=${p.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error();
        }
        if (modality && dateKey) {
          const res = await fetch(
            `/api/modalidade?userId=${userId}&dia=${dateKey}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error();
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Não foi possível apagar. Tente novamente.");
      }
    });
  }

  function salvar() {
    setError(null);

    if (!DIA_RE.test(date)) {
      setError("Selecione uma data válida.");
      return;
    }

    startTransition(async () => {
      try {
        // Modalidade do dia (se escolhida e diferente da atual).
        if (modalidade && modalidade !== modality) {
          const res = await fetch("/api/modalidade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, tipo: modalidade, dia: date }),
          });
          if (!res.ok) throw new Error();
        }

        for (const d of drafts) {
          if (d.deleted) {
            if (d.id) {
              const res = await fetch(`/api/registros?id=${d.id}`, {
                method: "DELETE",
              });
              if (!res.ok) throw new Error();
            }
            continue;
          }

          const timestamp = new Date(`${date}T${d.time}:00`).toISOString();

          if (d.id) {
            const res = await fetch("/api/registros", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: d.id, tipo: d.tipo, timestamp }),
            });
            if (!res.ok) throw new Error();
          } else {
            const res = await fetch("/api/registros", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, tipo: d.tipo, timestamp }),
            });
            if (!res.ok) throw new Error();
          }
        }

        setOpen(false);
        router.refresh();
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <>
      {variant === "header" ? (
        <button
          type="button"
          onClick={abrir}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/15"
        >
          <CalendarPlus className="h-4 w-4" />
          Novo registro
        </button>
      ) : (
        <button
          type="button"
          onClick={abrir}
          aria-label="Editar dia"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 opacity-70 transition-opacity hover:opacity-100 dark:border-white/15"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-background p-6 text-left shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">
                  {dateKey ? "Editar registros do dia" : "Novo registro"}
                </p>
                {dateKey ? (
                  <p className="text-sm capitalize opacity-60">{dateLabel}</p>
                ) : (
                  <p className="text-sm opacity-60">
                    Adicione entradas e saídas.
                  </p>
                )}
              </div>
              <button
                onClick={fechar}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Seletor de data apenas no modo "novo registro". */}
            {!dateKey && (
              <label className="mb-4 flex flex-col gap-1.5 text-sm font-medium">
                Data
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
            )}

            {/* Modalidade do dia. */}
            <div className="mb-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium">Modalidade</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalidade("home_office")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                    modalidade === "home_office"
                      ? "border-transparent bg-indigo-600 text-white"
                      : "border-black/10 hover:bg-foreground/5 dark:border-white/15"
                  }`}
                >
                  <House className="h-4 w-4" />
                  Home Office
                </button>
                <button
                  type="button"
                  onClick={() => setModalidade("presencial")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                    modalidade === "presencial"
                      ? "border-transparent bg-amber-600 text-white"
                      : "border-black/10 hover:bg-foreground/5 dark:border-white/15"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Presencial
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {visiveis.length === 0 ? (
                <p className="py-6 text-center text-sm opacity-50">
                  Nenhum registro. Adicione uma entrada ou saída abaixo.
                </p>
              ) : (
                visiveis.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/15"
                  >
                    <div className="flex overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
                      <button
                        type="button"
                        onClick={() => patchDraft(d.key, { tipo: "in" })}
                        className={`px-2.5 py-1.5 text-xs font-medium ${
                          d.tipo === "in"
                            ? "bg-emerald-600 text-white"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => patchDraft(d.key, { tipo: "out" })}
                        className={`px-2.5 py-1.5 text-xs font-medium ${
                          d.tipo === "out"
                            ? "bg-rose-600 text-white"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        Saída
                      </button>
                    </div>
                    <input
                      type="time"
                      value={d.time}
                      onChange={(e) => patchDraft(d.key, { time: e.target.value })}
                      className="flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/15"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraft(d.key)}
                      aria-label="Remover registro"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 opacity-70 hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addPunch("in")}
                className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-medium hover:bg-foreground/5 dark:border-white/15"
              >
                <LogIn className="h-4 w-4 text-emerald-600" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => addPunch("out")}
                className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-medium hover:bg-foreground/5 dark:border-white/15"
              >
                <LogOut className="h-4 w-4 text-rose-600" />
                Saída
              </button>
            </div>

            {/* Apagar o dia inteiro (batidas + modalidade), removendo o card. */}
            {dateKey && (punches.length > 0 || modality) && (
              <div className="mt-3">
                {confirmingClear ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-600/40 bg-rose-600/10 p-2">
                    <span className="flex-1 px-1 text-sm">
                      Apagar todos os registros deste dia?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      disabled={isPending}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-60"
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      onClick={apagarDia}
                      disabled={isPending}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {isPending ? "Apagando..." : "Sim, apagar"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-600/40 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-600/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Apagar registros do dia
                  </button>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={fechar}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 font-medium disabled:opacity-60 dark:border-white/15"
              >
                <X className="h-5 w-5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 font-medium text-background disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
