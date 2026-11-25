/**
 * Weapon definitions and the seven weapon classes.
 *
 * Every weapon has:
 *   cls    which class it belongs to (melee, gun, boom, gadget, trap, elem, silly)
 *   kind   how it fires (see fire() in combat.js and FIRE_KINDS in weapon-kinds.js):
 *            melee    swing the held hand (reach = extra length past the hand)
 *            hitscan  instant bullets (pellets, spread, falloff)
 *            rocket   / lob   a projectile that flies straight / is thrown in an arc
 *            trap     thrown, sticks where it lands, triggers when someone steps on it (traps.js)
 *            cone     hits everything in front of you (range, angle)
 *            beam     one instant ray that applies an effect
 *            grapple  rope: pulls you to walls, or yanks fighters and props to you
 *   dmg, knock, cd (seconds between shots), desc, s = [damage, speed, knockback] bars for the loadout screen
 *   range  how far away bots like to stand when using it (0 = up close)
 * Optional extras:
 *   auto      hold to keep firing         spin    seconds of spin-up before an auto weapon fires
 *   status    [effect, seconds] put on whoever gets hit (burn, freeze, shrink, pie; see status.js)
 *   uniform   push the whole body evenly instead of mostly the part that was hit
 *   stun      seconds of stun on hit      pound   melee that makes a shockwave when it hits or slams the floor
 *   word      comic word set shown on every hit (see BURST_WORDS in overlay.js)
 */
export const WEAPONS = {
  fists: {
    cls: 'melee',
    name: 'Fists',
    kind: 'melee',
    dmg: 11,
    knock: 1,
    cd: 0.3,
    reach: 0,
    desc: 'Fast jabs. Rings bells.',
    range: 0,
    s: [2, 5, 2],
  },
  bat: {
    cls: 'melee',
    name: 'Bat',
    kind: 'melee',
    dmg: 24,
    knock: 2.4,
    cd: 0.55,
    reach: 0.8,
    desc: 'Home-run knockback.',
    range: 0,
    s: [4, 3, 5],
  },
  sword: {
    cls: 'melee',
    name: 'Sword',
    kind: 'melee',
    dmg: 34,
    knock: 1.1,
    cd: 0.45,
    reach: 0.95,
    desc: 'Long reach, big damage.',
    range: 0,
    s: [5, 4, 2],
  },
  pistol: {
    cls: 'gun',
    name: 'Pistol',
    kind: 'hitscan',
    dmg: 20,
    knock: 1.2,
    cd: 0.3,
    spread: 0.015,
    pellets: 1,
    falloff: [18, 40],
    len: 0.32,
    recoil: 0.4,
    desc: 'Reliable. Accurate.',
    range: 7,
    s: [3, 4, 2],
  },
  shotgun: {
    cls: 'gun',
    name: 'Shotgun',
    kind: 'hitscan',
    dmg: 8,
    knock: 1.3,
    cd: 1.0,
    spread: 0.14,
    pellets: 7,
    falloff: [5, 14],
    len: 0.75,
    recoil: 2.5,
    desc: 'Point blank devastation.',
    range: 4,
    s: [5, 2, 4],
  },
  rifle: {
    cls: 'gun',
    name: 'Rifle',
    kind: 'hitscan',
    dmg: 6,
    knock: 0.6,
    cd: 0.11,
    spread: 0.06,
    pellets: 1,
    auto: true,
    falloff: [12, 35],
    len: 0.85,
    recoil: 0.3,
    desc: 'Full auto. Hold to spray.',
    range: 7,
    s: [3, 5, 1],
  },
  rocket: {
    cls: 'boom',
    name: 'Rocket Launcher',
    kind: 'rocket',
    dmg: 55,
    radius: 3.6,
    cd: 1.9,
    speed: 20,
    blast: 15,
    len: 0.9,
    recoil: 4,
    desc: 'Big boom, slow reload. Rocket-jump off your own feet.',
    range: 9,
    s: [4, 1, 4],
  },
  grenade: {
    cls: 'boom',
    name: 'Grenades',
    kind: 'lob',
    dmg: 55,
    radius: 3.8,
    cd: 1.2,
    fuse: 1.7,
    blast: 16,
    len: 0,
    desc: 'Lob them over cover. Bouncy.',
    range: 9,
    s: [4, 2, 5],
  },
};

// ---------- heavies (one extra pick for melee, guns and explosives) ----------
Object.assign(WEAPONS, {
  sledge: {
    cls: 'melee',
    name: 'Sledgehammer',
    kind: 'melee',
    dmg: 40,
    knock: 2.8,
    cd: 1.1,
    reach: 0.95,
    pound: true,
    range: 0,
    desc: 'Slow overhead slam. Hits the floor with a shockwave.',
    s: [5, 1, 5],
  },
  minigun: {
    cls: 'gun',
    name: 'Minigun',
    kind: 'hitscan',
    dmg: 5,
    knock: 0.7,
    cd: 0.05,
    spread: 0.09,
    pellets: 1,
    auto: true,
    spin: 0.6,
    falloff: [10, 30],
    len: 0.9,
    recoil: 0.35,
    range: 8,
    desc: 'Hold to spin up, then a wall of lead.',
    s: [4, 5, 2],
  },
  cluster: {
    cls: 'boom',
    name: 'Cluster Bomb',
    kind: 'lob',
    dmg: 30,
    radius: 2.8,
    cd: 2.4,
    fuse: 1.4,
    blast: 12,
    bomblets: 6,
    range: 10,
    desc: 'Pops, then scatters six little bombs.',
    s: [5, 1, 4],
  },
  // the little bombs a cluster bomb scatters (not in any loadout)
  bomblet: { cls: 'none', name: 'Cluster Bomb', kind: 'none', dmg: 22, radius: 2.3, blast: 10 },

  // ---------- gadgets ----------
  grapple: {
    cls: 'gadget',
    name: 'Grappling Hook',
    kind: 'grapple',
    dmg: 4,
    knock: 1,
    cd: 0.9,
    maxDist: 24,
    len: 0.45,
    uniform: true,
    range: 10,
    desc: 'Hit a wall to zip to it. Hit a fighter or prop to yank it to you.',
    s: [1, 4, 4],
  },
  gravglove: {
    cls: 'gadget',
    name: 'Gravity Glove',
    kind: 'cone',
    dmg: 4,
    knock: 1,
    cd: 1.4,
    cone: { range: 11, angle: 0.82 },
    fling: true,
    uniform: true,
    range: 6,
    desc: 'Lifts everything in front of you and flings it where you aim.',
    s: [1, 2, 5],
  },
  blower: {
    cls: 'gadget',
    name: 'Leaf Blower',
    kind: 'cone',
    dmg: 0,
    knock: 1,
    cd: 0.1,
    auto: true,
    cone: { range: 8, angle: 0.8 },
    push: 2.8,
    uniform: true,
    recoil: 0.2,
    len: 0.7,
    range: 4,
    desc: 'No damage. Endless wind. Blow people off ledges.',
    s: [0, 5, 3],
  },

  // ---------- traps (max 3 down at once per fighter, see traps.js) ----------
  banana: {
    cls: 'trap',
    name: 'Banana Peel',
    kind: 'trap',
    dmg: 4,
    knock: 1,
    cd: 0.8,
    trigger: 0.75,
    slip: true,
    stun: 1.4,
    range: 3,
    desc: 'Whoever steps on it does a backflip. Not on purpose.',
    s: [1, 4, 3],
  },
  springtrap: {
    cls: 'trap',
    name: 'Spring Trap',
    kind: 'trap',
    dmg: 4,
    knock: 1,
    cd: 1,
    trigger: 0.85,
    uniform: true,
    stun: 0.8,
    range: 3,
    desc: 'Hidden spring. Launches anyone into the sky.',
    s: [1, 3, 5],
  },
  mine: {
    cls: 'trap',
    name: 'Sticky Mine',
    kind: 'trap',
    dmg: 50,
    radius: 3,
    blast: 15,
    cd: 1.2,
    trigger: 1.5,
    range: 3,
    desc: 'Sticks to floors, walls and ceilings. Goes off when someone gets close.',
    s: [4, 2, 4],
  },

  // ---------- elemental ----------
  flame: {
    cls: 'elem',
    name: 'Flamethrower',
    kind: 'cone',
    dmg: 2,
    knock: 1,
    cd: 0.08,
    auto: true,
    cone: { range: 5.5, angle: 0.88 },
    push: 0.4,
    status: ['burn', 3],
    len: 0.75,
    range: 3,
    desc: 'Sets people on fire. Burning fighters panic.',
    s: [4, 5, 1],
  },
  freeze: {
    cls: 'elem',
    name: 'Freeze Ray',
    kind: 'beam',
    dmg: 10,
    knock: 0.5,
    cd: 1.3,
    status: ['freeze', 2.5],
    len: 0.6,
    range: 9,
    desc: 'Turns a fighter into a sliding ice block.',
    s: [2, 2, 1],
  },
  shrink: {
    cls: 'elem',
    name: 'Shrink Ray',
    kind: 'beam',
    dmg: 0,
    knock: 0.5,
    cd: 1.6,
    status: ['shrink', 8],
    len: 0.6,
    range: 9,
    desc: 'Makes a fighter tiny and light for 8 seconds. Easy to punt.',
    s: [0, 2, 5],
  },

  // ---------- silly ----------
  slap: {
    cls: 'silly',
    name: 'Slap Glove',
    kind: 'melee',
    dmg: 2,
    knock: 3.4,
    cd: 0.5,
    reach: 0.2,
    uniform: true,
    word: 'slap',
    range: 0,
    desc: 'Barely hurts. Sends people flying. SLAP!',
    s: [0, 4, 5],
  },
  pie: {
    cls: 'silly',
    name: 'Pie Launcher',
    kind: 'lob',
    dmg: 6,
    knock: 1,
    cd: 0.9,
    status: ['pie', 4],
    impact: true,
    aimed: true,
    speed: 16,
    len: 0.5,
    range: 9,
    desc: 'Cream to the face. They can barely see for 4 seconds.',
    s: [1, 3, 1],
  },
  boxglove: {
    cls: 'silly',
    name: 'Boxing Glove',
    kind: 'melee',
    dmg: 18,
    knock: 3,
    cd: 0.8,
    reach: 1.8,
    word: 'melee',
    range: 0,
    desc: 'A glove on a spring. Punches from way over there.',
    s: [3, 3, 5],
  },
});

WEAPONS.throw = { cls: 'none', name: 'Throw', kind: 'none' };

/** The weapon classes, in slot order. In sandbox you get all of them; otherwise you equip 3. */
export const CLASSES = [
  { key: 'melee', name: 'Melee', icon: '👊', types: ['fists', 'bat', 'sword', 'sledge'] },
  { key: 'gun', name: 'Guns', icon: '🔫', types: ['pistol', 'shotgun', 'rifle', 'minigun'] },
  { key: 'boom', name: 'Explosives', icon: '💣', types: ['rocket', 'grenade', 'cluster'] },
  { key: 'gadget', name: 'Gadgets', icon: '🧲', types: ['grapple', 'gravglove', 'blower'] },
  { key: 'trap', name: 'Traps', icon: '🍌', types: ['banana', 'springtrap', 'mine'] },
  { key: 'elem', name: 'Elemental', icon: '🔥', types: ['flame', 'freeze', 'shrink'] },
  { key: 'silly', name: 'Silly', icon: '🥧', types: ['slap', 'pie', 'boxglove'] },
];

export const CLASS_KEYS = CLASSES.map((c) => c.key);

/** Little picture for each weapon (sandbox weapon wheel). */
export const WEAPON_ICONS = {
  fists: '👊',
  bat: '🏏',
  sword: '🗡️',
  sledge: '🔨',
  pistol: '🔫',
  shotgun: '💥',
  rifle: '🎯',
  minigun: '⚙️',
  rocket: '🚀',
  grenade: '💣',
  cluster: '🎆',
  grapple: '🪝',
  gravglove: '🧲',
  blower: '🍃',
  banana: '🍌',
  springtrap: '🪀',
  mine: '🧨',
  flame: '🔥',
  freeze: '❄️',
  shrink: '🔬',
  slap: '🖐️',
  pie: '🥧',
  boxglove: '🥊',
};

/** Weapons held out in front and aimed (the rest are thrown overhand or swung). */
export const isAimed = (w) => ['hitscan', 'rocket', 'cone', 'beam', 'grapple'].includes(w.kind) || !!w.aimed;

/** How many classes you can carry in a normal match. */
export const MAX_EQUIPPED = 3;

export const DEFAULT_LOADOUT = {
  melee: 'bat',
  gun: 'shotgun',
  boom: 'rocket',
  gadget: 'grapple',
  trap: 'banana',
  elem: 'flame',
  silly: 'slap',
};

export const DEFAULT_EQUIP = ['melee', 'gun', 'boom'];

/** A cooldown timer for every class, all ready. */
export const freshCooldowns = () => Object.fromEntries(CLASS_KEYS.map((k) => [k, 0]));

/** Make a saved equip list valid: known classes, no repeats, 1 to 3 of them. */
export function cleanEquip(list) {
  const out = [];
  for (const k of list || []) if (CLASS_KEYS.includes(k) && !out.includes(k)) out.push(k);
  return out.length ? out.slice(0, MAX_EQUIPPED) : [...DEFAULT_EQUIP];
}

/** Make a saved loadout valid: every class gets a weapon that belongs to it. */
export function cleanLoadout(lo) {
  const out = { ...DEFAULT_LOADOUT };
  for (const c of CLASSES) if (lo && c.types.includes(lo[c.key])) out[c.key] = lo[c.key];
  return out;
}
