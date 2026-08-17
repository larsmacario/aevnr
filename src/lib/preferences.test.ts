import { describe, expect, it } from "vitest";
import { hasCurrentOnboarding, legacyFitnessGoalForFocus, mergePreferences, normalizeExpressPerformanceBaseline } from "./preferences";

describe("normalizeExpressPerformanceBaseline", () => {
  it("keeps concrete values, levels and unavailable pull-ups", () => {
    expect(normalizeExpressPerformanceBaseline({
      version: 1,
      updatedAt: "2026-08-10T10:00:00.000Z",
      pushUps: { value: 18 },
      pullUps: { unavailable: true },
      bodyweightSquats: { level: "intermediate" },
      sixMinuteDistanceM: { skipped: true },
    })).toEqual({
      version: 1,
      updatedAt: "2026-08-10T10:00:00.000Z",
      pushUps: { value: 18 },
      pullUps: { unavailable: true },
      bodyweightSquats: { level: "intermediate" },
      sixMinuteDistanceM: { skipped: true },
    });
  });

  it("rejects invalid versions, dates and out-of-range values", () => {
    expect(normalizeExpressPerformanceBaseline({ version: 2, updatedAt: "today" })).toBeNull();
    expect(normalizeExpressPerformanceBaseline({ version: 1, updatedAt: "" })).toBeNull();
    expect(normalizeExpressPerformanceBaseline({
      version: 1,
      updatedAt: "2026-08-10T10:00:00.000Z",
      pushUps: { value: 501 },
    })?.pushUps).toBeUndefined();
  });
});

describe("ÆVNR-Onboarding", () => {
  it("fordert Bestandskonten ohne aktuelle Onboarding-Version erneut zum Onboarding auf", () => {
    expect(hasCurrentOnboarding(mergePreferences({ onboarded: true } as never))).toBe(false);
    expect(hasCurrentOnboarding(mergePreferences({ onboardingVersion: 2 } as never))).toBe(false);
    expect(hasCurrentOnboarding(mergePreferences({ onboardingVersion: 3 } as never))).toBe(true);
  });

  it("normalisiert nur gültige neue Fokusse und ordnet sie der Legacy-Logik zu", () => {
    expect(mergePreferences({ primaryFocus: "endurance", secondaryFocus: "invalid" } as never)).toMatchObject({ primaryFocus: "endurance", secondaryFocus: null });
    expect(legacyFitnessGoalForFocus("strength")).toBe("strength");
    expect(legacyFitnessGoalForFocus("endurance")).toBe("fitness");
    expect(legacyFitnessGoalForFocus("energy")).toBe("fitness");
    expect(legacyFitnessGoalForFocus("body_composition")).toBe("fat_loss");
  });
});

describe("language preference", () => {
  it("keeps supported languages and rejects unsupported profile values", () => {
    expect(mergePreferences({ language: "en" } as never).language).toBe("en");
    expect(mergePreferences({ language: "de-DE" } as never).language).toBe("de");
    expect(["de", "en"]).toContain(mergePreferences({ language: "fr" } as never).language);
  });
});
