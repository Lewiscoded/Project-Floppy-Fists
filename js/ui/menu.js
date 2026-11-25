/**
 * Main menu buttons, loadout picker, pause menu, and the kill feed.
 */
import { game } from '../core/state.js';
import { initAudio } from '../audio/engine.js';
import { keyLabel, prefs, savePrefs } from '../core/prefs.js';
import { $, escapeHtml, toCssHex } from '../core/util.js';
import { uiError } from '../audio/sfx.js';
import { localPlayer } from '../game/bodies.js';
import { COLORS, MAX_PLAYERS } from '../game/constants.js';
import { endMatch, leaveGame } from '../game/match.js';
import { CLASSES, MAX_EQUIPPED, WEAPONS, cleanEquip, cleanLoadout } from '../game/weapons.js';
import { hostGame, inviteURL, isHost, joinGame, net, playerCount, setStatus } from '../net/network.js';
import { enterLobby } from './lobby.js';
import { openSettings } from './settings.js';
import { isSandbox } from '../sandbox/gadgets.js';
import { wName } from '../world/world.js';

export const myName = () => ($('nameIn').value.trim() || 'Player').slice(0, 12);

$('nameIn').value = prefs.name;

$('nameIn').addEventListener('input', () => {
  prefs.name = myName();
  savePrefs();
});

export function renderSwatches() {
  $('swatches').innerHTML = COLORS.map(
    (c) =>
      `<div class="sw ${c === prefs.col ? 'sel' : ''}" data-c="${c}" style="background:${toCssHex(c)}"></div>`
  ).join('');
}

$('swatches').addEventListener('click', (e) => {
  const c = e.target.dataset.c;
  if (c) {
    prefs.col = +c;
    savePrefs();
    renderSwatches();
    const me = localPlayer();
    if (me) me.col = prefs.col;
  }
});

renderSwatches();

export const menuIsOpen = () =>
  game.state !== 'play' ||
  ['pause', 'loadout', 'settings', 'tutorial', 'custom', 'info'].some(
    (id) => !$(id).classList.contains('hidden')
  ) ||
  !$('chatBox').classList.contains('hidden');

$('practiceBtn').onclick = () => {
  initAudio();
  prefs.name = myName();
  savePrefs();
  net.mode = 'off';
  net.id = 'local';
  net.code = '';
  game.match.map = prefs.map;
  enterLobby();
};

$('hostBtn').onclick = () => {
  initAudio();
  prefs.name = myName();
  savePrefs();
  hostGame();
};

$('joinBtn').onclick = () => {
  initAudio();
  joinGame($('codeIn').value);
};

$('codeIn').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('joinBtn').click();
});

$('loadoutBtn').onclick = openLoadout;
$('lobbyLoadout').onclick = openLoadout;

$('lclose').onclick = closeLoadout;

$('resume').onclick = togglePause;

$('pLoad').onclick = () => {
  $('pause').classList.add('hidden');
  openLoadout();
};

$('leave').onclick = () => {
  leaveGame();
  setStatus('');
};

$('lobbyLeave').onclick = () => {
  leaveGame();
  setStatus('');
};

$('resLeave').onclick = () => {
  leaveGame();
  setStatus('');
};

$('endMatch').onclick = () => {
  $('pause').classList.add('hidden');
  if (isHost()) endMatch();
};

async function copyInvite(btn) {
  const url = inviteURL();
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = 'Copied!';
  } catch (e) {
    $('inviteIn').select();
    btn.textContent = 'Select + copy the link';
  }
  setTimeout(() => (btn.textContent = 'Copy invite link'), 1800);
}

$('copyInvite').onclick = () => copyInvite($('copyInvite'));
$('pInvite').onclick = () => copyInvite($('pInvite'));

for (const b of document.querySelectorAll('.setBtn')) b.onclick = openSettings;

// ---------- loadout screen ----------
// Left: the 7 classes (click to see their weapons, "Equip" to carry it). Right: that class's weapons.
// Top: your 3 equipped slots. In sandbox every class is unlocked anyway, so equipping only matters
// for normal matches.

let activeClass = 'melee';

export function renderLoadout() {
  const sandbox = isSandbox();
  const eq = prefs.equip;
  $('lnote').innerHTML = sandbox
    ? `<b>Sandbox:</b> all 7 classes are unlocked, keys ${keyLabel('slot1')}–${keyLabel('slot7')}. Equipping only matters for normal matches.`
    : `Carry <b>${MAX_EQUIPPED} classes</b> into a match (keys ${keyLabel('slot1')}–${keyLabel('slot3')}). Pick a weapon for each.`;
  // the 3 equipped slots
  $('lequip').innerHTML = Array.from({ length: MAX_EQUIPPED }, (_, i) => {
    const k = eq[i];
    if (!k) return `<div class="lslot empty"><small>${keyLabel('slot' + (i + 1))}</small>empty</div>`;
    const c = CLASSES.find((x) => x.key === k);
    return `<div class="lslot"><small>${keyLabel('slot' + (i + 1))}</small><i>${c.icon}</i>${c.name}<span>${escapeHtml(wName(prefs.loadout[k]))}</span></div>`;
  }).join('');
  // class tabs
  $('ltabs').innerHTML = CLASSES.map((c) => {
    const n = eq.indexOf(c.key);
    const btn =
      n >= 0
        ? `<button class="leq on" data-eq="${c.key}" title="Unequip">Slot ${n + 1} ✓</button>`
        : `<button class="leq" data-eq="${c.key}">Equip</button>`;
    return `<div class="ltab ${c.key === activeClass ? 'sel' : ''} ${n >= 0 ? 'equipped' : ''}" data-c="${c.key}"><i>${c.icon}</i><div><b>${c.name}</b><span>${escapeHtml(wName(prefs.loadout[c.key]))}</span></div>${btn}</div>`;
  }).join('');
  // weapons of the selected class
  const cl = CLASSES.find((c) => c.key === activeClass);
  const bar = (n, l) => `<div class="stat">${l}<i style="width:${n * 12}px"></i></div>`;
  $('lcols').innerHTML = cl.types
    .map((t) => {
      const w = WEAPONS[t];
      return `<div class="wcard ${prefs.loadout[cl.key] === t ? 'sel' : ''}" data-c="${cl.key}" data-t="${t}"><b>${escapeHtml(wName(t))}</b><span>${w.desc}</span>${bar(w.s[0], 'DMG')}${bar(w.s[1], 'SPD')}${bar(w.s[2], 'KNOCK')}</div>`;
    })
    .join('');
}

/** Equip or unequip a class. Returns false (and complains) if you already carry 3. */
function toggleEquip(k) {
  const eq = prefs.equip,
    i = eq.indexOf(k);
  if (i >= 0) {
    if (eq.length === 1) return flashNote('You need at least one class.');
    eq.splice(i, 1);
  } else {
    if (eq.length >= MAX_EQUIPPED)
      return flashNote(`You can only carry ${MAX_EQUIPPED} classes. Unequip one first.`);
    eq.push(k);
  }
  return true;
}

function flashNote(text) {
  uiError();
  const n = $('lnote');
  n.innerHTML = `<b class="warn">${text}</b>`;
  n.classList.remove('shake');
  void n.offsetWidth; // restart the shake animation
  n.classList.add('shake');
  clearTimeout(flashNote.t);
  flashNote.t = setTimeout(renderLoadout, 2200);
  return false;
}

/** Save and hand the new loadout to your fighter if you're in a match. */
function loadoutChanged() {
  savePrefs();
  renderLoadout();
  const me = localPlayer();
  if (me) {
    me.loadout = cleanLoadout(prefs.loadout);
    me.equip = cleanEquip(prefs.equip);
  }
}

$('ltabs').addEventListener('click', (e) => {
  const eqBtn = e.target.closest('[data-eq]');
  if (eqBtn) {
    if (toggleEquip(eqBtn.dataset.eq)) loadoutChanged();
    return;
  }
  const tab = e.target.closest('.ltab');
  if (tab) {
    activeClass = tab.dataset.c;
    renderLoadout();
  }
});

$('lcols').addEventListener('click', (e) => {
  const c = e.target.closest('.wcard');
  if (!c) return;
  prefs.loadout[c.dataset.c] = c.dataset.t;
  // picking a weapon in a class you don't carry yet equips it if there's room
  if (!prefs.equip.includes(c.dataset.c) && prefs.equip.length < MAX_EQUIPPED) prefs.equip.push(c.dataset.c);
  loadoutChanged();
  const me = localPlayer();
  if (me && (isSandbox() || me.equip.includes(c.dataset.c))) me.slot = c.dataset.c;
});

export function openLoadout() {
  const me = localPlayer();
  activeClass = me && game.state === 'play' ? me.slot : prefs.equip[0];
  renderLoadout();
  $('loadout').classList.remove('hidden');
  game.menuOpen = true;
}

export function closeLoadout() {
  $('loadout').classList.add('hidden');
  game.menuOpen = menuIsOpen();
}

export function togglePause() {
  const p = $('pause');
  p.classList.toggle('hidden');
  game.menuOpen = menuIsOpen();
  updatePause();
}

function updatePause() {
  $('pInvite').classList.toggle('hidden', net.mode === 'off');
  $('endMatch').classList.toggle('hidden', !isHost());
  $('roomInfo').innerHTML =
    net.mode === 'host'
      ? `Room <b class="room-code">${net.code}</b> · ${playerCount()}/${MAX_PLAYERS} fighters`
      : net.mode === 'client'
        ? `Room ${net.code} · ping ${net.ping} ms`
        : `Practice · ${playerCount()} fighters`;
}

export function feed(html) {
  const d = document.createElement('div');
  d.className = 'kf';
  d.innerHTML = html;
  $('feed').prepend(d);
  setTimeout(() => (d.style.opacity = '0'), 5000);
  setTimeout(() => d.remove(), 5600);
  while ($('feed').children.length > 6) $('feed').lastChild.remove();
}
