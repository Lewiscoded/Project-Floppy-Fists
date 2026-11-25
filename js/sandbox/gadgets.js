/**
 * Sandbox gadgets (trampolines, launch pads, fans) and spawning/removing things in Sandbox mode.
 * The host owns everything spawned; other players send requests.
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { sfx, volAt } from '../audio/sfx.js';
import { V3, clamp, escapeHtml, now, round2 } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { addBot } from '../game/bots.js';
import { flashMsg } from '../game/combat.js';
import { DT, LFOOT, MAX_PLAYERS, N, PELV, RAD, RFOOT } from '../game/constants.js';
import { addVel } from '../game/physics.js';
import { PROP_DEFS, Prop, props } from '../game/props.js';
import { removeBody } from '../net/messages.js';
import { net, playerCount, send } from '../net/network.js';
import { R90, mat } from '../render/materials.js';
import { scene } from '../render/renderer.js';
import { BOXES } from '../world/world.js';

// gadgets are static world toys owned by the host; every peer applies their effects to its own bodies/props
export const gadgets = new Map();
let gadSeq = 0,
  spawnLog = [];

const GADGET_DEFS = {
  tramp: { name: 'Trampoline', r: 1.25, h: 0.5 },
  pad: { name: 'Launch Pad', hs: 0.85, h: 0.14 },
  fan: { name: 'Fan', len: 11, wr: 1.7 },
};

export const SPAWN_ITEMS = [
  [
    'Props',
    [
      ['crate', '📦', 'Crate'],
      ['barrel', '🛢️', 'Barrel'],
      ['xbarrel', '🧨', 'TNT barrel'],
      ['ball', '⚽', 'Ball'],
      ['pin', '🎳', 'Pin'],
    ],
  ],
  [
    'Gadgets',
    [
      ['tramp', '🤸', 'Trampoline'],
      ['pad', '🚀', 'Launcher'],
      ['fan', '🌀', 'Fan'],
    ],
  ],
  ['Fighters', [['bot', '🤖', 'Bot']]],
  [
    'Tools',
    [
      ['remove', '🗑️', 'Remove'],
      ['undo', '↩️', 'Undo'],
      ['clear', '🧹', 'Clear'],
    ],
  ],
];

export const MAX_SPAWNED = 40;

export const isSandbox = () => game.state === 'play' && game.match.mode === 'sb';

export function gadgetMesh(kind) {
  const g = new THREE.Group();
  const M = (geo, col, o = {}) => {
    const m = new THREE.Mesh(geo, mat(col, o));
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'tramp') {
    const D = GADGET_DEFS.tramp;
    M(new THREE.TorusGeometry(D.r, 0.09, 10, 32), 0x2f7de1, { rough: 0.4 }).rotation.x = R90;
    g.children[0].position.y = D.h;
    const bed = M(new THREE.CircleGeometry(D.r - 0.04, 32), 0x1d2433, { rough: 0.9 });
    bed.rotation.x = -R90;
    bed.position.y = D.h - 0.03;
    g.userData.bed = bed;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const l = M(new THREE.CylinderGeometry(0.045, 0.045, D.h, 8), 0x9aa3b2, { metal: 0.6, rough: 0.3 });
      l.position.set(Math.cos(a) * (D.r - 0.05), D.h / 2, Math.sin(a) * (D.r - 0.05));
    }
  } else if (kind === 'pad') {
    const D = GADGET_DEFS.pad;
    M(new THREE.BoxGeometry(D.hs * 2, D.h, D.hs * 2), 0x3a3f4b, { metal: 0.4, rough: 0.4 }).position.y =
      D.h / 2;
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      emissive: 0xff9a00,
      emissiveIntensity: 1.4,
      roughness: 0.5,
    });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Shape();
      s.moveTo(-0.45, 0);
      s.lineTo(0, 0.32);
      s.lineTo(0.45, 0);
      s.lineTo(0.45, 0.14);
      s.lineTo(0, 0.46);
      s.lineTo(-0.45, 0.14);
      s.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), glow);
      m.rotation.x = -R90;
      m.position.set(0, D.h + 0.005, 0.45 - i * 0.42);
      g.add(m);
    }
    g.userData.glow = glow;
  } else if (kind === 'fan') {
    M(new THREE.BoxGeometry(0.7, 0.12, 0.7), 0x4b5160, { metal: 0.5, rough: 0.4 }).position.y = 0.06;
    M(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 10), 0x9aa3b2, { metal: 0.7, rough: 0.3 }).position.y =
      0.45;
    const ring = M(new THREE.TorusGeometry(0.62, 0.06, 10, 28), 0x2fb5a8, { rough: 0.4 });
    ring.position.y = 1.05;
    const hub = new THREE.Group();
    hub.position.set(0, 1.05, 0.04);
    g.add(hub);
    const bl = mat(0xf2f4f8, { rough: 0.35 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.03), bl);
      b.position.y = 0.27;
      const piv = new THREE.Group();
      piv.rotation.z = i * R90;
      b.rotation.y = 0.4;
      piv.add(b);
      hub.add(piv);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat(0x2fb5a8));
    hub.add(cap);
    g.userData.hub = hub;
    // wind streaks
    const sm = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    g.userData.streaks = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.9), sm);
      s.userData.o = [
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.2 + 1.05,
        Math.random() * GADGET_DEFS.fan.len,
      ];
      g.add(s);
      g.userData.streaks.push(s);
    }
  } else if (kind === 'bot') {
    M(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), 0xb57cff).position.y = 0.8;
    M(new THREE.SphereGeometry(0.26, 12, 8), 0xb57cff).position.y = 1.65;
  } else if (kind === 'remove') {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 28),
      new THREE.MeshBasicMaterial({
        color: 0xff4040,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    m.rotation.x = -R90;
    m.position.y = 0.04;
    g.add(m);
  }
  scene.add(g);
  return g;
}

function addGadget(id, kind, x, y, z, yaw, by) {
  if (gadgets.has(id) || !GADGET_DEFS[kind]) return;
  const mesh = gadgetMesh(kind);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  const G0 = {
    id,
    kind,
    x,
    y,
    z,
    yaw,
    by,
    mesh,
    dir: new V3(Math.sin(yaw), 0, Math.cos(yaw)),
    cool: new Map(),
    box: null,
  };
  if (kind === 'fan') {
    const b = {
      min: new V3(x - 0.4, y, z - 0.4),
      max: new V3(x + 0.4, y + 1.25, z + 0.4),
      bound: false,
      gadget: id,
    };
    BOXES.push(b);
    G0.box = b;
  }
  gadgets.set(id, G0);
}

function removeGadget(id) {
  const g = gadgets.get(id);
  if (!g) return;
  scene.remove(g.mesh);
  if (g.box) {
    const i = BOXES.indexOf(g.box);
    if (i >= 0) BOXES.splice(i, 1);
  }
  gadgets.delete(id);
}

export function clearGadgets() {
  for (const id of [...gadgets.keys()]) removeGadget(id);
  spawnLog = [];
}

export function sendGadgets() {
  if (net.mode === 'host')
    send({
      t: 'gad',
      a: [...gadgets.values()].map((g) => [
        g.id,
        g.kind,
        round2(g.x),
        round2(g.y),
        round2(g.z),
        +g.yaw.toFixed(3),
        g.by,
      ]),
    });
}

export function onGadgets(m) {
  if (game.state !== 'play') return;
  const keep = new Set(m.a.map((e) => e[0]));
  for (const id of [...gadgets.keys()]) if (!keep.has(id)) removeGadget(id);
  for (const [id, kind, x, y, z, yaw, by] of m.a) addGadget(id, kind, x, y, z, yaw, by);
}

// --- effects (called from the physics step) ---
/** Fan wind pushing fighters and props. */
export function gadgetForces(L, LP) {
  for (const g of gadgets.values()) {
    if (g.kind !== 'fan') continue;
    const D = GADGET_DEFS.fan,
      ox = g.x + g.dir.x * 0.3,
      oy = g.y + 1.05,
      oz = g.z + g.dir.z * 0.3;
    const push = (p, a, s) => {
      const rx = p.x - ox,
        ry = p.y - oy,
        rz = p.z - oz,
        al = rx * g.dir.x + rz * g.dir.z;
      if (al < 0 || al > D.len) return;
      const px = rx - g.dir.x * al,
        pz = rz - g.dir.z * al;
      if (px * px + pz * pz + ry * ry * 0.6 > D.wr * D.wr) return;
      const f = 58 * s * (1 - (al / D.len) * 0.75);
      a.x += g.dir.x * f;
      a.z += g.dir.z * f;
      a.y += f * 0.32;
    };
    for (const r of L) for (let i = 0; i < N; i++) push(r.pos[i], r.acc[i], 1);
    for (const pr of LP)
      if (!pr.dead)
        for (let i = 0; i < pr.pos.length; i++) push(pr.pos[i], pr.acc[i], Math.min(1.5, pr.w * 0.6));
  }
}

/** Trampoline bounces and launch pad launches for everything we own. */
export function gadgetContacts(L, LP) {
  const t = now();
  for (const g of gadgets.values()) {
    if (g.kind === 'tramp') {
      const D = GADGET_DEFS.tramp,
        top = g.y + D.h;
      const surf = (p, q, rad) => {
        const dx = p.x - g.x,
          dz = p.z - g.z,
          hd = Math.hypot(dx, dz);
        if (hd > D.r + rad || p.y > top + rad || p.y < g.y - 0.05) return 0;
        if (p.y > top - 0.4 && hd < D.r) {
          p.y = top + rad;
          return 1;
        }
        const k = (D.r + rad) / (hd || 1e-3);
        p.x = g.x + dx * k;
        p.z = g.z + dz * k;
        return 0;
      };
      for (const r of L) {
        let hit = false,
          vy = 0;
        for (let i = 0; i < N; i++) {
          const vyi = (r.pos[i].y - r.prev[i].y) / DT;
          if (surf(r.pos[i], r.prev[i], RAD[i])) {
            hit = true;
            vy = Math.min(vy, vyi);
            if (i === LFOOT || i === RFOOT) {
              r.ground = 0.12;
              r.groundY = top;
            }
          }
        }
        if (hit && vy < -1.5 && t - (g.cool.get(r.id) || 0) > 220) {
          g.cool.set(r.id, t);
          const up = clamp(-vy * 1.12, 10, 21);
          for (let i = 0; i < N; i++) {
            const cur = (r.pos[i].y - r.prev[i].y) / DT;
            addVel(r, i, 0, up - cur, 0);
          }
          sfx(180 + up * 14, 0.12, 'sine', 0.07 * volAt(r.pos[PELV]));
          g.squish = 1;
        }
      }
      for (const pr of LP) {
        if (pr.dead) continue;
        for (let i = 0; i < pr.pos.length; i++) {
          const p = pr.pos[i],
            q = pr.prev[i],
            vy = (p.y - q.y) / DT;
          if (surf(p, q, pr.rad[i]) && vy < -1) {
            const up = clamp(-vy * 1.1, 7, 18);
            q.y = p.y - up * DT;
            g.squish = 1;
          }
        }
      }
    } else if (g.kind === 'pad') {
      const D = GADGET_DEFS.pad,
        top = g.y + D.h;
      const inside = (p) => {
        const dx = p.x - g.x,
          dz = p.z - g.z;
        const ax = dx * Math.cos(g.yaw) - dz * Math.sin(g.yaw),
          az = dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw);
        return Math.abs(ax) < D.hs + 0.1 && Math.abs(az) < D.hs + 0.1 && p.y > g.y - 0.1 && p.y < top + 0.55;
      };
      for (const r of L) {
        if (r.dead || t - (g.cool.get(r.id) || 0) < 900) continue;
        if (!(inside(r.pos[LFOOT]) || inside(r.pos[RFOOT]) || inside(r.pos[PELV]))) continue;
        g.cool.set(r.id, t);
        g.flash = 1;
        for (let i = 0; i < N; i++) {
          const v = r.vel[i];
          addVel(r, i, g.dir.x * 16 - v.x * 0.7, 13 - v.y, g.dir.z * 16 - v.z * 0.7);
        }
        r.stun = Math.max(r.stun, 0.45);
        if (g.by && g.by !== r.id) {
          r.lastHitBy = g.by;
          r.lastHitT = t;
          r.lastHitW = 'Launch Pad';
        }
        sfx(320, 0.25, 'sawtooth', 0.08 * volAt(r.pos[PELV]));
        sfx(640, 0.2, 'triangle', 0.06 * volAt(r.pos[PELV]));
      }
      for (const pr of LP) {
        if (pr.dead || t - (g.cool.get(pr.id) || 0) < 900 || !inside(pr.c)) continue;
        g.cool.set(pr.id, t);
        g.flash = 1;
        for (let i = 0; i < pr.pos.length; i++) {
          const v = pr.vel[i];
          addVel(pr, i, g.dir.x * 14 - v.x * 0.7, 11 - v.y, g.dir.z * 14 - v.z * 0.7);
        }
        if (g.by) pr.lastHitBy = g.by;
      }
    }
  }
}

export function animateGadgets(dt) {
  const tt = now() / 1000;
  for (const g of gadgets.values()) {
    const u = g.mesh.userData;
    if (g.kind === 'fan') {
      u.hub.rotation.z -= dt * 22;
      for (const s of u.streaks) {
        const o = s.userData.o;
        o[2] = (o[2] + dt * 9) % GADGET_DEFS.fan.len;
        s.position.set(o[0], o[1], 0.4 + o[2]);
        s.material.opacity = 0.22 * (1 - o[2] / GADGET_DEFS.fan.len);
      }
    }
    if (g.kind === 'pad') {
      g.flash = Math.max(0, (g.flash || 0) - dt * 2.5);
      u.glow.emissiveIntensity = 1.1 + Math.sin(tt * 5) * 0.35 + (g.flash || 0) * 3;
    }
    if (g.kind === 'tramp') {
      g.squish = Math.max(0, (g.squish || 0) - dt * 4);
      u.bed.position.y = GADGET_DEFS.tramp.h - 0.03 - g.squish * 0.18;
    }
  }
}

// --- spawning (the host does it; others ask) ---
export function spawnedCount() {
  return [...props.values()].filter((p) => p.spawned).length + gadgets.size;
}

export function sandboxReq(m) {
  m.by = game.myBodyId;
  if (net.mode === 'client') send({ ...m, t: 'sbx' });
  else doSandbox(m);
}

/** Host only: carry out a Sandbox request (spawn, remove, undo, clear). */
export function doSandbox(m) {
  if (!isSandbox() || net.mode === 'client') return;
  const { what, by } = m;
  if (what === 'undo') {
    for (let i = spawnLog.length - 1; i >= 0; i--) {
      const e = spawnLog[i];
      if (e.by !== by) continue;
      spawnLog.splice(i, 1);
      if (removeThing(e.id)) return;
    }
    return;
  }
  if (what === 'clear') {
    for (const pr of [...props.values()]) if (pr.spawned) removeThing(pr.id);
    for (const id of [...gadgets.keys()]) removeGadget(id);
    spawnLog = [];
    sendGadgets();
    return;
  }
  if (what === 'rm') {
    removeThing(m.id);
    return;
  }
  const x = +m.x || 0,
    y = +m.y || 0,
    z = +m.z || 0,
    yaw = +m.yaw || 0;
  if (what === 'bot') {
    if (playerCount() >= MAX_PLAYERS) {
      sbNotice(by, 'Room is full (5 fighters max)');
      return;
    }
    const before = new Set(bodies.keys());
    addBot();
    const b = [...bodies.values()].find((o) => !before.has(o.id));
    if (!b) return;
    b.reset(x, z);
    b.prot = 0;
    b.sbBot = true;
    spawnLog.push({ id: b.id, by });
    return;
  }
  if (spawnedCount() >= MAX_SPAWNED) {
    sbNotice(by, `Spawn limit reached (${MAX_SPAWNED}) · use Undo or Clear`);
    return;
  }
  if (PROP_DEFS[what] && what !== 'throw') {
    const id = net.id + ':pr' + ++game.propSeq,
      pr = new Prop(id, what, x, z, y + 1, true);
    pr.spawned = true;
    pr.q.setFromEuler(new THREE.Euler(0, yaw, 0));
    pr.place(pr.c, pr.q);
    props.set(id, pr);
    spawnLog.push({ id, by });
    return;
  }
  if (GADGET_DEFS[what]) {
    const id = net.id + ':g' + ++gadSeq;
    addGadget(id, what, x, y, z, yaw, by);
    spawnLog.push({ id, by });
    sendGadgets();
  }
}

export function removeThing(id) {
  if (gadgets.has(id)) {
    removeGadget(id);
    sendGadgets();
    return true;
  }
  const pr = props.get(id);
  if (pr) {
    pr.dispose();
    props.delete(id);
    game.tethers = game.tethers.filter((t) => t.T !== pr);
    for (const b of bodies.values()) b.hold = b.hold.map((h) => (h && h.id === id ? null : h));
    send({ t: 'prgone', id });
    return true;
  }
  const b = bodies.get(id);
  if (b && b.bot) {
    removeBody(id);
    return true;
  }
  return false;
}

function sbNotice(by, txt) {
  if (by === game.myBodyId) toast(txt);
  else send({ t: 'sbmsg', to: by, txt });
}

export function toast(txt) {
  const me = localPlayer();
  if (me) (flashMsg(me, `<small>${escapeHtml(txt)}</small>`), (me.msgT = 2.2));
}
