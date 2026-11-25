/**
 * Map thumbnails and the Choose Map screen.
 */
import { game } from '../core/state.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { $, escapeHtml } from '../core/util.js';
import { bodies, localBodies } from '../game/bodies.js';
import { respawn } from '../game/match.js';
import { projs } from '../game/projectiles.js';
import { spawnMapProps } from '../game/props.js';
import { WEAPONS } from '../game/weapons.js';
import { broadcastLobby, isHost, net } from '../net/network.js';
import { camera, renderer, scene, skyDome, sun } from '../render/renderer.js';
import { THEMES } from '../world/maps/index.js';
import { MAP_KEYS, animated, loadMap, mapKey } from '../world/world.js';

// ---------- maps ----------
const thumbs = {};

let thumbsDone = false;

export function genThumbs() {
  if (thumbsDone) return;
  thumbsDone = true;
  const keep = mapKey,
    hidden = [];
  for (const b of bodies.values()) {
    if (b.view.g.visible) {
      b.view.g.visible = false;
      hidden.push(b);
    }
  }
  const fx0 = [...projs.values()].map((q) => q.mesh);
  for (const m of fx0) m.visible = false;
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 270;
  const g = c.getContext('2d');
  const oldPos = camera.position.clone(),
    oldAsp = camera.aspect;
  for (const k of MAP_KEYS) {
    loadMap(k);
    const pv = THEMES[k].preview || { pos: [0, 16, 26], look: [0, 0, 0] };
    camera.position.set(...pv.pos);
    camera.lookAt(...pv.look);
    skyDome.position.copy(camera.position);
    sun.position.set(9, 22, 8);
    sun.target.position.set(0, 0, 0);
    sun.target.updateMatrixWorld();
    for (const f of animated) f(1, 0);
    renderer.render(scene, camera);
    // crop the canvas to 16:9 around the center
    const W = renderer.domElement.width,
      H = renderer.domElement.height,
      ar = 16 / 9;
    let sw = W,
      sh = W / ar;
    if (sh > H) {
      sh = H;
      sw = H * ar;
    }
    g.drawImage(renderer.domElement, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 480, 270);
    try {
      thumbs[k] = c.toDataURL('image/jpeg', 0.82);
    } catch (e) {}
  }
  loadMap(keep);
  camera.position.copy(oldPos);
  camera.aspect = oldAsp;
  if (game.state === 'menu' || (game.state === 'play' && isHost())) spawnMapProps();
  for (const b of hidden) b.view.g.visible = true;
  for (const m of fx0) m.visible = true;
  renderMaps();
  if (!$('mapScreen').classList.contains('hidden')) renderMapGrid();
}

const weaponChips = (k) => {
  const t = THEMES[k];
  return ['bat', 'sword', 'pistol', 'shotgun', 'rifle', 'rocket', 'grenade']
    .map((w) => `<span>${escapeHtml(t.names[w] || WEAPONS[w].name)}</span>`)
    .join('');
};

function curMapCard(k, canChange) {
  const t = THEMES[k];
  return `<div class="thumb" style="background-image:${thumbs[k] ? `url(${thumbs[k]})` : 'none'}"></div><div class="grow"><small style="font-weight:800;color:#6b7486;font-size:12px">MAP</small><b>${t.icon} ${t.name}</b><span>${t.tag}</span></div>${canChange ? '<button class="blue mapOpen">Choose map ▸</button>' : ''}`;
}

export function renderMaps() {
  $('maps').innerHTML = curMapCard(prefs.map, true);
  $('lmaps').innerHTML = curMapCard(game.match.map, isHost());
  for (const b of document.querySelectorAll('.mapOpen')) b.onclick = openMapScreen;
}

let mapScreenFor = 'menu';

function renderMapGrid() {
  const sel = game.state === 'lobby' ? game.match.map : prefs.map;
  $('mapNote').textContent =
    game.state === 'lobby'
      ? 'Everyone in the room will play on the map you pick.'
      : 'This map is used for Practice and for rooms you host.';
  $('mapGrid').innerHTML = MAP_KEYS.map((k) => {
    const t = THEMES[k];
    return `<div class="mcard ${k === sel ? 'sel' : ''}" data-k="${k}"><div class="thumb" style="background-image:${thumbs[k] ? `url(${thumbs[k]})` : 'none'}"><em>${t.icon}</em>${k === sel ? '<i>Selected</i>' : ''}</div>
      <div class="body"><b>${t.name}</b><p>${t.tag}</p><div class="chips">${weaponChips(k)}</div></div></div>`;
  }).join('');
}

function openMapScreen() {
  if (game.state === 'lobby' && !isHost()) return;
  renderMapGrid();
  $('mapScreen').classList.remove('hidden');
  if (!thumbsDone) setTimeout(genThumbs, 30);
}

function closeMapScreen() {
  $('mapScreen').classList.add('hidden');
}

$('mapClose').onclick = closeMapScreen;

$('mapGrid').addEventListener('click', (e) => {
  const c = e.target.closest('.mcard');
  if (!c) return;
  chooseMap(c.dataset.k);
  renderMapGrid();
  setTimeout(closeMapScreen, 180);
});

export function chooseMap(k) {
  if (!THEMES[k]) return;
  if (game.state === 'lobby') {
    if (!isHost()) return;
    game.match.map = k;
    prefs.map = k;
    savePrefs();
    if (k !== mapKey) loadMap(k);
    broadcastLobby();
    renderMaps();
    return;
  }
  if (game.state === 'menu') {
    prefs.map = k;
    savePrefs();
    if (k !== mapKey) {
      loadMap(k);
      for (const b of localBodies()) respawn(b);
      spawnMapProps();
    }
    renderMaps();
    return;
  }
  if (game.state === 'play' && isHost() && net.mode === 'off') {
    game.match.map = k;
    loadMap(k);
    for (const b of localBodies()) respawn(b);
    spawnMapProps();
  }
}

/** Escape closes the map picker. Installed by main.js after the main keyboard handler. */
export function installMapScreenEscape() {
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !$('mapScreen').classList.contains('hidden')) closeMapScreen();
  });
}
