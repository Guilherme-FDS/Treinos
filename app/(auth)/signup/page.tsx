import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { signUp } from "../actions";
import { GoogleButton } from "../google-button";

export const metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-semibold">Criar conta</h1>
      <ActionForm action={signUp}>
        <Field label="Nome">
          <Input name="full_name" autoComplete="name" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton>Cadastrar</SubmitButton>
      </ActionForm>
      <GoogleButton next="/onboarding" />
      <p className="text-center text-sm">
        Já tem conta? <Link href="/login" className="text-accent underline">Entrar</Link>
      </p>
    </>
  );
}
