import type { CSSProperties } from "react";
import { brandSelectionStyle, M } from "../theme";
import { trainingWeekdayLabel } from "../lib/trainingWeekdays";
import { useI18n } from "../lib/i18n";

const weekdayTileStyle = (selected: boolean, disabled: boolean): CSSProperties => ({
  padding: "12px 2px",
  minWidth: 0,
  borderRadius: 12,
  ...(disabled
    ? {
        background: M.card,
        border: `1px solid ${M.line}`,
        color: M.mut2,
        opacity: 0.45,
        cursor: "not-allowed",
      }
    : brandSelectionStyle(selected)),
  fontFamily: M.body,
  fontSize: 13,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export interface PlanDayWeekdayPickerProps {
  value: number;
  disabledWeekdays: number[];
  onChange: (weekday: number) => void;
  /** Optional label above the picker (default: TRAININGSTAG) */
  label?: string;
  compact?: boolean;
}

export function PlanDayWeekdayPicker({
  value,
  disabledWeekdays,
  onChange,
  label,
  compact = false,
}: PlanDayWeekdayPickerProps) {
  const { locale, t } = useI18n();
  const resolvedLabel = label ?? t("planDay.trainingDay");
  return (
    <div style={{ flexShrink: 0, padding: compact ? "0" : "0 0 10px" }}>
      {resolvedLabel ? (
        <span
          style={{
            display: "block",
            fontSize: 13,
            letterSpacing: 1.2,
            color: M.mut2,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {resolvedLabel}
        </span>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: 7 }, (_, weekdayIndex) => trainingWeekdayLabel(weekdayIndex, locale)).map((wdLabel, weekdayIndex) => {
          const isSelected = value === weekdayIndex;
          const isDisabled = !isSelected && disabledWeekdays.includes(weekdayIndex);
          return (
            <button
              key={wdLabel}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                onChange(weekdayIndex);
              }}
              style={weekdayTileStyle(isSelected, isDisabled)}
              aria-label={
                isDisabled
                  ? t("planDay.weekdayAssigned", { weekday: wdLabel })
                  : t("planDay.chooseWeekday", { weekday: wdLabel })
              }
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
            >
              {wdLabel.replace(".", "")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
