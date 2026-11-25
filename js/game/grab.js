/**
 * Grabbing: hands latching onto fighters, props or ledges, lifting, throwing, tethers that pull held things
 * along, and struggling free.
 */
import { game } from '../core/state.js';
import { sfx, volAt } from '../audio/sfx.js';
import { V3, clamp, now, round2 } from '../core/util.js';
import { CP, bodies } from './bodies.js';
import { flashMsg } from './combat.js';
import { FRONT, HEAD, LHAND, LSH, N, NECK, PELV, RAD, RHAND, RSH, UPPER } from './constants.js';
import { addVel } from './physics.js';
import { props } from './props.js';
import { send } from '../net/network.js';
import { BOXES } from '../world/world.js';

/** While grab is held, latch each free hand onto the nearest fighter, prop or ledge. */
export function tryGrab(fighter) {
  if (fighter.dead || fighter.stun > 0) {
    dropHolds(fighter, false);
    fighter.grabs[0] = fighter.grabs[1] = null;
    return;
  }
  if (!fighter.ctrl.grab) {
    dropHolds(fighter, true);
    fighter.grabs[0] = fighter.grabs[1] = null;
    return;
  }
  for (let gi = 0; gi < 2; gi++) {
    if (fighter.grabs[gi] || fighter.hold[gi]) continue;
    const ph = fighter.pos[gi ? RHAND : LHAND];
    // fighters first, then props, then ledges
    let got = null;
    for (const o of bodies.values()) {
      if (
        o === fighter ||
        o.prot > 0 ||
        o.pos[PELV].distanceTo(ph) > 2.5 ||
        (fighter.escaped && fighter.escaped.id === o.id && now() - fighter.escaped.t < 2500)
      )
        continue;
      for (let j = 0; j < N; j++)
        if (o.pos[j].distanceTo(ph) < RAD[LHAND] + RAD[j] + 0.1) {
          got = { k: 'b', id: o.id, j };
          break;
        }
      if (got) break;
    }
    if (!got)
      for (const pr of props.values()) {
        if (pr.dead || pr.c.distanceTo(ph) > 1.8) continue;
        for (let j = 0; j < pr.pos.length; j++)
          if (pr.pos[j].distanceTo(ph) < RAD[LHAND] + pr.rad[j] + 0.1) {
            got = { k: 'p', id: pr.id, j };
            break;
          }
        if (got) break;
      }
    if (got) {
      fighter.hold[gi] = got;
      if (!fighter.hold[1 - gi]) fighter.holdT = 0;
      fighter.emoteT = 0;
      sfx(330, 0.08, 'sine', 0.06 * volAt(ph));
      continue;
    }
    for (const b of BOXES) {
      CP.set(clamp(ph.x, b.min.x, b.max.x), clamp(ph.y, b.min.y, b.max.y), clamp(ph.z, b.min.z, b.max.z));
      if (CP.distanceTo(ph) < RAD[LHAND] + 0.1) {
        fighter.grabs[gi] = ph.clone();
        break;
      }
    }
  }
}

// while grab is held, hands reach for the nearest fighter or prop in front of us (any height)
export function grabReach(r, ch) {
  let best = null,
    bd = 1.9;
  const f = r.fwd;
  const consider = (p) => {
    const dx = p.x - ch.x,
      dz = p.z - ch.z,
      d = Math.hypot(dx, dz, (p.y - ch.y) * 0.6);
    if (d >= bd) return;
    if (d > 0.3 && (dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1) < 0.2) return;
    bd = d;
    best = p;
  };
  for (const o of bodies.values()) {
    if (o === r || o.prot > 0 || o.pos[PELV].distanceTo(ch) > 3) continue;
    for (const j of [FRONT, NECK, PELV, LSH, RSH, HEAD]) consider(o.pos[j]);
  }
  for (const pr of props.values()) {
    if (pr.dead || pr.c.distanceTo(ch) > 3) continue;
    consider(pr.c);
  }
  return best;
}

export function holdTarget(h) {
  return h.k === 'p' ? props.get(h.id) : bodies.get(h.id);
}

// let go: throw what we're holding (or just drop it)
/** Let go of whatever this fighter holds. With doThrow, fling it where the fighter is aiming. */
export function dropHolds(fighter, doThrow, onlyId) {
  if (onlyId && !doThrow) fighter.escaped = { id: onlyId, t: now() }; // they broke free: no instant re-grab
  for (let gi = 0; gi < 2; gi++) {
    const h = fighter.hold[gi];
    if (!h || (onlyId && h.id !== onlyId)) continue;
    fighter.hold[gi] = null;
    game.tethers = game.tethers.filter(
      (t) => !(t.H === fighter && t.T.id === h.id && t.hand === (gi ? RHAND : LHAND))
    ); // cut it now, not next frame
    if (!doThrow) continue;
    if (fighter.hold.some((x) => x && x.id === h.id)) continue; // the other hand still holds it
    const T = holdTarget(h);
    if (!T) continue;
    const hv = fighter.vel[gi ? RHAND : LHAND].clone();
    if (hv.length() > 12) hv.setLength(12);
    const lifted = fighter.ctrl.jump,
      v = hv.addScaledVector(fighter.aim, lifted ? 9 : 7).add(new V3(0, lifted ? 5.5 : 4, 0));
    throwTarget(T, h.k, v, fighter.id);
    sfx(240, 0.18, 'triangle', 0.08 * volAt(fighter.pos[PELV]));
  }
}

/** Throw a held fighter or prop (or ask its owner to, if it is not ours). */
export function throwTarget(T, k, v, by) {
  if (!T.local) {
    send({ t: 'throw', id: T.id, k, v: [round2(v.x), round2(v.y), round2(v.z)], by });
    return;
  }
  game.tethers = game.tethers.filter((t) => t.T !== T);
  // the thrower's next pose update may still say "holding" - forget that now
  const H = by && bodies.get(by);
  if (H && H.holdRemote) H.holdRemote = H.holdRemote.map((x) => (x && x.id === T.id ? null : x));
  if (H) ((H.ignoreHoldOf = T.id), (H.ignoreHoldT = now()));
  const s = k === 'p' ? Math.min(1.6, 0.8 + T.w * 0.25) : 1;
  for (let i = 0; i < T.pos.length; i++) addVel(T, i, v.x * s, v.y * s, v.z * s);
  if (k === 'b') {
    T.stun = Math.max(T.stun, 0.9);
    if (by && by !== T.id) {
      T.lastHitBy = by;
      T.lastHitT = now();
      T.lastHitW = 'throw';
    }
  } else if (by) T.lastHitBy = by;
}

// tethers: a holder's hand and the held point pull toward each other; each side's owner applies its half
game.tethers = [];

export function buildTethers() {
  game.tethers = [];
  for (const b of bodies.values()) b.heldBy = null;
  for (const H of bodies.values()) {
    const hs = H.local ? H.hold : H.holdRemote;
    if (!hs) continue;
    for (let hi = 0; hi < 2; hi++) {
      const h = hs[hi];
      if (!h) continue;
      const T = holdTarget(h);
      if (!T || T === H || h.j >= T.pos.length || (h.k === 'p' && T.dead)) continue;
      game.tethers.push({ H, hand: hi ? RHAND : LHAND, T, j: h.j, prop: h.k === 'p' });
      if (h.k === 'b') T.heldBy = H;
    }
  }
}

export function applyTethers() {
  for (const t of game.tethers) {
    const hp = t.H.pos[t.hand],
      tp = t.T.pos[t.j],
      hv = t.H.vel[t.hand],
      tv = t.T.vel[t.j];
    const dx = hp.x - tp.x,
      dy = hp.y - tp.y,
      dz = hp.z - tp.z;
    if (t.T.local) {
      const k = t.prop ? 380 : 320,
        c = t.prop ? 14 : 16,
        a = t.T.acc[t.j];
      a.x += dx * k - (tv.x - hv.x) * c;
      a.y += dy * k - (tv.y - hv.y) * c;
      a.z += dz * k - (tv.z - hv.z) * c;
      if (!t.prop) {
        t.T.heldT = 0.2;
        for (const i of UPPER)
          if (i !== t.j) {
            const q = t.T.acc[i];
            q.x += dx * k * 0.22;
            q.y += dy * k * 0.22;
            q.z += dz * k * 0.22;
          }
      }
    }
    if (t.H.local) {
      const k = t.prop ? 90 : 160,
        c = 10,
        a = t.H.acc[t.hand];
      a.x -= dx * k + (hv.x - tv.x) * c;
      a.y -= dy * k + (hv.y - tv.y) * c;
      a.z -= dz * k + (hv.z - tv.z) * c;
    }
  }
}

/** A grabbed fighter mashed enough: break the grip and shove away. */
export function breakFree(fighter) {
  const H = fighter.heldBy;
  fighter.struggle = 0;
  if (!H) return;
  game.tethers = game.tethers.filter((t) => t.T !== fighter);
  flashMsg(fighter, 'BROKE FREE!');
  sfx(700, 0.15, 'square', 0.08);
  for (let i = 0; i < N; i++)
    addVel(
      fighter,
      i,
      (fighter.pos[PELV].x - H.pos[PELV].x) * 2,
      2,
      (fighter.pos[PELV].z - H.pos[PELV].z) * 2
    );
  if (H.local) dropHolds(H, false, fighter.id);
  else send({ t: 'free', h: H.id, v: fighter.id });
}
