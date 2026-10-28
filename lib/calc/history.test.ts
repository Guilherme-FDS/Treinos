import { describe, expect, it } from "vitest";
import { personalRecords, sessionStats, type HistorySet } from "./history";

const sets: HistorySet[] = [
  { workout_id: "a", performed_on: "2026-10-01", reps: 10, load_kg: 60 },
  { workout_id: "a", performed_on: "2026-10-01", reps: 8, load_kg: 70 },
  { workout_id: "b", performed_on: "2026-10-08", reps: 5, load_kg: 80 },
  { workout_id: "b", performed_on: "2026-10-08", reps: 5, load_kg: 80 },
  { workout_id: "b", performed_on: "2026-10-08", reps: 0, load_kg: 100 },
];

describe("history", () => {
  it("agrega por sessão em ordem", () => {
    const s = sessionStats(sets);
    expect(s.map((x) => x.workout_id)).toEqual(["a", "b"]);
    expect(s[0]).toMatchObject({ sets: 2, maxLoad: 70, volume: 1160 });
    expect(s[1]).toMatchObject({ sets: 2, maxLoad: 80, volume: 800 });
  });
  it("recordes ignoram séries com 0 reps", () => {
    const pr = personalRecords(sets);
    expect(pr.maxLoad).toEqual({ value: 80, reps: 5, date: "2026-10-08" });
    expect(pr.maxVolume).toEqual({ value: 1160, date: "2026-10-01" });
    expect(pr.bestE1rm).toEqual({ value: 93.3, date: "2026-10-08" });
  });
  it("vazio", () => {
    expect(personalRecords([])).toEqual({ maxLoad: null, bestE1rm: null, maxVolume: null });
  });
});
