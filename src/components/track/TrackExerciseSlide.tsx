import type { CSSProperties } from "react";
import type { Exercise } from "../../lib/engine";
import type { SetField } from "../../lib/exerciseSets";
import type { PerceivedEffort } from "../../lib/progressionEngine";
import { BLOCK_ACCENT, BLOCK_ORDER } from "../../lib/planBlocks";
import { M } from "../../theme";
import { Icon } from "../Icon";
import { MButton } from "../MButton";
import { RestDurationControl } from "../RestDurationControl";
import { SetTable } from "../SetTable";
import { useI18n } from "../../lib/i18n";

function blockBadgeForExercise(exercise: Exercise): { index: number; accent: string } {
  const block = exercise.blockType ?? "strength";
  return {
    index: BLOCK_ORDER.indexOf(block) + 1,
    accent: BLOCK_ACCENT[block],
  };
}

function fmtRestSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface TrackExerciseSlideProps {
  exercise: Exercise;
  restSeconds: number;
  onRestSecondsChange?: (seconds: number, scope: "exercise" | "workout") => void;
  historyHint?: string;
  trendLabel?: string;
  progressionBadge?: string;
  plateaued?: boolean;
  plateauReason?: string;
  onApplyDeload?: () => void;
  onConfirmAllSuggested?: () => void;
  onPerceivedEffort?: (effort: PerceivedEffort) => void;
  onBumpSet: (setIndex: number, field: SetField, delta: number) => void;
  onSetValue: (setIndex: number, field: SetField, value: number) => void;
  onToggleSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onAddSet: () => void;
  onWarmUpChange: (enabled: boolean) => void;
  onOpenMenu?: () => void;
}

export function TrackExerciseSlide({
  exercise,
  restSeconds,
  onRestSecondsChange,
  historyHint,
  trendLabel,
  progressionBadge,
  plateaued,
  plateauReason,
  onApplyDeload,
  onConfirmAllSuggested,
  onPerceivedEffort,
  onBumpSet,
  onSetValue,
  onToggleSet,
  onRemoveSet,
  onAddSet,
  onWarmUpChange,
  onOpenMenu,
}: TrackExerciseSlideProps) {
  const { t } = useI18n();
  const { index: blockIndex, accent: blockAccent } = blockBadgeForExercise(exercise);
  const pillStyle: CSSProperties = {
    padding: "7px 14px",
    borderRadius: 999,
    border: "1px solid " + M.line,
    background: M.card,
    color: M.fg,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: M.body,
  };

  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.done);
  const hasSuggested = exercise.sets.some((s) => s.suggested && !s.done);
  const tableHint = historyHint ?? (exercise.note ? exercise.note : undefined);
  const hintSuggested = hasSuggested && Boolean(tableHint);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        padding: "0 18px 88px",
        paddingTop: 12,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14, flexShrink: 0 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: `color-mix(in srgb, ${blockAccent} 18%, ${M.cardHi})`,
            border: `1px solid color-mix(in srgb, ${blockAccent} 42%, ${M.line2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: blockAccent,
            fontFamily: M.numeric,
            fontWeight: 700,
            fontSize: 24,
            lineHeight: 1,
          }}
          aria-hidden
        >
          {blockIndex}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: M.numeric,
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: 1.15,
                  color: M.fg,
                }}
              >
                {exercise.name}
              </div>
              {onRestSecondsChange ? (
                <RestDurationControl
                  value={restSeconds}
                  onChangeExercise={(seconds) => onRestSecondsChange(seconds, "exercise")}
                  onChangeWorkout={(seconds) => onRestSecondsChange(seconds, "workout")}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13, color: M.mut }}>
                  <Icon name="clock" size={14} stroke={2} color={M.mut2} />
                  {t("exercise.restDuration", { duration: fmtRestSec(restSeconds) })}
                </div>
              )}
            </div>
            {onOpenMenu ? (
              <MButton type="button" variant="ghost" size="icon" onClick={onOpenMenu} aria-label={t("track.exerciseMenu")} style={{ flexShrink: 0, color: M.mut2 }}>
                <Icon name="moreH" size={20} stroke={2.2} />
              </MButton>
            ) : null}
          </div>
          {progressionBadge ? (
            <div style={{ fontSize: 13, color: M.brand, marginTop: 6, fontWeight: 600 }}>{progressionBadge}</div>
          ) : null}
          {trendLabel ? (
            <div style={{ fontSize: 13, color: M.mut, marginTop: 4 }}>{trendLabel}</div>
          ) : null}
        </div>
      </div>

      {plateaued ? (
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid " + M.line2,
            background: M.card,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: M.fg }}>{plateauReason ?? t("exercise.noProgress")}</div>
          <div style={{ fontSize: 13, color: M.mut, marginTop: 4, lineHeight: 1.4 }}>
            {t("exercise.deloadHint")}
          </div>
          {onApplyDeload ? (
            <MButton type="button" variant="secondary" size="sm" onClick={onApplyDeload} style={{ marginTop: 10 }}>
              {t("exercise.applyDeload")}
            </MButton>
          ) : null}
        </div>
      ) : null}

      {hasSuggested && onConfirmAllSuggested ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: "wrap" }}>
          <button type="button" onClick={onConfirmAllSuggested} style={{ ...pillStyle, borderColor: M.brandBorder, color: M.brand }}>
            {t("exercise.confirmAll")}
          </button>
        </div>
      ) : null}

      <SetTable
        sets={exercise.sets}
        metric={exercise.metric}
        variant="tracked"
        stacked
        size="lg"
        collapseWhenDone
        hint={tableHint}
        hintSuggested={hintSuggested}
        onBumpSet={onBumpSet}
        onSetValue={onSetValue}
        onToggleDone={onToggleSet}
        onRemove={onRemoveSet}
        onWarmUpChange={onWarmUpChange}
        onAddSet={onAddSet}
        addSetLabel={t("exerciseSets.add")}
      />

      {allDone && onPerceivedEffort ? (
        <div style={{ marginTop: 14, flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: M.mut, marginBottom: 8 }}>{t("exercise.effortQuestion")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["easy", "ok", "hard"] as PerceivedEffort[]).map((effort) => {
              const selected = exercise.perceivedEffort === effort;
              return (
                <MButton
                  key={effort}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onPerceivedEffort(effort)}
                  style={
                    selected
                      ? { background: M.brandSoft, borderColor: M.brandBorder, color: M.brand }
                      : undefined
                  }
                >
                  {effort === "easy" ? t("exercise.effort.easy") : effort === "ok" ? t("exercise.effort.ok") : t("exercise.effort.hard")}
                </MButton>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
