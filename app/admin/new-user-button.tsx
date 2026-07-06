"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Check } from "lucide-react";

export function NewUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function abrir() {
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
    setOpen(true);
  }

  function fechar() {
    if (!isPending) setOpen(false);
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Não foi possível criar o usuário.");
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
        onClick={abrir}
        className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/15"
      >
        <UserPlus className="h-4 w-4" />
        Novo usuário
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 w-full max-w-md rounded-3xl bg-background p-6 text-left shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <p className="text-base font-semibold">Novo usuário</p>
              <button
                onClick={fechar}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nome
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Senha
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-3">
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
                {isPending ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
