import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { csvToObjects, parseCsv } from "./csv";
import { tacoRowToFood } from "./taco";

describe("parseCsv", () => {
  it("lida com aspas e vírgulas", () => {
    expect(parseCsv('a,b\n"x, y","z ""q"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'z "q"'],
    ]);
  });
});

describe("taco.csv", () => {
  const rows = csvToObjects(readFileSync(path.join(import.meta.dirname, "../data/taco.csv"), "utf8"));
  const foods = rows.map(tacoRowToFood);

  it("tem 597 linhas", () => expect(rows).toHaveLength(597));

  it("ignora kcal NULL (Coco verde)", () => {
    const coco = rows.find((r) => r.name.startsWith("Coco, verde"));
    expect(coco).toBeDefined();
    expect(tacoRowToFood(coco!)).toBeNull();
  });

  it("mapeia campos e NULLs", () => {
    const arroz = foods.find((f) => f?.source_ref === "3")!;
    expect(arroz).toMatchObject({ name: "Arroz, tipo 1, cozido", kcal: 128, carbs: 28.1, fiber: 1.6, verified: true });
    expect(foods.filter(Boolean).every((f) => !("kcal_divergente" in f!))).toBe(true);
    expect(foods.some((f) => f && f.fiber === null)).toBe(true);
  });

  it("source_ref único", () => {
    const refs = foods.filter(Boolean).map((f) => f!.source_ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});
