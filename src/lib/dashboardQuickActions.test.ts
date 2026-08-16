import { describe, expect, it } from "vitest";
import { selectDashboardQuickActions } from "./dashboardQuickActions";

describe("personalisierte Dashboard-Schnellaktionen", () => {
  it("priorisiert Kraft-Aktionen", () => {
    expect(selectDashboardQuickActions({ primaryFocus: "strength", secondaryFocus: null, hasPlan: true })).toEqual(["plans", "calculator", "recovery", "timer"]);
  });
  it("priorisiert Ausdauer-Aktionen", () => {
    expect(selectDashboardQuickActions({ primaryFocus: "endurance", secondaryFocus: null, hasPlan: false })).toEqual(["timer", "breathing", "recovery"]);
  });
  it("priorisiert Energie- und Körper-Aktionen", () => {
    expect(selectDashboardQuickActions({ primaryFocus: "energy", secondaryFocus: null, hasPlan: false })).toEqual(["breathing", "recovery", "timer"]);
    expect(selectDashboardQuickActions({ primaryFocus: "body_composition", secondaryFocus: null, hasPlan: false })).toEqual(["body", "recovery", "plans", "calculator"]);
  });
  it("nutzt ohne Fokus ein kuratiertes Set und ergänzt mit Plan", () => {
    expect(selectDashboardQuickActions({ primaryFocus: null, secondaryFocus: null, hasPlan: false })).toEqual(["recovery", "breathing", "timer"]);
    expect(selectDashboardQuickActions({ primaryFocus: null, secondaryFocus: null, hasPlan: true })).toEqual(["plans", "recovery", "breathing", "timer"]);
  });
});
