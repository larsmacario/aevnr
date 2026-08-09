import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PhoneShell } from "../components/PhoneShell";
import { AppLogo } from "../components/AppLogo";
import { APP_NAME, displayStyle, M } from "../theme";
import { MButton } from "../components/MButton";

export type WelcomeExit = "signup" | "login";

const SLIDE_COUNT = 3;
const SWIPE_THRESHOLD_PX = 50;

const grainBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

type WelcomeScreenProps = {
  onContinue: (target: WelcomeExit) => void;
};

function SlideBrand() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <AppLogo size={56} />
      <p
        style={{
          margin: 0,
          fontFamily: M.body,
          fontWeight: 500,
          fontSize: 16,
          color: M.mut,
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.45,
        }}
      >
        Dein Begleiter für Training, Erholung und langfristige Gesundheit.
      </p>
    </div>
  );
}

function SlideFeature({
  title,
  body,
  iconSize = 72,
}: {
  title: string;
  body: string;
  iconSize?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "0 12px" }}>
      <AppLogo size={iconSize} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <h2
          style={{
            margin: 0,
            ...displayStyle(32),
            color: M.fg,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: M.body,
            fontWeight: 500,
            fontSize: 16,
            lineHeight: 1.5,
            color: M.mut,
            maxWidth: 300,
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={M.accInk}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, i)));
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (endX == null) return;
    const dx = endX - touchStartX.current;
    if (dx < -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (dx > SWIPE_THRESHOLD_PX) goTo(index - 1);
    touchStartX.current = null;
  };

  const slides = [
    <SlideBrand key="brand" />,
    <SlideFeature
      key="track"
      title="Workouts tracken"
      body="Erfasse Sätze, Gewichte und Wiederholungen. Nutze den Timer und behalte deinen Verlauf im Blick."
    />,
    <SlideFeature
      key="plan"
      title="Kostenfrei nutzen"
      body="Kein Abo, keine versteckten Kosten. KI-Pläne kannst du bei Bedarf einzeln und ohne Abonnement dazubuchen."
    />,
  ];

  return (
    <PhoneShell reserveBottomSafeArea>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: M.bg,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            mixBlendMode: "multiply",
            pointerEvents: "none",
            backgroundImage: grainBg,
            zIndex: 1,
          }}
        />

        <div
          role="region"
          aria-roledescription="Karussell"
          aria-label={`Willkommen bei ${APP_NAME}`}
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 2,
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
            <motion.div
              style={{
                display: "flex",
                height: "100%",
                width: `${SLIDE_COUNT * 100}%`,
              }}
              animate={{ x: `-${(index / SLIDE_COUNT) * 100}%` }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {slides.map((slide, i) => (
                <div
                  key={i}
                  aria-hidden={index !== i}
                  style={{
                    width: `${100 / SLIDE_COUNT}%`,
                    flexShrink: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px 28px 8px",
                    boxSizing: "border-box",
                  }}
                >
                  {slide}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: "8px 28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            role="tablist"
            aria-label="Onboarding-Folien"
            style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}
          >
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={index === i}
                aria-current={index === i ? "true" : undefined}
                aria-label={`Folie ${i + 1} von ${SLIDE_COUNT}`}
                onClick={() => goTo(i)}
                style={{
                  width: index === i ? 28 : 10,
                  height: 10,
                  borderRadius: index === i ? 6 : 5,
                  border: "none",
                  padding: 0,
                  minWidth: 44,
                  minHeight: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: index === i ? 28 : 10,
                    height: 10,
                    borderRadius: index === i ? 6 : 5,
                    background: index === i ? M.fg : M.line,
                    display: "block",
                    transition: "width .2s ease, background .2s ease",
                  }}
                />
              </button>
            ))}
          </div>

          <MButton
            type="button"
            onClick={() => onContinue("signup")}
            variant="primary"
            size="lg"
            fullWidth
          >
            Los geht&apos;s
            <ArrowIcon />
          </MButton>

          <MButton
            type="button"
            onClick={() => onContinue("login")}
            variant="ghost"
            size="sm"
            style={{ fontFamily: M.body, fontWeight: 500, color: M.mut }}
          >
            Ich habe bereits ein Konto —{" "}
            <span style={{ color: M.fg, fontWeight: 700 }}>Anmelden</span>
          </MButton>
        </div>
      </div>
    </PhoneShell>
  );
}
