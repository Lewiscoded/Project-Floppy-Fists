/**
 * Procedural textures painted onto canvases at startup (brick, wood, tile, carpet, cobble, ...). No image files.
 */
import * as THREE from 'three';
import { clamp } from '../core/util.js';

/* ---------- procedural textures ---------- */
const textureCache = {};

let seed = 1;
const seededRandom = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

function mkTex(name, draw, size = 256) {
  if (textureCache[name]) return textureCache[name];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  seed = name.length * 977 + 13;
  draw(x, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return (textureCache[name] = t);
}

function paintPixels(x, s, f) {
  const im = x.getImageData(0, 0, s, s),
    d = im.data;
  for (let j = 0; j < s; j++)
    for (let i = 0; i < s; i++) {
      const k = (j * s + i) * 4,
        v = f(i, j, d[k]);
      d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255);
      d[k + 3] = 255;
    }
  x.putImageData(im, 0, 0);
}

const DRAW = {
  plain: (x, s) => paintPixels(x, s, () => 238 + (seededRandom() - 0.5) * 14),
  concrete: (x, s) => {
    paintPixels(x, s, () => 228 + (seededRandom() - 0.5) * 26);
    for (let i = 0; i < 30; i++) {
      const g = x.createRadialGradient(
        seededRandom() * s,
        seededRandom() * s,
        0,
        seededRandom() * s,
        seededRandom() * s,
        20 + seededRandom() * 40
      );
      g.addColorStop(0, `rgba(0,0,0,${0.03 + seededRandom() * 0.05})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
    }
  },
  wood: (x, s) => {
    const ph = [0, 0, 0, 0].map(() => seededRandom() * 9);
    paintPixels(x, s, (i, j) => {
      const pl = Math.floor(j / (s / 4));
      const w =
        Math.sin((j + 7 * Math.sin(i * 0.025 + ph[pl])) * 0.55 + ph[pl]) * 12 +
        Math.sin(i * 0.07 + j * 0.3) * 3;
      return 214 + w + (seededRandom() - 0.5) * 10 - (j % (s / 4) < 2 ? 55 : 0);
    });
    for (let k = 0; k < 5; k++) {
      x.fillStyle = 'rgba(70,40,10,.22)';
      x.beginPath();
      x.ellipse(seededRandom() * s, seededRandom() * s, 9, 4, 0, 0, 7);
      x.fill();
    }
  },
  tile: (x, s) => {
    const n = 4,
      t = s / n;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const v = 236 + (seededRandom() - 0.5) * 16;
        x.fillStyle = `rgb(${v},${v},${v})`;
        x.fillRect(a * t, b * t, t, t);
        x.fillStyle = 'rgba(255,255,255,.35)';
        x.fillRect(a * t + 3, b * t + 3, t - 6, 3);
      }
    x.fillStyle = 'rgb(170,170,170)';
    for (let a = 0; a <= n; a++) {
      x.fillRect(a * t - 2, 0, 4, s);
      x.fillRect(0, a * t - 2, s, 4);
    }
  },
  brick: (x, s) => {
    x.fillStyle = 'rgb(150,146,140)';
    x.fillRect(0, 0, s, s);
    const rows = 8,
      h = s / rows,
      w = s / 4;
    for (let r = 0; r < rows; r++)
      for (let c = -1; c < 5; c++) {
        const off = r % 2 ? w / 2 : 0,
          v = 190 + (seededRandom() - 0.5) * 50;
        x.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        x.fillRect(c * w + off + 3, r * h + 3, w - 6, h - 6);
        x.fillStyle = 'rgba(255,255,255,.12)';
        x.fillRect(c * w + off + 3, r * h + 3, w - 6, 3);
      }
    const im = x.getImageData(0, 0, s, s);
    for (let k = 0; k < im.data.length; k += 4) {
      const n = (seededRandom() - 0.5) * 18;
      im.data[k] += n;
      im.data[k + 1] += n;
      im.data[k + 2] += n;
    }
    x.putImageData(im, 0, 0);
  },
  cobble: (x, s) => {
    x.fillStyle = 'rgb(140,135,128)';
    x.fillRect(0, 0, s, s);
    for (let k = 0; k < 70; k++) {
      const cx = seededRandom() * s,
        cy = seededRandom() * s,
        r = 12 + seededRandom() * 12,
        v = 180 + (seededRandom() - 0.5) * 60;
      for (const [ox, oy] of [
        [0, 0],
        [s, 0],
        [-s, 0],
        [0, s],
        [0, -s],
      ]) {
        x.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        x.beginPath();
        x.ellipse(cx + ox, cy + oy, r, r * 0.8, seededRandom() * 3, 0, 7);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,.12)';
        x.beginPath();
        x.ellipse(cx + ox - 2, cy + oy - 3, r * 0.6, r * 0.4, 0, 0, 7);
        x.fill();
      }
    }
  },
  grass: (x, s) => {
    paintPixels(x, s, () => 205 + (seededRandom() - 0.5) * 30);
    for (let k = 0; k < 1400; k++) {
      const v = 170 + seededRandom() * 85,
        a = seededRandom() * 6.28;
      x.strokeStyle = `rgba(${v},${v},${v},.7)`;
      x.lineWidth = 1.2;
      x.beginPath();
      const px = seededRandom() * s,
        py = seededRandom() * s;
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5);
      x.stroke();
    }
  },
  carpet: (x, s) => {
    paintPixels(
      x,
      s,
      (i, j) => 226 + (seededRandom() - 0.5) * 36 + (i % (s / 2) < 2 || j % (s / 2) < 2 ? -22 : 0)
    );
  },
  marble: (x, s) => {
    paintPixels(x, s, () => 244 + (seededRandom() - 0.5) * 8);
    x.filter = 'blur(2.5px)';
    for (let k = 0; k < 5; k++) {
      x.strokeStyle = `rgba(160,150,140,${0.1 + seededRandom() * 0.12})`;
      x.lineWidth = 2 + seededRandom() * 3;
      x.beginPath();
      let px = seededRandom() * s,
        py = -10;
      x.moveTo(px, py);
      for (let t = 0; t < 6; t++) {
        const nx = px + (seededRandom() - 0.5) * 50,
          ny = py + s / 5;
        x.quadraticCurveTo(px + (seededRandom() - 0.5) * 40, py + s / 10, nx, ny);
        px = nx;
        py = ny;
      }
      x.stroke();
    }
    x.filter = 'none';
  },
  metal: (x, s) => paintPixels(x, s, (i, j) => 230 + Math.sin(j * 1.7) * 4 + (seededRandom() - 0.5) * 16),
  cardboard: (x, s) => {
    paintPixels(x, s, (i) => 232 + (i % 8 < 2 ? -14 : 0) + (seededRandom() - 0.5) * 12);
    x.fillStyle = 'rgba(120,80,30,.25)';
    x.fillRect(0, s * 0.45, s, s * 0.1);
  },
  hay: (x, s) => {
    paintPixels(x, s, () => 215 + (seededRandom() - 0.5) * 30);
    for (let k = 0; k < 900; k++) {
      const v = 150 + seededRandom() * 100;
      x.strokeStyle = `rgba(${v},${v},${v},.6)`;
      x.beginPath();
      const px = seededRandom() * s,
        py = seededRandom() * s;
      x.moveTo(px, py);
      x.lineTo(px + 14, py + (seededRandom() - 0.5) * 4);
      x.stroke();
    }
  },
  windows: (x, s) => {
    x.fillStyle = 'rgb(190,196,206)';
    x.fillRect(0, 0, s, s);
    const n = 8,
      t = s / n;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const lit = seededRandom() < 0.25;
        const v = lit ? 250 : 90 + seededRandom() * 40;
        x.fillStyle = lit
          ? `rgb(255,${235 + seededRandom() * 15},${190 + seededRandom() * 40})`
          : `rgb(${v - 20},${v},${v + 30})`;
        x.fillRect(a * t + 4, b * t + 5, t - 8, t - 10);
      }
  },
};

export const getTexture = (n) => mkTex(n, DRAW[n] || DRAW.plain);

// box geometry whose UVs are in world units, so textures keep the same scale on every box
export function worldBox(w, h, d, sc) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!g.attributes) return g;
  const uv = g.attributes.uv,
    dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / sc, (uv.getY(k) * dims[f][1]) / sc);
    }
  uv.needsUpdate = true;
  return g;
}

let softTexCache = null;

export function softTex() {
  if (softTexCache) return softTexCache;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  softTexCache = new THREE.CanvasTexture(c);
  return softTexCache;
}

/* ---------- extra textures + props for the city block ---------- */
DRAW.checker = (x, s) => {
  const n = 4,
    t = s / n;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      const w = (a + b) % 2 === 0;
      const v = (seededRandom() - 0.5) * 10;
      x.fillStyle = w ? `rgb(${244 + v},${238 + v},${226 + v})` : `rgb(${122 + v},${150 + v},${140 + v})`;
      x.fillRect(a * t, b * t, t, t);
      x.fillStyle = 'rgba(255,255,255,.18)';
      x.fillRect(a * t + 2, b * t + 2, t - 4, 2);
    }
};

DRAW.asphalt = (x, s) => {
  paintPixels(x, s, () => 120 + (seededRandom() - 0.5) * 40);
  for (let k = 0; k < 400; k++) {
    const v = 150 + seededRandom() * 60;
    x.fillStyle = `rgba(${v},${v},${v},.5)`;
    x.fillRect(seededRandom() * s, seededRandom() * s, 1.5, 1.5);
  }
  x.strokeStyle = 'rgba(30,30,30,.35)';
  x.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    x.beginPath();
    let px = seededRandom() * s,
      py = seededRandom() * s;
    x.moveTo(px, py);
    for (let t = 0; t < 5; t++) {
      px += (seededRandom() - 0.5) * 40;
      py += (seededRandom() - 0.5) * 40;
      x.lineTo(px, py);
    }
    x.stroke();
  }
};

DRAW.court = (x, s) => {
  x.fillStyle = '#3d6fb8';
  x.fillRect(0, 0, s, s);
  x.fillStyle = '#c96a3a';
  x.fillRect(s * 0.06, s * 0.08, s * 0.88, s * 0.84);
  x.strokeStyle = '#fff';
  x.lineWidth = 4;
  x.strokeRect(s * 0.06, s * 0.08, s * 0.88, s * 0.84);
  x.beginPath();
  x.moveTo(s / 2, s * 0.08);
  x.lineTo(s / 2, s * 0.92);
  x.stroke();
  x.beginPath();
  x.arc(s / 2, s / 2, s * 0.1, 0, 7);
  x.stroke();
  for (const [cx, d] of [
    [s * 0.06, 1],
    [s * 0.94, -1],
  ]) {
    x.fillStyle = 'rgba(208,74,74,.85)';
    x.fillRect(Math.min(cx, cx + d * s * 0.17), s * 0.38, s * 0.17, s * 0.24);
    x.strokeRect(Math.min(cx, cx + d * s * 0.17), s * 0.38, s * 0.17, s * 0.24);
    x.beginPath();
    x.arc(cx, s / 2, s * 0.3, d > 0 ? -1.25 : 1.9, d > 0 ? 1.25 : 4.4);
    x.stroke();
  }
};

export function stripes() {
  return mkTex('stripes', (x, s) => {
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#ffffff' : '#d04a4a';
      x.fillRect((i * s) / 8, 0, s / 8, s);
    }
  });
}

export function graffiti() {
  return mkTex(
    'graffiti',
    (x, s) => {
      x.fillStyle = '#d8d4cc';
      x.fillRect(0, 0, s, s);
      const cols = ['#ff4fd8', '#2ec4b6', '#ffd23f', '#9b6bff', '#ff6a1a', '#4aa8ff', '#5ee07a'];
      for (let i = 0; i < 14; i++) {
        x.fillStyle = cols[i % cols.length];
        x.globalAlpha = 0.85;
        x.beginPath();
        x.ellipse(
          seededRandom() * s,
          seededRandom() * s,
          20 + seededRandom() * 60,
          14 + seededRandom() * 30,
          seededRandom() * 3,
          0,
          7
        );
        x.fill();
      }
      x.globalAlpha = 1;
      x.font = 'bold 64px "Lilita One", Impact, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      for (const [t, y, c] of [
        ['FLOPPY', s * 0.38, '#ffd23f'],
        ['FISTS!', s * 0.66, '#ff4fd8'],
      ]) {
        x.lineWidth = 14;
        x.strokeStyle = '#1d2433';
        x.strokeText(t, s / 2, y);
        x.lineWidth = 6;
        x.strokeStyle = '#ffffff';
        x.strokeText(t, s / 2, y);
        x.fillStyle = c;
        x.fillText(t, s / 2, y);
      }
      for (let i = 0; i < 40; i++) {
        x.fillStyle = cols[i % cols.length];
        x.beginPath();
        x.arc(seededRandom() * s, seededRandom() * s, 1 + seededRandom() * 3, 0, 7);
        x.fill();
      }
    },
    512
  );
}
