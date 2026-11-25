/**
 * In-game HUD: health, weapon slots, scoreboard, match info, center messages.
 */
import { game } from '../core/state.js';
import { keyLabel } from '../core/prefs.js';
import { $, clamp, escapeHtml, now, toCssHex } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { isEliminated, meleeOnly } from '../game/match.js';
import { SLOT_ORDER, WEAPONS } from '../game/weapons.js';
import { net } from '../net/network.js';
import { camSubject } from '../render/camera.js';
import { fly } from '../sandbox/sandbox-ui.js';
import { fmtTime } from './lobby.js';
import { wName } from '../world/world.js';

let hudT = 0;

export function updateHud(dt) {
  const me = localPlayer();
  if (!me) return;
  $('hpfill').style.width = clamp(me.hp, 0, 100) + '%';
  $('hptxt').textContent = Math.max(0, Math.ceil(me.hp));
  $('hpfill').style.background =
    me.prot > 0
      ? 'linear-gradient(90deg,#7fc4ff,#b8e0ff)'
      : me.hp > 50
        ? 'linear-gradient(90deg,#5ee07a,#a4f26b)'
        : me.hp > 25
          ? '#ffd23f'
          : '#ff5a5a';
  $('slots').innerHTML = SLOT_ORDER.filter((s) => !meleeOnly() || s === 'melee')
    .map((s) => {
      const i = SLOT_ORDER.indexOf(s);
      const w = WEAPONS[me.loadout[s]];
      const cd = me.cds[s] > 0 ? clamp(me.cds[s] / w.cd, 0, 1) : 0;
      return `<div class="slot ${me.slot === s ? 'sel' : ''}"><small>${keyLabel('slot' + (i + 1))}</small>${wName(me.loadout[s])}<div class="cd" style="width:${cd * 100}%"></div></div>`;
    })
    .join('');
  let center = '';
  if (me.dead) {
    if (isEliminated(me)) {
      const t = camSubject();
      center = `ELIMINATED<small>Spectating ${t && t !== me ? escapeHtml(t.name) : '…'} · click or ${keyLabel('jump')} to switch</small>`;
    } else {
      const kl = me.lastKiller && bodies.get(me.lastKiller);
      center = `SPLAT!<small>${kl ? `Killed by <span style="color:${toCssHex(kl.col)}">${escapeHtml(kl.name)}</span> · ` : ''}Respawning in ${Math.max(0, me.deadT).toFixed(1)}s · ${keyLabel('loadout')} to change loadout</small>`;
    }
  } else if (me.heldBy)
    center = `GRABBED!<small>Mash ${keyLabel('jump')} or click to break free ${'●'.repeat(Math.min(5, Math.floor(me.struggle)))}${'○'.repeat(Math.max(0, 5 - Math.floor(me.struggle)))}</small>`;
  else if (me.msgT > 0) center = me.msg;
  else if (fly.on)
    center = `<small>🎥 Free camera · ${keyLabel('up')}${keyLabel('left')}${keyLabel('down')}${keyLabel('right')} fly · ${keyLabel('jump')} / Shift up and down · hold right click to look · wheel speed · ${keyLabel('fly')} back</small>`;
  else if (me.prot > 0) center = `<small>🛡️ Spawn protection ${me.prot.toFixed(1)}s</small>`;
  $('center').innerHTML = center;
  const melee = WEAPONS[me.weapon].kind === 'melee';
  $('guardbar').classList.toggle('hidden', !melee || (me.guard >= 100 && !me.blocking));
  $('guardfill').style.width = me.guard + '%';
  $('guardfill').style.background = me.guardBroken > 0 ? '#ff5a5a' : '#7fc4ff';
  // match info
  const tl = game.matchEnd ? fmtTime(Math.max(0, (game.matchEnd - now()) / 1000)) : '';
  const room =
    (game.match.weapons === 'melee' && game.match.mode !== 'sb' ? ' · Melee only' : '') +
    (net.mode !== 'off' ? ` · Room ${net.code}` : '');
  $('matchInfo').innerHTML =
    game.match.mode === 'sb'
      ? `Sandbox · ${keyLabel('wheel')} weapons · ${keyLabel('spawn')} spawn · ${keyLabel('fly')} free cam${room}`
      : game.match.mode === 'dm'
        ? `Deathmatch · first to ${game.match.killLimit}${tl ? `<b>${tl}</b>` : ''}${room}`
        : `Last Standing · ${'❤'.repeat(Math.max(0, game.match.lives - me.deaths)) || 'out'}${tl ? `<b>${tl}</b>` : ''}${room}`;
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.3;
  const list = [...bodies.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const online = net.mode !== 'off';
  $('board').innerHTML =
    `<div><span>FIGHTER</span><span>${game.match.mode === 'lms' ? 'LIVES · ' : ''}K / D</span></div>` +
    list
      .map((b) => {
        const isB = b.bot || b.isBot,
          pg =
            online && !isB
              ? b.id === game.myBodyId
                ? net.mode === 'host'
                  ? 'host'
                  : net.ping + 'ms'
                : b.ping
                  ? b.ping + 'ms'
                  : 'host'
              : '';
        const lv = game.match.mode === 'lms' ? `${Math.max(0, game.match.lives - b.deaths)} · ` : '';
        return `<div class="${b.id === game.myBodyId ? 'me' : ''}" style="${isEliminated(b) ? 'opacity:.45' : ''}"><span><i style="background:${toCssHex(b.col)}"></i>${escapeHtml(b.name)}${pg ? `<span class="pg">${pg}</span>` : ''}</span><span>${lv}${b.kills} / ${b.deaths}</span></div>`;
      })
      .join('');
}
