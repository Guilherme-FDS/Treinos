"use client";
import { useActionState } from "react";
import { saveTemplate } from "@/lib/actions/workouts";
import { WEEKDAY_LABELS, type WorkoutTemplate } from "@/lib/types";
import { FormMessage, SubmitButton } from "./form";
import { Field, Input, Select, Textarea } from "./ui";

export function TemplateForm({
  template,
  students,
  assignTo,
}: {
  template?: WorkoutTemplate;
  students?: { id: string; name: string }[];
  assignTo?: string;
}) {
  const [state, action] = useActionState(saveTemplate, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      {template && <input type="hidden" name="$id" value={template.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome">
          <Input name="name" defaultValue={template?.name ?? "Treino A"} required maxLength={100} />
        </Field>
        <Field label="Objetivo">
          <Input name="goal" defaultValue={template?.goal ?? ""} placeholder="Hipertrofia" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Dias da semana</legend>
        <div className="flex flex-wrap gap-1">
          {WEEKDAY_LABELS.map((l, i) => (
            <label key={l} className="cursor-pointer">
              <input type="checkbox" name="weekdays[]" value={i} defaultChecked={template?.weekdays.includes(i)} className="peer sr-only" />
              <span className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {students && students.length > 0 && (
        <Field label="Atribuir a aluno">
          <Select name="assigned_to" defaultValue={template?.assigned_to ?? assignTo ?? ""}>
            <option value="">— só para mim —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Observações">
        <Textarea name="notes" defaultValue={template?.notes ?? ""} className="min-h-16" />
      </Field>
      <SubmitButton>{template ? "Salvar ficha" : "Criar ficha"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
