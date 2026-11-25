/**
 * Shared mutable game state.
 *
 * Most modules only read each other's exports. These values are changed from several modules, so they live
 * on one object instead of as separate variables (an imported variable can't be reassigned).
 *
 * Fields:
 *   state         Which screen the game is on: 'menu' | 'lobby' | 'play' | 'results'.  (set up in core/prefs.js)
 *   match         Current match settings: mode (dm / lms / sb), limits, bots, difficulty, map.  (set up in core/prefs.js)
 *   matchEnd      Timestamp (ms) when the timed match ends, or 0.  (set up in core/prefs.js)
 *   lobbyRoster   Players shown in the lobby.  (set up in core/prefs.js)
 *   myReady       Whether you pressed Ready in the lobby.  (set up in core/prefs.js)
 *   resultsTimer  Timer that returns everyone to the lobby after results.  (set up in core/prefs.js)
 *   myBodyId      Id of the fighter you control.  (set up in game/bodies.js)
 *   menuOpen      True while any menu covers the game (blocks gameplay input).  (set up in ui/input.js)
 *   rebinding     Action being rebound in Settings, or null.  (set up in ui/input.js)
 *   wheelMode     Open quick wheel: 'chat' | 'emote' | null.  (set up in ui/input.js)
 *   lastChat      Timestamp of your last chat message (spam guard).  (set up in ui/input.js)
 *   tethers       Active grab links (hand -> held thing), rebuilt every frame.  (set up in game/grab.js)
 *   projSeq       Counter for projectile ids.  (set up in game/projectiles.js)
 *   propSeq       Counter for prop ids.  (set up in game/props.js)
 *   shake         Camera shake amount.  (set up in render/fx.js)
 *   hurtFlash     Red screen flash amount when you take damage.  (set up in render/fx.js)
 *   VOLUME        Master x effects volume (0..1).  (set up in audio.js)
 *   grassMesh     Instanced grass of the current map, if any.  (set up in world/world.js)
 *   placing       Sandbox item being placed, or null.  (set up in sandbox/sandbox-ui.js)
 *   placeYaw      Rotation of the Sandbox placement preview.  (set up in sandbox/sandbox-ui.js)
 *   specIdx       Which fighter the spectator camera follows.  (set up in render/camera.js)
 */
export const game = {};
