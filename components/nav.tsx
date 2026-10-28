"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const ITEMS = [
  { href: "/dashboard", label: "Hoje", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/diary", label: "Diário", icon: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" },
  { href: "/workouts", label: "Treinos", icon: "M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" },
  { href: "/foods", label: "Alimentos", icon: "M12 3c4 0 7 3 7 8s-3 10-7 10-7-5-7-10 3-8 7-8zM12 3v4" },
  { href: "/profile", label: "Perfil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {ITEMS.map((i) => {
          const active = path === i.href || path.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-accent" : "text-muted")}
                aria-current={active ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={i.icon} />
                </svg>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
