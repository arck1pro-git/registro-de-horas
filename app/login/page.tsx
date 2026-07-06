"use client";

import { useActionState } from "react";
import { Clock, LogIn, TriangleAlert } from "lucide-react";
import { authenticate } from "@/app/actions";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  );

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm md:rounded-3xl md:border md:border-black/10 md:bg-background md:p-8 md:shadow-xl md:dark:border-white/15">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Registro de Horas</h1>
          <p className="text-sm opacity-60">Entre para registrar suas horas</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="voce@empresa.com"
              className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
            />
          </label>

          {errorMessage && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <TriangleAlert className="h-4 w-4" />
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-base font-medium text-background transition-opacity disabled:opacity-60"
          >
            <LogIn className="h-5 w-5" />
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
