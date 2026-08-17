import { useEffect, useState } from "react";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { M } from "../../theme";
import { useI18n } from "../../lib/i18n";

export interface TrackExerciseNoteSheetProps {
  open: boolean;
  exerciseName: string;
  note: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function TrackExerciseNoteSheet({
  open,
  exerciseName,
  note,
  onClose,
  onSave,
}: TrackExerciseNoteSheetProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (open) setDraft(note);
  }, [open, note]);

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("exercise.notesAria", { name: exerciseName })} fitContent>
      <div style={{ padding: "4px 20px 24px" }}>
        <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 18, color: M.fg, marginBottom: 12 }}>
          {t("exercise.notes")}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("exercise.notesPlaceholder")}
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: M.cardHi,
            border: "1px solid " + M.line2,
            borderRadius: 12,
            color: M.fg,
            fontFamily: M.body,
            fontSize: 14,
            lineHeight: 1.45,
            padding: "12px 14px",
            resize: "vertical",
            outline: "none",
          }}
        />
        <MButton
          type="button"
          variant="primary"
          size="md"
          fullWidth
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          style={{ marginTop: 14, fontFamily: M.label, letterSpacing: 0.4 }}
        >
          {t("exercise.save")}
        </MButton>
      </div>
    </BottomSheet>
  );
}
