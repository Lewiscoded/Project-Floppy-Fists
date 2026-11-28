/**
 * World controls: host-picked rules that bend the physics and add chaos.
 *
 * They live in game.match.world, so they travel to every player with the rest of the match settings
 * (the 'lobby' message) and get saved with your prefs. Every player's game reads them through the small
 * helpers below. The panel that changes them is ui/world-panel.js; rocket rain is game/rocket-rain.js.
 *
 * To add a control: add its default to WORLD_DEFAULTS, describe it in WORLD_STEPS or WORLD_TOGGLES
 * (the panel builds itself from those), then read it with wr('yourKey') wherever it should take effect.
 */
import { game } from '../core/state.js';
import { G } from './constants.js';

export const WORLD_DEFAULTS = {
  gravity: 1,
  speed: 1,
  knock: 1,
  bigHeads: false,
  bouncy: false,
  ice: false,
  boomProps: false,
  infJump: false,
  oneHit: false,
  rocketRain: false,
};

/** Controls with a few fixed settings: [value, label]. */
export const WORLD_STEPS = [
  {
    key: 'gravity',
    name: 'Gravity',
    icon: '🌍',
    steps: [
      [0.3, 'Moon'],
      [0.6, 'Low'],
      [1, 'Normal'],
      [1.5, 'Heavy'],
      [2.2, 'Jupiter'],
    ],
  },
  {
    key: 'speed',
    name: 'Game speed',
    icon: '⏱️',
    steps: [
      [0.25, 'Slow-mo'],
      [0.5, 'Half'],
      [1, 'Normal'],
      [1.5, 'Fast'],
      [2, 'Turbo'],
    ],
  },
  {
    key: 'knock',
    name: 'Knockback',
    icon: '💨',
    steps: [
      [0.5, 'Soft'],
      [1, 'Normal'],
      [2, 'Big'],
      [3, 'Huge'],
      [5, 'Cartoon'],
    ],
  },
];

/** On/off chaos toggles. */
export const WORLD_TOGGLES = [
  { key: 'bigHeads', name: 'Big heads', icon: '🎈', desc: 'Giant heads. Easier headshots.' },
  { key: 'bouncy', name: 'Bouncy floors', icon: '🏀', desc: 'Everything bounces off the ground.' },
  { key: 'ice', name: 'Ice', icon: '🧊', desc: 'Every floor is slippery.' },
  { key: 'boomProps', name: 'Explosive props', icon: '🧨', desc: 'Every prop explodes when hit hard.' },
  { key: 'infJump', name: 'Infinite jump', icon: '🦘', desc: 'Jump again in mid-air, forever.' },
  { key: 'oneHit', name: 'One-hit KOs', icon: '💀', desc: 'Any damage knocks you out.' },
  { key: 'rocketRain', name: 'Rocket rain', icon: '☄️', desc: 'Rockets fall from the sky.' },
];

/** The chosen setting of a world control (what the panel shows). */
export function worldValue(k) {
  const w = game.match && game.match.world;
  return w && w[k] !== undefined ? w[k] : WORLD_DEFAULTS[k];
}

/** The setting in effect right now: world controls only apply during a match, not to the menu demo. */
export const wr = (k) => (game.state === 'play' ? worldValue(k) : WORLD_DEFAULTS[k]);

/** True when every control is at its default. */
export const worldIsDefault = () =>
  Object.keys(WORLD_DEFAULTS).every((k) => worldValue(k) === WORLD_DEFAULTS[k]);

// ---------- helpers the game code calls ----------

/** Gravity acceleration (m/s²). */
export const gravity = () => G * wr('gravity');

/** Multiplier for every push from a hit or explosion. */
export const knockMul = () => wr('knock');

/** How much damage a hit really does (one-hit KOs turn any real hit into a knockout). */
export const hitDamage = (f, dmg) => (wr('oneHit') && dmg >= 0.5 ? Math.max(dmg, f.hp) : dmg);

/** Head size multiplier (big heads), for the head model and the head hitbox. */
export const headScale = () => (wr('bigHeads') ? 2.2 : 1);

/** Short labels for every control that isn't at its default (shown on the HUD). */
export function activeWorldTags() {
  const out = [];
  for (const s of WORLD_STEPS) {
    const v = worldValue(s.key);
    if (v !== WORLD_DEFAULTS[s.key])
      out.push(`${s.icon} ${s.name}: ${(s.steps.find((x) => x[0] === v) || [0, v + '×'])[1]}`);
  }
  for (const t of WORLD_TOGGLES) if (worldValue(t.key)) out.push(`${t.icon} ${t.name}`);
  return out;
}
