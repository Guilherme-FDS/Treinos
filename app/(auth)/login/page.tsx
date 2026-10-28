import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { signIn } from "../actions";
import { GoogleButton } from "../google-button";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold">Entrar</h1>
      {error && <p className="rounded-lg bg-danger/10 p-2 text-sm text-danger">Falha na autenticação. Tente novamente.</p>}
      <ActionForm action={signIn}>
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        <SubmitButton>Entrar</SubmitButton>
      </ActionForm>
      <GoogleButton next={next} />
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-muted underline">Esqueci a senha</Link>
        <Link href="/signup" className="text-accent underline">Criar conta</Link>
      </div>
    </>
  );
}
