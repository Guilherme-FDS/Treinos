"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth";
import { inferStrengthIntensity, metFor, trainingKcal } from "@/lib/calc";
import { activitySchema, finishWorkoutSchema, firstError, formToObject, templateItemSchema, templateSchema } from "@/lib/schemas";
import type { Exercise } from "@/lib/types";

async function bodyWeight(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string) {
  const { data } = await supabase.from("profiles").select("weight_kg").eq("id", userId).single();
  return Number(data?.weight_kg ?? 70);
}

// ---------- Fichas ----------

export async function saveTemplate(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = templateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const id = fd.get("$id");
  const q = id
    ? supabase.from("workout_templates").update(parsed.data).eq("id", String(id)).eq("owner_id", user.id)
    : supabase.from("workout_templates").insert({ ...parsed.data, owner_id: user.id });
  const { data, error } = await q.select("id").single();
  if (error) return { error: error.code === "42501" ? "Sem permissão para atribuir a esse aluno." : error.message };
  revalidatePath("/workouts");
  if (!id) redirect(`/workouts/templates/${data.id}`);
  return { ok: "Ficha salva." };
}

export async function deleteTemplate(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("workout_templates").delete().eq("id", String(fd.get("id"))).eq("owner_id", user.id);
  revalidatePath("/workouts");
  redirect("/workouts");
}

/** Duplica ficha (própria ou atribuída) para o usuário atual. */
export async function duplicateTemplate(fd: FormData) {
  const { supabase, user } = await requireUser();
  const { data: t } = await supabase
    .from("workout_templates")
    .select("name, goal, weekdays, notes, workout_template_items(exercise_id, position, sets, reps_min, reps_max, load_kg, rest_s, method, notes)")
    .eq("id", String(fd.get("id")))
    .single();
  if (!t) return;
  const { data: copy, error } = await supabase
    .from("workout_templates")
    .insert({ owner_id: user.id, name: `${t.name} (cópia)`.slice(0, 100), goal: t.goal, weekdays: t.weekdays, notes: t.notes })
    .select("id")
    .single();
  if (error || !copy) return;
  const items = t.workout_template_items ?? [];
  if (items.length) await supabase.from("workout_template_items").insert(items.map((i) => ({ ...i, template_id: copy.id })));
  revalidatePath("/workouts");
  redirect(`/workouts/templates/${copy.id}`);
}

export async function addTemplateItem(templateId: string, exerciseId: string) {
  const { supabase } = await requireUser();
  const ids = z.tuple([z.uuid(), z.uuid()]).parse([templateId, exerciseId]);
  const { count } = await supabase.from("workout_template_items").select("id", { count: "exact", head: true }).eq("template_id", ids[0]);
  const { error } = await supabase.from("workout_template_items").insert({
    template_id: ids[0],
    exercise_id: ids[1],
    position: count ?? 0,
    sets: 3,
    reps_min: 8,
    reps_max: 12,
    rest_s: 90,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/workouts/templates/${ids[0]}`);
}

export async function updateTemplateItem(itemId: string, input: unknown) {
  const { supabase } = await requireUser();
  const parsed = templateItemSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { exercise_id: _e, ...patch } = parsed.data;
  const { error } = await supabase.from("workout_template_items").update(patch).eq("id", z.uuid().parse(itemId));
  return error ? { error: error.message } : { ok: "ok" };
}

export async function deleteTemplateItem(itemId: string, templateId: string) {
  const { supabase } = await requireUser();
  await supabase.from("workout_template_items").delete().eq("id", z.uuid().parse(itemId));
  revalidatePath(`/workouts/templates/${templateId}`);
}

export async function reorderTemplateItems(templateId: string, orderedIds: string[]) {
  const { supabase } = await requireUser();
  const ids = z.array(z.uuid()).max(100).parse(orderedIds);
  await Promise.all(
    ids.map((id, position) =>
      supabase.from("workout_template_items").update({ position }).eq("id", id).eq("template_id", templateId),
    ),
  );
}

// ---------- Execução ----------

export async function finishWorkout(input: unknown): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await requireUser();
  const parsed = finishWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const minutes = Math.max(1, (Date.parse(v.ended_at) - Date.parse(v.started_at)) / 60000);
  const durationMin = Math.min(600, Math.round(minutes * 10) / 10);
  const weight = await bodyWeight(supabase, user.id);
  const inf = inferStrengthIntensity(
    v.sets.map((s) => ({ reps: s.reps, loadKg: s.load_kg, restS: s.rest_s })),
    weight,
    durationMin,
  );
  const kcal = Math.round(trainingKcal(inf.met, weight, durationMin / 60) * 10) / 10;

  const { data: w, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      template_id: v.template_id,
      name: v.name,
      performed_on: v.performed_on,
      started_at: v.started_at,
      ended_at: v.ended_at,
      duration_min: durationMin,
      type: "musculacao",
      intensity: inf.intensity,
      met: inf.met,
      weight_kg: weight,
      kcal,
    })
    .select("id")
    .single();
  if (error || !w) return { error: error?.message ?? "erro ao salvar treino" };

  const { error: setsError } = await supabase.from("workout_sets").insert(
    v.sets.map((s) => ({ ...s, workout_id: w.id, user_id: user.id, done: true })),
  );
  if (setsError) {
    await supabase.from("workouts").delete().eq("id", w.id);
    return { error: setsError.message };
  }
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return { id: w.id };
}

export async function logActivity(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = activitySchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const { data: ex } = await supabase.from("exercises").select("*").eq("id", v.exercise_id).single();
  if (!ex) return { error: "Atividade não encontrada." };
  const e = ex as Exercise;
  const met = metFor(e, v.intensity) ?? (e.type === "musculacao" ? 5 : null);
  if (!met) return { error: "Atividade sem MET definido." };
  const weight = await bodyWeight(supabase, user.id);
  const kcal = Math.round(trainingKcal(met, weight, v.duration_min / 60) * 10) / 10;

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    exercise_id: e.id,
    name: e.name,
    performed_on: v.performed_on,
    duration_min: v.duration_min,
    type: e.type,
    intensity: v.intensity,
    met,
    weight_kg: weight,
    kcal,
  });
  if (error) return { error: error.message };
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  redirect("/workouts");
}

export async function deleteWorkout(fd: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("workouts").delete().eq("id", String(fd.get("id"))).eq("user_id", user.id);
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}
