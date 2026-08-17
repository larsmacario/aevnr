import { useState, useEffect, useRef } from "react";
import { APP_NAME, brandSelectionStyle, M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { BirthDateField } from "../components/BirthDateField";
import { OneRmPercentInfoCard } from "../components/OneRmPercentInfoCard";
import { createBodyMeasurement, generateAndSaveAITrainingPlan, fetchRecentSessionsWithExercises, useBodyMeasurements } from "../lib/db";
import { buildNutrition, ageFromBirthDate } from "../lib/nutrition";
import {
  createAiConsentGrant,
  hasAiConsent,
  normalizeSleepHours,
  normalizeStressLevel,
  type TrainingSplitDays,
  type TrainingStructure,
} from "../lib/preferences";
import { useBreakpoint, SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { MUSCLE_GROUP_SECTIONS } from "../lib/exerciseCatalog";
import { normalizeMusclePriorities, type MusclePriorities } from "../lib/musclePriorities";
import { MusclePrioritySliderRow } from "../components/MusclePrioritySliderRow";
import { exerciseCountBounds } from "../lib/ai-plan-volume";
import {
  defaultTrainingWeekdays,
  normalizeTrainingWeekdays,
  toggleTrainingWeekday,
  trainingWeekdayLabel,
} from "../lib/trainingWeekdays";
import { MButton } from "../components/MButton";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { AiConsentStep } from "../components/AiConsentStep";
import { useI18n } from "../lib/i18n";

function formatSleepHours(hours: number, locale: string): string {
  const rounded = Math.round(hours * 2) / 2;
  const str = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rounded);
  return `${str} h`;
}

/** Phasen an typischen Laufzeiten (Speichern → KI → DB). */
function getGenerationLoadingStep(elapsedSec: number): number {
  if (elapsedSec < 2) return 0;
  if (elapsedSec < 5) return 1;
  if (elapsedSec < 45) return 2;
  return 3;
}


const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  textAlign: "center",
};

const tileStyle = (selected: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "18px 14px",
  borderRadius: 14,
  ...brandSelectionStyle(selected),
  fontFamily: M.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.2s ease",
  minWidth: 100,
  textAlign: "center",
});

const listTileStyle = (selected: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "16px 18px",
  borderRadius: 14,
  ...brandSelectionStyle(selected),
  fontFamily: M.body,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  transition: "all 0.2s ease",
  textAlign: "left",
  boxSizing: "border-box",
});

/** Gleiche Maße wie „Trainingstage pro Woche“ — inkl. sichtbarer +/- Farbe. */
const stepperBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 20,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function getHtvClassification(htv: number, gender: string | null): { level: "low" | "medium" | "high"; color: string } {
  if (gender === "male") {
    if (htv < 0.90) return { level: "low", color: M.brand };
    if (htv < 1.0) return { level: "medium", color: "#9ca3af" };
    return { level: "high", color: "#6b7280" };
  } else if (gender === "female") {
    if (htv < 0.80) return { level: "low", color: M.brand };
    if (htv < 0.85) return { level: "medium", color: "#9ca3af" };
    return { level: "high", color: "#6b7280" };
  } else {
    if (htv < 0.85) return { level: "low", color: M.brand };
    if (htv < 0.92) return { level: "medium", color: "#9ca3af" };
    return { level: "high", color: "#6b7280" };
  }
}

interface AITrainingPlanWizardProps {
  onBack: () => void;
  onPlanGenerated: (planId: string) => void;
}

export function AITrainingPlanWizard({ onBack, onPlanGenerated }: AITrainingPlanWizardProps) {
  const { language, locale, t } = useI18n();
  const { user, profile, updateBirthDate } = useAuth();
  const { preferences, updatePreferences, saving: prefsSaving } = usePreferences();
  const { data: measurements, loading: measurementsLoading } = useBodyMeasurements();
  const breakpoint = useBreakpoint();
  const bodyValuesPrefilled = useRef(false);
  const introBenefits = [1, 2, 3, 4].map((index) => t(`aiPlan.intro.benefit${index}` as "aiPlan.intro.benefit1"));
  const splitOptions: { days: TrainingSplitDays; label: string; hint: string }[] = ([2, 3, 4, 5, 6] as const).map((days) => ({
    days,
    label: t(`aiPlan.split.${days}` as "aiPlan.split.2"),
    hint: t(`aiPlan.split.${days}Hint` as "aiPlan.split.2Hint"),
  }));
  const standardEquipment = [
    { id: "dumbbells", name: t("aiPlan.equipment.dumbbells") },
    { id: "barbell", name: t("aiPlan.equipment.barbell") },
    { id: "pullup_bar", name: t("aiPlan.equipment.pullup") },
    { id: "bench", name: t("aiPlan.equipment.bench") },
    { id: "bands", name: t("aiPlan.equipment.bands") },
    { id: "kettlebell", name: t("aiPlan.equipment.kettlebell") },
  ];
  const muscleGroupLabels: Record<string, string> = {
    Brust: t("aiPlan.muscles.chest"),
    Latissimus: t("aiPlan.muscles.lats"),
    "Oberer Rücken": t("aiPlan.muscles.upperBack"),
    "Unterer Rücken": t("aiPlan.muscles.lowerBack"),
    Schultern: t("aiPlan.muscles.shoulders"),
    Bizeps: t("aiPlan.muscles.biceps"),
    Trizeps: t("aiPlan.muscles.triceps"),
    Unterarme: t("aiPlan.muscles.forearms"),
    "Bauch / Core": t("aiPlan.muscles.core"),
    Quadrizeps: t("aiPlan.muscles.quads"),
    Hamstrings: t("aiPlan.muscles.hamstrings"),
    Gesäß: t("aiPlan.muscles.glutes"),
    Waden: t("aiPlan.muscles.calves"),
  };
  const generationLoadingTexts = [1, 2, 3, 4].map((index) => t(`aiPlan.loading.${index}` as "aiPlan.loading.1"));

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");
  const openDatenschutz = () => {
    window.open(`${legalBaseUrl}/datenschutz`, "_blank", "noopener,noreferrer");
  };

  const [step, setStep] = useState(0);

  // Schritt 1: Profil · Schritt 2: Körperwerte
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(preferences.gender || null);
  const [birthDate, setBirthDate] = useState<string>(profile?.birth_date || "");
  const [heightCm, setHeightCm] = useState<string>(preferences.heightCm ? String(preferences.heightCm) : "");
  const [weightKg, setWeightKg] = useState<string>("");
  const [kfa, setKfa] = useState<string>("");
  const [metricMode, setMetricMode] = useState<"kfa" | "htv">("kfa");
  const [waistCm, setWaistCm] = useState<string>("");
  const [hipsCm, setHipsCm] = useState<string>("");
  const [homeEquipment, setHomeEquipment] = useState<string[]>([]);

  // Schritt 3: Ziel & Erfahrung
  const [fitnessGoal, setFitnessGoal] = useState<"muscle_building" | "fat_loss" | "fitness" | "strength" | null>(
    preferences.fitnessGoal || null
  );
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(
    preferences.experienceLevel || null
  );

  // Schritt 4: Muskelgruppen-Priorität
  const [musclePriorities, setMusclePriorities] = useState<MusclePriorities>(() =>
    normalizeMusclePriorities(preferences.anamnesis?.musclePriorities)
  );

  // Schritt 4: Trainingsort & Frequenz
  const [trainingLocation, setTrainingLocation] = useState<"gym" | "home_equipment" | "bodyweight">(
    preferences.anamnesis?.trainingLocation ?? "gym"
  );
  const [trainingWeekdays, setTrainingWeekdays] = useState<number[]>(() =>
    normalizeTrainingWeekdays(preferences.anamnesis?.trainingWeekdays) ??
      defaultTrainingWeekdays(preferences.weeklyDays ?? 3),
  );
  const selectedWeekdays =
    Array.isArray(trainingWeekdays) && trainingWeekdays.length > 0
      ? trainingWeekdays
      : defaultTrainingWeekdays(3);
  const [trainingStructure, setTrainingStructure] = useState<TrainingStructure | null>(
    preferences.anamnesis?.trainingStructure ?? null
  );
  const [trainingSplitDays, setTrainingSplitDays] = useState<TrainingSplitDays | null>(
    preferences.anamnesis?.trainingSplitDays ?? null
  );
  const [minutesPerSession, setMinutesPerSession] = useState<number>(
    preferences.anamnesis?.minutesPerSession ?? 60
  );

  // Schritt 3: Ernährung
  const [dietPreference, setDietPreference] = useState<
    "omnivore" | "vegetarian" | "vegan" | "pescetarian" | null
  >(preferences.anamnesis?.dietPreference ?? "omnivore");
  const [dietAllergies, setDietAllergies] = useState<string[]>(preferences.anamnesis?.dietAllergies ?? []);
  const [tempAllergy, setTempAllergy] = useState("");

  // Schritt 6: Alltag & Regeneration
  const [occupation, setOccupation] = useState<"sedentary" | "standing" | "physical" | null>(
    preferences.anamnesis?.occupation ?? null
  );
  const [shiftWork, setShiftWork] = useState<boolean>(preferences.anamnesis?.shiftWork ?? false);
  const [sleepHours, setSleepHours] = useState<number>(
    normalizeSleepHours(preferences.anamnesis?.sleepHours)
  );
  const [stressLevel, setStressLevel] = useState<number>(
    normalizeStressLevel(preferences.anamnesis?.stressLevel) ?? 5
  );

  // Schritt 5: Schmerzen & Einschränkungen
  const [painZones, setPainZones] = useState<string[]>([]);

  // Schritt 6: Andere Sportarten
  const [otherSports, setOtherSports] = useState<{ sport: string; frequency: number }[]>([]);
  const [tempSport, setTempSport] = useState<string>("");
  const [tempFreq, setTempFreq] = useState<number>(1);

  // Schritt 7 & 8: Bezahlung & Generierung
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  const [genElapsedSec, setGenElapsedSec] = useState(0);
  const generationStartedAtRef = useRef<number | null>(null);
  const generationTimeHint = (() => {
    const prefix = `${t("aiPlan.loading.keepOpen")} `;
    if (genElapsedSec < 4) return prefix + t("aiPlan.loading.initial");
    if (genElapsedSec < 20) return prefix + t("aiPlan.loading.remaining", { seconds: Math.max(10, 55 - genElapsedSec) });
    if (genElapsedSec < 45) return prefix + t("aiPlan.loading.wait");
    if (genElapsedSec < 60) return prefix + t("aiPlan.loading.almost");
    return prefix + t("aiPlan.loading.long");
  })();

  const addAllergy = () => {
    const trimmed = tempAllergy.trim();
    if (!trimmed || dietAllergies.includes(trimmed)) return;
    setDietAllergies((prev) => [...prev, trimmed]);
    setTempAllergy("");
  };

  useEffect(() => {
    if (step !== 13 || !busy) {
      if (step !== 13) {
        generationStartedAtRef.current = null;
        setGenElapsedSec(0);
      }
      return;
    }
    const tick = () => {
      const start = generationStartedAtRef.current;
      if (start == null) return;
      setGenElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, busy]);

  useEffect(() => {
    if (bodyValuesPrefilled.current || measurementsLoading) return;

    const latest = measurements?.[0];
    const anamnesis = preferences.anamnesis;

    if (latest) {
      setWeightKg(String(latest.weightKg));
      if (latest.bodyFatPct !== undefined) {
        setKfa(String(latest.bodyFatPct));
        setMetricMode("kfa");
      } else if (latest.waistCm !== undefined || latest.hipsCm !== undefined) {
        if (latest.hipsCm !== undefined) setHipsCm(String(latest.hipsCm));
        if (latest.waistCm !== undefined) setWaistCm(String(latest.waistCm));
        setMetricMode("htv");
      }
    } else if (anamnesis) {
      if (anamnesis.kfa != null && !isNaN(anamnesis.kfa)) {
        setKfa(String(anamnesis.kfa));
        setMetricMode("kfa");
      } else if (anamnesis.waistCm != null || anamnesis.hipsCm != null) {
        if (anamnesis.hipsCm != null) setHipsCm(String(anamnesis.hipsCm));
        if (anamnesis.waistCm != null) setWaistCm(String(anamnesis.waistCm));
        setMetricMode("htv");
      }
    }

    bodyValuesPrefilled.current = true;
  }, [measurements, measurementsLoading, preferences.anamnesis]);

  const togglePainZone = (zone: string) => {
    if (zone === "none") {
      setPainZones([]);
      return;
    }
    setPainZones((prev) => {
      if (prev.includes(zone)) {
        return prev.filter((z) => z !== zone);
      } else {
        return [...prev.filter((z) => z !== "none"), zone];
      }
    });
  };

  const addSport = () => {
    if (!tempSport.trim()) return;
    setOtherSports((prev) => [...prev, { sport: tempSport.trim(), frequency: tempFreq }]);
    setTempSport("");
    setTempFreq(1);
  };

  const removeSport = (idx: number) => {
    setOtherSports((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleWeekday = (day: number) => {
    setTrainingWeekdays((prev) => toggleTrainingWeekday(prev, day));
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!gender) {
        setError(t("aiPlan.validation.gender"));
        return;
      }
    }
    if (step === 2) {
      if (!heightCm.trim() || isNaN(parseInt(heightCm))) {
        setError(t("aiPlan.validation.height"));
        return;
      }
      if (!weightKg.trim() || isNaN(parseFloat(weightKg))) {
        setError(t("aiPlan.validation.weight"));
        return;
      }
      if (metricMode === "kfa" && kfa.trim() && isNaN(parseFloat(kfa))) {
        setError(t("aiPlan.validation.fat"));
        return;
      }
      if (metricMode === "htv") {
        if (waistCm.trim() && isNaN(parseFloat(waistCm))) {
          setError(t("aiPlan.validation.waist"));
          return;
        }
        if (hipsCm.trim() && isNaN(parseFloat(hipsCm))) {
          setError(t("aiPlan.validation.hips"));
          return;
        }
        if ((waistCm.trim() && !hipsCm.trim()) || (!waistCm.trim() && hipsCm.trim())) {
          setError(t("aiPlan.validation.whr"));
          return;
        }
      }
    }
    if (step === 3) {
      if (!fitnessGoal) {
        setError(t("aiPlan.validation.goal"));
        return;
      }
      if (!experienceLevel) {
        setError(t("aiPlan.validation.experience"));
        return;
      }
    }
    if (step === 7) {
      if (!trainingStructure) {
        setError(t("aiPlan.validation.structure"));
        return;
      }
      if (trainingStructure === "split" && !trainingSplitDays) {
        setError(t("aiPlan.validation.split"));
        return;
      }
    }
    if (step === 8) {
      if (selectedWeekdays.length < 1) {
        setError(t("aiPlan.validation.day"));
        return;
      }
      if (trainingStructure === "split" && trainingSplitDays && selectedWeekdays.length < trainingSplitDays) {
        setError(t("aiPlan.validation.splitDays", { split: trainingSplitDays, count: trainingSplitDays }));
        return;
      }
      if (!minutesPerSession) {
        setError(t("aiPlan.validation.duration"));
        return;
      }
    }
    if (step === 10) {
      if (!occupation) {
        setError(t("aiPlan.validation.occupation"));
        return;
      }
      if (stressLevel < 1 || stressLevel > 10) {
        setError(t("aiPlan.validation.stress"));
        return;
      }
      if (sleepHours < 4 || sleepHours > 12 || !Number.isInteger(sleepHours * 2)) {
        setError(t("aiPlan.validation.sleep"));
        return;
      }
    }
    if (step === 11) {
      setStep(12);
      return;
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const startGenerationFlow = (options?: { consentGranted?: boolean }) => {
    if (!options?.consentGranted && !hasAiConsent(preferences)) {
      setError(t("aiPlan.validation.consent"));
      setStep(12);
      return;
    }
    setStep(13);
    void runGeneration(options?.consentGranted);
  };

  const handleGrantConsent = async () => {
    setError(null);
    try {
      await updatePreferences({ aiConsent: createAiConsentGrant() }, true);
      startGenerationFlow({ consentGranted: true });
    } catch {
      setError(t("aiPlan.validation.consentSave"));
    }
  };

  const runGeneration = async (consentGranted = false) => {
    if (!user) return;
    if (!consentGranted && !hasAiConsent(preferences)) {
      setError(t("aiPlan.validation.consentRequired"));
      setStep(12);
      return;
    }
    generationStartedAtRef.current = Date.now();
    setGenElapsedSec(0);
    setBusy(true);
    setError(null);

    try {
      const parsedHeight = parseInt(heightCm, 10);
      const parsedWeight = parseFloat(weightKg);
      const parsedKfa = metricMode === "kfa" && kfa ? parseFloat(kfa) : null;
      const parsedWaist = metricMode === "htv" && waistCm ? parseFloat(waistCm) : null;
      const parsedHips = metricMode === "htv" && hipsCm ? parseFloat(hipsCm) : null;
      const parsedHtv = parsedWaist && parsedHips && parsedHips > 0 ? parsedWaist / parsedHips : null;

      const anamnesisObj = {
        painZones,
        trainingLocation,
        homeEquipment: trainingLocation === "home_equipment" ? homeEquipment : [],
        otherSports,
        kfa: parsedKfa,
        waistCm: parsedWaist,
        hipsCm: parsedHips,
        htv: parsedHtv,
        minutesPerSession,
        occupation,
        shiftWork,
        sleepHours,
        stressLevel,
        dietPreference,
        dietAllergies,
        trainingStructure,
        trainingSplitDays: trainingStructure === "split" ? trainingSplitDays : null,
        trainingWeekdays: selectedWeekdays,
        musclePriorities,
      };

      const effectiveWeeklyDays = selectedWeekdays.length;

      const nutrition = buildNutrition({
        gender,
        birthDate: birthDate.trim() || profile?.birth_date,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        fitnessGoal,
        experienceLevel,
        weeklyDays: effectiveWeeklyDays,
        minutesPerSession,
        occupation,
        otherSports,
      });

      const birthDatePromise =
        birthDate.trim() && birthDate.trim() !== profile?.birth_date
          ? updateBirthDate(birthDate.trim())
          : Promise.resolve();

      const [, , , recentSessions] = await Promise.all([
        createBodyMeasurement(user.id, {
          weightKg: parsedWeight,
          bodyFatPct: parsedKfa && !isNaN(parsedKfa) ? parsedKfa : undefined,
          waistCm: parsedWaist && !isNaN(parsedWaist) ? parsedWaist : undefined,
          hipsCm: parsedHips && !isNaN(parsedHips) ? parsedHips : undefined,
          performedAt: new Date().toISOString(),
        }),
        birthDatePromise,
        updatePreferences(
          {
            gender,
            fitnessGoal,
            experienceLevel,
            heightCm: parsedHeight,
            weeklyDays: effectiveWeeklyDays,
            anamnesis: anamnesisObj,
          },
          true,
        ),
        fetchRecentSessionsWithExercises(5).catch((historyErr) => {
          console.warn("Konnte Trainings-Historie nicht laden, fahre ohne fort:", historyErr);
          return [] as Awaited<ReturnType<typeof fetchRecentSessionsWithExercises>>;
        }),
      ]);

      // KI Edge-Function zur Planerstellung aufrufen
      const planId = await generateAndSaveAITrainingPlan(user.id, {
        language,
        gender,
        birthDate: birthDate.trim() || profile?.birth_date,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        fitnessGoal,
        experienceLevel,
        weeklyDays: effectiveWeeklyDays,
        anamnesis: anamnesisObj,
        nutrition,
        recentSessions,
        exerciseFeedback: preferences.exerciseFeedback,
      });

      setGeneratedPlanId(planId);
    } catch (e: any) {
      console.error("Fehler bei der KI-Generierung:", e);
      setError(e.message || t("aiPlan.error.generate"));
      setStep(13);
    } finally {
      setBusy(false);
    }
  };

  // Steps Configuration
  const stepsCount = 14;
  const progressPercent = step === 0 ? 0 : Math.min(100, (step / (stepsCount - 1)) * 100);
  /** Header + Footer fix; nur der Mittelteil scrollt (Step 6 Split-Abfrage etc.). */
  const scrollableMain = step <= 12;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        color: M.fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        ...(breakpoint === "desktop"
          ? { padding: "40px 24px" }
          : {
              paddingTop: 24,
              paddingLeft: 22,
              paddingRight: 22,
              paddingBottom: SCROLL_BOTTOM_PADDING,
            }),
        fontFamily: M.body,
        overflowY: scrollableMain ? "hidden" : "auto",
      }}
    >
      {/* Header und Progressbar */}
      {step < 13 && (
        <div style={{ width: "100%", flexShrink: 0 }}>
          <ScreenBackHeader
            onBack={onBack}
            title={t("aiPlan.title")}
            backAriaLabel={t("aiPlan.cancel")}
            style={{ padding: 0, marginBottom: step > 0 ? 8 : 16 }}
          />
          {step > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>
                {t("aiPlan.step", { current: step, total: stepsCount - 1 })}
              </div>
            </div>
          )}

          {/* Progress Bar Line */}
          {step > 0 && (
            <div style={{ width: "100%", height: 3, background: M.line, borderRadius: 1.5, overflow: "hidden", marginBottom: 24 }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: M.brand,
                  borderRadius: 1.5,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Hauptinhalt */}
      <div
        style={{
          width: "100%",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: scrollableMain ? "flex-start" : "center",
          margin: "12px 0 24px 0",
          overflowY: scrollableMain ? "auto" : undefined,
          WebkitOverflowScrolling: scrollableMain ? "touch" : undefined,
        }}
      >
        {error && (
          <div
            style={{
              background: M.dangerSoft,
              border: "1px solid M.dangerBorder",
              borderRadius: 12,
              padding: "12px 14px",
              color: M.danger,
              fontSize: 13,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 0: Startseite / Intro */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: M.brandSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brand,
                  }}
                >
                  <Icon name="sparkles" size={28} color={M.brand} />
                </div>
              </div>
              <h1 style={{ fontFamily: M.numeric, fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: 0.5, lineHeight: 1.1 }}>
                {t("aiPlan.intro.title")}
              </h1>
              <p style={{ color: M.mut, fontSize: 16, lineHeight: 1.5, margin: "12px 0 0 0" }}>
                {t("aiPlan.intro.description")}
              </p>
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: M.card,
                border: "1px solid " + M.line,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
                {t("aiPlan.intro.includes")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {introBenefits.map((text) => (
                  <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.brand, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ color: M.fg, lineHeight: 1.45 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
                {t("aiPlan.intro.why")}
              </div>
              <p style={{ color: M.mut, fontSize: 13, lineHeight: 1.55, margin: "0 0 8px 0" }}>
                {t("aiPlan.intro.why1")}
              </p>
              <p style={{ color: M.mut, fontSize: 13, lineHeight: 1.55, margin: "0 0 8px 0" }}>
                {t("aiPlan.intro.why2")}
              </p>
              <p style={{ color: M.mut2, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                {t("aiPlan.intro.disclaimer")}
              </p>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "M.line2",
                border: "1px solid " + M.line2,
                textAlign: "left",
              }}
            >
              <p style={{ color: M.mut2, fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {t("aiPlan.intro.dataPrefix", { app: APP_NAME })}{" "}
                <button
                  type="button"
                  onClick={openDatenschutz}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: M.mut,
                    fontSize: "inherit",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                    cursor: "pointer",
                  }}
                >
                  {t("aiConsent.privacy")}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: Profil */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.profile.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.profile.description")}
              </p>
            </div>

            {/* Geschlecht */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.profile.gender")}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setGender("male")} style={tileStyle(gender === "male")}>
                  <span style={{ fontSize: 20 }}>♂</span> {t("aiPlan.profile.male")}
                </button>
                <button type="button" onClick={() => setGender("female")} style={tileStyle(gender === "female")}>
                  <span style={{ fontSize: 20 }}>♀</span> {t("aiPlan.profile.female")}
                </button>
                <button type="button" onClick={() => setGender("other")} style={tileStyle(gender === "other")}>
                  <span style={{ fontSize: 20 }}>⚧</span> {t("aiPlan.profile.other")}
                </button>
              </div>
            </div>

            <BirthDateField value={birthDate} onChange={setBirthDate} />
          </div>
        )}

        {/* STEP 2: Körperwerte */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.body.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.body.description")}
              </p>
            </div>

            {/* Größe & Gewicht */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.body.height")}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder={language === "de" ? "z. B. 180" : "e.g. 180"}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    cm
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.body.weight")}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder={language === "de" ? "z. B. 80,5" : "e.g. 80.5"}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    style={inputStyle}
                    step="0.1"
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    kg
                  </div>
                </div>
              </div>
            </div>

            {/* KFA oder HTV Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.body.metric")}
              </span>
              <div style={{ display: "flex", background: M.card, borderRadius: 12, padding: 4, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setMetricMode("kfa")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background: metricMode === "kfa" ? M.brand : "transparent",
                    color: metricMode === "kfa" ? M.brandInk : M.fg,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: M.display,
                  }}
                >
                  {t("aiPlan.body.fat")}
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("htv")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background: metricMode === "htv" ? M.brand : "transparent",
                    color: metricMode === "htv" ? M.brandInk : M.fg,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: M.display,
                  }}
                >
                  {t("aiPlan.body.whr")}
                </button>
              </div>
            </div>

            {metricMode === "kfa" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.body.fatOptional")}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder={language === "de" ? "z. B. 15" : "e.g. 15"}
                    value={kfa}
                    onChange={(e) => setKfa(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    % KFA
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {t("aiPlan.body.hips")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder={language === "de" ? "z. B. 95" : "e.g. 95"}
                        value={hipsCm}
                        onChange={(e) => setHipsCm(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                        cm
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {t("aiPlan.body.waist")}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder={language === "de" ? "z. B. 85" : "e.g. 85"}
                        value={waistCm}
                        onChange={(e) => setWaistCm(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                        cm
                      </div>
                    </div>
                  </div>
                </div>

                {/* WHR Ergebnis */}
                {(() => {
                  const w = parseFloat(waistCm);
                  const h = parseFloat(hipsCm);
                  if (!isNaN(w) && !isNaN(h) && h > 0) {
                    const ratio = w / h;
                    const classification = getHtvClassification(ratio, gender);
                    return (
                      <div
                        style={{
                          background: M.card,
                          border: "1px solid " + M.line,
                          borderRadius: 12,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <div style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {t("aiPlan.body.calculatedWhr")}
                        </div>
                        <div style={{ fontSize: 32, fontFamily: M.numeric, fontWeight: 800, color: M.fg }}>
                          {ratio.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: classification.color }}>
                          {t(`aiPlan.body.risk.${classification.level}` as "aiPlan.body.risk.low")}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Ziel & Erfahrung */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.goal.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.goal.description")}
              </p>
            </div>

            {/* Fitnessziel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.goal.primary")}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setFitnessGoal("muscle_building")} style={tileStyle(fitnessGoal === "muscle_building")}>
                  <Icon name="bolt" size={20} color={fitnessGoal === "muscle_building" ? M.brand : M.fg} />
                  <span>{t("aiPlan.goal.muscle")}</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fat_loss")} style={tileStyle(fitnessGoal === "fat_loss")}>
                  <Icon name="flame" size={20} color={fitnessGoal === "fat_loss" ? M.brand : M.fg} />
                  <span>{t("aiPlan.goal.fatLoss")}</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fitness")} style={tileStyle(fitnessGoal === "fitness")}>
                  <Icon name="timer" size={20} color={fitnessGoal === "fitness" ? M.brand : M.fg} />
                  <span>{t("aiPlan.goal.fitness")}</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("strength")} style={tileStyle(fitnessGoal === "strength")}>
                  <Icon name="dumbbell" size={20} color={fitnessGoal === "strength" ? M.brand : M.fg} />
                  <span>{t("aiPlan.goal.strength")}</span>
                </button>
              </div>
            </div>

            {/* Erfahrung */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.experience.label")}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("beginner")}
                  style={{ ...listTileStyle(experienceLevel === "beginner"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.experience.beginner")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.experience.beginnerHint")}</div>
                  </div>
                  {experienceLevel === "beginner" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("intermediate")}
                  style={{ ...listTileStyle(experienceLevel === "intermediate"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.experience.intermediate")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.experience.intermediateHint")}</div>
                  </div>
                  {experienceLevel === "intermediate" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("advanced")}
                  style={{ ...listTileStyle(experienceLevel === "advanced"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.experience.advanced")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.experience.advancedHint")}</div>
                  </div>
                  {experienceLevel === "advanced" && <Icon name="check" size={16} color={M.brand} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Muskelgruppen-Priorität */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.muscles.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.muscles.description")}
              </p>
            </div>

            {MUSCLE_GROUP_SECTIONS.map((section) => (
              <div key={section.id}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: M.mut,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {t(section.id === "upper" ? "aiPlan.muscles.upper" : "aiPlan.muscles.lower")}
                </span>
                {section.groups.map((group) => (
                  <MusclePrioritySliderRow
                    key={group}
                    group={group}
                    groupLabel={muscleGroupLabels[group] ?? group}
                    value={musclePriorities[group]}
                    onChange={(value) => setMusclePriorities((prev) => ({ ...prev, [group]: value }))}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* STEP 5: Ernährung */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.diet.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.diet.description")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.diet.label")}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setDietPreference("omnivore")} style={tileStyle(dietPreference === "omnivore")}>
                  <span>{t("aiPlan.diet.omnivore")}</span>
                </button>
                <button type="button" onClick={() => setDietPreference("vegetarian")} style={tileStyle(dietPreference === "vegetarian")}>
                  <span>{t("aiPlan.diet.vegetarian")}</span>
                </button>
                <button type="button" onClick={() => setDietPreference("vegan")} style={tileStyle(dietPreference === "vegan")}>
                  <span>{t("aiPlan.diet.vegan")}</span>
                </button>
                <button type="button" onClick={() => setDietPreference("pescetarian")} style={tileStyle(dietPreference === "pescetarian")}>
                  <span>{t("aiPlan.diet.pescetarian")}</span>
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder={t("aiPlan.diet.allergyPlaceholder")}
                  value={tempAllergy}
                  onChange={(e) => setTempAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAllergy()}
                  style={{ ...inputStyle, textAlign: "left", flex: 1, padding: "10px 12px" }}
                />
                <MButton type="button" onClick={addAllergy} variant="secondary" size="sm" style={{ width: 44, minWidth: 44 }}>
                  +
                </MButton>
              </div>
              {dietAllergies.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dietAllergies.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setDietAllergies((prev) => prev.filter((x) => x !== a))}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 20,
                        border: "1px solid " + M.line,
                        background: M.card,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {a} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Trainingsort */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.location.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.location.description")}
              </p>
            </div>

            {/* Trainingsort */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.location.title")}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" onClick={() => setTrainingLocation("gym")} style={listTileStyle(trainingLocation === "gym")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.location.gym")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.location.gymHint")}</div>
                  </div>
                  {trainingLocation === "gym" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("home_equipment")} style={listTileStyle(trainingLocation === "home_equipment")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.location.home")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.location.homeHint")}</div>
                  </div>
                  {trainingLocation === "home_equipment" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("bodyweight")} style={listTileStyle(trainingLocation === "bodyweight")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t("aiPlan.location.bodyweight")}</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>{t("aiPlan.location.bodyweightHint")}</div>
                  </div>
                  {trainingLocation === "bodyweight" && <Icon name="check" size={16} color={M.brand} />}
                </button>
              </div>
            </div>

            {trainingLocation === "home_equipment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: -8, paddingLeft: 12, borderLeft: "2px solid " + M.brandSoft }}>
                <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.location.equipment")}
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {standardEquipment.map((eq) => {
                    const selected = homeEquipment.includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          setHomeEquipment((prev) =>
                            prev.includes(eq.id) ? prev.filter((id) => id !== eq.id) : [...prev, eq.id]
                          );
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: selected ? `2px solid ${M.brand}` : `1px solid ${M.line}`,
                          background: selected ? M.brandSoft : M.card,
                          color: selected ? M.brand : M.fg,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {eq.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 7: Trainingsstruktur */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.structure.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.structure.description")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.structure.title")}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTrainingStructure("full_body");
                    setTrainingSplitDays(null);
                  }}
                  style={tileStyle(trainingStructure === "full_body")}
                >
                  <span>{t("aiPlan.structure.full")}</span>
                  <span style={{ fontSize: 13, color: M.mut, fontWeight: 500 }}>{t("aiPlan.structure.fullHint")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrainingStructure("split")}
                  style={tileStyle(trainingStructure === "split")}
                >
                  <span>{t("aiPlan.structure.split")}</span>
                  <span style={{ fontSize: 13, color: M.mut, fontWeight: 500 }}>{t("aiPlan.structure.splitHint")}</span>
                </button>
              </div>
            </div>

            {trainingStructure === "split" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.structure.splitSize")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {splitOptions.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setTrainingSplitDays(opt.days)}
                      style={listTileStyle(trainingSplitDays === opt.days)}
                    >
                      <span>
                        {opt.label}
                        <span style={{ display: "block", fontSize: 13, color: M.mut, fontWeight: 500, marginTop: 2 }}>
                          {opt.hint}
                        </span>
                      </span>
                      {trainingSplitDays === opt.days && <Icon name="check" size={18} color={M.brand} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trainingStructure === "full_body" && selectedWeekdays.length > 3 && (
              <p style={{ color: M.mut2, fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {t("aiPlan.structure.fullWarning")}
              </p>
            )}
          </div>
        )}

        {/* STEP 8: Tage & Zeit */}
        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.schedule.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.schedule.description")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.schedule.days")}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {Array.from({ length: 7 }, (_, dayIndex) => trainingWeekdayLabel(dayIndex, locale)).map((label, dayIndex) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleToggleWeekday(dayIndex)}
                    style={{
                      ...tileStyle(selectedWeekdays.includes(dayIndex)),
                      padding: "14px 4px",
                      minWidth: 0,
                    }}
                    aria-label={t(selectedWeekdays.includes(dayIndex) ? "aiPlan.schedule.deselect" : "aiPlan.schedule.select", { day: label })}
                    aria-pressed={selectedWeekdays.includes(dayIndex)}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                  </button>
                ))}
              </div>
              <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                {selectedWeekdays.length === 1
                  ? t("aiPlan.schedule.selectedOne")
                  : t("aiPlan.schedule.selected", { count: selectedWeekdays.length })}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.schedule.duration")}
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setMinutesPerSession(mins)}
                    style={tileStyle(minutesPerSession === mins)}
                  >
                    <span>{t("aiPlan.schedule.minutes", { count: mins })}</span>
                  </button>
                ))}
              </div>
              {experienceLevel && fitnessGoal && (
                <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                  {(() => {
                    const bounds = exerciseCountBounds({
                      minutes: minutesPerSession,
                      experienceLevel,
                      fitnessGoal,
                      anamnesis: { sleepHours, stressLevel },
                      ageYears: ageFromBirthDate(birthDate.trim() || profile?.birth_date),
                    });
                    return t("aiPlan.schedule.exerciseHint", bounds);
                  })()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 9: Schmerzen & Einschränkungen */}
        {step === 9 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.pain.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.pain.description")}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => togglePainZone("knees")}
                style={tileStyle(painZones.includes("knees"))}
              >
                <span>{t("aiPlan.pain.knees")}</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("lower_back")}
                style={tileStyle(painZones.includes("lower_back"))}
              >
                <span>{t("aiPlan.pain.lowerBack")}</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("shoulders")}
                style={tileStyle(painZones.includes("shoulders"))}
              >
                <span>{t("aiPlan.pain.shoulders")}</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("wrists")}
                style={tileStyle(painZones.includes("wrists"))}
              >
                <span>{t("aiPlan.pain.wrists")}</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("neck")}
                style={tileStyle(painZones.includes("neck"))}
              >
                <span>{t("aiPlan.pain.neck")}</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("none")}
                style={tileStyle(painZones.length === 0)}
              >
                <span>{t("aiPlan.pain.none")}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 10: Alltag & Regeneration */}
        {step === 10 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.recovery.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.recovery.description")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.recovery.occupation")}
              </span>
              <button type="button" onClick={() => setOccupation("sedentary")} style={listTileStyle(occupation === "sedentary")}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t("aiPlan.recovery.sedentary")}</div>
                  <div style={{ fontSize: 13, color: M.mut }}>{t("aiPlan.recovery.sedentaryHint")}</div>
                </div>
                {occupation === "sedentary" && <Icon name="check" size={16} color={M.brand} />}
              </button>
              <button type="button" onClick={() => setOccupation("standing")} style={listTileStyle(occupation === "standing")}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t("aiPlan.recovery.standing")}</div>
                  <div style={{ fontSize: 13, color: M.mut }}>{t("aiPlan.recovery.standingHint")}</div>
                </div>
                {occupation === "standing" && <Icon name="check" size={16} color={M.brand} />}
              </button>
              <button type="button" onClick={() => setOccupation("physical")} style={listTileStyle(occupation === "physical")}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t("aiPlan.recovery.physical")}</div>
                  <div style={{ fontSize: 13, color: M.mut }}>{t("aiPlan.recovery.physicalHint")}</div>
                </div>
                {occupation === "physical" && <Icon name="check" size={16} color={M.brand} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShiftWork((v) => !v)}
              style={listTileStyle(shiftWork)}
            >
              <span>{t("aiPlan.recovery.shift")}</span>
              {shiftWork && <Icon name="check" size={16} color={M.brand} />}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.recovery.sleep")}
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setSleepHours((h) => Math.max(4, Math.round((h - 0.5) * 2) / 2))}
                  style={stepperBtnStyle}
                  aria-label={t("aiPlan.recovery.reduceSleep")}
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.brand, fontFamily: M.display }}>{formatSleepHours(sleepHours, locale)}</div>
                  <div style={{ fontSize: 13, color: M.mut }}>{t("aiPlan.recovery.perNight")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSleepHours((h) => Math.min(12, Math.round((h + 0.5) * 2) / 2))}
                  style={stepperBtnStyle}
                  aria-label={t("aiPlan.recovery.increaseSleep")}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.recovery.stress")}
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setStressLevel((s) => Math.max(1, s - 1))}
                  style={stepperBtnStyle}
                  aria-label={t("aiPlan.recovery.reduceStress")}
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.brand, fontFamily: M.display }}>{stressLevel}</div>
                  <div style={{ fontSize: 13, color: M.mut }}>{t("aiPlan.recovery.ofTen")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStressLevel((s) => Math.min(10, s + 1))}
                  style={stepperBtnStyle}
                  aria-label={t("aiPlan.recovery.increaseStress")}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 11: Andere Sportarten */}
        {step === 11 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.label, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("aiPlan.sports.title")}
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                {t("aiPlan.sports.description")}
              </p>
            </div>

            {/* Sportart hinzufügen */}
            <div
              style={{
                background: M.card,
                border: "1px solid " + M.line,
                borderRadius: 16,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder={t("aiPlan.sports.placeholder")}
                  value={tempSport}
                  onChange={(e) => setTempSport(e.target.value)}
                  style={{ ...inputStyle, textAlign: "left", flex: 1, padding: "10px 12px" }}
                />
                <button
                  type="button"
                  onClick={addSport}
                  style={{
                    padding: "0 18px",
                    borderRadius: 12,
                    background: M.brand,
                    color: M.brandInk,
                    border: "none",
                    fontWeight: 700,
                    fontFamily: M.display,
                    cursor: "pointer",
                  }}
                >
                  {t("aiPlan.sports.add")}
                </button>
              </div>

              {/* Frequenz für neue Sportart */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>{t("aiPlan.sports.frequency")}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTempFreq(f)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid " + M.line,
                        background: tempFreq === f ? M.brand : "transparent",
                        color: tempFreq === f ? M.brandInk : M.fg,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {f}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Liste hinzugefügter Sportarten */}
            {otherSports.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("aiPlan.sports.entered")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {otherSports.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: M.card,
                        border: "1px solid " + M.line,
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        {s.sport} <span style={{ color: M.brand, marginLeft: 4 }}>({t("aiPlan.sports.perWeek", { count: s.frequency })})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSport(idx)}
                        style={{ background: "none", border: "none", color: M.danger, cursor: "pointer", padding: 4 }}
                      >
                        {t("aiPlan.sports.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 12: KI-Einwilligung (Anthropic) — explizite Einwilligung vor generate-training-plan */}
        {step === 12 && (
          <AiConsentStep
            onOpenPrivacy={openDatenschutz}
            onAccept={() => void handleGrantConsent()}
            onBack={prevStep}
            showActions
            saving={prefsSaving}
          />
        )}

        {/* STEP 13: Generierung & Fertigstellung */}
        {step === 13 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, textAlign: "center", alignItems: "center" }}>
            {busy ? (
              <>
                {/* Wunderschöne Puls-Animation */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: M.brandSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brand,
                    animation: "pulse 1.8s infinite ease-in-out",
                  }}
                >
                  <Icon name="timer" size={40} color={M.brand} />
                </div>
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255, 0.3); }
                    70% { transform: scale(1); box-shadow: 0 0 0 16px rgba(255,255,255, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255, 0); }
                  }
                `}</style>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontFamily: M.display, fontSize: 24, fontWeight: 400, margin: 0 }}>
                    {t("aiPlan.loading.title")}
                  </h3>
                  <p style={{ color: M.brand, fontWeight: 700, fontSize: 16, margin: 0 }}>
                    {generationLoadingTexts[getGenerationLoadingStep(genElapsedSec)]}
                  </p>
                  <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                    {generationTimeHint}
                  </p>
                </div>
              </>
            ) : generatedPlanId ? (
              <>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: M.brand,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brandInk,
                  }}
                >
                  <Icon name="check" size={44} color={M.brandInk} stroke={3} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontFamily: M.display, fontSize: 28, fontWeight: 400, margin: 0 }}>
                    {t("aiPlan.success.title")}
                  </h3>
                  <p style={{ color: M.mut, fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                    {t("aiPlan.success.description")}
                  </p>
                </div>
                <OneRmPercentInfoCard compact style={{ width: "100%", textAlign: "left" }} />
                <MButton
                  type="button"
                  onClick={() => generatedPlanId && onPlanGenerated(generatedPlanId)}
                  variant="primary"
                  size="md"
                  fullWidth
                  style={{ marginTop: 12 }}
                >
                  {t("aiPlan.success.view")}
                  <Icon name="play" size={18} color={M.brandInk} />
                </MButton>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ color: M.danger, fontWeight: 600 }}>{t("aiPlan.failed")}</p>
                <MButton type="button" onClick={() => void runGeneration(true)} variant="primary" size="md">
                  {t("aiPlan.retry")}
                </MButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer-Navigationsbar */}
      {step === 0 && (
        <div style={{ width: "100%", flexShrink: 0 }}>
          <MButton type="button" onClick={nextStep} variant="primary" size="md" fullWidth>
            {t("aiPlan.start")} <Icon name="chevR" size={16} color={M.brandInk} />
          </MButton>
        </div>
      )}

      {step > 0 && step < 12 && (
        <div style={{ width: "100%", flexShrink: 0, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <MButton type="button" onClick={prevStep} variant="secondary" size="md">
            <Icon name="chevL" size={16} /> {t("aiPlan.back")}
          </MButton>
          <MButton type="button" onClick={nextStep} variant="primary" size="md">
            {t("aiPlan.next")} <Icon name="chevR" size={16} />
          </MButton>
        </div>
      )}
    </div>
  );
}
