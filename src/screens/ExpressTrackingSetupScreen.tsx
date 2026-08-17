import { useEffect, useMemo, useState } from "react";
import type { HistoryEntry } from "../data";
import { M, TYPE } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { MStepper } from "../components/widgets";
import { MSwitch } from "../components/widgets";
import { BottomSheet } from "../components/BottomSheet";
import { AiConsentStep } from "../components/AiConsentStep";
import { ExpressPerformanceBaselineForm } from "../components/ExpressPerformanceBaselineForm";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { SwipeRevealRow } from "../components/SwipeRevealRow";
import { ExerciseListRowDumbbellIcon, ExerciseListRowText } from "../components/ExerciseListRow";
import { generateDailyAiSession, useDailyCheckins, useExercises, fetchRecentExpressTrackingSessions, fetchSessionsSinceWithExercises, saveDailyCheckin } from "../lib/db";
import { useAuth } from "../lib/auth";
import { findCheckinForDate, getTrainingReadiness, type DailyCheckinInput } from "../lib/healthspan";
import { DailyCheckinSheet } from "../components/DailyCheckinSheet";
import { createAiConsentGrant, hasAiConsent, type ExpressPerformanceBaseline, usePreferences } from "../lib/preferences";
import { CONTENT_HORIZONTAL_PADDING, FOOTER_BAR_PADDING_BOTTOM } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { useLocalDateKey } from "../hooks/useLocalDateKey";
import {
  buildExpressTrackingWorkout,
  extractExpressTemplatesFromSession,
  groupExpressTemplatesByMuscleGroup,
  libraryExercisesToExpressTemplates,
  expressImportSkipMessage,
  reducedExpressSetCount,
  type ExpressTrackingExerciseTemplate,
} from "../lib/expressTracking";
import type { Workout } from "../lib/engine";
import type { LibraryExercise } from "../data";
import { useI18n } from "../lib/i18n";

export interface ExpressTrackingSetupScreenProps {
  onBack: () => void;
  onStart: (workout: Workout, healthspanMode?: "reduced" | "ai") => void;
  onStartZone2: (suggestion?: { durationMin: number; device?: string; rationale?: string }) => void;
}

type SetupStep = "coach" | "source" | "sets";

function formatSessionDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ExpressTrackingSetupScreen({ onBack, onStart, onStartZone2 }: ExpressTrackingSetupScreenProps) {
  const { language, locale, t } = useI18n();
  const { user, profile } = useAuth();
  const { preferences, updatePreferences, saving: preferencesSaving } = usePreferences();
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const [step, setStep] = useState<SetupStep>("coach");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualTemplates, setManualTemplates] = useState<ExpressTrackingExerciseTemplate[] | null>(null);
  const [setCount, setSetCount] = useState(preferences.defaultSets);
  const [skipMessage, setSkipMessage] = useState<string | null>(null);
  const [openSwipeRowId, setOpenSwipeRowId] = useState<string | null>(null);
  const [healthspanMode, setHealthspanMode] = useState<"reduced" | "ai" | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const todayCheckinDate = useLocalDateKey();
  const { data: checkins, reload: reloadCheckins } = useDailyCheckins(todayCheckinDate);
  const todayCheckin = useMemo(
    () => findCheckinForDate(checkins, todayCheckinDate),
    [checkins, todayCheckinDate],
  );
  const readiness = getTrainingReadiness(todayCheckin);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPreferences, setAiPreferences] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [aiConsentSheetOpen, setAiConsentSheetOpen] = useState(false);
  const [baselineSheetOpen, setBaselineSheetOpen] = useState(false);
  const [baselineStartsAiSession, setBaselineStartsAiSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetchRecentExpressTrackingSessions(12)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTemplates = manualTemplates ?? [];

  const templateKey = (template: ExpressTrackingExerciseTemplate) =>
    template.catalogExerciseId ?? template.name.trim().toLowerCase();

  const mergeExpressTemplates = (
    base: ExpressTrackingExerciseTemplate[],
    incoming: ExpressTrackingExerciseTemplate[],
  ): ExpressTrackingExerciseTemplate[] => {
    const seen = new Set(base.map(templateKey));
    const merged = [...base];
    for (const template of incoming) {
      const key = templateKey(template);
      if (seen.has(key)) continue;
      merged.push(template);
      seen.add(key);
    }
    return merged;
  };

  const libraryById = useMemo(
    () => new Map((library ?? []).map((ex) => [ex.id, ex])),
    [library],
  );

  const templatesByMuscleGroup = useMemo(
    () => groupExpressTemplatesByMuscleGroup(activeTemplates, libraryById),
    [activeTemplates, libraryById],
  );

  const goToSetsFromSession = (session: HistoryEntry) => {
    const imported = extractExpressTemplatesFromSession(session);
    setSkipMessage(expressImportSkipMessage(imported, language));
    if (imported.templates.length === 0) return;
    setManualTemplates(imported.templates);
    setStep("sets");
  };

  const goToSetsFromManual = (exercises: LibraryExercise[]) => {
    const templates = libraryExercisesToExpressTemplates(exercises);
    if (templates.length === 0) return;
    setManualTemplates(templates);
    setSkipMessage(null);
    setStep("sets");
  };

  const appendTemplatesFromPicker = (exercises: LibraryExercise[]) => {
    const templates = libraryExercisesToExpressTemplates(exercises);
    if (templates.length === 0) return;
    setManualTemplates((prev) => mergeExpressTemplates(prev ?? [], templates));
    setPickerOpen(false);
  };

  const removeTemplate = (template: ExpressTrackingExerciseTemplate) => {
    const key = templateKey(template);
    setManualTemplates((prev) => (prev ?? []).filter((item) => templateKey(item) !== key));
  };
  const updateTemplateSetCount = (template: ExpressTrackingExerciseTemplate, nextSetCount: number) => {
    const key = templateKey(template);
    setManualTemplates((prev) => (prev ?? []).map((item) =>
      templateKey(item) === key ? { ...item, setCount: nextSetCount } : item,
    ));
  };

  const handleStart = () => {
    if (activeTemplates.length === 0) return;
    const workout = buildExpressTrackingWorkout({
      templates: activeTemplates,
      setCount,
      defaultReps: preferences.defaultReps,
    });
    onStart(workout, healthspanMode ?? undefined);
  };

  const stepIndex = step === "coach" ? 1 : step === "source" ? 2 : 3;

  const continueAsPlanned = () => {
    setHealthspanMode(null);
    setSetCount(preferences.defaultSets);
    setStep("source");
  };
  const continueReduced = () => {
    setHealthspanMode("reduced");
    setSetCount(reducedExpressSetCount(preferences.defaultSets));
    setStep("source");
  };
  const saveCheckin = async (input: DailyCheckinInput) => {
    if (!user) return;
    setCheckinBusy(true);
    try { await saveDailyCheckin(user.id, input); setCheckinOpen(false); reloadCheckins(); }
    finally { setCheckinBusy(false); }
  };
  const createAiSession = async (historyForAi: HistoryEntry[], performanceBaseline = preferences.expressPerformanceBaseline) => {
    if (!library?.length) return;
    setAiBusy(true); setAiError(null);
    try {
      const proposal = await generateDailyAiSession({ language: preferences.language, readiness: readiness === "reduce" ? "reduce" : "ready", preferences: aiPreferences, history: historyForAi, exercises: library, profileContext: { birthDate: profile?.birth_date, anamnesis: preferences.anamnesis }, performanceBaseline });
      if (proposal.mode === "zone2") { onStartZone2({ durationMin: proposal.durationMin, device: proposal.device, rationale: proposal.rationale }); return; }
      const byId = new Map(library.map((exercise) => [exercise.id, exercise]));
      const templates: ExpressTrackingExerciseTemplate[] = proposal.exercises.flatMap((item) => {
        const exercise = byId.get(item.catalogExerciseId);
        return exercise ? [{ name: exercise.name, catalogExerciseId: exercise.id, group: exercise.group, note: `${exercise.group} · ${exercise.equip}`, templateReps: item.reps, setCount: Math.max(1, Math.min(4, item.sets)) }] : [];
      });
      if (!templates.length) throw new Error(t("express.ai.noExercises"));
      setManualTemplates(templates); setSetCount(Math.max(1, Math.min(4, proposal.exercises[0]?.sets ?? 2))); setHealthspanMode("ai"); setAiRationale(proposal.rationale); setStep("sets");
    } catch (error) { setAiError(error instanceof Error ? error.message : t("express.ai.failed")); }
    finally { setAiBusy(false); }
  };
  const requestAiSession = async () => {
    if (readiness === "missing") { setAiError(t("express.ai.checkinRequired")); return; }
    if (!user) { setAiError(t("express.ai.loginRequired")); return; }
    if (!hasAiConsent(preferences)) { setAiError(t("express.ai.consentRequired")); return; }
    if (!library?.length) { setAiError(t("express.ai.catalogMissing")); return; }
    try {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const historyForAi = await fetchSessionsSinceWithExercises(since);
      if (historyForAi.length === 0) { setBaselineStartsAiSession(true); setBaselineSheetOpen(true); return; }
      void createAiSession(historyForAi);
    } catch (error) { setAiError(error instanceof Error ? error.message : t("express.ai.failed")); }
  };
  const saveBaselineAndCreateSession = async (baseline: ExpressPerformanceBaseline) => {
    try {
      await updatePreferences({ expressPerformanceBaseline: baseline }, true);
      setBaselineSheetOpen(false);
      if (!baselineStartsAiSession) return;
      setBaselineStartsAiSession(false);
      const since = new Date(); since.setDate(since.getDate() - 30);
      await createAiSession(await fetchSessionsSinceWithExercises(since), baseline);
    } catch (error) { setAiError(error instanceof Error ? error.message : t("express.ai.baselineSaveFailed")); }
  };
  const handleAiConsentToggle = (enabled: boolean) => {
    if (!enabled) {
      void updatePreferences({ aiConsent: null }, true);
      return;
    }
    setAiConsentSheetOpen(true);
  };
  const handleGrantAiConsent = async () => {
    await updatePreferences({ aiConsent: createAiConsentGrant() }, true);
    setAiConsentSheetOpen(false);
  };
  const openPrivacy = () => {
    const base = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");
    window.open(`${base}/datenschutz`, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader
        onBack={step === "sets" ? () => setStep("source") : step === "source" ? () => setStep("coach") : onBack}
        title={t("express.title")}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 ${CONTENT_HORIZONTAL_PADDING}px 24px` }}>
        <div style={{ fontSize: TYPE.bodySm, color: M.mut, marginBottom: 12 }}>{t("express.step", { current: stepIndex, total: 3 })}</div>
        {step === "coach" ? (
          <div style={{ padding: "4px 0" }}>
            <div style={{ fontFamily: M.display, fontSize: TYPE.title, color: M.fg }}>{t("express.coach.title")}</div>
            {readiness === "missing" ? <><p style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5 }}>{t("express.coach.missing")}</p><MButton fullWidth variant="primary" size="md" onClick={() => setCheckinOpen(true)}>{t("express.coach.addCheckin")}</MButton><button type="button" onClick={continueAsPlanned} style={{ width: "100%", border: 0, background: "transparent", color: M.mut, fontSize: TYPE.bodySm, padding: "16px 0", cursor: "pointer" }}>{t("express.coach.withoutCheckin")}</button></> : readiness === "reduce" ? <><p style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5 }}>{t("express.coach.reduce")}</p><div style={{ display: "flex", flexDirection: "column", gap: 10 }}><MButton fullWidth variant="primary" size="md" onClick={continueReduced}>{t("express.coach.lighter")}</MButton><MButton fullWidth variant="secondary" size="md" onClick={() => onStartZone2()}>{t("express.coach.zone2")}</MButton><MButton fullWidth variant="ghost" size="md" onClick={continueAsPlanned}>{t("express.coach.asPlanned")}</MButton></div></> : <><p style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5 }}>{t("express.coach.ready")}</p><MButton fullWidth variant="primary" size="md" onClick={continueAsPlanned}>{t("express.coach.start")}</MButton></>}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${M.line2}` }}><MButton fullWidth variant="secondary" size="md" onClick={() => setAiOpen((open) => !open)}>{t("express.ai.create")}</MButton>{aiOpen ? <div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", marginBottom: 10, borderBottom: `1px solid ${M.line2}` }}><div><div style={{ color: M.fg, fontWeight: 600, fontSize: TYPE.bodySm }}>{t("express.ai.data")}</div><div style={{ marginTop: 3, color: M.mut, fontSize: TYPE.caption }}>{t("express.ai.consent")}</div><div style={{ marginTop: 5, color: M.mut2, fontSize: TYPE.caption, lineHeight: 1.35 }}>{t("express.ai.revokeHint")}</div></div><MSwitch checked={hasAiConsent(preferences)} onChange={handleAiConsentToggle} disabled={preferencesSaving || aiBusy} /></div><MButton type="button" variant="ghost" size="sm" onClick={() => { setBaselineStartsAiSession(false); setBaselineSheetOpen(true); }} style={{ margin: "0 0 8px", paddingLeft: 0 }}>{t("express.ai.baseline")}</MButton><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(["cardio", "bodyweight", "gym", "home", "short", "outdoors"] as const).map((item) => <MButton key={item} variant={aiPreferences.includes(item) ? "primary" : "secondary"} size="sm" disabled={aiBusy} onClick={() => setAiPreferences((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item])}>{t(item === "cardio" ? "express.pref.cardio" : item === "bodyweight" ? "express.pref.bodyweight" : item === "gym" ? "express.pref.gym" : item === "home" ? "express.pref.home" : item === "short" ? "express.pref.short" : "express.pref.outdoors")}</MButton>)}</div><MButton fullWidth variant="primary" size="md" loading={aiBusy} onClick={() => void requestAiSession()} style={{ marginTop: 12 }}>{aiBusy ? t("express.ai.generating") : t("express.ai.start")}</MButton>{aiBusy ? <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: M.mut, fontSize: TYPE.bodySm, lineHeight: 1.4 }}><Icon name="sparkles" size={16} color={M.fg} />{t("express.ai.context")}</div> : null}{aiError ? <div style={{ marginTop: 8, color: M.danger, fontSize: TYPE.bodySm }}>{aiError}</div> : null}</div> : null}</div>
          </div>
        ) : step === "source" ? (
          <>
            <div style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5, marginBottom: 16 }}>
              {t("express.source.description")}
            </div>

            {historyLoading ? (
              <div style={{ color: M.mut, fontSize: TYPE.bodySm, marginBottom: 16 }}>{t("express.history.loading")}</div>
            ) : history.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {history.map((session) => {
                  const imported = extractExpressTemplatesFromSession(session);
                  const eligible = imported.templates.length;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      disabled={eligible === 0}
                      onClick={() => goToSetsFromSession(session)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid " + M.line2,
                        background: M.card,
                        cursor: eligible > 0 ? "pointer" : "default",
                        opacity: eligible > 0 ? 1 : 0.45,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: M.fg, fontWeight: 600, fontSize: TYPE.body }}>{session.name}</div>
                        <div style={{ color: M.mut, fontSize: TYPE.bodySm, marginTop: 2 }}>
                          {formatSessionDate(session.performedAt, locale)} · {t(eligible === 1 ? "express.exercise.count" : "express.exercise.countPlural", { count: eligible })}
                        </div>
                      </div>
                      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "20px 14px",
                  borderRadius: 12,
                  border: "1px dashed " + M.line,
                  color: M.mut,
                  fontSize: TYPE.body,
                  lineHeight: 1.5,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {t("express.history.empty")}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: TYPE.body, color: M.mut, lineHeight: 1.5, marginBottom: 16 }}>
              {t("express.sets.description")}
            </div>

            {skipMessage ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: M.cardHi,
                  border: "1px solid " + M.line2,
                  color: M.mut,
                  fontSize: TYPE.bodySm,
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}
              >
                {skipMessage}
              </div>
            ) : null}
            {aiRationale ? <div style={{ padding: "10px 12px", borderRadius: 10, background: M.cardHi, border: `1px solid ${M.line2}`, color: M.mut, fontSize: TYPE.bodySm, lineHeight: 1.45, marginBottom: 14 }}>{aiRationale}</div> : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 14px",
                borderRadius: 14,
                background: M.card,
                border: "1px solid " + M.line2,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: TYPE.titleSm, color: M.fg }}>{t("express.sets.title")}</div>
                <div style={{ fontSize: TYPE.bodySm, color: M.mut, marginTop: 4 }}>{t("express.sets.default", { count: preferences.defaultSets })}</div>
              </div>
              <MStepper value={setCount} min={1} max={10} onChange={setSetCount} />
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: M.cardHi,
                border: "1px solid " + M.line2,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: TYPE.caption, fontWeight: 700, letterSpacing: 1, color: M.mut, marginBottom: 8 }}>
                {t("express.summary")}
              </div>
              <div style={{ color: M.fg, fontWeight: 600, fontSize: TYPE.body, marginBottom: 12 }}>
                {t("express.summary.value", { exercises: t(activeTemplates.length === 1 ? "express.exercise.count" : "express.exercise.countPlural", { count: activeTemplates.length }), sets: activeTemplates.reduce((total, item) => total + (item.setCount ?? setCount), 0) })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {templatesByMuscleGroup.map(({ group, templates }, groupIndex) => (
                  <div key={group}>
                    <div
                      style={{
                        fontSize: TYPE.caption,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: M.mut,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {group}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {templates.map((template, templateIndex) => {
                        const rowId = templateKey(template);
                        return (
                        <SwipeRevealRow
                          key={rowId}
                          rowId={rowId}
                          openRowId={openSwipeRowId}
                          onOpenRowIdChange={setOpenSwipeRowId}
                          onDelete={() => removeTemplate(template)}
                          deleteAriaLabel={t("express.removeExercise", { name: template.name })}
                          showSwipeHint={
                            !libraryLoading && groupIndex === 0 && templateIndex === 0
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              height: "100%",
                              padding: `0 12px`,
                              boxSizing: "border-box",
                            }}
                          >
                            <ExerciseListRowDumbbellIcon />
                            <ExerciseListRowText title={template.name} />
                            <MStepper value={template.setCount ?? setCount} min={1} max={10} onChange={(next) => updateTemplateSetCount(template, next)} />
                          </div>
                        </SwipeRevealRow>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <MButton
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setPickerOpen(true)}
                style={{
                  marginTop: 12,
                  border: "1.5px dashed " + M.line,
                  color: M.fg,
                  fontFamily: M.label,
                  letterSpacing: 0.3,
                  fontSize: TYPE.bodySm,
                }}
              >
                <Icon name="plus" size={14} stroke={2.6} /> {t("express.addExercise")}
              </MButton>
            </div>
          </>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: `10px ${CONTENT_HORIZONTAL_PADDING}px 0`,
          paddingBottom: FOOTER_BAR_PADDING_BOTTOM,
          borderTop: "1px solid " + M.line2,
        }}
      >
        {step === "coach" ? null : step === "source" ? (
          <MButton
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setPickerOpen(true)}
            style={{ fontFamily: M.label, letterSpacing: 0.3 }}
          >
            <Icon name="plus" size={16} stroke={2.4} /> {t("express.selectExercises")}
          </MButton>
        ) : step === "sets" ? (
          <MButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={handleStart}
            disabled={activeTemplates.length === 0}
            style={{ fontFamily: M.label, fontWeight: 700, letterSpacing: 0.4 }}
          >
            {t("express.startWorkout")}
          </MButton>
        ) : null}
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={() => {}}
        onSelectMultiple={step === "sets" ? appendTemplatesFromPicker : goToSetsFromManual}
        mode="multi"
        expressTrackingOnly
        library={library ?? []}
        loading={libraryLoading}
        title={step === "sets" ? t("express.picker.add") : t("express.picker.choose")}
        allowCreate
        onLibraryChange={reloadExercises}
      />
      <DailyCheckinSheet open={checkinOpen} current={todayCheckin} busy={checkinBusy} onClose={() => setCheckinOpen(false)} onSave={saveCheckin} />
      <BottomSheet open={aiConsentSheetOpen} onClose={() => setAiConsentSheetOpen(false)} position="absolute" zIndex={40} aria-label={t("express.consentAria")}>
        <AiConsentStep onOpenPrivacy={openPrivacy} onAccept={() => void handleGrantAiConsent()} onBack={() => setAiConsentSheetOpen(false)} showActions saving={preferencesSaving} />
      </BottomSheet>
      <BottomSheet open={baselineSheetOpen} onClose={() => setBaselineSheetOpen(false)} position="absolute" zIndex={40} aria-label={t("express.baselineAria")}>
        <ExpressPerformanceBaselineForm baseline={preferences.expressPerformanceBaseline} onSave={saveBaselineAndCreateSession} onCancel={() => { setBaselineStartsAiSession(false); setBaselineSheetOpen(false); }} saving={preferencesSaving || aiBusy} />
      </BottomSheet>
    </div>
  );
}
