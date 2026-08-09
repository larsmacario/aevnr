import { useMemo, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import {
  buttonBase,
  buttonPressStyle,
  buttonSizes,
  brandButtonStyle,
  M,
  type ButtonSizeToken,
  type ButtonVariantToken,
} from "../theme";
import { prefersReducedMotion, triggerTapHaptic } from "../lib/haptics";

type ButtonVariant = ButtonVariantToken;
type ButtonSize = ButtonSizeToken;

export interface MButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  style?: CSSProperties;
}

const BASE_STYLE = buttonBase;
const SIZE_STYLE = buttonSizes;

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: brandButtonStyle(),
  secondary: { background: "transparent", color: M.fg, borderColor: M.line },
  ghost: { background: "transparent", color: M.mut, borderColor: "transparent" },
  danger: { background: "transparent", color: M.danger, borderColor: M.dangerBorder },
};

export function MButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  haptic = true,
  disabled,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  style,
  ...props
}: MButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = Boolean(disabled || loading);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const pressStyle =
    isDisabled || !pressed ? null : buttonPressStyle(variant, true, { reducedMotion });

  const handlePointerDown: MButtonProps["onPointerDown"] = async (event) => {
    onPointerDown?.(event);
    if (isDisabled) return;
    setPressed(true);
    if (haptic && variant === "primary") void triggerTapHaptic();
  };

  const handlePointerUp: MButtonProps["onPointerUp"] = (event) => {
    onPointerUp?.(event);
    setPressed(false);
  };

  const handlePointerCancel: MButtonProps["onPointerCancel"] = (event) => {
    onPointerCancel?.(event);
    setPressed(false);
  };

  const handlePointerLeave: MButtonProps["onPointerLeave"] = (event) => {
    onPointerLeave?.(event);
    setPressed(false);
  };

  const handleClick: MButtonProps["onClick"] = (event) => {
    if (isDisabled) return;
    onClick?.(event);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      style={{
        ...BASE_STYLE,
        ...SIZE_STYLE[size],
        ...VARIANT_STYLE[variant],
        ...(fullWidth ? { width: "100%" } : null),
        ...(isDisabled
          ? { opacity: 0.45, cursor: loading ? "wait" : "not-allowed" }
          : null),
        ...(pressStyle ?? null),
        ...style,
      }}
    />
  );
}
