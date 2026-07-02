"use client";

import { useRouter } from "next/navigation";

export function EmployeeSelect({
  funcionarios,
  selectedId,
}: {
  funcionarios: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => router.push(`/admin?userId=${e.target.value}`)}
      className="min-w-56 rounded-xl border border-black/10 bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground dark:border-white/15"
    >
      {funcionarios.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
