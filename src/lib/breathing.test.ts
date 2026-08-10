import { describe, expect, it } from "vitest";
import { buildSegments } from "./engine";
import { mergePreferences } from "./preferences";
import { formatTimerHistorySubtitle } from "./timerSession";

describe("Atemtimer", () => {
  it("erstellt Box-Breathe-Zyklen aus allen vier Phasen", () => {
    const segments = buildSegments("breathe", {
      inhale: 4, hold: 4, exhale: 4, pause: 4, rounds: 2, breathTarget: "rounds",
    });
    expect(segments.map((segment) => segment.label)).toEqual([
      "EINATMEN", "HALTEN", "AUSATMEN", "PAUSE", "EINATMEN", "HALTEN", "AUSATMEN", "PAUSE",
    ]);
    expect(segments[segments.length - 1]?.round).toBe(2);
  });

  it("beendet ein zeitbasiertes Muster exakt mit der Zielzeit", () => {
    const segments = buildSegments("breathe", {
      inhale: 4, hold: 0, exhale: 6, pause: 0, total: 24, breathTarget: "duration",
    });
    expect(segments.reduce((sum, segment) => sum + segment.dur, 0)).toBe(24);
    expect(segments[segments.length - 1]?.dur).toBe(4);
  });

  it("ergänzt Atem-Defaults bei bestehenden Preferences", () => {
    const preferences = mergePreferences({ timerSounds: false } as never);
    expect(preferences.breathingPresets.box).toMatchObject({ inhale: 4, hold: 4, exhale: 4, pause: 4 });
    expect(preferences.breathingPresets.calm.exhale).toBe(6);
  });

  it("behält deaktivierte optionale Phasenwerte in den Preferences", () => {
    const preferences = mergePreferences({
      breathingPresets: { box: { hold: 0, breathPhaseMemory: { hold: 7 } } },
    } as never);
    expect(preferences.breathingPresets.box.hold).toBe(0);
    expect(preferences.breathingPresets.box.breathPhaseMemory?.hold).toBe(7);
  });

  it("formatiert Atemsessions für den Verlauf", () => {
    expect(formatTimerHistorySubtitle({ dur: 2, sets: 6, name: "Box Breathe · 6 Zyklen", tags: ["Atmen", "Box Breathe", "Atemmuster · box"] })).toBe(
      "2 Min · Box Breathe · 6 Zyklen",
    );
  });
});
