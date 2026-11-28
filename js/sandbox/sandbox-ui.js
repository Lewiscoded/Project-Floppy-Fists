/**
 * Sandbox controls: the weapon wheel (X), the spawn bar (Z) with placement preview, and the free camera (C).
 */
import { game } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { keyLabel } from '../core/prefs.js';
import { $, V3, clamp, escapeHtml, round2 } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { flashMsg, raycast } from '../game/combat.js';
import { PELV } from '../game/constants.js';
import { PROP_DEFS, propMesh, props } from '../game/props.js';
import { CLASSES, WEAPONS, WEAPON_ICONS } from '../game/weapons.js';
import { camera, scene, sun } from '../render/renderer.js';
import {
  MAX_SPAWNED,
  SPAWN_ITEMS,
  gadgetMesh,
  gadgets,
  isSandbox,
  sandboxReq,
  spawnedCount,
} from './gadgets.js';
import { isActionDown, isKeyDown, mouse } from '../ui/input.js';
import { boxUnder, mapKey, wName } from '../world/world.js';
import { isHost } from '../net/network.js';
import { onWorldChange, worldPanelClick, worldPanelHTML } from '../ui/world-panel.js';

// every weapon, grouped by class, going clockwise from the top
const WW_ORDER = CLASSES.flatMap((c) => c.types);
const WW_RADIUS = 215;

export let wwOpen = false,
  wwHover = -1;

export function openWW() {
  if (!isSandbox() || wwOpen) return;
  wwOpen = true;
  wwHover = -1;
  renderWW();
}

function renderWW() {
  const el = $('wwheel');
  el.classList.toggle('hidden', !wwOpen);
  if (!wwOpen) return;
  const me = localPlayer(),
    R = WW_RADIUS;
  const className = (k) => CLASSES.find((c) => c.key === WEAPONS[k].cls).name;
  el.innerHTML =
    WW_ORDER.map((k, i) => {
      const a = (i / WW_ORDER.length) * Math.PI * 2 - Math.PI / 2,
        x = Math.cos(a) * R,
        y = Math.sin(a) * R;
      const cl = WEAPONS[k].cls;
      const cur = me && me.loadout[cl] === k;
      return `<div class="wwi c-${cl} ${i === wwHover ? 'on' : ''} ${cur ? 'cur' : ''}" data-i="${i}" style="transform:translate(${x}px,${y}px)"><span>${WEAPON_ICONS[k]}</span></div>`;
    }).join('') +
    `<div class="wwc">${
      wwHover >= 0
        ? `${escapeHtml(wName(WW_ORDER[wwHover]))}<small>${className(WW_ORDER[wwHover])}</small>`
        : 'Pick a weapon'
    }<small>release ${keyLabel('wheel')} or click</small></div>`;
}

function wwMove() {
  if (!wwOpen) return;
  const dx = mouse.x - innerWidth / 2,
    dy = mouse.y - innerHeight / 2;
  let h = -1;
  if (Math.hypot(dx, dy) > 45) {
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    h = Math.round((a / (Math.PI * 2)) * WW_ORDER.length) % WW_ORDER.length;
  }
  if (h !== wwHover) {
    wwHover = h;
    renderWW();
  }
}

export function closeWW(pick) {
  if (!wwOpen) return;
  wwOpen = false;
  const me = localPlayer();
  if (pick && wwHover >= 0 && me) {
    const k = WW_ORDER[wwHover],
      cl = WEAPONS[k].cls;
    me.loadout[cl] = k;
    me.slot = cl;
    me.cds[cl] = Math.min(me.cds[cl] || 0, 0.2);
    flashMsg(me, `${WEAPON_ICONS[k]} ${escapeHtml(wName(k))}`);
    sfx(660, 0.06, 'triangle', 0.06);
  }
  renderWW();
}

$('wwheel').addEventListener('mousedown', (e) => {
  e.preventDefault();
  const it = e.target.closest('.wwi');
  if (it) wwHover = +it.dataset.i;
  closeWW(true);
});

// ---------- spawn menu + placement ----------
export let spawnOpen = false;
game.placing = null;
game.placeYaw = 0;
let ghost = null;
let ghostKind = null;

const placeP = new V3();

let worldTab = false; // spawn bar showing the World tab instead of spawnable items
onWorldChange(() => spawnOpen && worldTab && renderSpawn());

export function renderSpawn() {
  const el = $('spawnMenu');
  el.classList.toggle('hidden', !spawnOpen);
  $('help').style.visibility = spawnOpen ? 'hidden' : '';
  if (!spawnOpen) return;
  const hint = game.placing
    ? game.placing === 'remove'
      ? 'Click a prop, gadget or bot to remove it'
      : `Click to place · <kbd>${keyLabel('rotate')}</kbd> rotate · right click to stop`
    : 'Pick something, then click in the world';
  const tabs = `<span class="sbtabs"><button data-tab="spawn" class="${worldTab ? '' : 'sel'}">Spawn</button><button data-tab="world" class="${worldTab ? 'sel' : ''}">🌍 World</button></span>`;
  if (worldTab) {
    // the World tab: same panel as the lobby's, so the host can change gravity etc. mid-game
    el.innerHTML = `<div class="sbt">${tabs}<span class="hint">${isHost() ? 'Changes apply to everyone right away' : 'Only the host can change the world'}</span><kbd>${keyLabel('spawn')}</kbd></div>${worldPanelHTML()}`;
    return;
  }
  el.innerHTML =
    `<div class="sbt">${tabs}<span class="hint">${hint}</span><span class="cnt">${spawnedCount()}/${MAX_SPAWNED}</span><kbd>${keyLabel('spawn')}</kbd></div><div class="sbrow">` +
    SPAWN_ITEMS.map(
      ([cat, items]) =>
        `<div class="sbgrp ${cat === 'Tools' ? 'tools' : ''}"><div class="sbc">${cat}</div><div class="sbg">${items
          .map(
            ([k, ic, nm]) =>
              `<button data-k="${k}" class="${game.placing === k ? 'sel' : ''}" title="${escapeHtml(nm)}"><span>${ic}</span>${escapeHtml(k === 'ball' && mapKey === 'hood' ? 'Hoop ball' : nm)}</button>`
          )
          .join('')}</div></div>`
    ).join('') +
    `</div>`;
}

$('spawnMenu').addEventListener('mousedown', (e) => {
  e.preventDefault();
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    worldTab = tab.dataset.tab === 'world';
    if (worldTab) game.placing = null;
    renderSpawn();
    return;
  }
  if (worldPanelClick(e)) return;
  e.stopPropagation();
  const b = e.target.closest('button');
  if (!b) return;
  const k = b.dataset.k;
  if (k === 'undo' || k === 'clear') {
    sandboxReq({ what: k });
    sfx(400, 0.06, 'sine', 0.05);
    setTimeout(renderSpawn, 120);
    return;
  }
  game.placing = game.placing === k ? null : k;
  renderSpawn();
  sfx(600, 0.05, 'sine', 0.05);
});

export function toggleSpawn() {
  if (!isSandbox()) return;
  spawnOpen = !spawnOpen;
  if (!spawnOpen) game.placing = null;
  renderSpawn();
}

export function cursorWorld(out) {
  const o = camera.position.clone(),
    d = new V3(mouse.nx, mouse.ny, 0.5).unproject(camera).sub(o).normalize();
  if (!isFinite(d.x)) return null;
  const res = raycast(o, d, 250, null);
  if (res.t < 250) {
    out.copy(o).addScaledVector(d, res.t);
    return res;
  }
  if (d.y < -1e-4) {
    out.copy(o).addScaledVector(d, -o.y / d.y);
    return { t: -o.y / d.y };
  }
  return null;
}

function removeTargetAt(P) {
  let best = null,
    bd = 1.6;
  for (const g of gadgets.values()) {
    const d = Math.hypot(g.x - P.x, g.z - P.z) + Math.max(0, Math.abs(P.y - g.y) - 1.4);
    if (d < bd) {
      bd = d;
      best = g.id;
    }
  }
  for (const pr of props.values()) {
    if (pr.dead) continue;
    const d = pr.c.distanceTo(P) - 0.3;
    if (d < bd) {
      bd = d;
      best = pr.id;
    }
  }
  for (const b of bodies.values()) {
    if (!b.bot && !b.isBot) continue;
    const d = b.pos[PELV].distanceTo(P) - 0.4;
    if (d < bd) {
      bd = d;
      best = b.id;
    }
  }
  return best;
}

export function placeAtCursor() {
  if (!game.placing || !cursorWorld(placeP)) return;
  if (game.placing === 'remove') {
    const id = removeTargetAt(placeP);
    if (id) {
      sandboxReq({ what: 'rm', id });
      sfx(260, 0.08, 'square', 0.05);
    }
    return;
  }
  const b = boxUnder(placeP.x, placeP.z, placeP.y + 0.3),
    y = b ? b.max.y : 0;
  sandboxReq({
    what: game.placing,
    x: round2(placeP.x),
    y: round2(Math.max(y, placeP.y - 0.05)),
    z: round2(placeP.z),
    yaw: +game.placeYaw.toFixed(3),
  });
  sfx(880, 0.05, 'triangle', 0.06);
  setTimeout(renderSpawn, 150);
}

export function updateGhost() {
  const want = spawnOpen && game.placing && !['undo', 'clear'].includes(game.placing) ? game.placing : null;
  if (want !== ghostKind) {
    if (ghost) {
      scene.remove(ghost);
      ghost = null;
    }
    ghostKind = want;
    if (want) {
      ghost = PROP_DEFS[want] ? propMesh(want) : gadgetMesh(want);
      ghost.traverse((o) => {
        if (o.material) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = Math.min(o.material.opacity, 0.45);
          o.material.depthWrite = false;
        }
        o.castShadow = false;
      });
    }
  }
  if (!ghost) return;
  const ok = cursorWorld(placeP);
  ghost.visible = !!ok;
  if (!ok) return;
  if (PROP_DEFS[ghostKind]) ghost.position.set(placeP.x, placeP.y + 0.6, placeP.z);
  else {
    const b = boxUnder(placeP.x, placeP.z, placeP.y + 0.3);
    ghost.position.set(placeP.x, b ? Math.max(b.max.y, placeP.y - 0.05) : placeP.y, placeP.z);
  }
  ghost.rotation.y = game.placeYaw;
}

// ---------- free camera ----------
export const fly = { on: false, pos: new V3(), yaw: 0, pitch: -0.5, speed: 12 };

export function toggleFly() {
  if (!isSandbox() && !fly.on) return;
  fly.on = !fly.on;
  if (fly.on) {
    fly.pos.copy(camera.position);
    const d = new V3();
    camera.getWorldDirection(d);
    fly.yaw = Math.atan2(d.x, d.z);
    fly.pitch = Math.asin(clamp(d.y, -1, 1));
  }
  sfx(fly.on ? 700 : 500, 0.07, 'sine', 0.06);
}

function flyDir() {
  return new V3(
    Math.sin(fly.yaw) * Math.cos(fly.pitch),
    Math.sin(fly.pitch),
    Math.cos(fly.yaw) * Math.cos(fly.pitch)
  );
}

export function updateFly(dt) {
  const f = flyDir(),
    fh = new V3(Math.sin(fly.yaw), 0, Math.cos(fly.yaw)),
    rt = new V3(-fh.z, 0, fh.x);
  const m = new V3();
  if (isActionDown('up') || isKeyDown('ArrowUp')) m.add(f);
  if (isActionDown('down') || isKeyDown('ArrowDown')) m.sub(f);
  if (isActionDown('right') || isKeyDown('ArrowRight')) m.add(rt);
  if (isActionDown('left') || isKeyDown('ArrowLeft')) m.sub(rt);
  if (isActionDown('jump')) m.y += 1;
  if (isKeyDown('ShiftLeft') || isKeyDown('ControlLeft')) m.y -= 1;
  if (m.lengthSq() > 0) fly.pos.addScaledVector(m.normalize(), fly.speed * dt);
  fly.pos.y = clamp(fly.pos.y, -10, 90);
  camera.position.copy(fly.pos);
  camera.lookAt(fly.pos.clone().add(f));
  const fp = fly.pos.clone().addScaledVector(f, 14);
  fp.y = Math.max(0, Math.min(fp.y, fly.pos.y));
  sun.position.set(fp.x + 9, fp.y + 22, fp.z + 8);
  sun.target.position.copy(fp);
}

export function resetSandboxUI() {
  wwOpen = false;
  spawnOpen = false;
  game.placing = null;
  fly.on = false;
  renderWW();
  renderSpawn();
  updateGhost();
}

/** Free-camera mouse look + scroll speed. Installed by main.js after the main input listeners. */
export function installSandboxPointerListeners() {
  addEventListener('mousemove', (e) => {
    if (fly.on && mouse.right) {
      fly.yaw -= e.movementX * 0.005;
      fly.pitch = clamp(fly.pitch - e.movementY * 0.005, -1.45, 1.45);
    }
    wwMove();
  });
  addEventListener(
    'wheel',
    (e) => {
      if (fly.on) fly.speed = clamp(fly.speed * (e.deltaY > 0 ? 0.85 : 1.18), 3, 60);
    },
    { passive: true }
  );
}
