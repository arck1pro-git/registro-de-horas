import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";

type View = "registros" | "usuarios";

const ITEMS: { view: View; label: string; href: string; icon: typeof Users }[] =
  [
    {
      view: "registros",
      label: "Registros",
      href: "/admin",
      icon: CalendarClock,
    },
    {
      view: "usuarios",
      label: "Usuários",
      href: "/admin?view=usuarios",
      icon: Users,
    },
  ];

export function AdminSidebar({ active }: { active: View }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto border-b border-black/10 p-3 dark:border-white/15 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-4">
      {ITEMS.map(({ view, label, href, icon: Icon }) => {
        const isActive = view === active;
        return (
          <Link
            key={view}
            href={href}
            className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "opacity-70 hover:bg-foreground/5 hover:opacity-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
