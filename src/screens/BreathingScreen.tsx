import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { CONTENT_HORIZONTAL_PADDING, useBreakpoint, useContentColumnStyle } from "../lib/responsive";
import { breathingCycleDuration, BREATHING_PRESETS, type BreathingPresetId } from "../lib/breathing";
import { fmt, useTimer, type TimerCfg } from "../lib/engine";
import type { SaveSessionInput } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import { useActiveTimer } from "../lib/activeTimer";
import { buildBreathingSessionInput } from "../lib/timerSession";
import { playTimerCue } from "../lib/timerSounds";
import { triggerTapHaptic } from "../lib/haptics";
import { M } from "../theme";
import { MButton } from "../components/MButton";
import { MStepper } from "../components/widgets";
import { Icon } from "../components/Icon";
import { TimerClockDisplay } from "../components/intervalTimer/TimerClockDisplay";
import { TimerLeaveSheet } from "../components/TimerLeaveSheet";
import { AlertSheet } from "../components/AlertSheet";
import { useI18n } from "../lib/i18n";

export interface BreathingScreenProps {
  onBack: () => void;
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

const phaseLabels: Array<{ key: "inhale" | "hold" | "exhale" | "pause"; required?: boolean }> = [
  { key: "inhale", required: true },
  { key: "hold" },
  { key: "exhale", required: true },
  { key: "pause" },
];

const boxPath = (topBottomInset: number, sideInset: number, radius: number) =>
  `inset(${topBottomInset}px ${sideInset}px ${topBottomInset}px ${sideInset}px round ${radius}px)`;

export function BreathingScreen({ onBack, onSaveSession }: BreathingScreenProps) {
  const { t } = useI18n();
  const columnStyle = useContentColumnStyle();
  const breakpoint = useBreakpoint();
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));
  const { preferences, updatePreferences } = usePreferences();
  const { setActive } = useActiveTimer();
  const [presetId, setPresetId] = useState<BreathingPresetId>("box");
  const [runningView, setRunningView] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [settledSurface, setSettledSurface] = useState<string>(M.bg);
  const [breathCircle, setBreathCircle] = useState<{ key: string; direction: "expand" | "contract" | "rest" | "full"; duration: number } | null>(null);
  const circleControls = useAnimationControls();
  const presetName = t(presetId === "box" ? "breathing.preset.box.name" : presetId === "calm" ? "breathing.preset.relax.name" : "breathing.preset.focus.name");
  const presetDescription = (id: BreathingPresetId) => t(id === "box" ? "breathing.preset.box.description" : id === "calm" ? "breathing.preset.relax.description" : "breathing.preset.focus.description");
  const displayPhase = (label: string) => label === "EINATMEN" ? t("breathing.phase.inhale") : label === "HALTEN" ? t("breathing.phase.hold") : label === "AUSATMEN" ? t("breathing.phase.exhale") : label === "PAUSE" ? t("breathing.phase.pause") : label;
  const cfg = preferences.breathingPresets[presetId];
  const T = useTimer("breathe", cfg);
  const savedRef = useRef(false);
  const previousPhase = useRef<string | null>(null);
  const circleKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const syncViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const targetSummary = useMemo(() => {
    if (cfg.breathTarget === "duration") return t("breathing.summary.duration", { duration: fmt(cfg.total ?? 0) });
    return t("breathing.summary.rounds", { rounds: cfg.rounds ?? 0, duration: fmt((cfg.rounds ?? 0) * breathingCycleDuration(cfg)) });
  }, [cfg, t]);
  const clockFontSize = breakpoint === "mobile"
    ? "min(172px, calc((100vw - 44px - env(safe-area-inset-left) - env(safe-area-inset-right)) / 4.6))"
    : "min(210px, calc((100vw - 44px - env(safe-area-inset-left) - env(safe-area-inset-right)) / 4.6))";
  const inhaling = T.phase === "run" && T.label === "EINATMEN";
  const exhaling = T.phase === "run" && T.label === "AUSATMEN";
  const holding = T.phase === "run" && T.label === "HALTEN";
  const darkPhase = inhaling || holding;
  const phaseMuted = darkPhase ? "rgba(255,255,255,0.62)" : M.mut;
  const phaseLine = darkPhase ? "rgba(255,255,255,0.26)" : M.line;
  const timerInk = M.accInk;
  const timerMuted = "rgba(255,255,255,0.62)";
  const breathCircleDuration = inhaling ? Math.max(0.35, cfg.inhale ?? 4) : exhaling ? Math.max(0.35, cfg.exhale ?? 4) : 0.35;
  const breathCircleKey = `${T.phase}:${T.round}:${T.label}`;
  const boxWidth = Math.max(0, Math.min(viewport.width - 32, Math.max(320, viewport.width * 0.74)));
  const boxHeight = Math.max(0, Math.min(viewport.height - 120, Math.max(320, viewport.height * 0.38)));
  const boxMinPath = boxPath(
    Math.max(16, (viewport.height - boxHeight) / 2),
    Math.max(16, (viewport.width - boxWidth) / 2),
    Math.min(46, Math.min(boxWidth, boxHeight) * 0.12),
  );
  const boxMaxPath = boxPath(0, 0, 0);

  useEffect(() => {
    if (!runningView) {
      setBreathCircle(null);
      setSettledSurface(M.bg);
      return;
    }
    if (inhaling) {
      setSettledSurface(M.bg);
      setBreathCircle({ key: breathCircleKey, direction: "expand", duration: breathCircleDuration });
      return;
    }
    if (holding) {
      setSettledSurface(M.fg);
      setBreathCircle({ key: breathCircleKey, direction: "full", duration: 0 });
      return;
    }
    if (exhaling) {
      setSettledSurface(M.bg);
      setBreathCircle({ key: breathCircleKey, direction: "contract", duration: breathCircleDuration });
      return;
    }
    setSettledSurface(M.bg);
    setBreathCircle({ key: breathCircleKey, direction: "rest", duration: 0 });
  }, [runningView, inhaling, holding, exhaling, breathCircleDuration, breathCircleKey]);

  useEffect(() => {
    if (!breathCircle) {
      circleKeyRef.current = null;
      return;
    }

    const startsLarge = breathCircle.direction === "contract" || breathCircle.direction === "full";
    const startShape = startsLarge ? boxMaxPath : boxMinPath;
    const targetShape = breathCircle.direction === "expand" || breathCircle.direction === "full" ? boxMaxPath : boxMinPath;
    if (circleKeyRef.current !== breathCircle.key) {
      circleControls.set({ clipPath: startShape });
      circleKeyRef.current = breathCircle.key;
    }
    if (breathCircle.direction === "rest" || breathCircle.direction === "full") {
      circleControls.set({ clipPath: targetShape });
      return;
    }
    if (!T.running) {
      circleControls.stop();
      return;
    }

    const remaining = Math.max(0.01, breathCircle.duration * (1 - Math.max(0, Math.min(1, T.segProgress))));
    void circleControls.start({ clipPath: targetShape, transition: { duration: remaining, ease: "linear" } });
  }, [breathCircle, T.running, circleControls, boxMinPath, boxMaxPath]);

  useEffect(() => {
    setActive(!T.idle);
    return () => setActive(false);
  }, [T.idle, setActive]);

  useEffect(() => {
    if (!preferences.timerSounds || !T.running) return;
    const key = `${T.phase}:${T.round}:${T.label}`;
    if (previousPhase.current && previousPhase.current !== key) {
      playTimerCue(T.kind === "rest" ? "rest" : "go", preferences.timerSoundPack);
      void triggerTapHaptic();
    } else if (!previousPhase.current && T.phase === "run") {
      playTimerCue("go", preferences.timerSoundPack);
    }
    previousPhase.current = key;
  }, [T.running, T.phase, T.round, T.label, T.kind, preferences.timerSounds, preferences.timerSoundPack]);

  useEffect(() => {
    if (T.idle) previousPhase.current = null;
  }, [T.idle]);

  useEffect(() => {
    if (!T.done || savedRef.current) return;
    savedRef.current = true;
    void (async () => {
      try {
        const completedRounds =
          cfg.breathTarget === "duration"
            ? Math.floor(Math.max(0, T.elapsedSec - (cfg.prep ?? 0)) / breathingCycleDuration(cfg))
            : T.round;
        await onSaveSession(buildBreathingSessionInput(presetId, presetName, cfg, T.elapsedSec, completedRounds));
        setSavedMessage(t("breathing.saved"));
        T.reset();
        setRunningView(false);
      } catch (error) {
        savedRef.current = false;
        setSaveError(error instanceof Error ? error.message : t("breathing.saveFailed"));
      }
    })();
  }, [T.done, T.elapsedSec, T.round, cfg, onSaveSession, presetName, presetId, T.reset, t]);

  const updateCfg = (partial: Partial<TimerCfg>) => {
    updatePreferences({ breathingPresets: { [presetId]: { ...cfg, ...partial } } });
  };

  const start = () => {
    savedRef.current = false;
    setSavedMessage(null);
    setRunningView(true);
    T.start();
  };

  const requestBack = () => {
    if (T.idle) onBack();
    else setLeaveOpen(true);
  };

  if (runningView) {
    return (
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", ...columnStyle, padding: `0 ${CONTENT_HORIZONTAL_PADDING}px`, boxSizing: "border-box", overflow: "hidden", position: "relative" }}>
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", background: settledSurface }}>
          {breathCircle && (
            <motion.div
              key={breathCircle.key}
              initial={{ clipPath: breathCircle.direction === "contract" || breathCircle.direction === "full" ? boxMaxPath : boxMinPath }}
              animate={circleControls}
              onAnimationComplete={() => {
                if (breathCircle.direction === "rest" || breathCircle.direction === "full") return;
                setSettledSurface(breathCircle.direction === "expand" ? M.fg : M.bg);
                setBreathCircle((current) => current?.key === breathCircle.key
                  ? breathCircle.direction === "contract"
                    ? { key: `${breathCircle.key}:rest`, direction: "rest", duration: 0 }
                    : null
                  : current);
              }}
              style={{ position: "absolute", inset: 0, background: M.fg, willChange: "clip-path" }}
            />
          )}
        </div>
        <div style={{ padding: "2px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <MButton type="button" variant="ghost" size="icon" onClick={requestBack} aria-label={t("breathing.back")}>
            <Icon name="chevL" size={20} stroke={2.2} color={phaseMuted} />
          </MButton>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: phaseMuted, fontWeight: 700 }}>{t("breathing.section")}</div>
            <div style={{ fontSize: 12, color: phaseMuted, marginTop: 2, opacity: 0.72 }}>{presetName}</div>
          </div>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", width: "100%", position: "relative", zIndex: 2 }}>
          <div style={{ color: timerInk, fontSize: 13, letterSpacing: 2, fontWeight: 700, minHeight: 20 }}>
            {T.phase === "prep" ? t("breathing.phase.prep") : displayPhase(T.label)}
          </div>
          <div style={{ position: "relative", display: "grid", placeItems: "center", width: "100%" }}>
            <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
              <TimerClockDisplay seconds={T.bigSeconds} countUp={false} fontSize={clockFontSize} color={timerInk} minHeight={breakpoint === "mobile" ? "min(160px, 27vmin)" : "min(214px, 30vmin)"} marginTop={6} />
            </div>
          </div>
          <div style={{ fontFamily: M.numeric, fontWeight: 700, fontSize: 26, color: timerMuted, marginTop: 14 }}>
            {t("breathing.cycle", { current: String(T.round).padStart(2, "0"), total: String(T.rounds).padStart(2, "0") })}
          </div>
        </div>
        <div style={{ padding: "12px 0 calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${phaseLine}`, display: "flex", justifyContent: "center", gap: 22, position: "relative", zIndex: 1 }}>
          <MButton type="button" variant="secondary" size="icon" onClick={() => { T.reset(); setRunningView(false); }} aria-label={t("breathing.reset")}>
            <Icon name="reset" size={16} color={phaseMuted} />
          </MButton>
          <button type="button" onClick={T.toggle} disabled={T.done} aria-label={T.running ? t("breathing.pauseTimer") : t("breathing.startTimer")} style={{ width: 68, height: 68, borderRadius: 34, border: "none", background: darkPhase ? M.accInk : M.acc, color: darkPhase ? M.acc : M.accInk, cursor: "pointer", display: "grid", placeItems: "center", transition: "background-color .65s ease, color .65s ease" }}>
            <Icon name={T.running ? "pause" : "play"} size={30} style={{ marginLeft: T.running ? 0 : 3 }} />
          </button>
        </div>
        <TimerLeaveSheet open={leaveOpen} title={t("breathing.leave.title")} message={t("breathing.leave.message")} confirmLabel={t("breathing.leave.confirm")} onConfirm={() => { T.reset(); setLeaveOpen(false); onBack(); }} onCancel={() => setLeaveOpen(false)} />
        <AlertSheet open={!!saveError} title={t("breathing.saveErrorTitle")} message={saveError ?? ""} icon="alertCircle" onClose={() => setSaveError(null)} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", ...columnStyle, padding: `0 ${CONTENT_HORIZONTAL_PADDING}px calc(24px + env(safe-area-inset-bottom, 0px))`, boxSizing: "border-box" }}>
      <div style={{ padding: "2px 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <MButton type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("breathing.back")}><Icon name="chevL" size={20} color={M.mut} /></MButton>
        <div><div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>{t("breathing.section")}</div><div style={{ fontSize: 24, fontFamily: M.display, color: M.fg }}>{t("breathing.title")}</div></div>
      </div>
      <p style={{ margin: "0 0 18px", color: M.mut, fontSize: 14, lineHeight: 1.45 }}>{t("breathing.description")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(Object.keys(BREATHING_PRESETS) as BreathingPresetId[]).map((id) => {
          const active = presetId === id;
          return <button key={id} type="button" onClick={() => { setPresetId(id); setSavedMessage(null); }} style={{ textAlign: "left", padding: "15px 16px", borderRadius: 14, border: active ? `2px solid ${M.fg}` : `1px solid ${M.line}`, background: active ? M.accSoft : M.card, cursor: "pointer" }}><div style={{ fontWeight: 700, color: M.fg }}>{t(id === "box" ? "breathing.preset.box.name" : id === "calm" ? "breathing.preset.relax.name" : "breathing.preset.focus.name")}</div><div style={{ fontSize: 13, color: M.mut, marginTop: 4 }}>{presetDescription(id)}</div></button>;
        })}
      </div>
      <div style={{ marginTop: 18, padding: "18px", borderRadius: 16, border: `1px solid ${M.line2}`, background: M.card }}>
        <div style={{ fontSize: 13, letterSpacing: 1.3, color: M.mut, fontWeight: 700, marginBottom: 14 }}>{t("breathing.phases")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {phaseLabels.map(({ key, required }) => {
            const enabled = Boolean(cfg[key]) || required;
            const optionalKey = key as "hold" | "pause";
            return (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 12, minHeight: 50 }}>
                <span style={{ fontSize: 14, color: M.fg, fontWeight: 600 }}>{t(key === "inhale" ? "breathing.phase.inhale" : key === "hold" ? "breathing.phase.hold" : key === "exhale" ? "breathing.phase.exhale" : "breathing.phase.pause")}</span>
                <div style={{ display: "grid", gridTemplateColumns: "154px 48px", alignItems: "center", gap: 8 }}>
                  {enabled ? (
                    <div style={{ justifySelf: "end" }}>
                      <MStepper value={cfg[key] ?? 0} min={required ? 1 : 0} max={30} fmt={(value) => `${value}s`} onChange={(value) => updateCfg({ [key]: value })} />
                    </div>
                  ) : (
                    <span />
                  )}
                  {!required ? (
                    <MButton
                      type="button"
                      variant={enabled ? "ghost" : "secondary"}
                      size="sm"
                      onClick={() => updateCfg(enabled
                        ? { [key]: 0, breathPhaseMemory: { ...cfg.breathPhaseMemory, [optionalKey]: cfg[key] ?? 2 } }
                        : { [key]: cfg.breathPhaseMemory?.[optionalKey] ?? 2 })}
                      style={{ padding: 0, minWidth: 48 }}
                    >
                      {enabled ? t("breathing.off") : t("breathing.on")}
                    </MButton>
                  ) : <span aria-hidden />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 1, background: M.line2, margin: "18px 0" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><MButton type="button" variant={cfg.breathTarget === "rounds" ? "primary" : "secondary"} size="sm" style={{ flex: 1 }} onClick={() => updateCfg({ breathTarget: "rounds" })}>{t("breathing.cycles")}</MButton><MButton type="button" variant={cfg.breathTarget === "duration" ? "primary" : "secondary"} size="sm" style={{ flex: 1 }} onClick={() => updateCfg({ breathTarget: "duration" })}>{t("breathing.totalTime")}</MButton></div>
        {cfg.breathTarget === "duration" ? <MStepper value={cfg.total ?? 120} min={30} max={1800} step={30} fmt={fmt} onChange={(value) => updateCfg({ total: value })} /> : <MStepper value={cfg.rounds ?? 6} min={1} max={99} onChange={(value) => updateCfg({ rounds: value })} />}
      </div>
      <div style={{ margin: "14px 0", textAlign: "center", fontSize: 13, color: M.mut }}>{targetSummary}</div>
      {savedMessage && <div style={{ textAlign: "center", color: M.fg, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{savedMessage}</div>}
      <MButton type="button" variant="primary" size="lg" fullWidth onClick={start}>{t("breathing.start")}</MButton>
    </div>
  );
}
