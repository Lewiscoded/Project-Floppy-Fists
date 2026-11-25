/**
 * Online play over PeerJS (WebRTC): hosting, joining with a 4-letter code, the lobby roster, and reconnecting /
 * host migration if the host leaves. The host relays every message.
 */
import { game } from '../core/state.js';
import { sfx } from '../audio.js';
import { matchLeft, prefs, savePrefs, setMatchClock } from '../core/prefs.js';
import { $, escapeHtml, now } from '../core/util.js';
import { bodies, localBodies, localPlayer } from '../game/bodies.js';
import { addBot } from '../game/bots.js';
import { COLORS, MAX_PLAYERS } from '../game/constants.js';
import { leaveGame, showResults, startMatch } from '../game/match.js';
import { props, spawnMapProps } from '../game/props.js';
import { dropOwner, handle, removeBody } from './messages.js';
import { BCPeer } from './test-peer.js';
import { enterLobby, renderLobby } from '../ui/lobby.js';
import { feed, myName } from '../ui/menu.js';
import { loadMap, mapKey } from '../world/world.js';

const PeerCls = () => (window.__BC ? BCPeer : window.Peer);

export const net = {
  mode: 'off',
  id: 'local',
  peer: null,
  conns: new Map(),
  roster: new Map(),
  hostConn: null,
  code: '',
  lastHost: 0,
  reconnecting: false,
  leaving: false,
  ping: 0,
  reconT0: 0,
  joinSeq: 0,
};

/** Send a message to everyone (host) or to the host (client), who relays it. */
export function send(m) {
  if (net.mode === 'host') {
    for (const c of net.conns.values()) if (c.open) c.send(m);
  } else if (net.mode === 'client' && net.hostConn && net.hostConn.open) net.hostConn.send(m);
}

export function setStatus(t, ok) {
  const s = $('status');
  s.textContent = t;
  s.classList.toggle('ok', !!ok);
}

export function banner(t) {
  const b = $('banner2');
  b.textContent = t;
  b.classList.toggle('hidden', !t);
}

function randCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export const bots = () => localBodies().filter((b) => b.bot);

export const isHost = () => net.mode !== 'client';

export const humanCount = () => 1 + (net.mode === 'host' ? net.conns.size : 0);

export const playerCount = () => humanCount() + bots().length;

export const inviteURL = () => location.href.split('#')[0] + '#' + net.code;

export function setHash(code) {
  try {
    history.replaceState(null, '', code ? '#' + code : location.href.split('#')[0]);
  } catch (e) {}
}

// ---------- hosting ----------
/** Create a room and become the host. */
export function hostGame() {
  const P = PeerCls();
  if (!P) {
    setStatus('Online play could not load here. Use Practice, or open the GitHub Pages version.');
    return;
  }
  const code = randCode();
  setStatus('Creating room…', true);
  let peer;
  try {
    peer = new P('pff-' + code.toLowerCase());
  } catch (e) {
    setStatus('Online play is blocked in this window. Open the GitHub Pages version.');
    return;
  }
  net.peer = peer;
  net.leaving = false;
  peer.on('open', (id) => {
    net.mode = 'host';
    net.id = id;
    net.code = code;
    setHash(code);
    setupHostPeer(peer);
    game.match.map = prefs.map;
    enterLobby();
  });
  peer.on('error', (e) => {
    if (e && e.type === 'unavailable-id') {
      try {
        peer.destroy();
      } catch (_) {}
      hostGame();
    } else if (game.state === 'menu') setStatus('Could not host: ' + ((e && e.type) || e));
  });
}

function setupHostPeer(peer) {
  peer.on('connection', (c) => {
    c.on('data', (m) => hostRecv(c, m));
    c.on('close', () => dropConn(c));
  });
  peer.on('disconnected', () => {
    try {
      peer.reconnect();
    } catch (e) {}
  });
}

function dropConn(c) {
  if (net.conns.get(c.peer) !== c) return;
  net.conns.delete(c.peer);
  net.roster.delete(c.peer);
  dropOwner(c.peer);
  send({ t: 'bye', o: c.peer });
  broadcastLobby();
}

function freeColor(want, exceptId) {
  const used = new Set([
    prefs.col,
    ...[...net.roster.values()].filter((r) => r.id !== exceptId).map((r) => r.col),
    ...bots().map((b) => b.col),
  ]);
  return used.has(want) ? (COLORS.find((c) => !used.has(c)) ?? want) : want;
}

function hostRecv(c, m) {
  if (m.t === 'join') {
    const known = net.conns.get(c.peer);
    if (!known && humanCount() >= MAX_PLAYERS) {
      c.send({ t: 'full' });
      setTimeout(() => c.close(), 300);
      return;
    }
    if (game.state === 'play' && !known && playerCount() >= MAX_PLAYERS) {
      const b = bots().pop();
      if (b) removeBody(b.id);
    }
    const col = freeColor(m.col, c.peer);
    if (known && known !== c)
      try {
        known.close();
      } catch (e) {}
    net.conns.set(c.peer, c);
    const prev = net.roster.get(c.peer);
    net.roster.set(c.peer, {
      id: c.peer,
      name: String(m.name || 'Player').slice(0, 12),
      col,
      ready: prev ? prev.ready : false,
      ping: 0,
      order: prev ? prev.order : ++net.joinSeq,
    });
    c.send({
      t: 'welcome',
      code: net.code,
      col,
      match: game.match,
      phase: game.state,
      left: matchLeft(),
      roster: lobbyList(),
    });
    if (!m.re) {
      feed(`<b>${escapeHtml(m.name)}</b> joined`);
      sfx(700, 0.15, 'sine', 0.1);
    }
    broadcastLobby();
    return;
  }
  if (!net.conns.has(c.peer)) return;
  if (m.t === 'ping') {
    c.send({ t: 'pong', ts: m.ts });
    return;
  }
  if (m.t === 'pi') {
    const r = net.roster.get(c.peer);
    if (r) r.ping = m.v;
    return;
  }
  if (m.t === 'ready') {
    const r = net.roster.get(c.peer);
    if (r) {
      r.ready = !!m.v;
      broadcastLobby();
    }
    return;
  }
  for (const o of net.conns.values()) if (o !== c && o.open) o.send(m);
  handle(m);
}

export function lobbyList() {
  const host = { id: net.id, name: prefs.name, col: prefs.col, ready: true, ping: 0, host: true, order: 0 };
  return [host, ...[...net.roster.values()].sort((a, b) => a.order - b.order)];
}

export function broadcastLobby() {
  if (!isHost()) return;
  game.lobbyRoster = lobbyList();
  if (net.mode === 'host')
    send({
      t: 'lobby',
      roster: game.lobbyRoster,
      match: game.match,
      phase: game.state,
      code: net.code,
      left: matchLeft(),
    });
  if (game.state === 'lobby') renderLobby();
}

// ---------- joining ----------
let joinTimer = null;

/** Join a room by its 4-letter code. */
export function joinGame(code) {
  const P = PeerCls();
  if (!P) {
    setStatus('Online play could not load here. Use the GitHub Pages version.');
    return;
  }
  code = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) {
    setStatus('Enter the 4-letter room code.');
    return;
  }
  prefs.name = myName();
  savePrefs();
  setStatus('Connecting to ' + code + '…', true);
  net.code = code;
  net.leaving = false;
  net.reconnecting = false;
  let peer;
  try {
    peer = new P();
  } catch (e) {
    setStatus('Online play is blocked in this window. Open the GitHub Pages version.');
    return;
  }
  net.peer = peer;
  clearTimeout(joinTimer);
  joinTimer = setTimeout(() => {
    if (net.mode !== 'client' && !net.reconnecting)
      setStatus('No answer from room ' + code + '. Check the code?');
  }, 9000);
  peer.on('open', (id) => {
    net.id = id;
    connectToHost(false);
  });
  peer.on('error', (e) => {
    const t = e && e.type;
    if (net.reconnecting) return;
    clearTimeout(joinTimer);
    setStatus(t === 'peer-unavailable' ? 'Room ' + code + ' not found.' : 'Connection error: ' + (t || e));
  });
  peer.on('disconnected', () => {
    try {
      peer.reconnect();
    } catch (e) {}
  });
}

function connectToHost(re) {
  if (!net.peer || net.peer.dead) return;
  const c = net.peer.connect('pff-' + net.code.toLowerCase(), { reliable: true });
  c.on('open', () => {
    if (net.hostConn && net.hostConn.open && !net.reconnecting) {
      c.close();
      return;
    }
    net.hostConn = c;
    c.send({ t: 'join', name: prefs.name, col: prefs.col, re });
  });
  c.on('data', (m) => {
    if (c !== net.hostConn) return;
    net.lastHost = now();
    clientRecv(m);
  });
  c.on('close', () => {
    if (c === net.hostConn && net.mode === 'client' && !net.leaving) lostHost('closed');
  });
}

function clientRecv(m) {
  switch (m.t) {
    case 'welcome': {
      clearTimeout(joinTimer);
      const wasReconnect = net.reconnecting;
      net.mode = 'client';
      net.code = m.code;
      net.reconnecting = false;
      banner('');
      setHash(m.code);
      game.match = m.match;
      game.lobbyRoster = m.roster || [];
      if (m.col !== prefs.col) {
        prefs.col = m.col;
        const me = localPlayer();
        if (me) {
          me.col = m.col;
        }
      }
      if (wasReconnect && game.state === 'play' && m.phase === 'play') {
        feed('Reconnected');
        setMatchClock(m.left);
      } else if (m.phase === 'play') {
        loadMap(game.match.map);
        startMatch(m.left);
      } else if (m.phase === 'results' && game.state === 'results') {
      } else enterLobby();
      return;
    }
    case 'full':
      clearTimeout(joinTimer);
      setStatus('That room is full (5 players).');
      try {
        net.peer.destroy();
      } catch (e) {}
      net.mode = 'off';
      return;
    case 'lobby':
      game.lobbyRoster = m.roster;
      game.match = m.match;
      net.code = m.code;
      if (game.state === 'lobby') {
        if (game.match.map !== mapKey) loadMap(game.match.map);
        renderLobby();
      }
      if (game.state === 'play' && m.phase === 'play') setMatchClock(m.left);
      return;
    case 'start':
      game.match = m.match;
      loadMap(game.match.map);
      startMatch(m.left);
      return;
    case 'end':
      showResults(m);
      return;
    case 'tolobby':
      enterLobby();
      return;
    case 'pong':
      net.ping = Math.round(now() - m.ts);
      send({ t: 'pi', v: net.ping });
      return;
    case 'hostleave':
      lostHost('left');
      return;
  }
  handle(m);
}

// ---------- reconnect + host migration ----------
export function lostHost(reason) {
  if (net.reconnecting || net.leaving || net.mode !== 'client') return;
  net.reconnecting = true;
  net.hostConn = null;
  net.reconT0 = now();
  const oldHost = game.lobbyRoster[0] && game.lobbyRoster[0].id;
  const successor = game.lobbyRoster.slice(1).sort((a, b) => a.order - b.order)[0];
  const iAmNext = successor && successor.id === net.id;
  banner(
    iAmNext
      ? 'The host left. You are taking over the room…'
      : 'Connection to the host was lost. Reconnecting…'
  );
  if (reason === 'left' && oldHost) dropOwner(oldHost);
  if (iAmNext) setTimeout(tryBecomeHost, reason === 'left' ? 400 : 200);
  else setTimeout(tryReconnect, reason === 'left' ? 1200 : 300);
}

function tryReconnect() {
  if (!net.reconnecting) return;
  if (now() - net.reconT0 > 40000) {
    giveUp();
    return;
  }
  if (net.peer && net.peer.disconnected)
    try {
      net.peer.reconnect();
    } catch (e) {}
  connectToHost(true);
  setTimeout(tryReconnect, 2500);
}

function tryBecomeHost() {
  if (!net.reconnecting) return;
  if (now() - net.reconT0 > 40000) {
    giveUp();
    return;
  }
  const P = PeerCls();
  let hp;
  try {
    hp = new P('pff-' + net.code.toLowerCase());
  } catch (e) {
    tryReconnect();
    return;
  }
  hp.on('open', (id) => {
    if (!net.reconnecting) {
      try {
        hp.destroy();
      } catch (e) {}
      return;
    }
    const oldPeer = net.peer,
      oldId = net.id;
    net.peer = hp;
    net.id = id;
    net.mode = 'host';
    net.reconnecting = false;
    net.hostConn = null;
    net.conns.clear();
    net.roster.clear();
    net.joinSeq = 0;
    setupHostPeer(hp);
    try {
      oldPeer.destroy();
    } catch (e) {}
    if (game.lobbyRoster[0]) dropOwner(game.lobbyRoster[0].id); // the old host's fighters + bots (before we take over its id)
    rekeyBodies(oldId, id);
    banner('');
    feed('<b>You are now the host</b>');
    setHash(net.code);
    if (game.state === 'play') {
      const want = Math.min(game.match.bots, MAX_PLAYERS - humanCount());
      while (bots().length < want) addBot();
      for (const pr of [...props.values()])
        if (!pr.local) {
          pr.dispose();
          props.delete(pr.id);
        }
      spawnMapProps();
    }
    broadcastLobby();
  });
  hp.on('error', (e) => {
    try {
      hp.destroy();
    } catch (_) {}
    // the old host still holds the room id: try as a client, then try again
    if (net.reconnecting) {
      connectToHost(true);
      setTimeout(tryBecomeHost, 3000);
    }
  });
}

function giveUp() {
  net.reconnecting = false;
  banner('');
  leaveGame();
  setStatus('Lost connection to the room.');
}

function rekeyBodies(oldId, newId) {
  for (const [id, b] of [...bodies.entries()]) {
    if (!id.startsWith(oldId + ':')) continue;
    const nid = newId + id.slice(oldId.length);
    bodies.delete(id);
    b.id = nid;
    bodies.set(nid, b);
    if (game.myBodyId === id) game.myBodyId = nid;
  }
}
