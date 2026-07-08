// Fuso horário do app. Os timestamps são gravados em UTC (TIMESTAMPTZ), mas
// TUDO que é exibido/agrupado por dia deve ser convertido para este fuso.
//
// Por que isto existe: no servidor (Vercel) o processo Node roda em UTC — e a
// Vercel NÃO deixa sobrescrever a env `TZ` (nome reservado). Sem fixar o fuso
// aqui, `toLocaleTimeString`/`getHours`/`getDate` usariam UTC e o horário
// apareceria 3h à frente (Brasil = UTC−3).
export const TIMEZONE = "America/Sao_Paulo";

/** Hora "HH:MM" (24h) no fuso do app, a partir de um ISO em UTC. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

/** Data "DD/MM/AAAA" no fuso do app, a partir de um ISO em UTC. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/**
 * Chave de dia "YYYY-MM-DD" no fuso do app. Aceita um Date ou um ISO.
 * Use para agrupar registros por dia — assim uma batida às 22h (Brasil) não
 * "vaza" para o dia seguinte por causa do UTC.
 */
export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // en-CA formata como "YYYY-MM-DD".
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);
}
