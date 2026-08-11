import { describe, expect, it } from "vitest";
import { prioritizeDashboard } from "./dashboardPersonalization";
import { DEFAULT_DASHBOARD_PREFERENCES, normalizeDashboardPreferences } from "./dashboardPersonalization";

const base = { focus: "strength" as const, autoPrioritize: true, isTrainingDay: false, lowReadiness: false, proteinBehind: false, waterBehind: false, zone2Behind: false };

describe("Dashboard-Priorisierung", () => {
  it("stellt Recovery bei niedriger Tagesform voran", () => {
    expect(prioritizeDashboard({ ...base, lowReadiness: true }).modules[0]).toBe("recovery");
  });
  it("stellt Training am Trainingstag voran", () => {
    expect(prioritizeDashboard({ ...base, isTrainingDay: true }).modules[0]).toBe("training");
  });
  it("berücksichtigt den Ausdauerfokus", () => {
    expect(prioritizeDashboard({ ...base, focus: "endurance", zone2Behind: true }).reasons).toContain("dein Ausdauerfokus");
  });
  it("lässt bei manueller Reihenfolge die Basisreihenfolge bestehen", () => {
    expect(prioritizeDashboard({ ...base, autoPrioritize: false }).modules).toEqual(["healthspan", "training", "recovery", "insights"]);
  });
  it("normalisiert gespeicherte Dashboard-Präferenzen defensiv", () => {
    expect(normalizeDashboardPreferences({ autoPrioritize: false, focusOverride: "endurance", hiddenModules: ["training", "invalid", "training"] })).toEqual({
      ...DEFAULT_DASHBOARD_PREFERENCES,
      autoPrioritize: false,
      focusOverride: "endurance",
      hiddenModules: ["training"],
    });
  });
});
