"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EllipsisVertical,
  ImageUp,
  Trash2,
  LogOut,
  Download,
  Bell,
} from "lucide-react";
import { logout } from "@/app/actions";

// Evento não-tipado no lib.dom padrão; definição mínima do que usamos.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function ProfileHeader({
  name,
  imageUrl,
  notificationsEnabled = false,
}: {
  name?: string | null;
  imageUrl?: string | null;
  notificationsEnabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Notificações (push / FCM).
  const [notifEnabled, setNotifEnabled] = useState(notificationsEnabled);
  const [notifBusy, setNotifBusy] = useState(false);

  async function toggleNotificacoes() {
    setMenuOpen(false);
    setError(null);
    setNotifBusy(true);
    try {
      if (!notifEnabled) {
        const { enableNotifications } = await import("@/lib/firebase-client");
        const token = await enableNotifications();
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error("Falha ao salvar o token.");
        setNotifEnabled(true);
      } else {
        const { disableNotifications } = await import("@/lib/firebase-client");
        await disableNotifications();
        await fetch("/api/notifications", { method: "DELETE" });
        setNotifEnabled(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao alterar notificações."
      );
    } finally {
      setNotifBusy(false);
    }
  }

  // Instalação do app (PWA).
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function instalarApp() {
    setMenuOpen(false);
    if (installEvt) {
      // Android / desktop (Chrome, Edge): prompt nativo.
      await installEvt.prompt();
      try {
        await installEvt.userChoice;
      } catch {
        // usuário fechou; sem ação
      }
      setInstallEvt(null);
    } else {
      // iOS ou navegador sem prompt automático: mostra instruções.
      setShowInstallHelp(true);
    }
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  function pickFile() {
    setMenuOpen(false);
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/avatar", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Falha ao enviar.");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao enviar.");
      }
    });
  }

  function removePhoto() {
    setMenuOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/avatar", { method: "DELETE" });
        if (!res.ok) throw new Error("Falha ao remover.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao remover.");
      }
    });
  }

  return (
    <div className="relative">
      {/* Foto grande, full-bleed (colada no topo e nas laterais) */}
      <div className="relative aspect-square w-full overflow-hidden bg-foreground/5 md:rounded-t-3xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name ?? "Foto de perfil"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-foreground text-background">
            <span className="text-7xl font-semibold">{initial}</span>
          </div>
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
            Processando...
          </div>
        )}
      </div>

      {/* Toggle no canto superior direito, por cima da foto */}
      <div className="absolute right-4 top-4">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
        >
          <EllipsisVertical className="h-5 w-5" />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-black/10 bg-background shadow-xl dark:border-white/15">
              <button
                type="button"
                onClick={pickFile}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5"
              >
                <ImageUp className="h-4 w-4" />
                Mudar foto
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-foreground/5"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover foto
                </button>
              )}
              <button
                type="button"
                onClick={toggleNotificacoes}
                disabled={notifBusy}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5 disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  <Bell className="h-4 w-4" />
                  Notificações
                </span>
                <span
                  className={`text-xs ${
                    notifEnabled ? "text-emerald-600" : "opacity-50"
                  }`}
                >
                  {notifBusy ? "..." : notifEnabled ? "Ativado" : "Desativado"}
                </span>
              </button>
              {!installed && (
                <button
                  type="button"
                  onClick={instalarApp}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5"
                >
                  <Download className="h-4 w-4" />
                  Instalar app
                </button>
              )}
              <div className="border-t border-black/10 dark:border-white/15" />
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />

      {error && (
        <p className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow-lg">
          {error}
        </p>
      )}

      {showInstallHelp && (
        <button
          type="button"
          onClick={() => setShowInstallHelp(false)}
          className="fixed bottom-20 left-1/2 z-50 w-[90%] max-w-xs -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-center text-sm text-background shadow-lg"
        >
          {isIOS
            ? "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”."
            : "Abra o menu do navegador e escolha “Instalar app” / “Adicionar à tela inicial”."}
        </button>
      )}
    </div>
  );
}
