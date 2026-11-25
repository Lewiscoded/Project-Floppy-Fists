/**
 * UI sounds, wired up once for the whole page (no per-button code needed):
 *   - hover tick on buttons and cards, click sounds (bigger pop for yellow "go" buttons, pop for options)
 *   - swoosh when a menu screen opens or closes
 *   - typing ticks in text boxes
 *   - error buzz / success chime when the status line under the menu changes
 * Also starts audio on the very first click or key press (browsers block sound before that).
 */
import { $ } from '../core/util.js';
import { initAudio } from '../audio/engine.js';
import {
  uiBigClick,
  uiClick,
  uiClose,
  uiError,
  uiHover,
  uiOpen,
  uiSuccess,
  uiToggle,
  uiType,
} from '../audio/sfx.js';

// things that should click: real buttons plus clickable cards and swatches
const CLICKABLE = 'button, .mcard, .wcard, .ltab, .sw, .cswatch, .wwi';
// options you pick from a set: these "pop" instead of "tok"
const OPTION = '.seg button, .copt button, .wcard, .sw, .cswatch, .mcard, #spawnMenu button';

// start audio on the first interaction
const unlock = () => {
  initAudio();
  removeEventListener('pointerdown', unlock, true);
  removeEventListener('keydown', unlock, true);
};
addEventListener('pointerdown', unlock, true);
addEventListener('keydown', unlock, true);

// hover: one soft tick each time the pointer moves onto a new clickable thing
let hovered = null;
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest(CLICKABLE);
  if (el === hovered) return;
  hovered = el;
  if (el && !el.disabled) uiHover();
});

// click
document.addEventListener(
  'pointerdown',
  (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest(CLICKABLE);
    if (!el || el.disabled) return;
    if (el.matches('button.go')) uiBigClick();
    else if (el.matches(OPTION)) uiToggle();
    else uiClick();
  },
  true
);

// typing
document.addEventListener('input', (e) => {
  if (e.target.matches('input[type=text], input:not([type])')) uiType();
});

// menu screens opening / closing (any .screen element losing or gaining the "hidden" class)
let lastSwoosh = 0;
const screenWatcher = new MutationObserver((changes) => {
  let opened = false,
    closed = false;
  for (const c of changes) {
    const wasHidden = (c.oldValue || '').split(' ').includes('hidden');
    const isHidden = c.target.classList.contains('hidden');
    if (wasHidden && !isHidden) opened = true;
    if (!wasHidden && isHidden) closed = true;
  }
  const now = performance.now();
  if (now - lastSwoosh < 120) return; // several screens swapping at once: one swoosh is enough
  if (opened) uiOpen();
  else if (closed) uiClose();
  if (opened || closed) lastSwoosh = now;
});
for (const s of document.querySelectorAll('.screen'))
  screenWatcher.observe(s, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });

// status line under the main menu: red text = error, green text = success
new MutationObserver(() => {
  const st = $('status');
  if (!st.textContent.trim()) return;
  if (st.classList.contains('ok')) uiSuccess();
  else uiError();
}).observe($('status'), { childList: true, characterData: true, subtree: true });
