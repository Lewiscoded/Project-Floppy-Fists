/**
 * The first-time tutorial cards.
 */
import { game } from '../core/state.js';
import { keyLabel, prefs, savePrefs } from '../core/prefs.js';
import { $, escapeHtml } from '../core/util.js';
import { menuIsOpen } from './menu.js';

// ---------- tutorial ----------
export function openTutorial() {
  const cards = [
    [
      '🕹️ Move & aim',
      `${keyLabel('up')}${keyLabel('left')}${keyLabel('down')}${keyLabel('right')} to wobble around. Your fighter faces the mouse. On a controller, use both sticks.`,
    ],
    [
      '💥 Attack',
      `Left click to attack. Switch weapons with ${keyLabel('slot1')} / ${keyLabel('slot2')} / ${keyLabel('slot3')} or the mouse wheel.`,
    ],
    [
      '🛡️ Block & parry',
      `With a melee weapon, hold right click or ${keyLabel('block')} to block. Tap it just before a hit lands to parry.`,
    ],
    [
      '🧗 Ledges',
      `Knocked off? Hold ${keyLabel('grab')} to grab the edge, then hold ${keyLabel('jump')} to climb back up.`,
    ],
    [
      '🎯 Win',
      `Deathmatch: first to the kill limit. Last Standing: don't run out of lives. Ring-outs count!`,
    ],
    [
      '💬 Talk',
      `${keyLabel('chat')} to chat, ${keyLabel('quick')} for quick chat, ${keyLabel('emote')} for emotes. ${keyLabel('loadout')} changes your loadout any time.`,
    ],
  ];
  $('tutGrid').innerHTML = cards
    .map((c) => `<div class="tc"><b>${c[0]}</b><span>${escapeHtml(c[1])}</span></div>`)
    .join('');
  $('tutorial').classList.remove('hidden');
  game.menuOpen = true;
}

export function closeTutorial() {
  $('tutorial').classList.add('hidden');
  prefs.tutDone = true;
  savePrefs();
  game.menuOpen = menuIsOpen();
}

$('tutClose').onclick = closeTutorial;
