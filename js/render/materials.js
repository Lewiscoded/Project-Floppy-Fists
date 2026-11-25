/**
 * Material + geometry shorthands used everywhere: mat(), boxGeo(), cylinderGeo(), sphereGeo(), cone(), R90.
 */
import * as THREE from 'three';
import { getTexture } from './textures.js';

export const R90 = Math.PI / 2;

export const boxGeo = (x, y, z) => new THREE.BoxGeometry(x, y, z),
  cylinderGeo = (a, b, l, s = 14) => new THREE.CylinderGeometry(a, b, l, s),
  sphereGeo = (r, s = 14) => new THREE.SphereGeometry(r, s, Math.max(8, s - 4)),
  cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);

export function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.8,
    metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0,
    emissiveIntensity: o.ei ?? 1,
    transparent: o.opacity !== undefined,
    opacity: o.opacity ?? 1,
    envMapIntensity: o.env ?? 0.6,
  });
  if (o.tex) {
    m.map = getTexture(o.tex);
    if (o.bump) {
      m.bumpMap = m.map;
      m.bumpScale = o.bump;
    }
  }
  return m;
}
