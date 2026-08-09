import { M, type SegmentKind } from "../../theme";
import type { TimerMode } from "../engine";

export interface TimerModeColors {
  accent: string;
  soft: string;
  border: string;
}

export const TIMER_PREP_COLOR = "#A1A1AA";

export const TIMER_MODE_COLORS: Record<TimerMode, TimerModeColors> = {
  emom: {
    accent: M.fg,
    soft: M.accSoft,
    border: M.line,
  },
  amrap: {
    accent: "#52525B",
    soft: "rgba(82,82,91,0.08)",
    border: "rgba(82,82,91,0.18)",
  },
  tabata: {
    accent: M.fg,
    soft: M.accSoft,
    border: M.line,
  },
  fortime: {
    accent: "#71717A",
    soft: "rgba(113,113,122,0.08)",
    border: "rgba(113,113,122,0.18)",
  },
};

export function timerModeAccent(mode: TimerMode): string {
  return TIMER_MODE_COLORS[mode].accent;
}

export function timerPhaseColor(kind: SegmentKind, modeAccent: string, done: boolean): string {
  if (done || kind === "done") return M.mut2;
  if (kind === "prep") return TIMER_PREP_COLOR;
  if (kind === "rest") return M.mut;
  return modeAccent;
}
