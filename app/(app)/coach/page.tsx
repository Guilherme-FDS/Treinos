import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { Badge, Button, Card, Empty, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { inviteStudent, removeStudent } from "@/lib/actions/profile";
import { requireProfile } from "@/lib/auth";
import { activeStudents } from "@/lib/coach";

export const metadata = { title: "Alunos" };

export default async function CoachPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role === "user") redirect("/profile");
  const students = await activeStudents(supabase, profile.id);
  const { data: templates } = await supabase.from("workout_templates").select("id, name, assigned_to").eq("owner_id", profile.id).not("assigned_to", "is", null);

  return (
    <>
      <PageHeader title="Meus alunos" back="/profile" />
      <div className="flex flex-col gap-4">
        <Card>
          <ActionForm action={inviteStudent} className="flex flex-col gap-2">
            <Field label="Convidar aluno por e-mail" hint="O aluno precisa ter conta e aceitar no perfil.">
              <Input name="email" type="email" required />
            </Field>
            <SubmitButton>Convidar</SubmitButton>
          </ActionForm>
        </Card>
        {students.length === 0 && <Empty>Nenhum aluno ainda.</Empty>}
        {students.map((s) => {
          const fichas = (templates ?? []).filter((t) => t.assigned_to === s.id);
          return (
            <Card key={s.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  {s.email && <p className="text-xs text-muted">{s.email}</p>}
                </div>
                {s.status === "pending" ? <Badge tone="warn">pendente</Badge> : <Badge tone="accent">ativo</Badge>}
              </div>
              {fichas.length > 0 && (
                <ul className="text-sm">
                  {fichas.map((f) => <li key={f.id}><a className="text-accent underline" href={`/workouts/templates/${f.id}`}>{f.name}</a></li>)}
                </ul>
              )}
              <div className="flex gap-2">
                {s.status === "active" && <LinkButton href={`/workouts/templates/new?assign=${s.id}`} size="sm" className="flex-1">Nova ficha</LinkButton>}
                <form action={removeStudent}>
                  <input type="hidden" name="student_id" value={s.id} />
                  <Button size="sm" variant="secondary">Remover</Button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
