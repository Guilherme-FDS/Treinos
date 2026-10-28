import { describe, expect, it } from "vitest";
import { checkKcal, estimateKcal, scaleNutrients, sumNutrients, type FoodLike } from "./nutrition";

const arroz: FoodLike = {
  base_g: 100,
  kcal: 128,
  protein: 2.5,
  carbs: 28.1,
  fat: 0.2,
  fiber: 1.6,
  sodium_mg: 1,
  source: "taco",
};

describe("scaleNutrients", () => {
  it("escala por gramas", () => {
    const n = scaleNutrients(arroz, 150);
    expect(n.kcal).toBe(192);
    expect(n.protein).toBe(3.75);
    expect(n.sodium_mg).toBe(1.5);
  });
  it("mantém nulos", () => {
    expect(scaleNutrients({ ...arroz, fiber: null }, 50).fiber).toBeNull();
  });
  it("respeita base_g diferente de 100", () => {
    expect(scaleNutrients({ ...arroz, base_g: 50 }, 50).kcal).toBe(128);
  });
});

describe("sumNutrients", () => {
  it("soma tratando nulos como 0", () => {
    const s = sumNutrients([
      { kcal: 100, protein: 10, carbs: null, fat: 1 },
      { kcal: 50.25, protein: 2, carbs: 5, fat: null },
    ]);
    expect(s.kcal).toBe(150.3);
    expect(s.protein).toBe(12);
    expect(s.carbs).toBe(5);
  });
});

describe("estimateKcal / checkKcal", () => {
  it("4P + 4(C-fibra) + 2fibra + 9G", () => {
    expect(estimateKcal({ protein: 10, carbs: 20, fat: 5, fiber: 4 })).toBe(40 + 64 + 8 + 45);
  });
  it("fibra maior que carbo não gera carbo negativo", () => {
    expect(estimateKcal({ protein: 0, carbs: 2, fat: 0, fiber: 5 })).toBe(4);
  });
  it("coerente → ok", () => {
    const c = checkKcal({ ...arroz, source: "off" });
    expect(c.suspect).toBe(false);
  });
  it("divergência > 15% → suspeito", () => {
    const c = checkKcal({ ...arroz, kcal: 300, source: "off" });
    expect(c.suspect).toBe(true);
    expect(c.divergence).toBeGreaterThan(0.15);
  });
  it("nunca marca TACO", () => {
    expect(checkKcal({ ...arroz, kcal: 300 }).suspect).toBe(false);
  });
  it("ignora diferenças absolutas pequenas", () => {
    expect(
      checkKcal({ base_g: 100, kcal: 4, protein: 0.5, carbs: 0.5, fat: 0.3, fiber: 0, sodium_mg: 0, source: "manual" })
        .suspect,
    ).toBe(false);
  });
  it("sem macros não é suspeito", () => {
    expect(
      checkKcal({ base_g: 100, kcal: 200, protein: null, carbs: null, fat: null, fiber: null, sodium_mg: null, source: "off" })
        .suspect,
    ).toBe(false);
  });
});
