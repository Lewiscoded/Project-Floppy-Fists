/**
 * Everything thrown or launched: rockets, grenades, cluster bombs (and their bomblets), pies and traps,
 * plus explosions (damage falloff, knockback, wall blocking).
 *
 * How each kind flies:
 *   rocket            straight, explodes on contact
 *   grenade, cluster  arc and bounce, explode when the fuse runs out (cluster then scatters bomblets)
 *   pie               arc, splats on whatever it hits (cream in the face, see status.js)
 *   traps             arc, stick where they land, then traps.js decides when they go off
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { sfx, volAt } from '../audio/sfx.js';
import { V3, now } from '../core/util.js';
import { TMP, bodies, localBodies } from './bodies.js';
import { dealHit, hitNotify, kill, rayBox } from './combat.js';
import { FRONT, G, HEAD, N, PELV, RAD } from './constants.js';
import { addVel } from './physics.js';
import { detonateProp, localProps, props } from './props.js';
import { TRAP_LIFE, checkTrap, isTrap } from './traps.js';
import { weaponFx } from './weapon-kinds.js';
import { WEAPONS } from './weapons.js';
import { net, send } from '../net/network.js';
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

/** Meshes for the newer projectiles. Each gets add(geo, color, x, y, z, rotX) like the map themes use. */
const PROJ_LOOKS = {
  cluster: (add) => {
    add(new THREE.SphereGeometry(0.17, 12, 10), 0x2e2e33, 0, 0, 0);
    for (let i = 0; i < 4; i++)
      add(
        new THREE.SphereGeometry(0.07, 8, 6),
        0xd04a2a,
        Math.cos(i * 1.57) * 0.15,
        0.05,
        Math.sin(i * 1.57) * 0.15
      );
  },
  bomblet: (add) => add(new THREE.SphereGeometry(0.08, 8, 6), 0xd04a2a, 0, 0, 0),
  pie: (add) => {
    add(new THREE.CylinderGeometry(0.2, 0.16, 0.08, 14), 0xc8863a, 0, 0, 0);
    add(new THREE.SphereGeometry(0.17, 12, 8), 0xfffaf0, 0, 0.04, 0).scale.set(1, 0.45, 1);
  },
  banana: (add) => {
    for (let i = 0; i < 3; i++) {
      const m = add(new THREE.BoxGeometry(0.07, 0.03, 0.3), 0xf2d43a, 0, 0.02, 0);
      m.rotation.y = (i / 3) * Math.PI * 2;
      m.position.set(Math.sin(m.rotation.y) * 0.12, 0.02, Math.cos(m.rotation.y) * 0.12);
    }
    add(new THREE.SphereGeometry(0.06, 8, 6), 0x7a5a1a, 0, 0.04, 0);
  },
  springtrap: (add) => {
    add(new THREE.CylinderGeometry(0.32, 0.34, 0.06, 16), 0x6a6f78, 0, 0.0, 0);
    add(new THREE.TorusGeometry(0.2, 0.03, 6, 14), 0xb9c0c8, 0, 0.07, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), 0xd94040, 0, 0.12, 0);
  },
  mine: (add) => {
    add(new THREE.CylinderGeometry(0.2, 0.22, 0.09, 14), 0x30343a, 0, 0, 0);
    add(new THREE.SphereGeometry(0.05, 8, 6), 0xff2a2a, 0, 0.06, 0).userData.blink = true;
  },
};

export function spawnProj(id, k, by, p, v, local) {
  const mesh = new THREE.Group();
  const tp = (THEME && THEME.proj[k]) || PROJ_LOOKS[k];
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
    stuck: false, // traps: landed and stuck in place
    armT: 0, // traps: seconds since landing
    fuse: k === 'bomblet' ? 0.5 + Math.random() * 0.5 : (WEAPONS[k] && WEAPONS[k].fuse) || 0,
  });
}

export function removeProj(id) {
  const q = projs.get(id);
  if (q) {
    if (q.k === 'pie') weaponFx('splat', q.p);
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
    const trap = isTrap(q.k);
    if (trap && q.stuck) q.armT += dt;
    for (let s = 0; s < n && !boom && !q.stuck; s++) {
      if (q.k !== 'rocket') q.v.y -= G * h * (q.k === 'pie' ? 0.55 : 1);
      const old = q.p.clone();
      q.p.addScaledVector(q.v, h);
      const b = insideBox(q.p, 0.12);
      if (b) {
        if (q.k === 'rocket' || q.k === 'pie') boom = true;
        else if (trap) {
          // traps stick to whatever they touch
          q.p.copy(old);
          q.v.set(0, 0, 0);
          q.stuck = true;
          q.mesh.rotation.set(0, Math.random() * 6.28, 0);
          sfx(q.k === 'mine' ? 900 : 260, 0.06, 'square', 0.04 * volAt(q.p));
        } else {
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
      if ((q.k === 'rocket' || q.k === 'pie') && q.local) {
        for (const bd of bodies.values()) {
          if ((bd.id === q.by && q.t < 0.25) || bd.dead) continue;
          if (bd.pos[PELV].distanceTo(q.p) > 2.5) continue;
          for (let j = 0; j < N; j++)
            if (bd.pos[j].distanceTo(q.p) < RAD[j] * bd.size + 0.15) {
              boom = true;
              if (q.k === 'pie') q.hitBody = bd;
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
    if (q.fuse && q.t >= q.fuse) boom = true;
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
    } else if (trap) {
      if (q.k === 'mine')
        q.mesh.traverse((m) => m.userData.blink && (m.visible = q.stuck && (q.t * 3) % 1 < 0.5));
      if (!q.stuck) q.mesh.rotation.x += dt * 6;
    } else q.mesh.rotation.x += dt * 8;
    if (boom && q.local && q.k === 'pie') {
      splatPie(q);
      continue;
    }
    if (boom && q.local) {
      explode(q.p.clone(), q.k, q.by, q.id);
      continue;
    }
    if (trap && q.local && checkTrap(q)) continue;
    if (boom && !q.local && (q.k === 'rocket' || q.k === 'pie')) {
      q.v.set(0, 0, 0);
      q.mesh.visible = false;
    }
    if (q.p.y < -50 || q.t > (trap ? TRAP_LIFE : 8)) {
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

/** A pie hit something: cream the fighter it hit (if any) and splat. */
function splatPie(q) {
  const b = q.hitBody;
  if (b) dealHit(b, HEAD, WEAPONS.pie.dmg, q.v.clone().multiplyScalar(0.25), q.by, 'pie');
  removeProj(q.id);
  send({ t: 'pend', id: q.id });
}

/** Explosion at a point: damage and knockback with distance falloff, blocked by walls. */
export function explode(p, k, by, pid) {
  removeProj(pid);
  send({ t: 'boom', p: p.toArray().map((v) => +v.toFixed(2)), k, by, pid });
  onBoom(p, k, by);
  if (k === 'cluster') scatterBomblets(p, by);
}

/** A cluster bomb splits into little bombs that bounce away and pop a moment later. */
function scatterBomblets(p, by) {
  const n = WEAPONS.cluster.bomblets;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const v = new V3(
      Math.cos(a) * (4 + Math.random() * 3),
      5 + Math.random() * 3,
      Math.sin(a) * (4 + Math.random() * 3)
    );
    const at = p.clone().add(new V3(0, 0.3, 0));
    const id = net.id + '#' + ++game.projSeq;
    spawnProj(id, 'bomblet', by, at, v, true);
    send({ t: 'proj', id, k: 'bomblet', by, p: at.toArray(), v: v.toArray() });
  }
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
