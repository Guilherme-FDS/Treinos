import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import type { Exercise, TemplateItem } from "@/lib/types";
import type { RunExercise } from "./runner";
import { Runner } from "./runner-client";

export const metadata = { title: "Treino" };

export default async function RunPage({ params }: PageProps<"/workouts/run/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const { data: t } = await supabase
    .from("workout_templates")
    .select("id, name, workout_template_items(*, exercise:exercises(id, name, video_url, image_url, instructions))")
    .eq("id", id)
    .order("position", { referencedTable: "workout_template_items" })
    .maybeSingle();
  if (!t) notFound();
  const items = (t.workout_template_items ?? []) as (TemplateItem & { exercise: Pick<Exercise, "id" | "name" | "video_url" | "image_url" | "instructions"> })[];
  const exerciseIds = items.map((i) => i.exercise_id);

  // Última execução de cada exercício (pré-preenche séries/cargas)
  const last = new Map<string, { reps: number; load_kg: number }[]>();
  if (exerciseIds.length) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, workout_id, set_index, reps, load_kg, done_at")
      .eq("user_id", profile.id)
      .in("exercise_id", exerciseIds)
      .order("done_at", { ascending: false })
      .limit(400);
    const latestWorkout = new Map<string, string>();
    for (const s of sets ?? []) {
      if (!latestWorkout.has(s.exercise_id)) latestWorkout.set(s.exercise_id, s.workout_id);
      if (latestWorkout.get(s.exercise_id) !== s.workout_id) continue;
      const arr = last.get(s.exercise_id) ?? [];
      arr[s.set_index] = { reps: Number(s.reps ?? 0), load_kg: Number(s.load_kg ?? 0) };
      last.set(s.exercise_id, arr);
    }
  }

  const exercises: RunExercise[] = items.map((i) => {
    const prev = (last.get(i.exercise_id) ?? []).filter(Boolean);
    return {
      itemId: i.id,
      exerciseId: i.exercise_id,
      name: i.exercise?.name ?? "Exercício",
      videoUrl: i.exercise?.video_url ?? null,
      imageUrl: i.exercise?.image_url ?? null,
      instructions: i.exercise?.instructions ?? null,
      restS: i.rest_s ?? 90,
      method: i.method,
      notes: i.notes,
      repsLabel: i.reps_min && i.reps_max && i.reps_min !== i.reps_max ? `${i.reps_min}-${i.reps_max}` : String(i.reps_max ?? i.reps_min ?? ""),
      sets: Array.from({ length: i.sets }, (_, k) => ({
        reps: prev[k]?.reps ?? prev[prev.length - 1]?.reps ?? i.reps_max ?? i.reps_min ?? 10,
        load: prev[k]?.load_kg ?? prev[prev.length - 1]?.load_kg ?? Number(i.load_kg ?? 0),
        prevLabel: prev[k] ? `${prev[k].load_kg} kg × ${prev[k].reps}` : null,
        done: false,
      })),
    };
  });

  return <Runner templateId={t.id} name={t.name} day={localDate()} exercises={exercises} />;
}
