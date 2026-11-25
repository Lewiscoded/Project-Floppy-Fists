/**
 * Text chat, quick-chat wheel and emote wheel.
 */
import { game } from '../core/state.js';
import { sfx } from '../audio.js';
import { $, escapeHtml, now, toCssHex } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { startEmote } from '../game/physics.js';
import { send } from '../net/network.js';
import { EMOTES, QUICK } from './input.js';
import { feed, menuIsOpen } from './menu.js';

export function openChat() {
  $('chatBox').classList.remove('hidden');
  const i = $('chatIn');
  i.value = '';
  i.focus();
  game.menuOpen = true;
}

export function closeChat() {
  $('chatBox').classList.add('hidden');
  $('chatIn').blur();
  game.menuOpen = menuIsOpen();
}

export function sendChat(txt) {
  txt = String(txt || '')
    .trim()
    .slice(0, 80);
  if (!txt) return;
  if (now() - game.lastChat < 700) return;
  game.lastChat = now();
  const me = localPlayer();
  if (!me) return;
  send({ t: 'chat', id: me.id, n: me.name, c: me.col, txt });
  onChat(me.id, me.name, me.col, txt);
}

export function onChat(id, name, col, txt) {
  const b = bodies.get(id);
  if (b) b.bubble = { txt, t: 3.2 };
  feed(`<span style="color:${toCssHex(col)}">${escapeHtml(name)}:</span> ${escapeHtml(txt)}`);
  sfx(900, 0.06, 'sine', 0.04);
}

export function renderWheel() {
  const w = $('wheel');
  if (!game.wheelMode) {
    w.classList.add('hidden');
    return;
  }
  w.classList.remove('hidden');
  const items = game.wheelMode === 'quick' ? QUICK : EMOTES.map((e) => e[1]);
  w.innerHTML =
    items.map((t, i) => `<span><b>${i + 1}</b>${escapeHtml(t)}</span>`).join('') +
    '<span style="opacity:.6">Esc close</span>';
}

export function pickWheel(i) {
  const me = localPlayer();
  if (game.wheelMode === 'quick' && QUICK[i]) sendChat(QUICK[i]);
  if (game.wheelMode === 'emote' && EMOTES[i] && me) startEmote(me, EMOTES[i][0]);
  game.wheelMode = null;
  renderWheel();
}
