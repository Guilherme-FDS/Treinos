"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";

export type ActionState = { error?: string; ok?: string } | undefined;

export function SubmitButton({ children, variant, className }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? "Salvando…" : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger" role="alert">{state.error}</p>;
  if (state.ok) return <p className="rounded-lg bg-accent/10 p-2 text-sm text-accent">{state.ok}</p>;
  return null;
}

/** <form> com useActionState e mensagem de erro/sucesso. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "flex flex-col gap-3"}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}
