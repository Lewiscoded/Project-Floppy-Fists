/**
 * Screen overlay: crosshair, hitmarkers, damage numbers, off-screen arrows, speech bubbles.
 */
import { game } from '../core/state.js';
import { sfx, uiPow, volAt } from '../audio/sfx.js';
import { prefs } from '../core/prefs.js';
import { $, V3, clamp, toCssHex } from '../core/util.js';
import { bodies, localPlayer } from '../game/bodies.js';
import { HEAD, PELV } from '../game/constants.js';
import { camera, renderer } from '../render/renderer.js';
import { gamepad, mouse } from './input.js';

const overlayLayer = $('ov'),
  xhair = $('xhair'),
  hmEl = xhair.querySelector('.hm');

const pools = { arrow: new Map(), bubble: new Map() },
  dnums = [],
  ddirs = [],
  bursts = [];

let hitmarkerT = 0;

function proj(v) {
  const q = v.clone().project(camera);
  return {
    x: ((q.x + 1) / 2) * innerWidth,
    y: ((1 - q.y) / 2) * innerHeight,
    behind: q.z > 1,
    on: q.z < 1 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1,
  };
}

export function showHitFeedback(m) {
  hitmarkerT = 0.18;
  hmEl.classList.add('on');
  hmEl.classList.toggle('hs', !!m.hs);
  if (m.pr) {
    sfx(300, 0.05, 'sine', 0.05);
  } else if (m.hs) {
    sfx(1650, 0.12, 'sine', 0.12);
    sfx(2200, 0.08, 'sine', 0.06);
  } else sfx(1100, 0.05, 'triangle', 0.07);
  if (!prefs.set.dmgNums) return;
  const el = document.createElement('div');
  el.className = 'dnum' + (m.hs ? ' hs' : '') + (m.pr ? ' pr' : '');
  el.textContent = m.pr ? 'shielded' : m.hs ? m.d + '!' : m.d;
  overlayLayer.appendChild(el);
  dnums.push({ el, p: new V3(m.p[0] + (Math.random() - 0.5) * 0.4, m.p[1], m.p[2]), t: 0 });
}

/** Comic sound words for kills, picked by how the fighter went down. */
const BURST_WORDS = {
  melee: { words: ['BONK!', 'WHAM!', 'THWACK!', 'SMACK!', 'POW!'], color: '' },
  gun: { words: ['BLAM!', 'POW!', 'KO!', 'ZING!'], color: '' },
  boom: { words: ['KABOOM!', 'KA-BLAM!', 'BOOM!'], color: 'red' },
  throw: { words: ['YEET!', 'WHEEE!'], color: 'blue' },
  fall: { words: ['SPLAT!', 'OOF!', 'BYE!'], color: 'blue' },
};

/**
 * Show a comic burst ("POW!") over a point in the world.
 * kind is one of the BURST_WORDS keys.
 */
export function comicBurst(worldPos, kind) {
  const set = BURST_WORDS[kind] || BURST_WORDS.melee;
  const el = document.createElement('div');
  el.className = 'burst' + (set.color ? ' ' + set.color : '');
  el.innerHTML = `<div class="star"><b>${set.words[(Math.random() * set.words.length) | 0]}</b></div>`;
  overlayLayer.appendChild(el);
  uiPow(volAt(worldPos));
  bursts.push({ el, p: worldPos.clone().add(new V3(0, 0.6, 0)), t: 0 });
}

export function dmgDir(by, pos) {
  const me = localPlayer();
  if (!me) return;
  let src = pos;
  if (!src) {
    const a = by && bodies.get(by);
    if (!a) return;
    src = a.pos[PELV];
  }
  const d = new V3().subVectors(src, me.pos[PELV]);
  if (Math.hypot(d.x, d.z) < 0.5) return;
  const el = document.createElement('div');
  el.className = 'ddir';
  overlayLayer.appendChild(el);
  ddirs.push({ el, ang: Math.atan2(d.x, -d.z), t: 0 });
}

function poolEl(kind, id, cls) {
  const m = pools[kind];
  let el = m.get(id);
  if (!el) {
    el = document.createElement('div');
    el.className = cls;
    overlayLayer.appendChild(el);
    m.set(id, el);
  }
  el._seen = true;
  return el;
}

function sweep(kind) {
  for (const [id, el] of pools[kind]) {
    if (!el._seen) {
      el.remove();
      pools[kind].delete(id);
    } else el._seen = false;
  }
}

export function updateOverlay(dt) {
  const playing = game.state === 'play';
  const me = localPlayer();
  // crosshair
  const showX = playing && !game.menuOpen && !gamepad.active && me && !me.dead;
  xhair.classList.toggle('hidden', !showX);
  renderer.domElement.style.cursor = showX ? 'none' : 'crosshair';
  if (showX) {
    xhair.style.left = mouse.x + 'px';
    xhair.style.top = mouse.y + 'px';
  }
  hitmarkerT -= dt;
  if (hitmarkerT <= 0) hmEl.classList.remove('on');
  // kill bursts (the pop animation itself is CSS; here they just follow the world point)
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.t += dt;
    const s = proj(b.p);
    b.el.style.left = s.x + 'px';
    b.el.style.top = s.y + 'px';
    b.el.style.visibility = s.behind ? 'hidden' : 'visible';
    if (b.t > 1.15) {
      b.el.remove();
      bursts.splice(i, 1);
    }
  }
  // damage numbers
  for (let i = dnums.length - 1; i >= 0; i--) {
    const d = dnums[i];
    d.t += dt;
    d.p.y += dt * 1.2;
    const s = proj(d.p);
    d.el.style.left = s.x + 'px';
    d.el.style.top = s.y + 'px';
    d.el.style.opacity = String(clamp(1.4 - d.t * 1.6, 0, 1));
    d.el.style.visibility = s.behind ? 'hidden' : 'visible';
    if (d.t > 0.9) {
      d.el.remove();
      dnums.splice(i, 1);
    }
  }
  // damage direction arcs (rotate with the camera, which looks toward -z)
  for (let i = ddirs.length - 1; i >= 0; i--) {
    const d = ddirs[i];
    d.t += dt;
    d.el.style.transform = `rotate(${d.ang}rad)`;
    d.el.style.opacity = String(clamp(1 - d.t, 0, 1));
    if (d.t > 1) {
      d.el.remove();
      ddirs.splice(i, 1);
    }
  }
  if (!playing) {
    sweep('arrow');
    sweep('bubble');
    return;
  }
  const W = innerWidth,
    H = innerHeight,
    M = 34;
  for (const b of bodies.values()) {
    if (b.id === game.myBodyId) {
      if (b.bubble) drawBubble(b, dt);
      continue;
    }
    if (b.bubble) drawBubble(b, dt);
    if (b.dead) continue;
    const s = proj(b.pos[PELV]);
    if (s.on) continue;
    let x = s.x - W / 2,
      y = s.y - H / 2;
    if (s.behind) {
      x = -x;
      y = -y;
    }
    const ang = Math.atan2(y, x),
      sc = Math.min(
        (W / 2 - M) / Math.abs(Math.cos(ang) || 1e-6),
        (H / 2 - M) / Math.abs(Math.sin(ang) || 1e-6)
      );
    const el = poolEl('arrow', b.id, 'arrow');
    el.style.left = W / 2 + Math.cos(ang) * sc - 11 + 'px';
    el.style.top = H / 2 + Math.sin(ang) * sc - 10 + 'px';
    el.style.transform = `rotate(${ang + Math.PI / 2}rad)`;
    el.style.borderBottomColor = toCssHex(b.col);
  }
  sweep('arrow');
  sweep('bubble');
}

function drawBubble(fighter, dt) {
  fighter.bubble.t -= dt;
  if (fighter.bubble.t <= 0) {
    fighter.bubble = null;
    return;
  }
  const s = proj(fighter.pos[HEAD].clone().add(new V3(0, 1.15, 0)));
  if (!s.on) return;
  const el = poolEl('bubble', fighter.id, 'bubble');
  if (el.textContent !== fighter.bubble.txt) el.textContent = fighter.bubble.txt;
  el.style.left = s.x + 'px';
  el.style.top = s.y + 'px';
  el.style.opacity = String(clamp(fighter.bubble.t * 2, 0, 1));
}
