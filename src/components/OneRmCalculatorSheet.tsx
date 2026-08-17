import { BottomSheet } from "./BottomSheet";
import { OneRmCalculatorBody } from "./OneRmCalculatorBody";
import { M } from "../theme";
import { useI18n } from "../lib/i18n";

export interface OneRmCalculatorSheetProps {
  open: boolean;
  onClose: () => void;
  initialWeight?: number;
  initialReps?: number;
  /** Remount body when open exercise changes (e.g. exercise id). */
  resetKey?: string;
}

export function OneRmCalculatorSheet({
  open,
  onClose,
  initialWeight,
  initialReps,
  resetKey,
}: OneRmCalculatorSheetProps) {
  const { t } = useI18n();
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={30} aria-label={t("oneRm.calculator")}>
      <div
        style={{
          fontFamily: M.display,
          fontWeight: 400,
          fontSize: 22,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {t("oneRm.calculator")}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <OneRmCalculatorBody
          key={resetKey}
          compact
          initialWeight={initialWeight}
          initialReps={initialReps}
        />
      </div>
    </BottomSheet>
  );
}
