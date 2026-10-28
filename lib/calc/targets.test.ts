import { describe, expect, it } from "vitest";
import { adjustPct, macroTargets, maintenanceIntake, targetKcal, waterTargetMl } from "./targets";

describe("adjustPct", () => {
  it("emagrecer: déficit 15–25%", () => {
    expect(adjustPct("emagrecer", 20)).toBe(-20);
    expect(adjustPct("emagrecer", 5)).toBe(-15);
    expect(adjustPct("emagrecer", 40)).toBe(-25);
    expect(adjustPct("emagrecer", null)).toBe(-20);
  });
  it("manter 0, ganhar +10", () => {
    expect(adjustPct("manter", 20)).toBe(0);
    expect(adjustPct("ganhar", 25)).toBe(10);
  });
});

describe("maintenanceIntake / targetKcal", () => {
  it("inclui TEF: I = basal*fator/0.9", () => {
    const i = maintenanceIntake(1800, 1.2);
    expect(i).toBeCloseTo(2400);
    // GET com essa ingestão fecha o balanço
    expect(1800 * 1.2 + 0.1 * i).toBeCloseTo(i);
  });
  it("soma treino", () => expect(maintenanceIntake(1800, 1.2, 270)).toBeCloseTo(2700));
  it("aplica objetivo", () => {
    expect(targetKcal(2400, "emagrecer", 20)).toBeCloseTo(1920);
    expect(targetKcal(2400, "manter")).toBe(2400);
    expect(targetKcal(2400, "ganhar")).toBeCloseTo(2640);
  });
});

describe("macroTargets", () => {
  it("proteína e gordura por kg, carbo restante", () => {
    const m = macroTargets(2400, 80, 2.0, 0.8);
    expect(m.protein_g).toBe(160);
    expect(m.fat_g).toBe(64);
    expect(m.carbs_g).toBeCloseTo((2400 - 640 - 576) / 4, 1);
  });
  it("limita g/kg às faixas", () => {
    const m = macroTargets(3000, 80, 3, 2);
    expect(m.protein_g).toBe(176);
    expect(m.fat_g).toBe(80);
  });
  it("kcal baixa: corta gordura e proteína até o mínimo, carbo >= 0", () => {
    const m = macroTargets(800, 100, 2.2, 1.0);
    expect(m.fat_g).toBe(60);
    expect(m.protein_g).toBe(160);
    expect(m.carbs_g).toBe(0);
  });
  it("corta só gordura quando basta", () => {
    const m = macroTargets(1500, 100, 2.0, 1.0); // 800 P + 900 G > 1500
    expect(m.protein_g).toBe(200);
    expect(m.fat_g).toBeCloseTo(77.8, 1);
    expect(m.carbs_g).toBe(0);
  });
});

describe("waterTargetMl", () => {
  it("35 ml/kg + 500 ml/h treino", () => {
    expect(waterTargetMl(80)).toBe(2800);
    expect(waterTargetMl(80, 1.5)).toBe(3550);
    expect(waterTargetMl(80, -1)).toBe(2800);
  });
});
