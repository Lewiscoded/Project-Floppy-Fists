/**
 * Firing code for the newer weapon kinds: cone weapons (gravity glove, leaf blower, flamethrower),
 * beams (freeze ray, shrink ray), the grappling hook, and the sledgehammer's shockwave.
 *
 * The shooter's game works out who got hit and sends normal 'hit' messages (dealHit), so damage,
 * knockback, kill credit and status effects all go through applyHit like every other weapon.
 * What everyone else should SEE is sent as a small 'wfx' message and drawn by weaponFx().
 */
import { game } from '../core/state.js';
import { noise, sfx, volAt } from '../audio/sfx.js';
import { V3, round2 } from '../core/util.js';
import { TMP, bodies, localPlayer } from './bodies.js';
import { dealHit, gunSfx, muzzle, rayBox, raycast } from './combat.js';
import { FRONT, HEAD, N, PELV } from './constants.js';
import { addVel } from './physics.js';
import { propHit, props } from './props.js';
import { send } from '../net/network.js';
import { glow, muzzleFlash, puff, spark, streak, tracer } from '../render/fx.js';
import { comicBurst } from '../ui/overlay.js';
import { BOXES } from '../world/world.js';

/** Fire functions by weapon kind. combat.js fire() calls these for kinds it doesn't handle itself. */
export const FIRE_KINDS = {
  cone: fireCone,
  beam: fireBeam,
  grapple: fireGrapple,
};

// ---------- helpers ----------

/** True when nothing solid is between a and b. */
function clearLine(a, b) {
  const d = new V3().subVectors(b, a),
    L = d.length();
  if (L < 0.3) return true;
  d.divideScalar(L);
  for (const bx of BOXES) {
    if (bx.bound) continue;
    const t = rayBox(a, d, bx);
    if (t >= 0 && t < L - 0.2) return false;
  }
  return true;
}

/**
 * Everything inside a cone in front of the muzzle: fighters (not the shooter) and props,
 * with nothing solid in the way. Returns [{ body | prop, j, dist }].
 */
function coneTargets(fighter, o, aim, cone) {
  const out = [];
  const inCone = (p) => {
    TMP.subVectors(p, o);
    const d = TMP.length();
    if (d > cone.range || d < 1e-3) return -1;
    return TMP.divideScalar(d).dot(aim) >= cone.angle ? d : -1;
  };
  for (const b of bodies.values()) {
    if (b === fighter || b.dead) continue;
    for (const j of [FRONT, PELV, HEAD]) {
      const d = inCone(b.pos[j]);
      if (d >= 0 && clearLine(o, b.pos[j])) {
        out.push({ body: b, j, dist: d });
        break;
      }
    }
  }
  for (const pr of props.values()) {
    if (pr.dead) continue;
    const d = inCone(pr.c);
    if (d >= 0 && clearLine(o, pr.c)) out.push({ prop: pr, j: 0, dist: d });
  }
  return out;
}

/** Send a visual-only effect to everyone and draw it here too. */
function shareFx(k, p, d) {
  const m = { t: 'wfx', k, p: [round2(p.x), round2(p.y), round2(p.z)] };
  if (d) m.d = [round2(d.x), round2(d.y), round2(d.z)];
  send(m);
  weaponFx(k, p, d);
}

// ---------- cone weapons ----------

/** Gravity glove (fling everything up and away), leaf blower and flamethrower (steady push). */
function fireCone(fighter, w) {
  const o = muzzle(fighter),
    A = fighter.aim;
  for (const h of coneTargets(fighter, o, A, w.cone)) {
    let imp;
    if (w.fling)
      imp = A.clone()
        .setY(0)
        .normalize()
        .multiplyScalar(11)
        .add(new V3(0, 12, 0));
    else {
      const f = 1 - (h.dist / w.cone.range) * 0.5; // weaker at the far end
      imp = A.clone().multiplyScalar(w.push * f);
      imp.y += w.push * 0.25;
    }
    if (h.body) dealHit(h.body, h.j, w.dmg, imp, fighter.id, fighter.weapon);
    else propHit(h.prop, h.j, imp.multiplyScalar(1.3), w.dmg, fighter.id, true);
  }
  shareFx(fighter.weapon, o, A);
}

// ---------- beams ----------

/** Freeze ray and shrink ray: one straight ray. The status effect is applied by applyHit. */
function fireBeam(fighter, w) {
  const m = muzzle(fighter),
    d = fighter.aim.clone(),
    res = raycast(m, d, 40, fighter),
    end = m.clone().addScaledVector(d, res.t);
  if (res.body)
    dealHit(res.body, res.j, w.dmg, d.clone().multiplyScalar(w.knock * 3), fighter.id, fighter.weapon);
  else if (res.prop) propHit(res.prop, res.j, d.clone().multiplyScalar(2), 0, fighter.id);
  tracer(m, end, fighter.weapon);
  spark(end);
  send({ t: 'shot', s: [m.x, m.y, m.z, end.x, end.y, end.z].map(round2), w: fighter.weapon });
  gunSfx(fighter.weapon, m);
  muzzleFlash(m, fighter.weapon);
}

// ---------- grappling hook ----------

/**
 * Shoot a rope. Fighter or prop: yank it toward you. Wall or floor: zip yourself to it.
 */
function fireGrapple(fighter, w) {
  const m = muzzle(fighter),
    d = fighter.aim.clone(),
    res = raycast(m, d, w.maxDist, fighter),
    end = m.clone().addScaledVector(d, res.t);
  const toMe = (p) => TMP.subVectors(fighter.pos[PELV], p).normalize().clone();
  if (res.body) {
    const imp = toMe(res.body.pos[PELV])
      .multiplyScalar(15)
      .add(new V3(0, 5, 0));
    dealHit(res.body, res.j, w.dmg, imp, fighter.id, fighter.weapon);
  } else if (res.prop) {
    const imp = toMe(res.prop.c)
      .multiplyScalar(14)
      .add(new V3(0, 5, 0));
    propHit(res.prop, res.j, imp, 0, fighter.id);
  } else if (res.t < w.maxDist) {
    // hooked the world: pull ourselves along the rope
    const pull = new V3().subVectors(end, fighter.pos[PELV]).normalize();
    for (let i = 0; i < N; i++) addVel(fighter, i, pull.x * 16, pull.y * 16 + 4, pull.z * 16);
    fighter.ground = 0;
  }
  tracer(m, end, 'grapple');
  if (res.t < w.maxDist) spark(end);
  send({ t: 'shot', s: [m.x, m.y, m.z, end.x, end.y, end.z].map(round2), w: 'grapple' });
  gunSfx('grapple', m);
}

// ---------- sledgehammer ----------

const POUND_RADIUS = 2.8;

/** Shockwave from a sledgehammer slam: knocks back everyone nearby except the swinger (and `skip`). */
export function shockwave(fighter, at, skip) {
  for (const o of bodies.values()) {
    if (o === fighter || o === skip || o.dead) continue;
    const d = o.pos[PELV].distanceTo(at);
    if (d > POUND_RADIUS) continue;
    const f = 1 - d / POUND_RADIUS;
    const imp = TMP.subVectors(o.pos[PELV], at)
      .setY(0)
      .normalize()
      .multiplyScalar(9 * f)
      .clone();
    imp.y = 7 * f;
    dealHit(o, PELV, 14 * f, imp, fighter.id, 'sledge');
  }
  for (const pr of props.values()) {
    if (pr.dead) continue;
    const d = pr.c.distanceTo(at);
    if (d > POUND_RADIUS) continue;
    const f = 1 - d / POUND_RADIUS;
    const imp = TMP.subVectors(pr.c, at)
      .setY(0)
      .normalize()
      .multiplyScalar(8 * f)
      .clone();
    imp.y = 8 * f;
    propHit(pr, 0, imp, 10 * f, fighter.id, true);
  }
  shareFx('pound', at);
}

/** Comic word over a melee hit for weapons that have one (the slap glove). */
export function hitWord(w, p) {
  if (w.word === 'slap') shareFx('slap', p);
}

// ---------- the minigun ----------

/** Minigun spin-up: returns true once the barrels are spinning fast enough to fire. */
export function spinUp(fighter, w, dt) {
  if (fighter.ctrl.fire && fighter.stun <= 0) {
    if (fighter.spinT === 0) sfx(180, w.spin, 'sawtooth', 0.035 * volAt(fighter.pos[PELV]));
    fighter.spinT = Math.min(w.spin, fighter.spinT + dt);
  } else fighter.spinT = Math.max(0, fighter.spinT - dt * 0.8);
  return fighter.spinT >= w.spin;
}

// ---------- what everyone sees ----------

const lastSound = {}; // so auto weapons don't stack their sounds 12 times a second

function soundEvery(k, sec, play) {
  const t = performance.now();
  if (t - (lastSound[k] || 0) < sec * 1000) return;
  lastSound[k] = t;
  play();
}

/** Draw a weapon effect at p (d = direction). Called locally and for 'wfx' messages. */
export function weaponFx(k, p, d) {
  const v = volAt(p);
  if (k === 'flame') {
    for (let i = 0; i < 4; i++) {
      const sp = d
        .clone()
        .multiplyScalar(7 + Math.random() * 3)
        .add(new V3((Math.random() - 0.5) * 2, Math.random() * 0.8, (Math.random() - 0.5) * 2));
      streak(p, sp, 0.32, i % 2 ? 0xff8a2a : 0xffd04a, 0.55 + Math.random() * 0.2, true, 3);
    }
    soundEvery('flame', 0.16, () => noise(0.2, 0.14 * v, 600));
  } else if (k === 'blower') {
    for (let i = 0; i < 3; i++) {
      const sp = d
        .clone()
        .multiplyScalar(9 + Math.random() * 3)
        .add(new V3((Math.random() - 0.5) * 2.5, Math.random() * 0.6, (Math.random() - 0.5) * 2.5));
      streak(p, sp, 0.14, i ? 0xf2f2f2 : 0x9acd5a, 0.6, false, 3);
    }
    soundEvery('blower', 0.2, () => noise(0.24, 0.08 * v, 3200));
  } else if (k === 'gravglove') {
    glow(p, 1.4, 0xb57cff, 0.3, 1.5);
    for (let i = 0; i < 8; i++) {
      const sp = d
        .clone()
        .multiplyScalar(10)
        .add(new V3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4));
      streak(p, sp, 0.22, 0xc9a0ff, 0.5, true, 2);
    }
    sfx(120, 0.35, 'sine', 0.16 * v);
    sfx(480, 0.25, 'triangle', 0.06 * v);
  } else if (k === 'pound') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      streak(p, new V3(Math.cos(a) * 6, 0.6, Math.sin(a) * 6), 0.3, 0xc9b9a0, 0.6, false, 2);
    }
    glow(p, 2, 0xfff0c0, 0.15, 1);
    noise(0.4, 0.35 * v, 250);
    sfx(55, 0.4, 'sine', 0.3 * v);
    const me = localPlayer();
    if (me && me.pos[PELV].distanceTo(p) < 10) game.shake = Math.max(game.shake, 0.6);
  } else if (k === 'slap') {
    comicBurst(p, 'slap');
    noise(0.08, 0.3 * v, 4000);
    sfx(900, 0.06, 'square', 0.08 * v);
  } else if (k === 'splat') {
    for (let i = 0; i < 8; i++)
      streak(
        p,
        new V3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4),
        0.18,
        0xfffaf0,
        0.5,
        false,
        1.5
      );
    sfx(200, 0.12, 'sine', 0.12 * v);
    noise(0.12, 0.15 * v, 900);
  } else if (k === 'spring') {
    puff(p, 0.4, 0xdddddd, 0.6);
    sfx(300, 0.25, 'sine', 0.14 * v);
    sfx(900, 0.2, 'triangle', 0.06 * v);
  } else if (k === 'slip') {
    sfx(1400, 0.18, 'sine', 0.1 * v);
    sfx(700, 0.25, 'sine', 0.08 * v);
  }
}
