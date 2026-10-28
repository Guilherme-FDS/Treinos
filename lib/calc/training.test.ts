import { describe, expect, it } from "vitest";
import {
  epley1RM,
  estimateStrengthMinutes,
  inferStrengthIntensity,
  metFor,
  setVolume,
  STRENGTH_MET,
  trainingKcal,
  type StrengthSet,
} from "./training";

const repeat = (n: number, s: StrengthSet) => Array.from({ length: n }, () => ({ ...s }));

describe("trainingKcal", () => {
  it("MET * peso * horas", () => {
    expect(trainingKcal(8, 70, 0.5)).toBe(280);
  });
  it("zero para entradas inválidas", () => {
    expect(trainingKcal(0, 70, 1)).toBe(0);
    expect(trainingKcal(5, 70, 0)).toBe(0);
  });
});

describe("inferStrengthIntensity", () => {
  it("sem séries → leve", () => {
    const r = inferStrengthIntensity([], 80);
    expect(r.intensity).toBe("light");
    expect(r.met).toBe(3.5);
  });

  it("força pesada, poucas reps e descanso longo → leve", () => {
    const sets = repeat(12, { reps: 4, loadKg: 120, restS: 240 });
    const r = inferStrengthIntensity(sets, 80, 60);
    expect(r.intensity).toBe("light");
  });

  it("hipertrofia típica (10 reps, 90 s) → moderada", () => {
    const sets = repeat(20, { reps: 10, loadKg: 40, restS: 90 });
    const r = inferStrengthIntensity(sets, 80, 60);
    expect(r.intensity).toBe("moderate");
    expect(r.met).toBeGreaterThanOrEqual(4.7);
    expect(r.met).toBeLessThanOrEqual(5.3);
  });

  it("circuito denso (15+ reps, 45 s) → vigorosa", () => {
    const sets = repeat(30, { reps: 15, loadKg: 20, restS: 45 });
    const r = inferStrengthIntensity(sets, 80, 50);
    expect(r.intensity).toBe("vigorous");
  });

  it("tonelagem enorme não passa de 6.0 MET", () => {
    const sets = repeat(30, { reps: 20, loadKg: 300, restS: 30 });
    const r = inferStrengthIntensity(sets, 60, 40);
    expect(r.met).toBeLessThanOrEqual(STRENGTH_MET.vigorous);
    expect(r.modifier).toBeLessThanOrEqual(0.3);
  });

  it("tonelagem mínima não baixa de 3.5 MET", () => {
    const sets = repeat(5, { reps: 5, loadKg: 1, restS: 300 });
    const r = inferStrengthIntensity(sets, 100, 60);
    expect(r.met).toBeGreaterThanOrEqual(STRENGTH_MET.light);
  });

  it("modificador limitado a ±0.3", () => {
    const heavy = inferStrengthIntensity(repeat(20, { reps: 10, loadKg: 200, restS: 90 }), 80, 60);
    const light = inferStrengthIntensity(repeat(20, { reps: 10, loadKg: 1, restS: 90 }), 80, 60);
    expect(heavy.modifier).toBe(0.3);
    expect(light.modifier).toBeCloseTo(-0.3, 1);
  });

  it("estima duração quando não informada", () => {
    const sets = repeat(10, { reps: 10, loadKg: 40, restS: 80 });
    expect(estimateStrengthMinutes(sets)).toBe(20);
    expect(inferStrengthIntensity(sets, 80).durationMin).toBe(20);
  });

  it("ignora séries com 0 reps", () => {
    const r = inferStrengthIntensity([{ reps: 0, loadKg: 100, restS: 60 }], 80, 10);
    expect(r.tonnageKg).toBe(0);
  });
});

describe("metFor", () => {
  it("usa nível pedido ou o mais próximo", () => {
    const e = { met_light: 3, met_moderate: 5, met_vigorous: null };
    expect(metFor(e, "moderate")).toBe(5);
    expect(metFor(e, "vigorous")).toBe(5);
    expect(metFor({ met_light: null, met_moderate: null, met_vigorous: null }, "light")).toBeNull();
  });
});

describe("volume e 1RM", () => {
  it("volume = reps * carga", () => expect(setVolume(10, 50)).toBe(500));
  it("Epley", () => {
    expect(epley1RM(1, 100)).toBe(100);
    expect(epley1RM(10, 75)).toBeCloseTo(100);
    expect(epley1RM(0, 75)).toBe(0);
  });
});
