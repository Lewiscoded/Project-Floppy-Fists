/**
 * Physics props (crates, barrels, balls, pins): rigid verlet shapes the host owns and syncs to everyone.
 * Includes explosive barrels and prop respawning.
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { V3, clamp, now, round2 } from '../core/util.js';
import { DT, N, PELV, RAD } from './constants.js';
import { gravity, wr } from './world-controls.js';

const BOOM_PROP_HP = 35; // hit points of normal props when Explosive props is on
import { addVel } from './physics.js';
import { explode } from './projectiles.js';
import { WEAPONS } from './weapons.js';
import { net, send } from '../net/network.js';
import { tA, tB, tC } from '../render/fighter-visuals.js';
import { YAX, spark } from '../render/fx.js';
import { mat } from '../render/materials.js';
import { scene } from '../render/renderer.js';
import { clearGadgets, removeThing } from '../sandbox/gadgets.js';
import { resetSandboxUI } from '../sandbox/sandbox-ui.js';
import { BOXES, THEME, boxUnder, mapKey } from '../world/world.js';

// Each prop is a small rigid cluster of Verlet points (same engine as the ragdolls).
// The host (or practice mode) simulates them; everyone else renders the host's copy.
const corners = (a, r, cr) => {
  const p = [];
  for (let i = 0; i < 8; i++) p.push([i & 1 ? a : -a, i & 2 ? a * r : -a * r, i & 4 ? a : -a, cr]);
  return p;
};

export const PROP_DEFS = {
  crate: {
    name: 'Crate',
    mass: 1.6,
    fric: 0.55,
    bounce: 0.05,
    pts: [...corners(0.3, 1, 0.15), [0, 0, 0, 0.42]],
    hp: 0,
  },
  barrel: {
    name: 'Barrel',
    mass: 1.3,
    fric: 0.4,
    bounce: 0.1,
    pts: [...corners(0.24, 1.5, 0.15), [0, 0, 0, 0.4]],
    hp: 0,
  },
  xbarrel: {
    name: 'Explosive Barrel',
    mass: 1.2,
    fric: 0.4,
    bounce: 0.1,
    pts: [...corners(0.24, 1.5, 0.15), [0, 0, 0, 0.4]],
    hp: 20,
  },
  ball: { name: 'Ball', mass: 0.35, fric: 0.08, bounce: 0.72, pts: [[0, 0, 0, 0.42]], hp: 0 },
  pin: {
    name: 'Bowling Pin',
    mass: 0.35,
    fric: 0.35,
    bounce: 0.25,
    pts: [
      [0, -0.28, 0, 0.15],
      [0, 0.28, 0, 0.11],
    ],
    hp: 0,
  },
};

WEAPONS.barrel = { cls: 'none', name: 'Explosive Barrel', kind: 'boom', dmg: 70, radius: 4.4, blast: 19 };

export const props = new Map();
game.propSeq = 0;

export const localProps = () => [...props.values()].filter((p) => p.local);

const QT = new THREE.Quaternion(),
  M3 = new THREE.Matrix4();

let beachTex = null;

function beachBall() {
  if (beachTex) return beachTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const cols = ['#ff5a5a', '#ffffff', '#ffd23f', '#ffffff', '#4aa8ff', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i];
    g.fillRect((i * 256) / 6, 0, 256 / 6 + 1, 128);
  }
  beachTex = new THREE.CanvasTexture(c);
  beachTex.colorSpace = THREE.SRGBColorSpace;
  return beachTex;
}

let bballTex = null;

function basketball() {
  if (bballTex) return bballTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8742a';
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#2b1a10';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 64);
  g.lineTo(256, 64);
  for (const x of [64, 128, 192]) {
    g.moveTo(x, 0);
    g.lineTo(x, 128);
  }
  g.stroke();
  bballTex = new THREE.CanvasTexture(c);
  bballTex.colorSpace = THREE.SRGBColorSpace;
  return bballTex;
}

export function propMesh(kind) {
  const g = new THREE.Group();
  const M = (geo, col, o = {}) => {
    const m = new THREE.Mesh(geo, mat(col, o));
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'crate') {
    M(new THREE.BoxGeometry(0.9, 0.9, 0.9), 0xc58b4e, { tex: 'wood', bump: 0.01 });
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.9, 0.9)),
      new THREE.LineBasicMaterial({ color: 0x6a4420 })
    );
    g.add(e);
    for (const s of [-1, 1]) {
      const br = M(new THREE.BoxGeometry(1.1, 0.1, 0.04), 0x8a5a2a, { tex: 'wood' });
      br.position.z = s * 0.46;
      br.rotation.z = s * 0.78;
    }
  } else if (kind === 'barrel' || kind === 'xbarrel') {
    const x = kind === 'xbarrel';
    M(
      new THREE.CylinderGeometry(0.4, 0.4, 1.04, 20),
      x ? 0xd62828 : 0x8b5a32,
      x ? { metal: 0.3, rough: 0.4 } : { tex: 'wood' }
    );
    for (const y of [-0.38, 0, 0.38])
      M(new THREE.CylinderGeometry(0.41, 0.41, 0.06, 20), x ? (y ? 0x333333 : 0xffd23f) : 0x55595f, {
        metal: 0.6,
        rough: 0.35,
      }).position.y = y;
    if (x) {
      const t = M(new THREE.CircleGeometry(0.16, 3), 0x1d1d1d);
      t.position.set(0, 0.18, 0.405);
      const t2 = t.clone();
      t2.position.z = -0.405;
      t2.rotation.y = Math.PI;
      g.add(t2);
    }
  } else if (kind === 'ball') {
    const hoodBall = mapKey === 'hood';
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 16),
      new THREE.MeshStandardMaterial({
        map: hoodBall ? basketball() : beachBall(),
        roughness: hoodBall ? 0.7 : 0.35,
      })
    );
    m.castShadow = true;
    g.add(m);
  } else if (kind === 'pin') {
    const pts = [
      [0, -0.45],
      [0.12, -0.43],
      [0.17, -0.3],
      [0.18, -0.12],
      [0.13, 0.06],
      [0.08, 0.2],
      [0.1, 0.32],
      [0.11, 0.4],
      [0.07, 0.48],
      [0, 0.5],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    M(new THREE.LatheGeometry(pts, 18), 0xf8f6f0, { rough: 0.3 });
    for (const y of [0.14, 0.19])
      M(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 16), 0xd62828).position.y = y;
  }
  scene.add(g);
  return g;
}

export class Prop {
  constructor(id, kind, x, z, y, local) {
    const d = PROP_DEFS[kind];
    Object.assign(this, {
      id,
      kind,
      def: d,
      local,
      home: [x, z],
      hp: d.hp,
      dead: false,
      deadT: 0,
      lastHitBy: null,
      seen: now(),
    });
    const n = d.pts.length,
      cen = new V3();
    for (const q of d.pts) cen.add(new V3(q[0], q[1], q[2]));
    cen.divideScalar(n);
    this.rest = d.pts.map((q) => new V3(q[0], q[1], q[2]).sub(cen));
    this.rad = d.pts.map((q) => q[3]);
    this.w = 1 / (d.mass * (n > 1 ? 0.5 : 1));
    this.pos = [];
    this.prev = [];
    this.acc = [];
    this.vel = [];
    for (let i = 0; i < n; i++) {
      this.pos.push(new V3());
      this.prev.push(new V3());
      this.acc.push(new V3());
      this.vel.push(new V3());
    }
    this.cons = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) this.cons.push([i, j, this.rest[i].distanceTo(this.rest[j])]);
    this.c = new V3();
    this.q = new THREE.Quaternion();
    this.tc = new V3();
    this.tq = new THREE.Quaternion();
    this.fresh = true;
    this.mesh = propMesh(kind);
    if (y === undefined) {
      const b = boxUnder(x, z, 100);
      const lo = Math.max(...this.rest.map((r, i) => -r.y + this.rad[i]));
      y = (b ? b.max.y : 0) + lo + 0.02;
    }
    this.place(
      new V3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * 6.28, 0))
    );
  }
  place(c, q) {
    this.c.copy(c);
    this.q.copy(q);
    for (let i = 0; i < this.pos.length; i++) {
      this.pos[i].copy(this.rest[i]).applyQuaternion(q).add(c);
      this.prev[i].copy(this.pos[i]);
    }
  }
  // derive center + rotation from the points
  readTransform() {
    const p = this.pos,
      n = p.length;
    this.c.set(0, 0, 0);
    for (const v of p) this.c.add(v);
    this.c.divideScalar(n);
    if (n >= 8) {
      tA.subVectors(p[1], p[0]).normalize();
      tB.subVectors(p[2], p[0]);
      tB.addScaledVector(tA, -tB.dot(tA)).normalize();
      tC.crossVectors(tA, tB);
      M3.makeBasis(tA, tB, tC);
      this.q.setFromRotationMatrix(M3);
    } else if (n === 2) {
      tA.subVectors(p[1], p[0]).normalize();
      this.q.setFromUnitVectors(YAX, tA);
    } else {
      // a ball rolls: spin around the axis perpendicular to its motion
      const v = this.vel[0];
      const sp = Math.hypot(v.x, v.z);
      if (sp > 0.05) {
        tA.set(v.z, 0, -v.x).normalize();
        QT.setFromAxisAngle(tA, (sp * DT) / 0.42);
        this.q.premultiply(QT);
      }
    }
  }
  dispose() {
    scene.remove(this.mesh);
  }
}

export function spawnMapProps() {
  if (net.mode === 'client') return;
  for (const [kind, x, z] of THEME.props || []) {
    const id = net.id + ':pr' + ++game.propSeq;
    props.set(id, new Prop(id, kind, x, z, undefined, true));
  }
}

export function clearProps() {
  for (const p of props.values()) p.dispose();
  props.clear();
  clearGadgets();
  resetSandboxUI();
}

// --- physics (local props only) ---
export function propStepForces(prop) {
  for (let i = 0; i < prop.pos.length; i++) {
    prop.vel[i].subVectors(prop.pos[i], prop.prev[i]).divideScalar(DT);
    prop.acc[i].set(0, -gravity(), 0);
  }
}

export function propIntegrate(prop) {
  for (let i = 0; i < prop.pos.length; i++) {
    const p = prop.pos[i],
      q = prop.prev[i];
    let vx = (p.x - q.x) * 0.996,
      vy = (p.y - q.y) * 0.996,
      vz = (p.z - q.z) * 0.996;
    const l = Math.hypot(vx, vy, vz);
    if (l > 0.5) {
      vx *= 0.5 / l;
      vy *= 0.5 / l;
      vz *= 0.5 / l;
    }
    q.copy(p);
    p.x += vx + prop.acc[i].x * DT * DT;
    p.y += vy + prop.acc[i].y * DT * DT;
    p.z += vz + prop.acc[i].z * DT * DT;
  }
}

export function propSolve(prop) {
  const p = prop.pos;
  for (const [a, b, rest] of prop.cons) {
    const pa = p[a],
      pb = p[b],
      dx = pb.x - pa.x,
      dy = pb.y - pa.y,
      dz = pb.z - pa.z,
      d = Math.hypot(dx, dy, dz) || 1e-6,
      k = (d - rest) / (d * 2);
    pa.x += dx * k;
    pa.y += dy * k;
    pa.z += dz * k;
    pb.x -= dx * k;
    pb.y -= dy * k;
    pb.z -= dz * k;
  }
}

export function propWorld(prop, final) {
  const d = prop.def,
    bouncy = wr('bouncy');
  let impact = 0; // hardest landing this pass (for bouncy floors)
  for (let i = 0; i < prop.pos.length; i++) {
    const p = prop.pos[i],
      rad = prop.rad[i];
    for (const b of BOXES) {
      if (
        p.x < b.min.x - rad ||
        p.x > b.max.x + rad ||
        p.y < b.min.y - rad ||
        p.y > b.max.y + rad ||
        p.z < b.min.z - rad ||
        p.z > b.max.z + rad
      )
        continue;
      const cx = clamp(p.x, b.min.x, b.max.x),
        cy = clamp(p.y, b.min.y, b.max.y),
        cz = clamp(p.z, b.min.z, b.max.z);
      let nx = p.x - cx,
        ny = p.y - cy,
        nz = p.z - cz,
        dd = Math.hypot(nx, ny, nz),
        pen;
      if (dd < 1e-6) {
        const fc = [p.x - b.min.x, b.max.x - p.x, p.y - b.min.y, b.max.y - p.y, p.z - b.min.z, b.max.z - p.z];
        let m = 0;
        for (let k = 1; k < 6; k++) if (fc[k] < fc[m]) m = k;
        nx = ny = nz = 0;
        const sg = m % 2 ? 1 : -1;
        if (m < 2) nx = sg;
        else if (m < 4) ny = sg;
        else nz = sg;
        pen = fc[m] + rad;
      } else {
        nx /= dd;
        ny /= dd;
        nz /= dd;
        pen = rad - dd;
        if (pen <= 0) continue;
      }
      const floor = ny > 0.6;
      if (floor && bouncy) impact = Math.min(impact, p.y - prop.prev[i].y); // speed into the floor, before the push-out
      p.x += nx * pen;
      p.y += ny * pen;
      p.z += nz * pen;
      if (final) {
        const q = prop.prev[i],
          vx = p.x - q.x,
          vy = p.y - q.y,
          vz = p.z - q.z,
          vn = vx * nx + vy * ny + vz * nz,
          k = 1 - (floor && wr('ice') ? 0.02 : d.fric); // world controls: ice floors, bouncy floors
        const nb = vn < 0 ? -vn * d.bounce : vn;
        q.set(
          p.x - (nx * nb + (vx - nx * vn) * k),
          p.y - (ny * nb + (vy - ny * vn) * k),
          p.z - (nz * nb + (vz - nz * vn) * k)
        );
      }
    }
  }
  if (impact < -0.02) bounceUp(prop.pos, prop.prev, impact, Math.max(d.bounce, 0.75));
}

/**
 * Bouncy floors (world control): the whole object bounces at once, so its linked points don't drag
 * each other back down. impact = how far it moved into the floor this step (negative).
 */
export function bounceUp(pos, prev, impact, keep) {
  for (let i = 0; i < pos.length; i++) {
    const vy = pos[i].y - prev[i].y;
    prev[i].y = pos[i].y - Math.max(-impact * keep, vy); // moving up at least as fast as it hit
  }
}

// sphere-vs-sphere between a fighter and a prop; mB/mP say which side may move
export function collideBodyProp(fighter, prop, mB, mP) {
  if (prop.dead || fighter.pos[PELV].distanceToSquared(prop.c) > 9) return;
  const wb = mB ? 1 : 0,
    wp = mP ? prop.w * 0.6 : 0;
  if (!wb && !wp) return;
  for (let i = 0; i < N; i++) {
    const pi = fighter.pos[i];
    for (let j = 0; j < prop.pos.length; j++) {
      const pj = prop.pos[j],
        rr = RAD[i] + prop.rad[j],
        dx = pj.x - pi.x,
        dy = pj.y - pi.y,
        dz = pj.z - pi.z,
        d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6,
        k = (rr - d) / (d * (wb + wp));
      pi.x -= dx * k * wb;
      pi.y -= dy * k * wb;
      pi.z -= dz * k * wb;
      pj.x += dx * k * wp;
      pj.y += dy * k * wp;
      pj.z += dz * k * wp;
    }
  }
}

export function collidePropProp(a, fighter) {
  if (a.dead || fighter.dead || a.c.distanceToSquared(fighter.c) > 4) return;
  for (let i = 0; i < a.pos.length; i++)
    for (let j = 0; j < fighter.pos.length; j++) {
      const pi = a.pos[i],
        pj = fighter.pos[j],
        rr = a.rad[i] + fighter.rad[j],
        dx = pj.x - pi.x,
        dy = pj.y - pi.y,
        dz = pj.z - pi.z,
        d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6,
        k = (rr - d) / (d * (a.w + fighter.w));
      pi.x -= dx * k * a.w;
      pi.y -= dy * k * a.w;
      pi.z -= dz * k * a.w;
      pj.x += dx * k * fighter.w;
      pj.y += dy * k * fighter.w;
      pj.z += dz * k * fighter.w;
    }
}

// --- hits ---
/** Hit a prop (quiet = no spark, for weapons that hit many times a second). */
export function propHit(prop, j, imp, dmg, by, quiet) {
  if (prop.dead) return;
  if (!prop.local) {
    send({
      t: 'ph',
      id: prop.id,
      j,
      i: [round2(imp.x), round2(imp.y), round2(imp.z)],
      d: Math.round(dmg || 0),
      by,
    });
    if (!quiet) spark(prop.pos[j]);
    return;
  }
  applyPropHit(prop, j, imp, dmg, by);
}

export function applyPropHit(prop, j, imp, dmg, by) {
  if (prop.dead) return;
  const s = Math.min(1.5, prop.w * 0.75);
  for (let i = 0; i < prop.pos.length; i++) {
    const m = (i === j ? 1.4 : 0.8) * s;
    addVel(prop, i, imp.x * m, imp.y * m, imp.z * m);
  }
  if (by) prop.lastHitBy = by;
  // explosive props (world control): every prop gets hit points and blows up like a barrel
  const maxHp = prop.def.hp || (wr('boomProps') ? BOOM_PROP_HP : 0);
  if (maxHp && dmg > 0) {
    if (!(prop.hp > 0)) prop.hp = maxHp;
    prop.hp -= dmg;
    if (prop.hp <= 0) detonateProp(prop);
  }
}

export function detonateProp(prop) {
  if (prop.dead) return;
  prop.dead = true;
  prop.deadT = 12;
  prop.mesh.visible = false;
  explode(prop.c.clone(), 'barrel', prop.lastHitBy, null);
}

function propsNear(p, R) {
  return [...props.values()].filter((prop) => !prop.dead && prop.c.distanceTo(p) < R + 1);
}

// --- per-frame: respawns, rendering, proxies ---
export function updateProps(dt) {
  for (const pr of props.values()) {
    if (pr.local) {
      pr.readTransform();
      if (pr.spawned && (pr.dead || pr.c.y < -20)) {
        removeThing(pr.id);
        continue;
      }
      if (pr.dead) {
        pr.deadT -= dt;
        if (pr.deadT <= 0) {
          pr.dead = false;
          pr.hp = pr.def.hp;
          pr.mesh.visible = true;
          const b = boxUnder(pr.home[0], pr.home[1], 100);
          pr.place(new V3(pr.home[0], (b ? b.max.y : 0) + 1.2, pr.home[1]), pr.q);
        }
      } else if (pr.c.y < -20) {
        const b = boxUnder(pr.home[0], pr.home[1], 100);
        pr.place(new V3(pr.home[0], (b ? b.max.y : 0) + 1.5, pr.home[1]), pr.q);
      }
    } else {
      if (now() - pr.seen > 3000) {
        pr.dispose();
        props.delete(pr.id);
        continue;
      }
      const k = pr.fresh ? 1 : 1 - Math.exp(-dt * 16);
      pr.fresh = false;
      const oc = pr.c.clone();
      pr.c.lerp(pr.tc, k);
      pr.q.slerp(pr.tq, k);
      for (let i = 0; i < pr.pos.length; i++) {
        const np = pr.rest[i].clone().applyQuaternion(pr.q).add(pr.c);
        pr.vel[i].subVectors(np, pr.pos[i]).divideScalar(Math.max(dt, 1e-3));
        pr.prev[i].copy(pr.pos[i]);
        pr.pos[i].copy(np);
      }
      pr.mesh.visible = !pr.dead;
    }
    pr.mesh.position.copy(pr.c);
    pr.mesh.quaternion.copy(pr.q);
  }
}

export function sendProps() {
  const a = [];
  for (const pr of localProps())
    a.push([
      pr.id,
      pr.kind,
      round2(pr.c.x),
      round2(pr.c.y),
      round2(pr.c.z),
      +pr.q.x.toFixed(3),
      +pr.q.y.toFixed(3),
      +pr.q.z.toFixed(3),
      +pr.q.w.toFixed(3),
      pr.dead ? 1 : 0,
    ]);
  if (a.length) send({ t: 'pr', a });
}

export function onPropState(m) {
  if (game.state !== 'play') return;
  for (const [id, kind, x, y, z, qx, qy, qz, qw, dead] of m.a) {
    let pr = props.get(id);
    if (!pr) {
      if (!PROP_DEFS[kind]) continue;
      pr = new Prop(id, kind, x, z, y, false);
      props.set(id, pr);
    }
    if (pr.local) continue;
    pr.tc.set(x, y, z);
    pr.tq.set(qx, qy, qz, qw);
    pr.seen = now();
    pr.dead = !!dead;
  }
}
