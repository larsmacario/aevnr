import type { AevnrFocus } from "./preferences";

export const DASHBOARD_MODULE_IDS = ["healthspan", "training", "recovery", "insights"] as const;
export type DashboardModuleId = typeof DASHBOARD_MODULE_IDS[number];

export interface DashboardPreferences {
  autoPrioritize: boolean;
  focusOverride: AevnrFocus | null;
  hiddenModules: DashboardModuleId[];
  /** Reserviert für eine spätere, ausdrücklich aktivierte Apple-Health-/Wearable-Anbindung. */
  wearableSignalsEnabled: boolean;
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  autoPrioritize: true,
  focusOverride: null,
  hiddenModules: [],
  wearableSignalsEnabled: false,
};

export function normalizeDashboardPreferences(raw: unknown): DashboardPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_DASHBOARD_PREFERENCES };
  const value = raw as Record<string, unknown>;
  const hiddenModules = Array.isArray(value.hiddenModules)
    ? value.hiddenModules.filter((id): id is DashboardModuleId => typeof id === "string" && DASHBOARD_MODULE_IDS.includes(id as DashboardModuleId))
    : [];
  return {
    autoPrioritize: typeof value.autoPrioritize === "boolean" ? value.autoPrioritize : true,
    focusOverride: value.focusOverride === "strength" || value.focusOverride === "endurance" || value.focusOverride === "energy" || value.focusOverride === "body_composition" ? value.focusOverride : null,
    hiddenModules: [...new Set(hiddenModules)],
    wearableSignalsEnabled: value.wearableSignalsEnabled === true,
  };
}

export interface DashboardPriorityInput {
  focus: AevnrFocus | null;
  autoPrioritize: boolean;
  isTrainingDay: boolean;
  lowReadiness: boolean;
  proteinBehind: boolean;
  waterBehind: boolean;
  zone2Behind: boolean;
}

export interface DashboardPriorityResult {
  modules: DashboardModuleId[];
  reasons: string[];
}

/** Stable ordering with small, explainable shifts rather than a constantly changing dashboard. */
export function prioritizeDashboard(input: DashboardPriorityInput): DashboardPriorityResult {
  const modules: DashboardModuleId[] = ["healthspan", "training", "recovery", "insights"];
  const reasons: string[] = [];
  if (!input.autoPrioritize) return { modules, reasons: ["Deine feste Dashboard-Reihenfolge ist aktiv."] };

  const promote = (module: DashboardModuleId) => {
    const index = modules.indexOf(module);
    if (index > 0) modules.splice(index, 1), modules.unshift(module);
  };
  if (input.lowReadiness) {
    promote("recovery");
    reasons.push("deine heutige Tagesform");
  } else if (input.isTrainingDay) {
    promote("training");
    reasons.push("dein geplanter Trainingstag");
  } else if (input.focus === "endurance" && input.zone2Behind) {
    promote("healthspan");
    reasons.push("dein Ausdauerfokus");
  } else if (input.proteinBehind || input.waterBehind) {
    promote("recovery");
    reasons.push(input.proteinBehind ? "dein heutiges Proteinziel" : "dein heutiges Wasserziel");
  } else if (input.focus) {
    reasons.push(`dein Fokus ${focusLabel(input.focus)}`);
  }
  return { modules, reasons: reasons.length ? reasons : ["deinen aktuellen Wochenfortschritt"] };
}

export function focusLabel(focus: AevnrFocus): string {
  return ({ strength: "Kraft", endurance: "Ausdauer", energy: "Energie", body_composition: "Körper" })[focus];
}
