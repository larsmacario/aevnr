import type { CSSProperties } from "react";

// ÆVNR (Arbeitstitel) — Superpower-style monochrome premium (Paper White, Ink, rationierte Graustufen).
export const APP_NAME = "ÆVNR";
/** PWA home-screen label (max. ~12 Zeichen empfohlen). */
export const APP_NAME_SHORT = "ÆVNR";
/** Geplante Marketing-Domain (Arbeitstitel). */
export const APP_DOMAIN = "aevos.life";

export const M = {
  /** Leicht warmer Seitenhintergrund lässt weiße Inhaltskarten klar hervortreten. */
  bg: "#F6F6F4",
  panel: "#FFFFFF",
  card: "#FFFFFF",
  cardHi: "#F3F3F1",
  line: "rgba(24,24,27,0.09)",
  line2: "rgba(24,24,27,0.055)",
  fg: "#18181B",
  fgBody: "#52525B",
  mut: "#71717A",
  mut2: "#A1A1AA",
  acc: "#18181B",
  accSoft: "rgba(24,24,27,0.06)",
  accInk: "#FFFFFF",
  /** Monochrome accent alias — maps to ink, not chromatic color. */
  brand: "#18181B",
  brandStrong: "#18181B",
  brandText: "#18181B",
  brandSoft: "rgba(24,24,27,0.06)",
  brandInk: "#FFFFFF",
  brandBorder: "rgba(24,24,27,0.14)",
  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.08)",
  dangerBorder: "rgba(220,38,38,0.25)",
  warning: "#71717A",
  warningSoft: "rgba(113,113,122,0.10)",
  success: "#18181B",
  successSoft: "rgba(24,24,27,0.06)",
  /** Sanfte, breite Tiefe – sichtbar genug für Karten, ohne einen Glossy-Look. */
  shadow: "0 10px 30px rgba(24,24,27,0.055), 0 2px 8px rgba(24,24,27,0.025)",
  overlay: "rgba(24,24,27,0.40)",
  overlayLight: "rgba(24,24,27,0.04)",
  rest: "#71717A",
  prep: "#A1A1AA",
  display: "'Archivo', system-ui, sans-serif",
  numeric: "'Archivo', system-ui, sans-serif",
  label: "'Archivo', system-ui, sans-serif",
  body: "'Archivo', system-ui, sans-serif",
  /** @deprecated Use M.display, M.numeric, or M.label */
  disp: "'Archivo', system-ui, sans-serif",
  radiusCard: 12,
  radiusButton: 9999,
} as const;

/** Typography scale — minimum 12px for readable UI text on mobile. */
export const TYPE = {
  micro: 11,
  overline: 12,
  caption: 13,
  bodySm: 14,
  body: 15,
  titleSm: 18,
  title: 22,
  display: 28,
} as const;

/** Display headline — geometric sans, tight tracking (Superpower-style). */
export function displayStyle(fontSize: number, options?: { italic?: boolean }): CSSProperties {
  const tracking = fontSize >= 32 ? -0.03 : fontSize >= 24 ? -0.025 : -0.02;
  return {
    fontFamily: M.display,
    fontWeight: 500,
    fontSize,
    letterSpacing: `${tracking}em`,
    lineHeight: fontSize >= 28 ? 1.05 : 1.15,
    ...(options?.italic ? { fontStyle: "italic" as const } : null),
  };
}

/** Tabular numbers for timers, steppers, stats. */
export function numericStyle(options?: { fontSize?: number; fontWeight?: number }): CSSProperties {
  return {
    fontFamily: M.numeric,
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1',
    ...(options?.fontSize != null ? { fontSize: options.fontSize } : null),
    ...(options?.fontWeight != null ? { fontWeight: options.fontWeight } : null),
  };
}

/** Micro-labels — sentence case, muted (Superpower-style). */
export function labelStyle(options?: { fontSize?: number; letterSpacing?: number }): CSSProperties {
  return {
    fontFamily: M.label,
    fontSize: options?.fontSize ?? TYPE.caption,
    fontWeight: 500,
    letterSpacing: options?.letterSpacing ?? 0.01,
    color: M.mut,
  };
}

/** Compact exercise list rows (Track, Plan, Bibliothek, Picker). */
export const EXERCISE_ROW = {
  height: 56,
  iconSize: 34,
  iconRadius: 10,
  paddingX: 12,
  gap: 12,
  titleSize: 16,
  metaSize: 13,
  borderRadius: 12,
} as const;

export type ExerciseRowBackground = "card" | "panel" | "transparent";

export function exerciseRowStyle(options?: {
  background?: ExerciseRowBackground;
  borderRadius?: number;
}): CSSProperties {
  const bg = options?.background ?? "transparent";
  return {
    height: EXERCISE_ROW.height,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: EXERCISE_ROW.gap,
    padding: `0 ${EXERCISE_ROW.paddingX}px`,
    borderRadius: options?.borderRadius ?? EXERCISE_ROW.borderRadius,
    background: bg === "transparent" ? "transparent" : M.card,
    border: bg === "transparent" ? "none" : "1px solid " + M.line2,
    flexShrink: 0,
    width: "100%",
  };
}

export const exerciseRowEllipsis: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export type BrandSurfaceVariant = "hero" | "card" | "selected";

/** Premium surfaces – weiße Karten heben sich sanft vom Seitenhintergrund ab. */
export function brandSurface(variant: BrandSurfaceVariant): CSSProperties {
  switch (variant) {
    case "hero":
      return {
        background: M.card,
        border: "1px solid " + M.line,
        borderRadius: M.radiusCard,
        boxShadow: M.shadow,
      };
    case "card":
      return {
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: M.radiusCard,
        boxShadow: M.shadow,
      };
    case "selected":
      return {
        background: M.card,
        color: M.fg,
        border: `2px solid ${M.fg}`,
      };
  }
}

/** Primary CTA — solid ink pill (Superpower). */
export function brandButtonStyle(): CSSProperties {
  return {
    background: M.acc,
    color: M.accInk,
    borderColor: "transparent",
    fontFamily: M.body,
    fontWeight: 600,
    borderRadius: M.radiusButton,
  };
}

/** List selection — ink border on white. */
export function brandSelectionStyle(selected: boolean): CSSProperties {
  return selected
    ? {
        border: `2px solid ${M.fg}`,
        background: M.card,
        color: M.fg,
      }
    : {
        border: `1px solid ${M.line}`,
        background: M.bg,
        color: M.fg,
      };
}

/** Stacking order — sheets/overlays must stay above nav (10). */
export const Z = {
  nav: 10,
  sheet: 20,
  sheetRaised: 25,
  sheetHigh: 30,
  sheetTop: 40,
} as const;

export type SegmentKind = "work" | "rest" | "prep" | "done";

export const mKind = (k: SegmentKind): string =>
  k === "rest" ? M.rest : k === "prep" ? M.prep : M.acc;

export type ButtonSizeToken = "sm" | "md" | "lg" | "icon";
export type ButtonVariantToken = "primary" | "secondary" | "ghost" | "danger";

export const buttonPressTransition =
  "transform 150ms ease-out, opacity 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out";

export function buttonPressStyle(
  variant: ButtonVariantToken,
  pressed: boolean,
  options?: { reducedMotion?: boolean },
): CSSProperties | null {
  if (!pressed) return null;
  const reduced = options?.reducedMotion === true;

  if (reduced) {
    switch (variant) {
      case "primary":
        return { opacity: 0.88 };
      case "secondary":
        return { opacity: 0.88, borderColor: M.line };
      case "danger":
        return { opacity: 0.88 };
      case "ghost":
        return { opacity: 0.72 };
    }
  }

  switch (variant) {
    case "primary":
      return { transform: "scale(0.98)", opacity: 0.92 };
    case "secondary":
      return { transform: "scale(0.98)", borderColor: M.fg, background: M.accSoft };
    case "danger":
      return { transform: "scale(0.98)", background: M.dangerSoft };
    case "ghost":
      return { transform: "scale(0.98)" };
  }
}

export const buttonBase: CSSProperties = {
  border: "1px solid transparent",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: M.body,
  fontWeight: 600,
  fontSize: 14,
  lineHeight: 1,
  letterSpacing: 0.01,
  transition: buttonPressTransition,
  WebkitTapHighlightColor: "transparent",
};

export const buttonSizes: Record<ButtonSizeToken, CSSProperties> = {
  sm: { minHeight: 44, padding: "0 18px", borderRadius: M.radiusButton, fontSize: 14 },
  md: { minHeight: 48, padding: "0 22px", borderRadius: M.radiusButton, fontSize: 15 },
  lg: { minHeight: 52, padding: "0 26px", borderRadius: M.radiusButton, fontSize: 16 },
  icon: { width: 48, height: 48, padding: 0, borderRadius: M.radiusButton, fontSize: 15 },
};

export const mMini: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: M.body,
};

export const mMiniLg: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 11,
  border: "1px solid " + M.line,
  background: M.bg,
  color: M.fg,
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: M.body,
  flexShrink: 0,
};

/** Premium section spacing helper. */
export const SECTION_GAP = 28;
