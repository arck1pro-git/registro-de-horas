"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

export function EditDayButton({
  userId,
  dateKey,
  dateLabel,
}: {
  userId: string;
  dateKey: string;
  dateLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"in" | "out">("in");
  const [time, setTime] = useState("08:00");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar() {
    setError(null);
    startTransition(async () => {
      // Monta o timestamp local a partir do dia + horário informados.
      const timestamp = new Date(`${dateKey}T${time}:00`).toISOString();
      const res = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tipo, timestamp }),
      });
      if (!res.ok) {
        setError("Não foi possível salvar. Tente novamente.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar dia"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 opacity-70 transition-opacity hover:opacity-100 dark:border-white/15"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => !isPending && setOpen(false)}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 w-full max-w-sm rounded-3xl bg-background p-6 text-left shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">Adicionar registro</p>
                <p className="text-sm capitalize opacity-60">{dateLabel}</p>
              </div>
              <button
                onClick={() => !isPending && setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tipo</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo("in")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                      tipo === "in"
                        ? "bg-emerald-600 text-white"
                        : "border border-black/10 dark:border-white/15"
                    }`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("out")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                      tipo === "out"
                        ? "bg-rose-600 text-white"
                        : "border border-black/10 dark:border-white/15"
                    }`}
                  >
                    Saída
                  </button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Horário
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
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
        </div>
      )}
    </>
  );
}
