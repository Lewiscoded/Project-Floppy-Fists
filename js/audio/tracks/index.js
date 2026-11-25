/**
 * Every song, keyed by where it plays: 'menu' for menus/lobby/results, and each map's key for its matches.
 * To give a new map music, add a track file and list it here under the map's key.
 */
import { menu } from './menu.js';
import { kitchen } from './kitchen.js';
import { office } from './office.js';
import { medieval } from './castle.js';
import { hood } from './block-party.js';

export const TRACKS = { menu, kitchen, office, medieval, hood };
