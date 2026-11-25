/**
 * Castle Siege: a castle with a moat, drawbridge and an open field. (Internal map key: "medieval".)
 */
import * as THREE from 'three';
import { game } from '../../core/state.js';
import { V3 } from '../../core/util.js';
import { R90, boxGeo, cone, cylinderGeo, mat, sphereGeo } from '../../render/materials.js';
import { quality } from '../../render/renderer.js';
import { addBox, deco, flat, stairs, torch } from '../builders.js';
import { animated, boxUnder, mapGroup } from '../world.js';

export const medieval = {
  preview: { pos: [4, 17, 30], look: [0, 0, -3] },
  name: 'Castle Siege',
  icon: '🏰',
  tag: 'A castle on solid ground: moat, drawbridge, keep and battlements. Hold the gate.',
  sky: { top: 0x5d78c0, hor: 0xffbf8f, bot: 0xa07a70, sun: 0xffd090, dir: [0.35, 0.1, -1] },
  fog: [0xf3c4a0, 55, 190],
  hemi: [0xffe2c8, 0x6a5a4a, 0.75],
  sun: [0xffc890, 2.5],
  exposure: 1.02,
  tex: {
    0x9b958c: ['brick', 2.2, 0.03],
    0x8a847b: ['brick', 2.2, 0.03],
    0x7fa65a: ['grass', 5, 0],
    0x8b5a32: ['wood', 2, 0.012],
    0x8a8a7a: ['cobble', 3, 0.03],
    0xd9b44a: ['hay', 1.2, 0.02],
    0x7a4a26: ['wood', 1.2, 0.01],
  },
  dust: 0xb89a70,
  spawns: [
    [0, 0],
    [-12, 0],
    [12, 0],
    [0, 14],
    [-14, 14],
    [14, 14],
    [10, -6],
    [-12, -6],
    [0, 37],
    [16, -2],
    [-14, 38],
    [14, 38],
  ],
  props: [
    ['barrel', -6, 8],
    ['barrel', -5, 9],
    ['xbarrel', 14, -2],
    ['crate', 6, -4],
    ['crate', 7, -4],
    ['ball', 0, 6],
    ['pin', 10.3, 4],
    ['pin', 10.7, 4.3],
    ['pin', 9.9, 4.3],
    ['pin', 10.3, 4.6],
    ['crate', -16, -4],
  ],
  names: {
    fists: 'Gauntlets',
    bat: 'Mace',
    sword: 'Longsword',
    pistol: 'Hand Crossbow',
    shotgun: 'Blunderbuss',
    rifle: 'Repeater Crossbow',
    rocket: 'Hand Cannon',
    grenade: 'Firepots',
    sledge: 'War Hammer',
    minigun: 'Organ Gun',
    cluster: 'Scatter Pot',
    grapple: 'Grappling Hook',
    gravglove: 'Wizard Gauntlet',
    blower: 'Bellows',
    banana: 'Royal Banana Peel',
    springtrap: 'Catapult Pad',
    mine: 'Rune Trap',
    flame: 'Dragon Breath',
    freeze: 'Frost Wand',
    shrink: 'Shrinking Wand',
    slap: 'Duel Glove',
    pie: 'Pie Trebuchet',
    boxglove: 'Jousting Glove',
  },
  tracer: { pistol: 0x8b5a2b, shotgun: 0xffd27a, rifle: 0x8b5a2b },
  boom: { rocket: [0xffe2a0, 0xff6a1a, 0x6b6b6b], grenade: [0xffb347, 0xff4500, 0x553322] },
  build() {
    const stone = 0x9b958c,
      stone2 = 0x8a847b,
      wood = 0x8b5a32;
    // solid ground: castle grounds, a moat in front of the gate, open field beyond
    addBox(-70, -2, -70, 70, 0, 24, 0x7fa65a);
    addBox(-70, -2, 32, 70, 0, 80, 0x7fa65a);
    addBox(-70, -2, 24, 70, -0.9, 32, 0x6b5a40, { tex: 'cobble', ts: 3 });
    {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(140, 8),
        new THREE.MeshStandardMaterial({
          color: 0x3f86a8,
          transparent: true,
          opacity: 0.72,
          roughness: 0.15,
          metalness: 0.1,
          emissive: 0x0a2a3a,
          emissiveIntensity: 0.4,
        })
      );
      w.rotation.x = -R90;
      w.position.set(0, -0.38, 28);
      mapGroup.add(w);
      animated.push((t) => {
        w.material.opacity = 0.68 + Math.sin(t * 1.3) * 0.05;
        w.position.y = -0.38 + Math.sin(t * 0.9) * 0.03;
      });
    }
    for (const z of [24, 32])
      deco(boxGeo(140, 0.22, 0.35), stone2, 0, 0.02, z + (z === 24 ? 0.12 : -0.12), {
        cast: false,
        tex: 'brick',
      });
    for (const x of [-14, 14]) {
      stairs(x, 24, 0, 1, 2, 0.9, stone2, -0.9);
      stairs(x, 32, 0, -1, 2, 0.9, stone2, -0.9);
    }
    // invisible walls: along the outside of the castle walls, and around the field
    addBox(-32, 0, -26, 32, 30, -24, 0, { hidden: true, bound: true });
    addBox(-26, 0, -26, -24, 30, 24, 0, { hidden: true, bound: true });
    addBox(30, 0, -26, 32, 30, 46, 0, { hidden: true, bound: true });
    addBox(-32, 0, 24, -30, 30, 46, 0, { hidden: true, bound: true });
    addBox(-32, 0, 44, 32, 30, 46, 0, { hidden: true, bound: true });
    // north + west walls with battlements
    addBox(-24, 0, -24, 24, 4, -21, stone);
    for (let x = -23; x <= 23; x += 2) addBox(x - 0.4, 4, -24, x + 0.4, 4.8, -23.3, stone2);
    addBox(-24, 0, -21, -21, 4, 24, stone);
    for (let z = -19; z <= 23; z += 2) addBox(-24, 4, z - 0.4, -23.3, 4.8, z + 0.4, stone2);
    stairs(12, -21, 0, 1, 2.4, 4, stone2);
    stairs(-21, 10, 1, 0, 2.4, 4, stone2);
    // corner tower
    addBox(-27, 0, -27, -19, 8, -19, stone2);
    deco(cone(5.8, 4, 4), 0x8a2a2a, -23, 10, -23, { ry: Math.PI / 4 });
    // the keep
    addBox(-6, 0, -16, 6, 6, -9, stone);
    deco(cone(8.8, 4, 4), 0x8a2a2a, 0, 8, -12.5, { ry: Math.PI / 4, s: [1, 1, 0.6] });
    deco(boxGeo(2, 3, 0.1), 0x3a2616, 0, 1.5, -8.94);
    for (const x of [-4, 4]) deco(boxGeo(1.2, 2.4, 0.08), 0xc0392b, x, 3.6, -8.93);
    // south gate + drawbridge + outer platform
    addBox(-5, 0, 20, -2.5, 5.5, 24, stone);
    addBox(2.5, 0, 20, 5, 5.5, 24, stone);
    addBox(-2.5, 4.5, 20, 2.5, 5.5, 24, stone);
    addBox(-2.2, -0.3, 24, 2.2, 0, 32, wood, { edges: 0x5a3a1a });
    for (const x of [-2, 2]) deco(cylinderGeo(0.05, 0.05, 9), 0x333333, x, 3, 28, { rx: -1.1 });
    flat(-8, 33, 8, 41, 0, 0xb8b0a4, 'cobble', 2.5);
    addBox(-5, 0, 36, -3.8, 1.2, 37.2, wood, { edges: 0x5a3a1a });
    addBox(3, 0, 34, 4.2, 1.2, 35.2, wood, { edges: 0x5a3a1a });
    // broken east wall
    addBox(21, 0, -18, 24, 2, -12, stone);
    addBox(21, 0, 6, 24, 1.2, 10, stone);
    // well, hay, stalls, barrels
    addBox(7, 0, 4, 9, 1, 6, stone2);
    for (const [x, z] of [
      [7.1, 4.1],
      [8.9, 5.9],
    ])
      deco(boxGeo(0.15, 1.6, 0.15), wood, x, 1.8, z);
    deco(cone(1.7, 0.9, 4), 0x8a2a2a, 8, 2.9, 5, { ry: Math.PI / 4 });
    for (const [x, z] of [
      [-8, 4],
      [-6.4, 4],
      [-7.2, 4, 1],
      [14, -12],
      [16, 16],
      [-16, -14],
      [18, 4],
    ])
      addBox(x - 0.8, 0, z - 0.55, x + 0.8, 1.1, z + 0.55, 0xd9b44a, { edges: 0xb08a2a });
    const stall = (x, z, c) => {
      addBox(x - 2, 0, z - 0.75, x + 2, 1, z + 0.75, wood);
      for (const sx of [-1.9, 1.9]) deco(boxGeo(0.12, 2.4, 0.12), wood, x + sx, 1.2, z - 0.6);
      deco(boxGeo(4.4, 0.12, 2), c, x, 2.5, z, { rx: 0.25 });
    };
    stall(-12, 9, 0xd04a4a);
    stall(12, 10, 0x4a7ad0);
    for (const [x, z] of [
      [-18, 0],
      [-17.2, 0.9],
      [18, -8],
      [4, 16],
    ])
      addBox(x - 0.45, 0, z - 0.45, x + 0.45, 1, z + 0.45, 0x7a4a26, { edges: 0x4a2a10 });
    for (const [x, z] of [
      [-60, -50],
      [-20, -80],
      [40, -70],
      [80, -30],
      [-80, 10],
    ])
      deco(cone(22 + Math.random() * 12, 34, 6), 0x8c7aa0, x * 1.4, 15, z * 1.4 - 20, {
        cast: false,
        env: 0.2,
      });
    // cobblestone paths
    flat(-2, -9, 2, 20, 0, 0xb8b0a4, 'cobble', 2.5);
    flat(-14, 2, 14, 6, 0, 0xb8b0a4, 'cobble', 2.5);
    // torches + banners on the walls
    for (const [x, z] of [
      [-3.2, -8.6],
      [3.2, -8.6],
      [-5.5, 19.6],
      [5.5, 19.6],
      [-20.6, 0],
      [-20.6, 14],
      [8, -20.6],
      [-8, -20.6],
    ])
      torch(x, 0, z);
    for (const [i, x] of [-16, -6, 6, 16].entries()) {
      deco(boxGeo(1.4, 2.4, 0.08), i % 2 ? 0x2a4a9a : 0xc0392b, x, 2.6, -20.95);
      deco(boxGeo(0.5, 0.5, 0.09), 0xffd23f, x, 2.9, -20.9);
    }
    // flags on the towers
    for (const [x, y, z] of [
      [-23, 12, -23],
      [0, 10, -12.5],
    ]) {
      deco(cylinderGeo(0.06, 0.06, 3), 0x5a3a1a, x, y, z);
      const f = deco(boxGeo(1.6, 0.9, 0.05), 0xc0392b, x + 0.85, y + 1, z, { cast: false });
      animated.push((t) => {
        f.rotation.y = Math.sin(t * 3 + x) * 0.25;
      });
    }
    // grass tufts (instanced)
    {
      const gm = new THREE.InstancedMesh(cone(0.07, 0.4, 4), mat(0x6f9a46, { rough: 0.9 }), 900);
      const M = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        sc = new V3();
      let n = 0;
      for (let i = 0; i < 4000 && n < 900; i++) {
        const x = (Math.random() - 0.5) * 58,
          z = -23 + Math.random() * 67;
        const u = boxUnder(x, z, 1);
        if (
          !u ||
          u.max.y > 0.01 ||
          u.max.y < -0.01 ||
          (Math.abs(x) < 2.2 && z > -9 && z < 20) ||
          (z > 2 && z < 6 && Math.abs(x) < 14)
        )
          continue;
        q.setFromEuler(
          new THREE.Euler((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5)
        );
        const k = 0.6 + Math.random() * 0.9;
        sc.set(k, k, k);
        M.compose(new V3(x, 0.15 * k, z), q, sc);
        gm.setMatrixAt(n++, M);
      }
      gm.count = n;
      gm.receiveShadow = true;
      mapGroup.add(gm);
      game.grassMesh = gm;
      game.grassMesh.visible = quality === 'high';
    }
    // countryside around the castle: tree lines, a fence round the field, a little village and rolling hills
    const tree = (x, z, k) => {
      deco(cylinderGeo(0.25 * k, 0.35 * k, 2.4 * k, 8), 0x6b4a33, x, 1.2 * k, z);
      deco(cone(1.6 * k, 3.6 * k, 9), 0x3f7a3a, x, 3.6 * k, z, { rough: 0.9 });
      deco(cone(1.25 * k, 2.8 * k, 9), 0x4f8a46, x, 5 * k, z, { rough: 0.9 });
    };
    for (let i = 0; i < 70; i++) {
      const a = i * 2.39996,
        r = 36 + ((i * 37) % 40);
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r * 0.9 - 6;
      if (z > 24 || (Math.abs(x) < 34 && z > -28)) continue;
      tree(x, z, 1 + ((i * 13) % 7) / 8);
    }
    for (let x = -29; x <= 29; x += 2.5) {
      deco(boxGeo(0.15, 1.1, 0.15), 0x7a5a3a, x, 0.55, 44.6, { cast: false });
    }
    deco(boxGeo(58, 0.1, 0.08), 0x8b6a42, 0, 0.95, 44.6, { cast: false });
    deco(boxGeo(58, 0.1, 0.08), 0x8b6a42, 0, 0.5, 44.6, { cast: false });
    for (let z = -22; z <= 44; z += 2.5)
      deco(boxGeo(0.15, 1.1, 0.15), 0x7a5a3a, 29.6, 0.55, z, { cast: false });
    deco(boxGeo(0.08, 0.1, 66), 0x8b6a42, 29.6, 0.95, 11, { cast: false });
    deco(boxGeo(0.08, 0.1, 66), 0x8b6a42, 29.6, 0.5, 11, { cast: false });
    for (const [x, z, c] of [
      [44, -34, 0xe8dcc0],
      [52, -28, 0xd9c7a0],
      [48, -44, 0xe8dcc0],
      [-46, -38, 0xd9c7a0],
      [-54, -30, 0xe8dcc0],
    ]) {
      deco(boxGeo(5, 3.4, 4), c, x, 1.7, z);
      deco(cone(4, 2.6, 4), 0x8a3a2a, x, 4.7, z, { ry: Math.PI / 4, s: [1, 1, 0.8] });
      deco(boxGeo(0.9, 1.6, 0.1), 0x5a3a1a, x, 0.8, z + 2.02);
    }
    for (const [x, z, r] of [
      [-30, -75, 40],
      [35, -85, 48],
      [0, -110, 60],
      [-80, -60, 45],
      [85, -55, 50],
    ]) {
      const h = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(0x6f9a4a, { rough: 1, env: 0.2 })
      );
      h.scale.y = 0.32;
      h.position.set(x, -1, z);
      mapGroup.add(h);
    }
  },
  meshes: {
    bat: (a) => {
      a(cylinderGeo(0.035, 0.035, 0.6), 0x6b4a2a, 0, 0, 0.3, R90);
      a(new THREE.OctahedronGeometry(0.17), 0x6a6e75, 0, 0, 0.66);
      a(sphereGeo(0.11), 0x55595f, 0, 0, 0.66);
    },
    sword: (a) => {
      a(boxGeo(0.07, 0.02, 1.15), 0xdfe6ee, 0, 0, 0.68);
      a(boxGeo(0.34, 0.05, 0.05), 0xc8a24a, 0, 0, 0.08);
      a(boxGeo(0.04, 0.04, 0.18), 0x5a3a1a, 0, 0, -0.04);
      a(sphereGeo(0.04), 0xc8a24a, 0, 0, -0.15);
    },
    pistol: (a) => {
      a(boxGeo(0.06, 0.07, 0.35), 0x8b5a32, 0, 0, 0.12);
      a(boxGeo(0.42, 0.03, 0.03), 0x6b4a2a, 0, 0, 0.3);
    },
    shotgun: (a) => {
      a(cylinderGeo(0.075, 0.035, 0.55), 0xc8a24a, 0, 0.02, 0.4, R90);
      a(boxGeo(0.07, 0.1, 0.35), 0x8b5a32, 0, -0.02, -0.05);
    },
    rifle: (a) => {
      a(boxGeo(0.08, 0.08, 0.65), 0x8b5a32, 0, 0, 0.2);
      a(boxGeo(0.56, 0.03, 0.03), 0x6b4a2a, 0, 0, 0.5);
      a(boxGeo(0.07, 0.1, 0.2), 0x6b4a2a, 0, 0.08, 0.2);
    },
    rocket: (a) => {
      a(cylinderGeo(0.13, 0.11, 0.85), 0x2a2a2e, 0, 0.08, 0.3, R90);
      a(cylinderGeo(0.145, 0.145, 0.06), 0x55595f, 0, 0.08, 0.66, R90);
      a(cylinderGeo(0.135, 0.135, 0.06), 0x55595f, 0, 0.08, 0, R90);
    },
    grenade: (a) => {
      a(sphereGeo(0.12), 0xa0522d, 0, 0, 0.05);
      a(cylinderGeo(0.04, 0.04, 0.06), 0xe0c08a, 0, 0.12, 0.05);
    },
  },
  proj: {
    rocket: (a) => a(sphereGeo(0.17), 0x1e1e22, 0, 0, 0),
    grenade: (a) => a(sphereGeo(0.13), 0xa0522d, 0, 0, 0),
  },
};
