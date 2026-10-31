// Tiny synthesized sound effects (Web Audio). Created lazily on the first user gesture.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let crackle: { gain: GainNode } | null = null;
let muted = false;

export function initAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // looping fire crackle bed
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp).connect(g).connect(master);
    src.start();
    crackle = { gain: g };
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

export function setFireLevel(level: number) {
  if (!ctx || !crackle) return;
  const v = Math.min(0.22, level * 0.035) * (0.7 + Math.random() * 0.6);
  crackle.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

function noise(dur: number, type: BiquadFilterType, f0: number, f1: number, vol: number) {
  if (!ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  splash: () => noise(0.5, "lowpass", 3000, 400, 0.6),
  hiss: () => noise(0.7, "highpass", 4000, 1500, 0.35),
  whoosh: () => {
    noise(1.1, "lowpass", 300, 2500, 0.9);
    tone("sine", 90, 40, 0.8, 0.5);
  },
  zap: () => {
    tone("square", 180, 60, 0.35, 0.25);
    tone("sawtooth", 1200, 200, 0.25, 0.15, 0.05);
    noise(0.3, "highpass", 5000, 3000, 0.3);
  },
  splat: () => {
    noise(0.35, "bandpass", 1200, 300, 0.6);
    tone("sine", 220, 80, 0.25, 0.3);
  },
  smother: () => noise(0.5, "lowpass", 800, 100, 0.6),
  pickup: () => {
    tone("triangle", 520, 520, 0.08, 0.25);
    tone("triangle", 780, 780, 0.12, 0.25, 0.08);
  },
  hurt: () => tone("sawtooth", 300, 90, 0.35, 0.3),
  jump: () => tone("sine", 300, 600, 0.12, 0.15),
  ignite: () => noise(0.4, "lowpass", 400, 1800, 0.3),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, f, 0.18, 0.25, i * 0.1)),
  lose: () => [392, 330, 262].forEach((f, i) => tone("triangle", f, f * 0.98, 0.25, 0.25, i * 0.15)),
  hint: () => tone("sine", 440, 330, 0.12, 0.12),
  alarm: () => {
    tone("square", 880, 880, 0.15, 0.12);
    tone("square", 660, 660, 0.15, 0.12, 0.18);
  },
};
