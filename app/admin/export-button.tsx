"use client";

import { Download } from "lucide-react";

export type ReportRow = {
  dateKey: string;
  dateLabel: string;
  minutes: number;
  punches: { tipo: "in" | "out"; time: string }[];
  modality: "home_office" | "presencial" | null;
};

function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function modalityLabel(mod: ReportRow["modality"]) {
  if (mod === "home_office") return "Home Office";
  if (mod === "presencial") return "Presencial";
  return "";
}

/** Escapa um valor para uma célula CSV. */
function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ExportButton({
  funcionario,
  rows,
}: {
  funcionario: string;
  rows: ReportRow[];
}) {
  function exportCsv() {
    const header = ["Dia", "Horas totais", "Registros", "Modalidade"];
    const lines = rows.map((row) => {
      const punches = row.punches
        .map((p) => `${p.tipo === "in" ? "E" : "S"} ${p.time}`)
        .join(" | ");
      return [
        row.dateLabel,
        fmtDur(row.minutes),
        punches,
        modalityLabel(row.modality),
      ]
        .map(csvCell)
        .join(",");
    });

    const csv = [header.map(csvCell).join(","), ...lines].join("\r\n");
    // BOM para acentuação correta no Excel.
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = funcionario.toLowerCase().replace(/\s+/g, "-");
    a.href = url;
    a.download = `ponto-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </button>
  );
}
