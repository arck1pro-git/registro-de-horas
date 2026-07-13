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
  KeyRound,
  Globe,
  X,
  Check,
} from "lucide-react";
import { logout } from "@/app/actions";

// Fusos oferecidos na troca. Rótulos amigáveis; valores são IANA.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "São Paulo / Brasília (GMT−3)" },
  { value: "America/Bahia", label: "Salvador (GMT−3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT−3)" },
  { value: "America/Recife", label: "Recife (GMT−3)" },
  { value: "America/Belem", label: "Belém (GMT−3)" },
  { value: "America/Campo_Grande", label: "Campo Grande (GMT−4)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT−4)" },
  { value: "America/Manaus", label: "Manaus (GMT−4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT−4)" },
  { value: "America/Boa_Vista", label: "Boa Vista (GMT−4)" },
  { value: "America/Rio_Branco", label: "Rio Branco / Acre (GMT−5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT−2)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT−3)" },
  { value: "America/New_York", label: "Nova York (GMT−5/−4)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0/+1)" },
  { value: "UTC", label: "UTC (GMT+0)" },
];

// Evento não-tipado no lib.dom padrão; definição mínima do que usamos.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function ProfileHeader({
  name,
  imageUrl,
  notificationsEnabled = false,
  timezone = "America/Sao_Paulo",
}: {
  name?: string | null;
  imageUrl?: string | null;
  notificationsEnabled?: boolean;
  timezone?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Notificações (push / FCM).
  const [notifEnabled, setNotifEnabled] = useState(notificationsEnabled);
  const [notifBusy, setNotifBusy] = useState(false);

  // Troca de senha.
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  function abrirTrocaSenha() {
    setMenuOpen(false);
    setPw1("");
    setPw2("");
    setPwError(null);
    setPwOpen(true);
  }

  function fecharTrocaSenha() {
    if (!pwBusy) setPwOpen(false);
  }

  async function salvarSenha() {
    setPwError(null);
    if (pw1.length < 4) {
      setPwError("A senha deve ter ao menos 4 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      setPwError("As senhas não coincidem.");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw1 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Não foi possível trocar a senha.");
      }
      // Senha trocada: desloga e força novo login com a nova senha.
      await logout();
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Não foi possível trocar a senha."
      );
      setPwBusy(false);
    }
  }

  // Fuso horário.
  const [tzOpen, setTzOpen] = useState(false);
  const [tz, setTz] = useState(timezone);
  const [tzError, setTzError] = useState<string | null>(null);
  const [tzBusy, setTzBusy] = useState(false);

  function abrirFuso() {
    setMenuOpen(false);
    setTz(timezone);
    setTzError(null);
    setTzOpen(true);
  }

  function fecharFuso() {
    if (!tzBusy) setTzOpen(false);
  }

  async function salvarFuso() {
    setTzError(null);
    setTzBusy(true);
    try {
      const res = await fetch("/api/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Não foi possível salvar o fuso.");
      }
      setTzOpen(false);
      router.refresh();
    } catch (err) {
      setTzError(
        err instanceof Error ? err.message : "Não foi possível salvar o fuso."
      );
    } finally {
      setTzBusy(false);
    }
  }

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
              <button
                type="button"
                onClick={abrirFuso}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5"
              >
                <Globe className="h-4 w-4" />
                Fuso horário
              </button>
              <button
                type="button"
                onClick={abrirTrocaSenha}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-foreground/5"
              >
                <KeyRound className="h-4 w-4" />
                Mudar senha
              </button>
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

      {pwOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fecharTrocaSenha}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 w-full max-w-md rounded-3xl bg-background p-6 text-left shadow-xl">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-base font-semibold">Mudar senha</p>
              <button
                onClick={fecharTrocaSenha}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm opacity-60">
              Digite a nova senha duas vezes. Você será desconectado para entrar
              com a nova senha.
            </p>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nova senha
                <input
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Confirmar nova senha
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
                />
              </label>
            </div>

            {pwError && <p className="mt-3 text-sm text-red-600">{pwError}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fecharTrocaSenha}
                disabled={pwBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 font-medium disabled:opacity-60 dark:border-white/15"
              >
                <X className="h-5 w-5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarSenha}
                disabled={pwBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 font-medium text-background disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {pwBusy ? "Salvando..." : "Trocar senha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tzOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fecharFuso}
            className="animate-overlay-in absolute inset-0 bg-black/50"
          />
          <div className="animate-card-in relative z-10 w-full max-w-md rounded-3xl bg-background p-6 text-left shadow-xl">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-base font-semibold">Fuso horário</p>
              <button
                onClick={fecharFuso}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm opacity-60">
              Seus registros passam a ser exibidos e agrupados por dia neste
              fuso.
            </p>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Fuso
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="rounded-xl border border-black/10 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground dark:border-white/15"
              >
                {TIMEZONES.some((t) => t.value === tz) ? null : (
                  <option value={tz}>{tz}</option>
                )}
                {TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {tzError && <p className="mt-3 text-sm text-red-600">{tzError}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fecharFuso}
                disabled={tzBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 font-medium disabled:opacity-60 dark:border-white/15"
              >
                <X className="h-5 w-5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarFuso}
                disabled={tzBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 font-medium text-background disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {tzBusy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
