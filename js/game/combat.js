/**
 * Attacks and damage: firing weapons, melee swings with block/parry, hitscan raycasts, applying hits,
 * kills and kill credit, plus floating messages over fighters.
 */
import { game } from '../core/state.js';
import { noise, sfx, volAt } from '../audio.js';
import { V3, clamp, escapeHtml, now, round2, toCssHex } from '../core/util.js';
import { TMP, bodies } from './bodies.js';
import { HEAD, LELB, LHAND, N, PELV, RAD, RELB, RHAND } from './constants.js';
import { addVel } from './physics.js';
import { spawnProj } from './projectiles.js';
import { propHit, props } from './props.js';
import { WEAPONS } from './weapons.js';
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
    if (o.pos[PELV].distanceTo(ph) > 3) continue;
    for (let j = 0; j < N; j++) {
      const rr = RAD[j] + (w.reach ? 0.12 : RAD[h]) + 0.05;
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
      return;
    }
  }
}

function dealHit(o, j, dmg, imp, by, wname) {
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
  for (let i = 0; i < N; i++) {
    const m = i === j ? 1.6 : 0.5;
    addVel(other, i, imp.x * m, imp.y * m, imp.z * m);
  }
  if (other.dead) return;
  if (by && by !== other.id) {
    other.lastHitBy = by;
    other.lastHitT = now();
    other.lastHitW = wname;
  }
  other.hp -= dmg;
  other.stun = Math.max(other.stun, imp.length() > 6 ? 0.7 : w && w.kind === 'melee' ? 0.18 : 0.05);
  if (other.id === game.myBodyId) {
    game.hurtFlash = 0.35;
    dmgDir(by, null);
  }
  hitNotify(other, by, dmg, j === HEAD);
  if (other.hp <= 0) kill(other, by, wname);
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
  if (w)
    return w.cls === 'boom' || w.kind === 'boom'
      ? 'boom'
      : w.cls === 'gun'
        ? 'gun'
        : w.cls === 'melee'
          ? 'melee'
          : 'throw';
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
      const r = RAD[k] + 0.06,
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

function muzzle(fighter) {
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
  } else if (w.kind === 'grenade') {
    fighter.punchT = 0.3;
    const p = fighter.pos[RHAND].clone()
      .addScaledVector(fighter.aim, 0.35)
      .add(new V3(0, 0.25, 0));
    const v = fighter.aim
      .clone()
      .multiplyScalar(12)
      .add(new V3(0, 4.5, 0))
      .addScaledVector(fighter.vel[PELV], 0.5);
    const id = net.id + '#' + ++game.projSeq;
    spawnProj(id, 'grenade', fighter.id, p, v, true);
    send({ t: 'proj', id, k: 'grenade', by: fighter.id, p: p.toArray(), v: v.toArray() });
    sfx(300, 0.12, 'sine', 0.06);
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

export function gunSfx(k, p) {
  const v = volAt(p);
  if (k === 'shotgun') {
    noise(0.3, 0.35 * v, 1400);
  } else if (k === 'rifle') {
    noise(0.07, 0.18 * v, 2500);
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
  if (!(w.auto ? fighter.ctrl.fire : edge) || fighter.cds[fighter.slot] > 0) return;
  fighter.cds[fighter.slot] = w.cd;
  fighter.prot = 0;
  fighter.emoteT = 0;
  fire(fighter);
}
