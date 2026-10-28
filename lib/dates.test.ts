import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, localDate, weekdayOf } from "./dates";

describe("dates", () => {
  it("localDate usa fuso de SP", () => {
    expect(localDate(new Date("2026-10-28T02:00:00Z"))).toBe("2026-10-27");
    expect(localDate(new Date("2026-10-28T15:00:00Z"))).toBe("2026-10-28");
  });
  it("addDays atravessa mês", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("isIsoDate", () => {
    expect(isIsoDate("2026-10-28")).toBe(true);
    expect(isIsoDate("28/10/2026")).toBe(false);
  });
  it("weekdayOf", () => expect(weekdayOf("2026-10-28")).toBe(3));
});
