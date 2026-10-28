// Gasto energético: basal, fator ocupacional (NEAT), TEF e GET diário.

export type Sex = "M" | "F";
export type Occupation = "escritorio" | "em_pe_leve" | "moderado" | "bracal" | "bracal_pesado";

/** Fator ocupacional (NEAT, sem treino). */
export const OCCUPATION_FACTORS: Record<Occupation, number> = {
  escritorio: 1.2,
  em_pe_leve: 1.375,
  moderado: 1.55,
  bracal: 1.725,
  bracal_pesado: 1.9,
};

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  escritorio: "Escritório / sentado",
  em_pe_leve: "Em pé, leve",
  moderado: "Moderado",
  bracal: "Braçal",
  bracal_pesado: "Braçal pesado",
};

export const TEF_RATIO = 0.1;

/** Idade em anos completos na data de referência. */
export function ageOn(birthDate: string | Date, ref: Date = new Date()): number {
  const b = typeof birthDate === "string" ? new Date(`${birthDate}T00:00:00Z`) : birthDate;
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  const m = ref.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** Mifflin-St Jeor: 10*peso + 6.25*altura - 5*idade + 5 (H) / -161 (M). */
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "M" ? 5 : -161);
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

/** Katch-McArdle: 370 + 21.6 * massa magra (kg). */
export function katchMcArdle(leanKg: number): number {
  return 370 + 21.6 * leanKg;
}

export type BmrInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  bodyFatPct?: number | null;
};

/** Usa Katch-McArdle quando %gordura é informado; senão Mifflin-St Jeor. */
export function basalMetabolicRate(i: BmrInput): { kcal: number; formula: "mifflin" | "katch" } {
  if (i.bodyFatPct != null && i.bodyFatPct > 0) {
    return { kcal: katchMcArdle(leanMassKg(i.weightKg, i.bodyFatPct)), formula: "katch" };
  }
  return { kcal: mifflinStJeor(i.sex, i.weightKg, i.heightCm, i.age), formula: "mifflin" };
}

/** TEF = 10% das kcal ingeridas. */
export function thermicEffectOfFood(intakeKcal: number): number {
  return Math.max(0, intakeKcal) * TEF_RATIO;
}

export type DailyExpenditure = {
  bmr: number;
  neat: number; // basal*(fator-1)
  training: number;
  tef: number;
  total: number; // basal*fator + treinos + TEF
};

/** GET diário = basal*fator + treinos do dia + TEF. */
export function dailyExpenditure(p: {
  bmr: number;
  activityFactor: number;
  trainingKcal: number;
  intakeKcal: number;
}): DailyExpenditure {
  const base = p.bmr * p.activityFactor;
  const tef = thermicEffectOfFood(p.intakeKcal);
  return {
    bmr: p.bmr,
    neat: base - p.bmr,
    training: p.trainingKcal,
    tef,
    total: base + p.trainingKcal + tef,
  };
}
