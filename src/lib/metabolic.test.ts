import { describe, expect, it } from "vitest";
import { buildMetabolicWeekSummary, normalizeMetabolicLog, type MetabolicLog } from "./metabolic";

function log(id: string, date: Date, overrides: Partial<MetabolicLog> = {}): MetabolicLog {
  return {
    id,
    userId: "user-1",
    loggedAt: date.toISOString(),
    mealQuality: "balanced",
    energyLevel: 6,
    satietyLevel: 7,
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
    ...overrides,
  };
}

describe("Stoffwechsel-Rhythmus", () => {
  it("normalisiert Kontextdaten ohne klinische Messwerte", () => {
    const result = normalizeMetabolicLog({
      loggedAt: "invalid",
      mealQuality: "carb_focused",
      energyLevel: 12.4,
      satietyLevel: -1,
      note: `  ${"x".repeat(510)}  `,
    });
    expect(result.mealQuality).toBe("carb_focused");
    expect(result.energyLevel).toBe(10);
    expect(result.satietyLevel).toBe(1);
    expect(result.note).toHaveLength(500);
    expect(Number.isNaN(new Date(result.loggedAt!).getTime())).toBe(false);
  });

  it("bildet beschreibende Tageszeit- und Trainingstagsmuster", () => {
    const trainingDate = new Date(2026, 7, 12, 8);
    const summary = buildMetabolicWeekSummary([
      log("1", trainingDate, { energyLevel: 8, satietyLevel: 7 }),
      log("2", new Date(2026, 7, 12, 13), { mealQuality: "light", energyLevel: 6, satietyLevel: 5 }),
      log("3", new Date(2026, 7, 13, 19), { mealQuality: "carb_focused", energyLevel: 5, satietyLevel: 8 }),
    ], new Set(["2026-08-12"]));

    expect(summary.count).toBe(3);
    expect(summary.progress).toBeCloseTo(3 / 7);
    expect(summary.energyLevel).toBeCloseTo(6.3);
    expect(summary.timePatterns.map((pattern) => pattern.label)).toEqual(["Morgen", "Mittag", "Abend"]);
    expect(summary.trainingDay).toEqual({ count: 2, energyLevel: 7, satietyLevel: 6 });
    expect(summary.restDay).toEqual({ count: 1, energyLevel: 5, satietyLevel: 8 });
  });

  it("bleibt ohne Einträge neutral", () => {
    expect(buildMetabolicWeekSummary([], new Set())).toEqual({ count: 0, progress: 0, timePatterns: [] });
  });
});
