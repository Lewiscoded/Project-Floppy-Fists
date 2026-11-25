/**
 * Audio engine: one Web Audio context with three volume channels.
 *
 *   sound effects ─┐
 *                  ├─> master ─> limiter ─> speakers
 *   music ─────────┘
 *
 * Volumes come from Settings (prefs.set.master / fx / music). Browsers only allow audio after the player
 * clicks or presses a key, so initAudio() is called on the first input.
 */
import { prefs } from '../core/prefs.js';

export const audio = {
  ctx: null, // AudioContext, null until the first click
  master: null, // GainNode
  sfx: null, // GainNode every sound effect connects to
  music: null, // GainNode every music track connects to
  noiseBuf: null, // 2 s of white noise, shared by drums and effects
};

export function initAudio() {
  try {
    if (!audio.ctx) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(ctx.destination);
      audio.master = ctx.createGain();
      audio.master.connect(limiter);
      audio.sfx = ctx.createGain();
      audio.sfx.connect(audio.master);
      audio.music = ctx.createGain();
      audio.music.connect(audio.master);
      const len = ctx.sampleRate * 2;
      audio.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = audio.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      audio.ctx = ctx;
      syncVolumes();
    }
    audio.ctx.resume();
  } catch (e) {
    // no audio support: the game just stays silent
  }
}

/** Apply the volume sliders from Settings. */
export function syncVolumes() {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  audio.master.gain.setTargetAtTime(prefs.set.master, t, 0.05);
  audio.sfx.gain.setTargetAtTime(prefs.set.fx, t, 0.05);
  audio.music.gain.setTargetAtTime(prefs.set.music, t, 0.05);
}

/** Current audio time in seconds (0 before audio starts). */
export const audioNow = () => (audio.ctx ? audio.ctx.currentTime : 0);

/** MIDI note number -> frequency in Hz. */
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
