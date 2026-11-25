/**
 * Character customization data: hats, face accessories, clothing colors, default and random outfits,
 * and the compact string format outfits are sent over the network in.
 */
export const HATS = [
  ['none', 'None'],
  ['cap', '🧢 Cap'],
  ['beanie', 'Beanie'],
  ['tophat', '🎩 Top hat'],
  ['cowboy', '🤠 Cowboy'],
  ['crown', '👑 Crown'],
  ['hardhat', '⛑️ Hard hat'],
  ['chef', '👨‍🍳 Chef'],
  ['party', '🥳 Party'],
];

export const FACES = [
  ['none', 'None'],
  ['shades', '🕶️ Shades'],
  ['glasses', '👓 Glasses'],
  ['mustache', 'Mustache'],
  ['eyepatch', '🏴‍☠️ Eyepatch'],
  ['nose', '🤡 Clown nose'],
  ['mask', '🦸 Hero mask'],
];

export const CLOTH = [
  -1, 0xffffff, 0x2b2f36, 0xd62828, 0xff8c2b, 0xffd23f, 0x5ee07a, 0x2e8b57, 0x4aa8ff, 0x2a4a9a, 0xb57cff,
  0xff7ad9, 0x8b5a32, 0x9aa0a8,
];

export const DEF_OUTFIT = {
  hat: 'none',
  face: 'none',
  shirt: -1,
  pants: -1,
  sleeves: 'short',
  legs: 'long',
  hatCol: 0xd62828,
};

export const outfitKey = (o) => [o.hat, o.face, o.shirt, o.pants, o.sleeves, o.legs, o.hatCol].join('|');

export const parseOutfit = (str) => {
  const [hat, face, shirt, pants, sleeves, legs, hatCol] = String(str || '').split('|');
  return {
    hat: hat || 'none',
    face: face || 'none',
    shirt: shirt === undefined ? -1 : +shirt,
    pants: pants === undefined ? -1 : +pants,
    sleeves: sleeves || 'short',
    legs: legs || 'long',
    hatCol: hatCol === undefined ? 0xd62828 : +hatCol,
  };
};

const pickR = (a) => a[Math.floor(Math.random() * a.length)];

export const randomOutfit = () => ({
  hat: Math.random() < 0.65 ? pickR(HATS.slice(1))[0] : 'none',
  face: Math.random() < 0.5 ? pickR(FACES.slice(1))[0] : 'none',
  shirt: pickR(CLOTH),
  pants: pickR(CLOTH),
  sleeves: Math.random() < 0.5 ? 'short' : 'long',
  legs: Math.random() < 0.75 ? 'long' : 'shorts',
  hatCol: pickR(CLOTH.slice(1)),
});
