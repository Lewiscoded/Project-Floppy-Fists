/**
 * The lobby: roster, ready-up, match settings (mode, limits, bots).
 */
import { game } from '../core/state.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { $, clamp, escapeHtml, toCssHex } from '../core/util.js';
import { bodies } from '../game/bodies.js';
import { BOT_DIFF } from '../game/bots.js';
import { MAX_PLAYERS } from '../game/constants.js';
import { startMatchHost } from '../game/match.js';
import { renderLobbyWorld } from './world-panel.js';
import { projs, removeProj } from '../game/projectiles.js';
import { clearProps } from '../game/props.js';
import { removeBody } from '../net/messages.js';
import { broadcastLobby, inviteURL, isHost, lobbyList, net, send } from '../net/network.js';
import { renderWheel } from './chat.js';
import { renderMaps } from './map-select.js';
import { loadMap, mapKey } from '../world/world.js';

// ---------- lobby ----------
export const MODES = { dm: 'Deathmatch', lms: 'Last Standing', sb: 'Sandbox' };

export const fmtTime = (s) =>
  s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : 'Off';

export function enterLobby() {
  clearTimeout(game.resultsTimer);
  game.state = 'lobby';
  game.menuOpen = true;
  game.myReady = false;
  game.wheelMode = null;
  renderWheel();
  clearProps();
  for (const id of [...bodies.keys()]) removeBody(id);
  for (const id of [...projs.keys()]) removeProj(id);
  game.myBodyId = null;
  game.matchEnd = 0;
  for (const id of ['menu', 'hud', 'results', 'pause', 'loadout']) $(id).classList.add('hidden');
  $('lobby').classList.remove('hidden');
  if (game.match.map !== mapKey) loadMap(game.match.map);
  if (isHost()) broadcastLobby();
  else renderLobby();
}

export function renderLobby() {
  const host = isHost(),
    online = net.mode !== 'off';
  const roster = host ? lobbyList() : game.lobbyRoster;
  $('lobbyTitle').textContent = online ? 'Lobby' : 'Practice';
  $('lobbyCode').innerHTML = online ? `Room <b class="room-code">${net.code}</b>` : 'Offline vs bots';
  $('inviteRow').classList.toggle('hidden', !online);
  $('inviteIn').value = online ? inviteURL() : '';
  const nb = Math.min(game.match.bots, MAX_PLAYERS - roster.length);
  $('lobbyCount').textContent = `${roster.length + nb}/${MAX_PLAYERS} fighters`;
  $('lobbyPlayers').innerHTML =
    roster
      .map(
        (r) =>
          `<div class="lp"><i style="background:${toCssHex(r.col)}"></i>${escapeHtml(r.name)}${r.id === net.id ? ' <small class="ms-note">(you)</small>' : ''}${online && !r.host ? `<span class="pg">${r.ping | 0} ms</span>` : ''}<span class="st ${r.host ? 'host' : r.ready ? 'ok' : ''}">${r.host ? 'Host' : r.ready ? 'Ready' : 'Not ready'}</span></div>`
      )
      .join('') +
    Array.from(
      { length: nb },
      (_, i) =>
        `<div class="lp" style="opacity:.75"><i style="background:var(--paper-3)"></i>Bot ${i + 1}<span class="st">${BOT_DIFF[game.match.diff].name}</span></div>`
    ).join('');
  const seg = (k, opts) =>
    `<span class="seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${game.match[k] === v ? 'sel' : ''}">${l}</button>`).join('')}</span>`;
  const num = (k, txt) =>
    `<span class="num"><button data-k="${k}" data-d="-1">–</button><b>${txt}</b><button data-k="${k}" data-d="1">+</button></span>`;
  $('matchSet').className = host ? '' : 'ro';
  const sb = game.match.mode === 'sb';
  $('matchSet').innerHTML =
    `<div class="ms">Mode${seg('mode', [
      ['dm', 'Deathmatch'],
      ['lms', 'Last Standing'],
      ['sb', 'Sandbox'],
    ])}</div>` +
    (sb
      ? `<div class="ms ms-note">No score or time limit · every weapon · spawn props and gadgets</div>`
      : (game.match.mode === 'dm'
          ? `<div class="ms">Kill limit${num('killLimit', game.match.killLimit)}</div>`
          : `<div class="ms">Lives${num('lives', game.match.lives)}</div>`) +
        `<div class="ms">Time limit${num('timeLimit', fmtTime(game.match.timeLimit))}</div>` +
        `<div class="ms">Weapons${seg('weapons', [
          ['all', 'All'],
          ['melee', 'Melee only'],
        ])}</div>`) +
    `<div class="ms">Bots${num('bots', game.match.bots)}</div>` +
    (sb
      ? `<div class="ms">Bots act as${seg('botAI', [
          ['fight', 'Fighters'],
          ['dummy', 'Dummies'],
        ])}</div>`
      : '') +
    `<div class="ms">Bot skill${seg('diff', [
      ['easy', 'Easy'],
      ['normal', 'Normal'],
      ['hard', 'Hard'],
    ])}</div>`;
  renderMaps();
  renderLobbyWorld();
  const clients = roster.filter((r) => !r.host),
    readyN = clients.filter((r) => r.ready).length;
  $('readyBtn').classList.toggle('hidden', host);
  $('readyBtn').textContent = game.myReady ? '✓ Ready! (click to cancel)' : "I'm ready!";
  $('startBtn').classList.toggle('hidden', !host);
  $('lobbyNote').textContent = host
    ? online
      ? clients.length
        ? `${readyN}/${clients.length} players ready. You can start whenever you like.`
        : 'Send the invite link to your friends. Add bots or start whenever you like.'
      : 'Pick a mode and map, then start.'
    : 'The host picks the mode and map. Hit ready when you are set!';
}

$('matchSet').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !isHost()) return;
  const k = b.dataset.k;
  if (b.dataset.v) game.match[k] = b.dataset.v;
  else {
    const d = +b.dataset.d;
    if (k === 'killLimit') game.match.killLimit = clamp(game.match.killLimit + d * 5, 5, 50);
    if (k === 'lives') game.match.lives = clamp(game.match.lives + d, 1, 9);
    if (k === 'bots') game.match.bots = clamp(game.match.bots + d, 0, 4);
    if (k === 'timeLimit') {
      const T = [0, 120, 180, 300, 480, 600, 900];
      const i = T.indexOf(game.match.timeLimit);
      game.match.timeLimit = T[clamp((i < 0 ? 3 : i) + d, 0, T.length - 1)];
    }
  }
  prefs.match = { ...game.match };
  savePrefs();
  broadcastLobby();
});

$('readyBtn').onclick = () => {
  game.myReady = !game.myReady;
  send({ t: 'ready', v: game.myReady });
  renderLobby();
};

$('startBtn').onclick = () => startMatchHost();
