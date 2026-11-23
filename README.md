# Project Floppy Fists

A wobbly ragdoll sandbox brawler built with three.js. Pick a map and a loadout, then bonk, blast and rocket your friends off it. Up to 5 players online.

## Play
- **Online:** click **Host game** to open a lobby, then hit **Copy invite link** and send it to friends. Opening the link drops them straight into your room, or they can type the 4-letter code. Everyone readies up, the host picks the mode, map, bots and bot skill, then hits **Start match**.
- **Practice:** the same lobby, offline, against 0–4 bots.

### Match modes
- **Deathmatch:** first to the kill limit (5–50), with an optional time limit.
- **Last Standing:** everyone gets 1–9 lives, and the last fighter with lives left wins. Eliminated players spectate.

After each match there's a results screen with a podium, awards (most damage, longest flight, most headshots, most ring-outs) and full stats. Your lifetime record (matches, wins, kills, K/D, falls, damage) is saved in your browser.

### Online extras
- Up to 5 fighters, with pings shown on the scoreboard and in the lobby.
- **Auto-reconnect:** if your connection drops, you rejoin and keep your score.
- **Host migration:** if the host leaves, the longest-connected player takes over the room and the match keeps going.
- Typed chat, 6 quick-chat lines, emotes (wave, dance, taunt, flop) and speech bubbles over heads.

Online play uses peer-to-peer WebRTC through [PeerJS](https://peerjs.com/), so it needs to be served from a real site such as GitHub Pages (or locally with `npx serve`).

## Maps
Click **Choose map** on the main menu or in the lobby to open the map screen, which shows a live preview of every map and its weapons. Online, the host picks the map in the lobby and everyone plays on it.

| Map | Setting | Weapons become |
|---|---|---|
| 🍳 Kitchen Chaos | Tiny fighters on a giant counter. Fall in the sink or off the edge. | Oven Mitts, Rolling Pin, Butter Knife, Ketchup Squirter, Pepper Blaster, Sprinkle Gun, Champagne Cannon, Eggs |
| 🏢 Office Meltdown | A half-built skyscraper floor with cubicles, an open elevator shaft and a steel beam out over the city. | Fists, Keyboard, Metal Ruler, Staple Gun, Fire Extinguisher, Paperclip SMG, Toner Launcher, Coffee Mugs |
| 🏙️ Block Party | A street-level city block surrounded by buildings: a streetball court, corner store, brownstone stoops, a graffiti wall, string lights and an elevated train track. | Fists, Baseball Bat, Crowbar, Pistol, Sawed-Off, Uzi, RPG, Grenades |
| 🏰 Castle Siege | A courtyard with walls to climb, a keep, a broken east wall and a drawbridge. | Gauntlets, Mace, Longsword, Hand Crossbow, Blunderbuss, Repeater Crossbow, Hand Cannon, Firepots |

Themes only change how weapons look and what they're called. Damage and other stats are the same on every map.

## Controls
Every key can be rebound in **⚙ Settings**. These are the defaults:

| Action | Keyboard + mouse | Controller |
|---|---|---|
| Move | WASD (or arrows) | Left stick |
| Aim | Mouse | Right stick (with optional aim assist) |
| Attack | Left click (hold for the rifle) | RT |
| Block / parry | Right click or F (melee weapons) | LT |
| Jump | Space | A |
| Grab a ledge | Hold E while falling, then hold Space to climb | B |
| Switch weapon | 1 / 2 / 3 or mouse wheel | LB / RB |
| Loadout | Q | Y |
| Chat / quick chat / emotes | Enter / T / G | D-pad |
| Menu | Esc | Start |

## Customization
Click **👕 Customize** on the menu, in the lobby or from the Esc menu. You'll see a live 3D preview that you can drag to spin.
- **Hats:** cap, beanie, top hat, cowboy, crown, hard hat, chef, party hat (some come in any color)
- **Face:** shades, glasses, mustache, eyepatch, clown nose, hero mask
- **Shirt:** any color (or none), with short or long sleeves
- **Pants:** any color (or none), as pants or shorts
- **Body color** and a **🎲 Randomize** button

Outfits sync to everyone online, and bots wear random outfits.

## Quality of life
- 2 seconds of spawn protection (your fighter flickers; attacking cancels it)
- Hitmarkers, floating damage numbers and a headshot ding
- Arrows at the screen edge pointing to off-screen enemies, and a red arc showing where damage came from
- A kill cam that follows whoever got you while you wait to respawn
- Settings: master and effects volume, screen shake, camera distance, name tags, damage numbers, aim assist, graphics quality
- A first-time tutorial (you can reopen it from Settings)

## Weapon classes
| Class | Types (default names) |
|---|---|
| Melee | Fists, Bat, Sword |
| Guns | Pistol, Shotgun, Rifle (full auto) |
| Explosives | Rocket Launcher, Grenades |

**Blocking:** with any melee weapon out, hold block to take 75% less damage and knockback from melee hits in front of you. You move slower while blocking, and each blocked hit drains your guard bar. If it runs out, your guard breaks and you're stunned. **Parrying:** start blocking within 0.22s of a hit landing and you take no damage, while the attacker is staggered and knocked back. Spamming block doesn't work, because the parry window only opens if you haven't blocked in the last 0.35s.

Rockets damage you too, at 40% strength, so you can rocket-jump.

## Graphics
- Procedural textures for marble, tile, wood, carpet, brick, cobblestone and grass, plus gradient skies and image-based lighting
- Glossy fighters with outlines and faces that react: they grin, frown when attacking, wince when hurt and show X-eyes when knocked out
- Bloom, a color grade and a vignette, soft smoke, explosions with shockwaves and light flashes, muzzle flashes, glowing tracers and footstep dust
- **Graphics: High / Low** toggle on the menu. Low turns off post-processing and grass and uses a lower resolution and smaller shadows, for slower PCs.

## How it works
Each fighter is a 16-point Verlet ragdoll held together by distance constraints. Muscle springs keep it standing, turn it toward your aim, swing its feet and drive its punches. When a fighter is stunned, those springs switch off and it goes floppy.

Online, each player's computer simulates its own fighter and sends its pose 20 times a second. Hits are sent to the owner of the fighter that was hit, and that computer applies the damage and knockback. The host relays all messages and simulates the bots.

Everything is in one file, `index.html`.
