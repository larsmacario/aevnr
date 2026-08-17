import type { TranslationKey } from "../locales/de";

const MUSCLE_GROUP_KEYS: Record<string, TranslationKey> = {
  Brust: "aiPlan.muscles.chest",
  Latissimus: "aiPlan.muscles.lats",
  "Oberer Rücken": "aiPlan.muscles.upperBack",
  "Unterer Rücken": "aiPlan.muscles.lowerBack",
  Schultern: "aiPlan.muscles.shoulders",
  Bizeps: "aiPlan.muscles.biceps",
  Trizeps: "aiPlan.muscles.triceps",
  Unterarme: "aiPlan.muscles.forearms",
  "Bauch / Core": "aiPlan.muscles.core",
  Quadrizeps: "aiPlan.muscles.quads",
  Hamstrings: "aiPlan.muscles.hamstrings",
  Gesäß: "aiPlan.muscles.glutes",
  Waden: "aiPlan.muscles.calves",
};

const EQUIPMENT_KEYS: Record<string, TranslationKey> = {
  Langhantel: "catalog.equipment.barbell",
  Kurzhantel: "catalog.equipment.dumbbell",
  Kettlebell: "catalog.equipment.kettlebell",
  Kabel: "catalog.equipment.cable",
  Maschine: "catalog.equipment.machine",
  Körpergewicht: "catalog.equipment.bodyweight",
  Cardiogerät: "catalog.equipment.cardio",
};

export function muscleGroupTranslationKey(group: string): TranslationKey | null {
  return MUSCLE_GROUP_KEYS[group] ?? null;
}

export function equipmentTranslationKey(equipment: string): TranslationKey | null {
  return EQUIPMENT_KEYS[equipment] ?? null;
}

