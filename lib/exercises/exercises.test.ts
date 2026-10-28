import { describe, expect, it } from "vitest";
import { COMPENDIUM } from "./compendium";
import { stripHtml, wgerToExercise, type WgerExerciseInfo } from "./wger";

const base: WgerExerciseInfo = {
  id: 43,
  uuid: "x",
  category: { id: 9, name: "Legs" },
  muscles: [{ id: 10, name: "Quadriceps femoris" }],
  equipment: [{ id: 1, name: "Barbell" }],
  license: { short_name: "CC-BY-SA 4", url: "" },
  license_author: "BePieToday",
  images: [{ image: "https://wger.de/a.png", is_main: true }],
  translations: [
    { name: "Barbell Hack Squats", description: "<p>EN</p>", language: 2 },
    { name: "Agachamento hack com barra", description: "<p>Execute o agachamento.</p>", language: 7, license_author: "jpt" },
  ],
};

describe("wgerToExercise", () => {
  it("prefere nome em PT e traduz grupo/equipamento", () => {
    const r = wgerToExercise(base)!;
    expect(r.name).toBe("Agachamento hack com barra");
    expect(r.muscle_group).toBe("Quadríceps");
    expect(r.equipment).toBe("Barra");
    expect(r.instructions).toBe("Execute o agachamento.");
    expect(r.image_url).toBe("https://wger.de/a.png");
    expect(r.attribution).toContain("CC-BY-SA");
    expect(r.attribution).toContain("BePieToday");
    expect(r.source_ref).toBe("43");
  });
  it("cai para EN sem PT", () => {
    expect(wgerToExercise({ ...base, translations: [base.translations[0]] })!.name).toBe("Barbell Hack Squats");
  });
  it("ignora Cardio e sem nome", () => {
    expect(wgerToExercise({ ...base, category: { id: 15, name: "Cardio" } })).toBeNull();
    expect(wgerToExercise({ ...base, translations: [] })).toBeNull();
  });
  it("stripHtml", () => {
    expect(stripHtml("<ol><li>a</li><li>b</li></ol>")).toBe("• a\n• b");
  });
});

describe("COMPENDIUM", () => {
  it("slugs únicos e METs positivos", () => {
    const codes = COMPENDIUM.map((c) => c.slug);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of COMPENDIUM) {
      const mets = [c.met, c.light, c.moderate, c.vigorous].filter((m) => m != null);
      expect(mets.length).toBeGreaterThan(0);
      mets.forEach((m) => expect(m).toBeGreaterThan(0));
    }
  });
  it("musculação 3.5/5.0/6.0", () => {
    const m = COMPENDIUM.find((c) => c.code === "02050")!;
    expect([m.light, m.moderate, m.vigorous]).toEqual([3.5, 5.0, 6.0]);
  });
});
