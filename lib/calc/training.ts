// Gasto de treino: MET * peso * horas. Musculação com intensidade inferida.

export type Intensity = "light" | "moderate" | "vigorous";

/** MET base de musculação (Compendium 2024: 02050/02052/02054). */
export const STRENGTH_MET: Record<Intensity, number> = {
  light: 3.5,
  moderate: 5.0,
  vigorous: 6.0,
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "Leve",
  moderate: "Moderada",
  vigorous: "Vigorosa",
};

/** kcal = MET * peso(kg) * horas. */
export function trainingKcal(met: number, weightKg: number, hours: number): number {
  if (met <= 0 || weightKg <= 0 || hours <= 0) return 0;
  return met * weightKg * hours;
}

export type StrengthSet = { reps: number; loadKg: number; restS?: number | null };

export type StrengthInference = {
  intensity: Intensity;
  met: number;
  score: number;
  tonnageKg: number;
  modifier: number;
  durationMin: number;
};

const WORK_S_PER_SET = 40;
const DEFAULT_REST_S = 90;
const MAX_MODIFIER = 0.3;
// Referência de tonelagem: kg movidos por kg corporal por minuto de sessão típica moderada
const REF_TONNAGE_PER_KG_MIN = 1.5;

/** Duração estimada quando o treino não foi cronometrado. */
export function estimateStrengthMinutes(sets: StrengthSet[]): number {
  const s = sets.reduce((acc, x) => acc + WORK_S_PER_SET + (x.restS ?? DEFAULT_REST_S), 0);
  return s / 60;
}

/**
 * Infere intensidade de musculação por séries, reps, descanso e densidade.
 * Tonelagem relativa é só um modificador limitado (±0.3 MET) e o MET final
 * fica preso entre leve (3.5) e vigorosa (6.0) para não superestimar.
 */
export function inferStrengthIntensity(
  sets: StrengthSet[],
  bodyWeightKg: number,
  durationMin?: number | null,
): StrengthInference {
  const done = sets.filter((s) => s.reps > 0);
  const minutes = durationMin && durationMin > 0 ? durationMin : estimateStrengthMinutes(done);
  const tonnageKg = done.reduce((a, s) => a + s.reps * Math.max(0, s.loadKg), 0);
  if (done.length === 0 || minutes <= 0) {
    return { intensity: "light", met: STRENGTH_MET.light, score: 0, tonnageKg: 0, modifier: 0, durationMin: minutes };
  }

  const rests = done.map((s) => s.restS).filter((r): r is number => r != null && r >= 0);
  const avgRest = rests.length ? rests.reduce((a, r) => a + r, 0) / rests.length : DEFAULT_REST_S;
  const avgReps = done.reduce((a, s) => a + s.reps, 0) / done.length;
  const setsPerHour = (done.length / minutes) * 60;

  let score = 0;
  // Descanso curto = maior densidade metabólica
  if (avgRest <= 60) score += 1;
  else if (avgRest <= 120) score += 0.5;
  else if (avgRest > 180) score -= 0.5;
  // Faixa de reps
  if (avgReps >= 15) score += 1;
  else if (avgReps >= 6) score += 0.5;
  // Volume por hora
  if (setsPerHour >= 25) score += 0.5;
  else if (setsPerHour < 12) score -= 0.5;

  const intensity: Intensity = score >= 2 ? "vigorous" : score >= 1 ? "moderate" : "light";

  let modifier = 0;
  if (bodyWeightKg > 0) {
    const rel = tonnageKg / (bodyWeightKg * minutes);
    modifier = ((rel - REF_TONNAGE_PER_KG_MIN) / REF_TONNAGE_PER_KG_MIN) * MAX_MODIFIER;
    modifier = Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, modifier));
  }
  const met = Math.max(STRENGTH_MET.light, Math.min(STRENGTH_MET.vigorous, STRENGTH_MET[intensity] + modifier));

  return { intensity, met: round1(met), score, tonnageKg, modifier, durationMin: minutes };
}

/** MET de um exercício pela intensidade, com fallback para o nível disponível mais próximo. */
export function metFor(
  e: { met_light?: number | null; met_moderate?: number | null; met_vigorous?: number | null },
  intensity: Intensity,
): number | null {
  const order: Record<Intensity, (number | null | undefined)[]> = {
    light: [e.met_light, e.met_moderate, e.met_vigorous],
    moderate: [e.met_moderate, e.met_light, e.met_vigorous],
    vigorous: [e.met_vigorous, e.met_moderate, e.met_light],
  };
  return order[intensity].find((m) => m != null && m > 0) ?? null;
}

/** Volume (tonelagem) e estimativa de 1RM (Epley) para histórico/recordes. */
export function setVolume(reps: number, loadKg: number): number {
  return Math.max(0, reps) * Math.max(0, loadKg);
}

export function epley1RM(reps: number, loadKg: number): number {
  if (reps <= 0 || loadKg <= 0) return 0;
  if (reps === 1) return loadKg;
  return loadKg * (1 + reps / 30);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
