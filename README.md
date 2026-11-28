# Project Floppy Fists

*Version 0.10.1, the Sound update.* Made by **Jesse J Lewis** ([lewiscoded.dev](https://www.lewiscoded.dev/)).

A wobbly ragdoll sandbox brawler built with three.js. Pick a map and a loadout, then bonk, blast and rocket your friends off it. Up to 5 players online.

## Play
- **Online:** click **Host game** to open a lobby, then hit **Copy invite link** and send it to friends. Opening the link drops them straight into your room, or they can type the 4-letter code. Everyone readies up, the host picks the mode, map, bots and bot skill, then hits **Start match**.
- **Practice:** the same lobby, offline, against 0–4 bots.

### Match modes
- **Deathmatch:** first to the kill limit (5–50), with an optional time limit.
- **Last Standing:** everyone gets 1–9 lives, and the last fighter with lives left wins. Eliminated players spectate.
- **Sandbox:** no score or time limit and every weapon unlocked. Spawn props and gadgets, fly the camera around and mess about. Bots can fight or just stand there as training dummies.
- **Melee only:** a weapons option that works with either mode. Everyone, bots included, fights with just their melee weapon.

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
| 🍳 Kitchen Chaos | A big family kitchen at ground level: counters with a sink and stove, a fridge, pantry shelves to climb, an island with bar stools and a dining table. | Oven Mitts, Rolling Pin, Butter Knife, Ketchup Squirter, Pepper Blaster, Sprinkle Gun, Champagne Cannon, Eggs |
| 🏢 Office Meltdown | A ground-floor open-plan office with street windows: cubicles, a glass meeting room, a ping pong table, a lounge and a manager's loft to get thrown off. | Fists, Keyboard, Metal Ruler, Staple Gun, Fire Extinguisher, Paperclip SMG, Toner Launcher, Coffee Mugs |
| 🏙️ Block Party | A street-level city block surrounded by buildings: a streetball court, corner store, brownstone stoops, a graffiti wall, string lights and an elevated train track. | Fists, Baseball Bat, Crowbar, Pistol, Sawed-Off, Uzi, RPG, Grenades |
| 🏰 Castle Siege | A castle on solid ground in the countryside: a courtyard with walls to climb, a keep, a broken east wall, a drawbridge over a wadeable moat and an open field beyond the gate. | Gauntlets, Mace, Longsword, Hand Crossbow, Blunderbuss, Repeater Crossbow, Hand Cannon, Firepots |

Themes only change how weapons look and what they're called. Damage and other stats are the same on every map.

## Controls
Every key can be rebound in **⚙ Settings**. These are the defaults:

| Action | Keyboard + mouse | Controller |
|---|---|---|
| Move | WASD (or arrows) | Left stick |
| Aim | Mouse | Right stick (with optional aim assist) |
| Attack | Left click (hold for the rifle, minigun, leaf blower and flamethrower) | RT |
| Block / parry | Right click or F (melee weapons) | LT |
| Jump | Space | A |
| Grab | Hold E near a fighter, prop or ledge. Let go to throw, and hold Space while holding to lift overhead for a bigger throw | B |
| Break free | Mash Space or click while grabbed | A / RT |
| Switch weapon | 1 / 2 / 3 or mouse wheel (1–7 in Sandbox) | LB / RB |
| Loadout | Q | Y |
| Chat / quick chat / emotes | Enter / T / G | D-pad |
| Menu | Esc | Start |
| Weapon wheel (sandbox) | Hold X, point at a weapon, let go | |
| Spawn menu (sandbox) | Z, pick an item, click to place, R to rotate | |
| Free camera (sandbox) | C, then WASD + Space/Shift to fly, hold right click to look, wheel for speed | |

## Physics playground
- **Movable props on every map:** crates, barrels, balls and bowling pins (10–11 per map, themed). Shoot them, punch them, blast them or kick them around. Knocked-out props respawn.
- **Explosive barrels:** red barrels go off when shot or blasted, and they chain into each other. Kills count for whoever set them off.
- **Grab and throw:** hold E to grab a fighter or prop with both hands and drag it around. Hold Space to lift it overhead, then let go of E to throw it where you're aiming. You can throw your friends off the map.
- **Struggle:** if someone grabs you, mash Space or click 5 times to break free. The grabber can't grab you again for a couple of seconds.
- **Online:** the host owns the props and everyone sees the same ones. Each player applies grabs and throws to their own fighter, so it all stays in sync.

## Sandbox mode
Pick **Sandbox** as the mode in the lobby. It works online, and everyone in the room can spawn things.
- **Weapon wheel:** hold X to pick any of the 23 weapons, so you aren't stuck with your loadout. All 7 classes are unlocked on keys 1–7.
- **Spawn menu:** press Z to open the spawn bar along the bottom of the screen, then spawn crates, barrels, explosive barrels, balls, bowling pins and bots. Click to place, R to rotate, and right click to stop. **Remove** deletes whatever you click, **Undo** takes back your last spawn, and **Clear all** wipes everything that's been spawned. There's a limit of 40 spawned things.
- **Trampolines:** jump on one and you bounce higher each time. Props bounce too.
- **Launch pads:** step on one and it fires you (or a prop) about 10 m in the direction of its arrows. Kills from a launch pad count for whoever placed it.
- **Fans:** blow fighters and props along their path. Line them up with a ledge for some fun.
- **Free camera:** press C to fly the camera anywhere. It's handy for building setups and watching the chaos.
- Respawns take 1.5 s, and Sandbox matches don't count toward your lifetime stats.

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
## World controls
The host can change the rules for everyone, in the **World** box in the lobby or mid-game from the **World** tab of the Sandbox spawn bar (Z). Whatever is on shows under the match banner.

| Control | Settings |
|---|---|
| Gravity | Moon, Low, Normal, Heavy, Jupiter |
| Game speed | Slow-mo, Half, Normal, Fast, Turbo |
| Knockback | Soft, Normal, Big, Huge, Cartoon |
| Chaos toggles | Big heads (easier headshots), Bouncy floors, Ice, Explosive props (every prop blows up like a barrel), Infinite jump, One-hit KOs, Rocket rain |

## Weapons
There are 7 classes. In a normal match you **carry 3 of them** (keys 1–3), chosen on the loadout screen (Q). In Sandbox you get all 7.

| Class | Types (default names) |
|---|---|
| Melee | Fists, Bat, Sword, Sledgehammer (overhead slam with a shockwave) |
| Guns | Pistol, Shotgun, Rifle (full auto), Minigun (hold to spin up) |
| Explosives | Rocket Launcher, Grenades, Cluster Bomb (pops into 6 bomblets) |
| Gadgets | Grappling Hook (zip to walls, yank fighters and props), Gravity Glove (fling everything in front of you), Leaf Blower (no damage, lots of wind) |
| Traps | Banana Peel (forced backflip), Spring Trap (launch), Sticky Mine (sticks to walls and ceilings). 3 down at once per player |
| Elemental | Flamethrower (sets people on fire), Freeze Ray (turns them into a sliding ice block), Shrink Ray (tiny and light for 8 s) |
| Silly | Slap Glove (barely hurts, huge knockback), Pie Launcher (cream covers their screen), Boxing Glove (spring-loaded long reach) |

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

## Working on the code
The code is split into small ES modules by system: physics, combat, maps, networking, UI and so on. See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the folder map, how a frame runs, and recipes for adding maps, weapons and gadgets. There's no build step. GitHub Pages serves the files as-is.

**Run it locally:** browsers won't load JS modules from a plain file, so serve the folder:
- In VS Code, install **Live Server** (it's suggested when you open the folder), then right-click `index.html` → **Open with Live Server**.
- Or run `python -m http.server` in the folder and open http://localhost:8000.

**Sound:** music and sound effects are synthesized live in `js/audio/` (no audio files). Each song is a readable pattern file in `js/audio/tracks/`.

**Look and feel:** the whole UI is themed from `css/theme.css`, and the version and changelog live in `js/core/about.js`.

**Formatting:** the code is formatted with Prettier (`.prettierrc.json`). With the Prettier extension, VS Code formats on save.
