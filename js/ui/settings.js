/**
 * Settings screen (volume, sensitivity, key rebinding), graphics toggle and the controls help table.
 */
import { game } from '../core/state.js';
import { ACTIONS, DEF_BINDS, applyVolume, keyLabel, keyName, prefs, savePrefs } from '../core/prefs.js';
import { $ } from '../core/util.js';
import { syncVolumes } from '../audio/engine.js';
import { applyQuality } from '../render/renderer.js';
import { menuIsOpen, renderLoadout } from './menu.js';
import { openTutorial } from './tutorial.js';

// ---------- settings ----------
export function renderSettings() {
  const S = prefs.set;
  const rng = (k, l, min, max, step, fmt) =>
    `<label>${l}<span style="display:flex;align-items:center;gap:8px"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${S[k]}"><small style="width:38px">${fmt(S[k])}</small></span></label>`;
  const chk = (k, l) => `<label>${l}<input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}></label>`;
  const pct = (v) => Math.round(v * 100) + '%';
  $('setGrid').innerHTML =
    rng('master', 'Master volume', 0, 1, 0.05, pct) +
    rng('fx', 'Effects volume', 0, 1, 0.05, pct) +
    rng('music', 'Music volume', 0, 1, 0.05, pct) +
    rng('shake', 'Screen shake', 0, 1.5, 0.1, pct) +
    rng('cam', 'Camera distance', 0.75, 1.4, 0.05, pct) +
    chk('tags', 'Show name tags') +
    chk('dmgNums', 'Show damage numbers') +
    chk('assist', 'Controller aim assist') +
    `<label>Graphics<button class="gfxBtn">Graphics: ${prefs.quality === 'high' ? 'High' : 'Low'}</button></label>`;
  for (const b of $('setGrid').querySelectorAll('.gfxBtn')) b.onclick = toggleGfx;
  $('binds').innerHTML =
    ACTIONS.map(
      ([a, l]) =>
        `<div class="bind">${l}<button data-a="${a}" class="${game.rebinding === a ? 'wait' : ''}">${game.rebinding === a ? 'Press a key…' : keyName(prefs.binds[a])}</button></div>`
    ).join('') +
    `<div class="bind">Attack<button disabled>Left click</button></div><div class="bind">Block (alt)<button disabled>Right click</button></div>`;
}

$('setGrid').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  prefs.set[k] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
  savePrefs();
  applyVolume();
  syncVolumes();
  const sm = e.target.parentElement.querySelector('small');
  if (sm) sm.textContent = Math.round(prefs.set[k] * 100) + '%';
});

$('binds').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  game.rebinding = b.dataset.a;
  renderSettings();
});

$('resetBinds').onclick = () => {
  prefs.binds = { ...DEF_BINDS };
  savePrefs();
  renderSettings();
  renderHelp();
};

$('showTut').onclick = () => {
  closeSettings();
  openTutorial();
};

export function openSettings() {
  renderSettings();
  $('settings').classList.remove('hidden');
  game.menuOpen = true;
}

export function closeSettings() {
  game.rebinding = null;
  $('settings').classList.add('hidden');
  game.menuOpen = menuIsOpen();
  renderHelp();
  renderLoadout();
}

$('setClose').onclick = closeSettings;

function toggleGfx() {
  prefs.quality = prefs.quality === 'high' ? 'low' : 'high';
  savePrefs();
  applyQuality(prefs.quality);
  renderGfx();
}

export function renderGfx() {
  for (const b of document.querySelectorAll('.gfxBtn'))
    b.textContent = 'Graphics: ' + (prefs.quality === 'high' ? 'High' : 'Low');
}

for (const b of document.querySelectorAll('.gfxBtn')) b.onclick = toggleGfx;

export function renderHelp() {
  $('ctlTable').innerHTML =
    `<tr><td>Move / aim</td><td><kbd>${keyLabel('up')}</kbd><kbd>${keyLabel('left')}</kbd><kbd>${keyLabel('down')}</kbd><kbd>${keyLabel('right')}</kbd> + mouse · or a controller</td></tr>
    <tr><td>Attack</td><td>Left click (hold for the rifle)</td></tr>
    <tr><td>Block / parry</td><td>Hold right click or <kbd>${keyLabel('block')}</kbd> with a melee weapon · tap it just before a hit lands to parry</td></tr>
    <tr><td>Switch weapon</td><td><kbd>${keyLabel('slot1')}</kbd> <kbd>${keyLabel('slot2')}</kbd> <kbd>${keyLabel('slot3')}</kbd> your 3 equipped classes (1–7 in sandbox), or the mouse wheel</td></tr>
    <tr><td>Jump / grab</td><td><kbd>${keyLabel('jump')}</kbd> · hold <kbd>${keyLabel('grab')}</kbd> to grab a fighter, prop or ledge, let go to throw (hold <kbd>${keyLabel('jump')}</kbd> to lift first)</td></tr>
    <tr><td>Chat / emotes</td><td><kbd>${keyLabel('chat')}</kbd> chat · <kbd>${keyLabel('quick')}</kbd> quick chat · <kbd>${keyLabel('emote')}</kbd> emotes</td></tr>
    <tr><td>Loadout / menu</td><td><kbd>${keyLabel('loadout')}</kbd> · <kbd>Esc</kbd> · all keys can be changed in ⚙ Settings</td></tr>`;
  $('help').textContent =
    `${keyLabel('up')}${keyLabel('left')}${keyLabel('down')}${keyLabel('right')} move · Mouse aim · Click attack · Right click/${keyLabel('block')} block · ${keyLabel('jump')} jump · ${keyLabel('grab')} grab · ${keyLabel('loadout')} loadout · ${keyLabel('chat')} chat · ${keyLabel('quick')} quick chat · ${keyLabel('emote')} emotes · Esc menu`;
}
