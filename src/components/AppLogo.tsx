import { APP_NAME, displayStyle, M } from "../theme";

type AppLogoProps = {
  variant?: "icon" | "wordmark";
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
};

/** Typographic brand mark — ÆVNR wordmark. */
export function AppLogo({ variant = "wordmark", size = 44, alt = APP_NAME, style }: AppLogoProps) {
  const fontSize = variant === "icon" ? Math.round(size * 0.5) : size;

  return (
    <span
      role="img"
      aria-label={alt}
      style={{
        ...displayStyle(fontSize),
        color: M.fg,
        display: "inline-block",
        lineHeight: 1,
        userSelect: "none",
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {APP_NAME}
    </span>
  );
}
