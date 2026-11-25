/**
 * Rockets and grenades in flight, and explosions (damage falloff, knockback, wall blocking).
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { sfx, volAt } from '../audio.js';
import { V3, now } from '../core/util.js';
import { TMP, bodies, localBodies } from './bodies.js';
import { hitNotify, kill, rayBox } from './combat.js';
import { FRONT, G, N, PELV, RAD } from './constants.js';
import { addVel } from './physics.js';
import { detonateProp, localProps, props } from './props.js';
import { WEAPONS } from './weapons.js';
import { send } from '../net/network.js';
import { ZAX, boomFx, glow, puff } from '../render/fx.js';
import { scene } from '../render/renderer.js';
import { dmgDir } from '../ui/overlay.js';
import { BOXES, THEME } from '../world/world.js';

export const projs = new Map();
game.projSeq = 0;

const rocketGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 10),
  rocketMat = new THREE.MeshStandardMaterial({ color: 0x6b7d4a });

const noseGeo = new THREE.ConeGeometry(0.09, 0.2, 10),
  noseMat = new THREE.MeshStandardMaterial({ color: 0xff5a3a });

const nadeGeo = new THREE.SphereGeometry(0.14, 12, 10),
  nadeMat = new THREE.MeshStandardMaterial({ color: 0x3e5a2a, roughness: 0.5 });

export function spawnProj(id, k, by, p, v, local) {
  const mesh = new THREE.Group();
  const tp = THEME && THEME.proj[k];
  if (tp)
    tp((geo, col, x, y, z, rx) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      mesh.add(m);
      return m;
    });
  else if (k === 'rocket') {
    const b = new THREE.Mesh(rocketGeo, rocketMat);
    b.rotation.x = Math.PI / 2;
    mesh.add(b);
    const n = new THREE.Mesh(noseGeo, noseMat);
    n.rotation.x = Math.PI / 2;
    n.position.z = 0.37;
    mesh.add(n);
  } else mesh.add(new THREE.Mesh(nadeGeo, nadeMat));
  mesh.traverse((o) => (o.castShadow = true));
  scene.add(mesh);
  projs.set(id, {
    id,
    k,
    by,
    p: new V3(p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]),
    v: new V3(v.x ?? v[0], v.y ?? v[1], v.z ?? v[2]),
    t: 0,
    local,
    mesh,
    trail: 0,
  });
}

export function removeProj(id) {
  const q = projs.get(id);
  if (q) {
    scene.remove(q.mesh);
    projs.delete(id);
  }
}

function insideBox(p, pad) {
  for (const b of BOXES)
    if (
      p.x > b.min.x - pad &&
      p.x < b.max.x + pad &&
      p.y > b.min.y - pad &&
      p.y < b.max.y + pad &&
      p.z > b.min.z - pad &&
      p.z < b.max.z + pad
    )
      return b;
  return null;
}

export function updateProjs(dt) {
  for (const q of [...projs.values()]) {
    q.t += dt;
    const n = 3,
      h = dt / n;
    let boom = false;
    for (let s = 0; s < n && !boom; s++) {
      if (q.k === 'grenade') q.v.y -= G * h;
      const old = q.p.clone();
      q.p.addScaledVector(q.v, h);
      const b = insideBox(q.p, 0.12);
      if (b) {
        if (q.k === 'rocket') boom = true;
        else {
          q.p.copy(old);
          const fc = [
            Math.abs(old.x - (b.min.x - 0.12)),
            Math.abs(old.x - (b.max.x + 0.12)),
            Math.abs(old.y - (b.min.y - 0.12)),
            Math.abs(old.y - (b.max.y + 0.12)),
            Math.abs(old.z - (b.min.z - 0.12)),
            Math.abs(old.z - (b.max.z + 0.12)),
          ];
          let m = 0;
          for (let k = 1; k < 6; k++) if (fc[k] < fc[m]) m = k;
          const ax = m < 2 ? 'x' : m < 4 ? 'y' : 'z';
          q.v[ax] *= -0.45;
          for (const o of ['x', 'y', 'z']) if (o !== ax) q.v[o] *= 0.75;
          if (Math.abs(q.v[ax]) > 1.5) sfx(500, 0.04, 'square', 0.03 * volAt(q.p));
        }
      }
      if (q.k === 'rocket' && q.local) {
        for (const bd of bodies.values()) {
          if ((bd.id === q.by && q.t < 0.25) || bd.dead) continue;
          if (bd.pos[PELV].distanceTo(q.p) > 2.5) continue;
          for (let j = 0; j < N; j++)
            if (bd.pos[j].distanceTo(q.p) < RAD[j] + 0.15) {
              boom = true;
              break;
            }
          if (boom) break;
        }
        if (!boom)
          for (const pr of props.values()) {
            if (pr.dead || pr.c.distanceTo(q.p) > 1.5) continue;
            for (let j = 0; j < pr.pos.length; j++)
              if (pr.pos[j].distanceTo(q.p) < pr.rad[j] + 0.12) {
                boom = true;
                break;
              }
            if (boom) break;
          }
      }
    }
    if (q.k === 'grenade' && q.t >= WEAPONS.grenade.fuse) boom = true;
    q.mesh.position.copy(q.p);
    if (q.k === 'rocket') {
      TMP.copy(q.v).normalize();
      q.mesh.quaternion.setFromUnitVectors(ZAX, TMP);
      q.trail -= dt;
      if (q.trail <= 0) {
        q.trail = 0.02;
        puff(q.p, 0.16, 0xd8d8d8, 0.7);
        glow(q.p, 0.35, 0xffb04a, 0.08, 0.2);
      }
    } else q.mesh.rotation.x += dt * 8;
    if (boom && q.local) {
      explode(q.p.clone(), q.k, q.by, q.id);
      continue;
    }
    if (boom && !q.local && q.k === 'rocket') {
      q.v.set(0, 0, 0);
      q.mesh.visible = false;
    }
    if (q.p.y < -50 || q.t > 8) {
      removeProj(q.id);
      if (q.local) send({ t: 'pend', id: q.id });
    }
  }
}

function blastProps(p, weapon, by) {
  const R = weapon.radius;
  for (const pr of localProps()) {
    if (pr.dead) continue;
    const d = pr.c.distanceTo(p);
    if (d > R + 0.4) continue;
    const f = Math.max(0.1, 1 - d / R) * (blastBlocked(p, pr.c) ? 0.2 : 1);
    TMP.subVectors(pr.c, p).normalize();
    const kb = (weapon.blast || 18) * f * 1.15;
    for (let i = 0; i < pr.pos.length; i++) addVel(pr, i, TMP.x * kb, TMP.y * kb + 5 * f, TMP.z * kb);
    if (by) pr.lastHitBy = by;
    if (pr.def.hp) {
      pr.hp -= weapon.dmg * f;
      if (pr.hp <= 0) {
        const q = pr;
        setTimeout(() => detonateProp(q), 130);
      }
    }
  }
}

function blastBlocked(a, b) {
  const d = new V3().subVectors(b, a),
    L = d.length();
  if (L < 0.5) return false;
  d.divideScalar(L);
  const o = a.clone().addScaledVector(d, 0.25); // start just outside whatever the rocket hit
  for (const bx of BOXES) {
    const t = rayBox(o, d, bx);
    if (t >= 0 && t < L - 0.5) return true;
  }
  return false;
}

/** Explosion at a point: damage and knockback with distance falloff, blocked by walls. */
export function explode(p, k, by, pid) {
  removeProj(pid);
  send({ t: 'boom', p: p.toArray().map((v) => +v.toFixed(2)), k, by, pid });
  onBoom(p, k, by);
}

export function onBoom(p, k, by) {
  boomFx(p, WEAPONS[k].radius, k);
  const w = WEAPONS[k],
    R = w.radius;
  blastProps(p, w, by);
  for (const b of localBodies()) {
    let dmin = 1e9;
    if (b.prot > 0 && !b.dead) {
      for (let i = 0; i < N; i++) dmin = Math.min(dmin, b.pos[i].distanceTo(p));
      if (dmin < R) hitNotify(b, by, 0, false, true);
      continue;
    }
    // walls between the blast and the fighter soak most of it
    const cover = blastBlocked(p, b.pos[FRONT]) ? 0.2 : 1;
    for (let i = 0; i < N; i++) {
      const d = b.pos[i].distanceTo(p);
      dmin = Math.min(dmin, d);
      if (d < R) {
        const f = (1 - d / R) * cover;
        TMP.subVectors(b.pos[i], p).normalize();
        const kb = w.blast || 18;
        addVel(b, i, TMP.x * kb * f, TMP.y * kb * f + 6 * f, TMP.z * kb * f);
      }
    }
    if (dmin < R && !b.dead) {
      const f = (1 - dmin / R) * cover,
        self = b.id === by;
      if (by && !self) {
        b.lastHitBy = by;
        b.lastHitT = now();
        b.lastHitW = k;
      }
      const dd = w.dmg * f * (self ? 0.4 : 1);
      b.hp -= dd;
      b.stun = Math.max(b.stun, 0.4 + f);
      if (b.id === game.myBodyId) {
        game.hurtFlash = 0.4;
        if (!self) dmgDir(by, p);
      }
      if (!self) hitNotify(b, by, dd, false);
      if (b.hp <= 0) kill(b, by, k);
    }
  }
}
