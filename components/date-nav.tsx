import Link from "next/link";
import { addDays, formatDayLabel } from "@/lib/dates";

export function DateNav({ day, today, base }: { day: string; today: string; base: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-1">
      <Link href={`${base}?date=${addDays(day, -1)}`} className="rounded-xl px-3 py-2 text-muted hover:bg-bg" aria-label="Dia anterior">‹</Link>
      <Link href={base} className="text-sm font-medium capitalize">{day === today ? "Hoje" : formatDayLabel(day)}</Link>
      {day < today ? (
        <Link href={`${base}?date=${addDays(day, 1)}`} className="rounded-xl px-3 py-2 text-muted hover:bg-bg" aria-label="Próximo dia">›</Link>
      ) : (
        <span className="px-3 py-2 text-transparent">›</span>
      )}
    </div>
  );
}
