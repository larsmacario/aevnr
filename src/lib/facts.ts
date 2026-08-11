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

export interface FactSource {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  publicationYear: number;
  publicationType?: string | null;
  pubmedUrl: string;
}

export interface DailyFact {
  id: string;
  topic: FactTopic;
  title: string;
  body: string;
  localDate: string;
  saved: boolean;
  sources: FactSource[];
}
