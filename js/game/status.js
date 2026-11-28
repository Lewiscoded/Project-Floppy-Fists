/**
 * Status effects that weapons put on fighters: burning, frozen, shrunk and pied.
 *
 * Each fighter has fighter.fx = { burn, freeze, shrink, pie }, the seconds left on each effect.
 * The fighter's owner runs the timers and the gameplay side (burn damage, panic, the ice block,
 * shrinking the ragdoll). Everyone else learns which effects are on from the pose stream
 * (statusCode / readStatusCode) and just draws them (see fighter-visuals.js and overlay.js).
 */
import { now } from '../core/util.js';
import { N, PELV, UPPER } from './constants.js';
import { addVel } from './physics.js';
import { kill } from './combat.js';
import { wr } from './world-controls.js';

/** One letter per effect, used in the pose stream. */
const LETTERS = { burn: 'b', freeze: 'f', shrink: 's', pie: 'p' };

export const BURN_DPS = 7; // damage per second while on fire
export const SHRUNK_SIZE = 0.5; // ragdoll scale while shrunk
export const SHRUNK_KNOCK = 1.7; // tiny fighters are light: hits push them this much harder

export const freshStatus = () => ({ burn: 0, freeze: 0, shrink: 0, pie: 0 });

/** Put an effect on a fighter we own (called from applyHit). */
export function applyStatus(f, kind, secs) {
  if (f.dead || !(kind in LETTERS)) return;
  // fire and ice cancel each other out
  if (kind === 'burn' && f.fx.freeze > 0) return void (f.fx.freeze = 0);
  if (kind === 'freeze') {
    f.fx.burn = 0;
    if (!(f.fx.freeze > 0)) freezePose(f);
  }
  f.fx[kind] = Math.max(f.fx[kind], secs);
}

/** Remember the fighter's current shape so it can slide around as one solid ice block. */
function freezePose(f) {
  const c = f.pos[PELV];
  f.frozenPose = f.pos.map((p) => p.clone().sub(c));
}

/** Clear every effect (respawn, death). */
export function clearStatus(f) {
  f.fx = freshStatus();
  f.frozenPose = null;
}

/** Tick a fighter's effects. Runs every frame for every fighter; gameplay only for ones we own. */
export function updateStatus(f, dt) {
  const fx = f.fx;
  // size eases toward its target so shrinking looks like a squish, not a pop
  const want = fx.shrink > 0 ? SHRUNK_SIZE : 1;
  f.size += (want - f.size) * Math.min(1, dt * 6);
  if (Math.abs(f.size - want) < 0.003) f.size = want;
  if (!f.local) return;
  if (f.dead) {
    if (fx.burn || fx.freeze || fx.shrink || fx.pie) clearStatus(f);
    return;
  }
  for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);
  if (fx.freeze > 0) f.stun = Math.max(f.stun, 0.1);
  else if (f.frozenPose) f.frozenPose = null;
  if (fx.burn > 0) {
    f.hp -= wr('oneHit') ? f.hp : BURN_DPS * dt; // one-hit KOs: fire is instantly fatal too
    // panic: little random hops and shoves while on fire
    f.panicT = (f.panicT || 0) - dt;
    if (f.panicT <= 0) {
      f.panicT = 0.25 + Math.random() * 0.2;
      const x = (Math.random() - 0.5) * 5,
        z = (Math.random() - 0.5) * 5;
      for (const i of UPPER) addVel(f, i, x, 1.2, z);
    }
    if (f.hp <= 0) {
      const by = now() - f.lastHitT < 7000 ? f.lastHitBy : null;
      kill(f, by, 'flame');
    }
  }
}

/** Letters for the effects that are on, e.g. "bs" = burning and shrunk. */
export function statusCode(f) {
  let s = '';
  for (const k in LETTERS) if (f.fx[k] > 0) s += LETTERS[k];
  return s;
}

/** A proxy's effects, read from the pose stream. */
export function readStatusCode(f, code) {
  for (const k in LETTERS) f.fx[k] = code && code.includes(LETTERS[k]) ? 1 : 0;
}

/** True when the local player has cream on their face (for the screen overlay). */
export const piedAmount = (me) => (me && me.fx.pie > 0 ? Math.min(1, me.fx.pie / 1.2) : 0);

/** Keep a frozen fighter rigid: every particle stays where it was relative to the pelvis, moving together. */
export function holdFrozenShape(f) {
  const P = f.frozenPose;
  let cx = 0,
    cy = 0,
    cz = 0,
    vx = 0,
    vy = 0,
    vz = 0;
  for (let i = 0; i < N; i++) {
    const p = f.pos[i],
      q = f.prev[i];
    cx += p.x - P[i].x;
    cy += p.y - P[i].y;
    cz += p.z - P[i].z;
    vx += p.x - q.x;
    vy += p.y - q.y;
    vz += p.z - q.z;
  }
  cx /= N;
  cy /= N;
  cz /= N;
  vx /= N;
  vy /= N;
  vz /= N;
  for (let i = 0; i < N; i++) {
    f.pos[i].set(cx + P[i].x, cy + P[i].y, cz + P[i].z);
    f.prev[i].set(f.pos[i].x - vx, f.pos[i].y - vy, f.pos[i].z - vz);
  }
}
