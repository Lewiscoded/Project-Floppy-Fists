/**
 * Ragdoll layout and physics constants: the 16 particle indices (HEAD, NECK, ... RFOOT), rest pose,
 * particle radii and masses, the stick constraints (CONS) that hold a fighter together, colors and player cap.
 */
export const G = 22,
  DT = 1 / 120,
  ITER = 6,
  DAMP = 0.997;

export const HEAD = 0,
  NECK = 1,
  LSH = 2,
  RSH = 3,
  FRONT = 4,
  PELV = 5,
  LHIP = 6,
  RHIP = 7,
  LELB = 8,
  LHAND = 9,
  RELB = 10,
  RHAND = 11,
  LKNEE = 12,
  LFOOT = 13,
  RKNEE = 14,
  RFOOT = 15,
  N = 16;

export const REST = [
  [0, 1.78, 0],
  [0, 1.42, 0],
  [-0.3, 1.38, 0],
  [0.3, 1.38, 0],
  [0, 1.15, 0.22],
  [0, 0.88, 0],
  [-0.16, 0.84, 0],
  [0.16, 0.84, 0],
  [-0.42, 1.08, 0.05],
  [-0.45, 0.8, 0.12],
  [0.42, 1.08, 0.05],
  [0.45, 0.8, 0.12],
  [-0.17, 0.45, 0.05],
  [-0.17, 0.12, 0],
  [0.17, 0.45, 0.05],
  [0.17, 0.12, 0],
];

export const RAD = [
  0.3, 0.2, 0.16, 0.16, 0.22, 0.22, 0.15, 0.15, 0.11, 0.13, 0.11, 0.13, 0.13, 0.12, 0.13, 0.12,
];

export const PARTICLE_MASS = [0.9, 1, 1, 1, 1, 1, 1, 1, 1.4, 1.4, 1.4, 1.4, 1, 1, 1, 1];

export const UPPER = [HEAD, NECK, LSH, RSH, FRONT, PELV, LHIP, RHIP],
  TORSO = [NECK, LSH, RSH, FRONT, PELV, LHIP, RHIP];

export const CONS = [];

export const restLen = (a, b) =>
  Math.hypot(REST[a][0] - REST[b][0], REST[a][1] - REST[b][1], REST[a][2] - REST[b][2]);

for (let i = 0; i < TORSO.length; i++)
  for (let j = i + 1; j < TORSO.length; j++) CONS.push([TORSO[i], TORSO[j]]);

for (const j of [NECK, LSH, RSH, FRONT]) CONS.push([HEAD, j]);

CONS.push(
  [LSH, LELB],
  [LELB, LHAND],
  [RSH, RELB],
  [RELB, RHAND],
  [LHIP, LKNEE],
  [LKNEE, LFOOT],
  [RHIP, RKNEE],
  [RKNEE, RFOOT]
);

for (const c of CONS) c.push(restLen(c[0], c[1]));

export const COLORS = [0xff5a5a, 0x4aa8ff, 0xffd23f, 0x5ee07a, 0xb57cff];

export const MAX_PLAYERS = 5;
