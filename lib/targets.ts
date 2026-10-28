import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBaseTargets, type PlanProfile } from "@/lib/calc";
import type { DailyTargets, Profile } from "@/lib/types";

export function toPlanProfile(p: Profile): PlanProfile | null {
  if (!p.sex || !p.birth_date || !p.height_cm || !p.weight_kg || !p.occupation || !p.goal) return null;
  return {
    sex: p.sex,
    birth_date: p.birth_date,
    height_cm: Number(p.height_cm),
    weight_kg: Number(p.weight_kg),
    body_fat_pct: p.body_fat_pct == null ? null : Number(p.body_fat_pct),
    occupation: p.occupation,
    goal: p.goal,
    pace_pct: Number(p.pace_pct),
    protein_g_per_kg: Number(p.protein_g_per_kg),
    fat_g_per_kg: Number(p.fat_g_per_kg),
  };
}

/** Recalcula e grava metas vigentes a partir de `from` (perfil/peso novo). */
export async function recomputeTargets(supabase: SupabaseClient, profile: Profile, from: string) {
  const plan = toPlanProfile(profile);
  if (!plan) return null;
  const t = computeBaseTargets(plan, new Date(`${from}T12:00:00Z`));
  const row = { user_id: profile.id, effective_from: from, ...t };
  const { error } = await supabase.from("daily_targets").upsert(row, { onConflict: "user_id,effective_from" });
  if (error) throw error;
  return row;
}

/** Metas vigentes no dia (última com effective_from <= dia); calcula na hora se não houver. */
export async function getTargets(supabase: SupabaseClient, profile: Profile, day: string): Promise<DailyTargets | null> {
  const { data } = await supabase
    .from("daily_targets")
    .select("*")
    .eq("user_id", profile.id)
    .lte("effective_from", day)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return numeric(data as DailyTargets);
  const plan = toPlanProfile(profile);
  return plan ? { effective_from: day, ...computeBaseTargets(plan, new Date(`${day}T12:00:00Z`)) } : null;
}

function numeric(t: DailyTargets): DailyTargets {
  const o = { ...t } as Record<string, unknown>;
  for (const k of Object.keys(o)) if (k !== "effective_from" && k !== "bmr_formula" && typeof o[k] === "string") o[k] = Number(o[k]);
  return o as DailyTargets;
}
