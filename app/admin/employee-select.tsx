"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";

export function EmployeeSelect({
  funcionarios,
  selectedId,
}: {
  funcionarios: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const selected = funcionarios.find((f) => f.id === selectedId);

  function pick(id: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("userId", id);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-56 items-center justify-between gap-2 rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm outline-none transition-colors hover:border-foreground/30 focus:border-foreground dark:border-white/15"
      >
        <span className="truncate">{selected?.name ?? "Selecionar"}</span>
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
          <ul
            role="listbox"
            className="absolute left-0 top-full z-50 mt-2 max-h-72 w-full min-w-56 overflow-auto rounded-xl border border-black/10 bg-background p-1 shadow-xl dark:border-white/15"
          >
            {funcionarios.map((f) => {
              const active = f.id === selectedId;
              return (
                <li key={f.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => pick(f.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/5 ${
                      active ? "font-medium" : ""
                    }`}
                  >
                    <span className="truncate">{f.name}</span>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
