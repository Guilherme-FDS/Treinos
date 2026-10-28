"use client";
import { useActionState, useState } from "react";
import { OCCUPATION_FACTORS, OCCUPATION_LABELS, GOAL_LABELS, type Goal, type Occupation } from "@/lib/calc";
import { saveProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";
import { FormMessage, SubmitButton } from "./form";
import { Field, Input, Select } from "./ui";

export function ProfileForm({ profile, redirectTo }: { profile: Profile | null; redirectTo?: "dashboard" }) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "emagrecer");
  const [pace, setPace] = useState(Number(profile?.pace_pct) >= 15 ? Number(profile?.pace_pct) : 20);

  return (
    <form action={action} className="flex flex-col gap-4">
      {redirectTo && <input type="hidden" name="$redirect" value={redirectTo} />}
      <Field label="Nome">
        <Input name="full_name" defaultValue={profile?.full_name ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sexo">
          <Select name="sex" defaultValue={profile?.sex ?? ""} required>
            <option value="" disabled>Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Select>
        </Field>
        <Field label="Nascimento">
          <Input name="birth_date" type="date" defaultValue={profile?.birth_date ?? ""} required />
        </Field>
        <Field label="Altura (cm)">
          <Input name="height_cm" type="number" inputMode="decimal" step="0.1" min={80} max={260} defaultValue={profile?.height_cm ?? ""} required />
        </Field>
        <Field label="Peso (kg)">
          <Input name="weight_kg" type="number" inputMode="decimal" step="0.1" min={25} max={400} defaultValue={profile?.weight_kg ?? ""} required />
        </Field>
      </div>
      <Field label="% de gordura (opcional)" hint="Se informado, o basal usa Katch-McArdle.">
        <Input name="body_fat_pct" type="number" inputMode="decimal" step="0.1" min={2} max={70} defaultValue={profile?.body_fat_pct ?? ""} />
      </Field>
      <Field label="Ocupação (sem contar treino)">
        <Select name="occupation" defaultValue={profile?.occupation ?? "escritorio"}>
          {(Object.keys(OCCUPATION_FACTORS) as Occupation[]).map((o) => (
            <option key={o} value={o}>
              {OCCUPATION_LABELS[o]} (×{OCCUPATION_FACTORS[o]})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Objetivo">
        <Select name="goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <option key={g} value={g}>{GOAL_LABELS[g]}</option>
          ))}
        </Select>
      </Field>
      {goal === "emagrecer" ? (
        <Field label={`Ritmo do déficit: ${pace}%`} hint="15% leve · 20% moderado · 25% agressivo">
          <input name="pace_pct" type="range" min={15} max={25} step={1} value={pace} onChange={(e) => setPace(Number(e.target.value))} className="accent-[var(--accent)]" />
        </Field>
      ) : (
        <input type="hidden" name="pace_pct" value={goal === "ganhar" ? 10 : 0} />
      )}
      {goal === "ganhar" && <p className="text-sm text-muted">Superávit de 10% sobre a manutenção.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proteína (g/kg)" hint="1,6–2,2">
          <Input name="protein_g_per_kg" type="number" step="0.1" min={1.6} max={2.2} defaultValue={profile?.protein_g_per_kg ?? 1.8} />
        </Field>
        <Field label="Gordura (g/kg)" hint="0,6–1,0">
          <Input name="fat_g_per_kg" type="number" step="0.1" min={0.6} max={1} defaultValue={profile?.fat_g_per_kg ?? 0.8} />
        </Field>
      </div>
      <SubmitButton>Salvar</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
