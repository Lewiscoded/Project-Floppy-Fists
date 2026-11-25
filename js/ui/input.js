/**
 * Keyboard, mouse and gamepad input; turns them into fighter controls (move, aim, attack, block, grab).
 */
import { game } from '../core/state.js';
import { initAudio } from '../audio/engine.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { $, V3 } from '../core/util.js';
import { TMP2, bodies, localPlayer } from '../game/bodies.js';
import { flashMsg, raycast } from '../game/combat.js';
import { FRONT, LSH, RSH } from '../game/constants.js';
import { isEliminated } from '../game/match.js';
import { startEmote } from '../game/physics.js';
import { SLOT_ORDER } from '../game/weapons.js';
import { camera, renderer } from '../render/renderer.js';
import { isSandbox } from '../sandbox/gadgets.js';
import {
  closeWW,
  fly,
  openWW,
  placeAtCursor,
  renderSpawn,
  spawnOpen,
  toggleFly,
  toggleSpawn,
  wwOpen,
} from '../sandbox/sandbox-ui.js';
import { closeChat, openChat, pickWheel, renderWheel, sendChat } from './chat.js';
import { closeCustom } from './customize.js';
import { closeLoadout, openLoadout, togglePause } from './menu.js';
import { closeSettings, renderHelp, renderSettings } from './settings.js';
import { closeInfo } from './info.js';
import { closeTutorial } from './tutorial.js';

export const keys = new Set(),
  mouse = { nx: 0, ny: 0, down: false, x: innerWidth / 2, y: innerHeight / 2 };

game.menuOpen = true;
game.rebinding = null;
game.wheelMode = null;
game.lastChat = 0;

export const gamepad = { active: false, prev: [], aim: new V3(0, 0, 1), idx: -1 };

export const QUICK = ['gg', 'Nice!', 'Oops 😅', 'Come at me!', 'Help!', 'Thanks!'];

export const EMOTES = [
  ['wave', '👋 Wave'],
  ['dance', '💃 Dance'],
  ['taunt', '😤 Taunt'],
  ['flop', '🫠 Flop'],
];

function actionFor(code) {
  for (const a in prefs.binds) if (prefs.binds[a] === code) return a;
  return null;
}

addEventListener('keydown', (e) => {
  if (game.rebinding) {
    e.preventDefault();
    if (e.code !== 'Escape') {
      const other = actionFor(e.code);
      if (other && other !== game.rebinding) prefs.binds[other] = prefs.binds[game.rebinding];
      prefs.binds[game.rebinding] = e.code;
      savePrefs();
    }
    game.rebinding = null;
    renderSettings();
    renderHelp();
    return;
  }
  const ae = document.activeElement;
  if (ae && ae.id === 'chatIn') {
    if (e.key === 'Enter') {
      sendChat(ae.value);
      closeChat();
    } else if (e.key === 'Escape') closeChat();
    return;
  }
  if (ae && ae.tagName === 'INPUT') return;
  if (['Space', 'Tab'].includes(e.code) || e.code === prefs.binds.jump) e.preventDefault();
  keys.add(e.code);
  gamepad.active = false;
  // Escape closes menu overlays on the main menu and in the lobby too
  if (e.code === 'Escape' && game.state !== 'play') {
    if (!$('info').classList.contains('hidden')) return closeInfo();
    if (!$('settings').classList.contains('hidden')) return closeSettings();
    if (!$('tutorial').classList.contains('hidden')) return closeTutorial();
  }
  if (game.state !== 'play') return;
  const me = localPlayer();
  if (e.code === 'Escape') {
    if (game.wheelMode) {
      game.wheelMode = null;
      renderWheel();
      return;
    }
    if (wwOpen) {
      closeWW(false);
      return;
    }
    if (spawnOpen) {
      toggleSpawn();
      return;
    }
    if (!$('info').classList.contains('hidden')) {
      closeInfo();
      return;
    }
    if (!$('settings').classList.contains('hidden')) {
      closeSettings();
      return;
    }
    if (!$('tutorial').classList.contains('hidden')) {
      closeTutorial();
      return;
    }
    if (!$('custom').classList.contains('hidden')) {
      closeCustom();
      return;
    }
    if (!$('loadout').classList.contains('hidden')) closeLoadout();
    else togglePause();
    return;
  }
  if (game.wheelMode && /^Digit[1-9]$/.test(e.code)) {
    pickWheel(+e.code.slice(5) - 1);
    return;
  }
  const a = actionFor(e.code);
  if (me && me.dead && isEliminated(me) && (e.code === 'Space' || a === 'jump')) {
    game.specIdx++;
    return;
  }
  if (a === 'loadout') {
    if ($('loadout').classList.contains('hidden')) openLoadout();
    else closeLoadout();
    return;
  }
  if (game.menuOpen) return;
  if (isSandbox()) {
    if (a === 'wheel') {
      if (!e.repeat) openWW();
      return;
    }
    if (a === 'spawn') {
      toggleSpawn();
      return;
    }
    if (a === 'fly') {
      toggleFly();
      return;
    }
    if (a === 'rotate' && game.placing) {
      game.placeYaw += Math.PI / 4;
      return;
    }
  } else if (['wheel', 'spawn', 'fly'].includes(a) && me) {
    flashMsg(me, '<small>Sandbox mode only</small>');
  }
  if (a === 'chat') {
    e.preventDefault();
    openChat();
    return;
  }
  if (a === 'quick') {
    game.wheelMode = game.wheelMode === 'quick' ? null : 'quick';
    renderWheel();
    return;
  }
  if (a === 'emote') {
    game.wheelMode = game.wheelMode === 'emote' ? null : 'emote';
    renderWheel();
    return;
  }
  if (me) {
    if (a === 'slot1') me.slot = 'melee';
    if (a === 'slot2') me.slot = 'gun';
    if (a === 'slot3') me.slot = 'boom';
  }
});

addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (wwOpen && actionFor(e.code) === 'wheel') closeWW(true);
});

addEventListener('blur', () => {
  keys.clear();
  mouse.down = false;
  mouse.right = false;
});

addEventListener('mousemove', (e) => {
  mouse.nx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  gamepad.active = false;
});

renderer.domElement.addEventListener('mousedown', (e) => {
  initAudio();
  gamepad.active = false;
  const me = localPlayer();
  if (me && me.dead && isEliminated(me)) {
    game.specIdx++;
    return;
  }
  if (wwOpen) {
    closeWW(true);
    return;
  }
  if (spawnOpen && game.placing) {
    if (e.button === 0) {
      placeAtCursor();
      return;
    }
    if (e.button === 2 && !fly.on) {
      game.placing = null;
      renderSpawn();
      return;
    }
  }
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) mouse.right = true;
});

addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.down = false;
  if (e.button === 2) mouse.right = false;
});

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener(
  'wheel',
  (e) => {
    const me = localPlayer();
    if (!me || game.menuOpen || fly.on) return;
    const i = SLOT_ORDER.indexOf(me.slot);
    me.slot = SLOT_ORDER[(i + (e.deltaY > 0 ? 1 : 2)) % 3];
  },
  { passive: true }
);

export const isActionDown = (a) => keys.has(prefs.binds[a]);

function readPad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of gps) if (g && g.connected !== false) return g;
  return null;
}

const padBtn = (g, i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.35));

/** Read input into this frame's fighter controls. */
export function playerCtrl(r) {
  const c = { mx: 0, mz: 0, jump: false, fire: false, grab: false, block: false };
  const g = readPad();
  let pc = null;
  if (g) {
    const b = (i) => padBtn(g, i),
      edge = (i) => b(i) && !gamepad.prev[i];
    const lx = g.axes[0] || 0,
      ly = g.axes[1] || 0,
      rx = g.axes[2] || 0,
      ry = g.axes[3] || 0;
    const anyIn =
      Math.hypot(lx, ly) > 0.3 || Math.hypot(rx, ry) > 0.3 || g.buttons.some((x) => x && x.pressed);
    if (anyIn) gamepad.active = true;
    if (edge(9) && game.state === 'play') {
      if (!$('loadout').classList.contains('hidden')) closeLoadout();
      else togglePause();
    }
    if (gamepad.active && !game.menuOpen) {
      pc = {
        mx: Math.hypot(lx, ly) > 0.2 ? lx : 0,
        mz: Math.hypot(lx, ly) > 0.2 ? ly : 0,
        jump: b(0),
        fire: b(7) || b(2),
        block: b(6),
        grab: b(1),
      };
      if (Math.hypot(rx, ry) > 0.35) gamepad.aim.set(rx, 0, ry).normalize();
      else if (Math.hypot(lx, ly) > 0.4) gamepad.aim.set(lx, 0, ly).normalize();
      if (edge(5)) r.slot = SLOT_ORDER[(SLOT_ORDER.indexOf(r.slot) + 1) % 3];
      if (edge(4)) r.slot = SLOT_ORDER[(SLOT_ORDER.indexOf(r.slot) + 2) % 3];
      if (edge(3)) openLoadout();
      if (edge(12)) sendChat('Nice!');
      if (edge(15)) sendChat('gg');
      if (edge(14)) startEmote(r, 'wave');
      if (edge(13)) startEmote(r, 'flop');
      if (r.dead && isEliminated(r) && edge(0)) game.specIdx++;
    }
    gamepad.prev = g.buttons.map((x, i) => padBtn(g, i));
  }
  if (game.menuOpen || fly.on) return c;
  if (pc && gamepad.active) return pc;
  c.mx =
    (isActionDown('right') || isKeyDown('ArrowRight') ? 1 : 0) -
    (isActionDown('left') || isKeyDown('ArrowLeft') ? 1 : 0);
  c.mz =
    (isActionDown('down') || isKeyDown('ArrowDown') ? 1 : 0) -
    (isActionDown('up') || isKeyDown('ArrowUp') ? 1 : 0);
  c.jump = isActionDown('jump');
  c.fire = mouse.down && !wwOpen;
  c.block = mouse.right || isActionDown('block');
  c.grab = isActionDown('grab') || isKeyDown('ShiftLeft');
  return c;
}

export const isKeyDown = (c) => keys.has(c);

export function playerAim(r) {
  if (window.__aim) {
    r.aim.set(...window.__aim).normalize();
    return;
  }
  const ch = TMP2.addVectors(r.pos[LSH], r.pos[RSH]).multiplyScalar(0.5).clone();
  if (gamepad.active) {
    const A = gamepad.aim.clone();
    if (prefs.set.assist) {
      let best = null,
        bestDot = Math.cos(0.42);
      for (const o of bodies.values()) {
        if (o === r || o.dead || o.prot > 0) continue;
        const d = o.pos[FRONT].clone().sub(ch);
        const dist = d.length();
        if (dist > 26) continue;
        const h = new V3(d.x, 0, d.z).normalize();
        const dt = h.dot(A);
        if (dt > bestDot) {
          bestDot = dt;
          best = d.normalize();
        }
      }
      if (best) A.lerp(best, 0.65);
    }
    r.aim.copy(A.normalize());
    return;
  }
  const o = camera.position.clone(),
    d = new V3(mouse.nx, mouse.ny, 0.5).unproject(camera).sub(o).normalize();
  if (!isFinite(d.x)) return;
  const res = raycast(o, d, 300, r);
  const tPlane = d.y < -1e-4 ? (ch.y - o.y) / d.y : Infinity;
  const planeP = isFinite(tPlane) ? o.clone().addScaledVector(d, tPlane) : null;
  let P = res.t < 300 ? o.clone().addScaledVector(d, res.t) : null;
  if (P && !res.body) {
    // is the hit between the camera and the fighter (a wall, roof or house in the way)?
    const fh = new V3(o.x - ch.x, 0, o.z - ch.z).normalize();
    const hd = Math.hypot(P.x - ch.x, P.z - ch.z);
    if (planeP && ((P.x - ch.x) * fh.x + (P.z - ch.z) * fh.z > 0.6 || (hd < 1.5 && P.y > ch.y + 0.3)))
      P = planeP; // in the way, or right above our head
    else if (hd > 2.5 && P.y < ch.y) P.y += Math.min(1.1, ch.y - P.y);
  }
  if (!P) {
    if (!planeP) return;
    P = planeP;
  }
  const A = P.sub(ch);
  if (A.lengthSq() < 0.04) return;
  A.normalize();
  if (A.y > 0.6) {
    const h = Math.hypot(A.x, A.z) || 1e-3;
    const k = Math.sqrt(1 - 0.36) / h;
    A.set(A.x * k, 0.6, A.z * k);
  } // no aiming straight at the sky
  r.aim.copy(A);
}
