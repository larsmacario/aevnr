import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHealthspanDomains, checkinFingerprint, findCheckinForDate, getTrainingReadiness, normalizeDailyCheckin, normalizeDailyHealthspanRecommendation, recommendHealthspanAction } from "./healthspan";

const baseline = { completedStrengthDays: 2, strengthTargetDays: 3, zone2Minutes: 120, proteinG: 120, proteinTargetG: 140, waterMl: 2400, waterTargetMl: 2800, checkins: [{ sleepHours: 7.5, sleepQuality: 4, stressLevel: 4, energyLevel: 4 }] };

describe("healthspan", () => {
  afterEach(() => vi.useRealTimers());
  it("verwendet für neue Check-ins das lokale Tagesdatum statt UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 11, 0, 5));
    expect(normalizeDailyCheckin({ sleepHours: 7, sleepQuality: 6, stressLevel: 5, energyLevel: 6 }).checkinDate).toBe("2026-08-11");
  });
  it("wertet einen Check-in nur am passenden lokalen Kalendertag aus", () => {
    const yesterday = { checkinDate: "2026-08-10", sleepHours: 7 };
    const today = { checkinDate: "2026-08-11", sleepHours: 8 };
    expect(findCheckinForDate([yesterday], "2026-08-11")).toBeUndefined();
    expect(findCheckinForDate([yesterday, today], "2026-08-11")).toBe(today);
  });
  it("normalisiert Check-in-Werte sicher", () => expect(normalizeDailyCheckin({ sleepHours: 30, sleepQuality: 0, stressLevel: 12, energyLevel: 0, note: " x " })).toMatchObject({ sleepHours: 24, sleepQuality: 1, stressLevel: 10, energyLevel: 1, note: "x" }));
  it("macht niedrige Belastbarkeit zur konkreten Express-Aktion", () => expect(recommendHealthspanAction({ ...baseline, checkins: [{ sleepHours: 5, sleepQuality: 4, stressLevel: 8, energyLevel: 4 }] }).action).toBe("reduce"));
  it("stellt Recovery-Signale vor den persönlichen Fokus", () => expect(recommendHealthspanAction({ ...baseline, primaryFocus: "strength", checkins: [{ sleepHours: 5, sleepQuality: 6, stressLevel: 4, energyLevel: 8 }] }).action).toBe("reduce"));
  it("leitet für jeden ÆVNR-Hauptfokus eine konkrete nächste Aktion ab", () => {
    const ready = { ...baseline, proteinG: 140, waterMl: 2800, checkins: [{ sleepHours: 7.5, sleepQuality: 7, stressLevel: 4, energyLevel: 8 }] };
    expect(recommendHealthspanAction({ ...ready, primaryFocus: "strength" }).action).toBe("strength");
    expect(recommendHealthspanAction({ ...ready, primaryFocus: "endurance" }).action).toBe("endurance");
    expect(recommendHealthspanAction({ ...ready, primaryFocus: "energy" }).action).toBe("recover");
    expect(recommendHealthspanAction({ ...ready, primaryFocus: "body_composition", metabolicLoggedToday: true }).action).toBe("nutrition");
  });
  it("bietet einen freiwilligen Stoffwechsel-Impuls ohne Messwertbehauptung", () => {
    const recommendation = recommendHealthspanAction({ ...baseline, proteinG: 140, waterMl: 2800, completedStrengthDays: 3, checkins: [{ sleepHours: 7.5, sleepQuality: 7, stressLevel: 4, energyLevel: 8 }], metabolicLogCount: 0, metabolicLoggedToday: false });
    expect(recommendation.action).toBe("metabolism");
    expect(recommendation.detail).toContain("protein-");
    expect(recommendation.detail).not.toMatch(/Insulin|Blutzucker|Fettverbrennung/i);
  });
  it("begründet den Fallback mit den individuellen Signalen", () => expect(recommendHealthspanAction({ ...baseline, checkins: [{ sleepHours: 5.5, sleepQuality: 4, stressLevel: 4, energyLevel: 8 }] }).detail).toContain("5.5 h Schlaf"));
  it("leitet Trainingsbereitschaft direkt aus dem Check-in ab", () => {
    expect(getTrainingReadiness()).toBe("missing");
    expect(getTrainingReadiness({ sleepHours: 5.5, stressLevel: 4, energyLevel: 8 })).toBe("reduce");
    expect(getTrainingReadiness({ sleepHours: 7, stressLevel: 4, energyLevel: 8 })).toBe("ready");
  });
  it("bildet fünf erklärbare Bereiche", () => expect(buildHealthspanDomains(baseline).map((item) => item.id)).toEqual(["strength", "endurance", "nutrition", "recovery", "metabolism"]));
  it("normalisiert nur gültige KI-Tagesempfehlungen", () => {
    expect(normalizeDailyHealthspanRecommendation({ version: 1, action: "endurance", title: "Zone 2", detail: "Heute locker", checkinDate: "2026-08-10", checkinFingerprint: "x", createdAt: "2026-08-10T10:00:00Z" })?.action).toBe("endurance");
    expect(normalizeDailyHealthspanRecommendation({ version: 1, action: "metabolism", title: "Rhythmus", detail: "Beobachte dich", checkinDate: "2026-08-10", checkinFingerprint: "x", createdAt: "2026-08-10T10:00:00Z" })?.action).toBe("metabolism");
    expect(normalizeDailyHealthspanRecommendation({ version: 1, action: "medical", title: "x", detail: "x", checkinDate: "2026-08-10", checkinFingerprint: "x", createdAt: "x" })).toBeNull();
  });
  it("verändert den Fingerprint bei geänderten Tageswerten", () => expect(checkinFingerprint({ checkinDate: "2026-08-10", sleepHours: 7, sleepQuality: 6, stressLevel: 5, energyLevel: 6 })).not.toBe(checkinFingerprint({ checkinDate: "2026-08-10", sleepHours: 7, sleepQuality: 6, stressLevel: 5, energyLevel: 7 })));
});
