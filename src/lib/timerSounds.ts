import { DEFAULT_TIMER_SOUND_PACK_ID } from "./timerSoundPacks";
import {
  playPackCue,
  playStartCountdown,
  stopStartCountdown,
  preloadStartCountdownSound,
} from "./timerAudioEngine";

export type TimerCue = "tick" | "go" | "rest" | "done";

export function playTimerCue(cue: TimerCue, packId = DEFAULT_TIMER_SOUND_PACK_ID) {
  playPackCue(packId, cue);
}

export { playStartCountdown, stopStartCountdown, preloadStartCountdownSound };

export function countdownSecond(seconds: number): number {
  return Math.max(0, Math.ceil(seconds - 1e-6));
}


