// The game's sounds, synthesised in the browser: square and triangle tones and filtered
// noise, chiptune in character, quiet. Nothing plays until the player has started a round
// (a gesture opens the audio), and a mute is remembered. No audio files.

type Voice = 'you' | 'caddie' | 'partner';

let ac: AudioContext | null = null;
let out: GainNode | null = null;
let muted = (() => {
  try {
    return localStorage.getItem('ot-mute') === '1';
  } catch {
    return false;
  }
})();
const VOLUME = 0.22;

/** Open the audio: only ever from a click or a key */
export function init() {
  try {
    if (!ac) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      out = ac.createGain();
      out.gain.value = muted ? 0 : VOLUME;
      out.connect(ac.destination);
    }
    if (ac.state === 'suspended') void ac.resume();
  } catch {
    ac = null;
  }
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('ot-mute', m ? '1' : '0');
  } catch {
    /* private mode: remembered for the visit only */
  }
  if (out && ac) out.gain.setTargetAtTime(m ? 0 : VOLUME, ac.currentTime, 0.02);
}

const live = () => !!ac && !!out && !muted && ac.state === 'running';

// A tone: a wave from one pitch to another, with a short attack and an even fall
function tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'square', at = 0) {
  if (!live()) return;
  const t = ac!.currentTime + at;
  const o = ac!.createOscillator();
  const g = ac!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Noise through a filter, swept from one frequency to another
let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol: number, f0: number, f1 = f0, type: BiquadFilterType = 'bandpass', at = 0, attack = 0.004) {
  if (!live()) return;
  if (!noiseBuf) {
    noiseBuf = ac!.createBuffer(1, ac!.sampleRate, ac!.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac!.currentTime + at;
  const src = ac!.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac!.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  f.Q.value = 0.9;
  const g = ac!.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out!);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------------------
// The scenes

const BLIP: Record<Voice, [number, OscillatorType]> = {
  you: [520, 'square'],
  caddie: [300, 'triangle'],
  partner: [700, 'square'],
};
/** A letter typed: each voice its own pitch and grain */
export function blip(who: string) {
  const [f, type] = BLIP[who as Voice] ?? BLIP.you;
  tone(f * (0.96 + Math.random() * 0.08), f, 0.035, 0.05, type);
}
/** The next line */
export const click = () => tone(1400, 1100, 0.025, 0.05, 'square');
/** The shout: the key line caught */
export function shout() {
  noise(0.18, 0.12, 3000, 800, 'bandpass');
  [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.09, 0.08, 'square', 0.03 + i * 0.05));
  tone(1047, 1047, 0.3, 0.06, 'triangle', 0.25);
}
/** A moment kept: a small bell */
export function kept() {
  tone(1319, 1319, 0.5, 0.06, 'triangle');
  tone(1976, 1976, 0.45, 0.035, 'sine', 0.08);
}

// ---------------------------------------------------------------------------------------
// The golf

export const whoosh = () => noise(0.24, 0.08, 400, 2400, 'bandpass', 0, 0.12);
/** The strike: a ping off the middle, a dull buzz off the bottom, a tick for a putt */
export function contact(kind: 'pure' | 'good' | 'thin' | 'putt') {
  if (kind === 'putt') return tone(900, 700, 0.04, 0.05, 'triangle');
  if (kind === 'thin') {
    tone(180, 120, 0.09, 0.08, 'square');
    return noise(0.06, 0.05, 600);
  }
  noise(0.03, 0.08, 4000, 4000, 'highpass');
  tone(kind === 'pure' ? 1900 : 1500, kind === 'pure' ? 1800 : 1300, kind === 'pure' ? 0.16 : 0.08, 0.05, 'sine');
}
export const thud = () => tone(140, 60, 0.1, 0.09, 'sine');
export function knock() {
  tone(620, 380, 0.05, 0.07, 'square');
  noise(0.12, 0.05, 1800, 900);
}
export const sand = () => noise(0.22, 0.08, 1200, 500, 'lowpass');
export function splash() {
  noise(0.45, 0.09, 1400, 300, 'bandpass');
  tone(320, 140, 0.15, 0.05, 'sine', 0.02);
}
/** Into the cup: a rattle, then the drop */
export function cup() {
  [0, 0.05, 0.09].forEach((at) => tone(1200, 1100, 0.025, 0.05, 'triangle', at));
  tone(260, 160, 0.12, 0.07, 'sine', 0.13);
}
/** In from the tee: three notes up, after the drop */
export function ace() {
  [784, 988, 1319].forEach((f, i) => tone(f, f, i === 2 ? 0.4 : 0.1, 0.05, 'triangle', i * 0.1));
}
/** The rope: a murmur, a groan, a little applause */
export const murmur = () => noise(0.8, 0.04, 500, 400, 'lowpass', 0, 0.3);
export function groan() {
  murmur();
  tone(200, 130, 0.5, 0.03, 'sawtooth', 0.05);
}
export function applause() {
  for (let i = 0; i < 18; i++) noise(0.04, 0.035, 2500 + Math.random() * 1500, 2500, 'bandpass', i * 0.045 + Math.random() * 0.03);
}
/** The Flic, pressed */
export const flic = () => tone(2200, 1800, 0.02, 0.04, 'square');
