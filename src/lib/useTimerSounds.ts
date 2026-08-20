import { useEffect, useRef } from "react";
import type { TimerSnapshot } from "./engine";
import {
  playStartCountdown,
  preloadStartCountdownSound,
  stopStartCountdown,
} from "./timerSounds";

export function useIntervalTimerSounds(
  snapshot: Pick<
    TimerSnapshot,
    "running" | "phase" | "kind" | "round" | "bigSeconds" | "done" | "mode" | "countUp" | "idle"
  >,
  enabled: boolean,
  _packId?: string,
  _cap?: number,
) {
  const segmentKey = useRef<string>("");
  const countdownPlaying = useRef(false);

  useEffect(() => {
    if (enabled) {
      void preloadStartCountdownSound();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || snapshot.idle || !snapshot.running || snapshot.done) {
      if (countdownPlaying.current) {
        stopStartCountdown();
        countdownPlaying.current = false;
      }
      if (!enabled || snapshot.idle) {
        segmentKey.current = "";
      }
      return;
    }

    const isBreathe = snapshot.mode === "breathe";
    const key = `${snapshot.phase}:${snapshot.kind}:${snapshot.round}`;

    if (key !== segmentKey.current) {
      segmentKey.current = key;
      countdownPlaying.current = false;
    }

    // Play 3-2-1 sound on the last 3 seconds of prep, round (work) or pause (rest)
    if (!isBreathe && !snapshot.countUp) {
      if (snapshot.bigSeconds <= 3.05 && !countdownPlaying.current) {
        countdownPlaying.current = true;
        const offset = Math.max(0, 3.0 - snapshot.bigSeconds);
        playStartCountdown(offset);
      }
    }
  }, [
    enabled,
    snapshot.idle,
    snapshot.running,
    snapshot.phase,
    snapshot.kind,
    snapshot.round,
    snapshot.bigSeconds,
    snapshot.done,
    snapshot.mode,
    snapshot.countUp,
  ]);

  useEffect(() => {
    return () => {
      stopStartCountdown();
    };
  }, []);
}

export function useRestTimerSounds(
  rest: number,
  restActive: boolean,
  enabled: boolean,
  _packId?: string,
) {
  const countdownPlaying = useRef(false);

  useEffect(() => {
    if (enabled) {
      void preloadStartCountdownSound();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !restActive || rest <= 0) {
      if (countdownPlaying.current) {
        stopStartCountdown();
        countdownPlaying.current = false;
      }
      return;
    }

    // Play 3-2-1 countdown on the last 3 seconds of rest timer
    if (rest <= 3.05) {
      if (!countdownPlaying.current) {
        countdownPlaying.current = true;
        const offset = Math.max(0, 3.0 - rest);
        playStartCountdown(offset);
      }
    }
  }, [enabled, rest, restActive]);

  useEffect(() => {
    return () => {
      stopStartCountdown();
    };
  }, []);
}


