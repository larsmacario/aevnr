import { useEffect, useMemo, useState } from "react";
import { brandSurface, displayStyle, labelStyle, M } from "../theme";
import { planDayDisplayName } from "../data";
import {
  getCurrentCalendarWeek,
  getCurrentWeekKey,
  getPlanDayIndexForIsoWeekday,
  getPlanTrainingWeekdays,
  getTodayIsoWeekday,
  weekdayLabelsFromTrainingWeekdays,
} from "../lib/trainingWeekdays";
import { useAuth } from "../lib/auth";
import {
  type ActiveWorkoutDraft,
  getActiveDurationSec,
  getDraftMetrics,
} from "../lib/activeWorkout";
import { fmtUp } from "../lib/engine";
import {
  createWaterLog,
  sumProteinToday,
  sumWaterToday,
  useActivePlan,
  useHomeStats,
  useProteinLogsSince,
  useProteinLogsToday,
  useSessions,
  useWaterLogsLastSevenDays,
  useWaterLogsToday,
  useWeeklyVolume,
  saveDailyCheckin,
  fetchSessionsSinceWithExercises,
  generateDailyAiHealthspanRecommendation,
  useDailyCheckins,
  useMetabolicLogs,
} from "../lib/db";
import { computeRecoveryContext, computeWeeklyRecoveryStats, aggregateProteinByWeekday, getWeekStartMonday } from "../lib/recoveryEngine";
import { useRecoveryTargets } from "../lib/recoveryTarget";
import { aggregateWaterLastSevenDays, formatWaterAmount, getRollingSevenDayStart, shouldShowHydrationHint, toLocalDateKey } from "../lib/hydration";
import { useNetwork } from "../lib/offline/networkStatus";
import { useLocalDateKey } from "../hooks/useLocalDateKey";
import { Icon } from "../components/Icon";
import { ScreenScroll } from "../components/ScreenScroll";
import { hasAiConsent, usePreferences } from "../lib/preferences";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { MStat } from "../components/widgets";
import { MButton } from "../components/MButton";
import { UserAvatar } from "../components/UserAvatar";
import { WeekPlannerSheet } from "../components/WeekPlannerSheet";
import { AlertSheet } from "../components/AlertSheet";
import { DailyCheckinSheet } from "../components/DailyCheckinSheet";
import { DashboardCoach, HealthspanDashboard } from "../components/HealthspanDashboard";
import { PersonalQuickActions, type PersonalQuickAction } from "../components/PersonalQuickActions";
import { buildHealthspanDomains, checkinFingerprint, findCheckinForDate, normalizeDailyCheckin, recommendHealthspanAction } from "../lib/healthspan";
import { prioritizeDashboard } from "../lib/dashboardPersonalization";
import { selectDashboardQuickActions } from "../lib/dashboardQuickActions";

export interface HomeScreenProps {
  onStart: (planDayId: string, planId?: string) => void;
  activeWorkout?: ActiveWorkoutDraft | null;
  onResumeActive: () => void;
  onSaveActive: (draft: ActiveWorkoutDraft) => void | Promise<void>;
  onDiscardActive: () => void;
  onOpenPlans: () => void;
  onOpenTimer: () => void;
  onOpenBreathing: () => void;
  onOpenProfile: () => void;
  onOpenStats: () => void;
  onOpenCalculator: () => void;
  onOpenBodyTracker: () => void;
  onOpenRecovery: (section?: "protein" | "water" | "checkin") => void;
  onOpenMetabolism: () => void;
  onOpenExpress: () => void;
  refreshKey?: number;
  trackLoading?: boolean;
}

export function HomeScreen({
  onStart,
  activeWorkout,
  onResumeActive,
  onSaveActive,
  onDiscardActive,
  onOpenPlans,
  onOpenTimer,
  onOpenBreathing,
  onOpenProfile,
  onOpenStats,
  onOpenCalculator,
  onOpenBodyTracker,
  onOpenRecovery,
  onOpenMetabolism,
  onOpenExpress,
  refreshKey = 0,
  trackLoading,
}: HomeScreenProps) {
  const { profile, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { isOnline } = useNetwork();
  const { data: activePlan, loading: planLoading, reload: reloadPlan, isStale: planStale } = useActivePlan();
  const { data: week, reload: reloadWeek } = useWeeklyVolume();
  const { data: stats, reload: reloadStats } = useHomeStats();
  const { data: proteinLogsToday, reload: reloadProteinLogs } = useProteinLogsToday(refreshKey);
  const [waterRefreshKey, setWaterRefreshKey] = useState(0);
  const {
    data: waterLogsToday,
    loading: waterLogsLoading,
    error: waterLogsError,
    reload: reloadWaterLogs,
  } = useWaterLogsToday(refreshKey + waterRefreshKey);
  const { data: waterLogsWeek, reload: reloadWaterWeek } = useWaterLogsLastSevenDays(refreshKey + waterRefreshKey);
  const { proteinTargetG, waterTargetMl, loading: recoveryTargetsLoading } = useRecoveryTargets();
  const weekStartMonday = useMemo(() => getWeekStartMonday(), []);
  const { data: proteinLogsWeek } = useProteinLogsSince(weekStartMonday, refreshKey);
  const { data: sessions } = useSessions();
  const todayCheckinDate = useLocalDateKey();
  const { data: dailyCheckins, reload: reloadDailyCheckins } = useDailyCheckins(todayCheckinDate, refreshKey);
  const metabolicSince = useMemo(() => getRollingSevenDayStart().toISOString(), []);
  const { data: metabolicLogs, reload: reloadMetabolicLogs } = useMetabolicLogs(metabolicSince, refreshKey);
  const todayCheckin = useMemo(
    () => findCheckinForDate(dailyCheckins, todayCheckinDate),
    [dailyCheckins, todayCheckinDate],
  );
  const metabolicLoggedToday = useMemo(
    () => (metabolicLogs ?? []).some((log) => toLocalDateKey(new Date(log.loggedAt)) === todayCheckinDate),
    [metabolicLogs, todayCheckinDate],
  );
  const [finishSheet, setFinishSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [loggedRecoveryLabel, setLoggedRecoveryLabel] = useState<string | null>(null);
  const [proteinRefreshKey, setProteinRefreshKey] = useState(0);
  const { data: proteinLogsForFinish, reload: reloadProteinForFinish } = useProteinLogsToday(proteinRefreshKey);
  const [durationSec, setDurationSec] = useState(0);
  const [selectedIsoWeekday, setSelectedIsoWeekday] = useState(() => getTodayIsoWeekday());
  const [weekPlannerOpen, setWeekPlannerOpen] = useState(false);
  const [aiRecommendationBusy, setAiRecommendationBusy] = useState(false);
  const [hydrationBusy, setHydrationBusy] = useState(false);
  const [hydrationAlert, setHydrationAlert] = useState<string | null>(null);
  const [hydrationNow, setHydrationNow] = useState(() => new Date());
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinAlert, setCheckinAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setDurationSec(getActiveDurationSec(activeWorkout.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setHydrationNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeMetrics = activeWorkout ? getDraftMetrics(activeWorkout) : null;

  useEffect(() => {
    reloadPlan();
    reloadWeek();
    reloadStats();
    reloadProteinLogs();
    reloadWaterLogs();
    reloadWaterWeek();
    reloadDailyCheckins();
    reloadMetabolicLogs();
  }, [refreshKey, reloadPlan, reloadWeek, reloadStats, reloadProteinLogs, reloadWaterLogs, reloadWaterWeek, reloadDailyCheckins, reloadMetabolicLogs]);

  useEffect(() => {
    if (finishSheet) {
      setRecoveryDismissed(false);
      setLoggedRecoveryLabel(null);
      reloadProteinForFinish();
    }
  }, [finishSheet, reloadProteinForFinish]);

  useEffect(() => {
    setSelectedIsoWeekday(getTodayIsoWeekday());
  }, [activePlan?.id]);

  const displayName = profile?.display_name ?? "Athlet";
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  const weekData = week ?? [];
  const maxV = Math.max(...weekData.map((w) => w.v), 1);
  const proteinWeekData = useMemo(
    () => aggregateProteinByWeekday(proteinLogsWeek ?? []),
    [proteinLogsWeek],
  );
  const maxProteinV = Math.max(...proteinWeekData.map((w) => w.v), proteinTargetG, 1);
  const proteinChartBarHeight = 64;
  const proteinGoalLineBottom =
    proteinTargetG > 0 ? (proteinTargetG / maxProteinV) * proteinChartBarHeight : 0;
  const showProteinGoalLine = proteinTargetG > 0 && proteinGoalLineBottom >= 2;
  const waterWeekData = useMemo(
    () => aggregateWaterLastSevenDays(waterLogsWeek ?? []),
    [waterLogsWeek],
  );
  const maxWaterV = Math.max(...waterWeekData.map((day) => day.amountMl), waterTargetMl, 1);
  const waterChartBarHeight = 64;
  const waterGoalLineBottom =
    waterTargetMl > 0 ? (waterTargetMl / maxWaterV) * waterChartBarHeight : 0;
  const showWaterGoalLine = waterTargetMl > 0 && waterGoalLineBottom >= 2;
  const todayChartIdx = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);
  const planTrainingWeekdays = activePlan ? getPlanTrainingWeekdays(activePlan) : undefined;
  const weekdayLabels = weekdayLabelsFromTrainingWeekdays(planTrainingWeekdays);
  const calendarWeek = useMemo(
    () => getCurrentCalendarWeek(planTrainingWeekdays),
    [planTrainingWeekdays],
  );
  const hasTrainingWeekdays = (planTrainingWeekdays?.length ?? 0) > 0;
  const selectedPlanDayIndex =
    activePlan && activePlan.days.length > 0
      ? getPlanDayIndexForIsoWeekday(
          selectedIsoWeekday,
          planTrainingWeekdays,
          activePlan.days.length,
        )
      : null;
  const selectedPlanDay =
    activePlan && selectedPlanDayIndex !== null
      ? (activePlan.days[selectedPlanDayIndex] ?? null)
      : null;
  const selectedCalendarDay = calendarWeek.find((d) => d.isoWeekday === selectedIsoWeekday);
  const isSelectedToday = selectedCalendarDay?.isToday ?? false;
  const selectedDateLabel =
    selectedCalendarDay && !isSelectedToday
      ? selectedCalendarDay.date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : null;
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);
  const healthspan = useMemo(() => {
    const inCurrentWeek = (sessions ?? []).filter((session) => new Date(session.performedAt) >= weekStartMonday);
    const zone2Sessions = inCurrentWeek.filter((session) => /zone\s*2|grundlage/i.test(`${session.name} ${session.tags.join(" ")}`));
    const strengthSessions = inCurrentWeek.filter((session) => !zone2Sessions.includes(session));
    const input = {
      completedStrengthDays: new Set(strengthSessions.map((session) => toLocalDateKey(new Date(session.performedAt)))).size,
      strengthTargetDays: Math.max(1, activePlan?.days.length ?? 3),
      zone2Minutes: zone2Sessions.reduce((sum, session) => sum + session.dur, 0),
      proteinG: sumProteinToday(proteinLogsToday ?? []), proteinTargetG,
      waterMl: sumWaterToday(waterLogsToday ?? []), waterTargetMl,
      metabolicLogCount: metabolicLogs?.length ?? 0,
      metabolicLoggedToday,
      checkins: todayCheckin ? [todayCheckin] : [],
      primaryFocus: preferences.primaryFocus,
      secondaryFocus: preferences.secondaryFocus,
    };
    return { input, domains: buildHealthspanDomains(input), recommendation: recommendHealthspanAction(input) };
  }, [sessions, weekStartMonday, activePlan?.days.length, proteinLogsToday, proteinTargetG, waterLogsToday, waterTargetMl, metabolicLogs, metabolicLoggedToday, todayCheckin, preferences.primaryFocus, preferences.secondaryFocus]);
  const dashboardFocus = preferences.dashboard.focusOverride ?? preferences.primaryFocus;
  const dashboardPriority = useMemo(() => prioritizeDashboard({
    focus: dashboardFocus,
    autoPrioritize: preferences.dashboard.autoPrioritize,
    isTrainingDay: isSelectedToday && !!selectedPlanDay,
    lowReadiness: !!todayCheckin && (todayCheckin.sleepQuality <= 4 || todayCheckin.stressLevel >= 8 || todayCheckin.energyLevel <= 3),
    proteinBehind: proteinTargetG > 0 && sumProteinToday(proteinLogsToday ?? []) < proteinTargetG * 0.45,
    waterBehind: waterTargetMl > 0 && sumWaterToday(waterLogsToday ?? []) < waterTargetMl * 0.35,
    zone2Behind: healthspan.input.zone2Minutes < 90,
  }), [dashboardFocus, preferences.dashboard.autoPrioritize, isSelectedToday, selectedPlanDay, todayCheckin, proteinTargetG, proteinLogsToday, waterTargetMl, waterLogsToday, healthspan.input.zone2Minutes]);

  const cachedRecommendation = useMemo(() => {
    const latest = todayCheckin;
    const cached = preferences.dailyHealthspanRecommendation;
    if (!latest || !cached || cached.checkinDate !== latest.checkinDate) return null;
    return cached.checkinFingerprint === checkinFingerprint(latest) ? cached : null;
  }, [todayCheckin, preferences.dailyHealthspanRecommendation]);

  const handleSaveDailyCheckin = async (input: import("../lib/healthspan").DailyCheckinInput) => {
    if (!user) return;
    setCheckinBusy(true);
    try {
      const normalized = normalizeDailyCheckin(input);
      await saveDailyCheckin(user.id, normalized);
      setCheckinOpen(false);
      reloadDailyCheckins();
      if (isOnline && hasAiConsent(preferences)) {
        setAiRecommendationBusy(true);
        void (async () => {
          try {
            const since = new Date(); since.setDate(since.getDate() - 30);
            const recommendation = await generateDailyAiHealthspanRecommendation({
              checkin: normalized,
              week: { ...healthspan.input, zone2TargetMinutes: 150 },
              history: await fetchSessionsSinceWithExercises(since),
              activePlan: activePlan ? { name: activePlan.name, dayNames: activePlan.days.map((day) => planDayDisplayName(day, weekdayLabels)) } : null,
            });
            await updatePreferences({ dailyHealthspanRecommendation: { ...recommendation, version: 1, checkinDate: normalized.checkinDate!, checkinFingerprint: checkinFingerprint(normalized), createdAt: new Date().toISOString() } }, true);
          } catch {
            // Die erklärbare Regel-Empfehlung bleibt sichtbar.
          } finally { setAiRecommendationBusy(false); }
        })();
      }
    }
    catch (cause) { setCheckinAlert(cause instanceof Error ? cause.message : "Check-in konnte nicht gespeichert werden."); }
    finally { setCheckinBusy(false); }
  };
  const isSunday = getTodayIsoWeekday() === 6;
  const weekPlannerDismissed = preferences.weekPlannerDismissedWeek === currentWeekKey;
  const showWeekPlannerCard = !!activePlan && isSunday && !weekPlannerDismissed;
  const recoveryWeekDismissed = preferences.recoveryWeekDismissedWeek === currentWeekKey;
  const weeklyRecoveryStats = useMemo(
    () =>
      computeWeeklyRecoveryStats(
        (sessions ?? []).map((s) => s.performedAt),
        (proteinLogsWeek ?? []).map((log) => log.loggedAt),
      ),
    [sessions, proteinLogsWeek],
  );
  const showRecoveryWeekCard =
    isSunday && !recoveryWeekDismissed && weeklyRecoveryStats.trainingDays > 0;

  const dismissRecoveryWeekCard = () => {
    updatePreferences({ recoveryWeekDismissedWeek: currentWeekKey });
  };

  const proteinLoggedTodayG = useMemo(() => sumProteinToday(proteinLogsToday ?? []), [proteinLogsToday]);
  const waterLoggedTodayMl = useMemo(() => sumWaterToday(waterLogsToday ?? []), [waterLogsToday]);
  const showHydrationHint =
    !waterLogsLoading &&
    !waterLogsError &&
    !recoveryTargetsLoading &&
    shouldShowHydrationHint({
      now: hydrationNow,
      loggedMl: waterLoggedTodayMl,
      targetMl: waterTargetMl,
      dismissedDate: preferences.hydrationHintDismissedDate,
      isOnline,
    });

  const addWaterFromHint = async () => {
    if (!user || hydrationBusy) return;
    setHydrationBusy(true);
    try {
      await createWaterLog(user.id, { amountMl: 250, source: "home_hint" });
      setWaterRefreshKey((key) => key + 1);
      reloadWaterLogs();
    } catch (cause) {
      setHydrationAlert(cause instanceof Error ? cause.message : "Wasser konnte nicht gespeichert werden.");
    } finally {
      setHydrationBusy(false);
    }
  };

  const dismissHydrationHint = () => {
    updatePreferences({ hydrationHintDismissedDate: toLocalDateKey() }, true);
  };

  const draftRecoveryContext = useMemo(() => {
    if (!activeWorkout || !activeMetrics) return null;
    return computeRecoveryContext({
      doneSets: activeMetrics.doneSets,
      volumeKg: activeMetrics.volumeKg,
      blockTypes: activeWorkout.session.exercises.map((e) => e.blockType ?? "strength"),
      proteinLoggedTodayG: sumProteinToday(proteinLogsForFinish ?? []),
      proteinTargetG,
    });
  }, [activeWorkout, activeMetrics, proteinLogsForFinish, proteinTargetG]);

  const handleRecoveryLogged = (label: string) => {
    setLoggedRecoveryLabel(label);
  };

  const handleRecoveryRefresh = () => {
    setProteinRefreshKey((k) => k + 1);
    reloadProteinLogs();
  };

  const finishRecovery =
    finishSheet &&
    !recoveryDismissed &&
    draftRecoveryContext?.showPostWorkoutBlock &&
    user
      ? {
          sessionLine: draftRecoveryContext.sessionSummaryLine,
          remainingG: draftRecoveryContext.remainingG,
          suggestionPresetIds: draftRecoveryContext.postWorkoutSuggestions.map((s) => s.presetId),
          userId: user.id,
          onLogged: handleRecoveryLogged,
          onRefresh: handleRecoveryRefresh,
          onDismiss: () => setRecoveryDismissed(true),
          loggedSuggestionLabel: loggedRecoveryLabel,
        }
      : null;

  const dismissWeekPlannerCard = () => {
    updatePreferences({ weekPlannerDismissedWeek: currentWeekKey });
  };

  const handleWeekPlannerSaved = async () => {
    updatePreferences({ weekPlannerDismissedWeek: currentWeekKey });
    await reloadPlan();
  };

  const handleSaveActive = async (feedback: Record<string, { rating: "like" | "dislike" | "pain" }>) => {
    if (!activeWorkout) return;
    setSaving(true);
    try {
      if (Object.keys(feedback).length > 0) {
        const nextFeedback = { ...(preferences.exerciseFeedback || {}) };
        for (const [name, val] of Object.entries(feedback)) {
          nextFeedback[name] = val;
        }
        updatePreferences({ exerciseFeedback: nextFeedback });
      }
      await onSaveActive(activeWorkout);
      setFinishSheet(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardActive = () => {
    setFinishSheet(false);
    onDiscardActive();
  };

  const activeWorkoutCard =
    activeWorkout && activeMetrics ? (
      <div
        style={{
          marginTop: 18,
          padding: "18px 18px 16px",
          position: "relative",
          overflow: "hidden",
          ...brandSurface("hero"),
        }}
      >
        <div style={{ ...labelStyle(), marginBottom: 8 }}>Aktives Workout · {fmtUp(durationSec)}</div>
        <div style={{ ...displayStyle(26), marginTop: 4 }}>{activeWorkout.session.name}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            fontSize: 14,
            color: M.mut,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: M.brand }}>
            <Icon name="dumbbell" size={15} stroke={2} color={M.brand} />
            {activeMetrics.doneSets}/{activeMetrics.totalSets} Sätze
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: M.brand }}>
            <Icon name="bolt" size={15} stroke={2} color={M.brand} />
            {(activeMetrics.volumeKg / 1000).toFixed(1)}t
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <MButton onClick={onResumeActive} variant="primary" size="md" style={{ flex: 1 }}>
            <Icon name="play" size={16} color={M.brandInk} /> Fortsetzen
          </MButton>
          <MButton onClick={() => setFinishSheet(true)} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
            Beenden
          </MButton>
        </div>
      </div>
    ) : null;

  const weekPlannerCard = showWeekPlannerCard ? (
    <div
      style={{
        marginTop: 18,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        ...brandSurface("hero"),
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 4 }}>Neue Woche</div>
      <div style={{ ...displayStyle(24), marginTop: 4 }}>Bereit für die Woche?</div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.45 }}>
        Plane jetzt deine Trainingstage — ordne deine Workouts den Wochentagen zu und starte motiviert in die neue Woche.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton onClick={() => setWeekPlannerOpen(true)} variant="primary" size="md" style={{ flex: 1 }}>
          Woche planen
        </MButton>
        <MButton onClick={dismissWeekPlannerCard} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
          Später
        </MButton>
      </div>
    </div>
  ) : null;

  const recoveryWeekCard = showRecoveryWeekCard ? (
    <div
      style={{
        marginTop: 18,
        padding: "18px 18px 16px",
        borderRadius: 20,
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 4 }}>Recovery</div>
      <div style={{ ...displayStyle(24), marginTop: 4 }}>
        Diese Woche: {weeklyRecoveryStats.loggedDays} von {weeklyRecoveryStats.trainingDays} Trainingstagen
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.45 }}>
        {weeklyRecoveryStats.loggedDays >= weeklyRecoveryStats.trainingDays
          ? "Stark — du bist auf Kurs."
          : "Nach dem Training reicht oft ein Tap im Finish-Dialog."}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton onClick={() => onOpenRecovery("protein")} variant="primary" size="md" style={{ flex: 1 }}>
          Recovery öffnen
        </MButton>
        <MButton onClick={dismissRecoveryWeekCard} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
          Ausblenden
        </MButton>
      </div>
    </div>
  ) : null;

  const todayCard = planLoading && !activePlan ? (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...labelStyle(), marginBottom: 4 }}>Heute geplant</div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 4 }}>Plan wird geladen…</div>
    </div>
  ) : !activePlan ? (
    <div
      style={{
        marginTop: 16,
        borderRadius: 20,
        padding: "18px 18px 16px",
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 4 }}>Heute geplant</div>
      <div style={{ ...displayStyle(24), marginTop: 4 }}>Kein aktiver Plan</div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
        Erstelle einen Trainingsplan und lege pro Tag deine Übungen fest.
      </div>
      <MButton onClick={onOpenPlans} variant="primary" size="md" fullWidth style={{ marginTop: 16 }}>
        <Icon name="layers" size={16} color={M.brandInk} /> Plan erstellen
      </MButton>
    </div>
  ) : !selectedPlanDay ? (
    <div
      style={{
        marginTop: 16,
        borderRadius: 20,
        padding: "18px 18px 16px",
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 4 }}>Heute geplant</div>
      <div style={{ ...displayStyle(24), marginTop: 4 }}>Kein Training an diesem Tag</div>
      {selectedDateLabel ? (
        <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>{selectedDateLabel}</div>
      ) : (
        <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
          Wähle einen Trainingstag in der Woche oben.
        </div>
      )}
    </div>
  ) : (
    <div
      style={{
        marginTop: 16,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        ...brandSurface("hero"),
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 4 }}>
        {activePlan.name} · Tag {(selectedPlanDayIndex ?? 0) + 1}
      </div>
      {selectedDateLabel ? (
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 500, marginTop: 4 }}>{selectedDateLabel}</div>
      ) : null}
      <div style={{ ...displayStyle(24), marginTop: selectedDateLabel ? 6 : 4 }}>
        {planDayDisplayName(selectedPlanDay, weekdayLabels)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 14,
          fontSize: 14,
          color: M.mut,
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
          {selectedPlanDay.exercises?.length ?? 0} Übung{(selectedPlanDay.exercises?.length ?? 0) === 1 ? "" : "en"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton
          disabled={trackLoading || selectedPlanDay.exercises.length === 0}
          onClick={() => onStart(selectedPlanDay.id, activePlan.id)}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
        >
          <Icon name="play" size={16} color={M.brandInk} /> Training starten
        </MButton>
      </div>
    </div>
  );

  const weekStrip = (
    <div
      style={{
        marginTop: 14,
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: 18,
        padding: "15px 16px 14px",
      }}
    >
      <div style={{ ...labelStyle(), marginBottom: 12 }}>Diese Woche</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {calendarWeek.map((day) => {
          const isSelected = selectedIsoWeekday === day.isoWeekday;
          return (
            <MButton
              key={day.isoWeekday}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIsoWeekday(day.isoWeekday)}
              aria-label={`${day.weekdayLabel}, ${day.dateNumber}.`}
              aria-pressed={isSelected}
              style={{
                flex: 1,
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                height: "auto",
                minHeight: 0,
                padding: "4px 0",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: hasTrainingWeekdays && day.isTrainingDay ? M.brand : "transparent",
                }}
                aria-hidden
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? M.brand : day.isToday ? M.brand : M.mut2,
                  letterSpacing: 0.2,
                }}
              >
                {day.weekdayLabel}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: M.display,
                  background: isSelected ? M.brand : "transparent",
                  color: isSelected ? M.brandInk : M.fg,
                  border: isSelected
                    ? "none"
                    : day.isToday
                      ? "1px solid " + M.brand
                      : "1px solid " + M.line2,
                }}
              >
                {day.dateNumber}
              </div>
            </MButton>
          );
        })}
      </div>
      {!activePlan ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
          <span style={{ fontSize: 13, color: M.mut, fontWeight: 500 }}>Kein aktiver Plan</span>
          <MButton type="button" variant="ghost" size="sm" onClick={onOpenPlans} style={{ padding: 0, color: M.fg }}>
            Plan erstellen
            <Icon name="chevR" size={14} color={M.fg} stroke={2.2} />
          </MButton>
        </div>
      ) : null}
    </div>
  );

  const statsRow = (
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
      <MStat label="STREAK" value={String(stats?.streakWeeks ?? 0)} sub="Wochen" />
      <MStat label="DIESE WOCHE" value={String(stats?.sessionsThisWeek ?? 0)} sub="Sessions" />
      <MStat label="VOLUMEN" value={`${stats?.volumeThisWeekT ?? 0}t`} sub="diese Woche" />
    </div>
  );

  const volumeChart = (
    <div
      style={{
        marginTop: 14,
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: 18,
        padding: "15px 16px 12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...labelStyle() }}>Volumen / Woche</span>
        <span style={{ fontFamily: M.label, fontWeight: 700, fontSize: 16, color: M.brand }}>
          {weekData.reduce((a, w) => a + w.v, 0) > 0 ? "●" : "—"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12 }}>
        {weekData.map((w, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", height: 64, display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  height: (w.v ? Math.max(8, (w.v / maxV) * 64) : 3) + "px",
                  borderRadius: 5,
                  background: w.v
                    ? i === weekData.length - 1
                      ? M.brand
                      : M.brandSoft
                    : M.line,
                  opacity: w.v ? (i === weekData.length - 1 ? 1 : 0.45) : 1,
                }}
              />
            </div>
            <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{w.d}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const proteinChart = (
    <MButton
      type="button"
      variant="ghost"
      onClick={() => onOpenRecovery("protein")}
      style={{
        marginTop: 14,
        width: "100%",
        height: "auto",
        minHeight: 0,
        padding: 0,
        display: "block",
        textAlign: "left",
      }}
    >
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: "15px 16px 12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ ...labelStyle() }}>Protein / Woche</span>
          <span style={{ fontFamily: M.label, fontWeight: 700, fontSize: 16, color: M.brand }}>
            {proteinLoggedTodayG}/{proteinTargetG} g
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12, position: "relative" }}>
          {showProteinGoalLine ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 20,
                height: proteinChartBarHeight,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: proteinGoalLineBottom,
                  borderTop: `1px dashed ${M.mut}`,
                  opacity: 0.55,
                }}
              />
            </div>
          ) : null}
          {proteinWeekData.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: proteinChartBarHeight, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: (w.v ? Math.max(8, (w.v / maxProteinV) * proteinChartBarHeight) : 3) + "px",
                    borderRadius: 5,
                    background: w.v
                      ? i === todayChartIdx
                        ? M.brand
                        : M.brandSoft
                      : M.line,
                    opacity: w.v ? (i === todayChartIdx ? 1 : 0.45) : 1,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{w.d}</span>
            </div>
          ))}
        </div>
      </div>
    </MButton>
  );

  const waterChart = (
    <MButton
      type="button"
      variant="ghost"
      onClick={() => onOpenRecovery("water")}
      style={{
        marginTop: 14,
        width: "100%",
        height: "auto",
        minHeight: 0,
        padding: 0,
        display: "block",
        textAlign: "left",
      }}
    >
      <div style={{ background: M.card, border: `1px solid ${M.line2}`, borderRadius: 18, padding: "15px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ ...labelStyle() }}>Wasser / Woche</span>
          <span style={{ fontFamily: M.label, fontWeight: 700, fontSize: 16, color: M.brand }}>
            {formatWaterAmount(waterLoggedTodayMl)}/{formatWaterAmount(waterTargetMl)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12, position: "relative" }}>
          {showWaterGoalLine ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, height: waterChartBarHeight, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: waterGoalLineBottom, borderTop: `1px dashed ${M.mut}`, opacity: 0.55 }} />
            </div>
          ) : null}
          {waterWeekData.map((day, index) => (
            <div key={day.dateKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div title={formatWaterAmount(day.amountMl)} style={{ width: "100%", height: waterChartBarHeight, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${day.amountMl ? Math.max(8, (day.amountMl / maxWaterV) * waterChartBarHeight) : 3}px`,
                    borderRadius: 5,
                    background: day.amountMl
                      ? index === waterWeekData.length - 1
                        ? M.brand
                        : M.brandSoft
                      : M.line,
                    opacity: day.amountMl ? (index === waterWeekData.length - 1 ? 1 : 0.45) : 1,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MButton>
  );

  const statsBlock = (
    <div style={{ marginTop: activeWorkout ? 16 : 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 0,
        }}
      >
        <span style={{ ...labelStyle() }}>Statistik</span>
        <MButton type="button" onClick={onOpenStats} variant="ghost" size="sm" style={{ padding: 0, color: M.fg }}>
          Alle anzeigen
          <Icon name="chevR" size={14} color={M.fg} stroke={2.2} />
        </MButton>
      </div>
      {statsRow}
      {volumeChart}
      {proteinChart}
      {waterChart}
    </div>
  );

  const allQuickActions: Record<import("../lib/dashboardQuickActions").DashboardQuickActionId, PersonalQuickAction> = {
    recovery: { id: "recovery", label: "Recovery", detail: "Erholung & Ernährung", icon: "heart", onClick: () => onOpenRecovery("protein") },
    breathing: { id: "breathing", label: "Atmen", detail: "Kurz zur Ruhe kommen", icon: "wind", onClick: onOpenBreathing },
    timer: { id: "timer", label: "Intervall-Timer", detail: "Deine Einheit starten", icon: "timer", onClick: onOpenTimer },
    plans: { id: "plans", label: activePlan ? "Training & Plan" : "Plan erstellen", detail: activePlan ? "Deine nächste Einheit" : "Deinen Rhythmus planen", icon: "layers", onClick: onOpenPlans },
    calculator: { id: "calculator", label: "1RM-Rechner", detail: "Leistung einordnen", icon: "calculator", onClick: onOpenCalculator },
    body: { id: "body", label: "Körperwerte", detail: "Deinen Verlauf sehen", icon: "scale", onClick: onOpenBodyTracker },
  };
  const personalQuickActions = selectDashboardQuickActions({ primaryFocus: preferences.primaryFocus, secondaryFocus: preferences.secondaryFocus, hasPlan: !!activePlan }).map((id) => allQuickActions[id]);

  const hydrationHint = showHydrationHint ? (
    <div style={{ marginTop: 18, padding: "18px 18px 14px", borderRadius: 20, background: M.card, border: `1px solid ${M.line2}`, flexShrink: 0 }}>
      <div style={{ ...labelStyle(), marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="droplet" size={14} color={M.mut} stroke={2} />
        Hydration
      </div>
      <div style={{ ...displayStyle(24), marginTop: 4 }}>
        Heute fehlen noch {formatWaterAmount(Math.max(0, waterTargetMl - waterLoggedTodayMl))}
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 8, lineHeight: 1.45 }}>
        Du hast bisher {formatWaterAmount(waterLoggedTodayMl)} von {formatWaterAmount(waterTargetMl)} erreicht.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <MButton type="button" variant="primary" size="md" disabled={hydrationBusy} onClick={() => void addWaterFromHint()} style={{ flex: 1 }}>
          +250 ml
        </MButton>
        <MButton type="button" variant="secondary" size="md" onClick={() => onOpenRecovery("water")} style={{ flex: 1 }}>
          Öffnen
        </MButton>
      </div>
      <MButton type="button" variant="ghost" size="sm" fullWidth onClick={dismissHydrationHint} style={{ marginTop: 6, color: M.mut }}>
        Für heute ausblenden
      </MButton>
    </div>
  ) : null;

  return (
    <ScreenScroll page>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>
            {todayLabel}
            {planStale && !isOnline && (
              <span style={{ marginLeft: 8, fontSize: 13, color: M.mut2 }}>· Offline</span>
            )}
          </div>
          <div style={{ ...displayStyle(32), marginTop: 4, whiteSpace: "nowrap" }}>
            Hej, {displayName.split(" ")[0]}
          </div>
        </div>
        <MButton
          onClick={onOpenProfile}
          variant="secondary"
          size="icon"
          aria-label="Profil"
          title="Profil"
          style={{ width: 48, height: 48, borderRadius: 24, background: M.bg, border: "1px solid " + M.line, padding: 0, overflow: "hidden", flexShrink: 0 }}
        >
          <UserAvatar
            size={48}
            displayName={displayName}
            avatarPath={profile?.avatar_path}
            style={{ border: "none" }}
          />
        </MButton>
      </div>

      {weekStrip}
      <DashboardCoach recommendation={cachedRecommendation ?? healthspan.recommendation} generating={aiRecommendationBusy} reasons={dashboardPriority.reasons} onCheckin={() => setCheckinOpen(true)} onOpenTimer={onOpenTimer} onOpenRecovery={onOpenRecovery} onOpenMetabolism={onOpenMetabolism} onOpenExpress={onOpenExpress} onStartStrength={selectedPlanDay && activePlan ? () => onStart(selectedPlanDay.id, activePlan.id) : undefined} />
      <PersonalQuickActions actions={personalQuickActions} />
      {dashboardPriority.modules.filter((module) => !preferences.dashboard.hiddenModules.includes(module)).map((module) => {
        if (module === "healthspan") return <HealthspanDashboard key={module} domains={healthspan.domains} onOpenMetabolism={onOpenMetabolism} onOpenRecovery={() => onOpenRecovery("checkin")} />;
        if (module === "training") return <div key={module}>{todayCard}{activeWorkoutCard}{weekPlannerCard}</div>;
        if (module === "recovery") return <div key={module}>{hydrationHint}{recoveryWeekCard}</div>;
        return <div key={module}>{statsBlock}</div>;
      })}
      <WorkoutFinishSheet
        open={finishSheet && !!activeWorkout && !!activeMetrics}
        name={activeWorkout?.session.name ?? ""}
        durationSec={durationSec}
        doneSets={activeMetrics?.doneSets ?? 0}
        totalSets={activeMetrics?.totalSets ?? 0}
        volumeKg={activeMetrics?.volumeKg ?? 0}
        busy={saving}
        exercises={activeWorkout?.session.exercises.map((e) => e.name) ?? []}
        recovery={finishRecovery}
        onSave={handleSaveActive}
        onDiscard={handleDiscardActive}
        onClose={() => setFinishSheet(false)}
      />
      <WeekPlannerSheet
        open={weekPlannerOpen}
        plan={activePlan}
        userId={user?.id ?? ""}
        onClose={() => setWeekPlannerOpen(false)}
        onSaved={handleWeekPlannerSaved}
      />
      <AlertSheet
        open={!!hydrationAlert}
        title="Speichern fehlgeschlagen"
        message={hydrationAlert ?? ""}
        onClose={() => setHydrationAlert(null)}
      />
      <AlertSheet open={!!checkinAlert} title="Check-in nicht gespeichert" message={checkinAlert ?? ""} onClose={() => setCheckinAlert(null)} />
      <DailyCheckinSheet open={checkinOpen} current={todayCheckin} busy={checkinBusy} onClose={() => setCheckinOpen(false)} onSave={handleSaveDailyCheckin} />
    </ScreenScroll>
  );
}
