/**
 * What fighters look like: body meshes, faces, outfits, weapons in hand, and syncing meshes to the ragdoll.
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { prefs } from '../core/prefs.js';
import { V3, clamp, now, toCssHex } from '../core/util.js';
import { TMP } from '../game/bodies.js';
import {
  HEAD,
  LELB,
  LFOOT,
  LHAND,
  LHIP,
  LKNEE,
  LSH,
  NECK,
  PELV,
  RELB,
  RFOOT,
  RHAND,
  RHIP,
  RKNEE,
  RSH,
  restLen,
} from '../game/constants.js';
import { DEF_OUTFIT, outfitKey } from '../game/outfits.js';
import { WEAPONS } from '../game/weapons.js';
import { YAX, ZAX, puff } from './fx.js';
import { R90, boxGeo, cone, cylinderGeo, sphereGeo } from './materials.js';
import { scene } from './renderer.js';
import { THEME } from '../world/world.js';

const geoCache = {};

const capGeo = (r, l) =>
  geoCache[r + '_' + l] || (geoCache[r + '_' + l] = new THREE.CapsuleGeometry(r, l, 6, 14));

const SEGS = [
  [LSH, LELB, 0.11],
  [LELB, LHAND, 0.1],
  [RSH, RELB, 0.11],
  [RELB, RHAND, 0.1],
  [LHIP, LKNEE, 0.14],
  [LKNEE, LFOOT, 0.13],
  [RHIP, RKNEE, 0.14],
  [RKNEE, RFOOT, 0.13],
];

const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

const starMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0x664d00 });

export const tA = new V3(),
  tB = new V3(),
  tC = new V3(),
  M4 = new THREE.Matrix4();

function weaponMesh(key) {
  const g = new THREE.Group();
  const add = (geo, col, x, y, z, rx) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.38, metalness: 0.25, envMapIntensity: 1 })
    );
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const R = Math.PI / 2;
  const tb = THEME && THEME.meshes[key];
  if (tb) {
    tb((geo, col, x, y, z, rx) => add(geo, col, x, y, z, rx));
    return g;
  }
  if (key === 'bat') {
    add(new THREE.CylinderGeometry(0.08, 0.045, 0.95, 10), 0xc8925a, 0, 0, 0.42, R);
  } else if (key === 'sword') {
    add(new THREE.BoxGeometry(0.06, 0.02, 1.0), 0xdfe6ee, 0, 0, 0.6);
    add(new THREE.BoxGeometry(0.26, 0.05, 0.05), 0x8a6a2a, 0, 0, 0.08);
    add(new THREE.BoxGeometry(0.04, 0.04, 0.16), 0x4a3418, 0, 0, -0.03);
  } else if (key === 'pistol') {
    add(new THREE.BoxGeometry(0.07, 0.1, 0.3), 0x333740, 0, 0.02, 0.1);
    add(new THREE.BoxGeometry(0.06, 0.14, 0.06), 0x22252b, 0, -0.07, -0.02);
  } else if (key === 'shotgun') {
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), 0x2a2d33, -0.03, 0.03, 0.38, R);
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), 0x2a2d33, 0.03, 0.03, 0.38, R);
    add(new THREE.BoxGeometry(0.09, 0.1, 0.4), 0x8a5a32, 0, -0.01, -0.12);
  } else if (key === 'rifle') {
    add(new THREE.BoxGeometry(0.08, 0.12, 0.6), 0x3d434c, 0, 0, 0.18);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), 0x22252b, 0, 0.02, 0.62, R);
    add(new THREE.BoxGeometry(0.05, 0.18, 0.08), 0x22252b, 0, -0.13, 0.2);
  } else if (key === 'rocket') {
    add(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 14), 0x5f7a3e, 0, 0.12, 0.25, R);
    add(new THREE.CylinderGeometry(0.16, 0.13, 0.14, 14), 0x3d4f27, 0, 0.12, 0.84, R);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.06), 0x22252b, 0, -0.03, 0.15);
  } else if (key === 'grenade') {
    add(new THREE.SphereGeometry(0.12, 12, 10), 0x3e5a2a, 0, 0, 0.05);
  }
  return g;
}

const eyeGeo = new THREE.SphereGeometry(0.088, 16, 12),
  pupilGeo = new THREE.SphereGeometry(0.046, 12, 10),
  glintGeo = new THREE.SphereGeometry(0.016, 8, 6);

const browGeo = new THREE.BoxGeometry(0.11, 0.026, 0.03),
  mouthGeo = new THREE.TorusGeometry(0.065, 0.016, 6, 14, Math.PI),
  oGeo = new THREE.SphereGeometry(0.045, 10, 8),
  xGeo = new THREE.BoxGeometry(0.13, 0.025, 0.02);

const cheekMat = new THREE.MeshBasicMaterial({
  color: 0xff7a8a,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

const faceDark = new THREE.MeshStandardMaterial({ color: 0x1a1416, roughness: 0.4 });

const eyeWhite = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 });

const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

const olCache = {};

const outlineFor = (col) => {
  const k = new THREE.Color(col).getHex();
  return (
    olCache[k] ||
    (olCache[k] = new THREE.MeshBasicMaterial({
      color: new THREE.Color(col).multiplyScalar(0.28),
      side: THREE.BackSide,
    }))
  );
};

const mkSkin = (col) => {
  const c = new THREE.Color(col);
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.5,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
    sheen: 0.25,
    sheenRoughness: 0.6,
    sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.3),
    envMapIntensity: 0.45,
  });
};

const mkCloth = (col) =>
  new THREE.MeshPhysicalMaterial({
    color: col,
    roughness: 0.85,
    sheen: 0.8,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
    envMapIntensity: 0.3,
  });

// hats + face gear, built in head space (+z forward, y up, head radius .3)
function buildAccessories(grp, o) {
  while (grp.children.length) grp.remove(grp.children[0]);
  const A = (geo, col, x, y, z, ex = {}) => {
    const m = new THREE.Mesh(
      geo,
      ex.basic
        ? new THREE.MeshBasicMaterial({ color: col })
        : new THREE.MeshStandardMaterial({
            color: col,
            roughness: ex.rough ?? 0.6,
            metalness: ex.metal ?? 0,
            emissive: ex.em ?? 0,
          })
    );
    m.position.set(x, y, z);
    if (ex.rx) m.rotation.x = ex.rx;
    if (ex.ry) m.rotation.y = ex.ry;
    if (ex.rz) m.rotation.z = ex.rz;
    if (ex.s) m.scale.set(...ex.s);
    m.castShadow = true;
    grp.add(m);
    return m;
  };
  const hc = o.hatCol ?? 0xd62828,
    dome = (r) => new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  switch (o.hat) {
    case 'cap':
      A(dome(0.315), hc, 0, 0.06, 0);
      A(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), hc, 0, 0.075, 0.2, {
        s: [1.15, 1, 1.35],
      });
      A(sphereGeo(0.035), hc, 0, 0.37, 0);
      break;
    case 'beanie':
      A(dome(0.32), hc, 0, 0.05, 0, { s: [1, 1.15, 1] });
      A(
        new THREE.TorusGeometry(0.3, 0.05, 8, 24),
        new THREE.Color(hc).multiplyScalar(0.75).getHex(),
        0,
        0.07,
        0,
        { rx: R90 }
      );
      A(sphereGeo(0.08), 0xffffff, 0, 0.43, 0);
      break;
    case 'tophat':
      A(cylinderGeo(0.34, 0.34, 0.03, 24), 0x1a1a1e, 0, 0.24, 0);
      A(cylinderGeo(0.2, 0.21, 0.42, 24), 0x1a1a1e, 0, 0.46, 0);
      A(cylinderGeo(0.212, 0.212, 0.07, 24), hc, 0, 0.3, 0);
      break;
    case 'cowboy':
      A(cylinderGeo(0.48, 0.48, 0.03, 24), 0x8b5a32, 0, 0.2, 0, { s: [1, 1, 1.1] });
      A(cylinderGeo(0.2, 0.24, 0.28, 20), 0x8b5a32, 0, 0.34, 0);
      A(cylinderGeo(0.245, 0.245, 0.05, 20), 0x3a2616, 0, 0.24, 0);
      break;
    case 'crown': {
      A(cylinderGeo(0.22, 0.22, 0.12, 20, 1, true), 0xffd23f, 0, 0.3, 0, { metal: 0.8, rough: 0.25 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        A(cone(0.05, 0.13, 6), 0xffd23f, Math.cos(a) * 0.21, 0.42, Math.sin(a) * 0.21, {
          metal: 0.8,
          rough: 0.25,
        });
        A(
          sphereGeo(0.025),
          [0xd62828, 0x4aa8ff, 0x5ee07a][k % 3],
          Math.cos(a) * 0.225,
          0.3,
          Math.sin(a) * 0.225,
          { metal: 0.3, rough: 0.2 }
        );
      }
      break;
    }
    case 'hardhat':
      A(dome(0.32), 0xffd23f, 0, 0.06, 0, { rough: 0.35 });
      A(cylinderGeo(0.38, 0.38, 0.03, 24), 0xffd23f, 0, 0.07, 0.02, { rough: 0.35 });
      A(boxGeo(0.05, 0.04, 0.5), 0xe0b820, 0, 0.36, 0);
      break;
    case 'chef':
      A(cylinderGeo(0.22, 0.24, 0.26, 20), 0xffffff, 0, 0.36, 0, { rough: 0.9 });
      A(sphereGeo(0.27, 16), 0xffffff, 0, 0.55, 0, { s: [1, 0.6, 1], rough: 0.9 });
      break;
    case 'party': {
      const c = A(cone(0.15, 0.42, 16), hc, 0, 0.47, 0, { rz: 0.15 });
      A(sphereGeo(0.05), 0xffd23f, -0.03, 0.69, 0);
      break;
    }
  }
  switch (o.face) {
    case 'shades':
      for (const s of [-1, 1])
        A(boxGeo(0.14, 0.09, 0.03), 0x111111, s * 0.11, 0.06, 0.3, { rough: 0.1, metal: 0.6 });
      A(boxGeo(0.08, 0.02, 0.02), 0x111111, 0, 0.08, 0.3);
      for (const s of [-1, 1]) A(boxGeo(0.02, 0.02, 0.2), 0x111111, s * 0.2, 0.08, 0.24);
      break;
    case 'glasses':
      for (const s of [-1, 1])
        A(new THREE.TorusGeometry(0.065, 0.012, 6, 18), 0x2b2f36, s * 0.11, 0.06, 0.335);
      A(boxGeo(0.07, 0.015, 0.015), 0x2b2f36, 0, 0.07, 0.335);
      break;
    case 'mustache':
      for (const s of [-1, 1])
        A(sphereGeo(0.06, 10), 0x3a2616, s * 0.05, -0.015, 0.29, { s: [1.4, 0.5, 0.6], rz: s * 0.25 });
      break;
    case 'eyepatch':
      A(cylinderGeo(0.07, 0.07, 0.02, 16), 0x111111, -0.11, 0.06, 0.335, { rx: R90 });
      A(new THREE.TorusGeometry(0.305, 0.012, 6, 30), 0x111111, 0, 0.1, 0, { rx: R90 - 0.25 });
      break;
    case 'nose':
      A(sphereGeo(0.055, 14), 0xe82020, 0, -0.005, 0.31, { rough: 0.3 });
      break;
    case 'mask':
      A(boxGeo(0.46, 0.12, 0.06), 0x111111, 0, 0.06, 0.28, { s: [1, 1, 1] });
      A(new THREE.TorusGeometry(0.305, 0.02, 6, 30), 0x111111, 0, 0.06, 0, { rx: R90 });
      break;
  }
}

export class RagView {
  constructor(r, sc = scene) {
    const col = r.col;
    this.g = new THREE.Group();
    sc.add(this.g);
    this.sc = sc;
    // gummy skin + fabric clothes (each fighter owns its materials so outfits can change live)
    this.skin = mkSkin(col);
    this.dark = mkSkin(new THREE.Color(col).multiplyScalar(0.72));
    this.skinCol = col;
    this.shirtM = mkCloth(0xffffff);
    this.pantsM = mkCloth(0x2a4a9a);
    this.shoeM = mkCloth(0x2b2f36);
    const add = (geo, ol = 1.07) => {
      const x = new THREE.Mesh(geo, this.skin);
      x.castShadow = true;
      x.receiveShadow = true;
      const o = new THREE.Mesh(geo, outlineFor(col));
      o.scale.setScalar(ol);
      x.add(o);
      x.userData.ol = o;
      this.g.add(x);
      return x;
    };
    this.torso = add(capGeo(0.33, 0.42), 1.05);
    this.hips = add(capGeo(0.21, 0.22), 1.06);
    this.segs = SEGS.map(([a, b, rad]) => ({ a, b, m: add(capGeo(rad, restLen(a, b)), 1.12) }));
    this.hands = [
      add(new THREE.SphereGeometry(0.13, 16, 12), 1.12),
      add(new THREE.SphereGeometry(0.13, 16, 12), 1.12),
    ];
    this.feet = [
      add(new THREE.SphereGeometry(0.14, 16, 12), 1.1),
      add(new THREE.SphereGeometry(0.14, 16, 12), 1.1),
    ];
    for (const f of this.feet) f.scale.set(1, 0.7, 1.5);
    // head + face
    this.head = new THREE.Group();
    this.g.add(this.head);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), this.skin);
    hm.castShadow = true;
    const ho = new THREE.Mesh(hm.geometry, outlineFor(col));
    ho.scale.setScalar(1.055);
    hm.add(ho);
    hm.userData.ol = ho;
    this.head.add(hm);
    this.headMesh = hm;
    this.acc = new THREE.Group();
    this.head.add(this.acc);
    this.eyes = [];
    this.pupils = [];
    this.brows = [];
    this.xs = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, eyeWhite);
      e.position.set(s * 0.11, 0.06, 0.235);
      this.head.add(e);
      this.eyes.push(e);
      const pu = new THREE.Mesh(pupilGeo, faceDark);
      pu.position.set(s * 0.11, 0.06, 0.31);
      this.head.add(pu);
      this.pupils.push(pu);
      const gl = new THREE.Mesh(glintGeo, glintMat);
      gl.position.set(s * 0.11 - 0.018, 0.085, 0.345);
      this.head.add(gl);
      this.pupils.push(gl);
      const br = new THREE.Mesh(browGeo, faceDark);
      br.position.set(s * 0.115, 0.175, 0.265);
      this.head.add(br);
      this.brows.push(br);
      const ck = new THREE.Mesh(oGeo, cheekMat);
      ck.scale.set(1.3, 0.7, 0.3);
      ck.position.set(s * 0.18, -0.04, 0.23);
      this.head.add(ck);
      const xg = new THREE.Group();
      xg.position.set(s * 0.11, 0.06, 0.29);
      for (const r2 of [0.75, -0.75]) {
        const xm = new THREE.Mesh(xGeo, faceDark);
        xm.rotation.z = r2;
        xg.add(xm);
      }
      xg.visible = false;
      this.head.add(xg);
      this.xs.push(xg);
    }
    this.smile = new THREE.Mesh(mouthGeo, faceDark);
    this.smile.rotation.z = Math.PI;
    this.smile.position.set(0, -0.06, 0.275);
    this.head.add(this.smile);
    this.oMouth = new THREE.Mesh(oGeo, faceDark);
    this.oMouth.scale.set(1, 1.25, 0.5);
    this.oMouth.position.set(0, -0.09, 0.28);
    this.oMouth.visible = false;
    this.head.add(this.oMouth);
    this.blinkT = 1 + Math.random() * 3;
    this.dustT = 0;
    this.prevVy = 0;
    this.stars = new THREE.Group();
    this.g.add(this.stars);
    for (let k = 0; k < 3; k++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), starMat);
      const a = (k / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      this.stars.add(s);
    }
    this.cv = document.createElement('canvas');
    this.cv.width = 256;
    this.cv.height = 80;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.tex, depthTest: false, transparent: true, toneMapped: false })
    );
    this.label.scale.set(1.3, 0.4, 1);
    this.label.renderOrder = 5;
    this.g.add(this.label);
    this.lblKey = '';
    this.wKey = null;
    this.wMesh = null;
    this.outKey = null;
    this.applyOutfit(r.outfit || DEF_OUTFIT);
  }
  setSkin(col) {
    if (col === this.skinCol) return;
    this.skinCol = col;
    this.skin.color.setHex(col);
    this.skin.sheenColor = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.3);
    this.dark.color.setHex(col).multiplyScalar(0.72);
    this.outKey = null;
    this.applyOutfit(this.outfit || DEF_OUTFIT);
  }
  applyOutfit(o) {
    const key = outfitKey(o) + '|' + this.skinCol;
    if (key === this.outKey) return;
    this.outKey = key;
    this.outfit = o;
    const set = (m, mat) => {
      m.material = mat;
      m.userData.ol.material = outlineFor(mat.color);
    };
    if (o.shirt >= 0) this.shirtM.color.setHex(o.shirt);
    if (o.pants >= 0) this.pantsM.color.setHex(o.pants);
    const shirt = o.shirt >= 0 ? this.shirtM : this.skin,
      pants = o.pants >= 0 ? this.pantsM : this.dark;
    set(this.torso, shirt);
    set(this.hips, o.pants >= 0 ? this.pantsM : this.skin);
    this.segs.forEach((sg, i) => {
      const upperArm = i === 0 || i === 2,
        foreArm = i === 1 || i === 3,
        thigh = i === 4 || i === 6;
      set(
        sg.m,
        upperArm
          ? shirt
          : foreArm
            ? o.sleeves === 'long'
              ? shirt
              : this.skin
            : thigh
              ? pants
              : o.legs === 'long'
                ? pants
                : o.pants >= 0
                  ? this.skin
                  : this.dark
      );
    });
    for (const h of this.hands) set(h, this.skin);
    for (const f of this.feet) set(f, o.pants >= 0 || o.shirt >= 0 ? this.shoeM : this.dark);
    set(this.headMesh, this.skin);
    buildAccessories(this.acc, o);
  }
  drawLabel(fighter) {
    const key = fighter.name + '|' + Math.ceil(fighter.hp / 5) + '|' + fighter.dead;
    if (key === this.lblKey) return;
    this.lblKey = key;
    const cx = this.cv.getContext && this.cv.getContext('2d');
    if (!cx) return;
    cx.clearRect(0, 0, 256, 80);
    cx.font = '700 34px "Comic Neue", sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.lineWidth = 7;
    cx.strokeStyle = 'rgba(0,0,0,.45)';
    cx.strokeText(fighter.name, 128, 26);
    cx.fillStyle = toCssHex(fighter.col);
    cx.fillText(fighter.name, 128, 26);
    if (!fighter.dead) {
      cx.fillStyle = 'rgba(0,0,0,.5)';
      cx.beginPath();
      cx.roundRect(46, 54, 164, 16, 8);
      cx.fill();
      cx.fillStyle = fighter.hp > 50 ? '#5ee07a' : fighter.hp > 25 ? '#ffd23f' : '#ff5a5a';
      cx.beginPath();
      cx.roundRect(49, 57, 158 * clamp(fighter.hp / 100, 0, 1), 10, 5);
      cx.fill();
    }
    this.tex.needsUpdate = true;
  }
  update(fighter, dt) {
    const p = fighter.pos;
    this.g.visible = !(fighter.prot > 0 && !fighter.dead && Math.sin(now() * 0.035) > 0.6);
    for (const s of this.segs) {
      s.m.position.addVectors(p[s.a], p[s.b]).multiplyScalar(0.5);
      tA.subVectors(p[s.b], p[s.a]).normalize();
      s.m.quaternion.setFromUnitVectors(YAX, tA);
    }
    tA.addVectors(p[LSH], p[RSH]).multiplyScalar(0.5).lerp(p[NECK], 0.3);
    this.torso.position.addVectors(tA, p[PELV]).multiplyScalar(0.5).addScaledVector(fighter.f3, 0.04);
    tB.subVectors(tA, p[PELV]).normalize();
    this.torso.quaternion.setFromUnitVectors(YAX, tB);
    this.hands[0].position.copy(p[LHAND]);
    this.hands[1].position.copy(p[RHAND]);
    this.hips.position.addVectors(p[LHIP], p[RHIP]).multiplyScalar(0.5).lerp(p[PELV], 0.35);
    tA.subVectors(p[RHIP], p[LHIP]).normalize();
    this.hips.quaternion.setFromUnitVectors(YAX, tA);
    if (fighter.outfit && fighter.outfit !== this.outfit) this.applyOutfit(fighter.outfit);
    if (fighter.col !== this.skinCol) this.setSkin(fighter.col);
    tA.subVectors(p[HEAD], p[NECK]).normalize();
    tB.copy(fighter.f3).addScaledVector(tA, -tA.dot(fighter.f3)).normalize();
    tC.crossVectors(tA, tB);
    M4.makeBasis(tC, tA, tB);
    this.head.quaternion.setFromRotationMatrix(M4);
    this.head.position.copy(p[HEAD]);
    // expressions: happy / fighting / hurt / knocked out, plus blinking
    const ko = fighter.dead,
      hurt = !ko && fighter.stun > 0.3,
      fight = !ko && !hurt && (fighter.blocking || fighter.punchT > 0 || fighter.recoilT > 0);
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3.5;
    const blink = this.blinkT < 0 ? 0.12 : 1;
    const fc = (this.outfit && this.outfit.face) || 'none',
      shades = fc === 'shades';
    this.eyes.forEach((e, i) => {
      e.visible = !ko && !shades && !(fc === 'eyepatch' && i === 0);
      e.scale.set(1, hurt ? 1.2 : blink, 1);
    });
    this.pupils.forEach((q, i) => {
      q.visible = !ko && blink > 0.5 && !shades && !(fc === 'eyepatch' && i < 2);
      q.scale.setScalar(hurt ? 0.65 : 1);
    });
    this.xs.forEach((x, i) => {
      x.visible = ko && !shades && !(fc === 'eyepatch' && i === 0);
    });
    this.brows.forEach((b, i) => {
      const s = i ? 1 : -1;
      b.rotation.z = fight ? s * -0.45 : hurt ? s * 0.35 : 0;
      b.position.y = fight ? 0.155 : 0.18;
    });
    this.smile.visible = !ko && !hurt;
    this.smile.rotation.z = fight ? 0 : Math.PI;
    this.smile.position.y = fight ? -0.1 : -0.06;
    this.oMouth.visible = ko || hurt;
    tB.copy(fighter.fwd);
    tC.crossVectors(YAX, tB);
    M4.makeBasis(tC, YAX, tB);
    for (let k = 0; k < 2; k++) {
      this.feet[k].position.copy(p[k ? RFOOT : LFOOT]);
      this.feet[k].quaternion.setFromRotationMatrix(M4);
    }
    this.stars.visible = !fighter.dead && fighter.stun > 0.5;
    this.stars.position.copy(p[HEAD]);
    this.stars.position.y += 0.45;
    this.stars.rotation.y += dt * 7;
    this.label.position.copy(p[HEAD]);
    this.label.position.y += 0.75;
    this.label.visible = fighter.id !== game.myBodyId && prefs.set.tags;
    this.drawLabel(fighter);
    // footstep dust + landing puffs
    const v = fighter.vel[PELV],
      hs = Math.hypot(v.x, v.z);
    this.dustT -= dt;
    const footDown = Math.min(p[LFOOT].y, p[RFOOT].y);
    if (hs > 2.6 && this.dustT <= 0 && Math.abs(v.y) < 2 && !fighter.dead) {
      this.dustT = 0.16;
      const f = p[LFOOT].y < p[RFOOT].y ? p[LFOOT] : p[RFOOT];
      puff(TMP.set(f.x, f.y - 0.05, f.z), 0.16, (THEME && THEME.dust) || 0xcccccc, 0.55);
    }
    if (this.prevVy < -7 && v.y > -1.5 && !fighter.dead) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        puff(
          TMP.set(p[PELV].x + Math.cos(a) * 0.4, footDown, p[PELV].z + Math.sin(a) * 0.4),
          0.25,
          (THEME && THEME.dust) || 0xcccccc,
          0.7
        );
      }
    }
    this.prevVy = v.y;
    const wk = fighter.weapon;
    if (wk !== this.wKey) {
      if (this.wMesh) this.g.remove(this.wMesh);
      this.wKey = wk;
      this.wMesh = wk === 'fists' ? null : weaponMesh(wk);
      if (this.wMesh) this.g.add(this.wMesh);
    }
    if (this.wMesh) {
      this.wMesh.position.copy(p[RHAND]);
      const w = WEAPONS[wk];
      if (w.kind === 'melee') tA.subVectors(p[RHAND], p[RELB]).normalize().lerp(YAX, 0.35).normalize();
      else if (w.kind === 'grenade') tA.copy(fighter.fwd);
      else tA.copy(fighter.aim);
      this.wMesh.quaternion.setFromUnitVectors(ZAX, tA);
      this.wMesh.visible = !(fighter.dead && w.kind !== 'melee');
    }
  }
  dispose() {
    this.sc.remove(this.g);
  }
}
