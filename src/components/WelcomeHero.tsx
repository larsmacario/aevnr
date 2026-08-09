import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { APP_NAME, displayStyle, M } from "../theme";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

type WelcomeHeroProps = {
  size?: number;
};

export function WelcomeHero({ size = 200 }: WelcomeHeroProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      style={{
        width: size,
        height: size * 0.45,
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <motion.span
        style={{
          ...displayStyle(Math.round(size * 0.22)),
          color: M.fg,
          textAlign: "center",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {APP_NAME}
      </motion.span>
    </div>
  );
}
