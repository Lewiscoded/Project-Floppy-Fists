/**
 * Map-building helpers used by the map files: addBox() (solid, collidable), deco() (visual only), flat(),
 * stairs(), torches, fences, signs, and the city backdrop.
 */
import * as THREE from 'three';
import { V3, toCssHex } from '../core/util.js';
import { R90, boxGeo, cone, cylinderGeo, mat, sphereGeo } from '../render/materials.js';
import { worldBox } from '../render/textures.js';
import { BOXES, THEME, animated, mapGroup } from './world.js';

const texFor = (color, o) => {
  if (o.tex !== undefined) return [o.tex, o.ts ?? 2, o.bump ?? 0];
  const t = THEME && THEME.tex && THEME.tex[color];
  return t || [null];
};

// collider box (+ visible mesh unless hidden)
/** Add a solid, collidable box to the map (and its mesh). Coordinates are min x/y/z then max x/y/z. */
export function addBox(minx, miny, minz, maxx, maxy, maxz, color, o = {}) {
  const b = { min: new V3(minx, miny, minz), max: new V3(maxx, maxy, maxz), bound: !!o.bound };
  BOXES.push(b);
  if (o.hidden) return b;
  const [tn, ts, tb] = texFor(color, o);
  const geo = tn
    ? worldBox(maxx - minx, maxy - miny, maxz - minz, ts)
    : boxGeo(maxx - minx, maxy - miny, maxz - minz);
  const m = new THREE.Mesh(geo, mat(color, { ...o, tex: tn, bump: tb }));
  m.position.set((minx + maxx) / 2, (miny + maxy) / 2, (minz + maxz) / 2);
  m.castShadow = o.opacity === undefined;
  m.receiveShadow = true;
  mapGroup.add(m);
  if (o.edges) {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry),
      new THREE.LineBasicMaterial({ color: o.edges })
    );
    e.position.copy(m.position);
    mapGroup.add(e);
  }
  return b;
}

// visual-only mesh
/** Add a visual-only mesh to the map (no collision). */
export function deco(geo, color, x, y, z, o = {}) {
  const m = new THREE.Mesh(geo, mat(color, o));
  m.position.set(x, y, z);
  if (o.cast === false) m.castShadow = false;
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.set(...o.s);
  if (o.cast !== false) m.castShadow = o.shadow !== false;
  m.receiveShadow = true;
  mapGroup.add(m);
  return m;
}

// flat textured decal on the ground (visual only)
export function flat(minx, minz, maxx, maxz, y, color, tn, ts) {
  const m = new THREE.Mesh(worldBox(maxx - minx, 0.03, maxz - minz, ts), mat(color, { tex: tn, bump: 0.02 }));
  m.position.set((minx + maxx) / 2, y + 0.015, (minz + maxz) / 2);
  m.receiveShadow = true;
  mapGroup.add(m);
  return m;
}

// flickering torch: post + glowing flame
export function torch(x, y, z) {
  deco(cylinderGeo(0.06, 0.08, 1.1), 0x5a3a1a, x, y + 0.55, z);
  deco(cylinderGeo(0.14, 0.1, 0.18), 0x333333, x, y + 1.15, z, { metal: 0.6 });
  const f = deco(cone(0.13, 0.38, 8), 0xff9a2a, x, y + 1.42, z, { emissive: 0xff6a00, ei: 3, cast: false });
  const f2 = deco(cone(0.07, 0.22, 8), 0xfff0a0, x, y + 1.38, z, { emissive: 0xffe08a, ei: 4, cast: false });
  const ph = Math.random() * 9;
  animated.push((t) => {
    const k = 1 + Math.sin(t * 13 + ph) * 0.12 + Math.sin(t * 7.3 + ph) * 0.08;
    f.scale.set(1, k, 1);
    f2.scale.set(1, k * 1.1, 1);
    f.material.emissiveIntensity = 2.6 + Math.sin(t * 17 + ph) * 0.6;
  });
}

// stairs that end at (ax,az) on a ledge of height h, coming from direction (dx,dz)
export function stairs(ax, az, dx, dz, width, h, color, base = 0) {
  const n = Math.ceil(h / 0.15),
    rise = h / n,
    d = 0.3;
  for (let k = 1; k <= n; k++) {
    const a = (n - k) * d,
      b = (n - k + 1) * d;
    if (dx) {
      const x1 = ax + dx * a,
        x2 = ax + dx * b;
      addBox(
        Math.min(x1, x2),
        base,
        az - width / 2,
        Math.max(x1, x2),
        base + k * rise,
        az + width / 2,
        color
      );
    } else {
      const z1 = az + dz * a,
        z2 = az + dz * b;
      addBox(
        ax - width / 2,
        base,
        Math.min(z1, z2),
        ax + width / 2,
        base + k * rise,
        Math.max(z1, z2),
        color
      );
    }
  }
}

function cityBelow(cols) {
  const geo = boxGeo(1, 1, 1);
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2,
      r = 30 + Math.random() * 80,
      w = 4 + Math.random() * 7,
      h = 30 + Math.random() * 30,
      top = -10 - Math.random() * 30;
    const m = new THREE.Mesh(
      worldBox(w, h, w, 6),
      mat(cols[i % cols.length], { rough: 0.6, tex: 'windows', env: 0.9 })
    );
    m.position.set(Math.cos(a) * r, top - h / 2, Math.sin(a) * r);
    mapGroup.add(m);
  }
}

function cloudsBelow(n, ymin) {
  const cm = mat(0xffffff, { rough: 1, env: 0.2, emissive: 0xffffff, ei: 0.15 });
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(sphereGeo(2 + Math.random() * 2, 10), cm);
      s.position.set(k * 2.4 - 3.6, Math.random(), Math.random() * 1.5);
      c.add(s);
    }
    const a = Math.random() * Math.PI * 2,
      r = 40 + Math.random() * 60;
    c.scale.y = 0.5;
    c.position.set(Math.cos(a) * r, ymin - Math.random() * 20, Math.sin(a) * r);
    mapGroup.add(c);
  }
}

export function signBoard(text, x, y, z, w, h, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = toCssHex(bg);
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = toCssHex(fg);
  g.font = `bold ${Math.round(c.height * 0.62)}px "Lilita One", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = deco(boxGeo(w, h, 0.12), bg, x, y, z, { emissive: bg, ei: 0.35 });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.98, h * 0.95),
    new THREE.MeshStandardMaterial({
      map: t,
      emissive: 0xffffff,
      emissiveMap: t,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    })
  );
  face.position.set(x, y, z + 0.065);
  mapGroup.add(face);
  const back = face.clone();
  back.rotation.y = Math.PI;
  back.position.z = z - 0.065;
  mapGroup.add(back);
  return m;
}

export function cityAround() {
  const cols = [0xa8553f, 0x8f4a3a, 0xb07a5a, 0x7a6a5a, 0x9a8f84, 0xc9b8a0, 0x6f7d8f];
  const bld = (x0, z0, x1, z1, h, c) => {
    const m = new THREE.Mesh(worldBox(x1 - x0, h, z1 - z0, 4), mat(c, { tex: 'windows', rough: 0.7 }));
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = true;
    mapGroup.add(m);
    deco(boxGeo(x1 - x0 + 0.3, 0.4, z1 - z0 + 0.3), 0x55504a, (x0 + x1) / 2, h + 0.2, (z0 + z1) / 2, {
      cast: false,
    });
  };
  let i = 0;
  for (let x = -44; x < 44; ) {
    const w = 6 + ((i * 37) % 5);
    bld(x, -34, x + w, -21, 9 + ((i * 53) % 9), cols[i % cols.length]);
    x += w;
    i++;
  }
  for (const [x0, x1] of [
    [-44, -27.5],
    [27.5, 44],
  ])
    for (const [z0, z1] of [
      [-21, -3.5],
      [3.5, 20],
    ]) {
      let z = z0;
      while (z < z1) {
        const w = Math.min(6 + ((i * 29) % 4), z1 - z);
        bld(x0, z, x1, z + w, 7 + ((i * 41) % 8), cols[i % cols.length]);
        z += w;
        i++;
      }
    }
  // low wall + hedges on the south edge so the camera can see over them
  deco(boxGeo(55, 1, 1), 0x9aa0a8, 0, 0.5, 21, { tex: 'concrete' });
  for (let x = -24; x <= 24; x += 3) deco(sphereGeo(0.7, 10), 0x3f7a3a, x, 1.3, 21.2, { rough: 0.9 });
  // skyline further out
  for (let k = 0; k < 70; k++) {
    const a = Math.random() * Math.PI * 2,
      r = 60 + Math.random() * 120,
      w = 8 + Math.random() * 12,
      h = 18 + Math.random() * 55;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (Math.abs(z) < 8 && Math.abs(x) > 40) continue;
    const m = new THREE.Mesh(
      worldBox(w, h, w, 6),
      mat(cols[k % cols.length], { tex: 'windows', rough: 0.6, env: 0.8 })
    );
    m.position.set(x, h / 2, z);
    mapGroup.add(m);
  }
}

let chainTex = null;

export function fence(x1, z1, x2, z2, h) {
  const L = Math.hypot(x2 - x1, z2 - z1),
    alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  if (alongX) addBox(Math.min(x1, x2), 0, z1 - 0.06, Math.max(x1, x2), h, z1 + 0.06, 0, { hidden: true });
  else addBox(x1 - 0.06, 0, Math.min(z1, z2), x1 + 0.06, h, Math.max(z1, z2), 0, { hidden: true });
  if (!chainTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = '#c8ccd2';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(64, 64);
    g.moveTo(64, 0);
    g.lineTo(0, 64);
    g.moveTo(32, -32);
    g.lineTo(96, 32);
    g.moveTo(-32, 32);
    g.lineTo(32, 96);
    g.stroke();
    chainTex = new THREE.CanvasTexture(c);
    chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
  }
  const t = chainTex.clone();
  t.needsUpdate = true;
  t.repeat.set(L / 0.5, h / 0.5);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(L, h),
    new THREE.MeshStandardMaterial({
      map: t,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      metalness: 0.6,
      roughness: 0.4,
    })
  );
  m.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
  if (!alongX) m.rotation.y = R90;
  m.castShadow = true;
  mapGroup.add(m);
  for (let i = 0; i <= Math.ceil(L / 3); i++) {
    const f = i / Math.ceil(L / 3);
    deco(cylinderGeo(0.05, 0.05, h + 0.1, 8), 0x9aa0a8, x1 + (x2 - x1) * f, h / 2, z1 + (z2 - z1) * f, {
      metal: 0.7,
    });
  }
  deco(
    cylinderGeo(0.04, 0.04, L, 8),
    0x9aa0a8,
    (x1 + x2) / 2,
    h,
    (z1 + z2) / 2,
    alongX ? { rz: R90, metal: 0.7 } : { rx: R90, metal: 0.7 }
  );
}
