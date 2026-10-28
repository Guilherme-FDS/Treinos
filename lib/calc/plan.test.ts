import { describe, expect, it } from "vitest";
import { computeBaseTargets, summarizeDay } from "./plan";

const profile = {
  sex: "M" as const,
  birth_date: "1996-01-15",
  height_cm: 180,
  weight_kg: 80,
  occupation: "escritorio" as const,
  goal: "emagrecer" as const,
  pace_pct: 20,
  protein_g_per_kg: 2,
  fat_g_per_kg: 0.8,
};
const ref = new Date("2026-10-28T12:00:00Z"); // 30 anos

describe("computeBaseTargets", () => {
  it("monta metas base", () => {
    const t = computeBaseTargets(profile, ref);
    expect(t.bmr_kcal).toBe(1780);
    expect(t.bmr_formula).toBe("mifflin");
    expect(t.activity_factor).toBe(1.2);
    expect(t.maintenance_kcal).toBeCloseTo(2373.3, 1);
    expect(t.target_kcal).toBeCloseTo(1898.7, 1);
    expect(t.adjust_pct).toBe(-20);
    expect(t.protein_g).toBe(160);
    expect(t.fat_g).toBe(64);
    expect(t.water_ml).toBe(2800);
  });
  it("recalcula com novo peso", () => {
    const a = computeBaseTargets(profile, ref);
    const b = computeBaseTargets({ ...profile, weight_kg: 75 }, ref);
    expect(b.bmr_kcal).toBe(a.bmr_kcal - 50);
    expect(b.water_ml).toBe(2625);
    expect(b.protein_g).toBe(150);
  });
  it("Katch com %gordura", () => {
    expect(computeBaseTargets({ ...profile, body_fat_pct: 20 }, ref).bmr_formula).toBe("katch");
  });
});

describe("summarizeDay", () => {
  it("soma treino na meta, água e GET", () => {
    const base = computeBaseTargets({ ...profile, goal: "manter" }, ref);
    const s = summarizeDay({
      base,
      trainingKcal: 360,
      trainingHours: 1,
      consumed: { kcal: 2500, protein: 150, carbs: 250, fat: 70, water_ml: 2000 },
    });
    expect(s.target.kcal).toBeCloseTo(base.target_kcal + 400, 0);
    expect(s.target.carbs_g).toBeCloseTo(base.carbs_g + 100, 0);
    expect(s.target.water_ml).toBe(3300);
    expect(s.expenditure.total).toBeCloseTo(1780 * 1.2 + 360 + 250);
    expect(s.balance).toBeCloseTo(2500 - (1780 * 1.2 + 360 + 250), 0);
  });
  it("sem treino mantém metas base", () => {
    const base = computeBaseTargets(profile, ref);
    const s = summarizeDay({
      base,
      trainingKcal: 0,
      trainingHours: 0,
      consumed: { kcal: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 },
    });
    expect(s.target.kcal).toBe(base.target_kcal);
    expect(s.target.water_ml).toBe(base.water_ml);
  });
});
