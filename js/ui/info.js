/**
 * The Info screen: game version, who made it (with links), credits and the changelog.
 * The content itself lives in core/about.js.
 */
import { $, escapeHtml } from '../core/util.js';
import { game } from '../core/state.js';
import { AUTHOR, CHANGELOG, CREDITS, GAME_VERSION, LINKS } from '../core/about.js';
import { menuIsOpen } from './menu.js';

const link = (l) => `<a href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`;

function renderInfo() {
  $('infoBody').innerHTML = `
    <div class="info-head">
      <h2>Project Floppy Fists</h2>
      <span class="version-tag">v${GAME_VERSION}</span>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <h3>Made by</h3>
        <div class="maker">
          <div class="avatar">${escapeHtml(AUTHOR.initials)}</div>
          <div><b>${escapeHtml(AUTHOR.name)}</b><span>${escapeHtml(AUTHOR.title)} · @${escapeHtml(AUTHOR.handle)}</span></div>
        </div>
        <div class="links">${LINKS.map(link).join('')}</div>
        <h3 style="margin-top:14px">Built with</h3>
        <p class="credits">${CREDITS.map((c) => `${link(c)} for ${escapeHtml(c.what)}`).join('<br>')}</p>
      </div>
      <div class="info-box">
        <h3>What's new</h3>
        <ul class="changelog">
          ${CHANGELOG.map((c) => `<li><b>v${c.v} ${escapeHtml(c.title)}</b><span>${escapeHtml(c.notes)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;
}

export function openInfo() {
  renderInfo();
  $('info').classList.remove('hidden');
  game.menuOpen = true;
}

export function closeInfo() {
  $('info').classList.add('hidden');
  game.menuOpen = menuIsOpen();
}

for (const b of document.querySelectorAll('.infoBtn')) b.onclick = openInfo;
$('infoClose').onclick = closeInfo;
$('verTag').textContent = 'v' + GAME_VERSION;
