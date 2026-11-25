# How Project Floppy Fists is put together

The game is plain JavaScript ES modules: no bundler and no build step. `index.html` loads `css/style.css` and `js/main.js`, and the browser pulls in everything else through `import`. three.js (3D) and PeerJS (online play) load from a CDN.

## Folder map

```
index.html            Markup for every screen (menu, lobby, HUD, settings, ...)
css/style.css         All styling
js/
  main.js             Entry point: loads modules, demo world, the frame loop
  audio.js            Synthesized sound effects (no audio files)
  core/               Helpers and state shared by everything
    util.js           $, V3, clamp, now, round2, escapeHtml
    state.js          The shared `game` object (screen, match, menus, ...)
    prefs.js          Saved preferences, key binds, match settings
  game/               Gameplay rules and simulation
    constants.js      Ragdoll layout + physics constants
    bodies.js         Body class = one fighter
    physics.js        Muscles, verlet integration, collisions, step()
    grab.js           Grab / lift / throw / break free
    weapons.js        Weapon stats
    combat.js         Attacking, melee, hitscan, damage, kills
    projectiles.js    Rockets, grenades, explosions
    props.js          Crates, barrels, balls, pins (host-owned physics)
    bots.js           Bot AI
    match.js          Match start / win checks / results / respawn
    outfits.js        Customization data
  render/             Drawing
    renderer.js       three.js renderer, lights, post-processing, sky
    textures.js       Canvas-painted textures
    materials.js      mat(), boxGeo(), cylinderGeo(), ...
    fighter-visuals.js  Fighter meshes, faces, outfits, held weapons
    fx.js             Particles and explosion effects
    camera.js         Follow / spectator camera
  world/              Maps
    world.js          Collision boxes, spawns, loadMap(), boxUnder()
    builders.js       addBox(), deco(), stairs(), fence(), ...
    maps/             One file per map + index.js listing them
  sandbox/            Sandbox mode
    gadgets.js        Trampolines, launch pads, fans, spawning
    sandbox-ui.js     Weapon wheel, spawn bar, free camera
  net/                Online play
    network.js        Host / join / lobby / reconnect / host migration
    messages.js       Message handling, pose streaming, proxies
    test-peer.js      Fake network used by automated tests
  ui/                 Screens and input
    input.js          Keyboard / mouse / gamepad -> fighter controls
    menu.js, lobby.js, hud.js, settings.js, tutorial.js,
    map-select.js, customize.js, chat.js, overlay.js
```

## One frame (`frame()` in main.js)

1. Read input into your fighter's controls (`ui/input.js`), and let bots decide theirs (`game/bots.js`).
2. Run physics in fixed **1/120 s** steps (`step()` in `game/physics.js`), as many as needed to catch up with real time:
   muscle forces → props → grab tethers → verlet integration → constraint solving → collisions → melee hits.
3. Weapons, projectiles, props, gadgets and effects update.
4. Networking: send your fighters' poses (about 20 times a second) and props if you're the host.
5. Camera, HUD and overlay update, then the scene renders.

## Ragdolls

A fighter is **16 particles** (head, neck, shoulders, chest, pelvis, hips, elbows, hands, knees, feet) joined by **stick constraints** (`CONS` in `game/constants.js`). Velocity is implied by `pos - prev` (verlet). "Muscles" are springs (`spring()` in `game/physics.js`) that pull particles toward a standing / walking / aiming pose. Getting hit adds stun, which weakens the muscles, and that's where the floppiness comes from.

## Online play

- PeerJS gives a WebRTC connection between browsers. The **host relays every message**, so clients only talk to the host.
- Each player **simulates their own fighter** and streams its pose. Everyone else shows a smoothed **proxy** of it.
- Hits are applied by the **owner** of the fighter being hit (the attacker sends a `hit` message), so nobody can be in two places at once.
- The host owns props and Sandbox gadgets. Other players send requests (`sbx`) and the host broadcasts the results.
- If the host leaves, the next player takes over the room (host migration in `net/network.js`).

## Shared state

Modules mostly just import each other's functions and constants. A handful of values are changed from many places (current screen, match settings, whether a menu is open, ...). Those live on the `game` object in `core/state.js`, which documents every field.

## Load order (one thing to watch)

ES modules run in dependency order. Code that runs **when a file loads** (not inside a function) must only use things from modules that have already loaded. Everything inside functions is fine. If you ever see `Cannot access 'X' before initialization` on startup, that's this. Move the value into a small module that doesn't import much (like `game/outfits.js`).

Three window listeners are installed from `main.js` on purpose so they run after the main keyboard handler (see the comment there).

## Recipes

**Tweak a weapon:** edit its numbers in `js/game/weapons.js`. Themed names per map are in each map file's `names`.

**Add a map:**
1. Copy `js/world/maps/kitchen.js` to a new file and change the key, name, spawns, props, names and `build()`.
2. Import it and add it to `THEMES` in `js/world/maps/index.js`.
3. In `build()`, use `addBox(minX, minY, minZ, maxX, maxY, maxZ, color)` for anything solid and `deco(geometry, color, x, y, z)` for visuals only. Put hidden `bound: true` boxes around the edges if players shouldn't leave.

**Add a Sandbox gadget:** add it to `GADGET_DEFS` and `SPAWN_ITEMS` in `js/sandbox/gadgets.js`, give it a mesh in `gadgetMesh()`, and its effect in `gadgetForces()` (continuous push) or `gadgetContacts()` (on touch).
