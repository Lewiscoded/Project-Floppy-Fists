/**
 * Background music: a small step sequencer that plays the songs in audio/tracks/.
 *
 * updateMusic() runs every frame. It picks the song for the current screen (menu theme, or the map's song in
 * a match), crossfades when that changes, and turns the music down while the game is paused.
 *
 * How a song is written (see any file in audio/tracks/):
 *   chords: one chord per bar ('Am7'), or two for a split bar ('F G')
 *   parts: each part plays one instrument with ONE of these:
 *     pattern: drum hits per bar           'x . . . x . . .'   x = hit, X = loud hit, . = nothing
 *     bass:    chord tones per bar          'R . . 5 . . 8 .'   R root, 3 third, 5 fifth, 7 seventh, 8 octave,
 *                                                              6 sixth, ^ = half step below the next bar's root
 *     chord:   whole-chord hits per bar     'x . . . . . x .'
 *     arp:     single chord notes per bar   '1 . 3 . 5 . 3 .'   1 root, 3 second note, 5 third note, 7 fourth
 *     bars:    a written melody, one string per bar: 'E5 - G5 . C6 - - -'  note, '-' hold, '.' rest
 */
import { game } from '../core/state.js';
import { mapKey } from '../world/world.js';
import { audio } from './engine.js';
import { INSTRUMENTS } from './instruments.js';
import { uiFanfare, uiFight } from './sfx.js';
import { TRACKS } from './tracks/index.js';

const LOOKAHEAD = 0.2; // schedule notes this far ahead (seconds)
const TICK_MS = 40; // how often the scheduler wakes up

let playing = []; // songs currently sounding (the old one keeps going while it fades out)
let currentId = null;
let duck = null; // GainNode: turns music down while paused
let timer = null;
let lastState = null;

// ---------------------------------------------------------------- music theory helpers
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITIES = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
};

/** 'C#5' -> MIDI note number. */
function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** 'F#m7' -> { root: 6, intervals: [0,3,7,10] } (root as 0..11). */
function parseChord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const root = (NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { root, intervals: QUALITIES[m[3]] || QUALITIES[''] };
}

/** The chord playing at a step of a bar ('F G' splits the bar in half). */
function chordAt(track, bar, step) {
  const names = track.chords[bar % track.chords.length].split(' ');
  return parseChord(names[Math.min(names.length - 1, Math.floor((step / track.stepsPerBar) * names.length))]);
}

const tokens = (s) => s.trim().split(/\s+/);

/** How many steps until the next hit in a token list (used for note lengths). */
function lengthAt(list, i) {
  let n = 1;
  while (i + n < list.length && (list[i + n] === '.' || list[i + n] === '-')) n++;
  return n;
}

// ---------------------------------------------------------------- scheduling one step
/** Schedule every note of one step of a song. Exported so tools can render songs offline. */
export function playStep(p, time) {
  const { track } = p,
    step = p.step,
    bar = p.bar;
  const stepDur = 60 / track.bpm / track.stepsPerBeat;
  for (const part of track.parts) {
    const inst = INSTRUMENTS[part.inst];
    const vol = part.vol ?? 1;
    if (part.pattern) {
      const pat = Array.isArray(part.pattern) ? part.pattern[bar % part.pattern.length] : part.pattern;
      const t = tokens(pat)[step];
      if (t === 'x' || t === 'X') inst(p.out, time, 0, stepDur, vol * (t === 'X' ? 1 : 0.7));
    } else if (part.bass) {
      const list = tokens(Array.isArray(part.bass) ? part.bass[bar % part.bass.length] : part.bass);
      const t = list[step];
      if (!t || t === '.' || t === '-') continue;
      const ch = chordAt(track, bar, step);
      const base = 12 * ((part.octave ?? 2) + 1) + ch.root;
      let n = base;
      if (t === '3') n = base + ch.intervals[1];
      else if (t === '5') n = base + 7;
      else if (t === '6') n = base + 9;
      else if (t === '7') n = base + (ch.intervals[3] ?? 10);
      else if (t === '8') n = base + 12;
      else if (t === '^') n = 12 * ((part.octave ?? 2) + 1) + chordAt(track, bar + 1, 0).root - 1;
      inst(p.out, time, n, lengthAt(list, step) * stepDur * 0.9, vol);
    } else if (part.chord) {
      const list = tokens(part.chord);
      const t = list[step];
      if (t !== 'x' && t !== 'X') continue;
      const ch = chordAt(track, bar, step);
      const base = 12 * ((part.octave ?? 4) + 1) + ch.root;
      const d = lengthAt(list, step) * stepDur;
      for (const iv of ch.intervals) inst(p.out, time, base + iv, d, vol * (t === 'X' ? 1 : 0.75));
    } else if (part.arp) {
      const list = tokens(part.arp);
      const t = list[step];
      if (!t || t === '.' || t === '-') continue;
      const ch = chordAt(track, bar, step);
      const base = 12 * ((part.octave ?? 4) + 1) + ch.root;
      const iv = { 1: 0, 3: ch.intervals[1], 5: ch.intervals[2], 7: ch.intervals[3] ?? 12, 8: 12 }[t] ?? 0;
      inst(p.out, time, base + iv, lengthAt(list, step) * stepDur, vol);
    } else if (part.bars) {
      const list = tokens(part.bars[bar % part.bars.length]);
      const t = list[step];
      if (!t || t === '.' || t === '-') continue;
      const n = noteToMidi(t);
      if (n != null) inst(p.out, time, n, lengthAt(list, step) * stepDur * 0.95, vol);
    }
  }
}

/** Wake up, and schedule every note that falls inside the next LOOKAHEAD seconds. */
function tick() {
  if (!audio.ctx) return;
  const now = audio.ctx.currentTime;
  for (const p of playing) {
    const { track } = p,
      stepDur = 60 / track.bpm / track.stepsPerBeat;
    // the tab was asleep: don't play a pile of missed notes, just carry on from now
    if (p.barStart + p.step * stepDur < now - 0.25) {
      p.barStart = now + 0.05;
      p.step = 0;
    }
    for (;;) {
      const swing = p.step % 2 ? (track.swing || 0) * stepDur : 0;
      const time = p.barStart + p.step * stepDur + swing;
      if (time > now + LOOKAHEAD) break;
      if (!p.stopAt || time < p.stopAt) playStep(p, time);
      p.step++;
      if (p.step >= track.stepsPerBar) {
        p.step = 0;
        p.bar = (p.bar + 1) % track.chords.length;
        p.barStart += track.stepsPerBar * stepDur;
      }
    }
  }
  playing = playing.filter((p) => {
    if (p.stopAt && now > p.stopAt) {
      p.out.disconnect();
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------- switching songs
/** Fade to the song with this id ('menu', or a map key). */
export function playMusic(id) {
  if (!audio.ctx || id === currentId) return;
  const track = TRACKS[id];
  if (!track) return;
  currentId = id;
  const now = audio.ctx.currentTime;
  if (!duck) {
    duck = audio.ctx.createGain();
    duck.connect(audio.music);
  }
  for (const p of playing)
    if (!p.stopAt) {
      p.out.gain.setTargetAtTime(0, now, 0.35);
      p.stopAt = now + 1.8;
    }
  const out = audio.ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.setTargetAtTime(track.volume ?? 1, now + 0.25, 0.5);
  out.connect(duck);
  playing.push({ track, out, step: 0, bar: 0, barStart: now + 0.1, stopAt: 0 });
  if (!timer) timer = setInterval(tick, TICK_MS);
}

/** Name of the song playing now (shown nowhere yet, handy for debugging). */
export const currentSong = () => (currentId ? TRACKS[currentId].name : null);

/** Called every frame from main.js. */
export function updateMusic() {
  if (!audio.ctx) return;
  const want = game.state === 'play' ? mapKey : 'menu';
  playMusic(TRACKS[want] ? want : 'menu');
  if (duck)
    duck.gain.setTargetAtTime(game.state === 'play' && game.menuOpen ? 0.4 : 1, audio.ctx.currentTime, 0.15);
  // little stings when a match starts and when results show
  if (game.state !== lastState) {
    if (game.state === 'play' && lastState === 'lobby') uiFight();
    if (game.state === 'results') uiFanfare();
    lastState = game.state;
  }
}
