import { notFound } from "next/navigation";
import { TemplateForm } from "@/components/template-form";
import { Button, Card, LinkButton, PageHeader } from "@/components/ui";
import { deleteTemplate, duplicateTemplate } from "@/lib/actions/workouts";
import { requireProfile } from "@/lib/auth";
import { activeStudents } from "@/lib/coach";
import type { TemplateItem, WorkoutTemplate } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/types";
import { ItemsEditor } from "./items-editor";

export default async function TemplatePage({ params }: PageProps<"/workouts/templates/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase
    .from("workout_templates")
    .select("*, workout_template_items(*, exercise:exercises(name))")
    .eq("id", id)
    .order("position", { referencedTable: "workout_template_items" })
    .maybeSingle();
  if (!data) notFound();
  const t = data as WorkoutTemplate & { workout_template_items: (TemplateItem & { exercise: { name: string } | null })[] };
  const editable = t.owner_id === profile.id;
  const items = t.workout_template_items.map((i) => ({ ...i, exercise_name: i.exercise?.name ?? "Exercício" }));
  const students = editable && profile.role !== "user" ? (await activeStudents(supabase, profile.id)).filter((s) => s.status === "active") : [];

  return (
    <>
      <PageHeader title={t.name} back="/workouts" action={<LinkButton href={`/workouts/run/${t.id}`} size="sm">▶ Iniciar</LinkButton>} />
      <div className="flex flex-col gap-4">
        {editable ? (
          <Card><TemplateForm template={t} students={students} /></Card>
        ) : (
          <Card className="text-sm">
            {t.goal && <p>Objetivo: {t.goal}</p>}
            {t.weekdays.length > 0 && <p>Dias: {t.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}</p>}
            {t.notes && <p className="mt-1 whitespace-pre-line text-muted">{t.notes}</p>}
            <p className="mt-2 text-xs text-muted">Ficha criada pelo seu personal. Duplique para editar.</p>
          </Card>
        )}
        <ItemsEditor key={items.map((i) => i.id).join()} templateId={t.id} items={items} editable={editable} />
        <div className="flex gap-2">
          <form action={duplicateTemplate} className="flex-1">
            <input type="hidden" name="id" value={t.id} />
            <Button variant="secondary" className="w-full">Duplicar</Button>
          </form>
          {editable && (
            <form action={deleteTemplate} className="flex-1">
              <input type="hidden" name="id" value={t.id} />
              <Button variant="danger" className="w-full">Excluir</Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
