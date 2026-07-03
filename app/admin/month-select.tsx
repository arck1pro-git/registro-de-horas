"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MESES_CURTO = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const MESES_LONGO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function MonthSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [year, month] = value.split("-").map(Number); // month 1-based
  const [viewYear, setViewYear] = useState(year);

  function toggle() {
    if (!open) setViewYear(year); // reabre sempre no ano selecionado
    setOpen((v) => !v);
  }

  function pick(monthIdx: number) {
    setOpen(false);
    const mes = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", mes);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-w-44 items-center justify-between gap-2 rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition-colors hover:border-foreground/30 focus:border-foreground dark:border-white/15"
      >
        <span>
          {MESES_LONGO[month - 1]} {year}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-black/10 bg-background p-3 shadow-xl dark:border-white/15">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewYear((v) => v - 1)}
                aria-label="Ano anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-70 hover:bg-foreground/5 hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{viewYear}</span>
              <button
                type="button"
                onClick={() => setViewYear((v) => v + 1)}
                aria-label="Próximo ano"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-70 hover:bg-foreground/5 hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MESES_CURTO.map((mo, i) => {
                const active = viewYear === year && i === month - 1;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(i)}
                    className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "hover:bg-foreground/5"
                    }`}
                  >
                    {mo}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
