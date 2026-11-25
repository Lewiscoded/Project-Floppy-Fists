/**
 * The character customization screen with its live 3D preview.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { game } from '../core/state.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { $, V3, toCssHex } from '../core/util.js';
import { localPlayer } from '../game/bodies.js';
import { COLORS, HEAD, LHAND, REST, RHAND } from '../game/constants.js';
import { CLOTH, DEF_OUTFIT, FACES, HATS, randomOutfit } from '../game/outfits.js';
import { RagView } from '../render/fighter-visuals.js';
import { menuIsOpen, renderSwatches } from './menu.js';

// ---------- customize ----------
export let prev = null,
  prevDrag = null;

function makePreview() {
  const cv = $('prevCanvas');
  let rr;
  try {
    rr = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  } catch (e) {
    return null;
  }
  rr.setPixelRatio(Math.min(devicePixelRatio, 2));
  rr.setSize(300, 375, false);
  rr.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(rr);
  sc.environment = pm.fromScene(new RoomEnvironment(rr), 0.04).texture;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 0.8));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2);
  dl.position.set(2, 4, 5);
  sc.add(dl);
  const cam = new THREE.PerspectiveCamera(28, 300 / 375, 0.1, 50);
  cam.position.set(0, 1.05, 5.2);
  cam.lookAt(0, 0.95, 0);
  const fake = {
    id: 'preview',
    name: '',
    col: prefs.col,
    hp: 100,
    dead: false,
    stun: 0,
    prot: 0,
    blocking: false,
    punchT: 0,
    recoilT: 0,
    msgT: 0,
    bubble: null,
    weapon: 'fists',
    outfit: prefs.outfit,
    pos: REST.map((r) => new V3(r[0], r[1], r[2])),
    vel: REST.map(() => new V3()),
    fwd: new V3(0, 0, 1),
    f3: new V3(0, 0.15, 1).normalize(),
    aim: new V3(0, 0, 1),
  };
  const view = new RagView(fake, sc);
  let t = 0;
  return {
    render(dt) {
      t += dt;
      fake.col = prefs.col;
      fake.outfit = prefs.outfit;
      // gentle idle sway
      const k = Math.sin(t * 2) * 0.03;
      fake.pos[LHAND].set(-0.45, 0.8 + k, 0.12);
      fake.pos[RHAND].set(0.45, 0.8 - k, 0.12);
      fake.pos[HEAD].y = 1.78 + Math.sin(t * 2.4) * 0.01;
      view.update(fake, dt);
      view.label.visible = false;
      view.stars.visible = false;
      if (!prevDrag) view.g.rotation.y += dt * 0.5;
      rr.render(sc, cam);
    },
    view,
  };
}

$('prevCanvas').addEventListener('pointerdown', (e) => {
  prevDrag = { x: e.clientX };
  e.target.setPointerCapture(e.pointerId);
});

$('prevCanvas').addEventListener('pointermove', (e) => {
  if (!prevDrag || !prev) return;
  prev.view.g.rotation.y += (e.clientX - prevDrag.x) * 0.012;
  prevDrag.x = e.clientX;
});

$('prevCanvas').addEventListener('pointerup', () => {
  prevDrag = null;
});

function renderCustom() {
  const o = prefs.outfit;
  const btns = (key, list) =>
    `<div class="copt">${list.map(([v, l]) => `<button data-k="${key}" data-v="${v}" class="${o[key] === v ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
  const sw = (key, list, noneLabel) =>
    `<div class="copt">${list.map((c) => `<span class="cswatch ${o[key] === c ? 'sel' : ''}" data-k="${key}" data-c="${c}" style="background:${c < 0 ? 'repeating-linear-gradient(45deg,#fff,#fff 4px,#e2e7ef 4px,#e2e7ef 8px)' : toCssHex(c)}">${c < 0 ? noneLabel : ''}</span>`).join('')}</div>`;
  $('copts').innerHTML =
    `<div class="crow"><h4>Body color</h4><div class="copt">${COLORS.map((c) => `<span class="cswatch ${prefs.col === c ? 'sel' : ''}" data-body="${c}" style="background:${toCssHex(c)}"></span>`).join('')}</div></div>` +
    `<div class="crow"><h4>Hat</h4>${btns('hat', HATS)}${['cap', 'beanie', 'tophat', 'party'].includes(o.hat) ? `<div style="margin-top:6px">${sw('hatCol', CLOTH.slice(1), '')}</div>` : ''}</div>` +
    `<div class="crow"><h4>Face</h4>${btns('face', FACES)}</div>` +
    `<div class="crow"><h4>Shirt</h4>${sw('shirt', CLOTH, '✕')}<div style="margin-top:6px">${btns('sleeves', [
      ['short', 'Short sleeves'],
      ['long', 'Long sleeves'],
    ])}</div></div>` +
    `<div class="crow"><h4>Pants</h4>${sw('pants', CLOTH, '✕')}<div style="margin-top:6px">${btns('legs', [
      ['long', 'Pants'],
      ['shorts', 'Shorts'],
    ])}</div></div>`;
}

$('copts').addEventListener('click', (e) => {
  const t = e.target.closest('[data-k],[data-body]');
  if (!t) return;
  if (t.dataset.body) {
    prefs.col = +t.dataset.body;
    renderSwatches();
    const me = localPlayer();
    if (me) me.col = prefs.col;
  } else {
    const k = t.dataset.k;
    prefs.outfit = { ...prefs.outfit, [k]: t.dataset.c !== undefined ? +t.dataset.c : t.dataset.v };
  }
  savePrefs();
  applyMyOutfit();
  renderCustom();
});

function applyMyOutfit() {
  const me = localPlayer();
  if (me) me.outfit = { ...prefs.outfit };
}

$('custRandom').onclick = () => {
  prefs.outfit = randomOutfit();
  savePrefs();
  applyMyOutfit();
  renderCustom();
};

$('custReset').onclick = () => {
  prefs.outfit = { ...DEF_OUTFIT };
  savePrefs();
  applyMyOutfit();
  renderCustom();
};

function openCustom() {
  renderCustom();
  $('custom').classList.remove('hidden');
  game.menuOpen = true;
  if (!prev) prev = makePreview();
}

export function closeCustom() {
  $('custom').classList.add('hidden');
  game.menuOpen = menuIsOpen();
}

$('custClose').onclick = closeCustom;

for (const b of document.querySelectorAll('.custBtn'))
  b.onclick = () => {
    $('pause').classList.add('hidden');
    openCustom();
  };

/** Escape closes the customize screen. Installed by main.js after the main keyboard handler. */
export function installCustomizeEscape() {
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !$('custom').classList.contains('hidden')) closeCustom();
  });
}
