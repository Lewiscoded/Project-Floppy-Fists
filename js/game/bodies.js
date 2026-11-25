/**
 * The Body class (one fighter = 16 verlet particles + controls + stats) and the map of all bodies.
 */
import { game } from '../core/state.js';
import { V3, now } from '../core/util.js';
import { N, REST } from './constants.js';
import { DEF_OUTFIT } from './outfits.js';
import { DEFAULT_EQUIP, DEFAULT_LOADOUT, freshCooldowns } from './weapons.js';
import { RagView } from '../render/fighter-visuals.js';
import { boxUnder } from '../world/world.js';

export const bodies = new Map();

export const F = new V3(),
  MID = new V3(),
  TMP = new V3(),
  TMP2 = new V3(),
  CP = new V3();

export class Body {
  constructor(id, name, col, local, x, z, y) {
    Object.assign(this, { id, name, col, local });
    this.pos = [];
    this.prev = [];
    this.acc = [];
    this.vel = [];
    this.tgt = [];
    for (let i = 0; i < N; i++) {
      this.pos.push(new V3());
      this.prev.push(new V3());
      this.acc.push(new V3());
      this.vel.push(new V3());
      this.tgt.push(new V3());
    }
    this.fwd = new V3(0, 0, 1);
    this.wantFwd = new V3(0, 0, 1);
    this.f3 = new V3(0, 0, 1);
    this.aim = new V3(0, 0, 1);
    this.hp = 100;
    this.dead = false;
    this.deadT = 0;
    this.prot = 0;
    this.falls = 0;
    this.dmg = 0;
    this.hs = 0;
    this.air = 0;
    this.maxAir = 0;
    this.ping = 0;
    this.emote = null;
    this.emoteT = 0;
    this.bubble = null;
    this.lastKiller = null;
    this.outfit = DEF_OUTFIT;
    this.hold = [null, null];
    this.holdRemote = null;
    this.holdT = 0;
    this.heldT = 0;
    this.heldBy = null;
    this.struggle = 0;
    this.blocking = false;
    this.blockStart = -1e9;
    this.lastBlockEnd = -1e9;
    this.guard = 100;
    this.guardBroken = 0;
    this.msg = '';
    this.msgT = 0;
    this.kills = 0;
    this.deaths = 0;
    this.lastHitBy = null;
    this.lastHitT = -1e9;
    this.lastHitW = '';
    this.loadout = { ...DEFAULT_LOADOUT }; // chosen weapon for every class
    this.equip = [...DEFAULT_EQUIP]; // the classes carried this match (all of them in sandbox)
    this.slot = 'gun'; // the class in hand
    this.cds = freshCooldowns();
    this.spinT = 0; // minigun spin-up
    this.fx = { burn: 0, freeze: 0, shrink: 0, pie: 0 }; // status effects, see status.js
    this.size = 1; // ragdoll scale (shrink ray)
    this.frozenPose = null;
    this.recoilT = 0;
    this.wKey = 'shotgun';
    this.ctrl = { mx: 0, mz: 0, jump: false, fire: false, grab: false };
    this.lastFire = false;
    this.lastJump = false;
    this.fireEdge = false;
    this.jumpEdge = false;
    this.bot = null;
    this.seen = now();
    this.fresh = true;
    if (y === undefined) this.reset(x, z);
    else {
      for (let i = 0; i < N; i++) {
        this.pos[i].set(x, y, z);
        this.prev[i].set(x, y, z);
      }
    }
    this.view = new RagView(this);
  }
  get weapon() {
    return this.local ? this.loadout[this.slot] : this.wKey;
  }
  reset(x, z) {
    const b = boxUnder(x, z, 100),
      top = b ? b.max.y : 0;
    const yaw = Math.atan2(-x, -z),
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    for (let i = 0; i < N; i++) {
      const r = REST[i];
      this.pos[i].set(r[0] * c + r[2] * s + x, r[1] + top + 0.05, -r[0] * s + r[2] * c + z);
      this.prev[i].copy(this.pos[i]);
    }
    this.fwd.set(s, 0, c);
    this.wantFwd.copy(this.fwd);
    this.f3.copy(this.fwd);
    this.aim.copy(this.fwd);
    this.ground = 0;
    this.groundY = top;
    this.stun = 0;
    this.punchT = 0;
    this.punchHand = 1;
    this.punchHit = false;
    this.jumpCd = 0;
    this.phase = 0;
    this.moving = false;
    this.grabs = [null, null];
  }
}

export const localBodies = () => [...bodies.values()].filter((b) => b.local);

game.myBodyId = null;

export const localPlayer = () => bodies.get(game.myBodyId);
