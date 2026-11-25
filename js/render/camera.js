/**
 * The follow camera (and spectator camera when you are dead).
 */
import { game } from '../core/state.js';
import { prefs } from '../core/prefs.js';
import { V3, now } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { PELV } from '../game/constants.js';
import { isEliminated } from '../game/match.js';
import { camera, sun } from './renderer.js';
import { isSandbox } from '../sandbox/gadgets.js';
import { fly, updateFly } from '../sandbox/sandbox-ui.js';

const camTarget = new V3(),
  camPos = new V3(0, 14, 14);

game.specIdx = 0;

export function camSubject() {
  const me = localPlayer();
  if (!me) return null;
  if (!me.dead) return me;
  if (!isEliminated(me)) {
    const k = me.lastKiller && bodies.get(me.lastKiller);
    return k && !k.dead && me.deadT < 3.2 ? k : me;
  }
  const alive = [...bodies.values()].filter(
    (fighter) => !fighter.dead && fighter !== me && !isEliminated(fighter)
  );
  if (!alive.length) return me;
  return alive[((game.specIdx % alive.length) + alive.length) % alive.length];
}

/** Move the camera to follow your fighter (or the spectated one). */
export function updateCamera(dt) {
  if (fly.on) {
    if (!isSandbox()) fly.on = false;
    else {
      updateFly(dt);
      return;
    }
  }
  const subj = camSubject();
  let t;
  if (subj) {
    t = subj.pos[PELV].clone();
    t.y = Math.max(t.y, -6);
  } else {
    const a = now() / 9000;
    t = new V3(Math.cos(a) * 6, 0, Math.sin(a) * 6);
  }
  const lerp = 1 - Math.exp(-dt * 5);
  camTarget.lerp(t, lerp);
  const cs = prefs.set.cam,
    co = window.__camOff || [0, 10.5 * cs, 10.5 * cs];
  const want = subj
    ? new V3(camTarget.x + co[0], camTarget.y + co[1], camTarget.z + co[2])
    : new V3(Math.cos(now() / 9000) * 30, 16, Math.sin(now() / 9000) * 30);
  camPos.lerp(want, subj ? lerp : 0.02);
  camera.position.copy(camPos);
  if (game.shake > 0) {
    const s = game.shake * prefs.set.shake;
    camera.position.x += (Math.random() - 0.5) * s * 0.6;
    camera.position.y += (Math.random() - 0.5) * s * 0.6;
    game.shake = Math.max(0, game.shake - dt * 2.5);
  }
  camera.lookAt(camTarget.x, camTarget.y + 0.8, camTarget.z);
  sun.position.set(camTarget.x + 9, camTarget.y + 22, camTarget.z + 8);
  sun.target.position.copy(camTarget);
}
