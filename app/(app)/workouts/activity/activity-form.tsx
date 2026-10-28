"use client";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { Card, Field, Input, Select, fmt } from "@/components/ui";
import { logActivity } from "@/lib/actions/workouts";
import { INTENSITY_LABELS, metFor, trainingKcal, type Intensity } from "@/lib/calc";
import { EXERCISE_TYPE_LABELS, type Exercise, type ExerciseType } from "@/lib/types";

export function ActivityForm({ activities, today, weightKg }: { activities: Exercise[]; today: string; weightKg: number }) {
  const [state, action] = useActionState(logActivity, undefined);
  const [id, setId] = useState(activities.find((a) => a.type === "cardio")?.id ?? activities[0]?.id ?? "");
  const [minutes, setMinutes] = useState("30");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const ex = activities.find((a) => a.id === id);
  const met = ex ? metFor(ex, intensity) : null;
  const kcal = met ? trainingKcal(met, weightKg, Number(minutes) / 60) : 0;
  const groups = (Object.keys(EXERCISE_TYPE_LABELS) as ExerciseType[]).map((t) => [t, activities.filter((a) => a.type === t)] as const);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Atividade">
        <Select name="exercise_id" value={id} onChange={(e) => setId(e.target.value)}>
          {groups.map(([t, list]) =>
            list.length ? (
              <optgroup key={t} label={EXERCISE_TYPE_LABELS[t]}>
                {list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </optgroup>
            ) : null,
          )}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duração (min)">
          <Input name="duration_min" type="number" min={1} max={600} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
        </Field>
        <Field label="Data">
          <Input name="performed_on" type="date" defaultValue={today} max={today} required />
        </Field>
      </div>
      <Field label="Intensidade">
        <Select name="intensity" value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)}>
          {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((i) => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
        </Select>
      </Field>
      <Card className="text-center">
        <p className="text-3xl font-bold">{fmt(kcal)} kcal</p>
        <p className="text-xs text-muted">MET {fmt(met, 1)} × {fmt(weightKg, 1)} kg × {fmt(Number(minutes) / 60, 2)} h</p>
      </Card>
      <SubmitButton>Registrar</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
