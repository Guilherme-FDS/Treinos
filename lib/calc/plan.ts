// Composição: perfil → metas diárias persistidas em daily_targets; dia → resumo do dashboard.

import { ageOn, basalMetabolicRate, dailyExpenditure, OCCUPATION_FACTORS, type Occupation, type Sex } from "./energy";
import { adjustPct, macroTargets, maintenanceIntake, targetKcal, waterTargetMl, type Goal } from "./targets";

export type PlanProfile = {
  sex: Sex;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  body_fat_pct?: number | null;
  occupation: Occupation;
  goal: Goal;
  pace_pct?: number | null;
  protein_g_per_kg?: number | null;
  fat_g_per_kg?: number | null;
};

export type BaseTargets = {
  weight_kg: number;
  bmr_kcal: number;
  bmr_formula: "mifflin" | "katch";
  activity_factor: number;
  maintenance_kcal: number;
  target_kcal: number;
  adjust_pct: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  water_ml: number;
};

/** Metas base (sem treino). Recalcular sempre que peso/perfil mudar. */
export function computeBaseTargets(p: PlanProfile, ref: Date = new Date()): BaseTargets {
  const age = ageOn(p.birth_date, ref);
  const bmr = basalMetabolicRate({
    sex: p.sex,
    weightKg: p.weight_kg,
    heightCm: p.height_cm,
    age,
    bodyFatPct: p.body_fat_pct,
  });
  const factor = OCCUPATION_FACTORS[p.occupation];
  const maintenance = maintenanceIntake(bmr.kcal, factor);
  const kcal = targetKcal(maintenance, p.goal, p.pace_pct);
  const macros = macroTargets(kcal, p.weight_kg, p.protein_g_per_kg ?? undefined, p.fat_g_per_kg ?? undefined);
  return {
    weight_kg: p.weight_kg,
    bmr_kcal: r1(bmr.kcal),
    bmr_formula: bmr.formula,
    activity_factor: factor,
    maintenance_kcal: r1(maintenance),
    target_kcal: r1(kcal),
    adjust_pct: adjustPct(p.goal, p.pace_pct),
    ...macros,
    water_ml: waterTargetMl(p.weight_kg),
  };
}

export type DayTotals = { kcal: number; protein: number; carbs: number; fat: number; water_ml: number };

export type DaySummary = {
  target: { kcal: number; protein_g: number; fat_g: number; carbs_g: number; water_ml: number };
  consumed: DayTotals;
  expenditure: ReturnType<typeof dailyExpenditure>;
  balance: number; // consumido - GET (negativo = déficit)
};

/**
 * Meta do dia = metas base + treino do dia: kcal extra entra com o mesmo ajuste % do objetivo
 * (dividido por 0.9 para cobrir o TEF) e vai para carboidrato; água +500 ml/h de treino.
 */
export function summarizeDay(p: {
  base: BaseTargets;
  trainingKcal: number;
  trainingHours: number;
  consumed: DayTotals;
}): DaySummary {
  const { base } = p;
  const extra = (p.trainingKcal / 0.9) * (1 + base.adjust_pct / 100);
  const expenditure = dailyExpenditure({
    bmr: base.bmr_kcal,
    activityFactor: base.activity_factor,
    trainingKcal: p.trainingKcal,
    intakeKcal: p.consumed.kcal,
  });
  return {
    target: {
      kcal: r1(base.target_kcal + extra),
      protein_g: base.protein_g,
      fat_g: base.fat_g,
      carbs_g: r1(base.carbs_g + extra / 4),
      water_ml: base.water_ml + Math.round(500 * Math.max(0, p.trainingHours)),
    },
    consumed: p.consumed,
    expenditure,
    balance: r1(p.consumed.kcal - expenditure.total),
  };
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}
