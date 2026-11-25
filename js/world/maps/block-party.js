/**
 * Block Party: a street-level city block with real-world weapons. (Internal map key: "hood".)
 */
import * as THREE from 'three';
import { R90, boxGeo, cone, cylinderGeo, mat, sphereGeo } from '../../render/materials.js';
import { graffiti, stripes, worldBox } from '../../render/textures.js';
import { addBox, cityAround, deco, fence, flat, signBoard, stairs } from '../builders.js';
import { animated, mapGroup } from '../world.js';

export const hood = {
  name: 'Block Party',
  icon: '🏙️',
  tag: 'Street-level city block: streetball court, corner store, stoops and an elevated train track.',
  sky: { top: 0x6aa0e0, hor: 0xffd2a6, bot: 0x8a8fa0, sun: 0xffe0b0, dir: [0.3, 0.2, -1] },
  fog: [0xf0d4bc, 55, 190],
  hemi: [0xfff0e0, 0x5a5e6a, 0.65],
  sun: [0xffe2c0, 2.2],
  exposure: 1.0,
  tex: {
    0xb9b6ae: ['tile', 2.5, 0.01],
    0xa8553f: ['brick', 2.2, 0.03],
    0x8f4a3a: ['brick', 2.2, 0.03],
    0x7a5a4a: ['brick', 2.2, 0.03],
    0x5a6068: ['metal', 2, 0],
    0x3f7a4a: ['metal', 1.5, 0],
    0x6b4a33: ['wood', 1.5, 0.01],
    0x9aa0a8: ['concrete', 3, 0],
  },
  dust: 0xb0aaa0,
  preview: { pos: [2, 17, 27], look: [0, 0, -3] },
  spawns: [
    [-6, 0],
    [6, 0],
    [14, -12],
    [-18, -6],
    [-4, 9],
    [12, 10],
    [0, -10],
    [-16, 8],
    [18, 2],
    [-21, 0],
  ],
  props: [
    ['crate', -6, -8],
    ['crate', -5, -8.2],
    ['xbarrel', 0, -7],
    ['barrel', 16, 8],
    ['ball', 12, -12],
    ['pin', -2, 12],
    ['pin', -1.6, 12.3],
    ['pin', -2.4, 12.3],
    ['pin', -2, 12.6],
    ['xbarrel', -20, 6],
    ['crate', 20, -2],
  ],
  names: {
    fists: 'Fists',
    bat: 'Baseball Bat',
    sword: 'Crowbar',
    pistol: 'Pistol',
    shotgun: 'Sawed-Off',
    rifle: 'Uzi',
    rocket: 'RPG',
    grenade: 'Grenades',
    sledge: 'Sledgehammer',
    minigun: 'Minigun',
    cluster: 'Firework Pack',
    grapple: 'Grappling Hook',
    gravglove: 'Gravity Glove',
    blower: 'Leaf Blower',
    banana: 'Banana Peel',
    springtrap: 'Trampoline Trap',
    mine: 'Sticky Mine',
    flame: 'Bug Spray Torch',
    freeze: 'Freeze Ray',
    shrink: 'Shrink Ray',
    slap: 'Slap Glove',
    pie: 'Pie Launcher',
    boxglove: 'Boxing Glove',
  },
  tracer: { pistol: 0xffe08a, shotgun: 0xffd27a, rifle: 0xffe08a },
  boom: { rocket: [0xfff0a0, 0xff6a1a, 0x555555], grenade: [0xffe2a0, 0xff7a2a, 0x5a5a5a] },
  build() {
    const walk = 0xb9b6ae,
      brick = 0xa8553f,
      metal = 0x5a6068;
    // the block sits at street level inside the city
    addBox(-60, -2, -60, 60, 0, 60, walk);
    {
      const m = new THREE.Mesh(worldBox(420, 1, 420, 6), mat(0x8a8a8a, { tex: 'asphalt' }));
      m.position.set(0, -0.52, 0);
      m.receiveShadow = true;
      mapGroup.add(m);
    }
    // invisible walls keep the brawl on the block
    addBox(-27.5, 0, -21, -26.5, 30, 21, 0, { hidden: true, bound: true });
    addBox(26.5, 0, -21, 27.5, 30, 21, 0, { hidden: true, bound: true });
    addBox(-27.5, 0, -21.5, 27.5, 30, -20.5, 0, { hidden: true, bound: true });
    addBox(-27.5, 0, 20, 27.5, 30, 21, 0, { hidden: true, bound: true });
    // street through the middle (runs off into the city both ways)
    flat(-200, -3, 200, 3, 0, 0x9a9a9a, 'asphalt', 4);
    for (let x = -60; x < 60; x += 4)
      deco(boxGeo(1.8, 0.02, 0.18), 0xffd23f, x + 1, 0.035, 0, { cast: false });
    for (const sx of [-1, 1]) {
      for (let z = -2.4; z <= 2.4; z += 1.6)
        deco(boxGeo(0.5, 0.8, 1.4), 0xe8e4dc, sx * 26.7, 0.4, z, { tex: 'concrete' });
      for (const z of [-2.8, 2.8]) deco(cone(0.22, 0.6, 10), 0xff6a1a, sx * 25.8, 0.3, z);
    }
    for (const cx of [-9, 9])
      for (let z = -2.6; z < 2.7; z += 0.9)
        deco(boxGeo(2.6, 0.02, 0.5), 0xf4f4f4, cx, 0.035, z, { cast: false });
    // corner store (brick) + awning + sign + fire-escape stairs to the roof
    addBox(-24, 0, -19, -12, 4, -11, brick);
    deco(boxGeo(12.2, 0.15, 12.2), 0x6c6f75, -18, 4.08, -15, { cast: false });
    deco(boxGeo(2, 2.6, 0.1), 0x3a2a22, -18, 1.3, -10.95);
    deco(boxGeo(3.2, 1.6, 0.08), 0x9fd8ff, -21.5, 1.9, -10.95, { emissive: 0xffe8b0, ei: 0.6 });
    deco(boxGeo(3.2, 1.6, 0.08), 0x9fd8ff, -14.5, 1.9, -10.95, { emissive: 0xffe8b0, ei: 0.6 });
    {
      const aw = deco(boxGeo(11, 0.12, 1.6), 0xd04a4a, -18, 3.2, -10.3, { rx: 0.35 });
      aw.material.map = stripes();
    }
    signBoard('CORNER STORE', -18, 3.75, -10.9, 6, 0.8, 0xffd23f, 0x1d2433);
    stairs(-12, -17, 1, 0, 1.6, 4, metal);
    addBox(-11.5, 0, -14.6, -9.3, 1.3, -12.4, 0x3f7a4a);
    deco(boxGeo(2.3, 0.1, 2.3), 0x2f5a38, -10.4, 1.36, -13.5); // dumpster
    // streetball court + hoops + chain-link fence
    {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(20, 13), mat(0xffffff, { tex: 'court', rough: 0.6 }));
      c.rotation.x = -R90;
      c.position.set(12, 0.035, -12.5);
      c.receiveShadow = true;
      mapGroup.add(c);
    }
    for (const [x, s] of [
      [2.8, 1],
      [21.2, -1],
    ]) {
      addBox(x - 0.15, 0, -12.65, x + 0.15, 3.6, -12.35, 0xd8d8d8, { metal: 0.5 });
      addBox(x + s * 0.35 - 0.06, 3.1, -13.4, x + s * 0.35 + 0.06, 4.2, -11.6, 0xffffff, { opacity: 0.85 });
      deco(new THREE.TorusGeometry(0.32, 0.035, 8, 20), 0xff6a1a, x + s * 0.75, 3.25, -12.5, {
        rx: R90,
        metal: 0.5,
      });
      deco(cylinderGeo(0.33, 0.22, 0.5, 10, 1), 0xffffff, x + s * 0.75, 3, -12.5, {
        opacity: 0.5,
        cast: false,
      });
    }
    fence(2, -19.6, 22, -19.6, 2.6);
    fence(1.6, -19.6, 1.6, -14, 2.6);
    fence(22.4, -19.6, 22.4, -14, 2.6);
    addBox(8, 0, -5.6, 13, 0.5, -5, 0x6b4a33);
    for (const x of [8.3, 12.7]) addBox(x - 0.1, 0, -5.5, x + 0.1, 0.5, -5.1, metal); // bench
    // brownstones with stoops
    const houses = [
      [-24, 0x8f4a3a],
      [-17, 0xa8553f],
      [-10, 0x7a5a4a],
    ];
    for (const [x0, c] of houses) {
      addBox(x0, 0, 13, x0 + 6.6, 5.5, 19, c);
      deco(boxGeo(6.8, 0.3, 6.2), 0x5a3a2a, x0 + 3.3, 5.6, 16);
      const dx = x0 + 3.3;
      addBox(dx - 0.9, 0, 11.6, dx + 0.9, 1.2, 13, 0x9aa0a8);
      stairs(dx, 11.6, 0, -1, 1.8, 1.2, 0x9aa0a8);
      deco(boxGeo(1.2, 2.2, 0.1), 0x3a2616, dx, 2.3, 12.96);
      for (const wx of [-2, 2]) {
        deco(boxGeo(1.1, 1.4, 0.08), 0x9fd8ff, dx + wx, 3, 12.96, { emissive: 0xffe0a0, ei: 0.4 });
        deco(boxGeo(1.1, 1.4, 0.08), 0x9fd8ff, dx + wx, 4.6, 12.96, { emissive: 0xffe0a0, ei: 0.25 });
      }
    }
    // graffiti wall
    addBox(10, 0, 14, 18, 3, 14.5, 0xd8d4cc);
    {
      const g = deco(new THREE.PlaneGeometry(8, 3), 0xffffff, 14, 1.5, 13.98, { cast: false, ry: Math.PI });
      g.material.map = graffiti();
      g.material.needsUpdate = true;
      g.rotation.y = Math.PI;
    }
    {
      const g = deco(new THREE.PlaneGeometry(8, 3), 0xffffff, 14, 1.5, 14.52, { cast: false });
      g.material.map = graffiti();
    }
    // parked car
    addBox(3.5, 0, 6, 8.5, 1.1, 8.1, 0xd04a4a, { metal: 0.4, rough: 0.35 });
    addBox(4.6, 1.1, 6.2, 7.3, 1.9, 7.9, 0xd04a4a, { metal: 0.4, rough: 0.35 });
    deco(boxGeo(2.5, 0.6, 1.62), 0x9fd8ff, 5.95, 1.5, 7.05, { rough: 0.1, metal: 0.3, cast: false });
    for (const [x, z] of [
      [4.4, 6],
      [7.6, 6],
      [4.4, 8.1],
      [7.6, 8.1],
    ])
      deco(cylinderGeo(0.38, 0.38, 0.3, 14), 0x222222, x, 0.38, z, { rx: R90 });
    // hydrant, trash cans, crates, street lamps with string lights
    addBox(-4.25, 0, 4.75, -3.75, 0.9, 5.25, 0, { hidden: true });
    deco(cylinderGeo(0.22, 0.26, 0.8, 12), 0xd62828, -4, 0.4, 5, { metal: 0.3 });
    deco(sphereGeo(0.24), 0xd62828, -4, 0.85, 5);
    deco(cylinderGeo(0.07, 0.07, 0.5, 8), 0xd62828, -4, 0.55, 5, { rz: R90 });
    for (const [x, z] of [
      [-1, -5],
      [-0.2, -5.2],
      [19, 12],
      [-6, -18],
    ]) {
      addBox(x - 0.3, 0, z - 0.3, x + 0.3, 1, z + 0.3, 0, { hidden: true });
      deco(cylinderGeo(0.32, 0.28, 1, 12), 0x7a8088, x, 0.5, z, { metal: 0.6, rough: 0.4 });
      deco(cylinderGeo(0.35, 0.35, 0.08, 12), 0x6a7078, x, 1.04, z, { metal: 0.6 });
    }
    for (const [x, z] of [
      [-2, 15],
      [20, 6],
    ])
      addBox(x - 0.6, 0, z - 0.6, x + 0.6, 1.2, z + 0.6, 0xc58b4e, { edges: 0x7a4f25 });
    const lamps = [
      [-14, -4],
      [-2, -4],
      [10, -4],
      [22, -4],
      [-14, 4],
      [-2, 4],
      [10, 4],
      [22, 4],
    ];
    for (const [x, z] of lamps) {
      addBox(x - 0.1, 0, z - 0.1, x + 0.1, 4.2, z + 0.1, 0x2b2f36, { metal: 0.6 });
      deco(boxGeo(0.7, 0.12, 0.3), 0x2b2f36, x, 4.25, z);
      deco(sphereGeo(0.18), 0xfff0c0, x, 4.1, z, { emissive: 0xffd890, ei: 2.5, cast: false });
    }
    const bulbCols = [0xff5a5a, 0xffd23f, 0x5ee07a, 0x4aa8ff, 0xff7ad9];
    for (const z of [-4, 4])
      for (let i = 0; i < 3; i++) {
        const x0 = -14 + i * 12;
        for (let k = 1; k < 12; k++) {
          const t = k / 12,
            x = x0 + t * 12,
            y = 4 - Math.sin(t * Math.PI) * 0.8;
          const b = deco(sphereGeo(0.08, 8), bulbCols[k % 5], x, y, z, {
            emissive: bulbCols[k % 5],
            ei: 2.2,
            cast: false,
          });
          const ph = k + i * 3;
          animated.push((tt) => {
            b.material.emissiveIntensity = 1.6 + Math.sin(tt * 3 + ph) * 0.9;
          });
        }
      }
    // elevated train track along the east edge
    addBox(23, 3.2, -19, 26, 3.6, 19, metal);
    for (let z = -17; z <= 17; z += 6) addBox(23.3, 0, z - 0.3, 23.9, 3.2, z + 0.3, metal);
    for (const x of [24, 25])
      deco(boxGeo(0.12, 0.12, 38), 0xc0c4ca, x, 3.66, 0, { metal: 0.8, rough: 0.3, cast: false });
    for (let z = -18.5; z < 19; z += 1.2)
      deco(boxGeo(2.6, 0.06, 0.25), 0x5a3a2a, 24.5, 3.62, z, { cast: false });
    stairs(23, 8, -1, 0, 1.6, 3.2, metal);
    signBoard('BLOCK PARTY', -6, 6.6, -18.8, 7, 1.4, 0xff4fd8, 0xffffff);
    deco(boxGeo(0.2, 3.2, 0.2), metal, -8.8, 4.4, -18.9);
    deco(boxGeo(0.2, 3.2, 0.2), metal, -3.2, 4.4, -18.9);
    cityAround();
  },
  meshes: {
    bat: (a) => {
      a(cylinderGeo(0.075, 0.04, 0.95), 0xc8925a, 0, 0, 0.42, R90);
      a(cylinderGeo(0.045, 0.045, 0.22), 0x222222, 0, 0, 0.03, R90);
      a(cylinderGeo(0.055, 0.055, 0.03), 0xc8925a, 0, 0, -0.09, R90);
    },
    sword: (a) => {
      a(boxGeo(0.035, 0.035, 0.95), 0x8a1c1c, 0, 0, 0.45);
      a(boxGeo(0.035, 0.035, 0.16), 0x8a1c1c, 0, 0.06, 0.94).rotation.x = -0.9;
      a(boxGeo(0.05, 0.012, 0.06), 0x8a1c1c, 0, -0.02, -0.03);
    },
    pistol: (a) => {
      a(boxGeo(0.06, 0.09, 0.28), 0x1e1f22, 0, 0.03, 0.08);
      a(boxGeo(0.055, 0.13, 0.07), 0x2b2c30, 0, -0.06, -0.02).rotation.x = 0.25;
      a(cylinderGeo(0.012, 0.012, 0.03), 0x111111, 0, 0.05, 0.23, R90);
    },
    shotgun: (a) => {
      for (const x of [-0.03, 0.03]) a(cylinderGeo(0.03, 0.03, 0.38), 0x2b2c30, x, 0.03, 0.24, R90);
      a(boxGeo(0.08, 0.08, 0.12), 0x3a3b40, 0, 0.02, 0.02);
      a(boxGeo(0.06, 0.12, 0.2), 0x6b4426, 0, -0.04, -0.12).rotation.x = 0.35;
    },
    rifle: (a) => {
      a(boxGeo(0.07, 0.11, 0.3), 0x1e1f22, 0, 0.02, 0.1);
      a(boxGeo(0.04, 0.2, 0.05), 0x2b2c30, 0, -0.12, 0.08);
      a(cylinderGeo(0.016, 0.016, 0.12), 0x111111, 0, 0.04, 0.3, R90);
      a(boxGeo(0.02, 0.02, 0.22), 0x2b2c30, 0, 0.08, -0.08);
    },
    rocket: (a) => {
      a(cylinderGeo(0.06, 0.06, 1.0), 0x4a5a3a, 0, 0.1, 0.2, R90);
      a(cylinderGeo(0.075, 0.06, 0.12), 0x3a4a2a, 0, 0.1, -0.3, R90);
      a(cylinderGeo(0.1, 0.06, 0.22), 0x5a6b3a, 0, 0.1, 0.8, R90);
      a(cone(0.1, 0.25), 0x5a6b3a, 0, 0.1, 1.03, R90);
      a(boxGeo(0.04, 0.14, 0.05), 0x222222, 0, -0.02, 0.15);
    },
    grenade: (a) => {
      a(sphereGeo(0.09), 0x4a5a3a, 0, 0, 0.05).scale.set(1, 1.25, 1);
      a(boxGeo(0.03, 0.11, 0.025), 0x9aa0a8, 0.06, 0.06, 0.05);
      a(new THREE.TorusGeometry(0.03, 0.007, 6, 12), 0xc0c4ca, -0.04, 0.13, 0.05);
    },
  },
  proj: {
    rocket: (a) => {
      a(cylinderGeo(0.05, 0.05, 0.3), 0x4a5a3a, 0, 0, -0.1, R90);
      a(cylinderGeo(0.1, 0.05, 0.2), 0x5a6b3a, 0, 0, 0.12, R90);
      a(cone(0.1, 0.22), 0x5a6b3a, 0, 0, 0.32, R90);
    },
    grenade: (a) => {
      a(sphereGeo(0.09), 0x4a5a3a, 0, 0, 0).scale.set(1, 1.25, 1);
    },
  },
};
