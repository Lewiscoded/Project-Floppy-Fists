# Project Floppy Fists

A wobbly ragdoll sandbox brawler built with three.js. Pick a loadout, then bonk, blast and rocket your friends off a floating island. Up to 5 players online.

## Play
- **Online:** one person clicks **Host game** and shares the 4-letter room code. Everyone else types it in under **Join online**. Up to 5 fighters per room, and the host can add bots to fill empty slots.
- **Practice:** play offline against 0–4 bots.

Online play uses peer-to-peer WebRTC through [PeerJS](https://peerjs.com/), so it needs to be served from a real site such as GitHub Pages (or run locally with `npx serve`).

## Controls
| Action | Key |
|---|---|
| Move | WASD |
| Aim | Mouse |
| Attack | Left click (hold for the rifle) |
| Block / parry | Hold right click or F with a melee weapon. Tap it just before a hit lands to parry |
| Switch weapon | 1 melee · 2 gun · 3 explosive, or the mouse wheel |
| Jump | Space |
| Grab a ledge | Hold E while falling, then hold Space to climb |
| Loadout / menu | Q / Esc |

## Weapons
| Class | Types |
|---|---|
| Melee | Fists, Bat, Sword |
| Guns | Pistol, Shotgun, Rifle (full auto) |
| Explosives | Rocket Launcher, Grenades |

**Blocking:** with any melee weapon out, hold block to take 75% less damage and knockback from melee hits in front of you. You move slower while blocking, and each blocked hit drains your guard bar. If it runs out, your guard breaks and you're stunned. **Parrying:** start blocking within 0.22s of a hit landing and you take no damage, while the attacker is staggered and knocked back. Spamming block doesn't work, because the parry window only opens if you haven't blocked in the last 0.35s.

Rockets damage you too, at 40% strength, so you can rocket-jump.

## How it works
Each fighter is a 16-point Verlet ragdoll held together by distance constraints. Muscle springs keep it standing, turn it toward your aim, swing its feet and drive its punches. When a fighter is stunned, those springs switch off and it goes floppy.

Online, each player's computer simulates its own fighter and sends its pose 20 times a second. Hits are sent to the owner of the fighter that was hit, and that computer applies the damage and knockback. The host relays all messages and simulates the bots.

Everything is in one file, `index.html`.
