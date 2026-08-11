import { useEffect, useState } from "react";
import { toLocalDateKey } from "../lib/hydration";

/** Keeps calendar-day UI state aligned with the device's local midnight. */
export function useLocalDateKey(): string {
  const [dateKey, setDateKey] = useState(() => toLocalDateKey());

  useEffect(() => {
    const refresh = () => setDateKey(toLocalDateKey());
    let timeoutId: number | undefined;
    const scheduleMidnightRefresh = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      timeoutId = window.setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, Math.max(1, nextMidnight.getTime() - Date.now() + 10));
    };

    scheduleMidnightRefresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return dateKey;
}
