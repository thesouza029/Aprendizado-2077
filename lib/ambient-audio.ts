"use client";

/**
 * Trilha ambiente synthwave gerada na hora com a Web Audio API (nenhum arquivo de áudio).
 * Um "pad" de 4 vozes (2 osciladores dente-de-serra levemente desafinados por voz)
 * passa por um filtro passa-baixa que abre e fecha devagar, mais um eco.
 * Os acordes seguem a progressão Lá menor, Fá, Dó, Sol, trocando a cada 8 segundos.
 */

const CHORDS: number[][] = [
  [110.0, 164.81, 220.0, 261.63], // Am
  [87.31, 130.81, 174.61, 220.0], // F
  [130.81, 196.0, 261.63, 329.63], // C
  [98.0, 146.83, 196.0, 246.94], // G
];
const CHORD_SECONDS = 8;
const VOLUME = 0.05;

type Engine = { stop: () => void };
let engine: Engine | null = null;

export function isAmbientPlaying(): boolean {
  return engine !== null;
}

export function startAmbient(): void {
  if (engine || typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(VOLUME, now + 3); // entra suave
  master.connect(ctx.destination);

  // eco
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  // filtro que "respira" com um LFO bem lento
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  filter.Q.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 350;
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);
  lfo.start();
  filter.connect(master);
  filter.connect(delay);

  const voices = ctx.createGain();
  voices.gain.value = 0.18;
  voices.connect(filter);

  const first = CHORDS[0]!;
  const oscillators: OscillatorNode[] = [];
  first.forEach((freq) => {
    for (const detune of [-8, 8]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(voices);
      osc.start();
      oscillators.push(osc);
    }
  });

  let index = 0;
  const timer = window.setInterval(() => {
    index = (index + 1) % CHORDS.length;
    const chord = CHORDS[index]!;
    const t = ctx.currentTime;
    oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(chord[Math.floor(i / 2)]!, t, 0.8));
  }, CHORD_SECONDS * 1000);

  engine = {
    stop: () => {
      window.clearInterval(timer);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 1); // sai suave
      window.setTimeout(() => void ctx.close(), 1200);
    },
  };
}

export function stopAmbient(): void {
  engine?.stop();
  engine = null;
}
