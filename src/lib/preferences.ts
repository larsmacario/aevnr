import type { Json } from "./database.types";
import { TIMER_DEFAULTS, type TimerCfg, type TimerMode } from "./engine";
import { cloneBreathingPresets, normalizeBreathingPresets, type BreathingPresetConfigs } from "./breathing";
import { normalizeTimerSoundPackId, DEFAULT_TIMER_SOUND_PACK_ID } from "./timerSoundPacks";
import { normalizeWaterQuickAmounts, type WaterQuickAmounts } from "./hydration";
import { supabase } from "./supabase";
import { normalizeDailyHealthspanRecommendation, type DailyHealthspanRecommendation } from "./healthspan";
import { normalizeFactTimezone, normalizeFactTopics, type FactTopic } from "./facts";
import { DEFAULT_DASHBOARD_PREFERENCES, normalizeDashboardPreferences, type DashboardPreferences } from "./dashboardPersonalization";
import { detectAppLanguage, normalizeAppLanguage, type AppLanguage } from "./language";

export type TrainingStructure = "full_body" | "split";
export type TrainingSplitDays = 2 | 3 | 4 | 5 | 6;
export type ProteinTargetMode = "plan" | "body" | "manual";
export type AevnrFocus = "strength" | "endurance" | "energy" | "body_composition";

export const ONBOARDING_VERSION = 3;

export function hasCurrentOnboarding(preferences: Pick<UserPreferences, "onboardingVersion">): boolean {
  return preferences.onboardingVersion >= ONBOARDING_VERSION;
}

export function normalizeAevnrFocus(raw: unknown): AevnrFocus | null {
  return raw === "strength" || raw === "endurance" || raw === "energy" || raw === "body_composition"
    ? raw
    : null;
}

/** Keeps the established plan and nutrition inputs stable while ÆVNR uses broader focus language. */
export function legacyFitnessGoalForFocus(focus: AevnrFocus): "muscle_building" | "fat_loss" | "fitness" | "strength" {
  if (focus === "strength") return "strength";
  if (focus === "body_composition") return "fat_loss";
  return "fitness";
}

export interface AnamnesisData {
  painZones: string[];
  trainingLocation: "gym" | "home_equipment" | "bodyweight";
  homeEquipment?: string[];
  otherSports: { sport: string; frequency: number }[];
  kfa?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  htv?: number | null;
  minutesPerSession?: number | null;
  trainingStructure?: TrainingStructure | null;
  trainingSplitDays?: TrainingSplitDays | null;
  /** ISO-Wochentage 0=Mo … 6=So, sortiert */
  trainingWeekdays?: number[];
  occupation?: "sedentary" | "standing" | "physical" | null;
  shiftWork?: boolean | null;
  sleepHours?: number | null;
  stressLevel?: number | null;
  dietPreference?: "omnivore" | "vegetarian" | "vegan" | "pescetarian" | null;
  dietAllergies?: string[];
  musclePriorities?: Record<string, number>;
}

export function normalizeTrainingStructure(raw: unknown): TrainingStructure | null {
  if (raw === "full_body" || raw === "split") return raw;
  return null;
}

export function normalizeTrainingSplitDays(raw: unknown): TrainingSplitDays | null {
  if (raw === 2 || raw === 3 || raw === 4 || raw === 5 || raw === 6) return raw;
  return null;
}

/** Maps legacy string stress levels and validates 1–10 scale. */
export function normalizeStressLevel(raw: unknown): number | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    const n = Math.round(raw);
    if (n >= 1 && n <= 10) return n;
    return null;
  }
  if (raw === "low") return 3;
  if (raw === "medium") return 5;
  if (raw === "high") return 8;
  return null;
}

export function normalizeSleepHours(raw: unknown): number {
  const v = typeof raw === "number" && !Number.isNaN(raw) ? raw : 7;
  const clamped = Math.min(12, Math.max(4, v));
  return Math.round(clamped * 2) / 2;
}

export const AI_CONSENT_VERSION = 2;

export interface AiConsent {
  grantedAt: string;
  provider: "anthropic";
  version: number;
}

export type ExpressBaselineLevel = "beginner" | "intermediate" | "advanced";

export interface ExpressBaselineMetric {
  value?: number;
  level?: ExpressBaselineLevel;
  skipped?: boolean;
  /** Nur bei Klimmzügen: aktuell keine Stange verfügbar. */
  unavailable?: boolean;
}

export interface ExpressPerformanceBaseline {
  version: 1;
  updatedAt: string;
  pushUps?: ExpressBaselineMetric;
  pullUps?: ExpressBaselineMetric;
  bodyweightSquats?: ExpressBaselineMetric;
  sixMinuteDistanceM?: ExpressBaselineMetric;
}

function normalizeExpressBaselineMetric(raw: unknown, max: number, allowUnavailable = false): ExpressBaselineMetric | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const metric = raw as Record<string, unknown>;
  if (typeof metric.value === "number" && Number.isFinite(metric.value) && metric.value >= 0 && metric.value <= max) return { value: Math.round(metric.value) };
  if (metric.level === "beginner" || metric.level === "intermediate" || metric.level === "advanced") return { level: metric.level };
  if (allowUnavailable && metric.unavailable === true) return { unavailable: true };
  if (metric.skipped === true) return { skipped: true };
  return undefined;
}

export function normalizeExpressPerformanceBaseline(raw: unknown): ExpressPerformanceBaseline | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.version !== 1 || typeof value.updatedAt !== "string" || !value.updatedAt) return null;
  return {
    version: 1,
    updatedAt: value.updatedAt,
    pushUps: normalizeExpressBaselineMetric(value.pushUps, 500),
    pullUps: normalizeExpressBaselineMetric(value.pullUps, 200, true),
    bodyweightSquats: normalizeExpressBaselineMetric(value.bodyweightSquats, 500),
    sixMinuteDistanceM: normalizeExpressBaselineMetric(value.sixMinuteDistanceM, 5000),
  };
}

export function normalizeAiConsent(raw: unknown): AiConsent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.provider !== "anthropic") return null;
  if (typeof obj.grantedAt !== "string" || !obj.grantedAt) return null;
  const version = typeof obj.version === "number" ? obj.version : 0;
  if (version < AI_CONSENT_VERSION) return null;
  return {
    grantedAt: obj.grantedAt,
    provider: "anthropic",
    version,
  };
}

export function hasAiConsent(prefs: Pick<UserPreferences, "aiConsent">): boolean {
  return normalizeAiConsent(prefs.aiConsent) !== null;
}

export function createAiConsentGrant(): AiConsent {
  return {
    grantedAt: new Date().toISOString(),
    provider: "anthropic",
    version: AI_CONSENT_VERSION,
  };
}

export interface UserPreferences {
  /** App display language, shared by web and the Capacitor iOS app. */
  language: AppLanguage;
  restSeconds: number;
  autoRest: boolean;
  timerSounds: boolean;
  timerSoundPack: string;
  defaultSets: number;
  defaultReps: number;
  weightIncrementKg: number;
  weightIncrementUpperKg?: number;
  weightIncrementLowerKg?: number;
  timerDefaults: Record<TimerMode, TimerCfg>;
  breathingPresets: BreathingPresetConfigs;
  gender: "male" | "female" | "other" | null;
  onboarded: boolean;
  /** Versioned gate so a redesigned first-run flow can be shown once to existing members. */
  onboardingVersion: number;
  primaryFocus: AevnrFocus | null;
  secondaryFocus: AevnrFocus | null;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | null;
  heightCm: number | null;
  weeklyDays: number | null;
  anamnesis: AnamnesisData | null;
  exerciseFeedback: Record<string, { rating: "like" | "dislike" | "pain"; note?: string }> | null;
  aiConsent: AiConsent | null;
  /** Freiwillige Startwerte nur für KI-Express-Sessions. */
  expressPerformanceBaseline: ExpressPerformanceBaseline | null;
  /** Gültige KI-Tagesempfehlung für den aktuellen Check-in. */
  dailyHealthspanRecommendation: DailyHealthspanRecommendation | null;
  /** Themen und Zeitzone für die tägliche Faktenbibliothek. */
  factTopics: FactTopic[];
  factTimezone: string;
  /** Montag-Datum (yyyy-mm-dd) der Woche, in der der Wochenplaner ausgeblendet wurde */
  weekPlannerDismissedWeek: string | null;
  /** Montag-Datum (yyyy-mm-dd) der Woche, in der die Recovery-Wochenkarte ausgeblendet wurde */
  recoveryWeekDismissedWeek: string | null;
  /** Persönliches Wasserziel; null verwendet Plan/Profil/Fallback. */
  waterTargetMl: number | null;
  /** Quelle des Protein-Tagesziels: aktiver Plan, Körperwerte oder manuelle Vorgabe. */
  proteinTargetMode: ProteinTargetMode;
  /** Manuelle Protein-Vorgabe in g; nur im manuellen Modus verwendet. */
  proteinTargetG: number | null;
  /** Drei frei konfigurierbare Schnellmengen im Wasser-Tracker. */
  waterQuickAmountsMl: WaterQuickAmounts;
  /** Lokales Datum (yyyy-mm-dd), für das der Hydration-Hinweis ausgeblendet wurde. */
  hydrationHintDismissedDate: string | null;
  /** Steuerung für die persönlich priorisierte Startseite. */
  dashboard: DashboardPreferences;
}

export type UserPreferencesUpdate = Omit<Partial<UserPreferences>, "timerDefaults" | "breathingPresets"> & {
  timerDefaults?: Partial<Record<TimerMode, TimerCfg>>;
  breathingPresets?: Partial<BreathingPresetConfigs>;
};

function cloneTimerDefaults(): Record<TimerMode, TimerCfg> {
  return JSON.parse(JSON.stringify(TIMER_DEFAULTS));
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: detectAppLanguage(),
  restSeconds: 90,
  autoRest: true,
  timerSounds: true,
  timerSoundPack: DEFAULT_TIMER_SOUND_PACK_ID,
  defaultSets: 3,
  defaultReps: 10,
  weightIncrementKg: 2.5,
  weightIncrementUpperKg: 2.5,
  weightIncrementLowerKg: 2.5,
  timerDefaults: cloneTimerDefaults(),
  breathingPresets: cloneBreathingPresets(),
  gender: null,
  onboarded: false,
  onboardingVersion: 0,
  primaryFocus: null,
  secondaryFocus: null,
  fitnessGoal: null,
  experienceLevel: null,
  heightCm: null,
  weeklyDays: null,
  anamnesis: null,
  exerciseFeedback: null,
  aiConsent: null,
  expressPerformanceBaseline: null,
  dailyHealthspanRecommendation: null,
  factTopics: [],
  factTimezone: "Europe/Berlin",
  weekPlannerDismissedWeek: null,
  recoveryWeekDismissedWeek: null,
  waterTargetMl: null,
  proteinTargetMode: "plan",
  proteinTargetG: null,
  waterQuickAmountsMl: normalizeWaterQuickAmounts(null),
  hydrationHintDismissedDate: null,
  dashboard: { ...DEFAULT_DASHBOARD_PREFERENCES },
};

function mergeTimerDefaults(raw: unknown): Record<TimerMode, TimerCfg> {
  const base = cloneTimerDefaults();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const obj = raw as Record<string, Partial<TimerCfg>>;
  for (const mode of Object.keys(TIMER_DEFAULTS) as TimerMode[]) {
    if (obj[mode] && typeof obj[mode] === "object") {
      base[mode] = { ...base[mode], ...obj[mode] };
    }
  }
  return base;
}

export function mergePreferences(raw: Json | null | undefined): UserPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...DEFAULT_PREFERENCES,
      timerDefaults: cloneTimerDefaults(),
    };
  }
  const obj = raw as Record<string, unknown>;
  const resolvedIncrement =
    typeof obj.weightIncrementKg === "number"
      ? obj.weightIncrementKg
      : typeof obj.weightIncrementUpperKg === "number"
      ? obj.weightIncrementUpperKg
      : DEFAULT_PREFERENCES.weightIncrementKg;

  return {
    language: normalizeAppLanguage(obj.language) ?? detectAppLanguage(),
    restSeconds:
      typeof obj.restSeconds === "number" ? obj.restSeconds : DEFAULT_PREFERENCES.restSeconds,
    autoRest: typeof obj.autoRest === "boolean" ? obj.autoRest : DEFAULT_PREFERENCES.autoRest,
    timerSounds:
      typeof obj.timerSounds === "boolean" ? obj.timerSounds : DEFAULT_PREFERENCES.timerSounds,
    timerSoundPack: normalizeTimerSoundPackId(obj.timerSoundPack),
    defaultSets:
      typeof obj.defaultSets === "number" ? obj.defaultSets : DEFAULT_PREFERENCES.defaultSets,
    defaultReps:
      typeof obj.defaultReps === "number" ? obj.defaultReps : DEFAULT_PREFERENCES.defaultReps,
    weightIncrementKg: resolvedIncrement,
    weightIncrementUpperKg:
      typeof obj.weightIncrementUpperKg === "number" ? obj.weightIncrementUpperKg : resolvedIncrement,
    weightIncrementLowerKg:
      typeof obj.weightIncrementLowerKg === "number" ? obj.weightIncrementLowerKg : resolvedIncrement,
    timerDefaults: mergeTimerDefaults(obj.timerDefaults),
    breathingPresets: normalizeBreathingPresets(obj.breathingPresets),
    gender:
      obj.gender === "male" || obj.gender === "female" || obj.gender === "other"
        ? obj.gender
        : obj.gender === null
        ? null
        : DEFAULT_PREFERENCES.gender,
    onboarded: typeof obj.onboarded === "boolean" ? obj.onboarded : DEFAULT_PREFERENCES.onboarded,
    onboardingVersion:
      typeof obj.onboardingVersion === "number" && Number.isInteger(obj.onboardingVersion) && obj.onboardingVersion >= 0
        ? obj.onboardingVersion
        : DEFAULT_PREFERENCES.onboardingVersion,
    primaryFocus: normalizeAevnrFocus(obj.primaryFocus),
    secondaryFocus: normalizeAevnrFocus(obj.secondaryFocus),
    fitnessGoal:
      obj.fitnessGoal === "muscle_building" ||
      obj.fitnessGoal === "fat_loss" ||
      obj.fitnessGoal === "fitness" ||
      obj.fitnessGoal === "strength"
        ? obj.fitnessGoal
        : DEFAULT_PREFERENCES.fitnessGoal,
    experienceLevel:
      obj.experienceLevel === "beginner" ||
      obj.experienceLevel === "intermediate" ||
      obj.experienceLevel === "advanced"
        ? obj.experienceLevel
        : DEFAULT_PREFERENCES.experienceLevel,
    heightCm: typeof obj.heightCm === "number" ? obj.heightCm : DEFAULT_PREFERENCES.heightCm,
    weeklyDays: typeof obj.weeklyDays === "number" ? obj.weeklyDays : DEFAULT_PREFERENCES.weeklyDays,
    anamnesis:
      obj.anamnesis && typeof obj.anamnesis === "object"
        ? (obj.anamnesis as AnamnesisData)
        : DEFAULT_PREFERENCES.anamnesis,
    exerciseFeedback:
      obj.exerciseFeedback && typeof obj.exerciseFeedback === "object"
        ? (obj.exerciseFeedback as Record<string, { rating: "like" | "dislike" | "pain"; note?: string }>)
        : DEFAULT_PREFERENCES.exerciseFeedback,
    aiConsent: normalizeAiConsent(obj.aiConsent),
    expressPerformanceBaseline: normalizeExpressPerformanceBaseline(obj.expressPerformanceBaseline),
    dailyHealthspanRecommendation: normalizeDailyHealthspanRecommendation(obj.dailyHealthspanRecommendation),
    factTopics: normalizeFactTopics(obj.factTopics),
    factTimezone: normalizeFactTimezone(obj.factTimezone),
    weekPlannerDismissedWeek:
      typeof obj.weekPlannerDismissedWeek === "string"
        ? obj.weekPlannerDismissedWeek
        : obj.weekPlannerDismissedWeek === null
          ? null
          : DEFAULT_PREFERENCES.weekPlannerDismissedWeek,
    recoveryWeekDismissedWeek:
      typeof obj.recoveryWeekDismissedWeek === "string"
        ? obj.recoveryWeekDismissedWeek
        : obj.recoveryWeekDismissedWeek === null
          ? null
          : DEFAULT_PREFERENCES.recoveryWeekDismissedWeek,
    waterTargetMl:
      typeof obj.waterTargetMl === "number" && obj.waterTargetMl >= 1000 && obj.waterTargetMl <= 6000
        ? Math.round(obj.waterTargetMl / 50) * 50
        : obj.waterTargetMl === null
          ? null
          : DEFAULT_PREFERENCES.waterTargetMl,
    proteinTargetMode:
      obj.proteinTargetMode === "body" || obj.proteinTargetMode === "manual"
        ? obj.proteinTargetMode
        : DEFAULT_PREFERENCES.proteinTargetMode,
    proteinTargetG:
      typeof obj.proteinTargetG === "number" && obj.proteinTargetG >= 20 && obj.proteinTargetG <= 400
        ? Math.round(obj.proteinTargetG / 5) * 5
        : obj.proteinTargetG === null
          ? null
          : DEFAULT_PREFERENCES.proteinTargetG,
    waterQuickAmountsMl: normalizeWaterQuickAmounts(obj.waterQuickAmountsMl),
    hydrationHintDismissedDate:
      typeof obj.hydrationHintDismissedDate === "string"
        ? obj.hydrationHintDismissedDate
        : obj.hydrationHintDismissedDate === null
          ? null
          : DEFAULT_PREFERENCES.hydrationHintDismissedDate,
    dashboard: normalizeDashboardPreferences(obj.dashboard),
  };
}

export function preferencesToJson(prefs: UserPreferences): Json {
  return {
    language: prefs.language,
    restSeconds: prefs.restSeconds,
    autoRest: prefs.autoRest,
    timerSounds: prefs.timerSounds,
    timerSoundPack: prefs.timerSoundPack,
    defaultSets: prefs.defaultSets,
    defaultReps: prefs.defaultReps,
    weightIncrementKg: prefs.weightIncrementKg,
    weightIncrementUpperKg: prefs.weightIncrementUpperKg ?? prefs.weightIncrementKg,
    weightIncrementLowerKg: prefs.weightIncrementLowerKg ?? prefs.weightIncrementKg,
    timerDefaults: JSON.parse(JSON.stringify(prefs.timerDefaults)),
    breathingPresets: JSON.parse(JSON.stringify(prefs.breathingPresets)),
    gender: prefs.gender,
    onboarded: prefs.onboarded,
    onboardingVersion: prefs.onboardingVersion,
    primaryFocus: prefs.primaryFocus,
    secondaryFocus: prefs.secondaryFocus,
    fitnessGoal: prefs.fitnessGoal,
    experienceLevel: prefs.experienceLevel,
    heightCm: prefs.heightCm,
    weeklyDays: prefs.weeklyDays,
    anamnesis: prefs.anamnesis ? (prefs.anamnesis as unknown as Json) : null,
    exerciseFeedback: prefs.exerciseFeedback ? (prefs.exerciseFeedback as unknown as Json) : null,
    aiConsent: prefs.aiConsent ? (prefs.aiConsent as unknown as Json) : null,
    expressPerformanceBaseline: prefs.expressPerformanceBaseline ? (prefs.expressPerformanceBaseline as unknown as Json) : null,
    dailyHealthspanRecommendation: prefs.dailyHealthspanRecommendation ? (prefs.dailyHealthspanRecommendation as unknown as Json) : null,
    factTopics: prefs.factTopics,
    factTimezone: prefs.factTimezone,
    weekPlannerDismissedWeek: prefs.weekPlannerDismissedWeek,
    recoveryWeekDismissedWeek: prefs.recoveryWeekDismissedWeek,
    waterTargetMl: prefs.waterTargetMl,
    proteinTargetMode: prefs.proteinTargetMode,
    proteinTargetG: prefs.proteinTargetG,
    waterQuickAmountsMl: prefs.waterQuickAmountsMl,
    hydrationHintDismissedDate: prefs.hydrationHintDismissedDate,
    dashboard: prefs.dashboard as unknown as Json,
  };
}

export function mergePartialPreferences(
  current: UserPreferences,
  partial: UserPreferencesUpdate,
): UserPreferences {
  const { timerDefaults: timerPartial, breathingPresets: breathingPartial, ...rest } = partial;
  const next: UserPreferences = { ...current, ...rest };
  if (timerPartial) {
    const merged = { ...current.timerDefaults };
    for (const mode of Object.keys(timerPartial) as TimerMode[]) {
      merged[mode] = { ...current.timerDefaults[mode], ...timerPartial[mode] };
    }
    next.timerDefaults = merged;
  }
  if (breathingPartial) {
    next.breathingPresets = { ...current.breathingPresets, ...breathingPartial };
  }
  return next;
}

export async function saveUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: preferencesToJson(prefs) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export { PreferencesProvider, usePreferences } from "./preferences.tsx";
