/**
 * Sound effects, synthesized live (no audio files).
 *
 * Game sounds: sfx() plays a quick pitched blip, noise() a burst of filtered noise, volAt() fades sounds by
 * distance from your fighter.
 * UI sounds: uiHover, uiClick, uiBigClick, uiToggle, uiOpen, uiClose, uiError, uiSuccess, uiType, uiFight,
 * uiFanfare, uiPow.
 */
import { clamp } from '../core/util.js';
import { localPlayer } from '../game/bodies.js';
import { PELV } from '../game/constants.js';
import { audio } from './engine.js';

/** A blip: oscillator at f Hz sliding down over d seconds. */
export function sfx(f, d, type = 'triangle', vol = 0.2) {
  if (!audio.ctx || vol <= 0.0005) return;
  const ctx = audio.ctx,
    t = ctx.currentTime,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.35), t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(audio.sfx);
  o.start(t);
  o.stop(t + d);
}

/** A burst of noise fading out over d seconds, low-passed at freq Hz. */
export function noise(d, vol, freq = 900) {
  if (!audio.ctx) return;
  const ctx = audio.ctx,
    t = ctx.currentTime,
    s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = audio.noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f).connect(g).connect(audio.sfx);
  s.start(t, Math.random() * 1.5, d + 0.05);
}

/** Volume factor for a sound at world point p: quieter the further it is from you. */
export const volAt = (p) => {
  const me = localPlayer();
  if (!me) return 1;
  return clamp(1 - me.pos[PELV].distanceTo(p) / 45, 0.1, 1);
};

// ---------------------------------------------------------------- UI sounds

/** Play a tone with an exact pitch curve and envelope (used by the UI sounds). */
function tone({ f, to = f, d = 0.1, type = 'sine', vol = 0.1, at = 0, attack = 0.004 }) {
  if (!audio.ctx) return;
  const ctx = audio.ctx,
    t = ctx.currentTime + at,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, t + d);
  o.connect(g).connect(audio.sfx);
  o.start(t);
  o.stop(t + d + 0.02);
}

/** Filtered noise sweep (whooshes). */
function sweep({ from, to, d, vol, type = 'bandpass', q = 1.2 }) {
  if (!audio.ctx) return;
  const ctx = audio.ctx,
    t = ctx.currentTime,
    s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = audio.noiseBuf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + d * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0005, t + d);
  s.connect(f).connect(g).connect(audio.sfx);
  s.start(t, Math.random(), d + 0.05);
}

/** Soft tick when the mouse moves onto a button. */
export const uiHover = () => tone({ f: 2400, d: 0.03, type: 'sine', vol: 0.025 });

/** Normal button click: a short wooden "tok". */
export function uiClick() {
  tone({ f: 900, to: 520, d: 0.06, type: 'triangle', vol: 0.12 });
  tone({ f: 1800, d: 0.025, type: 'square', vol: 0.02 });
}

/** Big yellow buttons (Play, Start, Done): a bouncy "boing-pop". */
export function uiBigClick() {
  tone({ f: 420, to: 880, d: 0.09, type: 'triangle', vol: 0.15 });
  tone({ f: 1320, d: 0.08, type: 'sine', vol: 0.06, at: 0.05 });
}

/** Picking an option (mode, color, hat...): a bright pop. */
export const uiToggle = () => tone({ f: 660, to: 990, d: 0.07, type: 'sine', vol: 0.11 });

/** A menu panel opens: a quick upward paper swoosh. */
export const uiOpen = () => sweep({ from: 500, to: 2600, d: 0.16, vol: 0.09 });

/** A menu panel closes: the swoosh going down. */
export const uiClose = () => sweep({ from: 2200, to: 400, d: 0.14, vol: 0.07 });

/** Something went wrong (bad room code, room full...): a comic "bwomp". */
export function uiError() {
  tone({ f: 220, to: 150, d: 0.18, type: 'square', vol: 0.06 });
  tone({ f: 165, to: 110, d: 0.24, type: 'square', vol: 0.05, at: 0.12 });
}

/** Something worked (connected, copied): two rising chimes. */
export function uiSuccess() {
  tone({ f: 784, d: 0.12, type: 'sine', vol: 0.09 });
  tone({ f: 1175, d: 0.2, type: 'sine', vol: 0.08, at: 0.08 });
}

/** Typing in a text box. */
export const uiType = () => tone({ f: 1500 + Math.random() * 400, d: 0.02, type: 'square', vol: 0.012 });

/** Match start: a little "ding ding DING!" */
export function uiFight() {
  [523, 659, 1046].forEach((f, i) =>
    tone({ f, d: i === 2 ? 0.45 : 0.14, type: 'triangle', vol: 0.12, at: i * 0.12 })
  );
  sweep({ from: 300, to: 3000, d: 0.35, vol: 0.06 });
}

/** Results screen: a short brass-ish fanfare. */
export function uiFanfare() {
  const notes = [
    [523, 0, 0.14],
    [659, 0.14, 0.14],
    [784, 0.28, 0.14],
    [1046, 0.42, 0.6],
  ];
  for (const [f, at, d] of notes) {
    tone({ f, d, type: 'sawtooth', vol: 0.05, at, attack: 0.02 });
    tone({ f: f / 2, d, type: 'triangle', vol: 0.06, at, attack: 0.02 });
  }
}

/** Comic kill burst: a punchy "POW" thump plus a crack. */
export function uiPow(vol = 1) {
  tone({ f: 180, to: 55, d: 0.22, type: 'sine', vol: 0.22 * vol });
  sweep({ from: 3000, to: 600, d: 0.12, vol: 0.1 * vol, type: 'lowpass', q: 0.7 });
}
