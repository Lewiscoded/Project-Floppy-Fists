/**
 * The World panel: buttons for the world controls (gravity, game speed, knockback and the chaos toggles).
 *
 * It appears in two places, built by the same code:
 *   - the lobby, in the folding "World" box under the match settings
 *   - Sandbox, behind the "World" tab of the spawn bar (Z), so the host can change things mid-game
 * Only the host can change anything. Everyone else sees the panel read-only.
 * The controls themselves are described in game/world-controls.js.
 */
import { uiError, uiToggle } from '../audio/sfx.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { game } from '../core/state.js';
import { $ } from '../core/util.js';
import {
  WORLD_DEFAULTS,
  WORLD_STEPS,
  WORLD_TOGGLES,
  activeWorldTags,
  worldIsDefault,
  worldValue,
} from '../game/world-controls.js';
import { broadcastLobby, isHost } from '../net/network.js';

/** HTML for the panel. Buttons carry data-wk (control) and data-wv (value) / data-wt (toggle). */
export function worldPanelHTML() {
  const host = isHost();
  const steps = WORLD_STEPS.map(
    (s) =>
      `<div class="wrow"><span class="wname">${s.icon} ${s.name}</span><span class="wseg">${s.steps
        .map(
          ([v, l]) =>
            `<button data-wk="${s.key}" data-wv="${v}" class="${worldValue(s.key) === v ? 'sel' : ''}">${l}</button>`
        )
        .join('')}</span></div>`
  ).join('');
  const toggles = WORLD_TOGGLES.map(
    (t) =>
      `<button class="wtog ${worldValue(t.key) ? 'on' : ''}" data-wt="${t.key}" title="${t.desc}"><span>${t.icon}</span>${t.name}</button>`
  ).join('');
  return `<div class="wpanel ${host ? '' : 'ro'}">${steps}<div class="wtogs">${toggles}</div>${
    host
      ? `<div class="wfoot"><span>Hover a toggle to see what it does.</span><button data-wreset ${worldIsDefault() ? 'disabled' : ''}>Reset world</button></div>`
      : `<div class="wfoot"><span>Only the host can change the world.</span></div>`
  }</div>`;
}

/** One-line summary for the folded lobby box, e.g. "Low gravity, Ice" or "Normal". */
export const worldSummary = () => {
  const t = activeWorldTags();
  return t.length ? t.join(' · ') : 'Normal';
};

/** Change one control (host only), save it and send it to everyone. */
export function setWorld(k, v) {
  if (!isHost()) return uiError();
  game.match.world = { ...WORLD_DEFAULTS, ...(game.match.world || {}), [k]: v };
  saveAndShare();
}

export function resetWorld() {
  if (!isHost()) return;
  game.match.world = { ...WORLD_DEFAULTS };
  saveAndShare();
}

function saveAndShare() {
  uiToggle();
  prefs.match = { ...game.match };
  savePrefs();
  broadcastLobby(); // match settings (world included) go to every player, mid-game too
  for (const f of listeners) f();
}

/** A client got new match settings from the host: refresh any open panel if the world changed. */
let lastSeen = '';
export function worldMaybeChanged() {
  const s = JSON.stringify(game.match.world || {});
  if (s === lastSeen) return;
  lastSeen = s;
  for (const f of listeners) f();
}

const listeners = [];
/** Run f whenever the world changes here (to re-render whatever shows the panel). */
export const onWorldChange = (f) => listeners.push(f);

/** Handle a click inside a panel. Returns true if it was a panel button. */
export function worldPanelClick(e) {
  const b = e.target.closest('[data-wk],[data-wt],[data-wreset]');
  if (!b) return false;
  if (b.dataset.wk) setWorld(b.dataset.wk, +b.dataset.wv);
  else if (b.dataset.wt) setWorld(b.dataset.wt, !worldValue(b.dataset.wt));
  else resetWorld();
  return true;
}

// ---------- lobby box ----------

export function renderLobbyWorld() {
  $('worldSum').textContent = worldSummary();
  $('worldSet').innerHTML = worldPanelHTML();
}
$('worldSet').addEventListener('click', (e) => worldPanelClick(e));
onWorldChange(() => game.state === 'lobby' && renderLobbyWorld());
