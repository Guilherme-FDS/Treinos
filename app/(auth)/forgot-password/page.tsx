import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-semibold">Recuperar senha</h1>
      <ActionForm action={requestPasswordReset}>
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton>Enviar link</SubmitButton>
      </ActionForm>
      <Link href="/login" className="text-center text-sm text-muted underline">Voltar ao login</Link>
    </>
  );
}
