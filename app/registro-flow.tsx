"use client";

import { useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Clock,
  LogIn,
  LogOut,
  House,
  Building2,
  MapPin,
  type LucideProps,
} from "lucide-react";

// Cada fluxo posta para uma API route diferente:
//   ponto      -> /api/registros   { tipo: "in" | "out" }
//   modalidade -> /api/modalidade  { tipo: "home_office" | "presencial" }
type Kind = "ponto" | "modalidade";

type RegistroOption = {
  tipo: string;
  label: string;
  icon: ComponentType<LucideProps>;
  /** classes de cor do botão/realce (ex.: "bg-emerald-600") */
  color: string;
};

type Step =
  | { name: "idle" }
  | { name: "choosing" }
  | { name: "confirming"; option: RegistroOption };

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-black/50"
      />
      <div className="animate-card-in relative z-10 w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function RegistroFlow({
  kind,
  triggerLabel,
  triggerIcon: TriggerIcon,
  options,
  disabled = false,
  disabledHint,
}: {
  kind: Kind;
  triggerLabel: string;
  triggerIcon: ComponentType<LucideProps>;
  options: RegistroOption[];
  disabled?: boolean;
  disabledHint?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    if (!isPending) {
      setStep({ name: "idle" });
      setError(null);
    }
  }

  function confirmar(option: RegistroOption) {
    setError(null);
    startTransition(async () => {
      const endpoint = kind === "ponto" ? "/api/registros" : "/api/modalidade";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: option.tipo }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Não foi possível registrar. Tente novamente.");
        return;
      }
      setStep({ name: "idle" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setStep({ name: "choosing" })}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-6 py-5 text-lg font-semibold text-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          <TriggerIcon className="h-6 w-6" />
          {triggerLabel}
        </button>
        {disabled && disabledHint && (
          <p className="text-center text-sm text-amber-600">{disabledHint}</p>
        )}
      </div>

      {step.name === "choosing" && (
        <Overlay onClose={close}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-base font-semibold">{triggerLabel}</p>
            <button
              onClick={close}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.tipo}
                  onClick={() => setStep({ name: "confirming", option })}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold text-white ${option.color}`}
                >
                  <Icon className="h-6 w-6" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </Overlay>
      )}

      {step.name === "confirming" && (
        <Overlay onClose={close}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${step.option.color}`}
            >
              <step.option.icon className="h-6 w-6" />
            </div>
            <p className="text-base font-medium">
              Tem certeza que quer registrar{" "}
              <span className="font-semibold">{step.option.label}</span>?
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex w-full gap-3">
              <button
                onClick={() => setStep({ name: "choosing" })}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 font-medium disabled:opacity-60 dark:border-white/15"
              >
                <X className="h-5 w-5" />
                Cancelar
              </button>
              <button
                onClick={() => confirmar(step.option)}
                disabled={isPending}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white disabled:opacity-60 ${step.option.color}`}
              >
                <Check className="h-5 w-5" />
                {isPending ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

const pontoOptions: RegistroOption[] = [
  { tipo: "in", label: "Entrada", icon: LogIn, color: "bg-emerald-600" },
  { tipo: "out", label: "Saída", icon: LogOut, color: "bg-rose-600" },
];

const modalidadeOptions: RegistroOption[] = [
  { tipo: "home_office", label: "Home Office", icon: House, color: "bg-indigo-600" },
  { tipo: "presencial", label: "Presencial", icon: Building2, color: "bg-amber-600" },
];

export function PontoFlow({
  modalidadeRegistrada,
}: {
  modalidadeRegistrada: boolean;
}) {
  return (
    <RegistroFlow
      kind="ponto"
      triggerLabel="Registrar"
      triggerIcon={Clock}
      options={pontoOptions}
      disabled={!modalidadeRegistrada}
      disabledHint="Registre a modalidade do dia para liberar o ponto."
    />
  );
}

export function ModalidadeFlow() {
  return (
    <RegistroFlow
      kind="modalidade"
      triggerLabel="Registrar modalidade"
      triggerIcon={MapPin}
      options={modalidadeOptions}
    />
  );
}
