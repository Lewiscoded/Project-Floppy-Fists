/**
 * Game messages: handle() dispatches incoming messages, sendState() streams your fighters' poses 20x/second,
 * and proxies smoothly follow other players' fighters.
 */
import { game } from '../core/state.js';
import { V3, escapeHtml, now, round2 } from '../core/util.js';
import { Body, bodies, localBodies } from '../game/bodies.js';
import { applyHit, applyParried, gunSfx, onHitMark, onKill } from '../game/combat.js';
import { N } from '../game/constants.js';
import { dropHolds, throwTarget } from '../game/grab.js';
import { DEF_OUTFIT, outfitKey, parseOutfit } from '../game/outfits.js';
import { computeFacing } from '../game/physics.js';
import { onBoom, removeProj, spawnProj } from '../game/projectiles.js';
import { applyPropHit, onPropState, props } from '../game/props.js';
import { readStatusCode, statusCode } from '../game/status.js';
import { weaponFx } from '../game/weapon-kinds.js';
import { net, send } from './network.js';
import { muzzleFlash, tracer } from '../render/fx.js';
import { doSandbox, onGadgets, toast } from '../sandbox/gadgets.js';
import { onChat } from '../ui/chat.js';
import { feed } from '../ui/menu.js';

// ---------- shared game messages ----------
/** Handle one game message from the network. */
export function handle(m) {
  switch (m.t) {
    case 'st':
      for (const e of m.b) updateProxy(e);
      break;
    case 'hit': {
      const b = bodies.get(m.id);
      if (b && b.local) applyHit(b, m.j, m.d, new V3(...m.i), m.by, m.w);
      break;
    }
    case 'hm':
      onHitMark(m);
      break;
    case 'shot':
      for (let i = 0; i < m.s.length; i += 6)
        tracer(new V3(m.s[i], m.s[i + 1], m.s[i + 2]), new V3(m.s[i + 3], m.s[i + 4], m.s[i + 5]), m.w);
      gunSfx(m.w, new V3(m.s[0], m.s[1], m.s[2]));
      muzzleFlash(new V3(m.s[0], m.s[1], m.s[2]), m.w);
      break;
    case 'wfx':
      weaponFx(m.k, new V3(...m.p), m.d && new V3(...m.d));
      break;
    case 'proj':
      spawnProj(m.id, m.k, m.by, m.p, m.v, false);
      break;
    case 'pend':
      removeProj(m.id);
      break;
    case 'boom':
      removeProj(m.pid);
      onBoom(new V3(...m.p), m.k, m.by);
      break;
    case 'kill':
      onKill(m.v, m.vn, m.vc, m.by, m.w);
      {
        const v = bodies.get(m.v);
        if (v) v.lastKiller = m.by;
      }
      break;
    case 'parry': {
      const b = bodies.get(m.id);
      if (b && b.local) applyParried(b, m.x, m.z);
      break;
    }
    case 'bye':
      dropOwner(m.o);
      break;
    case 'gone': {
      const b = bodies.get(m.id);
      if (b && !b.local) removeBody(m.id);
      break;
    }
    case 'chat':
      onChat(m.id, m.n, m.c, m.txt);
      break;
    case 'pr':
      onPropState(m);
      break;
    case 'gad':
      onGadgets(m);
      break;
    case 'sbx':
      if (net.mode === 'host') doSandbox(m);
      break;
    case 'prgone': {
      const pr = props.get(m.id);
      if (pr && !pr.local) {
        pr.dispose();
        props.delete(m.id);
      }
      break;
    }
    case 'sbmsg':
      if (m.to === game.myBodyId) toast(m.txt);
      break;
    case 'ph': {
      const pr = props.get(m.id);
      if (pr && pr.local) applyPropHit(pr, m.j, new V3(...m.i), m.d, m.by);
      break;
    }
    case 'throw': {
      const T = m.k === 'p' ? props.get(m.id) : bodies.get(m.id);
      if (T && T.local) throwTarget(T, m.k, new V3(...m.v), m.by);
      break;
    }
    case 'free': {
      const H = bodies.get(m.h);
      if (H && H.local) dropHolds(H, false, m.v);
      break;
    }
  }
}

export function dropOwner(o) {
  for (const id of [...bodies.keys()])
    if (id.startsWith(o + ':')) {
      const b = bodies.get(id);
      if (b && game.state === 'play') feed(`<b>${escapeHtml(b.name)}</b> left`);
      removeBody(id);
    }
}

export function removeBody(id) {
  const b = bodies.get(id);
  if (b) {
    if (b.local && game.state === 'play') send({ t: 'gone', id });
    b.view.dispose();
    bodies.delete(id);
  }
}

/** Send the poses of every fighter we own (about 20 times a second). */
export function sendState() {
  const b = [];
  for (const r of localBodies()) {
    const e = [
      r.id,
      r.name,
      r.col,
      Math.max(0, Math.round(r.hp)),
      r.dead ? 1 : 0,
      r.weapon,
      r.kills,
      r.deaths,
      round2(r.aim.x),
      round2(r.aim.y),
      round2(r.aim.z),
      r.stun > 0.5 ? 1 : 0,
      r.prot > 0 ? 1 : 0,
      r.bot ? 0 : net.mode === 'host' ? 0 : net.ping,
      r.falls,
      Math.round(r.dmg || 0),
      r.hs | 0,
      round2(r.maxAir || 0),
      r.bot ? 1 : 0,
      outfitKey(r.outfit || DEF_OUTFIT),
      r.hold.map((h) => (h ? `${h.k}~${h.id}~${h.j}` : '')).join(','),
      statusCode(r),
    ];
    for (let i = 0; i < N; i++) e.push(round2(r.pos[i].x), round2(r.pos[i].y), round2(r.pos[i].z));
    b.push(e);
  }
  if (b.length) send({ t: 'st', b });
}

const STATE_POSE_OFFSET = 22;

/** Apply a received pose to the local copy (proxy) of another player's fighter. */
function updateProxy(e) {
  const [
    id,
    name,
    col,
    hp,
    dead,
    wk,
    kills,
    deaths,
    ax,
    ay,
    az,
    stunned,
    prot,
    ping,
    falls,
    dmg,
    hs,
    maxAir,
    isBot,
    ok,
    hl,
    fx,
  ] = e;
  if (!id || (bodies.has(id) && bodies.get(id).local)) return;
  if (game.state !== 'play') return;
  let b = bodies.get(id);
  if (!b) {
    b = new Body(
      id,
      name,
      col,
      false,
      e[STATE_POSE_OFFSET + 15],
      e[STATE_POSE_OFFSET + 17],
      e[STATE_POSE_OFFSET + 16]
    );
    bodies.set(id, b);
  }
  for (let i = 0; i < N; i++)
    b.tgt[i].set(
      e[STATE_POSE_OFFSET + i * 3],
      e[STATE_POSE_OFFSET + i * 3 + 1],
      e[STATE_POSE_OFFSET + i * 3 + 2]
    );
  if (b.fresh) {
    for (let i = 0; i < N; i++) {
      b.pos[i].copy(b.tgt[i]);
      b.prev[i].copy(b.tgt[i]);
    }
    b.fresh = false;
  }
  Object.assign(b, {
    name,
    col,
    hp,
    dead: !!dead,
    wKey: wk,
    kills,
    deaths,
    seen: now(),
    prot: prot ? 1 : 0,
    ping,
    falls,
    dmg,
    hs,
    maxAir,
    isBot: !!isBot,
  });
  if (ok && ok !== b.outKey) {
    b.outKey = ok;
    b.outfit = parseOutfit(ok);
  }
  b.holdRemote = String(hl || ',')
    .split(',')
    .map((x) => {
      if (!x) return null;
      const [k, i, j] = x.split('~');
      if (b.ignoreHoldOf === i && now() - b.ignoreHoldT < 400) return null;
      return { k, id: i, j: +j };
    });
  b.stun = stunned ? 1 : 0;
  b.aim.set(ax, ay, az);
  readStatusCode(b, fx);
}

export function stepProxies(dt) {
  const k = 1 - Math.exp(-dt * 18);
  for (const b of [...bodies.values()]) {
    if (b.local) continue;
    if (now() - b.seen > 4000) {
      removeBody(b.id);
      continue;
    }
    for (let i = 0; i < N; i++) {
      b.prev[i].copy(b.pos[i]);
      b.pos[i].lerp(b.tgt[i], k);
      b.vel[i].subVectors(b.pos[i], b.prev[i]).divideScalar(Math.max(dt, 1e-3));
    }
    computeFacing(b);
  }
}
