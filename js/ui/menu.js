/**
 * Main menu buttons, loadout picker, pause menu, and the kill feed.
 */
import { game } from '../core/state.js';
import { initAudio } from '../audio.js';
import { keyLabel, prefs, savePrefs } from '../core/prefs.js';
import { $, toCssHex } from '../core/util.js';
import { localPlayer } from '../game/bodies.js';
import { COLORS, MAX_PLAYERS } from '../game/constants.js';
import { endMatch, leaveGame } from '../game/match.js';
import { CLASSES, WEAPONS } from '../game/weapons.js';
import { hostGame, inviteURL, isHost, joinGame, net, playerCount, setStatus } from '../net/network.js';
import { enterLobby } from './lobby.js';
import { openSettings } from './settings.js';
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
  ['pause', 'loadout', 'settings', 'tutorial', 'custom'].some((id) => !$(id).classList.contains('hidden')) ||
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

export function renderLoadout() {
  $('lcols').innerHTML = CLASSES.map(
    (cl) =>
      `<div class="lcol"><h3>${cl.name}<small>key ${keyLabel('slot' + cl.slot)}</small></h3>${cl.types
        .map((t) => {
          const w = WEAPONS[t];
          const bar = (n, l) => `<div class="stat">${l}<i style="width:${n * 12}px"></i></div>`;
          return `<div class="wcard ${prefs.loadout[cl.key] === t ? 'sel' : ''}" data-c="${cl.key}" data-t="${t}"><b>${wName(t)}</b><span>${w.desc}</span>${bar(w.s[0], 'DMG')}${bar(w.s[1], 'SPD')}${bar(w.s[2], 'KNOCK')}</div>`;
        })
        .join('')}</div>`
  ).join('');
}

$('lcols').addEventListener('click', (e) => {
  const c = e.target.closest('.wcard');
  if (!c) return;
  prefs.loadout[c.dataset.c] = c.dataset.t;
  savePrefs();
  renderLoadout();
  const me = localPlayer();
  if (me) {
    me.loadout = { ...prefs.loadout };
    me.slot = c.dataset.c;
  }
});

export function openLoadout() {
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
      ? `Room <b style="letter-spacing:3px;color:#1d2433">${net.code}</b> · ${playerCount()}/${MAX_PLAYERS} fighters`
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
