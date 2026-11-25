/**
 * Match flow: starting matches, win checks (Deathmatch, Last Standing, Sandbox), results, respawning,
 * and leaving a game.
 */
import { game } from '../core/state.js';
import { sfx } from '../audio.js';
import { keyLabel, prefs, savePrefs } from '../core/prefs.js';
import { $, escapeHtml, now, toCssHex } from '../core/util.js';
import { Body, bodies } from './bodies.js';
import { addBot } from './bots.js';
import { MAX_PLAYERS } from './constants.js';
import { projs, removeProj } from './projectiles.js';
import { clearProps, spawnMapProps } from './props.js';
import { demoWorld } from '../main.js';
import { removeBody } from '../net/messages.js';
import { banner, broadcastLobby, humanCount, isHost, net, send, setHash } from '../net/network.js';
import { renderWheel } from '../ui/chat.js';
import { MODES, enterLobby } from '../ui/lobby.js';
import { renderMaps } from '../ui/map-select.js';
import { feed } from '../ui/menu.js';
import { renderHelp } from '../ui/settings.js';
import { openTutorial } from '../ui/tutorial.js';
import { SPAWNS, THEME, loadMap, mapKey } from '../world/world.js';

// ---------- matches ----------
export function startMatchHost() {
  if (!isHost()) return;
  game.match.map = mapKey;
  for (const r of net.roster.values()) r.ready = false;
  const left = game.match.mode === 'sb' ? 0 : game.match.timeLimit * 1000;
  send({ t: 'start', match: game.match, left });
  startMatch(left);
  const n = Math.min(game.match.bots, MAX_PLAYERS - humanCount());
  for (let i = 0; i < n; i++) addBot();
  spawnMapProps();
  broadcastLobby();
}

/** Begin a match on every screen (called on host and clients). */
export function startMatch(left) {
  clearTimeout(game.resultsTimer);
  if (game.match.map !== mapKey) loadMap(game.match.map);
  for (const id of [...bodies.keys()]) removeBody(id);
  for (const id of [...projs.keys()]) removeProj(id);
  clearProps();
  game.state = 'play';
  game.menuOpen = false;
  game.myReady = false;
  game.specIdx = 0;
  game.matchEnd = left ? now() + left : 0;
  game.myBodyId = net.id + ':p';
  const sp = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
  const me = new Body(game.myBodyId, prefs.name, prefs.col, true, sp[0], sp[1]);
  me.loadout = { ...prefs.loadout };
  me.slot = 'gun';
  me.prot = 2.5;
  me.outfit = { ...prefs.outfit };
  bodies.set(game.myBodyId, me);
  for (const id of ['menu', 'lobby', 'results', 'loadout', 'pause']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('matchInfo').classList.remove('hidden');
  feed(
    game.match.mode === 'sb'
      ? `<b>Sandbox</b> on ${escapeHtml(THEME.name)} · <b>${keyLabel('wheel')}</b> weapon wheel · <b>${keyLabel('spawn')}</b> spawn menu · <b>${keyLabel('fly')}</b> free camera`
      : `<b>${MODES[game.match.mode]}</b>${game.match.weapons === 'melee' ? ' · <b>Melee only</b>' : ''} on ${escapeHtml(THEME.name)} · fight!`
  );
  sfx(520, 0.2, 'triangle', 0.1);
  setTimeout(() => sfx(780, 0.3, 'triangle', 0.1), 160);
  renderHelp();
  if (!prefs.tutDone) openTutorial();
}

export const meleeOnly = () =>
  game.state === 'play' && game.match.weapons === 'melee' && game.match.mode !== 'sb';

export const isEliminated = (b) =>
  game.state === 'play' && game.match.mode === 'lms' && b.deaths >= game.match.lives;

export function hostMatchCheck() {
  if (!isHost() || game.state !== 'play' || game.match.mode === 'sb') return;
  const all = [...bodies.values()];
  if (!all.length) return;
  let over = game.matchEnd && now() >= game.matchEnd;
  if (game.match.mode === 'dm' && all.some((b) => b.kills >= game.match.killLimit)) over = true;
  if (game.match.mode === 'lms') {
    const alive = all.filter((b) => b.deaths < game.match.lives);
    if (all.length > 1 ? alive.length <= 1 : alive.length === 0) over = true;
  }
  if (over) endMatch();
}

/** Host only: finish the match and show results to everyone. */
export function endMatch() {
  if (!isHost() || game.state !== 'play') return;
  const res = [...bodies.values()].map((b) => ({
    id: b.id,
    name: b.name,
    col: b.col,
    kills: b.kills,
    deaths: b.deaths,
    falls: b.falls | 0,
    dmg: Math.round(b.dmg || 0),
    hs: b.hs | 0,
    air: +(b.maxAir || 0).toFixed(1),
    alive: b.deaths < game.match.lives,
  }));
  res.sort(
    game.match.mode === 'lms'
      ? (a, b) => b.alive - a.alive || a.deaths - b.deaths || b.kills - a.kills
      : (a, b) => b.kills - a.kills || a.deaths - b.deaths || b.dmg - a.dmg
  );
  const m = { t: 'end', res, mode: game.match.mode };
  send(m);
  showResults(m);
  game.resultsTimer = setTimeout(() => {
    if (game.state === 'results' && isHost()) backToLobby();
  }, 20000);
}

function backToLobby() {
  if (!isHost()) return;
  send({ t: 'tolobby' });
  enterLobby();
}

$('resLobby').onclick = backToLobby;

$('resAgain').onclick = () => {
  if (!isHost()) return;
  enterLobby();
  startMatchHost();
};

export function showResults(m) {
  game.state = 'results';
  game.menuOpen = true;
  game.wheelMode = null;
  renderWheel();
  const res = m.res,
    win = res[0];
  // lifetime stats
  const mine = res.find((r) => r.id === game.myBodyId);
  if (mine && m.mode !== 'sb') {
    const S = prefs.stats;
    S.matches++;
    S.kills += mine.kills;
    S.deaths += mine.deaths;
    S.falls += mine.falls;
    S.dmg += mine.dmg;
    if (win && win.id === game.myBodyId && res.length > 1) S.wins++;
    savePrefs();
    renderMyStats();
  }
  for (const id of [...bodies.keys()]) removeBody(id);
  for (const id of [...projs.keys()]) removeProj(id);
  clearProps();
  game.myBodyId = null;
  for (const id of ['hud', 'pause', 'loadout', 'lobby']) $(id).classList.add('hidden');
  $('results').classList.remove('hidden');
  $('resTitle').innerHTML = win
    ? `<span style="color:${toCssHex(win.col)}">${escapeHtml(win.name)}</span> wins!`
    : 'Match over';
  const top = [res[1], res[0], res[2]],
    H = [90, 130, 64],
    medal = ['🥈', '🥇', '🥉'];
  $('podium').innerHTML = top
    .map((r, i) =>
      r
        ? `<div class="pod"><div class="ball" style="background:${toCssHex(r.col)}"></div>${escapeHtml(r.name)}<div class="blk" style="height:${H[i]}px;background:${toCssHex(r.col)}">${medal[i]}</div></div>`
        : ''
    )
    .join('');
  const most = (k, lbl, fmt = (v) => v) => {
    const r = [...res].sort((a, b) => b[k] - a[k])[0];
    return r && r[k] > (k === 'air' ? 0.6 : 0)
      ? `<span>${lbl}: <b style="color:${toCssHex(r.col)}">${escapeHtml(r.name)}</b> (${fmt(r[k])})</span>`
      : '';
  };
  $('awards').innerHTML =
    most('dmg', '💥 Most damage') +
    most('falls', '🪂 Most ring-outs taken') +
    most('air', '🚀 Longest flight', (v) => v + 's') +
    most('hs', '🎯 Most headshots');
  $('resTable').innerHTML =
    `<tr><th>#</th><th>Fighter</th><th>Kills</th><th>Deaths</th><th>Falls</th><th>Damage</th><th>Headshots</th><th>Flight</th></tr>` +
    res
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td><b style="color:${toCssHex(r.col)}">${escapeHtml(r.name)}</b>${r.id === net.id + ':p' ? ' (you)' : ''}</td><td>${r.kills}</td><td>${r.deaths}</td><td>${r.falls}</td><td>${r.dmg}</td><td>${r.hs}</td><td>${r.air}s</td></tr>`
      )
      .join('');
  const host = isHost();
  $('resAgain').classList.toggle('hidden', !host);
  $('resLobby').classList.toggle('hidden', !host);
  $('resNote').textContent = host ? 'Back to the lobby in 20 seconds…' : 'Waiting for the host…';
  sfx(523, 0.25, 'triangle', 0.12);
  setTimeout(() => sfx(659, 0.25, 'triangle', 0.12), 150);
  setTimeout(() => sfx(784, 0.4, 'triangle', 0.12), 300);
}

export function renderMyStats() {
  const S = prefs.stats;
  if (!S.matches) {
    $('myStats').textContent = '';
    return;
  }
  $('myStats').textContent =
    `Your record: ${S.matches} matches · 🏆 ${S.wins} wins · ${S.kills} kills · K/D ${(S.kills / Math.max(1, S.deaths)).toFixed(2)} · ${S.falls} falls · ${S.dmg} damage`;
}

/** Bring a fighter back at a random spawn point. */
export function respawn(fighter) {
  const sp = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
  fighter.reset(sp[0] + (Math.random() - 0.5) * 2, sp[1] + (Math.random() - 0.5) * 2);
  fighter.hp = 100;
  fighter.dead = false;
  fighter.lastHitBy = null;
  fighter.cds = { melee: 0, gun: 0, boom: 0 };
  fighter.guard = 100;
  fighter.guardBroken = 0;
  fighter.prot = 2;
  fighter.air = 0;
}

export function leaveGame() {
  net.leaving = true;
  net.reconnecting = false;
  banner('');
  if (net.mode === 'host') send({ t: 'hostleave' });
  const old = net.peer;
  setTimeout(
    () => {
      if (old) {
        try {
          old.destroy();
        } catch (e) {}
      }
    },
    net.mode === 'host' ? 250 : 0
  );
  Object.assign(net, { mode: 'off', id: 'local', peer: null, hostConn: null, code: '' });
  net.conns.clear();
  net.roster.clear();
  for (const id of [...bodies.keys()]) removeBody(id);
  for (const id of [...projs.keys()]) removeProj(id);
  clearProps();
  game.myBodyId = null;
  game.state = 'menu';
  game.menuOpen = true;
  setHash('');
  for (const id of ['hud', 'pause', 'loadout', 'lobby', 'results']) $(id).classList.add('hidden');
  $('menu').classList.remove('hidden');
  if (mapKey !== prefs.map) loadMap(prefs.map);
  renderMaps();
  renderMyStats();
  demoWorld();
}
