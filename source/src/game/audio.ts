// Procedural Web Audio chiptune — 4 themes (per level) + SFX. No external samples.

let ctxRef: AudioContext | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicLoopId: number | null = null;
let muted = false;

export type MusicTheme = 'overworld' | 'underground' | 'sky' | 'castle';

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctxRef) {
    try {
      ctxRef = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
    musicGain = ctxRef.createGain();
    musicGain.gain.value = 0.10;
    musicGain.connect(ctxRef.destination);
    sfxGain = ctxRef.createGain();
    sfxGain.gain.value = 0.20;
    sfxGain.connect(ctxRef.destination);
  }
  return ctxRef;
}

export function unlock() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(v: boolean) {
  muted = v;
  if (musicGain) musicGain.gain.value = v ? 0 : 0.10;
  if (sfxGain) sfxGain.gain.value = v ? 0 : 0.20;
}

export function isMuted() {
  return muted;
}

// ─────────────────────────────────────────────────────────────────────────────
// SFX
// ─────────────────────────────────────────────────────────────────────────────

interface ToneOpts {
  freq: number;
  freq2?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

function tone({ freq, freq2, dur, type = 'square', vol = 1 }: ToneOpts) {
  const ctx = getCtx();
  if (!ctx || !sfxGain) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), ctx.currentTime + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.02);
}

function noiseBurst(dur: number, vol = 0.5, hp = 800) {
  const ctx = getCtx();
  if (!ctx || !sfxGain) return;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filt);
  filt.connect(g);
  g.connect(sfxGain);
  src.start();
  src.stop(ctx.currentTime + dur + 0.02);
}

function arpeggio(notes: number[], stepMs: number, dur: number, vol = 0.3) {
  notes.forEach((f, i) => setTimeout(() => tone({ freq: f, dur, type: 'square', vol }), i * stepMs));
}

export const sfx = {
  jump() { tone({ freq: 320, freq2: 720, dur: 0.12, type: 'square', vol: 0.32 }); },
  stomp() { tone({ freq: 700, freq2: 80, dur: 0.16, type: 'sawtooth', vol: 0.34 }); noiseBurst(0.08, 0.18, 1200); },
  coin() { tone({ freq: 988, dur: 0.05, type: 'square', vol: 0.28 }); setTimeout(() => tone({ freq: 1319, dur: 0.18, type: 'square', vol: 0.32 }), 50); },
  die() {
    tone({ freq: 380, freq2: 80, dur: 0.5, type: 'square', vol: 0.34 });
    tone({ freq: 220, freq2: 60, dur: 0.6, type: 'sawtooth', vol: 0.2 });
  },
  thud() { noiseBurst(0.06, 0.16, 400); },
  win() {
    const seq = [523, 659, 784, 1046];
    seq.forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.18, type: 'square', vol: 0.34 }), i * 110));
  },
  powerup() {
    arpeggio([523, 659, 784, 988, 1175], 60, 0.10, 0.32);
  },
  powerdown() {
    arpeggio([784, 622, 494, 392], 80, 0.10, 0.3);
  },
  fireball() { tone({ freq: 880, freq2: 220, dur: 0.10, type: 'sawtooth', vol: 0.26 }); },
  bowserHit() { tone({ freq: 220, freq2: 80, dur: 0.20, type: 'sawtooth', vol: 0.4 }); noiseBurst(0.12, 0.3, 200); },
  bowserFire() { tone({ freq: 110, freq2: 60, dur: 0.18, type: 'sawtooth', vol: 0.32 }); },
  bump() { tone({ freq: 200, freq2: 90, dur: 0.06, type: 'square', vol: 0.26 }); },
  brickBreak() {
    tone({ freq: 600, freq2: 100, dur: 0.10, type: 'sawtooth', vol: 0.3 });
    noiseBurst(0.10, 0.25, 1500);
  },
  shellKick() { tone({ freq: 540, freq2: 1080, dur: 0.08, type: 'square', vol: 0.32 }); },
  gameComplete() {
    const seq = [523, 659, 784, 1046, 1318, 1568, 2093];
    seq.forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.20, type: 'square', vol: 0.36 }), i * 130));
  },
  start() { tone({ freq: 540, freq2: 900, dur: 0.18, type: 'triangle', vol: 0.3 }); },
};

// ─────────────────────────────────────────────────────────────────────────────
// Music — 4 procedural themes per level
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeSeq {
  bass: (number | null)[];
  lead: (number | null)[];
  stepMs: number;
  bassType: OscillatorType;
  leadType: OscillatorType;
  bassVol: number;
  leadVol: number;
}

// Overworld — bright bouncy melody (Base brand jingle vibe)
const OVERWORLD: ThemeSeq = {
  bass: [
    220, null, 220, null, 247, null, 220, null,
    196, null, 196, null, 220, null, 196, null,
    185, null, 185, null, 196, null, 220, null,
    220, null, 247, 277, 247, 220, 196, 220,
  ],
  lead: [
    null, 880, null, 988, null, 880, null, 784,
    null, 698, null, 784, null, 880, null, 784,
    null, 659, null, 698, null, 784, null, 880,
    988, 1046, null, 988, 880, 784, 698, 659,
  ],
  stepMs: 125,
  bassType: 'triangle',
  leadType: 'square',
  bassVol: 0.18,
  leadVol: 0.10,
};

// Underground — slow, ominous, walking bassline
const UNDERGROUND: ThemeSeq = {
  bass: [
    110, null, null, null, 123, null, null, null,
    98,  null, null, null, 110, null, null, null,
    87,  null, null, null, 98,  null, null, null,
    110, null, 123, null, 110, null, 98,  null,
  ],
  lead: [
    null, null, 220, null, null, null, 247, null,
    null, null, 196, null, null, null, 220, null,
    null, null, 175, null, null, null, 196, null,
    220, null, 247, null, 220, null, 196, null,
  ],
  stepMs: 160,
  bassType: 'sawtooth',
  leadType: 'square',
  bassVol: 0.20,
  leadVol: 0.10,
};

// Sky — light, airy, high-pitched melody
const SKY: ThemeSeq = {
  bass: [
    349, null, null, null, 392, null, null, null,
    330, null, null, null, 392, null, null, null,
    349, null, null, null, 440, null, null, null,
    392, null, 349, null, 330, null, 294, null,
  ],
  lead: [
    null, 1175, 1319, 1396, null, 1175, 1319, 1568,
    null, 1046, 1175, 1319, null, 1175, 1319, 1396,
    null, 1175, 1319, 1568, null, 1318, 1480, 1568,
    1760, 1568, 1396, 1319, 1175, 1046, 880, 988,
  ],
  stepMs: 110,
  bassType: 'triangle',
  leadType: 'triangle',
  bassVol: 0.14,
  leadVol: 0.08,
};

// Castle — deep dark, marching rhythm
const CASTLE: ThemeSeq = {
  bass: [
    82, 82, null, 92, 82, 82, null, 92,
    87, 87, null, 98, 87, 87, null, 98,
    82, 82, null, 92, 82, 82, null, 92,
    73, 73, null, 82, 87, 92, 98, 110,
  ],
  lead: [
    null, null, 220, null, null, null, 247, null,
    null, null, 233, null, null, null, 261, null,
    null, null, 220, null, null, null, 247, null,
    196, 220, 247, 261, 220, 196, 165, 147,
  ],
  stepMs: 140,
  bassType: 'sawtooth',
  leadType: 'square',
  bassVol: 0.22,
  leadVol: 0.12,
};

const THEMES: Record<MusicTheme, ThemeSeq> = {
  overworld: OVERWORLD,
  underground: UNDERGROUND,
  sky: SKY,
  castle: CASTLE,
};

let _step = 0;
let _activeTheme: MusicTheme | null = null;

export function startMusic(theme: MusicTheme) {
  const ctx = getCtx();
  if (!ctx) return;
  // If already playing this theme, do nothing
  if (_activeTheme === theme && musicLoopId !== null) return;
  stopMusic();
  _activeTheme = theme;
  _step = 0;
  const seq = THEMES[theme];
  const tick = () => {
    if (musicLoopId === null) return;
    const b = seq.bass[_step % seq.bass.length];
    const l = seq.lead[_step % seq.lead.length];
    if (b != null && musicGain) {
      const o = ctx.createOscillator();
      o.type = seq.bassType;
      o.frequency.value = b;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(seq.bassVol, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seq.stepMs / 1000 * 0.9);
      o.connect(g); g.connect(musicGain);
      o.start(); o.stop(ctx.currentTime + seq.stepMs / 1000 + 0.05);
    }
    if (l != null && musicGain) {
      const o = ctx.createOscillator();
      o.type = seq.leadType;
      o.frequency.value = l;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(seq.leadVol, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seq.stepMs / 1000 * 0.6);
      o.connect(g); g.connect(musicGain);
      o.start(); o.stop(ctx.currentTime + seq.stepMs / 1000 + 0.05);
    }
    _step += 1;
    musicLoopId = window.setTimeout(tick, seq.stepMs) as unknown as number;
  };
  musicLoopId = window.setTimeout(tick, 0) as unknown as number;
}

export function stopMusic() {
  if (musicLoopId !== null) {
    clearTimeout(musicLoopId);
    musicLoopId = null;
  }
  _activeTheme = null;
}
