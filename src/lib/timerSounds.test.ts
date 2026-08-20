import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  countdownSecond,
  playTimerCue,
  playStartCountdown,
  stopStartCountdown,
  preloadStartCountdownSound,
  playBoxBreathSound,
  preloadBoxBreathSound,
  startBreathingTicker,
  stopBreathingTicker,
  preloadBreathingTickerSound,
} from "./timerSounds";
import { getSoundAssetUrl } from "./timerAudioEngine";

describe("timerSounds", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates countdownSecond correctly", () => {
    expect(countdownSecond(3.0)).toBe(3);
    expect(countdownSecond(2.99)).toBe(3);
    expect(countdownSecond(2.01)).toBe(3);
    expect(countdownSecond(2.0)).toBe(2);
    expect(countdownSecond(1.01)).toBe(2);
    expect(countdownSecond(1.0)).toBe(1);
    expect(countdownSecond(0.5)).toBe(1);
    expect(countdownSecond(0.0)).toBe(0);
  });

  it("resolves sound asset URL cleanly", () => {
    const url = getSoundAssetUrl("sounds/3-2-1.mp3");
    expect(url).toContain("sounds/3-2-1.mp3");

    const breathUrl = getSoundAssetUrl("sounds/box_breath.mp3");
    expect(breathUrl).toContain("sounds/box_breath.mp3");

    const tickerUrl = getSoundAssetUrl("sounds/clock-ticking.mp3");
    expect(tickerUrl).toContain("sounds/clock-ticking.mp3");
  });

  it("handles playTimerCue and start countdown without throwing", async () => {
    expect(() => playTimerCue("go", "klassisch")).not.toThrow();
    expect(() => playTimerCue("tick", "boxring")).not.toThrow();
    expect(() => playTimerCue("rest", "pfeife")).not.toThrow();
    expect(() => playTimerCue("done", "sanft")).not.toThrow();

    expect(() => playStartCountdown(0)).not.toThrow();
    expect(() => stopStartCountdown()).not.toThrow();
    await expect(preloadStartCountdownSound()).resolves.toBeDefined();

    expect(() => playBoxBreathSound()).not.toThrow();
    await expect(preloadBoxBreathSound()).resolves.toBeDefined();

    expect(() => startBreathingTicker(0.3)).not.toThrow();
    expect(() => stopBreathingTicker()).not.toThrow();
    await expect(preloadBreathingTickerSound()).resolves.toBeDefined();
  });
});


