import { describe, expect, it } from "vitest";
import { offToFood } from "./off";

const moca = {
  code: "7891000100103",
  product_name_pt: "Leite Condensado Integral moça",
  brands: ["Nestlé", "Moça"],
  nutriments: { "energy-kcal_100g": 325, carbohydrates_100g: 55, fat_100g: 8, fiber_100g: 0, proteins_100g: 7, sodium_100g: 0.112 },
  serving_quantity: "20",
  serving_size: "20 g (1 colher de sopa)",
};

describe("offToFood", () => {
  it("normaliza por 100 g", () => {
    const f = offToFood(moca)!;
    expect(f).toMatchObject({
      name: "Leite Condensado Integral moça",
      brand: "Nestlé, Moça",
      barcode: "7891000100103",
      kcal: 325,
      protein: 7,
      sodium_mg: 112,
      serving_g: 20,
      source: "off",
      verified: false,
      source_ref: "7891000100103",
    });
  });
  it("converte kJ e sal", () => {
    const f = offToFood({ product_name: "X", nutriments: { "energy-kj_100g": 418.4, salt_100g: 1 } })!;
    expect(f.kcal).toBe(100);
    expect(f.sodium_mg).toBe(400);
    expect(f.barcode).toBeNull();
  });
  it("descarta dados impossíveis", () => {
    expect(
      offToFood({ product_name: "Quebrado", nutriments: { "energy-kcal_100g": 1520, carbohydrates_100g: 295, proteins_100g: 40 } }),
    ).toBeNull();
  });
  it("descarta sem nome ou energia", () => {
    expect(offToFood({ nutriments: { "energy-kcal_100g": 1 } })).toBeNull();
    expect(offToFood({ product_name: "Y", nutriments: {} })).toBeNull();
  });
});
