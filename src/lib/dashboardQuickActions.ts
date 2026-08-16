import type { AevnrFocus } from "./preferences";

export const DASHBOARD_QUICK_ACTION_IDS = ["recovery", "breathing", "timer", "plans", "calculator", "body"] as const;
export type DashboardQuickActionId = typeof DASHBOARD_QUICK_ACTION_IDS[number];

export interface DashboardQuickActionInput {
  primaryFocus: AevnrFocus | null;
  secondaryFocus: AevnrFocus | null;
  hasPlan: boolean;
}

const FOCUS_ACTIONS: Record<AevnrFocus, DashboardQuickActionId[]> = {
  strength: ["plans", "calculator", "recovery", "timer"],
  endurance: ["timer", "breathing", "recovery"],
  energy: ["breathing", "recovery", "timer"],
  body_composition: ["body", "recovery", "plans", "calculator"],
};

const DEFAULT_ACTIONS: DashboardQuickActionId[] = ["recovery", "breathing", "timer"];

/** Returns a stable, focus-led set of two to four actions for the dashboard. */
export function selectDashboardQuickActions({ primaryFocus, secondaryFocus, hasPlan }: DashboardQuickActionInput): DashboardQuickActionId[] {
  const selected: DashboardQuickActionId[] = primaryFocus ? [...FOCUS_ACTIONS[primaryFocus]] : [...DEFAULT_ACTIONS];
  if (secondaryFocus && secondaryFocus !== primaryFocus) selected.push(...FOCUS_ACTIONS[secondaryFocus]);
  if (!primaryFocus && hasPlan) selected.unshift("plans");
  return [...new Set(selected)].slice(0, 4);
}
