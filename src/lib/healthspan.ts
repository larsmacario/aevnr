import { toLocalDateKey } from "./hydration";

export interface DailyCheckinInput {
  checkinDate?: string;
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  energyLevel: number;
  note?: string;
}

export interface DailyCheckin extends Required<Omit<DailyCheckinInput, "note">> {
  id: string;
  userId: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type HealthspanDomainId = "strength" | "endurance" | "nutrition" | "recovery" | "metabolism";

export interface HealthspanDomain {
  id: HealthspanDomainId;
  label: string;
  progress: number;
  detail: string;
}

export interface CoachRecommendation {
  title: string;
  detail: string;
  action: "recover" | "reduce" | "endurance" | "nutrition" | "metabolism" | "strength" | "maintain";
  trainingAlternative?: "reduce_volume" | "zone_2";
}

export interface DailyHealthspanRecommendation extends CoachRecommendation {
  version: 1;
  checkinDate: string;
  checkinFingerprint: string;
  createdAt: string;
}

export function checkinFingerprint(checkin: Pick<DailyCheckinInput, "checkinDate" | "sleepHours" | "sleepQuality" | "stressLevel" | "energyLevel" | "note">): string {
  return [checkin.checkinDate, checkin.sleepHours, checkin.sleepQuality, checkin.stressLevel, checkin.energyLevel, checkin.note?.trim() ?? ""].join("|");
}

export function normalizeDailyHealthspanRecommendation(raw: unknown): DailyHealthspanRecommendation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const validAction = ["recover", "reduce", "endurance", "nutrition", "metabolism", "strength", "maintain"].includes(String(value.action));
  if (value.version !== 1 || !validAction || typeof value.title !== "string" || typeof value.detail !== "string" || typeof value.checkinDate !== "string" || typeof value.checkinFingerprint !== "string" || typeof value.createdAt !== "string") return null;
  return { version: 1, action: value.action as CoachRecommendation["action"], title: value.title.slice(0, 100), detail: value.detail.slice(0, 360), checkinDate: value.checkinDate, checkinFingerprint: value.checkinFingerprint, createdAt: value.createdAt, trainingAlternative: value.trainingAlternative === "reduce_volume" || value.trainingAlternative === "zone_2" ? value.trainingAlternative : undefined };
}

export type TrainingReadiness = "missing" | "reduce" | "ready";

export function getTrainingReadiness(checkin?: Pick<DailyCheckin, "sleepHours" | "stressLevel" | "energyLevel"> | null): TrainingReadiness {
  if (!checkin) return "missing";
  return checkin.sleepHours < 6 || checkin.energyLevel <= 4 || checkin.stressLevel >= 8 ? "reduce" : "ready";
}

export function findCheckinForDate<T extends { checkinDate: string }>(checkins: readonly T[] | null | undefined, dateKey: string): T | undefined {
  return checkins?.find((checkin) => checkin.checkinDate === dateKey);
}

export interface HealthspanSnapshotInput {
  completedStrengthDays: number;
  strengthTargetDays: number;
  zone2Minutes: number;
  zone2TargetMinutes?: number;
  proteinG: number;
  proteinTargetG: number;
  waterMl: number;
  waterTargetMl: number;
  metabolicLogCount?: number;
  metabolicLoggedToday?: boolean;
  checkins: Pick<DailyCheckin, "sleepHours" | "sleepQuality" | "stressLevel" | "energyLevel">[];
  primaryFocus?: "strength" | "endurance" | "energy" | "body_composition" | null;
  secondaryFocus?: "strength" | "endurance" | "energy" | "body_composition" | null;
}

export function normalizeDailyCheckin(input: DailyCheckinInput): DailyCheckinInput {
  return {
    checkinDate: input.checkinDate ?? toLocalDateKey(),
    sleepHours: Math.min(24, Math.max(0, Math.round(input.sleepHours * 10) / 10)),
    sleepQuality: Math.min(10, Math.max(1, Math.round(input.sleepQuality))),
    stressLevel: Math.min(10, Math.max(1, Math.round(input.stressLevel))),
    energyLevel: Math.min(10, Math.max(1, Math.round(input.energyLevel))),
    note: input.note?.trim().slice(0, 500) || undefined,
  };
}

function progress(value: number, target: number): number {
  return target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
}

export function buildHealthspanDomains(input: HealthspanSnapshotInput): HealthspanDomain[] {
  const latest = input.checkins[0];
  const recoveryProgress = latest
    ? (progress(latest.sleepHours, 7) + latest.sleepQuality / 10 + (11 - latest.stressLevel) / 10 + latest.energyLevel / 10) / 4
    : 0;
  return [
    { id: "strength", label: "Kraft", progress: progress(input.completedStrengthDays, Math.max(1, input.strengthTargetDays)), detail: `${input.completedStrengthDays}/${Math.max(1, input.strengthTargetDays)} Einheiten` },
    { id: "endurance", label: "Ausdauer", progress: progress(input.zone2Minutes, input.zone2TargetMinutes ?? 150), detail: `${input.zone2Minutes}/${input.zone2TargetMinutes ?? 150} Min. Zone 2` },
    { id: "nutrition", label: "Ernährung & Körper", progress: Math.min(progress(input.proteinG, input.proteinTargetG), progress(input.waterMl, input.waterTargetMl)), detail: `${Math.round(input.proteinG)}/${Math.round(input.proteinTargetG)} g Protein` },
    { id: "recovery", label: "Erholung", progress: recoveryProgress, detail: latest ? `${latest.sleepHours.toFixed(1)} h Schlaf · Energie ${latest.energyLevel}/10` : "Tages-Check-in offen" },
    { id: "metabolism", label: "Stoffwechsel-Rhythmus", progress: progress(input.metabolicLogCount ?? 0, 7), detail: input.metabolicLogCount ? `${input.metabolicLogCount} Mahlzeit${input.metabolicLogCount === 1 ? "" : "en"} protokolliert` : "Freiwillig beobachten" },
  ];
}

export function recommendHealthspanAction(input: HealthspanSnapshotInput): CoachRecommendation {
  const latest = input.checkins[0];
  if (!latest) return { title: "Tages-Check-in", detail: "Schlaf, Stress und Energie erfassen – dann erhältst du eine passende Tagesempfehlung.", action: "recover" };
  if (getTrainingReadiness(latest) === "reduce") {
    const signal = latest.sleepHours < 6 ? `${latest.sleepHours.toFixed(1)} h Schlaf` : latest.energyLevel <= 4 ? `Energie ${latest.energyLevel}/10` : `Stress ${latest.stressLevel}/10`;
    return { title: "Heute Belastung reduzieren", detail: `Dein Check-in zeigt ${signal}. Wähle im Express Tracking eine leichtere Einheit oder Zone 2 – du entscheidest selbst.`, action: "reduce", trainingAlternative: "reduce_volume" };
  }
  if (input.primaryFocus === "strength") {
    return { title: "Deine Kraft heute nutzen", detail: "Dein Check-in ist stabil. Starte eine kurze, passende Krafteinheit und baue deinen Rhythmus auf.", action: "strength" };
  }
  if (input.primaryFocus === "endurance") {
    return { title: "Deine aerobe Basis stärken", detail: "Dein Check-in ist stabil. Eine lockere Zone-2-Einheit ist heute dein sinnvollster nächster Schritt.", action: "endurance", trainingAlternative: "zone_2" };
  }
  if (input.primaryFocus === "energy") {
    return { title: "Energie für deinen Tag sichern", detail: "Dein Check-in ist stabil. Richte als Nächstes deine Recovery-Basis mit Protein, Wasser und einem realistischen Rhythmus ein.", action: "recover" };
  }
  if (input.primaryFocus === "body_composition") {
    if (!input.metabolicLoggedToday) return { title: "Deinen Rhythmus beobachten", detail: "Wenn es heute passt: Wähle eine sättigende, protein- und ballaststoffreiche Mahlzeit und halte danach Energie und Sättigung fest.", action: "metabolism" };
    return { title: "Deine Körperbasis stärken", detail: "Dein Check-in ist stabil. Starte heute mit deinem Protein- und Recovery-Ziel – die Konstanz zählt.", action: "nutrition" };
  }
  if (input.proteinG < input.proteinTargetG * 0.65 || input.waterMl < input.waterTargetMl * 0.55) {
    const proteinOpen = Math.max(0, Math.round(input.proteinTargetG - input.proteinG));
    const waterOpen = Math.max(0, Math.round((input.waterTargetMl - input.waterMl) / 100) * 100);
    const nextHabit = proteinOpen > 0 && waterOpen > 0 ? `noch etwa ${proteinOpen} g Protein und ${waterOpen} ml Flüssigkeit offen` : proteinOpen > 0 ? `noch etwa ${proteinOpen} g Protein offen` : `noch etwa ${waterOpen} ml Flüssigkeit offen`;
    return { title: "Deine nächste Gewohnheit", detail: `Bei dir sind heute ${nextHabit}. Plane als Nächstes eine proteinreiche Mahlzeit oder fülle ein Glas Wasser auf.`, action: "nutrition" };
  }
  if (input.zone2Minutes < (input.zone2TargetMinutes ?? 150) * 0.7) {
    const target = input.zone2TargetMinutes ?? 150;
    return { title: "Deine aerobe Basis stärken", detail: `Du hast diese Woche ${input.zone2Minutes} von ${target} Zone-2-Minuten gesammelt. Eine lockere Einheit bringt dich deinem Wochenziel näher.`, action: "endurance", trainingAlternative: "zone_2" };
  }
  if (input.completedStrengthDays < input.strengthTargetDays) {
    const remaining = input.strengthTargetDays - input.completedStrengthDays;
    return { title: "Deinen nächsten Krafttag nutzen", detail: `Dein Check-in ist stabil und dir fehlen diese Woche noch ${remaining} Kraft${remaining === 1 ? "einheit" : "einheiten"}. Trainiere den nächsten geplanten Tag wie vorgesehen.`, action: "strength" };
  }
  if (!input.metabolicLoggedToday && (input.metabolicLogCount ?? 0) < 3) {
    return { title: "Deinen Rhythmus beobachten", detail: "Wenn es heute passt: Wähle eine sättigende, protein- und ballaststoffreiche Mahlzeit und halte danach Energie und Sättigung fest.", action: "metabolism" };
  }
  return { title: "Dein Rhythmus passt", detail: `Check-in stabil, ${input.completedStrengthDays} Krafteinheiten und ${input.zone2Minutes} Zone-2-Minuten diese Woche: Bleib heute bei deinem gewohnten Rhythmus.`, action: "maintain" };
}
