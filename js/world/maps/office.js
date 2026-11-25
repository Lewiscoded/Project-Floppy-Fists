/**
 * Office Meltdown: a ground-floor open-plan office with street windows and a manager's loft.
 */
import * as THREE from 'three';
import { R90, boxGeo, cylinderGeo, mat, sphereGeo } from '../../render/materials.js';
import { worldBox } from '../../render/textures.js';
import { addBox, deco, flat, signBoard, stairs } from '../builders.js';
import { mapGroup } from '../world.js';

export const office = {
  preview: { pos: [2, 16, 24], look: [0, 0, -2] },
  name: 'Office Meltdown',
  icon: '🏢',
  tag: "Ground-floor open-plan office: cubicles, a ping pong table and the manager's loft.",
  sky: { top: 0x3f7fd0, hor: 0xcfe4f5, bot: 0x7f97b8, sun: 0xfff4e0, dir: [-0.4, 0.3, -1] },
  fog: [0xbcd6ee, 45, 190],
  hemi: [0xeaf3ff, 0x5a6270, 0.7],
  sun: [0xffffff, 2.3],
  exposure: 1.0,
  tex: {
    0x6f7d8f: ['carpet', 3, 0],
    0x9aa0a8: ['concrete', 4, 0],
    0xe8e1d4: ['carpet', 1.2, 0],
    0x8b6a4a: ['wood', 2, 0.01],
    0xa9afb8: ['metal', 2, 0],
    0xc49a6c: ['cardboard', 1.2, 0],
    0xc9c4ba: ['concrete', 2, 0],
    0xb8bec6: ['metal', 2, 0],
    0x6b4a33: ['wood', 2, 0.01],
    0xd8dbe0: ['plain', 2, 0],
    0xd04a2a: ['metal', 2, 0],
    0x8a8f98: ['metal', 2, 0],
  },
  dust: 0xb0b8c4,
  spawns: [
    [-6, -8],
    [-16, -2],
    [6, 6],
    [15, 2],
    [-2, 10],
    [10, 4],
    [-16, 13],
    [8, -3],
    [0, -12],
    [21, 9],
  ],
  props: [
    ['crate', -6, -4],
    ['crate', -6, -2.8],
    ['barrel', 6, 0],
    ['xbarrel', -14, 0],
    ['ball', 0, 8],
    ['pin', 16, -2],
    ['pin', 16.4, -1.7],
    ['pin', 15.6, -1.7],
    ['pin', 16, -1.4],
    ['crate', 9, 13],
  ],
  names: {
    fists: 'Fists',
    bat: 'Keyboard',
    sword: 'Metal Ruler',
    pistol: 'Staple Gun',
    shotgun: 'Fire Extinguisher',
    rifle: 'Paperclip SMG',
    rocket: 'Toner Launcher',
    grenade: 'Coffee Mugs',
    sledge: 'Printer Smasher',
    minigun: 'Rubber Band Gatling',
    cluster: 'Confetti Bomb',
    grapple: 'Lanyard Hook',
    gravglove: 'Magnet Board',
    blower: 'Desk Fan',
    banana: 'Banana Peel',
    springtrap: 'Swivel Chair Spring',
    mine: 'Sticky Note Mine',
    flame: 'Microwave Torch',
    freeze: 'AC Blaster',
    shrink: 'The Downsizer',
    slap: 'HR Slap Glove',
    pie: 'Birthday Cake Cannon',
    boxglove: 'Spring-Loaded Stamp',
  },
  tracer: { pistol: 0xc0c6cc, shotgun: 0xffffff, rifle: 0xb8c0c8 },
  boom: { rocket: [0x555555, 0x1a1a1a, 0x2a2a2a], grenade: [0xa8744a, 0x5a3a1a, 0x7a5230] },
  build() {
    const carpet = 0x6f7d8f,
      wall = 0xe8e1d4,
      wood = 0x8b6a4a,
      grey = 0xa9afb8,
      paint = 0xeceae4,
      glass = 0xbfe6ff;
    // ---- room shell at street level
    addBox(-30, -2, -24, 30, 0, 24, carpet);
    addBox(-24.6, 0, -16.6, 24.6, 0.4, -16, 0xd8dbe0); // window sill
    addBox(-24.6, 0.4, -16.4, 24.6, 3.6, -16.25, glass, { opacity: 0.16, rough: 0.05 }); // big street windows
    addBox(-24.6, 3.6, -16.6, 24.6, 14, -16, paint, { tex: 'plain' });
    for (let x = -24; x <= 24; x += 4) deco(boxGeo(0.14, 3.2, 0.2), 0x4b5160, x, 2, -16.3, { metal: 0.5 });
    signBoard('FLOPPY CORP', 0, 5.3, -15.93, 9, 1.5, 0x1d2433, 0xffd23f);
    addBox(-24.6, 0, -16.6, -24, 14, 16.5, paint, { tex: 'plain' }); // west wall (elevators)
    addBox(24, 0, -16.6, 24.6, 14, 16.5, paint, { tex: 'plain' }); // east wall
    addBox(-24, 0, 15.5, 24, 30, 16.5, 0, { hidden: true, bound: true }); // invisible wall on the open side
    deco(boxGeo(48, 0.55, 0.9), paint, 0, 0.27, 16, { tex: 'plain' });
    deco(boxGeo(48, 0.08, 0.95), 0x8a8f98, 0, 0.58, 16);
    for (const [x, z, w, d] of [
      [0, -15.97, 48, 0.06],
      [-23.97, 0, 0.06, 32],
      [23.97, 0, 0.06, 32],
    ])
      deco(boxGeo(w, 0.16, d), 0x4b5160, x, 0.08, z, { cast: false });
    // elevators
    for (const z of [-7, 7]) {
      deco(boxGeo(0.1, 3.2, 3.2), 0x8a8f98, -23.95, 1.6, z, { metal: 0.5 });
      deco(boxGeo(0.12, 3, 1.45), 0xc4cad2, -23.9, 1.5, z - 0.76, { metal: 0.8, rough: 0.25 });
      deco(boxGeo(0.12, 3, 1.45), 0xc4cad2, -23.9, 1.5, z + 0.76, { metal: 0.8, rough: 0.25 });
      deco(boxGeo(0.08, 0.4, 1.2), 0x1d2433, -23.9, 3.5, z);
      deco(boxGeo(0.05, 0.18, 0.3), 0xffd23f, -23.85, 3.5, z, { emissive: 0xffb000, ei: 1.5, cast: false });
      deco(sphereGeo(0.08, 8), 0xffffff, -23.9, 1.4, z + 1.9, { emissive: 0xffffff, ei: 0.8 });
    }
    // whiteboard + clock on the east wall
    deco(boxGeo(0.08, 1.8, 5), 0xffffff, 23.94, 2.1, -8, { rough: 0.3 });
    deco(boxGeo(0.1, 1.9, 5.1), 0x9aa0a8, 23.98, 2.1, -8, { metal: 0.6 });
    for (const [y, z, w, c] of [
      [2.5, -9, 2.2, 0x3a6ad0],
      [2.1, -7.5, 1.6, 0xd04a4a],
      [1.7, -8.6, 2.8, 0x2b2f36],
    ])
      deco(boxGeo(0.02, 0.06, w), c, 23.89, y, z, { cast: false });
    deco(cylinderGeo(0.6, 0.6, 0.08, 24), 0xffffff, 23.95, 5, 4, { rz: R90 });
    deco(boxGeo(0.02, 0.4, 0.05), 0x222222, 23.9, 5.15, 4);
    deco(boxGeo(0.02, 0.05, 0.3), 0x222222, 23.9, 5, 4.1);
    // ---- the street outside the windows
    flat(-60, -21, 60, -16.6, -0.01, 0x9aa0a8, 'concrete', 3);
    flat(-60, -31, 60, -21, -0.02, 0x8a8a8a, 'asphalt', 4);
    for (let x = -58; x < 60; x += 4)
      deco(boxGeo(1.8, 0.02, 0.18), 0xffd23f, x + 1, 0.01, -26, { cast: false });
    flat(-60, -36, 60, -31, -0.01, 0x9aa0a8, 'concrete', 3);
    {
      const cols = [0xa8553f, 0x8f4a3a, 0xb07a5a, 0x7a6a5a, 0x9a8f84, 0xc9b8a0, 0x6f7d8f];
      let i = 0;
      for (let x = -60; x < 60; ) {
        const w = 7 + ((i * 37) % 6),
          h = 10 + ((i * 53) % 14);
        const m = new THREE.Mesh(
          worldBox(w, h, 12, 4),
          mat(cols[i % cols.length], { tex: 'windows', rough: 0.7 })
        );
        m.position.set(x + w / 2, h / 2, -42);
        m.castShadow = m.receiveShadow = true;
        mapGroup.add(m);
        x += w;
        i++;
      }
    }
    for (const x of [-20, 0, 20]) {
      deco(cylinderGeo(0.08, 0.1, 4.2), 0x2b2f36, x, 2.1, -19, { metal: 0.6 });
      deco(sphereGeo(0.2), 0xfff0c0, x, 4.2, -19, { emissive: 0xffd890, ei: 2, cast: false });
    }
    for (const x of [-10, 10]) {
      deco(cylinderGeo(0.2, 0.28, 2.4), 0x6b4a33, x, 1.2, -18.5);
      deco(sphereGeo(1.4, 12), 0x4f8a3f, x, 3, -18.5, { rough: 0.9 });
    }
    for (const [x, c] of [
      [-6, 0x3a6ad0],
      [14, 0xffd23f],
    ]) {
      deco(boxGeo(4.4, 1, 1.9), c, x, 0.65, -23.5, { metal: 0.4, rough: 0.35 });
      deco(boxGeo(2.4, 0.7, 1.7), c, x - 0.2, 1.45, -23.5, { metal: 0.4, rough: 0.35 });
      deco(boxGeo(2.3, 0.55, 1.72), 0x9fd8ff, x - 0.2, 1.45, -23.5, { metal: 0.3, rough: 0.1, cast: false });
      for (const [dx, dz] of [
        [-1.4, -0.95],
        [1.4, -0.95],
        [-1.4, 0.95],
        [1.4, 0.95],
      ])
        deco(cylinderGeo(0.36, 0.36, 0.25, 14), 0x222222, x + dx, 0.36, -23.5 + dz, { rx: R90 });
    }
    // ---- pillars
    for (const [x, z] of [
      [-12, -8],
      [12, -8],
      [-12, 8],
      [12, 8],
    ]) {
      addBox(x - 0.5, 0, z - 0.5, x + 0.5, 4.2, z + 0.5, 0xc9c4ba);
      deco(boxGeo(1.3, 0.25, 1.3), 0xb8b2a6, x, 4.32, z);
    }
    // ---- cubicles
    const cubicle = (x, z) => {
      addBox(x, 0, z, x + 4, 1.5, z + 0.15, wall);
      addBox(x, 0, z, x + 0.15, 1.5, z + 4, wall);
      addBox(x + 3.85, 0, z, x + 4, 1.5, z + 4, wall);
      addBox(x + 0.3, 0, z + 0.3, x + 3.7, 1, z + 1.4, wood);
      deco(boxGeo(0.9, 0.6, 0.08), 0x222831, x + 2, 1.4, z + 0.6);
      deco(boxGeo(0.84, 0.5, 0.02), 0x4aa8ff, x + 2, 1.4, z + 0.65, {
        emissive: 0x3a8aff,
        ei: 1.6,
        cast: false,
      });
      deco(boxGeo(0.5, 0.02, 0.35), 0xffffff, x + 0.9, 1.02, z + 0.9, { cast: false });
      deco(
        cylinderGeo(0.07, 0.06, 0.14),
        [0xffffff, 0xd04a4a, 0x4a7ad0][Math.floor(Math.random() * 3)],
        x + 3.1,
        1.08,
        z + 0.8
      );
      deco(boxGeo(0.7, 0.8, 0.7), 0x3355aa, x + 2, 0.4, z + 2.3);
    };
    for (const x of [8, 12.5, 17]) {
      cubicle(x, -14);
      cubicle(x, -9);
    }
    // ---- glass meeting room
    addBox(-19, 0, 6, -9, 1, 10, 0x6b4a33);
    for (const x of [-17, -14, -11])
      for (const z of [5.2, 10.8]) deco(boxGeo(0.8, 0.9, 0.8), 0x2b2f36, x, 0.45, z);
    addBox(-21, 0, 4, -15, 2.4, 4.15, glass, { opacity: 0.35, rough: 0.1 });
    addBox(-12, 0, 4, -7, 2.4, 4.15, glass, { opacity: 0.35, rough: 0.1 });
    deco(boxGeo(0.06, 1.5, 2.4), 0xffffff, -20.95, 1.6, 8, { cast: false });
    // ---- filing cabinets, cardboard steps, copier, water cooler, plants
    for (const x of [-23, -21.5, -20])
      addBox(x, 0, -15.5, x + 1.4, 2.6, -13.5, grey, { metal: 0.4, edges: 0x7a8088 });
    addBox(-21.2, 0, -13.3, -20, 1.2, -12.1, 0xc49a6c, { edges: 0x8a6a44 });
    addBox(-22.4, 0, -13.3, -21.2, 2.4, -12.1, 0xc49a6c, { edges: 0x8a6a44 });
    addBox(-14, 0, -15, -11, 1.4, -12.5, 0xd8dbe0);
    deco(boxGeo(2.6, 0.2, 2), 0x4a4f57, -12.5, 1.5, -13.75);
    addBox(2, 0, 10, 2.8, 1.4, 10.8, 0xffffff);
    deco(sphereGeo(0.42), 0x7fc4ff, 2.4, 1.85, 10.4, { opacity: 0.7, rough: 0.1 });
    addBox(-6, 0, 6, -4.8, 1.2, 7.2, 0xc49a6c, { edges: 0x8a6a44 });
    for (const [x, z] of [
      [22, -6],
      [-23, 13],
      [6, 14],
      [-23, -2],
    ]) {
      deco(cylinderGeo(0.35, 0.3, 0.7), 0xd7a26a, x, 0.35, z);
      deco(sphereGeo(0.6, 10), 0x3f9a4a, x, 1.1, z);
    }
    // ---- reception desk by the elevators
    addBox(-21, 0, -3.2, -19.8, 1.1, 3.2, 0xd8dbe0);
    addBox(-21.1, 1.1, -3.3, -19.7, 1.18, 3.3, wood);
    deco(boxGeo(0.08, 0.5, 0.8), 0x222831, -20.6, 1.45, 0);
    deco(boxGeo(0.02, 0.44, 0.74), 0x4aa8ff, -20.55, 1.45, 0, { emissive: 0x3a8aff, ei: 1.4, cast: false });
    // ---- ping pong table in the middle
    addBox(-2.2, 0, -1.2, 2.2, 0.76, 1.2, 0, { hidden: true });
    deco(boxGeo(4.4, 0.06, 2.4), 0x1f6b4a, 0, 0.74, 0);
    deco(boxGeo(4.4, 0.01, 0.04), 0xffffff, 0, 0.775, 0, { cast: false });
    deco(boxGeo(0.04, 0.01, 2.4), 0xffffff, -2.17, 0.775, 0, { cast: false });
    deco(boxGeo(0.04, 0.01, 2.4), 0xffffff, 2.17, 0.775, 0, { cast: false });
    deco(boxGeo(0.03, 0.18, 2.5), 0xffffff, 0, 0.86, 0, { opacity: 0.7, cast: false });
    for (const [x, z] of [
      [-1.9, -1],
      [1.9, -1],
      [-1.9, 1],
      [1.9, 1],
    ])
      deco(boxGeo(0.1, 0.72, 0.1), 0x2b2f36, x, 0.36, z);
    // ---- lounge: couch + coffee table + rug
    flat(-10, 10.5, -2, 15, 0, 0x3a5a8a, 'carpet', 1);
    addBox(-9, 0, 13.6, -3, 0.5, 15, 0x4a6fa5);
    addBox(-9, 0.5, 14.6, -3, 1.2, 15, 0x4a6fa5);
    addBox(-9.4, 0, 13.6, -9, 0.8, 15, 0x4a6fa5);
    addBox(-3, 0, 13.6, -2.6, 0.8, 15, 0x4a6fa5);
    addBox(-7.5, 0, 11.3, -4.5, 0.45, 12.6, wood);
    deco(cylinderGeo(0.09, 0.08, 0.18), 0xffffff, -6.6, 0.54, 12);
    // ---- manager's loft along the east wall (stairs up, glass rail, get thrown off it)
    addBox(17.5, 2.5, -1, 24, 2.7, 15, 0xb8bec6, { metal: 0.3 });
    for (const [x, z] of [
      [17.8, -0.7],
      [17.8, 6],
      [17.8, 11.6],
    ])
      addBox(x - 0.15, 0, z - 0.15, x + 0.15, 2.5, z + 0.15, 0x8a8f98, { metal: 0.5 });
    addBox(17.45, 2.7, -1, 17.6, 3.7, 11.8, glass, { opacity: 0.3, rough: 0.1 });
    addBox(17.5, 2.7, -1.1, 24, 3.7, -0.95, glass, { opacity: 0.3, rough: 0.1 });
    deco(boxGeo(0.1, 0.06, 12.8), 0x8a8f98, 17.52, 3.72, 5.4, { metal: 0.7 });
    stairs(17.5, 13, -1, 0, 2, 2.7, 0x8a8f98);
    addBox(20, 2.7, 3, 23, 3.5, 5, wood);
    deco(boxGeo(0.9, 0.6, 0.08), 0x222831, 21.5, 3.85, 4);
    deco(boxGeo(0.84, 0.5, 0.02), 0x4aa8ff, 21.5, 3.85, 3.95, { emissive: 0x3a8aff, ei: 1.6, cast: false });
    addBox(21, 2.7, 6, 22, 3.4, 7, 0x2b2f36);
    signBoard('MANAGER', 21, 5.2, -0.93, 3, 0.7, 0xd04a2a, 0xffffff);
    for (const z of [2, 4.4]) addBox(22.8, 0, z, 24, 2, z + 1.6, grey, { metal: 0.4, edges: 0x7a8088 });
  },
  meshes: {
    bat: (a) => {
      a(boxGeo(0.18, 0.04, 0.6), 0x2b2f36, 0, 0, 0.32);
      a(boxGeo(0.15, 0.02, 0.55), 0xd5d8de, 0, 0.03, 0.32);
    },
    sword: (a) => {
      a(boxGeo(0.08, 0.012, 0.95), 0xd8dde3, 0, 0, 0.5);
      a(boxGeo(0.081, 0.013, 0.02), 0x333333, 0, 0, 0.3);
      a(boxGeo(0.081, 0.013, 0.02), 0x333333, 0, 0, 0.6);
    },
    pistol: (a) => {
      a(boxGeo(0.08, 0.08, 0.3), 0x222222, 0, 0, 0.1);
      a(boxGeo(0.085, 0.03, 0.28), 0xd62828, 0, 0.055, 0.1);
    },
    shotgun: (a) => {
      a(cylinderGeo(0.1, 0.1, 0.45), 0xd62828, 0, 0, 0.05, R90);
      a(cylinderGeo(0.025, 0.04, 0.3), 0x222222, 0, 0.04, 0.38, R90);
      a(cylinderGeo(0.05, 0.05, 0.08), 0xc0c0c0, 0, 0.1, 0.2);
    },
    rifle: (a) => {
      a(boxGeo(0.09, 0.1, 0.55), 0xe6dcc5, 0, 0, 0.2);
      a(cylinderGeo(0.025, 0.025, 0.25), 0xc0c6cc, 0, 0.02, 0.55, R90);
    },
    rocket: (a) => {
      a(boxGeo(0.3, 0.26, 0.75), 0xd8dbe0, 0, 0.1, 0.18);
      a(boxGeo(0.2, 0.02, 0.1), 0x333333, 0, 0.24, 0.5);
    },
    grenade: (a) => {
      a(cylinderGeo(0.08, 0.07, 0.17), 0xffffff, 0, 0, 0.05);
      a(boxGeo(0.03, 0.1, 0.03), 0xffffff, 0.1, 0, 0.05);
    },
  },
  proj: {
    rocket: (a) => a(boxGeo(0.13, 0.13, 0.35), 0x1a1a1a, 0, 0, 0),
    grenade: (a) => {
      a(cylinderGeo(0.08, 0.07, 0.17), 0xffffff, 0, 0, 0);
    },
  },
};
