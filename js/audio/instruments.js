/**
 * Synthesized instruments for the music. Each one plays a single note:
 *   play(dest, time, midiNote, durationSeconds, velocity 0..1)
 * Drums ignore the note.
 */
import { audio, midiToHz } from './engine.js';

/** Envelope helper: quick attack, hold, then fade over `release`. */
function env(g, t, vol, attack, dur, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release);
  return t + Math.max(attack, dur) + release + 0.02;
}

function osc(type, freq, t, end, dest, detune = 0) {
  const o = audio.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(dest);
  o.start(t);
  o.stop(end);
  return o;
}

function filter(type, freq, q, dest) {
  const f = audio.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(dest);
  return f;
}

function noiseSrc(t, dur, dest) {
  const s = audio.ctx.createBufferSource();
  s.buffer = audio.noiseBuf;
  s.connect(dest);
  s.start(t, Math.random() * 1.5, dur + 0.05);
}

const gain = (dest) => {
  const g = audio.ctx.createGain();
  g.connect(dest);
  return g;
};

/** Soft-clipping curve for the 808 (adds the gritty harmonics that make it audible on small speakers). */
let clipCurve = null;
function softClip() {
  if (!clipCurve) {
    clipCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) clipCurve[i] = Math.tanh(((i / 1023) * 2 - 1) * 3.2);
  }
  const ws = audio.ctx.createWaveShaper();
  ws.curve = clipCurve;
  return ws;
}

export const INSTRUMENTS = {
  // ---------- drums ----------
  kick(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.9 * v, 0.002, 0.02, 0.28);
    const o = osc('sine', 150, t, end, g);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  },
  snare(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.45 * v, 0.001, 0.01, 0.16);
    noiseSrc(t, 0.2, filter('highpass', 1200, 0.7, g));
    const g2 = gain(dest);
    const end = env(g2, t, 0.25 * v, 0.001, 0.01, 0.08);
    osc('triangle', 190, t, end, g2);
  },
  clap(dest, t, n, d, v) {
    for (let i = 0; i < 3; i++) {
      const g = gain(dest);
      env(g, t + i * 0.012, 0.3 * v, 0.001, 0.005, i === 2 ? 0.14 : 0.02);
      noiseSrc(t + i * 0.012, 0.16, filter('bandpass', 1500, 1.4, g));
    }
  },
  hat(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.16 * v, 0.001, 0.005, 0.04);
    noiseSrc(t, 0.06, filter('highpass', 7500, 0.8, g));
  },
  openHat(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.13 * v, 0.001, 0.05, 0.22);
    noiseSrc(t, 0.3, filter('highpass', 7000, 0.8, g));
  },
  ride(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.07 * v, 0.001, 0.01, 0.35);
    noiseSrc(t, 0.4, filter('bandpass', 6500, 2.5, g));
    const g2 = gain(dest);
    const end = env(g2, t, 0.025 * v, 0.001, 0.01, 0.3);
    osc('square', 3200, t, end, filter('highpass', 3000, 1, g2));
  },
  brush(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.09 * v, 0.03, 0.04, 0.12);
    noiseSrc(t, 0.25, filter('bandpass', 3000, 0.6, g));
  },
  shaker(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.06 * v, 0.008, 0.01, 0.05);
    noiseSrc(t, 0.08, filter('bandpass', 8000, 1.2, g));
  },
  rim(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.18 * v, 0.001, 0.005, 0.05);
    osc('square', 1700, t, end, filter('bandpass', 1700, 6, g));
  },
  tambourine(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.12 * v, 0.002, 0.03, 0.14);
    noiseSrc(t, 0.2, filter('bandpass', 9000, 3, g));
  },
  frameDrum(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.55 * v, 0.003, 0.02, 0.22);
    const o = osc('sine', 110, t, end, g);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.15);
    const g2 = gain(dest);
    env(g2, t, 0.08 * v, 0.001, 0.005, 0.05);
    noiseSrc(t, 0.08, filter('lowpass', 1200, 0.7, g2));
  },
  crackle(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.05 * v, 0.0005, 0.001, 0.006);
    noiseSrc(t, 0.02, filter('highpass', 2500, 0.5, g));
  },

  trapHat(dest, t, n, d, v) {
    const g = gain(dest);
    env(g, t, 0.14 * v, 0.0005, 0.003, 0.028);
    noiseSrc(t, 0.04, filter('highpass', 9500, 0.9, g));
  },

  // ---------- bass ----------
  bass808(dest, t, n, d, v) {
    // a long sine "boom" that starts a little sharp (the punch), through a soft clipper for grit
    const g = gain(dest);
    const end = env(g, t, 0.55 * v, 0.004, Math.max(0.12, d * 0.92), 0.18);
    const ws = softClip();
    ws.connect(g);
    const drive = audio.ctx.createGain();
    drive.gain.value = 1.6;
    drive.connect(ws);
    const o = osc('sine', midiToHz(n), t, end, drive);
    o.frequency.setValueAtTime(midiToHz(n) * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(midiToHz(n), t + 0.05);
  },
  synthBass(dest, t, n, d, v) {
    const f = filter('lowpass', 900, 4, gain(dest));
    const g = f.context.createGain();
    g.connect(f);
    const end = env(g, t, 0.32 * v, 0.005, d * 0.8, 0.08);
    osc('sawtooth', midiToHz(n), t, end, g);
    osc('square', midiToHz(n - 12), t, end, g);
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.25);
  },
  upright(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 700, 1, dest));
    const end = env(g, t, 0.55 * v, 0.006, 0.05, Math.min(0.6, d + 0.15));
    osc('triangle', midiToHz(n), t, end, g);
    osc('sine', midiToHz(n + 12), t, end, gain(g)).frequency.value = midiToHz(n + 12);
  },
  subBass(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.6 * v, 0.008, d * 0.85, 0.12);
    osc('sine', midiToHz(n), t, end, g);
    const g2 = gain(dest);
    env(g2, t, 0.08 * v, 0.004, 0.03, 0.08);
    osc('square', midiToHz(n), t, t + 0.2, filter('lowpass', 600, 1, g2));
  },
  drone(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 800, 0.7, dest));
    const end = env(g, t, 0.13 * v, 0.2, d, 0.4);
    osc('sawtooth', midiToHz(n), t, end, g, -6);
    osc('sawtooth', midiToHz(n + 7), t, end, g, 6);
  },

  // ---------- chords / keys ----------
  pluck(dest, t, n, d, v) {
    const f = filter('lowpass', 2600, 1, dest);
    const g = gain(f);
    const end = env(g, t, 0.16 * v, 0.003, 0.02, 0.22);
    osc('square', midiToHz(n), t, end, g);
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.2);
  },
  vibes(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.18 * v, 0.003, 0.05, Math.min(1.2, d + 0.6));
    osc('sine', midiToHz(n), t, end, g);
    const g2 = gain(dest);
    env(g2, t, 0.05 * v, 0.002, 0.01, 0.25);
    osc('sine', midiToHz(n) * 4, t, end, g2);
    // tremolo, like a vibraphone's spinning fans
    const lfo = audio.ctx.createOscillator(),
      lg = audio.ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = 0.05 * v;
    lfo.connect(lg).connect(g.gain);
    lfo.start(t);
    lfo.stop(end);
  },
  rhodes(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 2200, 0.5, dest));
    const end = env(g, t, 0.13 * v, 0.006, d * 0.7, 0.5);
    osc('sine', midiToHz(n), t, end, g);
    osc('triangle', midiToHz(n), t, end, g, 7);
    const g2 = gain(dest);
    env(g2, t, 0.035 * v, 0.002, 0.01, 0.15);
    osc('sine', midiToHz(n) * 3, t, end, g2);
  },
  pad(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 1300, 0.6, dest));
    const end = env(g, t, 0.06 * v, 0.25, d, 0.5);
    osc('sawtooth', midiToHz(n), t, end, g, -8);
    osc('sawtooth', midiToHz(n), t, end, g, 8);
  },
  piano(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 2600, 0.5, dest));
    const end = env(g, t, 0.16 * v, 0.003, 0.03, Math.min(0.9, d + 0.35));
    osc('triangle', midiToHz(n), t, end, g);
    osc('square', midiToHz(n), t, end, gain(g)).detune.value = 4;
  },
  lute(dest, t, n, d, v) {
    const f = filter('bandpass', midiToHz(n) * 2.5, 1.5, dest);
    const g = gain(f);
    const end = env(g, t, 0.4 * v, 0.002, 0.01, 0.35);
    osc('sawtooth', midiToHz(n), t, end, g);
  },

  bell(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.14 * v, 0.002, 0.02, Math.min(1.4, d + 0.7));
    osc('sine', midiToHz(n), t, end, g);
    const g2 = gain(dest);
    env(g2, t, 0.05 * v, 0.001, 0.01, 0.35);
    osc('sine', midiToHz(n) * 2.76, t, end, g2);
    const g3 = gain(dest);
    env(g3, t, 0.02 * v, 0.001, 0.005, 0.12);
    osc('sine', midiToHz(n) * 5.4, t, end, g3);
  },

  // ---------- leads ----------
  squareLead(dest, t, n, d, v) {
    const g = gain(filter('lowpass', 3200, 0.8, dest));
    const end = env(g, t, 0.075 * v, 0.01, d * 0.9, 0.08);
    const o = osc('square', midiToHz(n), t, end, g);
    const lfo = audio.ctx.createOscillator(),
      lg = audio.ctx.createGain();
    lfo.frequency.value = 5.2;
    lg.gain.value = 6;
    lfo.connect(lg).connect(o.detune);
    lfo.start(t + 0.15);
    lfo.stop(end);
  },
  flute(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.13 * v, 0.04, d * 0.9, 0.1);
    const o = osc('sine', midiToHz(n), t, end, g);
    const lfo = audio.ctx.createOscillator(),
      lg = audio.ctx.createGain();
    lfo.frequency.value = 5;
    lg.gain.value = 9;
    lfo.connect(lg).connect(o.detune);
    lfo.start(t + 0.12);
    lfo.stop(end);
    const b = gain(dest);
    env(b, t, 0.02 * v, 0.03, d * 0.6, 0.08);
    noiseSrc(t, d + 0.1, filter('bandpass', midiToHz(n) * 2, 3, b));
  },
  whistle(dest, t, n, d, v) {
    const g = gain(dest);
    const end = env(g, t, 0.07 * v, 0.02, d * 0.85, 0.1);
    const o = osc('sine', midiToHz(n), t, end, g);
    o.frequency.setValueAtTime(midiToHz(n) * 0.97, t);
    o.frequency.linearRampToValueAtTime(midiToHz(n), t + 0.05);
  },
};
