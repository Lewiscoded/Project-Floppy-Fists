/**
 * Traps: banana peels, spring traps and sticky mines.
 *
 * A trap is a projectile (see projectiles.js) that sticks wherever it lands. After ARM_TIME seconds it is
 * live, and the game that threw it watches every fighter (including other players' proxies). When someone
 * steps close enough it goes off and the hit is sent like any other weapon hit, so kill credit works.
 * Each fighter can have MAX_TRAPS down at once; placing another removes their oldest.
 */
import { V3 } from '../core/util.js';
import { bodies } from './bodies.js';
import { dealHit } from './combat.js';
import { LFOOT, N, PELV, RFOOT } from './constants.js';
import { explode, projs, removeProj } from './projectiles.js';
import { weaponFx } from './weapon-kinds.js';
import { WEAPONS } from './weapons.js';
import { send } from '../net/network.js';

export const MAX_TRAPS = 3;
export const ARM_TIME = 1; // seconds after landing before a trap can go off
export const TRAP_LIFE = 45; // traps vanish after this many seconds

export const isTrap = (k) => WEAPONS[k] && WEAPONS[k].kind === 'trap';

/** Before placing a new trap: if this fighter already has MAX_TRAPS down, remove the oldest. */
export function limitTraps(ownerId) {
  const mine = [...projs.values()].filter((q) => q.local && q.by === ownerId && isTrap(q.k));
  mine.sort((a, b) => b.t - a.t); // oldest first
  while (mine.length >= MAX_TRAPS) removeTrap(mine.shift());
}

function removeTrap(q) {
  removeProj(q.id);
  send({ t: 'pend', id: q.id });
}

/** Closest distance from point p to a fighter's feet / pelvis (what "stepping on it" means). */
function stepDist(b, p) {
  let d = 1e9;
  for (const j of [LFOOT, RFOOT, PELV]) d = Math.min(d, b.pos[j].distanceTo(p));
  return d;
}

/** Called every frame for each trap we threw. Returns true if the trap went off (and is gone). */
export function checkTrap(q) {
  if (!q.stuck || q.armT < ARM_TIME) return false;
  const w = WEAPONS[q.k];
  for (const b of bodies.values()) {
    if (b.dead) continue;
    if (q.k === 'mine') {
      // mines go off when any part of anyone gets close (they can be on walls and ceilings)
      let near = false;
      for (let i = 0; i < N && !near; i++) near = b.pos[i].distanceTo(q.p) < w.trigger;
      if (!near) continue;
      explode(q.p.clone(), 'mine', q.by, q.id);
      return true;
    }
    if (stepDist(b, q.p) > w.trigger) continue;
    if (q.k === 'banana') slipOn(b, q);
    else if (q.k === 'springtrap') springOn(b, q);
    removeTrap(q);
    return true;
  }
  return false;
}

/** Banana: feet go forward the way they were walking (or a random way when standing still). */
function slipOn(b, q) {
  const v = b.vel[PELV];
  const dir = new V3(v.x, 0, v.z);
  if (dir.lengthSq() < 0.5) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  dir.normalize();
  const imp = dir.multiplyScalar(7).add(new V3(0, 6, 0));
  dealHit(b, LFOOT, WEAPONS.banana.dmg, imp, q.by, 'banana');
  shareTrapFx('slip', q.p);
}

/** Spring trap: straight up, a little forward. */
function springOn(b, q) {
  const imp = new V3((Math.random() - 0.5) * 3, 22, (Math.random() - 0.5) * 3);
  dealHit(b, PELV, WEAPONS.springtrap.dmg, imp, q.by, 'springtrap');
  shareTrapFx('spring', q.p);
}

function shareTrapFx(k, p) {
  send({ t: 'wfx', k, p: p.toArray().map((x) => +x.toFixed(2)) });
  weaponFx(k, p);
}
