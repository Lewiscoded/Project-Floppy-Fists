/**
 * Kitchen Chaos: a big family kitchen at ground level. Each map defines its look, spawns, props,
 * themed weapon names and a build() that places its geometry.
 */
import * as THREE from 'three';
import { R90, boxGeo, cone, cylinderGeo, sphereGeo } from '../../render/materials.js';
import { addBox, deco, flat, stairs } from '../builders.js';
import { animated } from '../world.js';

export const kitchen = {
  preview: { pos: [0, 16, 24], look: [0, 0, -3] },
  name: 'Kitchen Chaos',
  icon: '🍳',
  tag: 'A big family kitchen: counters, an island, a pantry to climb and a dining table to fight over.',
  sky: { top: 0xf6e7cf, hor: 0xf0dcbc, bot: 0xc9ae86, sun: 0xfff1d0, dir: [0.5, 0.35, -1] },
  fog: [0xeedcbf, 55, 170],
  hemi: [0xfff3e0, 0x8a6a4a, 0.55],
  sun: [0xfff0d8, 1.75],
  exposure: 0.86,
  tex: {
    0xe4d9c6: ['marble', 7, 0],
    0xcfe8e4: ['tile', 2.4, 0.02],
    0xa0724e: ['wood', 3, 0.01],
    0xc89a62: ['wood', 2.5, 0.01],
    0x6b4a33: ['wood', 2, 0.01],
    0xd9dde3: ['metal', 3, 0],
    0xf4f4f4: ['plain', 3, 0],
    0x4aa8ff: ['plain', 2, 0],
    0xff8c2b: ['cardboard', 2, 0],
  },
  dust: 0xd8c8a8,
  spawns: [
    [-18, 4],
    [-10, 8],
    [-2, 10],
    [6, 10],
    [20, 10],
    [-16, -9],
    [-8, -8],
    [0, -8],
    [17, -9],
    [21, -2],
  ],
  props: [
    ['crate', -12, 10],
    ['crate', -11, 10.3],
    ['barrel', 21, -12],
    ['xbarrel', -3, -9],
    ['ball', 4, 7],
    ['pin', -16, 12],
    ['pin', -15.6, 12.3],
    ['pin', -16.4, 12.3],
    ['pin', -16, 12.6],
    ['crate', 9, 12],
  ],
  names: {
    fists: 'Oven Mitts',
    bat: 'Rolling Pin',
    sword: 'Butter Knife',
    pistol: 'Ketchup Squirter',
    shotgun: 'Pepper Blaster',
    rifle: 'Sprinkle Gun',
    rocket: 'Champagne Cannon',
    grenade: 'Eggs',
  },
  tracer: { pistol: 0xd62828, shotgun: 0x2b2b2b, rifle: 0xff6fcf },
  boom: { rocket: [0xfff3c0, 0xffc84a, 0xfffaf0], grenade: [0xfff27a, 0xffb52c, 0xfff3c4] },
  build() {
    const paint = 0xf3e6cc,
      cab = 0x6f9a8a,
      top = 0xe4d9c6,
      wood = 0xa0724e,
      steel = 0xd9dde3,
      dark = 0x2a2d33;
    // ---- room shell: checker floor, three walls (the camera side is cut away like a dollhouse)
    addBox(-30, -2, -24, 30, 0, 24, 0xffffff, { tex: 'checker', ts: 4.8, rough: 0.5 });
    addBox(-24.5, 0, -16.5, -8, 14, -15.5, paint);
    addBox(-1, 0, -16.5, 24.5, 14, -15.5, paint); // north wall, window gap over the sink
    addBox(-8, 0, -16.5, -1, 1.3, -15.5, paint);
    addBox(-8, 3.3, -16.5, -1, 14, -15.5, paint);
    addBox(-8, 1.3, -16.1, -1, 3.3, -15.95, 0xbfe6ff, { opacity: 0.18, rough: 0.05 });
    deco(boxGeo(7.3, 0.15, 0.5), 0xffffff, -4.5, 1.28, -15.7);
    deco(boxGeo(7.3, 0.15, 0.3), 0xffffff, -4.5, 3.32, -15.7);
    deco(boxGeo(0.12, 2, 0.25), 0xffffff, -4.5, 2.3, -15.85);
    addBox(-24.5, 0, -16.5, -23.5, 14, 16.5, paint); // west wall
    addBox(23.5, 0, -16.5, 24.5, 14, 2, paint);
    addBox(23.5, 0, 6, 24.5, 14, 16.5, paint);
    addBox(23.5, 2.7, 2, 24.5, 14, 6, paint); // east wall + doorway
    addBox(23.5, 0, 2, 24.5, 6, 6, 0, { hidden: true, bound: true });
    addBox(-24, 0, 15.5, 24, 30, 16.5, 0, { hidden: true, bound: true }); // invisible wall on the open side
    deco(boxGeo(48, 0.55, 0.9), paint, 0, 0.27, 16, { tex: 'plain' });
    deco(boxGeo(48, 0.08, 0.95), 0xb88a5a, 0, 0.58, 16); // cut-away wall stub
    for (const [x, z, w, d] of [
      [0, -15.47, 47, 0.06],
      [-23.47, 0, 0.06, 31],
      [23.47, -7, 0.06, 18],
      [23.47, 11, 0.06, 10],
    ])
      deco(boxGeo(w, 0.18, d), 0xffffff, x, 0.09, z, { cast: false }); // baseboards
    // hallway past the doorway
    deco(boxGeo(8, 0.05, 4), 0x8a6a4a, 28, 0.02, 4, { tex: 'wood', cast: false });
    deco(boxGeo(0.3, 6, 8), 0xe8dcc0, 32, 3, 4, { cast: false });
    deco(boxGeo(0.12, 2.2, 1), 0x6b4a33, 23.45, 1.35, 1.4);
    // ---- the backyard outside the window
    flat(-40, -60, 40, -16.6, -0.01, 0x7fa65a, 'grass', 5);
    for (let x = -30; x <= 30; x += 1.2) deco(boxGeo(1, 2.2, 0.12), 0xd9c09a, x, 1.1, -26, { cast: false });
    deco(boxGeo(62, 0.15, 0.15), 0xc9ad84, 0, 1.9, -25.9, { cast: false });
    for (const [x, z, k] of [
      [-12, -21, 1.2],
      [4, -30, 1.6],
      [-2, -22, 0.9],
    ]) {
      deco(cylinderGeo(0.25 * k, 0.35 * k, 3 * k), 0x6b4a33, x, 1.5 * k, z);
      deco(sphereGeo(2 * k, 12), 0x4f8a3f, x, 3.6 * k, z, { rough: 0.9 });
    }
    // ---- north counter run: cabinets, sink, stove, upper cabinets
    addBox(-21, 0, -15.5, 2, 0.92, -14.2, cab);
    addBox(-21.1, 0.92, -15.5, 2, 1, -14.1, top);
    addBox(5.6, 0, -15.5, 10, 0.92, -14.2, cab);
    addBox(5.6, 0.92, -15.5, 10.1, 1, -14.1, top);
    for (let x = -20.4; x < 9.6; x += 1.25) {
      if (x > 1.9 && x < 5.6) continue;
      deco(boxGeo(1.1, 0.75, 0.04), 0x83ab9b, x + 0.55, 0.48, -14.17);
      deco(boxGeo(0.35, 0.05, 0.05), 0xc0c4ca, x + 0.55, 0.78, -14.13, { metal: 0.8, rough: 0.3 });
    }
    deco(boxGeo(3, 0.08, 1), 0x9aa0a8, -4.5, 0.97, -14.85, { metal: 0.7, rough: 0.2 });
    deco(boxGeo(2.6, 0.06, 0.8), 0x3a3f46, -4.5, 0.99, -14.85, { metal: 0.6, rough: 0.3, cast: false }); // sink
    deco(cylinderGeo(0.06, 0.06, 0.8), 0xc0c4ca, -4.5, 1.4, -15.3, { metal: 0.9, rough: 0.15 });
    deco(cylinderGeo(0.05, 0.05, 0.6), 0xc0c4ca, -4.5, 1.8, -15.05, { metal: 0.9, rough: 0.15, rx: R90 });
    addBox(2, 0, -15.5, 5.6, 0.97, -14.1, steel, { metal: 0.5, rough: 0.3 }); // stove
    deco(boxGeo(3.4, 0.03, 1.3), dark, 3.8, 0.99, -14.8, { cast: false });
    deco(boxGeo(3.1, 0.55, 0.04), 0x1d2026, 3.8, 0.45, -14.07, { rough: 0.2 });
    for (const [x, z] of [
      [3, -15.1],
      [4.6, -15.1],
      [3, -14.5],
      [4.6, -14.5],
    ]) {
      const b = deco(cylinderGeo(0.26, 0.26, 0.02, 20), 0xff4a2a, x, 1.01, z, {
        emissive: 0xff3a10,
        ei: 1.3,
        cast: false,
      });
      const ph = x * 3 + z;
      animated.push((t) => {
        b.material.emissiveIntensity = 1.1 + Math.sin(t * 2 + ph) * 0.35;
      });
    }
    addBox(1.6, 3.6, -15.5, 6, 4.2, -14.4, steel, { metal: 0.6, rough: 0.3 });
    deco(boxGeo(1.8, 9.8, 0.9), steel, 3.8, 9.1, -15.05, { metal: 0.6, rough: 0.3 }); // range hood
    for (const [a, b] of [
      [-21, -8.4],
      [-0.6, 1.6],
      [6, 10],
    ]) {
      addBox(a, 2.5, -15.5, b, 3.7, -14.9, cab);
      for (let x = a; x < b - 0.5; x += 1.1) deco(boxGeo(1, 1.05, 0.03), 0x83ab9b, x + 0.55, 3.1, -14.88);
    }
    deco(boxGeo(29, 1.45, 0.04), 0xcfe8e4, -5.5, 1.75, -15.47, { tex: 'tile', cast: false }); // backsplash
    for (const [x, c] of [
      [-18, 0xd04a4a],
      [-16.8, 0xffd23f],
      [-15.4, 0x4aa8ff],
    ])
      deco(cylinderGeo(0.28, 0.28, 0.55), c, x, 1.27, -15.1); // canisters
    deco(boxGeo(1, 0.08, 0.7), 0xc89a62, -10, 1.04, -14.8);
    deco(sphereGeo(0.2, 10), 0xe8442e, -9.8, 1.2, -14.8); // cutting board + tomato
    // fridge
    addBox(11, 0, -15.5, 14.2, 3.6, -13.1, steel, { metal: 0.5, rough: 0.3 });
    deco(boxGeo(3.2, 0.03, 0.02), 0x9aa0a8, 12.6, 2.3, -13.08);
    for (const y of [1.2, 2.9]) deco(boxGeo(0.08, 0.7, 0.08), 0x8a9098, 13.8, y, -13.02, { metal: 0.8 });
    for (const [x, y, c] of [
      [11.7, 2.7, 0xff6fcf],
      [12.3, 1.6, 0x5ee07a],
      [11.8, 1.1, 0xffd23f],
    ])
      deco(boxGeo(0.5, 0.6, 0.02), c, x, y, -13.07, { cast: false });
    // step stool so anyone can get on the counter
    stairs(-12, -14.1, 0, 1, 1.2, 1, wood);
    // trash can next to the fridge
    addBox(14.6, 0, -15.3, 15.6, 1.1, -14.3, 0, { hidden: true });
    deco(cylinderGeo(0.5, 0.45, 1.1, 14), 0xb8bec6, 15.1, 0.55, -14.8, { metal: 0.6, rough: 0.35 });
    // ---- pantry shelves on the west wall (climbable ledges)
    for (const h of [1.1, 2.1, 3.1]) addBox(-23.5, h, -11, -22, h + 0.12, -5, wood);
    for (const z of [-11.05, -4.95]) deco(boxGeo(1.5, 3.3, 0.1), 0x8a5e3e, -22.75, 1.65, z);
    const jar = [0xffd23f, 0xff8c2b, 0xd04a4a, 0x5ee07a, 0x4aa8ff];
    for (const h of [1.22, 2.22, 3.22])
      for (let z = -10.6; z < -5.3; z += 0.7) {
        const c = jar[Math.floor((z * 7 + h * 3) & 4)];
        deco(boxGeo(0.35, 0.55, 0.4), c, -23.25, h + 0.28, z);
      }
    // ---- island + bar stools
    addBox(-6, 0, -4.5, 3, 0.92, -1.5, cab);
    addBox(-6.15, 0.92, -4.65, 3.15, 1, -1.35, top);
    for (let x = -5.4; x < 3; x += 1.5) deco(boxGeo(1.3, 0.7, 0.04), 0x83ab9b, x + 0.6, 0.46, -1.48);
    deco(cylinderGeo(0.55, 0.35, 0.25, 16), 0xf4f4f4, -2, 1.12, -3);
    for (const [x, z, c] of [
      [-2.15, -3, 0xff9a2a],
      [-1.8, -2.9, 0xd04a4a],
      [-2, -3.2, 0xffe14a],
    ])
      deco(sphereGeo(0.16, 10), c, x, 1.3, z);
    for (const x of [-4.5, -1.5, 1.5]) {
      addBox(x - 0.3, 0, -0.95, x + 0.3, 0.78, -0.35, 0, { hidden: true });
      deco(cylinderGeo(0.32, 0.32, 0.08, 16), 0x2b2f36, x, 0.76, -0.65);
      deco(cylinderGeo(0.05, 0.05, 0.75), 0x9aa0a8, x, 0.37, -0.65, { metal: 0.8 });
      deco(cylinderGeo(0.25, 0.25, 0.03, 14), 0x9aa0a8, x, 0.05, -0.65, { metal: 0.8 });
    }
    // ---- dining table, chairs, rug, pendant lights
    flat(10.5, 0.2, 20.5, 7.8, 0, 0xb0503a, 'carpet', 1.5);
    addBox(12, 0, 1.5, 19, 0.8, 6.5, 0, { hidden: true });
    deco(boxGeo(7.2, 0.1, 5.2), wood, 15.5, 0.78, 4, { tex: 'wood' });
    for (const [x, z] of [
      [12.3, 1.8],
      [18.7, 1.8],
      [12.3, 6.2],
      [18.7, 6.2],
    ])
      deco(boxGeo(0.18, 0.74, 0.18), 0x6b4a33, x, 0.37, z);
    const chair = (x, z, side) => {
      addBox(x - 0.4, 0, z - 0.4, x + 0.4, 0.5, z + 0.4, 0, { hidden: true });
      deco(boxGeo(0.82, 0.08, 0.82), 0x8a5e3e, x, 0.48, z);
      for (const [dx, dz] of [
        [-0.33, -0.33],
        [0.33, -0.33],
        [-0.33, 0.33],
        [0.33, 0.33],
      ])
        deco(boxGeo(0.08, 0.46, 0.08), 0x6b4a33, x + dx, 0.23, z + dz);
      const bz = z + side * 0.37;
      addBox(
        x - 0.4,
        0.5,
        Math.min(bz - 0.05, bz + 0.05),
        x + 0.4,
        1.25,
        Math.max(bz - 0.05, bz + 0.05),
        0x8a5e3e
      );
    };
    for (const x of [13.5, 15.5, 17.5]) {
      chair(x, 0.8, -1);
      chair(x, 7.2, 1);
    }
    // pictures + a shelf on the east wall
    for (const [z, y, w, h, c] of [
      [-10, 2.6, 2.2, 1.6, 0x4aa8ff],
      [-6.6, 2.9, 1.4, 1.9, 0xff8c2b],
      [10, 2.6, 2.6, 1.7, 0x5ee07a],
    ]) {
      deco(boxGeo(0.08, h + 0.2, w + 0.2), 0x6b4a33, 23.45, y, z);
      deco(boxGeo(0.04, h, w), c, 23.4, y, z, { cast: false });
      deco(sphereGeo(Math.min(w, h) * 0.25, 10), 0xfff3c0, 23.37, y + 0.1, z, {
        s: [0.1, 1, 1],
        cast: false,
      });
    }
    addBox(22.9, 2.2, 12.5, 23.5, 2.32, 15, wood);
    for (const [z, c] of [
      [13, 0xd04a4a],
      [13.6, 0x4aa8ff],
      [14.3, 0xffd23f],
    ])
      deco(cylinderGeo(0.18, 0.18, 0.4), c, 23.2, 2.52, z);
    // ---- little extras: dog bed, bowl, clock, mop bucket
    deco(new THREE.TorusGeometry(0.75, 0.28, 10, 24), 0x8a5e3e, -21, 0.25, 13, { rx: R90 });
    deco(cylinderGeo(0.75, 0.75, 0.12, 20), 0xd9c09a, -21, 0.08, 13, { cast: false });
    deco(cylinderGeo(0.25, 0.2, 0.15, 14), 0xd04a4a, -19.4, 0.08, 14.2);
    deco(cylinderGeo(0.7, 0.7, 0.08, 24), 0xffffff, -23.45, 5.5, 0, { rz: R90 });
    deco(boxGeo(0.02, 0.45, 0.05), 0x222222, -23.4, 5.65, 0);
    deco(boxGeo(0.02, 0.05, 0.35), 0x222222, -23.4, 5.5, 0.12);
    addBox(19.6, 0, 12.6, 20.6, 0.75, 13.6, 0, { hidden: true });
    deco(cylinderGeo(0.5, 0.42, 0.75, 14), 0xffd23f, 20.1, 0.37, 13.1);
    deco(cylinderGeo(0.03, 0.03, 2.4), 0x8a6a4a, 20.4, 1.2, 13.3, { rz: 0.25 });
  },
  meshes: {
    bat: (a) => {
      a(cylinderGeo(0.08, 0.08, 0.8), 0xe0b47e, 0, 0, 0.45, R90);
      a(cylinderGeo(0.03, 0.03, 0.2), 0xc8925a, 0, 0, 0, R90);
      a(cylinderGeo(0.03, 0.03, 0.2), 0xc8925a, 0, 0, 0.95, R90);
    },
    sword: (a) => {
      a(boxGeo(0.09, 0.015, 0.7), 0xdfe6ee, 0, 0, 0.5);
      a(boxGeo(0.05, 0.05, 0.22), 0xffffff, 0, 0, 0.03);
    },
    pistol: (a) => {
      a(cylinderGeo(0.07, 0.07, 0.32), 0xd62828, 0, 0, 0.1, R90);
      a(cone(0.04, 0.12), 0xffd23f, 0, 0, 0.32, R90);
    },
    shotgun: (a) => {
      a(cylinderGeo(0.09, 0.09, 0.38), 0x333333, 0, 0, 0.15, R90);
      a(cylinderGeo(0.095, 0.07, 0.08), 0xd0d0d0, 0, 0, 0.38, R90);
    },
    rifle: (a) => {
      a(boxGeo(0.1, 0.12, 0.55), 0xff9bd2, 0, 0, 0.18);
      a(cylinderGeo(0.03, 0.03, 0.3), 0x7ad7ff, 0, 0.02, 0.6, R90);
      a(sphereGeo(0.04), 0xffe14a, 0, 0.08, 0.1);
    },
    rocket: (a) => {
      a(cylinderGeo(0.12, 0.12, 0.75), 0x2f6b3a, 0, 0.1, 0.2, R90);
      a(cylinderGeo(0.05, 0.11, 0.25), 0x2f6b3a, 0, 0.1, 0.68, R90);
      a(cylinderGeo(0.056, 0.056, 0.12), 0xe8c547, 0, 0.1, 0.82, R90);
    },
    grenade: (a) => {
      a(sphereGeo(0.11), 0xfdfaf2, 0, 0, 0.05).scale.set(1, 1, 1.3);
    },
  },
  proj: {
    rocket: (a) => a(cylinderGeo(0.09, 0.11, 0.2), 0xd9b98a, 0, 0, 0, R90),
    grenade: (a) => a(sphereGeo(0.13), 0xfdfaf2, 0, 0, 0).scale.set(1, 1, 1.3),
  },
};
