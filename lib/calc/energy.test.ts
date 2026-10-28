import { describe, expect, it } from "vitest";
import {
  ageOn,
  basalMetabolicRate,
  dailyExpenditure,
  katchMcArdle,
  leanMassKg,
  mifflinStJeor,
  OCCUPATION_FACTORS,
  thermicEffectOfFood,
} from "./energy";

describe("ageOn", () => {
  it("conta anos completos", () => {
    expect(ageOn("1996-10-28", new Date("2026-10-28T12:00:00Z"))).toBe(30);
    expect(ageOn("1996-10-29", new Date("2026-10-28T12:00:00Z"))).toBe(29);
    expect(ageOn("1996-11-01", new Date("2026-10-28T12:00:00Z"))).toBe(29);
  });
});

describe("Mifflin-St Jeor", () => {
  it("homem", () => expect(mifflinStJeor("M", 80, 180, 30)).toBe(1780));
  it("mulher", () => expect(mifflinStJeor("F", 60, 165, 25)).toBeCloseTo(1345.25));
});

describe("Katch-McArdle", () => {
  it("usa massa magra", () => {
    expect(leanMassKg(80, 20)).toBe(64);
    expect(katchMcArdle(64)).toBeCloseTo(1752.4);
  });
});

describe("basalMetabolicRate", () => {
  it("Mifflin sem %gordura", () => {
    expect(basalMetabolicRate({ sex: "M", weightKg: 80, heightCm: 180, age: 30 })).toEqual({
      kcal: 1780,
      formula: "mifflin",
    });
  });
  it("Katch com %gordura", () => {
    const r = basalMetabolicRate({ sex: "M", weightKg: 80, heightCm: 180, age: 30, bodyFatPct: 20 });
    expect(r.formula).toBe("katch");
    expect(r.kcal).toBeCloseTo(1752.4);
  });
  it("ignora %gordura nulo/zero", () => {
    expect(basalMetabolicRate({ sex: "F", weightKg: 60, heightCm: 165, age: 25, bodyFatPct: null }).formula).toBe(
      "mifflin",
    );
    expect(basalMetabolicRate({ sex: "F", weightKg: 60, heightCm: 165, age: 25, bodyFatPct: 0 }).formula).toBe(
      "mifflin",
    );
  });
});

describe("fatores ocupacionais", () => {
  it("valores da especificação", () => {
    expect(OCCUPATION_FACTORS).toEqual({
      escritorio: 1.2,
      em_pe_leve: 1.375,
      moderado: 1.55,
      bracal: 1.725,
      bracal_pesado: 1.9,
    });
  });
});

describe("TEF e GET", () => {
  it("TEF = 10% da ingestão, nunca negativo", () => {
    expect(thermicEffectOfFood(2000)).toBe(200);
    expect(thermicEffectOfFood(-5)).toBe(0);
  });
  it("GET = basal*fator + treino + TEF", () => {
    const g = dailyExpenditure({ bmr: 1780, activityFactor: 1.2, trainingKcal: 300, intakeKcal: 2000 });
    expect(g.neat).toBeCloseTo(356);
    expect(g.tef).toBe(200);
    expect(g.total).toBeCloseTo(1780 * 1.2 + 300 + 200);
  });
});
