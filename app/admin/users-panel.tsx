"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Mail, KeyRound, Users } from "lucide-react";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export function UsersPanel({ users }: { users: AdminUser[] }) {
  const [editing, setEditing] = useState<AdminUser | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-background dark:border-white/15">
      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center opacity-50">
          <Users className="h-6 w-6" />
          <p className="text-sm">Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{u.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm opacity-60">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {u.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {u.password}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(u)}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 dark:border-white/15"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditUserModal user={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fechar() {
    if (!isPending) onClose();
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Não foi possível salvar as alterações.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="animate-overlay-in absolute inset-0 bg-black/50"
      />
      <div className="animate-card-in relative z-10 w-full max-w-md rounded-3xl bg-background p-6 text-left shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <p className="text-base font-semibold">Editar usuário</p>
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
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
