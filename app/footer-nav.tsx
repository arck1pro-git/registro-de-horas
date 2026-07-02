"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ChartColumn, Shield } from "lucide-react";

const baseItems = [
  { href: "/", label: "Início", icon: House },
  { href: "/relatorio", label: "Relatório", icon: ChartColumn },
];

export function FooterNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  // Não exibe o menu na tela de login.
  if (pathname === "/login") return null;

  const items = isAdmin
    ? [...baseItems, { href: "/admin", label: "Admin", icon: Shield }]
    : baseItems;

  return (
    <footer className="sticky bottom-0 border-t border-black/10 bg-background dark:border-white/15">
      <nav className="mx-auto flex max-w-md">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-opacity ${
                active ? "opacity-100" : "opacity-50 hover:opacity-80"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
