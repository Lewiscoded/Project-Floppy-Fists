/**
 * Saved player preferences (name, color, outfit, key binds, settings, stats) in localStorage,
 * the key-binding action list, and the current match settings.
 */
import { game } from './state.js';
import { now } from './util.js';
import { COLORS } from '../game/constants.js';
import { DEF_OUTFIT } from '../game/outfits.js';
import { THEMES } from '../world/maps/index.js';

game.state = 'menu';

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('pff') || '{}');
  } catch (e) {
    return {};
  }
})();

export const ACTIONS = [
  ['up', 'Move up', 'KeyW'],
  ['down', 'Move down', 'KeyS'],
  ['left', 'Move left', 'KeyA'],
  ['right', 'Move right', 'KeyD'],
  ['jump', 'Jump', 'Space'],
  ['block', 'Block / parry', 'KeyF'],
  ['grab', 'Grab / throw', 'KeyE'],
  ['slot1', 'Melee weapon', 'Digit1'],
  ['slot2', 'Gun', 'Digit2'],
  ['slot3', 'Explosive', 'Digit3'],
  ['loadout', 'Loadout', 'KeyQ'],
  ['chat', 'Type chat', 'Enter'],
  ['quick', 'Quick chat', 'KeyT'],
  ['emote', 'Emotes', 'KeyG'],
  ['wheel', 'Weapon wheel (sandbox)', 'KeyX'],
  ['spawn', 'Spawn menu (sandbox)', 'KeyZ'],
  ['fly', 'Free camera (sandbox)', 'KeyC'],
  ['rotate', 'Rotate spawn (sandbox)', 'KeyR'],
];

export const DEF_BINDS = Object.fromEntries(ACTIONS.map((a) => [a[0], a[2]]));

export const prefs = {
  name: saved.name || 'Player' + Math.floor(Math.random() * 90 + 10),
  col: saved.col ?? COLORS[0],
  loadout: Object.assign({ melee: 'bat', gun: 'shotgun', boom: 'rocket' }, saved.loadout || {}),
  map: THEMES[saved.map] ? saved.map : 'kitchen',
  quality: saved.quality === 'low' ? 'low' : 'high',
  set: Object.assign(
    { master: 0.8, fx: 1, shake: 1, cam: 1, tags: true, dmgNums: true, assist: true },
    saved.set || {}
  ),
  binds: Object.assign({}, DEF_BINDS, saved.binds || {}),
  stats: Object.assign({ matches: 0, wins: 0, kills: 0, deaths: 0, falls: 0, dmg: 0 }, saved.stats || {}),
  tutDone: !!saved.tutDone,
  match: saved.match || null,
  outfit: Object.assign({}, DEF_OUTFIT, saved.outfit || {}),
};

export function savePrefs() {
  try {
    localStorage.setItem('pff', JSON.stringify(prefs));
  } catch (e) {}
}

export const applyVolume = () => {
  game.VOLUME = prefs.set.master * prefs.set.fx;
};

applyVolume();

game.match = Object.assign(
  {
    mode: 'dm',
    killLimit: 10,
    timeLimit: 300,
    lives: 3,
    bots: 2,
    diff: 'normal',
    weapons: 'all',
    botAI: 'fight',
    map: prefs.map,
  },
  prefs.match || {}
);

game.matchEnd = 0;
game.lobbyRoster = [];
game.myReady = false;
game.resultsTimer = null;

export const matchLeft = () =>
  game.state === 'play' && game.matchEnd ? Math.max(0, game.matchEnd - now()) : 0;

export function setMatchClock(left) {
  if (!game.match.timeLimit) {
    game.matchEnd = 0;
    return;
  }
  const want = now() + left;
  if (!game.matchEnd || Math.abs(want - game.matchEnd) > 1500) game.matchEnd = want;
}

export const keyName = (c) =>
  !c
    ? '—'
    : c
        .replace(/^Key/, '')
        .replace(/^Digit/, '')
        .replace(/^Numpad/, 'Num ')
        .replace('ShiftLeft', 'L-Shift')
        .replace('ShiftRight', 'R-Shift')
        .replace('ControlLeft', 'L-Ctrl')
        .replace('ArrowUp', '↑')
        .replace('ArrowDown', '↓')
        .replace('ArrowLeft', '←')
        .replace('ArrowRight', '→');

export const keyLabel = (a) => keyName(prefs.binds[a]);
