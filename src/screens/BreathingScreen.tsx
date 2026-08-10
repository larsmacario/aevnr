import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CONTENT_HORIZONTAL_PADDING, useBreakpoint, useContentColumnStyle, useShortViewport } from "../lib/responsive";
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

export interface BreathingScreenProps {
  onBack: () => void;
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

const phaseLabels: Array<{ key: "inhale" | "hold" | "exhale" | "pause"; label: string; required?: boolean }> = [
  { key: "inhale", label: "EINATMEN", required: true },
  { key: "hold", label: "HALTEN" },
  { key: "exhale", label: "AUSATMEN", required: true },
  { key: "pause", label: "PAUSE" },
];

function BoxBreathingGuide({
  label,
  progress,
  seconds,
  config,
  round,
  size,
  ink,
  line,
  light,
}: {
  label: string;
  progress: number;
  seconds: number;
  config: TimerCfg;
  round: number;
  size: string;
  ink: string;
  line: string;
  light: string;
}) {
  const phases = [
    { label: "EINATMEN", duration: config.inhale ?? 0 },
    { label: "HALTEN", duration: config.hold ?? 0 },
    { label: "AUSATMEN", duration: config.exhale ?? 0 },
    { label: "PAUSE", duration: config.pause ?? 0 },
  ].filter((phase) => phase.duration > 0);
  const activeIndex = phases.findIndex((phase) => phase.label === label);
  const cycleDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const completedDuration = activeIndex < 0 ? 0 : phases.slice(0, activeIndex).reduce((sum, phase) => sum + phase.duration, 0);
  const loopProgress = activeIndex < 0 || !cycleDuration
    ? 0
    : ((completedDuration + phases[activeIndex].duration * Math.max(0, Math.min(1, progress))) / cycleDuration) * 100;
  const darkening = round % 2 === 1;
  // The first cycle draws the dark trail. After that, an opaque light mask
  // travels continuously around the same path: it covers dark in even rounds
  // and uncovers it again in odd rounds without resetting at the start point.
  const firstDarkeningCycle = round === 1 && darkening;
  const darkTrail = firstDarkeningCycle ? loopProgress : 100;
  const lightMaskLength = firstDarkeningCycle ? 0 : darkening ? 100 - loopProgress : loopProgress;
  // For the darkening pass, begin the light tail after the already revealed
  // segment. A positive offset starts the dash in its gap, keeping the tail visible.
  const lightMaskOffset = darkening ? lightMaskLength : 0;
  // Keep the head's path monotonic across cycles. SVG treats 0 and 100 as the
  // same physical point, but animating between them directly causes a visible reverse jump.
  const continuousLoopProgress = Math.max(0, (round - 1) * 100 + loopProgress);
  const transition = "stroke-dasharray .1s linear, stroke-dashoffset .1s linear, stroke .24s ease";

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }} aria-label={`Box-Breathe-Visualisierung: ${label}`}>
      <svg viewBox="0 0 200 200" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <rect x="20" y="20" width="160" height="160" rx="34" fill="none" stroke={line} strokeWidth="4" pathLength="100" />
        <rect x="20" y="20" width="160" height="160" rx="34" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${darkTrail} 100`} style={{ transition }} />
        {lightMaskLength > 0 && <rect x="20" y="20" width="160" height="160" rx="34" fill="none" stroke={light} strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray={`${lightMaskLength} ${100 - lightMaskLength}`} strokeDashoffset={lightMaskOffset} style={{ transition }} />}
        {activeIndex >= 0 && <rect x="20" y="20" width="160" height="160" rx="34" fill="none" stroke={darkening ? ink : line} strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray="1.5 98.5" strokeDashoffset={-continuousLoopProgress} style={{ transition }} />}
      </svg>
      <div style={{ position: "absolute", inset: "24%", display: "grid", placeItems: "center", fontFamily: M.numeric, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: "min(148px, 27vw)", lineHeight: 0.82, letterSpacing: -4, color: ink }}>
        {Math.max(0, Math.ceil(seconds - 1e-6))}
      </div>
    </div>
  );
}

export function BreathingScreen({ onBack, onSaveSession }: BreathingScreenProps) {
  const columnStyle = useContentColumnStyle();
  const breakpoint = useBreakpoint();
  const shortViewport = useShortViewport();
  const { preferences, updatePreferences } = usePreferences();
  const { setActive } = useActiveTimer();
  const [presetId, setPresetId] = useState<BreathingPresetId>("box");
  const [runningView, setRunningView] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const preset = BREATHING_PRESETS[presetId];
  const cfg = preferences.breathingPresets[presetId];
  const T = useTimer("breathe", cfg);
  const savedRef = useRef(false);
  const previousPhase = useRef<string | null>(null);

  const targetSummary = useMemo(() => {
    if (cfg.breathTarget === "duration") return `${fmt(cfg.total ?? 0)} Gesamtzeit`;
    return `${cfg.rounds ?? 0} Zyklen · ca. ${fmt((cfg.rounds ?? 0) * breathingCycleDuration(cfg))}`;
  }, [cfg]);
  const clockFontSize = breakpoint === "mobile"
    ? "min(172px, calc((100vw - 44px - env(safe-area-inset-left) - env(safe-area-inset-right)) / 4.6))"
    : "min(210px, calc((100vw - 44px - env(safe-area-inset-left) - env(safe-area-inset-right)) / 4.6))";
  const boxGuideSize = shortViewport
    ? "min(244px, calc(100vw - 92px - env(safe-area-inset-left) - env(safe-area-inset-right)))"
    : breakpoint === "mobile"
      ? "min(320px, calc(100vw - 76px - env(safe-area-inset-left) - env(safe-area-inset-right)))"
      : breakpoint === "tablet"
        ? "min(390px, calc(100vw - 120px - env(safe-area-inset-left) - env(safe-area-inset-right)))"
        : "440px";
  const adaptivePhaseSurface = presetId !== "box";
  const exhaling = adaptivePhaseSurface && T.phase === "run" && T.label === "AUSATMEN";
  const holding = adaptivePhaseSurface && T.phase === "run" && T.label === "HALTEN";
  const phaseSurface = exhaling ? M.fg : holding ? "#D4D4D8" : M.bg;
  const phaseInk = exhaling ? M.accInk : M.fg;
  const phaseMuted = exhaling ? "rgba(255,255,255,0.62)" : M.mut;
  const phaseLine = exhaling ? "rgba(255,255,255,0.26)" : M.line;
  const phaseLightTrail = exhaling ? "#52525B" : "#D4D4D8";

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
        await onSaveSession(buildBreathingSessionInput(presetId, preset.name, cfg, T.elapsedSec, completedRounds));
        setSavedMessage("Atemsession im Verlauf gespeichert.");
        T.reset();
        setRunningView(false);
      } catch (error) {
        savedRef.current = false;
        setSaveError(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    })();
  }, [T.done, T.elapsedSec, T.round, cfg, onSaveSession, preset.name, presetId, T.reset]);

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
        <motion.div aria-hidden initial={false} animate={{ backgroundColor: phaseSurface }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
        <div style={{ padding: "2px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <MButton type="button" variant="ghost" size="icon" onClick={requestBack} aria-label="Zurück">
            <Icon name="chevL" size={20} stroke={2.2} color={phaseMuted} />
          </MButton>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: phaseMuted, fontWeight: 700 }}>ATMEN</div>
            <div style={{ fontSize: 12, color: phaseMuted, marginTop: 2, opacity: 0.72 }}>{preset.name}</div>
          </div>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", width: "100%", position: "relative", zIndex: 1 }}>
          <div style={{ color: T.phase === "prep" ? phaseMuted : phaseInk, fontSize: 13, letterSpacing: 2, fontWeight: 700, minHeight: 20 }}>
            {T.phase === "prep" ? "BEREIT MACHEN" : T.label}
          </div>
          {presetId === "box" && (
            <div style={{ marginTop: shortViewport ? 8 : 18, marginBottom: shortViewport ? 8 : 14 }}>
              <BoxBreathingGuide label={T.phase === "prep" ? "BEREIT" : T.label} progress={T.segProgress} seconds={T.bigSeconds} config={cfg} round={T.round} size={boxGuideSize} ink={phaseInk} line={phaseLine} light={phaseLightTrail} />
            </div>
          )}
          {presetId !== "box" && (
            <div style={{ position: "relative", display: "grid", placeItems: "center", width: "100%" }}>
              <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
                <TimerClockDisplay seconds={T.bigSeconds} countUp={false} fontSize={clockFontSize} color={phaseInk} minHeight={breakpoint === "mobile" ? "min(160px, 27vmin)" : "min(214px, 30vmin)"} marginTop={6} />
              </div>
            </div>
          )}
          <div style={{ fontFamily: M.numeric, fontWeight: 700, fontSize: 26, color: phaseMuted, marginTop: 14 }}>
            ZYKLUS {String(T.round).padStart(2, "0")} <span style={{ opacity: 0.55 }}>/ {String(T.rounds).padStart(2, "0")}</span>
          </div>
        </div>
        <div style={{ padding: "12px 0 calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${phaseLine}`, display: "flex", justifyContent: "center", gap: 22, position: "relative", zIndex: 1 }}>
          <MButton type="button" variant="secondary" size="icon" onClick={() => { T.reset(); setRunningView(false); }} aria-label="Timer zurücksetzen">
            <Icon name="reset" size={16} color={phaseMuted} />
          </MButton>
          <button type="button" onClick={T.toggle} disabled={T.done} style={{ width: 68, height: 68, borderRadius: 34, border: "none", background: exhaling ? M.accInk : M.acc, color: exhaling ? M.acc : M.accInk, cursor: "pointer", display: "grid", placeItems: "center", transition: "background-color .65s ease, color .65s ease" }}>
            <Icon name={T.running ? "pause" : "play"} size={30} style={{ marginLeft: T.running ? 0 : 3 }} />
          </button>
        </div>
        <TimerLeaveSheet open={leaveOpen} title="Atemsession stoppen?" message="Beim Verlassen wird die aktuelle Atemsession zurückgesetzt." confirmLabel="STOPPEN" onConfirm={() => { T.reset(); setLeaveOpen(false); onBack(); }} onCancel={() => setLeaveOpen(false)} />
        <AlertSheet open={!!saveError} title="Speichern fehlgeschlagen" message={saveError ?? ""} icon="alertCircle" onClose={() => setSaveError(null)} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", ...columnStyle, padding: `0 ${CONTENT_HORIZONTAL_PADDING}px calc(24px + env(safe-area-inset-bottom, 0px))`, boxSizing: "border-box" }}>
      <div style={{ padding: "2px 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <MButton type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Zurück"><Icon name="chevL" size={20} color={M.mut} /></MButton>
        <div><div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>ATMEN</div><div style={{ fontSize: 24, fontFamily: M.display, color: M.fg }}>Dein Atemrhythmus</div></div>
      </div>
      <p style={{ margin: "0 0 18px", color: M.mut, fontSize: 14, lineHeight: 1.45 }}>Geführte Atemübungen für einen ruhigen Moment. Passe die Zeiten an deinen Rhythmus an.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(Object.keys(BREATHING_PRESETS) as BreathingPresetId[]).map((id) => {
          const active = presetId === id;
          return <button key={id} type="button" onClick={() => { setPresetId(id); setSavedMessage(null); }} style={{ textAlign: "left", padding: "15px 16px", borderRadius: 14, border: active ? `2px solid ${M.fg}` : `1px solid ${M.line}`, background: active ? M.accSoft : M.card, cursor: "pointer" }}><div style={{ fontWeight: 700, color: M.fg }}>{BREATHING_PRESETS[id].name}</div><div style={{ fontSize: 13, color: M.mut, marginTop: 4 }}>{BREATHING_PRESETS[id].description}</div></button>;
        })}
      </div>
      <div style={{ marginTop: 18, padding: "18px", borderRadius: 16, border: `1px solid ${M.line2}`, background: M.card }}>
        <div style={{ fontSize: 13, letterSpacing: 1.3, color: M.mut, fontWeight: 700, marginBottom: 14 }}>PHASEN IN SEKUNDEN</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {phaseLabels.map(({ key, label, required }) => {
            const enabled = Boolean(cfg[key]) || required;
            const optionalKey = key as "hold" | "pause";
            return (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 12, minHeight: 50 }}>
                <span style={{ fontSize: 14, color: M.fg, fontWeight: 600 }}>{label}</span>
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
                      {enabled ? "Aus" : "An"}
                    </MButton>
                  ) : <span aria-hidden />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 1, background: M.line2, margin: "18px 0" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><MButton type="button" variant={cfg.breathTarget === "rounds" ? "primary" : "secondary"} size="sm" style={{ flex: 1 }} onClick={() => updateCfg({ breathTarget: "rounds" })}>Zyklen</MButton><MButton type="button" variant={cfg.breathTarget === "duration" ? "primary" : "secondary"} size="sm" style={{ flex: 1 }} onClick={() => updateCfg({ breathTarget: "duration" })}>Gesamtzeit</MButton></div>
        {cfg.breathTarget === "duration" ? <MStepper value={cfg.total ?? 120} min={30} max={1800} step={30} fmt={fmt} onChange={(value) => updateCfg({ total: value })} /> : <MStepper value={cfg.rounds ?? 6} min={1} max={99} onChange={(value) => updateCfg({ rounds: value })} />}
      </div>
      <div style={{ margin: "14px 0", textAlign: "center", fontSize: 13, color: M.mut }}>{targetSummary}</div>
      {savedMessage && <div style={{ textAlign: "center", color: M.fg, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{savedMessage}</div>}
      <MButton type="button" variant="primary" size="lg" fullWidth onClick={start}>Atemsession starten</MButton>
    </div>
  );
}
