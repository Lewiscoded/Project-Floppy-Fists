/**
 * Tiny shared helpers: DOM lookup ($), Vector3 alias (V3), clamp, timing, rounding and HTML escaping.
 */
import * as THREE from 'three';

export const $ = (id) => document.getElementById(id);

export const V3 = THREE.Vector3;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const now = () => performance.now();

export const toCssHex = (c) => '#' + new THREE.Color(c).getHexString();

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const round2 = (v) => Math.round(v * 100) / 100;
