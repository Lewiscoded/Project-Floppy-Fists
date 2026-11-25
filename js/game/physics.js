/**
 * Ragdoll physics: muscle springs that keep fighters standing and walking, verlet integration,
 * constraint solving, world/fighter collisions, emotes, and step() which advances one 1/120 s physics tick.
 */
import { sfx } from '../audio/sfx.js';
import { clamp, now } from '../core/util.js';
import { CP, F, MID, TMP, TMP2, bodies, localBodies } from './bodies.js';
import { checkMelee, kill } from './combat.js';
import {
  CONS,
  DAMP,
  DT,
  FRONT,
  G,
  HEAD,
  ITER,
  LFOOT,
  LHAND,
  LHIP,
  LKNEE,
  LSH,
  N,
  NECK,
  PARTICLE_MASS,
  PELV,
  RAD,
  RFOOT,
  RHAND,
  RHIP,
  RKNEE,
  RSH,
  UPPER,
} from './constants.js';
import { applyTethers, grabReach, tryGrab } from './grab.js';
import {
  collideBodyProp,
  collidePropProp,
  localProps,
  propIntegrate,
  propSolve,
  propStepForces,
  propWorld,
  props,
} from './props.js';
import { holdFrozenShape } from './status.js';
import { WEAPONS, isAimed } from './weapons.js';
import { gadgetContacts, gadgetForces, gadgets } from '../sandbox/gadgets.js';
import { BOXES } from '../world/world.js';

/** Muscle spring: pull particle i of a fighter toward a target offset from a reference particle. */
function spring(fighter, i, tx, ty, tz, k, c, mask = 7, ref = PELV) {
  const p = fighter.pos[i],
    v = fighter.vel[i],
    rv = fighter.vel[ref];
  F.set(
    (tx - p.x) * k - (v.x - rv.x) * c,
    (ty - p.y) * k - (v.y - rv.y) * c,
    (tz - p.z) * k - (v.z - rv.z) * c
  );
  if (!(mask & 1)) F.x = 0;
  if (!(mask & 2)) F.y = 0;
  if (!(mask & 4)) F.z = 0;
  fighter.acc[i].add(F);
  return F;
}

export function computeFacing(fighter) {
  const p = fighter.pos;
  MID.addVectors(p[NECK], p[PELV]).multiplyScalar(0.5);
  fighter.f3.subVectors(p[FRONT], MID);
  if (fighter.f3.lengthSq() < 1e-6) fighter.f3.copy(fighter.fwd);
  fighter.f3.normalize();
  fighter.fwd.set(fighter.f3.x, 0, fighter.f3.z);
  if (fighter.fwd.lengthSq() < 1e-4) fighter.fwd.copy(fighter.wantFwd);
  fighter.fwd.normalize();
}

/** Apply gravity, walking, jumping, balance and arm-aim "muscles" to one fighter. */
function forces(fighter) {
  const p = fighter.pos,
    v = fighter.vel,
    a = fighter.acc,
    c = fighter.ctrl;
  for (let i = 0; i < N; i++) a[i].set(0, -G, 0);
  computeFacing(fighter);
  if (fighter.stun > 0) {
    fighter.jumpEdge = false;
    return;
  }
  let mx = c.mx,
    mz = c.mz;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) {
    mx /= ml;
    mz /= ml;
  }
  const moving = ml > 0.15;
  fighter.moving = moving;
  TMP.set(fighter.aim.x, 0, fighter.aim.z);
  if (TMP.lengthSq() > 1e-4) fighter.wantFwd.copy(TMP.normalize());
  else if (moving) fighter.wantFwd.set(mx, 0, mz).normalize();
  const held = fighter.heldT > 0,
    holding = fighter.hold.some(Boolean);
  const g = fighter.ground > 0 && !held,
    hanging = fighter.grabs.some((q) => q),
    up = g ? 1 : held ? 0.25 : 0.45;
  const z = fighter.size; // 1 normally, smaller when shrunk: every body measurement below scales with it
  if (g) {
    const err = fighter.groundY + 0.88 * z - p[PELV].y,
      ay = clamp(G * 0.92 + err * 140 - v[PELV].y * 12, 0, G * 3);
    for (const i of UPPER) a[i].y += ay;
  }
  spring(fighter, HEAD, p[PELV].x, p[PELV].y + 0.9 * z, p[PELV].z, 160 * up, 12);
  a[PELV].x -= F.x;
  a[PELV].z -= F.z;
  spring(fighter, NECK, p[PELV].x, p[PELV].y + 0.54 * z, p[PELV].z, 110 * up, 10);
  a[PELV].x -= F.x;
  a[PELV].z -= F.z;
  const d = fighter.wantFwd,
    sx = d.z * z,
    sz = -d.x * z;
  spring(fighter, FRONT, MID.x + d.x * 0.22 * z, 0, MID.z + d.z * 0.22 * z, 90, 8, 5);
  spring(fighter, RSH, p[NECK].x + sx * 0.3, 0, p[NECK].z + sz * 0.3, 60, 6, 5);
  spring(fighter, LSH, p[NECK].x - sx * 0.3, 0, p[NECK].z - sz * 0.3, 60, 6, 5);
  spring(fighter, RHIP, p[PELV].x + sx * 0.16, 0, p[PELV].z + sz * 0.16, 40, 5, 5);
  spring(fighter, LHIP, p[PELV].x - sx * 0.16, 0, p[PELV].z - sz * 0.16, 40, 5, 5);
  const spd = fighter.blocking ? 2.1 : holding ? 3.1 : 3.9,
    kk = g ? 9 : held ? 1 : 2.2;
  if (g || moving) {
    const ax = clamp((mx * spd - v[PELV].x) * kk, -40, 40),
      az = clamp((mz * spd - v[PELV].z) * kk, -40, 40);
    for (const i of UPPER) {
      a[i].x += ax;
      a[i].z += az;
    }
  }
  if (g) {
    if (moving) fighter.phase += DT * 10;
    const dx = moving ? mx / Math.max(ml, 1e-3) : 0,
      dz = moving ? mz / Math.max(ml, 1e-3) : 0;
    for (const s of [-1, 1]) {
      const foot = s < 0 ? LFOOT : RFOOT,
        knee = s < 0 ? LKNEE : RKNEE,
        ph = fighter.phase + (s > 0 ? Math.PI : 0);
      const sw = moving ? Math.sin(ph) * 0.32 * z : 0,
        lift = moving ? Math.max(0, Math.cos(ph)) * 0.24 * z : 0;
      spring(
        fighter,
        foot,
        p[PELV].x + sx * s * 0.17 + dx * sw,
        fighter.groundY + 0.12 * z + lift,
        p[PELV].z + sz * s * 0.17 + dz * sw,
        moving ? 240 : 100,
        14
      );
      a[knee].x += fighter.fwd.x * 5;
      a[knee].z += fighter.fwd.z * 5;
    }
  } else if (hanging && c.jump) {
    const hp = fighter.grabs[0] || fighter.grabs[1];
    for (const i of UPPER) {
      a[i].y += 34;
      a[i].x += (hp.x - p[PELV].x) * 5;
      a[i].z += (hp.z - p[PELV].z) * 5;
    }
  }
  if (fighter.jumpEdge) {
    fighter.jumpEdge = false;
    if (g && !hanging && !holding && fighter.jumpCd <= 0) {
      for (let i = 0; i < N; i++) {
        fighter.prev[i].y = p[i].y - 7.4 * DT;
        fighter.prev[i].x -= mx * 1.2 * DT;
        fighter.prev[i].z -= mz * 1.2 * DT;
      }
      fighter.jumpCd = 0.45;
      fighter.ground = 0;
      sfx(260, 0.15, 'sine', 0.05);
    }
  }
  // ---- arms ----
  if (fighter.emoteT > 0) {
    emoteArms(fighter);
    return;
  }
  const ch = TMP2.addVectors(p[LSH], p[RSH]).multiplyScalar(0.5),
    f = fighter.fwd,
    A = fighter.aim,
    w = WEAPONS[fighter.weapon];
  let ledge = null;
  if (c.grab && !g) {
    let bd = 1.6;
    for (const b of BOXES) {
      CP.set(clamp(ch.x, b.min.x, b.max.x), b.max.y, clamp(ch.z, b.min.z, b.max.z));
      const dd = CP.distanceTo(ch);
      if (dd < bd) {
        bd = dd;
        ledge = CP.clone();
      }
    }
  }
  for (const s of [-1, 1]) {
    const hand = s < 0 ? LHAND : RHAND,
      sh = s < 0 ? LSH : RSH,
      gi = s < 0 ? 0 : 1;
    if (ledge && !fighter.grabs[gi]) {
      spring(fighter, hand, ledge.x + sx * s * 0.2, ledge.y + 0.02, ledge.z + sz * s * 0.2, 320, 18, 7, NECK);
      continue;
    }
    if (c.grab) {
      const lift = holding && c.jump;
      const tgt = !holding && !fighter.hold[gi] ? grabReach(fighter, ch) : null;
      if (tgt) spring(fighter, hand, tgt.x + sx * s * 0.12, tgt.y, tgt.z + sz * s * 0.12, 260, 18, 7, NECK);
      else
        spring(
          fighter,
          hand,
          ch.x + f.x * (lift ? 0.3 : 0.75) + sx * s * 0.22,
          ch.y - 0.05 + (lift ? 0.9 : 0),
          ch.z + f.z * (lift ? 0.3 : 0.75) + sz * s * 0.22,
          lift ? 320 : 170,
          16,
          7,
          NECK
        );
      if (fighter.grabs[gi])
        for (const i of [NECK, LSH, RSH, FRONT]) {
          a[i].x -= F.x * 0.15;
          a[i].y -= F.y * 0.15;
          a[i].z -= F.z * 0.15;
        }
      continue;
    }
    if (w.kind === 'melee' && fighter.blocking) {
      spring(
        fighter,
        hand,
        ch.x + A.x * 0.42 + sx * s * 0.13,
        ch.y + 0.32,
        ch.z + A.z * 0.42 + sz * s * 0.13,
        280,
        20,
        7,
        NECK
      );
    } else if (w.kind === 'melee') {
      if (fighter.punchT > 0.15 && fighter.punchHand === s) {
        const hi = fighter.weapon === 'fists' ? 0.03 : w.pound ? -0.85 : 0.25; // the sledgehammer slams down
        spring(
          fighter,
          hand,
          ch.x + A.x * 1.05 + sx * s * 0.06,
          ch.y + A.y * 0.8 + hi,
          ch.z + A.z * 1.05 + sz * s * 0.06,
          1600,
          34,
          7,
          NECK
        );
      } else
        spring(
          fighter,
          hand,
          ch.x + f.x * 0.35 + sx * s * 0.22,
          ch.y - 0.05 + (s > 0 && fighter.weapon !== 'fists' ? 0.15 : 0),
          ch.z + f.z * 0.35 + sz * s * 0.22,
          50,
          6,
          7,
          NECK
        );
    } else if (isAimed(w)) {
      const back = fighter.recoilT > 0 ? -0.22 : 0,
        rk = w.kind === 'rocket' ? 0.14 : 0;
      if (s > 0)
        spring(
          fighter,
          hand,
          ch.x + A.x * (0.62 + back) + sx * 0.12,
          ch.y + A.y * 0.62 + rk,
          ch.z + A.z * (0.62 + back) + sz * 0.12,
          260,
          18,
          7,
          NECK
        );
      else if (fighter.weapon !== 'pistol')
        spring(
          fighter,
          hand,
          ch.x + A.x * (0.5 + back) - sx * 0.02,
          ch.y + A.y * 0.5 + rk - 0.03,
          ch.z + A.z * (0.5 + back) - sz * 0.02,
          220,
          16,
          7,
          NECK
        );
      else spring(fighter, hand, p[sh].x + f.x * 0.18, p[sh].y - 0.55, p[sh].z + f.z * 0.18, 30, 5, 7, NECK);
    } else {
      // grenade
      if (s > 0) {
        if (fighter.punchT > 0.15)
          spring(fighter, hand, ch.x + A.x * 0.9, ch.y + 0.35, ch.z + A.z * 0.9, 900, 30, 7, NECK);
        else
          spring(
            fighter,
            hand,
            p[RSH].x - f.x * 0.15,
            p[RSH].y + 0.25,
            p[RSH].z - f.z * 0.15,
            120,
            12,
            7,
            NECK
          );
      } else
        spring(
          fighter,
          hand,
          ch.x + f.x * 0.35 - sx * 0.22,
          ch.y - 0.05,
          ch.z + f.z * 0.35 - sz * 0.22,
          50,
          6,
          7,
          NECK
        );
    }
  }
}

function emoteArms(fighter) {
  const p = fighter.pos,
    t = now() / 1000,
    f = fighter.fwd,
    sx = f.z,
    sz = -f.x;
  if (fighter.emote === 'wave') {
    const w = Math.sin(t * 12) * 0.22;
    spring(
      fighter,
      RHAND,
      p[RSH].x + sx * (0.25 + w),
      p[RSH].y + 0.65,
      p[RSH].z + sz * (0.25 + w),
      260,
      16,
      7,
      NECK
    );
    spring(fighter, LHAND, p[LSH].x + f.x * 0.15, p[LSH].y - 0.55, p[LSH].z + f.z * 0.15, 30, 5, 7, NECK);
  } else if (fighter.emote === 'dance') {
    const a = Math.sin(t * 9);
    spring(
      fighter,
      RHAND,
      p[RSH].x + sx * 0.2,
      p[RSH].y + 0.35 + a * 0.3,
      p[RSH].z + sz * 0.2,
      240,
      14,
      7,
      NECK
    );
    spring(
      fighter,
      LHAND,
      p[LSH].x - sx * 0.2,
      p[LSH].y + 0.35 - a * 0.3,
      p[LSH].z - sz * 0.2,
      240,
      14,
      7,
      NECK
    );
    for (const i of UPPER) fighter.acc[i].y += Math.sin(t * 18) * 12;
    fighter.acc[HEAD].x += sx * a * 28;
    fighter.acc[HEAD].z += sz * a * 28;
  } else if (fighter.emote === 'taunt') {
    for (const s of [-1, 1]) {
      const h = s < 0 ? LHAND : RHAND,
        sh = s < 0 ? LSH : RSH;
      spring(
        fighter,
        h,
        p[sh].x + sx * s * 0.6 + f.x * 0.1,
        p[sh].y + 0.05,
        p[sh].z + sz * s * 0.6 + f.z * 0.1,
        240,
        14,
        7,
        NECK
      );
    }
    fighter.acc[HEAD].y += Math.sin(t * 14) * 30;
  }
}

export function startEmote(fighter, k) {
  if (!fighter || fighter.dead) return;
  if (k === 'flop') {
    fighter.stun = Math.max(fighter.stun, 1.8);
    fighter.emoteT = 0;
    for (let i = 0; i < N; i++) addVel(fighter, i, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2);
    return;
  }
  fighter.emote = k;
  fighter.emoteT = 2.6;
}

/** Verlet integration: move every particle by its velocity (pos - prev) plus acceleration. */
function integrate(fighter) {
  for (let i = 0; i < N; i++) {
    const p = fighter.pos[i],
      q = fighter.prev[i];
    let vx = (p.x - q.x) * DAMP,
      vy = (p.y - q.y) * DAMP,
      vz = (p.z - q.z) * DAMP;
    const l = Math.hypot(vx, vy, vz);
    if (l > 0.5) {
      vx *= 0.5 / l;
      vy *= 0.5 / l;
      vz *= 0.5 / l;
    }
    q.copy(p);
    p.x += vx + fighter.acc[i].x * DT * DT;
    p.y += vy + fighter.acc[i].y * DT * DT;
    p.z += vz + fighter.acc[i].z * DT * DT;
  }
}

/** Keep the ragdoll in one piece by restoring every stick constraint to its rest length. */
function solveCons(fighter) {
  const p = fighter.pos;
  if (fighter.frozenPose) {
    holdFrozenShape(fighter); // frozen: the whole body moves as one ice block
    return;
  }
  const z = fighter.size;
  for (const [a, b, r0] of CONS) {
    const rest = r0 * z;
    const pa = p[a],
      pb = p[b],
      dx = pb.x - pa.x,
      dy = pb.y - pa.y,
      dz = pb.z - pa.z,
      d = Math.hypot(dx, dy, dz) || 1e-6,
      k = (d - rest) / (d * (PARTICLE_MASS[a] + PARTICLE_MASS[b]));
    pa.x += dx * k * PARTICLE_MASS[a];
    pa.y += dy * k * PARTICLE_MASS[a];
    pa.z += dz * k * PARTICLE_MASS[a];
    pb.x -= dx * k * PARTICLE_MASS[b];
    pb.y -= dy * k * PARTICLE_MASS[b];
    pb.z -= dz * k * PARTICLE_MASS[b];
  }
  for (let gi = 0; gi < 2; gi++) if (fighter.grabs[gi]) p[gi ? RHAND : LHAND].copy(fighter.grabs[gi]);
}

/** Push a fighter's particles out of map boxes and record whether it is standing on ground. */
function collideWorld(fighter, final) {
  for (let i = 0; i < N; i++) {
    const p = fighter.pos[i],
      rad = RAD[i] * fighter.size;
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
        d = Math.hypot(nx, ny, nz),
        pen;
      if (d < 1e-6) {
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
        nx /= d;
        ny /= d;
        nz /= d;
        pen = rad - d;
        if (pen <= 0) continue;
      }
      p.x += nx * pen;
      p.y += ny * pen;
      p.z += nz * pen;
      if (final) {
        const q = fighter.prev[i],
          vx = p.x - q.x,
          vy = p.y - q.y,
          vz = p.z - q.z,
          vn = vx * nx + vy * ny + vz * nz;
        const fr = fighter.frozenPose
            ? 0.01
            : i === LFOOT || i === RFOOT
              ? fighter.moving
                ? 0.25
                : 0.6
              : 0.35,
          k = 1 - fr,
          vnn = vn < 0 ? 0 : vn;
        q.set(
          p.x - (nx * vnn + (vx - nx * vn) * k),
          p.y - (ny * vnn + (vy - ny * vn) * k),
          p.z - (nz * vnn + (vz - nz * vn) * k)
        );
        if (ny > 0.6) {
          fighter.ground = 0.12;
          fighter.groundY = b.max.y;
        }
      }
    }
  }
}

/** Push two overlapping fighters apart. */
function collidePair(a, fighter, both) {
  if (a.pos[PELV].distanceToSquared(fighter.pos[PELV]) > 9) return;
  for (let i = 0; i < N; i++) {
    const pi = a.pos[i];
    for (let j = 0; j < N; j++) {
      const pj = fighter.pos[j],
        rr = RAD[i] * a.size + RAD[j] * fighter.size,
        dx = pj.x - pi.x,
        dy = pj.y - pi.y,
        dz = pj.z - pi.z,
        d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6,
        k = ((rr - d) / d) * (both ? 0.5 : 1);
      pi.x -= dx * k;
      pi.y -= dy * k;
      pi.z -= dz * k;
      if (both) {
        pj.x += dx * k;
        pj.y += dy * k;
        pj.z += dz * k;
      }
    }
  }
}

export const addVel = (o, i, x, y, z) => {
  const q = o.prev[i];
  q.x -= x * DT;
  q.y -= y * DT;
  q.z -= z * DT;
};

/** Advance physics by one fixed 1/120 s tick: forces, integration, constraints, collisions, grabs, melee. */
export function step() {
  const L = localBodies();
  const all = [...bodies.values()],
    LP = localProps(),
    AP = [...props.values()];
  for (const r of L) {
    for (let i = 0; i < N; i++) r.vel[i].subVectors(r.pos[i], r.prev[i]).divideScalar(DT);
    forces(r);
  }
  for (const pr of LP) propStepForces(pr);
  if (gadgets.size) gadgetForces(L, LP);
  applyTethers();
  for (const r of L) integrate(r);
  for (const pr of LP) if (!pr.dead) propIntegrate(pr);
  for (let it = 0; it < ITER; it++) {
    for (const r of L) solveCons(r);
    for (const pr of LP) if (!pr.dead) propSolve(pr);
    if (it === ITER - 3) {
      for (const r of L) collideWorld(r, false);
      for (const pr of LP) if (!pr.dead) propWorld(pr, false);
      for (let a = 0; a < L.length; a++) {
        for (let b = a + 1; b < L.length; b++) collidePair(L[a], L[b], true);
        for (const o of all) if (!o.local) collidePair(L[a], o, false);
      }
      for (const b of all)
        for (const pr of AP) if (b.local || pr.local) collideBodyProp(b, pr, b.local, pr.local);
      for (let a = 0; a < LP.length; a++)
        for (let c = a + 1; c < LP.length; c++) collidePropProp(LP[a], LP[c]);
    }
  }
  for (const pr of LP) if (!pr.dead) propWorld(pr, true);
  for (const r of L) {
    r.ground -= DT;
    collideWorld(r, true);
  }
  if (gadgets.size) gadgetContacts(L, LP);
  for (const r of L) {
    for (let gi = 0; gi < 2; gi++)
      if (r.grabs[gi]) {
        const h = gi ? RHAND : LHAND;
        r.pos[h].copy(r.grabs[gi]);
        r.prev[h].copy(r.grabs[gi]);
      }
    checkMelee(r);
    tryGrab(r);
    r.punchT -= DT;
    r.jumpCd -= DT;
    r.stun -= DT;
    if (!r.dead && r.pos[PELV].y < -14) {
      const credit = now() - r.lastHitT < 7000 ? r.lastHitBy : null;
      kill(r, credit, credit ? r.lastHitW || 'fall' : 'gravity', true);
    }
    if (r.pos[PELV].y < -60)
      for (let i = 0; i < N; i++) {
        r.pos[i].y = -60;
        r.prev[i].copy(r.pos[i]);
      }
  }
}
