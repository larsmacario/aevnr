export const FACT_TOPICS = [
  "gut_health",
  "nutrition",
  "sleep",
  "movement",
  "cardiovascular",
  "mental_health",
  "metabolism",
  "healthy_aging",
] as const;

export type FactTopic = (typeof FACT_TOPICS)[number];

export const FACT_TOPIC_LABELS: Record<FactTopic, string> = {
  gut_health: "Darmgesundheit",
  nutrition: "Ernährung",
  sleep: "Schlaf",
  movement: "Bewegung",
  cardiovascular: "Herz & Kreislauf",
  mental_health: "Mentale Gesundheit",
  metabolism: "Stoffwechsel",
  healthy_aging: "Gesund älter werden",
};

export function normalizeFactTopics(raw: unknown): FactTopic[] {
  if (!Array.isArray(raw)) return [];
  const topics = raw.filter((topic): topic is FactTopic => typeof topic === "string" && FACT_TOPICS.includes(topic as FactTopic));
  return [...new Set(topics)].slice(0, 3);
}

export function normalizeFactTimezone(raw: unknown): string {
  if (typeof raw !== "string" || raw.length < 1 || raw.length > 64) return "Europe/Berlin";
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: raw }).format();
    return raw;
  } catch {
    return "Europe/Berlin";
  }
}

export function detectFactTimezone(): string {
  return normalizeFactTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function factLocalDate(timeZone = detectFactTimezone(), date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export interface FactSource {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  publicationYear: number;
  publicationType?: string | null;
  pubmedUrl: string;
}

export const FACT_APP_ACTIONS = ["checkin", "breathing", "express", "protein", "water", "ai_plan"] as const;
export type FactAppAction = (typeof FACT_APP_ACTIONS)[number];

export interface FactAction {
  title: string;
  body: string;
  appAction?: FactAppAction | null;
}

export interface DailyFact {
  id: string;
  topic: FactTopic;
  title: string;
  body: string;
  localDate: string;
  saved: boolean;
  sources: FactSource[];
  action?: FactAction | null;
}
