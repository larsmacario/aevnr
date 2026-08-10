import type { HistoryEntry } from "../data";
import { fmtUp, TIMER_MODES, type TimerCfg, type TimerMode, type TimerSnapshot } from "./engine";
import type { SaveSessionInput } from "./db";
import type { BreathingPresetId } from "./breathing";

export const TIMER_TAG = "Timer";
export const BREATHING_TAG = "Atmen";

export function isTimerSession(tags: string[]): boolean {
  return tags.includes(TIMER_TAG) || tags.includes(BREATHING_TAG);
}

export function isBreathingSession(tags: string[]): boolean {
  return tags.includes(BREATHING_TAG);
}

export function timerModeLabel(tags: string[]): string | null {
  return tags.find((t) => t !== TIMER_TAG) ?? null;
}

function workDurationMin(elapsedSec: number, prepSec: number): number {
  const workSec = Math.max(0, elapsedSec - prepSec);
  return Math.max(1, Math.round(workSec / 60));
}

export function buildTimerSessionInput(
  mode: TimerMode,
  cfg: TimerCfg,
  snapshot: Pick<TimerSnapshot, "elapsedSec" | "round" | "taps" | "bigSeconds" | "countUp">,
): SaveSessionInput {
  const modeName = TIMER_MODES.find((m) => m.id === mode)?.name ?? mode.toUpperCase();
  const prep = cfg.prep ?? 0;
  const durationMin = workDurationMin(snapshot.elapsedSec, prep);

  let name: string;
  let setCount: number;

  if (mode === "amrap") {
    setCount = snapshot.taps;
    name = `${modeName} · ${setCount} Runden`;
  } else if (mode === "fortime") {
    setCount = 0;
    const timeLabel = fmtUp(snapshot.bigSeconds);
    name = `${modeName} · ${timeLabel}`;
  } else {
    setCount = snapshot.round;
    name = `${modeName} · ${setCount} Runden`;
  }

  return {
    name,
    tags: [TIMER_TAG, modeName],
    durationMin,
    volumeKg: 0,
    setCount,
  };
}

export function buildBreathingSessionInput(
  presetId: BreathingPresetId,
  presetName: string,
  cfg: TimerCfg,
  elapsedSec: number,
  completedRounds: number,
): SaveSessionInput {
  const prep = cfg.prep ?? 0;
  return {
    name: `${presetName} · ${completedRounds} Zyklen`,
    tags: [BREATHING_TAG, presetName, `Atemmuster · ${presetId}`],
    durationMin: workDurationMin(elapsedSec, prep),
    volumeKg: 0,
    setCount: completedRounds,
  };
}

export function formatTimerHistorySubtitle(entry: Pick<HistoryEntry, "dur" | "tags" | "sets" | "name">): string {
  if (isBreathingSession(entry.tags)) {
    const pattern = entry.tags.find((tag) => tag !== BREATHING_TAG && !tag.startsWith("Atemmuster"));
    return `${entry.dur} Min · ${pattern ?? "Atmen"} · ${entry.sets} Zyklen`;
  }
  const mode = timerModeLabel(entry.tags);
  if (!mode) return `${entry.dur} Min`;

  if (mode === "FOR TIME") {
    const timePart = entry.name.includes("·") ? entry.name.split("·").pop()?.trim() : null;
    return timePart ? `${entry.dur} Min · ${mode} · ${timePart}` : `${entry.dur} Min · ${mode}`;
  }

  if (entry.sets > 0) {
    return `${entry.dur} Min · ${mode} · ${entry.sets} Rdn`;
  }

  return `${entry.dur} Min · ${mode}`;
}

export function formatTimerDetailMetrics(entry: Pick<HistoryEntry, "dur" | "tags" | "sets" | "name">): string[] {
  if (isBreathingSession(entry.tags)) {
    const pattern = entry.tags.find((tag) => tag !== BREATHING_TAG && !tag.startsWith("Atemmuster"));
    return [`${entry.dur} Min`, pattern ?? "Atmen", `${entry.sets} Zyklen`];
  }
  const mode = timerModeLabel(entry.tags);
  if (!mode) return [`${entry.dur} Min`];

  const parts = [`${entry.dur} Min`, mode];

  if (mode === "FOR TIME") {
    const timePart = entry.name.includes("·") ? entry.name.split("·").pop()?.trim() : null;
    if (timePart) parts.push(timePart);
  } else if (entry.sets > 0) {
    parts.push(`${entry.sets} Runden`);
  }

  return parts;
}
