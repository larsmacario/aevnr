export type MealQuality = "balanced" | "carb_focused" | "light";

export const MEAL_QUALITY_LABELS: Record<MealQuality, string> = {
  balanced: "Ausgewogen",
  carb_focused: "Eher kohlenhydratreich",
  light: "Leicht",
};

export interface MetabolicLogInput {
  loggedAt?: string;
  mealQuality: MealQuality;
  energyLevel: number;
  satietyLevel: number;
  note?: string;
}

export interface MetabolicLog extends Required<Omit<MetabolicLogInput, "note">> {
  id: string;
  userId: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetabolicTimePattern {
  label: string;
  count: number;
  energyLevel: number;
  satietyLevel: number;
}

export interface MetabolicWeekSummary {
  count: number;
  progress: number;
  energyLevel?: number;
  satietyLevel?: number;
  timePatterns: MetabolicTimePattern[];
  trainingDay?: { count: number; energyLevel: number; satietyLevel: number };
  restDay?: { count: number; energyLevel: number; satietyLevel: number };
}

export function normalizeMetabolicLog(input: MetabolicLogInput): MetabolicLogInput {
  const mealQuality: MealQuality = input.mealQuality === "carb_focused" || input.mealQuality === "light" ? input.mealQuality : "balanced";
  const normalizeScore = (value: number) => Math.min(10, Math.max(1, Math.round(value)));
  const candidate = input.loggedAt ? new Date(input.loggedAt) : new Date();
  return {
    loggedAt: Number.isNaN(candidate.getTime()) ? new Date().toISOString() : candidate.toISOString(),
    mealQuality,
    energyLevel: normalizeScore(input.energyLevel),
    satietyLevel: normalizeScore(input.satietyLevel),
    note: input.note?.trim().slice(0, 500) || undefined,
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function timeOfDay(date: Date): "Morgen" | "Mittag" | "Abend" {
  const hour = date.getHours();
  if (hour < 11) return "Morgen";
  if (hour < 17) return "Mittag";
  return "Abend";
}

export function buildMetabolicWeekSummary(logs: readonly MetabolicLog[], trainingDateKeys: ReadonlySet<string>): MetabolicWeekSummary {
  const count = logs.length;
  const byTime = new Map<string, MetabolicLog[]>();
  const training: MetabolicLog[] = [];
  const rest: MetabolicLog[] = [];
  for (const log of logs) {
    const date = new Date(log.loggedAt);
    const bucket = timeOfDay(date);
    byTime.set(bucket, [...(byTime.get(bucket) ?? []), log]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    (trainingDateKeys.has(key) ? training : rest).push(log);
  }
  const summarize = (items: MetabolicLog[]) => ({ count: items.length, energyLevel: Math.round(average(items.map((item) => item.energyLevel)) * 10) / 10, satietyLevel: Math.round(average(items.map((item) => item.satietyLevel)) * 10) / 10 });
  return {
    count,
    progress: Math.min(1, count / 7),
    ...(count ? summarize(logs as MetabolicLog[]) : {}),
    timePatterns: ["Morgen", "Mittag", "Abend"].flatMap((label) => {
      const items = byTime.get(label) ?? [];
      return items.length ? [{ label, ...summarize(items) }] : [];
    }),
    ...(training.length ? { trainingDay: summarize(training) } : {}),
    ...(rest.length ? { restDay: summarize(rest) } : {}),
  };
}
