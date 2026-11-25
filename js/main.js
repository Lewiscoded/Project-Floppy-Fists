/**
 * Entry point. Loads every module, builds the menu demo world, and runs the main frame loop
 * (fixed-step physics, networking ticks, rendering, HUD). Also exposes window.__game for automated tests.
 */
// Load every module in the same order the game was originally written in.
import './core/state.js';
import './core/util.js';
import './game/constants.js';
import './game/weapons.js';
import './render/renderer.js';
import './render/textures.js';
import './world/world.js';
import './render/materials.js';
import './world/builders.js';
import './world/maps/kitchen.js';
import './world/maps/office.js';
import './world/maps/castle.js';
import './world/maps/block-party.js';
import './world/maps/index.js';
import './audio/engine.js';
import './game/bodies.js';
import './game/physics.js';
import './game/grab.js';
import './game/combat.js';
import './game/projectiles.js';
import './game/props.js';
import './sandbox/gadgets.js';
import './render/fx.js';
import './render/fighter-visuals.js';
import './game/outfits.js';
import './net/test-peer.js';
import './net/network.js';
import './net/messages.js';
import './game/bots.js';
import './core/prefs.js';
import './ui/input.js';
import './sandbox/sandbox-ui.js';
import './ui/chat.js';
import './ui/overlay.js';
import { openLoadout } from './ui/menu.js';
import './ui/customize.js';
import './ui/settings.js';
import './ui/tutorial.js';
import './ui/info.js';
import './ui/ui-sounds.js';
import './ui/map-select.js';
import './ui/lobby.js';
import './game/match.js';
import './ui/hud.js';
import './render/camera.js';
import { installSandboxPointerListeners } from './sandbox/sandbox-ui.js';
import { installCustomizeEscape } from './ui/customize.js';
import { installMapScreenEscape } from './ui/map-select.js';

import { updateMusic } from './audio/music.js';
import { game } from './core/state.js';
import { prefs } from './core/prefs.js';
import { $, V3, now } from './core/util.js';
import { Body, bodies, localBodies, localPlayer } from './game/bodies.js';
import { BOT_DIFF, BOT_NAMES, addBot, botThink, randomEquip, randomLoadout } from './game/bots.js';
import { applyHit, raycast, weaponUpdate } from './game/combat.js';
import { updateStatus } from './game/status.js';
import { COLORS, DT, LHAND, RHAND } from './game/constants.js';
import { breakFree, buildTethers, dropHolds, holdTarget, throwTarget } from './game/grab.js';
import {
  endMatch,
  hostMatchCheck,
  isEliminated,
  ensureSlot,
  slotsFor,
  renderMyStats,
  respawn,
  startMatchHost,
} from './game/match.js';
import { randomOutfit } from './game/outfits.js';
import { startEmote, step } from './game/physics.js';
import { onBoom, projs, updateProjs } from './game/projectiles.js';
import { props, sendProps, spawnMapProps, updateProps } from './game/props.js';
import { WEAPONS } from './game/weapons.js';
import { sendState, stepProxies } from './net/messages.js';
import { broadcastLobby, joinGame, lostHost, net, send, setStatus } from './net/network.js';
import { updateCamera } from './render/camera.js';
import { updateFx } from './render/fx.js';
import {
  applyQuality,
  bloomPass,
  camera,
  composer,
  quality,
  renderFrame,
  renderer,
  skyDome,
} from './render/renderer.js';
import { animateGadgets, doSandbox, gadgets, isSandbox, sandboxReq, sendGadgets } from './sandbox/gadgets.js';
import {
  closeWW,
  cursorWorld,
  fly,
  openWW,
  placeAtCursor,
  toggleFly,
  toggleSpawn,
  updateGhost,
  wwOpen,
} from './sandbox/sandbox-ui.js';
import { sendChat } from './ui/chat.js';
import { prev } from './ui/customize.js';
import { updateHud } from './ui/hud.js';
import { keys, mouse, playerAim, playerCtrl } from './ui/input.js';
import { chooseMap, genThumbs, renderMaps } from './ui/map-select.js';
import { updateOverlay } from './ui/overlay.js';
import { renderGfx, renderHelp } from './ui/settings.js';
import { THEMES } from './world/maps/index.js';
import { BOXES, SPAWNS, animated, boxUnder, loadMap, mapKey } from './world/world.js';

export function demoWorld() {
  net.id = 'demo';
  for (let i = 0; i < 4; i++) {
    const id = 'demo:b' + i,
      sp = SPAWNS[i];
    const b = new Body(id, BOT_NAMES[i], COLORS[i], true, sp[0], sp[1]);
    b.loadout = randomLoadout();
    b.equip = randomEquip();
    b.bot = {
      pref: b.equip[1],
      strafe: 1,
      st: 0,
      react: 0.5,
      err: 0.12,
      toggle: false,
      wander: new V3(),
      fireCd: 0,
      d: BOT_DIFF.normal,
    };
    b.outfit = randomOutfit();
    bodies.set(id, b);
  }
  spawnMapProps();
}

let physicsAccumulator = 0,
  last = now(),
  sendT = 0,
  pingT = 0,
  lobbyT = 0;

/** Main loop, called every animation frame. */
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  updateMusic();
  const L = localBodies();
  for (const r of L) {
    const c = r.bot ? botThink(r, dt) : playerCtrl(r);
    if (!r.bot) playerAim(r);
    // being held: mash jump/attack to break free (bots wriggle on their own)
    if (r.heldBy && !r.dead) {
      if ((c.fire && !r.lastFire) || (c.jump && !r.lastJump)) r.struggle += 1;
      if (r.bot && Math.random() < dt * 2.2) r.struggle += 1;
      if (r.struggle >= 5) breakFree(r);
    }
    r.struggle = Math.max(0, r.struggle - dt * 0.7);
    if (r.heldBy) {
      c.fire = false;
    }
    if (c.fire && !r.lastFire) r.fireEdge = true;
    if (c.jump && !r.lastJump) r.jumpEdge = true;
    r.lastFire = c.fire;
    r.lastJump = c.jump;
    r.ctrl = c;
    r.heldT = Math.max(0, r.heldT - dt);
    // holding: give up after 6 s, or if the target got pulled out of reach
    if (r.hold.some(Boolean)) {
      r.holdT += dt;
      if (r.holdT > 6) dropHolds(r, false);
      for (let gi = 0; gi < 2; gi++) {
        const h = r.hold[gi];
        if (!h) continue;
        const T = holdTarget(h);
        if (!T || (h.k === 'p' && T.dead) || T.pos[h.j].distanceTo(r.pos[gi ? RHAND : LHAND]) > 2.4)
          r.hold[gi] = null;
      }
    }
    r.guardBroken -= dt;
    r.msgT -= dt;
    r.prot = Math.max(0, r.prot - dt);
    r.emoteT = Math.max(0, r.emoteT - dt);
    if ((c.mx || c.mz) && r.emote !== 'dance') r.emoteT = Math.min(r.emoteT, 0.0001);
    const canBlock =
      c.block && WEAPONS[r.weapon].kind === 'melee' && !r.dead && r.stun <= 0 && r.guardBroken <= 0;
    if (canBlock && !r.blocking) {
      r.blockStart = now() - r.lastBlockEnd > 350 ? now() : -1e9;
    }
    if (!canBlock && r.blocking) r.lastBlockEnd = now();
    r.blocking = canBlock;
    if (!r.blocking) r.guard = Math.min(100, r.guard + 30 * dt);
    // flight time (for the results screen)
    if (r.ground > 0) r.air = 0;
    else {
      r.air += dt;
      if (r.air > r.maxAir && r.air < 30) r.maxAir = r.air;
    }
    ensureSlot(r);
    weaponUpdate(r, dt);
    if (r.dead) {
      r.deadT -= dt;
      if (r.deadT <= 0 && !isEliminated(r)) respawn(r);
    }
  }
  for (const b of bodies.values()) updateStatus(b, dt);
  stepProxies(dt);
  buildTethers();
  physicsAccumulator += dt;
  let n = 0;
  while (physicsAccumulator >= DT && n < 6) {
    step();
    physicsAccumulator -= DT;
    n++;
  }
  if (n === 6) physicsAccumulator = 0;
  updateProjs(dt);
  updateProps(dt);
  animateGadgets(dt);
  updateGhost();
  updateFx(dt);
  for (const b of bodies.values()) b.view.update(b, dt);
  if (net.mode !== 'off') {
    sendT -= dt;
    if (sendT <= 0) {
      sendT = 0.05;
      if (game.state === 'play') {
        sendState();
        if (net.mode === 'host') sendProps();
      }
    }
    if (net.mode === 'client') {
      pingT -= dt;
      if (pingT <= 0) {
        pingT = 2;
        send({ t: 'ping', ts: now() });
      }
      if (!net.reconnecting && net.lastHost && now() - net.lastHost > 6500) lostHost('timeout');
    } else {
      lobbyT -= dt;
      if (lobbyT <= 0) {
        lobbyT = 2;
        broadcastLobby();
        if (game.state === 'play' && gadgets.size) sendGadgets();
      }
    }
  }
  hostMatchCheck();
  if (game.state === 'play') updateHud(dt);
  updateOverlay(dt);
  if (prev && !$('custom').classList.contains('hidden')) prev.render(dt);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt);
  renderer.domElement.style.filter =
    quality !== 'high' && game.hurtFlash > 0
      ? `saturate(${1 + game.hurtFlash * 2}) brightness(${1 + game.hurtFlash * 0.4})`
      : '';
  updateCamera(dt);
  skyDome.position.copy(camera.position);
  const tt = now() / 1000;
  for (const f of animated) f(tt, dt);
  renderFrame();
  requestAnimationFrame(frame);
}

// These listeners must run after the ones in ui/input.js, exactly like the original single-file order.
installSandboxPointerListeners();
installCustomizeEscape();
installMapScreenEscape();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) {
    composer.setSize(innerWidth, innerHeight);
    bloomPass.resolution.set(innerWidth, innerHeight);
  }
});

window.__game = {
  WEAPONS,
  weaponUpdate,
  slotsFor,
  openLoadout,
  gadgets,
  doSandbox,
  sandboxReq,
  fly,
  toggleFly,
  openWW,
  closeWW,
  toggleSpawn,
  placeAtCursor,
  get wwOpen() {
    return wwOpen;
  },
  set placing(v) {
    game.placing = v;
  },
  get placing() {
    return game.placing;
  },
  cursorWorld,
  isSandbox,
  applyHit,
  onBoom,
  raycast,
  throwTarget,
  get tethers() {
    return game.tethers;
  },
  camera,
  V3,
  bodies,
  props,
  net,
  loadMap,
  chooseMap,
  THEMES,
  get BOXES() {
    return BOXES;
  },
  get SPAWNS() {
    return SPAWNS;
  },
  boxUnder,
  get mapKey() {
    return mapKey;
  },
  get state() {
    return game.state;
  },
  addBot,
  keys,
  mouse,
  projs,
  localPlayer,
  get match() {
    return game.match;
  },
  set match(v) {
    game.match = v;
  },
  endMatch,
  startMatchHost,
  prefs,
  startEmote,
  sendChat,
  get lobbyRoster() {
    return game.lobbyRoster;
  },
};

applyQuality(prefs.quality);
renderGfx();
renderHelp();
renderMyStats();

loadMap(prefs.map);
renderMaps();

demoWorld();

setTimeout(genThumbs, 900);

// invite links: open the site with #CODE to jump straight into a room
{
  const hc = (location.hash || '').slice(1).toUpperCase();
  if (/^[A-Z]{4}$/.test(hc)) {
    $('codeIn').value = hc;
    setStatus('Joining room ' + hc + '…', true);
    setTimeout(() => joinGame(hc), 400);
  }
}

requestAnimationFrame(frame);
