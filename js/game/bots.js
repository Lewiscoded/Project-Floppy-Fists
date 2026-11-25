/**
 * Bot AI: picking targets, moving, aiming, attacking, grabbing, and staying away from ledges.
 */
import { game } from '../core/state.js';
import { V3, clamp } from '../core/util.js';
import { Body, TMP2, bodies } from './bodies.js';
import { COLORS, FRONT, LSH, MAX_PLAYERS, PELV, RSH } from './constants.js';
import { meleeOnly } from './match.js';
import { randomOutfit } from './outfits.js';
import { WEAPONS } from './weapons.js';
import { removeBody } from '../net/messages.js';
import { bots, net, playerCount } from '../net/network.js';
import { SPAWNS, boxUnder } from '../world/world.js';

export const BOT_NAMES = ['Bonk', 'Wobbles', 'Noodle', 'Flops', 'Jelly', 'Bean', 'Squish', 'Dingus'];

export const BOT_DIFF = {
  easy: { err: 2, react: 1.7, fire: 1.7, block: 0.3, name: 'Easy' },
  normal: { err: 1, react: 1, fire: 1, block: 1, name: 'Normal' },
  hard: { err: 0.45, react: 0.45, fire: 0.7, block: 2, name: 'Hard' },
};

let botSeq = 0;

export function addBot() {
  if (game.state !== 'play' || net.mode === 'client' || playerCount() >= MAX_PLAYERS) return;
  const id = net.id + ':b' + ++botSeq,
    sp = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
  const used = new Set([...bodies.values()].map((b) => b.col));
  const col = COLORS.find((c) => !used.has(c)) ?? COLORS[botSeq % COLORS.length];
  const b = new Body(id, BOT_NAMES[botSeq % BOT_NAMES.length] + ' (bot)', col, true, sp[0], sp[1]);
  b.loadout = {
    melee: ['fists', 'bat', 'sword'][Math.floor(Math.random() * 3)],
    gun: ['pistol', 'shotgun', 'rifle'][Math.floor(Math.random() * 3)],
    boom: ['rocket', 'grenade'][Math.floor(Math.random() * 2)],
  };
  const d = BOT_DIFF[game.match.diff] || BOT_DIFF.normal;
  b.bot = {
    pref: Math.random() < 0.25 ? 'boom' : 'gun',
    strafe: 1,
    st: 0,
    react: 0.8 * d.react,
    err: (0.1 + Math.random() * 0.08) * d.err,
    toggle: false,
    wander: new V3(),
    fireCd: 0,
    d,
  };
  b.prot = 2;
  b.outfit = randomOutfit();
  bodies.set(id, b);
}

function removeBot() {
  const b = bots().pop();
  if (b) removeBody(b.id);
}

/** Decide what a bot does this frame (returns its controls). */
export function botThink(fighter, dt) {
  const c = { mx: 0, mz: 0, jump: false, fire: false, grab: false },
    B = fighter.bot,
    me = fighter.pos[PELV],
    D = B.d || BOT_DIFF.normal;
  if (fighter.dead || fighter.stun > 0) return c;
  if (game.match.mode === 'sb' && game.match.botAI === 'dummy' && game.state === 'play') return c;
  const under = boxUnder(me.x, me.z, me.y);
  if ((!under && me.y < -0.1 && me.y > -8) || fighter.grabs.some((q) => q)) {
    let sp = SPAWNS[0],
      sd = 1e9;
    for (const q of SPAWNS) {
      const d = Math.hypot(q[0] - me.x, q[1] - me.z);
      if (d < sd) {
        sd = d;
        sp = q;
      }
    }
    let tx = sp[0] - me.x,
      tz = sp[1] - me.z;
    const l = Math.hypot(tx, tz) || 1;
    c.mx = tx / l;
    c.mz = tz / l;
    c.grab = !(fighter.grabs.some((q) => q) && me.y > (under ? under.max.y : 0) + 0.4);
    c.jump = true;
    fighter.aim.set(c.mx, 0, c.mz);
    return c;
  }
  let best = null,
    bd = 1e9;
  for (const o of bodies.values()) {
    if (o === fighter || o.dead || o.prot > 0) continue;
    const d = o.pos[PELV].distanceTo(me);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  let dx, dz;
  if (!best) {
    if (B.wander.distanceTo(me) < 2 || B.wander.lengthSq() === 0)
      B.wander.set((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
    dx = B.wander.x - me.x;
    dz = B.wander.z - me.z;
  } else {
    const want = meleeOnly() || bd < 2.3 ? 'melee' : B.pref === 'boom' && bd > 5 && bd < 24 ? 'boom' : 'gun';
    if (fighter.slot !== want) fighter.slot = want;
    const w = WEAPONS[fighter.weapon],
      tp = best.pos[FRONT].clone();
    if (w.kind === 'rocket') tp.y -= 0.9;
    const ch = TMP2.addVectors(fighter.pos[LSH], fighter.pos[RSH]).multiplyScalar(0.5);
    const aim = tp.sub(ch);
    const dist = aim.length();
    aim.normalize();
    aim.x += (Math.random() - 0.5) * B.err * 2;
    aim.z += (Math.random() - 0.5) * B.err * 2;
    if (w.kind === 'grenade') aim.y = 0.35 * clamp(dist / 12, 0.2, 1.2);
    fighter.aim.copy(aim.normalize());
    dx = best.pos[PELV].x - me.x;
    dz = best.pos[PELV].z - me.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    B.st -= dt;
    if (B.st <= 0) {
      B.st = 1.2 + Math.random() * 2;
      B.strafe = Math.random() < 0.5 ? -1 : 1;
    }
    const keep = w.kind === 'melee' ? 0 : w.kind === 'hitscan' ? (fighter.weapon === 'shotgun' ? 4 : 7) : 9;
    let fwd = keep === 0 ? 1 : clamp((bd - keep) / 3, -1, 1);
    const sxx = -dz * B.strafe,
      szz = dx * B.strafe,
      sm = keep === 0 ? 0.15 : 0.7;
    dx = dx * fwd + sxx * sm;
    dz = dz * fwd + szz * sm;
    if (keep === 0 && bd < 0.9) {
      dx *= 0.2;
      dz *= 0.2;
    }
    B.react -= dt;
    B.blockT = (B.blockT || 0) - dt;
    if (w.kind === 'melee' && bd < 2.4 && B.blockT < -0.6 && Math.random() < 0.025 * D.block)
      B.blockT = 0.35 + Math.random() * 0.5;
    if (B.blockT > 0) {
      c.block = true;
    }
    // grab and throw now and then
    B.grabT = (B.grabT || 0) - dt;
    if (w.kind === 'melee' && bd < 1.3 && B.grabT < -2 && Math.random() < 0.01 * D.block)
      B.grabT = 1.1 + Math.random() * 1.2;
    if (B.grabT > 0) {
      c.grab = true;
      c.block = false;
      if (fighter.hold.some(Boolean)) {
        c.jump = B.grabT < 0.7;
        if (under) {
          const ox = me.x - (under.min.x + under.max.x) / 2,
            oz = me.z - (under.min.z + under.max.z) / 2,
            ol = Math.hypot(ox, oz) || 1;
          dx = ox / ol;
          dz = oz / ol;
        }
      }
    }
    const inRange = w.kind === 'melee' ? bd < 1.7 : bd < 30;
    B.fireCd -= dt;
    if (inRange && B.react <= 0 && B.fireCd <= 0) {
      c.fire = w.auto ? true : (B.toggle = !B.toggle);
      if (!w.auto && !B.toggle)
        B.fireCd = (w.kind === 'melee' ? 0.15 : w.cd * (w.cls === 'boom' ? 1.8 : 0.9)) * D.fire;
    }
    if (B.react <= 0 && Math.random() < 0.015) B.react = (0.6 + Math.random() * 1.0) * D.react;
    if (w.auto && B.react <= 0 && Math.random() < 0.03) B.react = (0.3 + Math.random() * 0.4) * D.react;
  }
  const l = Math.hypot(dx, dz) || 1;
  dx /= l;
  dz /= l;
  if (under && !boxUnder(me.x + dx * 1.4, me.z + dz * 1.4, me.y)) {
    const cx = (under.min.x + under.max.x) / 2 - me.x,
      cz = (under.min.z + under.max.z) / 2 - me.z,
      cl = Math.hypot(cx, cz) || 1;
    dx = cx / cl;
    dz = cz / cl;
  }
  if (Math.random() < 0.004) c.jump = true;
  c.mx = dx;
  c.mz = dz;
  return c;
}
