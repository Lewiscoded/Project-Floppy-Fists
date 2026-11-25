/**
 * Sound effects synthesized with the Web Audio API (no audio files). sfx() plays a tone; volAt() fades by distance.
 */
import { game } from './core/state.js';
import { clamp } from './core/util.js';
import { localPlayer } from './game/bodies.js';
import { PELV } from './game/constants.js';

let actx = null;
game.VOLUME = 1;

export function initAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    actx.resume();
  } catch (e) {}
}

export function sfx(f, d, type = 'triangle', vol = 0.2) {
  if (!actx) return;
  const t = actx.currentTime,
    o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.35), t + d);
  vol *= game.VOLUME;
  if (vol <= 0.0005) return;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + d);
}

export function noise(d, vol, freq = 900) {
  if (!actx) return;
  const len = Math.floor(actx.sampleRate * d),
    buf = actx.createBuffer(1, len, actx.sampleRate),
    ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const s = actx.createBufferSource(),
    f = actx.createBiquadFilter(),
    g = actx.createGain();
  s.buffer = buf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.value = vol * game.VOLUME;
  s.connect(f).connect(g).connect(actx.destination);
  s.start();
}

export const volAt = (p) => {
  const me = localPlayer();
  if (!me) return 1;
  return clamp(1 - me.pos[PELV].distanceTo(p) / 45, 0.1, 1);
};
