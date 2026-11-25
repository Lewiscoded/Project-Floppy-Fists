/**
 * World state: collision boxes (BOXES), spawn points, the current theme/map, boxUnder() and loadMap().
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { bodies } from '../game/bodies.js';
import { clearProps } from '../game/props.js';
import { WEAPONS } from '../game/weapons.js';
import { hemi, renderer, scene, skyMat, sun } from '../render/renderer.js';
import { THEMES } from './maps/index.js';

export let animated = [];
game.grassMesh = null;

export const BOXES = [];
export let SPAWNS = [[0, 0]];
export let THEME = null;
export let mapGroup = null;

export const MAP_KEYS = Object.keys(THEMES);

export const wName = (k) => (THEME && THEME.names[k]) || (WEAPONS[k] ? WEAPONS[k].name : k);

/** Highest collision box under (x, z) whose top is below y. Used for spawning and placing. */
export function boxUnder(x, z, y) {
  let best = null;
  for (const b of BOXES)
    if (
      x > b.min.x &&
      x < b.max.x &&
      z > b.min.z &&
      z < b.max.z &&
      b.max.y < y + 0.6 &&
      (!best || b.max.y > best.max.y)
    )
      best = b;
  return best;
}

mapGroup = new THREE.Group();
scene.add(mapGroup);

export let mapKey = 'kitchen';

/** Clear the current map and build another one by key. */
export function loadMap(key) {
  if (!THEMES[key]) key = 'kitchen';
  mapKey = key;
  THEME = THEMES[key];
  BOXES.length = 0;
  animated = [];
  game.grassMesh = null;
  clearProps();
  for (const c of [...mapGroup.children]) mapGroup.remove(c);
  THEME.build();
  SPAWNS = THEME.spawns;
  const sk = THEME.sky;
  skyMat.uniforms.top.value.setHex(sk.top);
  skyMat.uniforms.hor.value.setHex(sk.hor);
  skyMat.uniforms.bot.value.setHex(sk.bot);
  skyMat.uniforms.sunCol.value.setHex(sk.sun);
  skyMat.uniforms.sunDir.value.set(...sk.dir).normalize();
  scene.background = null;
  scene.fog = new THREE.Fog(THEME.fog[0], THEME.fog[1], THEME.fog[2]);
  renderer.toneMappingExposure = THEME.exposure || 1;
  if (hemi.color) {
    hemi.color.setHex(THEME.hemi[0]);
    hemi.groundColor.setHex(THEME.hemi[1]);
  }
  hemi.intensity = THEME.hemi[2];
  if (sun.color) sun.color.setHex(THEME.sun[0]);
  sun.intensity = THEME.sun[1];
  for (const b of bodies.values()) b.view.wKey = null;
}
