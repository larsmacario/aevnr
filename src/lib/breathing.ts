import type { TimerCfg } from "./engine";

export const BREATHING_PRESET_IDS = ["box", "calm", "478"] as const;
export type BreathingPresetId = (typeof BREATHING_PRESET_IDS)[number];

export interface BreathingPreset {
  id: BreathingPresetId;
  name: string;
  description: string;
  config: TimerCfg;
}

export const BREATHING_PRESETS: Record<BreathingPresetId, BreathingPreset> = {
  box: {
    id: "box",
    name: "Box Breathe",
    description: "Gleichmäßiger Vier-Phasen-Rhythmus.",
    config: { inhale: 4, hold: 4, exhale: 4, pause: 4, rounds: 6, total: 120, breathTarget: "rounds", prep: 3 },
  },
  calm: {
    id: "calm",
    name: "Beruhigung",
    description: "Länger ausatmen, zur Ruhe kommen.",
    config: { inhale: 4, hold: 0, exhale: 6, pause: 0, rounds: 8, total: 120, breathTarget: "rounds", prep: 3 },
  },
  "478": {
    id: "478",
    name: "4–7–8",
    description: "Einatmen, halten, langsam ausatmen.",
    config: { inhale: 4, hold: 7, exhale: 8, pause: 0, rounds: 4, total: 120, breathTarget: "rounds", prep: 3 },
  },
};

export type BreathingPresetConfigs = Record<BreathingPresetId, TimerCfg>;

export function cloneBreathingPresets(): BreathingPresetConfigs {
  return Object.fromEntries(
    BREATHING_PRESET_IDS.map((id) => [id, { ...BREATHING_PRESETS[id].config }]),
  ) as BreathingPresetConfigs;
}

export function normalizeBreathingPresets(raw: unknown): BreathingPresetConfigs {
  const defaults = cloneBreathingPresets();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const values = raw as Record<string, Partial<TimerCfg>>;
  for (const id of BREATHING_PRESET_IDS) {
    const config = values[id];
    if (!config || typeof config !== "object") continue;
    const numeric = (key: keyof TimerCfg, min: number, max: number, fallback: number) => {
      const value = config[key];
      return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? Math.round(value) : fallback;
    };
    defaults[id] = {
      ...defaults[id],
      inhale: numeric("inhale", 1, 30, defaults[id].inhale ?? 4),
      hold: numeric("hold", 0, 30, defaults[id].hold ?? 0),
      exhale: numeric("exhale", 1, 30, defaults[id].exhale ?? 4),
      pause: numeric("pause", 0, 30, defaults[id].pause ?? 0),
      rounds: numeric("rounds", 1, 99, defaults[id].rounds ?? 6),
      total: numeric("total", 30, 3600, defaults[id].total ?? 120),
      prep: numeric("prep", 0, 10, defaults[id].prep ?? 3),
      breathTarget: config.breathTarget === "duration" ? "duration" : "rounds",
      breathPhaseMemory: {
        ...(typeof config.breathPhaseMemory === "object" && config.breathPhaseMemory && !Array.isArray(config.breathPhaseMemory)
          ? Object.fromEntries(
              (["hold", "pause"] as const)
                .filter((key) => {
                  const value = (config.breathPhaseMemory as Record<string, unknown>)[key];
                  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 30;
                })
                .map((key) => [key, Math.round((config.breathPhaseMemory as Record<string, number>)[key])]),
            )
          : {}),
      },
    };
  }
  return defaults;
}

export function breathingCycleDuration(config: TimerCfg): number {
  return (config.inhale ?? 0) + (config.hold ?? 0) + (config.exhale ?? 0) + (config.pause ?? 0);
}
