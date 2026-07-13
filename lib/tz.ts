// Fuso horário do app. Os timestamps são gravados em UTC (TIMESTAMPTZ), mas
// TUDO que é exibido/agrupado por dia deve ser convertido para este fuso.
//
// Por que isto existe: no servidor (Vercel) o processo Node roda em UTC — e a
// Vercel NÃO deixa sobrescrever a env `TZ` (nome reservado). Sem fixar o fuso
// aqui, `toLocaleTimeString`/`getHours`/`getDate` usariam UTC e o horário
// apareceria 3h à frente (Brasil = UTC−3).
export const TIMEZONE = "America/Sao_Paulo";

/**
 * Hora "HH:MM" (24h) a partir de um ISO em UTC.
 * `tz` = fuso do usuário (IANA). Omitido = padrão São Paulo.
 */
export function formatTime(iso: string, tz: string = TIMEZONE): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
}

/** Data "DD/MM/AAAA" no fuso informado (padrão São Paulo), a partir de um ISO em UTC. */
export function formatDate(iso: string, tz: string = TIMEZONE): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: tz,
  });
}

/**
 * Chave de dia "YYYY-MM-DD" no fuso informado (padrão São Paulo). Aceita um Date
 * ou um ISO. Use para agrupar registros por dia — assim uma batida às 22h não
 * "vaza" para o dia seguinte por causa do UTC.
 */
export function dateKey(d: Date | string, tz: string = TIMEZONE): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // en-CA formata como "YYYY-MM-DD".
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(date);
}

/** Valida uma string de fuso IANA (ex.: 'America/Sao_Paulo'). */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
