import { describe, expect, it } from "vitest";
import type { LibraryPlan } from "../data";
import { DEFAULT_PREFERENCES } from "./preferences";
import { resolveProteinTargetG, resolveWaterTargetMl } from "./recoveryTarget";

function planWithWater(waterMl: number): LibraryPlan {
  return {
    summary: { nutrition: { water_ml: waterMl } },
  } as LibraryPlan;
}

describe("resolveWaterTargetMl", () => {
  it("priorisiert persönliche Einstellung vor Plan und Profil", () => {
    const result = resolveWaterTargetMl({
      activePlan: planWithWater(3200),
      preferences: { ...DEFAULT_PREFERENCES, waterTargetMl: 2750 },
      latestMeasurement: { weightKg: 90 } as never,
    });
    expect(result).toMatchObject({ waterTargetMl: 2750, waterSource: "preference" });
  });

  it("verwendet anschließend das Planziel", () => {
    const result = resolveWaterTargetMl({
      activePlan: planWithWater(3200),
      preferences: DEFAULT_PREFERENCES,
      latestMeasurement: { weightKg: 90 } as never,
    });
    expect(result).toMatchObject({ waterTargetMl: 3200, waterSource: "plan" });
  });

  it("berechnet ohne Plan aus Gewicht und Aktivität", () => {
    const result = resolveWaterTargetMl({
      activePlan: null,
      preferences: { ...DEFAULT_PREFERENCES, weeklyDays: 4, experienceLevel: "intermediate" },
      latestMeasurement: { weightKg: 80 } as never,
    });
    expect(result.waterSource).toBe("profile");
    expect(result.waterTargetMl).toBeGreaterThanOrEqual(2500);
  });

  it("fällt ohne verwertbare Daten auf 2500 ml zurück", () => {
    expect(
      resolveWaterTargetMl({
        activePlan: null,
        preferences: DEFAULT_PREFERENCES,
        latestMeasurement: null,
      }),
    ).toEqual({ waterTargetMl: 2500, waterSource: "fallback", waterNeedsWeightHint: true });
  });
});

describe("resolveProteinTargetG", () => {
  const bodyPreferences = {
    ...DEFAULT_PREFERENCES,
    proteinTargetMode: "body" as const,
    heightCm: 180,
    fitnessGoal: "strength" as const,
  };

  it("verwendet im Plan-Modus das Ziel des aktiven Plans", () => {
    const result = resolveProteinTargetG({
      activePlan: { summary: { nutrition: { protein_g: 180 } } } as LibraryPlan,
      preferences: DEFAULT_PREFERENCES,
      latestMeasurement: { weightKg: 80 } as never,
    });
    expect(result).toMatchObject({ proteinTargetG: 180, source: "plan" });
  });

  it("ignoriert im Körperwerte-Modus den Plan", () => {
    const result = resolveProteinTargetG({
      activePlan: { summary: { nutrition: { protein_g: 180 } } } as LibraryPlan,
      preferences: bodyPreferences,
      latestMeasurement: { weightKg: 80 } as never,
    });
    expect(result).toMatchObject({ proteinTargetG: 160, source: "profile" });
  });

  it("verwendet im manuellen Modus die eigene Vorgabe", () => {
    const result = resolveProteinTargetG({
      activePlan: { summary: { nutrition: { protein_g: 180 } } } as LibraryPlan,
      preferences: { ...DEFAULT_PREFERENCES, proteinTargetMode: "manual", proteinTargetG: 155 },
      latestMeasurement: { weightKg: 80 } as never,
    });
    expect(result).toMatchObject({ proteinTargetG: 155, source: "manual" });
  });
});
