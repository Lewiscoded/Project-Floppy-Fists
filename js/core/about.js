/**
 * Everything shown on the Info screen: the game version, who made it, links, credits and the changelog.
 * Bump GAME_VERSION and add a line to CHANGELOG (newest first) when you ship an update.
 */

export const GAME_VERSION = '0.11.0';
export const GAME_NAME = 'Project Floppy Fists';

export const AUTHOR = {
  name: 'Jesse J Lewis',
  handle: 'Lewiscoded',
  title: 'Full-Stack Engineer',
  initials: 'JL',
};

/** Links shown under "Made by". */
export const LINKS = [
  { label: 'Portfolio', url: 'https://www.lewiscoded.dev/' },
  { label: 'More games', url: 'https://www.lewiscoded.dev/games.html' },
  { label: 'GitHub', url: 'https://github.com/Lewiscoded' },
  { label: 'Source code', url: 'https://github.com/Lewiscoded/Project-Floppy-Fists' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/jesse-j-lewis-b2a8b81a9' },
  { label: 'Email', url: 'mailto:jessejlewis505@gmail.com' },
];

/** Libraries and tools the game is built with. */
export const CREDITS = [
  { label: 'three.js', url: 'https://threejs.org/', what: '3D rendering' },
  { label: 'PeerJS', url: 'https://peerjs.com/', what: 'online play' },
  { label: 'Bangers + Comic Neue', url: 'https://fonts.google.com/', what: 'lettering' },
];

/** Version history, newest first. */
export const CHANGELOG = [
  {
    v: '0.11.0',
    title: 'Seven weapon classes',
    notes:
      'Four new classes (Gadgets, Traps, Elemental, Silly) plus heavies for the old ones: sledgehammer, minigun, cluster bomb, grappling hook, gravity glove, leaf blower, banana peel, spring trap, sticky mine, flamethrower, freeze ray, shrink ray, slap glove, pie launcher and boxing glove. Carry 3 classes into a match (pick them on the new loadout screen); Sandbox unlocks all 7 on keys 1–7. Status effects: burning, frozen, shrunk and pied.',
  },
  {
    v: '0.10.1',
    title: 'Block Party goes trap',
    notes:
      'New Block Party song: a 140 BPM hip hop trap beat with a heavy 808, rolling hi-hats and dark bells.',
  },
  {
    v: '0.10.0',
    title: 'Sound update',
    notes:
      'Background music for the menu and every map, plus sounds for buttons, menus, typing, match start, results and kills. New Music volume slider.',
  },
  {
    v: '0.9.0',
    title: 'Comic book update',
    notes: 'Brand new comic book look for every screen, POW and KABOOM pop-ups on kills, and this info page.',
  },
  {
    v: '0.8.1',
    title: 'Cleaner code',
    notes: 'The game was split into small, readable files so it is easier to change.',
  },
  {
    v: '0.8.0',
    title: 'Down to earth',
    notes:
      'Kitchen, Office and Castle moved to ground level: a real kitchen, a street-level office, and a castle with a moat.',
  },
  {
    v: '0.7.0',
    title: 'Sandbox mode',
    notes: 'Weapon wheel, spawn bar, trampolines, launch pads, fans, free camera and training dummies.',
  },
  {
    v: '0.6.0',
    title: 'Physics playground',
    notes: 'Crates, barrels, balls and pins to knock around, explosive barrels, and grab-lift-throw.',
  },
  {
    v: '0.5.0',
    title: 'Block Party',
    notes: 'Street-level city map with real-world weapons, character customization and a melee-only mode.',
  },
  {
    v: '0.4.0',
    title: 'Themed maps',
    notes:
      'Kitchen, Office and Castle maps with a map picker, a graphics overhaul and lots of quality-of-life features.',
  },
  {
    v: '0.3.0',
    title: 'Block and parry',
    notes:
      'Every melee weapon can block, and a well-timed block parries. Balance pass on rockets, guns and bots.',
  },
  {
    v: '0.2.0',
    title: 'Sandbox brawler',
    notes: 'Weapon classes, rocket launcher and online matches for up to 5 players.',
  },
  { v: '0.1.0', title: 'First punch', notes: 'Wobbly ragdoll fighters and online play.' },
];
