import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field, Input } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { updatePassword } from "../actions";

export const metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  const { user } = await getSession();
  if (!user) redirect("/forgot-password");
  return (
    <>
      <h1 className="text-center text-2xl font-semibold">Nova senha</h1>
      <ActionForm action={updatePassword}>
        <Field label="Nova senha">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirmar senha">
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton>Salvar</SubmitButton>
      </ActionForm>
    </>
  );
}
