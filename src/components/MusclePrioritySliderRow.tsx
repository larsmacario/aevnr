import type { CSSProperties } from "react";
import { M } from "../theme";
import {
  MUSCLE_PRIORITY_MAX,
  MUSCLE_PRIORITY_MIN,
  clampMusclePriority,
} from "../lib/musclePriorities";
import { useI18n } from "../lib/i18n";

export interface MusclePrioritySliderRowProps {
  group: string;
  groupLabel?: string;
  value: number;
  onChange: (value: number) => void;
}

export function MusclePrioritySliderRow({ group, groupLabel = group, value, onChange }: MusclePrioritySliderRowProps) {
  const { t } = useI18n();
  const pct =
    ((value - MUSCLE_PRIORITY_MIN) / (MUSCLE_PRIORITY_MAX - MUSCLE_PRIORITY_MIN)) * 100;

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid " + M.line,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{groupLabel}</span>
        <span style={{ fontSize: 13, color: M.brand, fontWeight: 600 }}>
          {t(`aiPlan.muscles.priority${clampMusclePriority(value)}` as "aiPlan.muscles.priority1")}
        </span>
      </div>
      <input
        type="range"
        className="muscle-prio-range"
        min={MUSCLE_PRIORITY_MIN}
        max={MUSCLE_PRIORITY_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label={t("aiPlan.muscles.aria", { group: groupLabel })}
        style={{ "--muscle-prio-pct": `${pct}%` } as CSSProperties}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 13,
          color: M.mut2,
          fontWeight: 500,
        }}
      >
        <span>{t("aiPlan.muscles.minimum")}</span>
        <span>{t("aiPlan.muscles.maximum")}</span>
      </div>
    </div>
  );
}
