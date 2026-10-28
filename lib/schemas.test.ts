import { describe, expect, it } from "vitest";
import { foodSchema, formToObject, profileSchema, templateItemSchema } from "./schemas";

describe("schemas", () => {
  it("perfil: déficit fora da faixa", () => {
    const r = profileSchema.safeParse({
      sex: "M", birth_date: "1990-01-01", height_cm: "180", weight_kg: "80",
      occupation: "escritorio", goal: "emagrecer", pace_pct: "30",
    });
    expect(r.success).toBe(false);
  });
  it("perfil: %gordura vazio vira null", () => {
    const r = profileSchema.parse({
      sex: "F", birth_date: "1990-01-01", height_cm: "165", weight_kg: "60", body_fat_pct: "",
      occupation: "moderado", goal: "manter", pace_pct: "0",
    });
    expect(r.body_fat_pct).toBeNull();
    expect(r.protein_g_per_kg).toBe(1.8);
  });
  it("alimento: fibra > carbo", () => {
    expect(foodSchema.safeParse({ name: "x", kcal: "10", carbs: "2", fiber: "5", barcode: "" }).success).toBe(false);
  });
  it("alimento: barcode inválido", () => {
    expect(foodSchema.safeParse({ name: "x", kcal: "10", barcode: "abc" }).success).toBe(false);
  });
  it("item de ficha: faixa de reps", () => {
    const base = { exercise_id: "7f3e2a1c-1111-4222-8333-444455556666", sets: 3, method: "normal" };
    expect(templateItemSchema.safeParse({ ...base, reps_min: 12, reps_max: 8 }).success).toBe(false);
    expect(templateItemSchema.safeParse({ ...base, reps_min: 8, reps_max: 12 }).success).toBe(true);
  });
  it("formToObject agrupa arrays", () => {
    const fd = new FormData();
    fd.append("weekdays[]", "1");
    fd.append("weekdays[]", "3");
    fd.append("name", "A");
    fd.append("$ACTION_ID", "x");
    expect(formToObject(fd)).toEqual({ weekdays: ["1", "3"], name: "A" });
  });
});
