import type { Exercise } from "../../lib/engine";
import type { SetField } from "../../lib/exerciseSets";
import { M } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { SetTable } from "../SetTable";
import { useI18n } from "../../lib/i18n";

export interface ExerciseSetEditSheetProps {
  open: boolean;
  exercise: Exercise | null;
  historyHint?: string;
  hintSuggested?: boolean;
  onClose: () => void;
  onBumpSet: (setIndex: number, field: SetField, delta: number) => void;
  onSetValue: (setIndex: number, field: SetField, value: number) => void;
  onToggleSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onAddSet: () => void;
  onWarmUpChange: (enabled: boolean) => void;
}

export function ExerciseSetEditSheet({
  open,
  exercise,
  historyHint,
  hintSuggested = false,
  onClose,
  onBumpSet,
  onSetValue,
  onToggleSet,
  onRemoveSet,
  onAddSet,
  onWarmUpChange,
}: ExerciseSetEditSheetProps) {
  const { t } = useI18n();
  if (!exercise) return null;

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("exerciseSets.aria", { name: exercise.name })}>
      <div style={{ padding: "4px 20px 28px", maxHeight: "min(72vh, 520px)", overflowY: "auto" }}>
        <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 18, color: M.fg, marginBottom: 4 }}>
          {exercise.name}
        </div>
        <div style={{ fontSize: 13, color: M.mut, marginBottom: 16 }}>{t("exerciseSets.edit")}</div>
        <SetTable
          sets={exercise.sets}
          metric={exercise.metric}
          variant="tracked"
          wrapped
          hint={historyHint}
          hintSuggested={hintSuggested}
          onBumpSet={onBumpSet}
          onSetValue={onSetValue}
          onToggleDone={onToggleSet}
          onRemove={onRemoveSet}
          onWarmUpChange={onWarmUpChange}
          onAddSet={onAddSet}
          addSetLabel={t("exerciseSets.add")}
        />
        <MButton type="button" variant="secondary" size="md" fullWidth onClick={onClose} style={{ marginTop: 16 }}>
          {t("exerciseSets.done")}
        </MButton>
      </div>
    </BottomSheet>
  );
}
