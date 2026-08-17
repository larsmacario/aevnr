import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import {
  legacyFitnessGoalForFocus,
  ONBOARDING_VERSION,
  type AevnrFocus,
  usePreferences,
} from "../lib/preferences";
import { Icon } from "../components/Icon";
import { BirthDateField } from "../components/BirthDateField";
import { AppLogo } from "../components/AppLogo";
import { MButton } from "../components/MButton";
import { createBodyMeasurement, saveDailyCheckin } from "../lib/db";
import { recommendHealthspanAction, type CoachRecommendation } from "../lib/healthspan";
import { useBreakpoint, FOOTER_BAR_PADDING_BOTTOM } from "../lib/responsive";
import { detectFactTimezone, FACT_TOPICS, type FactTopic } from "../lib/facts";
import { useI18n } from "../lib/i18n";
import type { AppLanguage } from "../lib/language";
import type { TranslationKey } from "../locales/de";

type OnboardingAction = CoachRecommendation["action"];

export function OnboardingWizard({ onComplete }: { onComplete: (action: OnboardingAction) => void }) {
  const { user, profile, updateDisplayName, updateBirthDate } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { language, setLanguage, t } = useI18n();
  const breakpoint = useBreakpoint();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState<AevnrFocus | null>(null);
  const [secondaryFocus, setSecondaryFocus] = useState<AevnrFocus | null>(null);
  const [weeklyDays, setWeeklyDays] = useState(3);
  const [minutesPerSession, setMinutesPerSession] = useState<number | null>(null);
  const [trainingLocation, setTrainingLocation] = useState<"gym" | "home_equipment" | "bodyweight" | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(6);
  const [stressLevel, setStressLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(6);
  const [factTopics, setFactTopics] = useState<FactTopic[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBirthDate(profile?.birth_date ?? "");
  }, [profile?.display_name, profile?.birth_date]);

  const focusOptions: { id: AevnrFocus; label: string; detail: string; icon: "dumbbell" | "timer" | "bolt" | "flame" }[] = useMemo(() => [
    { id: "strength", label: t("focus.strength"), detail: t("focus.strength.detail"), icon: "dumbbell" },
    { id: "endurance", label: t("focus.endurance"), detail: t("focus.endurance.detail"), icon: "timer" },
    { id: "energy", label: t("focus.energy"), detail: t("focus.energy.detail"), icon: "bolt" },
    { id: "body_composition", label: t("focus.body_composition"), detail: t("focus.body_composition.detail"), icon: "flame" },
  ], [t]);

  const tileStyle = (selected: boolean): React.CSSProperties => ({
    padding: "14px", borderRadius: 14, border: `1px solid ${selected ? M.brand : M.line}`,
    background: selected ? M.cardHi : M.card, color: M.fg, textAlign: "left", cursor: "pointer",
  });

  const validateStep = () => {
    if (step === 1 && (!displayName.trim() || !primaryFocus)) return t("onboarding.validation.profile");
    if (step === 2 && (!minutesPerSession || !trainingLocation)) return t("onboarding.validation.schedule");
    if (step === 5 && factTopics.length === 0) return t("onboarding.validation.topics");
    return null;
  };

  const next = () => {
    const message = validateStep();
    if (message) return setError(message);
    setError(null);
    setStep((current) => current + 1);
  };

  const finish = async () => {
    if (!user || !primaryFocus || !minutesPerSession || !trainingLocation) return;
    setBusy(true);
    setError(null);
    try {
      if (displayName.trim() !== profile?.display_name) {
        const { error: nameError } = await updateDisplayName(displayName.trim());
        if (nameError) throw new Error(nameError);
      }
      if (birthDate.trim() && birthDate.trim() !== profile?.birth_date) {
        const { error: birthDateError } = await updateBirthDate(birthDate.trim());
        if (birthDateError) throw new Error(birthDateError);
      }
      const parsedWeight = weightKg ? Number(weightKg) : null;
      if (parsedWeight && Number.isFinite(parsedWeight)) await createBodyMeasurement(user.id, { weightKg: parsedWeight });
      await saveDailyCheckin(user.id, { sleepHours, sleepQuality, stressLevel, energyLevel });

      await updatePreferences({
        onboarded: true,
        onboardingVersion: ONBOARDING_VERSION,
        primaryFocus,
        secondaryFocus: secondaryFocus === primaryFocus ? null : secondaryFocus,
        factTopics,
        factTimezone: detectFactTimezone(),
        fitnessGoal: legacyFitnessGoalForFocus(primaryFocus!),
        weeklyDays,
        heightCm: heightCm && Number.isFinite(Number(heightCm)) ? Number(heightCm) : null,
        anamnesis: {
          painZones: preferences.anamnesis?.painZones ?? [],
          trainingLocation: trainingLocation!,
          homeEquipment: preferences.anamnesis?.homeEquipment,
          otherSports: preferences.anamnesis?.otherSports ?? [],
          kfa: preferences.anamnesis?.kfa ?? null,
          waistCm: preferences.anamnesis?.waistCm ?? null,
          hipsCm: preferences.anamnesis?.hipsCm ?? null,
          htv: preferences.anamnesis?.htv ?? null,
          minutesPerSession,
          trainingStructure: preferences.anamnesis?.trainingStructure ?? null,
          trainingSplitDays: preferences.anamnesis?.trainingSplitDays ?? null,
          trainingWeekdays: preferences.anamnesis?.trainingWeekdays ?? [],
          occupation: preferences.anamnesis?.occupation ?? null,
          shiftWork: preferences.anamnesis?.shiftWork ?? null,
          sleepHours,
          stressLevel,
          dietPreference: preferences.anamnesis?.dietPreference ?? null,
          dietAllergies: preferences.anamnesis?.dietAllergies ?? [],
          musclePriorities: preferences.anamnesis?.musclePriorities,
        },
      }, true);

      const result = recommendHealthspanAction({
        completedStrengthDays: 0, strengthTargetDays: weeklyDays, zone2Minutes: 0,
        proteinG: 0, proteinTargetG: 100, waterMl: 0, waterTargetMl: 2500,
        checkins: [{ sleepHours, sleepQuality, stressLevel, energyLevel }], primaryFocus,
      }, language);
      setRecommendation(result);
      setStep(6);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("onboarding.error.save"));
    } finally {
      setBusy(false);
    }
  };

  const checkinField = (label: string, value: number, min: number, max: number, setValue: (next: number) => void, suffix = "") => (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, fontWeight: 650 }}><span>{label}</span><span style={{ color: M.brand }}>{value}{suffix}</span></div>
      <input aria-label={label} type="range" min={min} max={max} step={suffix ? 0.5 : 1} value={value} onChange={(event) => setValue(Number(event.target.value))} style={{ width: "100%", accentColor: M.brand }} />
    </label>
  );

  const content = step === 6 && recommendation ? (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 18 }}>
      <AppLogo size={64} />
      <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.complete.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.complete.subtitle")}</p></div>
      <div style={{ padding: 18, borderRadius: 16, background: M.card, border: `1px solid ${M.line}`, textAlign: "left" }}>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700, letterSpacing: 1 }}>{t("onboarding.complete.today")}</div>
        <div style={{ fontFamily: M.display, fontSize: 24, marginTop: 6 }}>{recommendation.title}</div>
        <p style={{ color: M.mut, lineHeight: 1.5, marginBottom: 0 }}>{recommendation.detail}</p>
      </div>
    </div>
  ) : (
    <>
      {step === 0 && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("language.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("language.subtitle")}</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(["de", "en"] as AppLanguage[]).map((option) => <button key={option} type="button" aria-pressed={language === option} onClick={() => void setLanguage(option)} style={{ ...tileStyle(language === option), minHeight: 112, textAlign: "center" }}><div style={{ fontFamily: M.display, fontSize: 28, color: language === option ? M.brand : M.fg }}>{option.toUpperCase()}</div><div style={{ fontWeight: 700, marginTop: 8 }}>{t(`language.name.${option}` as TranslationKey)}</div></button>)}
        </div>
        <p style={{ color: M.mut, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{t("language.detected")}</p>
      </div>}
      {step === 1 && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.focus.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.focus.subtitle")}</p></div>
        <label style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.focus.nameLabel")}</label>
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={t("onboarding.focus.namePlaceholder")} autoFocus style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit" }} />
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.focus.primary")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{focusOptions.map((focus) => <button key={focus.id} type="button" onClick={() => { setPrimaryFocus(focus.id); if (secondaryFocus === focus.id) setSecondaryFocus(null); }} style={tileStyle(primaryFocus === focus.id)}><Icon name={focus.icon} size={19} color={primaryFocus === focus.id ? M.brand : M.fg} /><div style={{ fontWeight: 700, marginTop: 8 }}>{focus.label}</div><div style={{ color: M.mut, fontSize: 12, marginTop: 3 }}>{focus.detail}</div></button>)}</div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.focus.secondary")} <span style={{ fontWeight: 400 }}>({t("common.optional")})</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{focusOptions.filter((focus) => focus.id !== primaryFocus).map((focus) => <MButton key={focus.id} type="button" size="sm" variant={secondaryFocus === focus.id ? "primary" : "secondary"} onClick={() => setSecondaryFocus(secondaryFocus === focus.id ? null : focus.id)}>{focus.label}</MButton>)}</div>
      </div>}
      {step === 2 && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.schedule.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.schedule.subtitle")}</p></div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.schedule.days")}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: M.card, padding: 12, borderRadius: 14, border: `1px solid ${M.line}` }}><MButton type="button" variant="secondary" size="sm" onClick={() => setWeeklyDays(Math.max(1, weeklyDays - 1))}>−</MButton><strong style={{ fontFamily: M.display, fontSize: 28 }}>{t("onboarding.schedule.dayCount", { count: weeklyDays })}</strong><MButton type="button" variant="secondary" size="sm" onClick={() => setWeeklyDays(Math.min(7, weeklyDays + 1))}>+</MButton></div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.schedule.time")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{[30, 45, 60].map((minutes) => <MButton key={minutes} type="button" variant={minutesPerSession === minutes ? "primary" : "secondary"} size="md" onClick={() => setMinutesPerSession(minutes)}>{t("onboarding.schedule.minutes", { count: minutes })}</MButton>)}</div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.schedule.place")}</div>
        <div style={{ display: "grid", gap: 8 }}>{([['gym', t("onboarding.schedule.gym")], ['home_equipment', t("onboarding.schedule.home")], ['bodyweight', t("onboarding.schedule.bodyweight")]] as const).map(([value, label]) => <MButton key={value} type="button" variant={trainingLocation === value ? "primary" : "secondary"} size="md" fullWidth onClick={() => setTrainingLocation(value)}>{label}</MButton>)}</div>
      </div>}
      {step === 3 && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.body.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.body.subtitle")}</p></div>
        <BirthDateField value={birthDate} onChange={setBirthDate} />
        <label style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.body.height")} <span style={{ fontWeight: 400 }}>({t("common.optional")})</span><input type="number" value={heightCm} min="50" max="280" placeholder={t("onboarding.body.heightPlaceholder")} onChange={(event) => setHeightCm(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: "13px 14px", borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit" }} /></label>
        <label style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.body.weight")} <span style={{ fontWeight: 400 }}>({t("common.optional")})</span><input type="number" value={weightKg} min="20" max="300" step="0.1" placeholder={t("onboarding.body.weightPlaceholder")} onChange={(event) => setWeightKg(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: "13px 14px", borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit" }} /></label>
      </div>}
      {step === 4 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.checkin.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.checkin.subtitle")}</p></div>
        {checkinField(t("onboarding.checkin.sleep"), sleepHours, 0, 12, setSleepHours, " h")}
        {checkinField(t("onboarding.checkin.sleepQuality"), sleepQuality, 1, 10, setSleepQuality, "/10")}
        {checkinField(t("onboarding.checkin.stress"), stressLevel, 1, 10, setStressLevel, "/10")}
        {checkinField(t("onboarding.checkin.energy"), energyLevel, 1, 10, setEnergyLevel, "/10")}
      </div>}
      {step === 5 && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div><h1 style={{ margin: 0, fontFamily: M.display, fontSize: 32 }}>{t("onboarding.topics.title")}</h1><p style={{ color: M.mut, lineHeight: 1.5 }}>{t("onboarding.topics.subtitle")}</p></div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 700 }}>{t("onboarding.topics.count", { count: factTopics.length })}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {FACT_TOPICS.map((topic, index) => {
            const selected = factTopics.includes(topic);
            const icon = ["heart", "droplet", "wind", "dumbbell", "bolt", "sparkles", "flame", "book"][index];
            return <button key={topic} type="button" onClick={() => setFactTopics((current) => selected ? current.filter((entry) => entry !== topic) : current.length < 3 ? [...current, topic] : current)} style={{ ...tileStyle(selected), minHeight: 118, textAlign: "center", opacity: !selected && factTopics.length >= 3 ? 0.45 : 1 }}><Icon name={icon} size={24} color={M.fg} /><div style={{ fontWeight: 700, marginTop: 12, lineHeight: 1.2 }}>{t(`fact.${topic}` as TranslationKey)}</div></button>;
          })}
        </div>
      </div>}
    </>
  );

  const pageInsets: React.CSSProperties = breakpoint === "desktop"
    ? { paddingTop: 36, paddingRight: 48, paddingBottom: 32, paddingLeft: 48 }
    : {
        paddingTop: "max(24px, env(safe-area-inset-top, 0px))",
        paddingRight: "max(22px, env(safe-area-inset-right, 0px))",
        paddingBottom: `max(${FOOTER_BAR_PADDING_BOTTOM}, 18px)`,
        paddingLeft: "max(22px, env(safe-area-inset-left, 0px))",
      };

  return <div style={{ width: "100%", height: "100%", minWidth: 0, display: "flex", background: M.bg, color: M.fg, fontFamily: M.body }}>
    <div style={{ width: "100%", maxWidth: 840, minWidth: 0, margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column", ...pageInsets }}>
      <header style={{ flexShrink: 0, marginBottom: 24 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><AppLogo size={32} /><span style={{ color: M.mut, fontSize: 13, fontWeight: 700 }}>{step === 6 ? t("onboarding.ready") : t("onboarding.step", { current: step + 1, total: 6 })}</span></div><div style={{ height: 3, background: M.line, borderRadius: 3 }}><div style={{ width: `${Math.min(100, ((step + 1) / 7) * 100)}%`, height: "100%", background: M.brand, borderRadius: 3, transition: "width .25s ease" }} /></div></header>
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 18 }}>{error ? <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: M.dangerSoft, color: M.danger, fontSize: 13 }}>{error}</div> : null}{content}</main>
      <footer style={{ flexShrink: 0, paddingTop: 12, display: "flex", gap: 10, justifyContent: step > 0 && step < 6 ? "space-between" : "flex-end" }}>{step > 0 && step < 6 ? <MButton type="button" variant="secondary" size="md" disabled={busy} onClick={() => { setError(null); setStep(step - 1); }}>{t("common.back")}</MButton> : null}{step === 6 && recommendation ? <MButton type="button" variant="primary" size="md" onClick={() => onComplete(recommendation.action)}>{t("onboarding.complete.start")} <Icon name="chevR" size={16} /></MButton> : step === 5 ? <MButton type="button" variant="primary" size="md" disabled={busy} onClick={() => void finish()}>{busy ? t("onboarding.saving") : t("onboarding.create")}</MButton> : <MButton type="button" variant="primary" size="md" fullWidth={step === 0} onClick={next}>{t("common.continue")} <Icon name="chevR" size={16} /></MButton>}</footer>
    </div>
  </div>;
}
