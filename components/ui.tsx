// Primitivas de UI (Tailwind). Server-safe: sem hooks.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const btn = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-border bg-card text-fg hover:bg-bg",
  ghost: "text-fg hover:bg-border/40",
  danger: "bg-danger text-white hover:opacity-90",
};
type BtnVariant = keyof typeof btn;

export function buttonClass(variant: BtnVariant = "primary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50",
    size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4",
    btn[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button className={cx(buttonClass(variant, size), className)} {...p} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...p} />;
}

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-card px-3 text-fg outline-none placeholder:text-muted focus:border-accent";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(inputClass, "appearance-none", className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto min-h-24 py-2", className)} {...p} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-border bg-card p-4", className)} {...p} />;
}

export function PageHeader({ title, action, back }: { title: string; action?: ReactNode; back?: string }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {back && (
          <Link href={back} className="rounded-lg px-2 py-1 text-muted hover:bg-border/40" aria-label="Voltar">
            ←
          </Link>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Progress({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max * 1.05;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "var(--danger)" : color }} />
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warn" | "accent" | "danger" }) {
  const t = {
    muted: "bg-border/60 text-muted",
    warn: "bg-warn/15 text-warn",
    accent: "bg-accent/15 text-accent",
    danger: "bg-danger/15 text-danger",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

export function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
