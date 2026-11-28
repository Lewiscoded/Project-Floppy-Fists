/**
 * Attacks and damage: firing weapons, melee swings with block/parry, hitscan raycasts, applying hits,
 * kills and kill credit, plus floating messages over fighters.
 * Newer weapon kinds (cone, beam, grapple) fire from weapon-kinds.js; traps live in traps.js.
 */
import { game } from '../core/state.js';
import { noise, sfx, volAt } from '../audio/sfx.js';
import { V3, clamp, escapeHtml, now, round2, toCssHex } from '../core/util.js';
import { TMP, bodies } from './bodies.js';
import { HEAD, LELB, LFOOT, LHAND, N, PELV, RAD, RELB, RFOOT, RHAND } from './constants.js';
import { addVel } from './physics.js';
import { spawnProj } from './projectiles.js';
import { propHit, props } from './props.js';
import { SHRUNK_KNOCK, applyStatus } from './status.js';
import { limitTraps } from './traps.js';
import { FIRE_KINDS, hitWord, shockwave, spinUp } from './weapon-kinds.js';
import { WEAPONS } from './weapons.js';
import { headScale, hitDamage, knockMul } from './world-controls.js';
import { net, send } from '../net/network.js';
import { muzzleFlash, puff, spark, tracer } from '../render/fx.js';
import { feed } from '../ui/menu.js';
import { comicBurst, dmgDir, showHitFeedback } from '../ui/overlay.js';
import { BOXES, wName } from '../world/world.js';

export function checkMelee(fighter) {
  const w = WEAPONS[fighter.weapon];
  if (w.kind !== 'melee' || !(fighter.punchT > 0.15) || fighter.punchHit) return;
  const h = fighter.punchHand < 0 ? LHAND : RHAND,
    ph = fighter.pos[h],
    vh = fighter.vel[h];
  const dir = TMP.subVectors(ph, fighter.pos[h === LHAND ? LELB : RELB]).normalize();
  const pts = [ph.clone()];
  if (w.reach) {
    pts.push(ph.clone().addScaledVector(dir, w.reach * 0.5), ph.clone().addScaledVector(dir, w.reach));
  }
  for (const o of bodies.values()) {
    if (o === fighter || o.dead) continue;
    if (o.pos[PELV].distanceTo(ph) > 3 + (w.reach || 0)) continue;
    for (let j = 0; j < N; j++) {
      const rr = RAD[j] * o.size * (j === HEAD ? headScale() : 1) + (w.reach ? 0.12 : RAD[h]) + 0.05;
      if (!pts.some((q) => q.distanceToSquared(o.pos[j]) < rr * rr)) continue;
      const rx = vh.x - o.vel[j].x,
        ry = vh.y - o.vel[j].y,
        rz = vh.z - o.vel[j].z,
        spd = Math.hypot(rx, ry, rz);
      if (spd < 2.5) continue;
      const imp = new V3(rx / spd, ry / spd + 0.3, rz / spd)
        .normalize()
        .multiplyScalar(Math.min(spd, 14) * 0.55 * w.knock);
      const dmg = w.dmg * clamp(spd / 8, 0.6, 1.3) * (j === HEAD ? 1.4 : 1);
      dealHit(o, j, dmg, imp, fighter.id, fighter.weapon);
      fighter.punchHit = true;
      sfx(fighter.weapon === 'fists' ? 170 : 110, 0.14, 'square', 0.12 * volAt(ph));
      spark(o.pos[j]);
      hitWord(w, o.pos[HEAD]);
      if (w.pound) shockwave(fighter, o.pos[j], o);
      return;
    }
  }
  for (const pr of props.values()) {
    if (pr.dead || pr.c.distanceTo(ph) > 2.4) continue;
    for (let j = 0; j < pr.pos.length; j++) {
      const rr = pr.rad[j] + (w.reach ? 0.12 : RAD[h]) + 0.05;
      if (!pts.some((q) => q.distanceToSquared(pr.pos[j]) < rr * rr)) continue;
      const rx = vh.x - pr.vel[j].x,
        ry = vh.y - pr.vel[j].y,
        rz = vh.z - pr.vel[j].z,
        spd = Math.hypot(rx, ry, rz);
      if (spd < 2.5) continue;
      const imp = new V3(rx / spd, ry / spd + 0.35, rz / spd)
        .normalize()
        .multiplyScalar(Math.min(spd, 14) * 0.6 * w.knock);
      propHit(pr, j, imp, w.dmg * 0.6, fighter.id);
      fighter.punchHit = true;
      sfx(140, 0.1, 'square', 0.08 * volAt(ph));
      spark(pr.pos[j]);
      if (w.pound) shockwave(fighter, pr.pos[j]);
      return;
    }
  }
  // sledgehammer hitting the floor
  if (w.pound) {
    const low = pts.reduce((a, q) => (q.y < a.y ? q : a));
    if (low.y < fighter.groundY + 0.3 && Math.hypot(vh.x, vh.y, vh.z) > 3) {
      fighter.punchHit = true;
      shockwave(fighter, new V3(low.x, fighter.groundY + 0.05, low.z));
    }
  }
}

/** Hit a fighter: directly if we own it, otherwise ask its owner with a 'hit' message. */
export function dealHit(o, j, dmg, imp, by, wname) {
  if (o.local) applyHit(o, j, dmg, imp, by, wname);
  else
    send({
      t: 'hit',
      id: o.id,
      j,
      d: Math.round(dmg),
      i: [+imp.x.toFixed(2), +imp.y.toFixed(2), +imp.z.toFixed(2)],
      by,
      w: wname,
    });
}

// the victim's owner reports real damage back to the attacker (for hitmarkers + stats)
export function hitNotify(v, by, dmg, hs, blocked) {
  if (!by || by === v.id) return;
  if (!blocked && dmg < 0.5) return; // pushes with no damage (leaf blower) don't flash hitmarkers
  const p = v.pos[HEAD],
    m = {
      t: 'hm',
      by,
      v: v.id,
      d: Math.round(dmg),
      hs: hs ? 1 : 0,
      pr: blocked ? 1 : 0,
      p: [round2(p.x), round2(p.y + 0.3), round2(p.z)],
    };
  const a = bodies.get(by);
  if (a && a.local) onHitMark(m);
  else send(m);
}

export function onHitMark(m) {
  const a = bodies.get(m.by);
  if (!a || !a.local) return;
  a.dmg = (a.dmg || 0) + m.d;
  if (m.hs) a.hs = (a.hs | 0) + 1;
  if (a.id === game.myBodyId) showHitFeedback(m);
}

const PARRY_MS = 220;

/** Apply damage + knockback to a fighter we own. Handles block, parry, stun and death. */
export function applyHit(other, j, dmg, imp, by, wname) {
  const w = WEAPONS[wname];
  if (other.prot > 0 && !other.dead) {
    spark(other.pos[j]);
    hitNotify(other, by, 0, false, true);
    return;
  }
  if (w && w.kind === 'melee' && other.blocking && !other.dead) {
    const att = by && bodies.get(by);
    if (att) TMP.set(att.pos[PELV].x - other.pos[PELV].x, 0, att.pos[PELV].z - other.pos[PELV].z);
    else TMP.set(-imp.x, 0, -imp.z);
    if (TMP.lengthSq() < 1e-6 || TMP.normalize().dot(other.fwd) > 0.1) {
      // hit came from the front
      if (now() - other.blockStart < PARRY_MS) {
        const p = other.pos[PELV];
        sfx(1300, 0.25, 'square', 0.12);
        sfx(1900, 0.18, 'triangle', 0.08);
        spark(other.pos[other.punchHand < 0 ? LHAND : RHAND]);
        spark(other.pos[HEAD]);
        flashMsg(other, 'PARRY!');
        const a = bodies.get(by);
        if (a && a.local) applyParried(a, p.x, p.z);
        else if (a) send({ t: 'parry', id: by, x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
        return;
      }
      other.guard -= dmg * 1.6;
      dmg *= 0.25;
      imp = imp.clone().multiplyScalar(0.3);
      sfx(220, 0.12, 'square', 0.1);
      spark(other.pos[RHAND]);
      if (other.guard <= 0) {
        other.guard = 0;
        other.guardBroken = 1.5;
        other.blocking = false;
        other.stun = Math.max(other.stun, 1);
        flashMsg(other, 'GUARD BROKEN');
        sfx(120, 0.4, 'sawtooth', 0.12);
      }
    }
  }
  imp = imp.clone().multiplyScalar(knockMul()); // world control
  if (other.size < 0.9) imp.multiplyScalar(SHRUNK_KNOCK); // shrunk fighters are light
  if (w && w.slip) slip(other, imp);
  else
    for (let i = 0; i < N; i++) {
      // most of the push goes into the part that was hit, unless the weapon pushes the whole body
      const m = w && w.uniform ? 1 : i === j ? 1.6 : 0.5;
      addVel(other, i, imp.x * m, imp.y * m, imp.z * m);
    }
  if (other.dead) return;
  if (by && by !== other.id) {
    other.lastHitBy = by;
    other.lastHitT = now();
    other.lastHitW = wname;
  }
  dmg = hitDamage(other, dmg); // one-hit KOs
  other.hp -= dmg;
  other.stun = Math.max(other.stun, imp.length() > 6 ? 0.7 : w && w.kind === 'melee' ? 0.18 : 0.05);
  if (w && w.stun) other.stun = Math.max(other.stun, w.stun);
  if (w && w.status) applyStatus(other, w.status[0], w.status[1]);
  if (other.id === game.myBodyId && dmg > 0) {
    game.hurtFlash = 0.35;
    dmgDir(by, null);
  }
  hitNotify(other, by, dmg, j === HEAD);
  if (other.hp <= 0) kill(other, by, wname);
}

/** Banana peel: feet shoot forward, head goes back. A guaranteed pratfall. */
function slip(f, imp) {
  for (const i of [LFOOT, RFOOT]) addVel(f, i, imp.x * 1.8, imp.y * 1.4, imp.z * 1.8);
  addVel(f, HEAD, -imp.x * 0.7, -2, -imp.z * 0.7);
  addVel(f, PELV, imp.x * 0.4, imp.y * 0.6, imp.z * 0.4);
}

export function applyParried(a, fx, fz) {
  // the attacker got parried: stagger them and knock them back
  TMP.set(a.pos[PELV].x - fx, 0, a.pos[PELV].z - fz);
  if (TMP.lengthSq() < 1e-6) TMP.copy(a.fwd).negate();
  TMP.normalize();
  for (let i = 0; i < N; i++) addVel(a, i, TMP.x * 5, 2.5, TMP.z * 5);
  a.stun = Math.max(a.stun, 1.1);
  for (const k in a.cds) a.cds[k] = Math.max(a.cds[k], 0.9);
  a.punchT = 0;
  flashMsg(a, 'PARRIED!');
  sfx(1300, 0.25, 'square', 0.1 * volAt(a.pos[PELV]));
}

export function flashMsg(b, t) {
  b.msg = t;
  b.msgT = 0.9;
}

export function kill(other, by, wname, fell) {
  if (other.dead) return;
  other.dead = true;
  other.hp = 0;
  other.deadT = game.match.mode === 'sb' && game.state === 'play' ? 1.5 : 3.5;
  other.stun = 1e9;
  other.deaths++;
  other.grabs = [null, null];
  other.emoteT = 0;
  if (by === other.id) by = null;
  if (fell) other.falls++;
  other.lastKiller = by;
  send({ t: 'kill', v: other.id, vn: other.name, vc: other.col, by, w: wname });
  onKill(other.id, other.name, other.col, by, wname);
}

export function onKill(vid, vname, vcol, by, wname) {
  const k = by && bodies.get(by);
  if (k && k.local) k.kills++;
  const kn = k ? `<span style="color:${toCssHex(k.col)}">${escapeHtml(k.name)}</span> ` : '';
  const wn = WEAPONS[wname] ? wName(wname) : wname;
  feed(
    by && k
      ? `${kn}<span style="opacity:.6">[${escapeHtml(wn)}]</span> <span style="color:${toCssHex(vcol)}">${escapeHtml(vname)}</span>`
      : `<span style="color:${toCssHex(vcol)}">${escapeHtml(vname)}</span> <span style="opacity:.6">was taken by ${escapeHtml(wn || 'gravity')}</span>`
  );
  if (vid !== game.myBodyId && k && k.id === game.myBodyId) sfx(660, 0.25, 'triangle', 0.12);
  // comic "POW!" over the fighter that went down
  const victim = bodies.get(vid);
  if (victim) comicBurst(victim.pos[HEAD], burstKind(by, wname));
}

/** Which comic word set fits a kill: melee, gun, boom, throw or fall. */
function burstKind(by, wname) {
  const w = WEAPONS[wname];
  if (w) {
    if (w.word) return w.word;
    if (w.cls === 'boom' || w.kind === 'boom' || wname === 'mine') return 'boom';
    if (w.cls === 'elem') return wname; // flame, freeze, shrink each have their own words
    if (w.cls === 'gun' || w.kind === 'beam') return 'gun';
    if (w.cls === 'melee') return 'melee';
    if (w.cls === 'silly') return 'silly';
    if (w.cls === 'gadget' || w.cls === 'trap') return 'throw';
    return 'throw';
  }
  if (!by) return 'fall';
  return /pad|throw/i.test(wname || '') ? 'throw' : 'melee';
}

// rays
export function rayBox(o, d, b) {
  let tmin = -1e9,
    tmax = 1e9;
  for (const ax of ['x', 'y', 'z']) {
    if (Math.abs(d[ax]) < 1e-8) {
      if (o[ax] < b.min[ax] || o[ax] > b.max[ax]) return -1;
      continue;
    }
    let t1 = (b.min[ax] - o[ax]) / d[ax],
      t2 = (b.max[ax] - o[ax]) / d[ax];
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmax < 0 ? -1 : Math.max(tmin, 0);
}

/** Cast a ray through the world, fighters and props. Returns the first hit. */
export function raycast(o, d, maxT, ignore) {
  let t = maxT,
    body = null,
    j = -1,
    prop = null;
  for (const b of BOXES) {
    if (b.bound) continue;
    const tt = rayBox(o, d, b);
    if (tt >= 0 && tt < t) {
      t = tt;
    }
  }
  for (const bd of bodies.values()) {
    if (bd === ignore || bd.dead) continue;
    for (let k = 0; k < N; k++) {
      const p = bd.pos[k],
        ocx = p.x - o.x,
        ocy = p.y - o.y,
        ocz = p.z - o.z,
        tca = ocx * d.x + ocy * d.y + ocz * d.z;
      if (tca < 0 || tca > t) continue;
      const r = RAD[k] * bd.size * (k === HEAD ? headScale() : 1) + 0.06,
        d2 = ocx * ocx + ocy * ocy + ocz * ocz - tca * tca;
      if (d2 > r * r) continue;
      const th = tca - Math.sqrt(r * r - d2);
      if (th < t) {
        t = th;
        body = bd;
        j = k;
      }
    }
  }
  for (const pr of props.values()) {
    if (pr.dead) continue;
    for (let k = 0; k < pr.pos.length; k++) {
      const p = pr.pos[k],
        ocx = p.x - o.x,
        ocy = p.y - o.y,
        ocz = p.z - o.z,
        tca = ocx * d.x + ocy * d.y + ocz * d.z;
      if (tca < 0 || tca > t) continue;
      const r = pr.rad[k],
        d2 = ocx * ocx + ocy * ocy + ocz * ocz - tca * tca;
      if (d2 > r * r) continue;
      const th = tca - Math.sqrt(r * r - d2);
      if (th < t) {
        t = th;
        body = null;
        prop = pr;
        j = k;
      }
    }
  }
  return { t, body, j, prop };
}

/** Where shots come out: the tip of the weapon in the right hand. */
export function muzzle(fighter) {
  const w = WEAPONS[fighter.weapon];
  return fighter.pos[RHAND].clone().addScaledVector(fighter.aim, w.len || 0.2);
}

function fire(fighter) {
  const w = WEAPONS[fighter.weapon];
  if (w.kind === 'melee') {
    fighter.punchT = 0.3;
    fighter.punchHit = false;
    fighter.punchHand = fighter.weapon === 'fists' ? -fighter.punchHand : 1;
    sfx(520, 0.06, 'sine', 0.04 * volAt(fighter.pos[PELV]));
    return;
  }
  if (w.kind === 'hitscan') {
    const m = muzzle(fighter),
      shots = [];
    for (let k = 0; k < w.pellets; k++) {
      const d = fighter.aim
        .clone()
        .add(
          new V3(
            (Math.random() - 0.5) * 2 * w.spread,
            (Math.random() - 0.5) * 2 * w.spread,
            (Math.random() - 0.5) * 2 * w.spread
          )
        )
        .normalize();
      const res = raycast(m, d, 90, fighter),
        end = m.clone().addScaledVector(d, res.t);
      if (res.body) {
        const fo = w.falloff
          ? clamp(1 - ((res.t - w.falloff[0]) / (w.falloff[1] - w.falloff[0])) * 0.7, 0.3, 1)
          : 1;
        dealHit(
          res.body,
          res.j,
          w.dmg * fo * (res.j === HEAD ? 1.5 : 1),
          d.clone().multiplyScalar(w.knock * 4),
          fighter.id,
          fighter.weapon
        );
        spark(end);
      } else if (res.prop) {
        propHit(
          res.prop,
          res.j,
          d
            .clone()
            .multiplyScalar(w.knock * 5)
            .add(new V3(0, w.knock * 0.8, 0)),
          w.dmg,
          fighter.id
        );
        spark(end);
      }
      tracer(m, end, fighter.weapon);
      shots.push(...[m.x, m.y, m.z, end.x, end.y, end.z].map((v) => +v.toFixed(2)));
    }
    send({ t: 'shot', s: shots, w: fighter.weapon });
    gunSfx(fighter.weapon, m);
    muzzleFlash(m, fighter.weapon);
  } else if (w.kind === 'rocket') {
    const m = muzzle(fighter),
      id = net.id + '#' + ++game.projSeq;
    spawnProj(id, 'rocket', fighter.id, m, fighter.aim.clone().multiplyScalar(w.speed), true);
    send({
      t: 'proj',
      id,
      k: 'rocket',
      by: fighter.id,
      p: m.toArray(),
      v: fighter.aim.clone().multiplyScalar(w.speed).toArray(),
    });
    noise(0.35, 0.25 * volAt(m), 500);
    sfx(140, 0.3, 'sawtooth', 0.06 * volAt(m));
    muzzleFlash(m, 'rocket');
    puff(m, 0.3, 0xdddddd, 0.6);
  } else if (w.kind === 'lob' || w.kind === 'trap') {
    throwProjectile(fighter, w);
  } else if (FIRE_KINDS[w.kind]) {
    FIRE_KINDS[w.kind](fighter, w);
  }
  if (w.recoil) {
    for (let i = 0; i < N; i++)
      addVel(
        fighter,
        i,
        -fighter.aim.x * w.recoil,
        -fighter.aim.y * w.recoil * 0.3,
        -fighter.aim.z * w.recoil
      );
    fighter.recoilT = 0.08;
  }
}

/**
 * Throw or launch a projectile: grenades and cluster bombs are lobbed, pies are launched, traps are tossed
 * a short way in front of you. projectiles.js flies them; traps.js arms the traps.
 */
function throwProjectile(fighter, w) {
  const k = fighter.weapon;
  if (w.kind === 'trap') limitTraps(fighter.id);
  if (!w.aimed) fighter.punchT = 0.3; // overhand throw animation
  const p = w.aimed
    ? muzzle(fighter)
    : fighter.pos[RHAND].clone()
        .addScaledVector(fighter.aim, 0.35)
        .add(new V3(0, 0.25, 0));
  const v =
    w.kind === 'trap'
      ? fighter.aim
          .clone()
          .setY(0)
          .normalize()
          .multiplyScalar(6)
          .add(new V3(0, 3.5, 0))
      : w.aimed
        ? fighter.aim
            .clone()
            .multiplyScalar(w.speed)
            .add(new V3(0, 2.5, 0))
        : fighter.aim
            .clone()
            .multiplyScalar(12)
            .add(new V3(0, 4.5, 0));
  v.addScaledVector(fighter.vel[PELV], 0.4);
  const id = net.id + '#' + ++game.projSeq;
  spawnProj(id, k, fighter.id, p, v, true);
  send({ t: 'proj', id, k, by: fighter.id, p: p.toArray(), v: v.toArray() });
  if (w.aimed) {
    sfx(220, 0.12, 'sine', 0.1 * volAt(p));
    noise(0.12, 0.12 * volAt(p), 900);
  } else sfx(300, 0.12, 'sine', 0.06);
}

export function gunSfx(k, p) {
  const v = volAt(p);
  if (k === 'shotgun') {
    noise(0.3, 0.35 * v, 1400);
  } else if (k === 'rifle') {
    noise(0.07, 0.18 * v, 2500);
  } else if (k === 'minigun') {
    noise(0.05, 0.15 * v, 2800);
    sfx(140, 0.04, 'square', 0.03 * v);
  } else if (k === 'freeze') {
    sfx(1800, 0.35, 'sine', 0.08 * v);
    sfx(2600, 0.25, 'triangle', 0.05 * v);
    noise(0.3, 0.06 * v, 6000);
  } else if (k === 'shrink') {
    sfx(1200, 0.3, 'sine', 0.08 * v);
    sfx(300, 0.35, 'sine', 0.08 * v);
  } else if (k === 'grapple') {
    sfx(700, 0.08, 'square', 0.06 * v);
    noise(0.2, 0.1 * v, 1800);
  } else {
    noise(0.1, 0.22 * v, 2000);
    sfx(900, 0.05, 'square', 0.04 * v);
  }
}

export function weaponUpdate(fighter, dt) {
  for (const k in fighter.cds) fighter.cds[k] -= dt;
  fighter.recoilT -= dt;
  const edge = fighter.fireEdge;
  fighter.fireEdge = false;
  if (fighter.dead || fighter.stun > 0 || fighter.ctrl.grab || fighter.blocking) return;
  const w = WEAPONS[fighter.weapon];
  if (!w.spin) fighter.spinT = 0;
  else if (!spinUp(fighter, w, dt)) return; // the minigun has to spin up first
  if (!(w.auto ? fighter.ctrl.fire : edge) || fighter.cds[fighter.slot] > 0) return;
  fighter.cds[fighter.slot] = w.cd;
  fighter.prot = 0;
  fighter.emoteT = 0;
  fire(fighter);
}
