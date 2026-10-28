// Metas diárias: kcal por objetivo, macros e água.

import { TEF_RATIO } from "./energy";

export type Goal = "emagrecer" | "manter" | "ganhar";

export const GOAL_LABELS: Record<Goal, string> = {
  emagrecer: "Emagrecer",
  manter: "Manter",
  ganhar: "Ganhar massa",
};

export const DEFICIT_RANGE = { min: 15, max: 25 } as const;
export const SURPLUS_PCT = 10;
export const PROTEIN_RANGE = { min: 1.6, max: 2.2 } as const; // g/kg
export const FAT_RANGE = { min: 0.6, max: 1.0 } as const; // g/kg

/** % de ajuste sobre a manutenção: -15..-25 (emagrecer), 0 (manter), +10 (ganhar). */
export function adjustPct(goal: Goal, pacePct?: number | null): number {
  if (goal === "manter") return 0;
  if (goal === "ganhar") return SURPLUS_PCT;
  const p = pacePct ?? 20;
  return -clamp(p, DEFICIT_RANGE.min, DEFICIT_RANGE.max);
}

/**
 * Ingestão de manutenção: I = basal*fator + treino + 0.1*I  →  I = (basal*fator + treino)/0.9.
 * Assim TEF da própria ingestão já está incluído.
 */
export function maintenanceIntake(bmr: number, activityFactor: number, trainingKcal = 0): number {
  return (bmr * activityFactor + trainingKcal) / (1 - TEF_RATIO);
}

export function targetKcal(maintenance: number, goal: Goal, pacePct?: number | null): number {
  return maintenance * (1 + adjustPct(goal, pacePct) / 100);
}

export type Macros = { protein_g: number; fat_g: number; carbs_g: number };

/**
 * Proteína 1.6–2.2 g/kg, gordura 0.6–1.0 g/kg, carbo = restante.
 * Se não sobrar kcal para carbo, reduz gordura e depois proteína até os mínimos.
 */
export function macroTargets(
  kcal: number,
  weightKg: number,
  proteinPerKg = 1.8,
  fatPerKg = 0.8,
): Macros {
  let p = clamp(proteinPerKg, PROTEIN_RANGE.min, PROTEIN_RANGE.max) * weightKg;
  let f = clamp(fatPerKg, FAT_RANGE.min, FAT_RANGE.max) * weightKg;
  let rest = kcal - 4 * p - 9 * f;
  if (rest < 0) {
    const fMin = FAT_RANGE.min * weightKg;
    const cut = Math.min(f - fMin, -rest / 9);
    f -= cut;
    rest += cut * 9;
  }
  if (rest < 0) {
    const pMin = PROTEIN_RANGE.min * weightKg;
    const cut = Math.min(p - pMin, -rest / 4);
    p -= cut;
    rest += cut * 4;
  }
  return { protein_g: round1(p), fat_g: round1(f), carbs_g: round1(Math.max(0, rest) / 4) };
}

/** Água: 35 ml/kg + 500 ml por hora de treino. */
export function waterTargetMl(weightKg: number, trainingHours = 0): number {
  return Math.round(35 * weightKg + 500 * Math.max(0, trainingHours));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
