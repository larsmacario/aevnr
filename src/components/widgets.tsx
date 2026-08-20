import type { ReactNode } from "react";
import { labelStyle, M, numericStyle } from "../theme";
import { Icon } from "./Icon";

export interface MStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fmt?: (v: number) => string;
  disabled?: boolean;
  size?: "default" | "lg";
  minWidth?: number;
}

export function MStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  fmt,
  disabled,
  size = "default",
  minWidth,
}: MStepperProps) {
  const isLg = size === "lg";
  const btnSize = isLg ? 44 : 26;
  const btnRadius = isLg ? 12 : 8;
  const iconSize = isLg ? 18 : 14;
  const valueFontSize = isLg ? 36 : 22;
  const defaultMinWidth = isLg ? 96 : 72;
  const valueMinWidth = minWidth ?? defaultMinWidth;
  const gap = isLg ? 16 : 8;

  const btn = (d: number) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{
        width: btnSize,
        height: btnSize,
        borderRadius: btnRadius,
        border: "1px solid " + M.line,
        background: M.card,
        color: disabled ? M.mut2 : M.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        flex: "0 0 auto",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <Icon name={d > 0 ? "plus" : "minus"} size={iconSize} stroke={2.4} />
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap }}>
      {btn(-step)}
      <span
        style={{
          fontFamily: M.numeric,
          fontWeight: 700,
          fontSize: valueFontSize,
          minWidth: valueMinWidth,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.5,
          lineHeight: 1,
        }}
      >
        {fmt ? fmt(value) : value}
      </span>
      {btn(step)}
    </div>
  );
}

export interface MSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function MSwitch({ checked, onChange, disabled }: MSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        border: "1px solid " + (checked ? "transparent" : M.line),
        background: checked ? M.acc : M.line2,
        cursor: disabled ? "default" : "pointer",
        position: "relative",
        padding: 0,
        flex: "0 0 auto",
        opacity: disabled ? 0.5 : 1,
        transition: "background .15s",
        ...(checked ? { boxShadow: "" } : null),
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 23 : 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: checked ? M.accInk : M.bg,
          transition: "left .15s",
        }}
      />
    </button>
  );
}

// pill tag
export function MTag({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: on ? M.accInk : M.mut,
        padding: "6px 12px",
        borderRadius: 9999,
        background: on ? M.acc : M.bg,
        border: "1px solid " + (on ? "transparent" : M.line2),
        whiteSpace: "nowrap",
        ...(on ? { boxShadow: "" } : null),
      }}
    >
      {children}
    </span>
  );
}

// stat tile
export function MStat({
  label,
  value,
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: M.bg,
        border: "1px solid " + M.line2,
        borderRadius: 14,
        padding: "14px 14px 12px",
      }}
    >
      <div style={{ ...labelStyle(), lineHeight: 1.25 }}>{label}</div>
      <div
        style={{
          ...numericStyle({ fontSize: 26, fontWeight: 600 }),
          marginTop: 4,
          letterSpacing: -0.02,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: M.mut2, marginTop: 3, fontWeight: 600 }}>{sub}</div>
      )}
    </div>
  );
}
