/**
 * Rocket rain (a world control): the host drops rockets from the sky near random fighters.
 *
 * The rockets are normal projectiles of kind 'rain' (they fly like rockets, see projectiles.js), owned by
 * the host, so they explode the same way for everyone. Nobody gets kill credit: the feed says
 * "taken by Rocket Rain".
 */
import { game } from '../core/state.js';
import { V3 } from '../core/util.js';
import { bodies } from './bodies.js';
import { rayBox } from './combat.js';
import { PELV } from './constants.js';
import { spawnProj } from './projectiles.js';
import { WEAPONS } from './weapons.js';
import { wr } from './world-controls.js';
import { isHost, net, send } from '../net/network.js';
import { BOXES } from '../world/world.js';

WEAPONS.rain = { cls: 'none', name: 'Rocket Rain', kind: 'boom', dmg: 45, radius: 3.4, blast: 15 };

const EVERY = [0.45, 1.1]; // seconds between rockets (random in this range)
const SCATTER = 9; // how far from the chosen fighter a rocket can land (m)
const DROP_HEIGHT = 26; // how high above the ground rockets start (lower if there's a roof)
const FALL_SPEED = 22;

let timer = 1;

/** Host only, every frame during a match. */
export function updateRocketRain(dt) {
  if (!wr('rocketRain') || game.state !== 'play' || !isHost()) return;
  timer -= dt;
  if (timer > 0) return;
  timer = EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]);
  const alive = [...bodies.values()].filter((b) => !b.dead);
  if (!alive.length) return;
  const target = alive[(Math.random() * alive.length) | 0].pos[PELV];
  const x = target.x + (Math.random() - 0.5) * 2 * SCATTER,
    z = target.z + (Math.random() - 0.5) * 2 * SCATTER;
  const from = new V3(x, target.y + 1, z);
  const p = new V3(x, target.y + roofAbove(from), z);
  const v = new V3((Math.random() - 0.5) * 2, -FALL_SPEED, (Math.random() - 0.5) * 2);
  const id = net.id + '#' + ++game.projSeq;
  spawnProj(id, 'rain', null, p, v, true);
  send({ t: 'proj', id, k: 'rain', by: null, p: p.toArray(), v: v.toArray() });
}

/** How far up the rocket can start: DROP_HEIGHT, or just under the first ceiling above this point. */
function roofAbove(from) {
  const up = new V3(0, 1, 0);
  let best = DROP_HEIGHT;
  for (const b of BOXES) {
    if (b.bound) continue;
    const t = rayBox(from, up, b);
    if (t >= 0 && t < best) best = t;
  }
  return Math.max(2, best - 0.6);
}
