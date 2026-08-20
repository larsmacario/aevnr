import type { TimerCue } from "./timerSounds";

type OscType = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function out(): GainNode | null {
  audio();
  return master;
}

let countdownBuffer: AudioBuffer | null = null;
let countdownLoadingPromise: Promise<AudioBuffer | null> | null = null;
let currentCountdownSource: AudioBufferSourceNode | null = null;
let fallbackAudio: HTMLAudioElement | null = null;

export function getSoundAssetUrl(relativePath: string): string {
  const clean = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  if (typeof window !== "undefined" && window.location) {
    try {
      return new URL(clean, document.baseURI || window.location.href).href;
    } catch {
      // fallback
    }
  }
  const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "./";
  return base.endsWith("/") ? `${base}${clean}` : `${base}/${clean}`;
}

export async function preloadStartCountdownSound(): Promise<AudioBuffer | null> {
  if (typeof window === "undefined") return null;
  const c = audio();
  if (!c) return null;
  if (countdownBuffer) return countdownBuffer;
  if (countdownLoadingPromise) {
    return countdownLoadingPromise;
  }
  countdownLoadingPromise = (async () => {
    try {
      const url = getSoundAssetUrl("sounds/3-2-1.mp3");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      countdownBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const promise = c.decodeAudioData(arrayBuffer, resolve, reject);
        if (promise && typeof promise.then === "function") {
          promise.then(resolve, reject);
        }
      });
      return countdownBuffer;
    } catch (e) {
      console.warn("Could not decode 3-2-1 sound buffer:", e);
      return null;
    } finally {
      countdownLoadingPromise = null;
    }
  })();
  return countdownLoadingPromise;
}

export function stopStartCountdown() {
  if (currentCountdownSource) {
    try {
      currentCountdownSource.stop();
      currentCountdownSource.disconnect();
    } catch {
      // already stopped
    }
    currentCountdownSource = null;
  }
  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

export function playStartCountdown(offsetSeconds = 0) {
  stopStartCountdown();
  const c = audio();
  const destination = out();

  if (c && destination && countdownBuffer) {
    try {
      const source = c.createBufferSource();
      source.buffer = countdownBuffer;
      source.connect(destination);
      const validOffset = Math.max(0, Math.min(offsetSeconds, Math.max(0, countdownBuffer.duration - 0.05)));
      source.start(0, validOffset);
      currentCountdownSource = source;
      source.onended = () => {
        if (currentCountdownSource === source) {
          currentCountdownSource = null;
        }
      };
      return;
    } catch (e) {
      console.warn("Failed to play start countdown from buffer:", e);
    }
  }

  if (typeof window !== "undefined") {
    void preloadStartCountdownSound();
    const url = getSoundAssetUrl("sounds/3-2-1.mp3");
    try {
      if (!fallbackAudio) {
        fallbackAudio = new Audio(url);
      }
      fallbackAudio.currentTime = Math.max(0, offsetSeconds);
      void fallbackAudio.play().catch(() => {
        // Autoplay policy or unhandled error
      });
    } catch {
      // ignore
    }
  }
}



function tone(
  freq: number,
  dur: number,
  gain: number,
  when = 0,
  type: OscType = "sine",
  freqEnd?: number,
) {
  const c = audio();
  const destination = out();
  if (!c || !destination) return;

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function bellStrike(
  fundamental: number,
  dur: number,
  gain: number,
  when = 0,
  inharmonic = 2.76,
) {
  const c = audio();
  const destination = out();
  if (!c || !destination) return;

  const t0 = c.currentTime + when;
  const partials = [
    { mult: 1, g: 1 },
    { mult: inharmonic, g: 0.55 },
    { mult: inharmonic * 1.5, g: 0.28 },
    { mult: inharmonic * 2.1, g: 0.14 },
  ];

  for (const p of partials) {
    const osc = c.createOscillator();
    const mod = c.createOscillator();
    const modGain = c.createGain();
    const g = c.createGain();
    const freq = fundamental * p.mult;

    osc.type = "sine";
    mod.type = "sine";
    osc.frequency.value = freq;
    mod.frequency.value = freq * 1.004;

    modGain.gain.setValueAtTime(0, t0);
    modGain.gain.linearRampToValueAtTime(freq * 0.012, t0 + 0.003);
    modGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain * p.g, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(destination);
    osc.start(t0);
    mod.start(t0);
    osc.stop(t0 + dur + 0.05);
    mod.stop(t0 + dur + 0.05);
  }
}

/** Schiedsrichter-/Trainerpfeife: zwei feste Obertöne, kein Rauschen. */
function refereeWhistle(
  dur: number,
  gain: number,
  when = 0,
  freqs: [number, number] = [2860, 3168],
) {
  const c = audio();
  const destination = out();
  if (!c || !destination) return;

  const t0 = c.currentTime + when;
  const attack = 0.006;
  const release = Math.min(0.035, dur * 0.2);

  for (const freq of freqs) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain * 0.5, t0 + attack);
    g.gain.setValueAtTime(gain * 0.5, Math.max(t0 + attack, t0 + dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

/** Kurzer Anlauf in die Pfeifen-Töne — klingt natürlicher als ein Sweep. */
function refereeWhistleGo(gain: number, when = 0) {
  const c = audio();
  const destination = out();
  if (!c || !destination) return;

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2100, t0);
  osc.frequency.exponentialRampToValueAtTime(2860, t0 + 0.045);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain * 0.35, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  osc.connect(g);
  g.connect(destination);
  osc.start(t0);
  osc.stop(t0 + 0.06);

  refereeWhistle(0.32, gain, when + 0.04);
}

function playPfeife(cue: TimerCue) {
  switch (cue) {
    case "tick":
      refereeWhistle(0.055, 0.32);
      break;
    case "go":
      refereeWhistleGo(0.38);
      break;
    case "rest":
      refereeWhistle(0.2, 0.3, 0, [2680, 2960]);
      break;
    case "done":
      refereeWhistle(0.16, 0.34, 0);
      refereeWhistle(0.16, 0.34, 0.2);
      refereeWhistle(0.26, 0.36, 0.4);
      break;
  }
}

function playKlassisch(cue: TimerCue) {
  switch (cue) {
    case "tick":
      tone(1000, 0.05, 0.38, 0, "square");
      break;
    case "go":
      tone(880, 0.09, 0.4, 0, "square");
      tone(1175, 0.12, 0.34, 0.1, "square");
      break;
    case "rest":
      tone(520, 0.16, 0.28, 0, "triangle", 380);
      break;
    case "done":
      tone(880, 0.06, 0.34, 0, "square");
      tone(880, 0.06, 0.34, 0.14, "square");
      tone(880, 0.06, 0.34, 0.28, "square");
      tone(1318, 0.28, 0.36, 0.42, "square", 880);
      break;
  }
}

function playBoxring(cue: TimerCue) {
  switch (cue) {
    case "tick":
      bellStrike(920, 0.12, 0.22, 0, 2.4);
      break;
    case "go":
      bellStrike(380, 1.35, 0.42, 0, 2.65);
      break;
    case "rest":
      bellStrike(320, 0.75, 0.32, 0, 2.5);
      break;
    case "done":
      bellStrike(400, 1.1, 0.4, 0, 2.65);
      bellStrike(400, 1.1, 0.38, 0.65, 2.65);
      break;
  }
}


function playSanft(cue: TimerCue) {
  switch (cue) {
    case "tick":
      tone(784, 0.08, 0.14, 0, "sine");
      break;
    case "go":
      tone(523, 0.45, 0.16, 0, "sine");
      tone(659, 0.4, 0.13, 0.1, "sine");
      tone(784, 0.55, 0.11, 0.2, "sine");
      break;
    case "rest":
      tone(440, 0.5, 0.12, 0, "sine", 370);
      break;
    case "done":
      tone(659, 0.55, 0.14, 0, "sine");
      tone(784, 0.65, 0.12, 0.4, "sine");
      break;
  }
}

const PACK_PLAYERS: Record<string, (cue: TimerCue) => void> = {
  klassisch: playKlassisch,
  boxring: playBoxring,
  pfeife: playPfeife,
  sanft: playSanft,
};

export function playPackCue(packId: string, cue: TimerCue) {
  const play = PACK_PLAYERS[packId] ?? playKlassisch;
  play(cue);
}
