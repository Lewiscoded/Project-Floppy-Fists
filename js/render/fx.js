/**
 * Short-lived visual effects: muzzle flashes, sparks, smoke, explosions, debris,
 * plus the moving puffs used by the flamethrower, leaf blower and other new weapons (streak()).
 */
import * as THREE from 'three';
import { game } from '../core/state.js';
import { noise, sfx, volAt } from '../audio/sfx.js';
import { V3, clamp } from '../core/util.js';
import { localPlayer } from '../game/bodies.js';
import { G, PELV } from '../game/constants.js';
import { flashLight, scene, updateFlashLights } from './renderer.js';
import { softTex } from './textures.js';
import { THEME } from '../world/world.js';

const fxParticles = [];

export const ZAX = new V3(0, 0, 1),
  YAX = new V3(0, 1, 0);

const puffGeo = new THREE.SphereGeometry(1, 10, 8);

function sprite(color, opacity, additive) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTex(),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
  );
  m.material.rotation = Math.random() * 6.28;
  scene.add(m);
  return m;
}

export function puff(p, size, color, life) {
  const m = sprite(color, 0.65, false);
  m.position.copy(p);
  m.scale.setScalar(size * 2);
  const rise = 0.4 + Math.random() * 0.6;
  fxParticles.push({
    m,
    t: 0,
    life,
    update(f, dt) {
      m.scale.setScalar(size * 2 * (1 + f * 2.2));
      m.material.opacity = 0.65 * (1 - f) * (1 - f);
      m.position.y += rise * dt;
    },
  });
}

/** A puff that flies with velocity v while it grows and fades (flame jets, wind gusts, cream splats). */
export function streak(p, v, size, color, life, additive = false, grow = 2) {
  const m = sprite(color, additive ? 1 : 0.8, additive);
  m.position.copy(p);
  m.scale.setScalar(size);
  const vel = v.clone();
  fxParticles.push({
    m,
    t: 0,
    life,
    update(f, dt) {
      m.position.addScaledVector(vel, dt);
      vel.multiplyScalar(1 - dt * 1.5);
      m.scale.setScalar(size * (1 + f * grow));
      m.material.opacity = (additive ? 1 : 0.8) * (1 - f);
    },
  });
}

export function glow(p, size, color, life, grow = 1) {
  const m = sprite(color, 1, true);
  m.position.copy(p);
  m.scale.setScalar(size);
  fxParticles.push({
    m,
    t: 0,
    life,
    update(f) {
      m.scale.setScalar(size * (1 + f * grow));
      m.material.opacity = 1 - f;
    },
  });
  return m;
}

export function boomFx(p, R, k) {
  const bc = (THEME && THEME.boom[k]) || [0xfff0a0, 0xff7a2a, 0x777777];
  glow(p, R * 1.3, bc[0], 0.22, 0.6);
  for (let i = 0; i < 7; i++) {
    const q = p
      .clone()
      .add(
        new V3((Math.random() - 0.5) * R * 0.6, Math.random() * R * 0.35, (Math.random() - 0.5) * R * 0.6)
      );
    glow(q, R * (0.5 + Math.random() * 0.4), bc[1], 0.35 + Math.random() * 0.25, 1.2);
  }
  // shockwave ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({
      color: bc[0],
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(p);
  ring.position.y += 0.05;
  scene.add(ring);
  fxParticles.push({
    m: ring,
    t: 0,
    life: 0.45,
    update(f) {
      ring.scale.setScalar(0.5 + R * 1.5 * Math.sqrt(f));
      ring.material.opacity = 0.8 * (1 - f);
    },
  });
  for (let i = 0; i < 12; i++)
    puff(
      p
        .clone()
        .add(
          new V3((Math.random() - 0.5) * R * 0.9, Math.random() * R * 0.4, (Math.random() - 0.5) * R * 0.9)
        ),
      0.5 + Math.random() * 0.6,
      bc[2],
      1.2 + Math.random() * 0.8
    );
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial({
        color: i % 3 ? 0x333333 : bc[1],
        emissive: i % 3 ? 0 : bc[1],
        emissiveIntensity: 2,
      })
    );
    d.position.copy(p);
    scene.add(d);
    const v = new V3((Math.random() - 0.5) * 16, 4 + Math.random() * 10, (Math.random() - 0.5) * 16);
    fxParticles.push({
      m: d,
      t: 0,
      life: 1.1,
      update(f, dt) {
        v.y -= G * dt;
        d.position.addScaledVector(v, dt);
        d.rotation.x += dt * 9;
        d.rotation.z += dt * 7;
        d.scale.setScalar(1 - f * 0.7);
      },
    });
  }
  flashLight(p.clone().add(new V3(0, 0.8, 0)), bc[1], 90, R * 5, 0.35);
  const me = localPlayer();
  if (me) game.shake = Math.max(game.shake, clamp(1.2 - me.pos[PELV].distanceTo(p) / 18, 0, 1));
  noise(1.1, 0.6 * volAt(p), 700);
  sfx(70, 0.6, 'sine', 0.35 * volAt(p));
}

export function spark(p) {
  glow(p, 0.55, 0xfff3a0, 0.14, 1.4);
  for (let i = 0; i < 5; i++) {
    const m = sprite(0xffd27a, 1, true);
    m.position.copy(p);
    m.scale.setScalar(0.12);
    const v = new V3((Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7);
    fxParticles.push({
      m,
      t: 0,
      life: 0.25,
      update(f, dt) {
        m.position.addScaledVector(v, dt);
        m.material.opacity = 1 - f;
      },
    });
  }
}

export function muzzleFlash(p, k) {
  const col = THEME && THEME.tracer && THEME.tracer[k] !== undefined ? 0xfff0b0 : 0xffe08a;
  glow(p, k === 'shotgun' ? 0.9 : 0.6, col, 0.07, 0.5);
  flashLight(p, 0xffcf80, 12, 6, 0.07);
}

const tracerGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5, 1, true);
tracerGeo.translate(0, 0.5, 0);

/** Beam colors for weapons that maps don't theme (a map's own tracer colors win). */
const TRACER_COLORS = { grapple: 0x5a3e22, freeze: 0x7fe6ff, shrink: 0xff6ef0, minigun: 0xfff2a8 };
/** How long a beam stays on screen (seconds); bullets are a flicker, the rope and rays linger. */
const TRACER_LIFE = { grapple: 0.35, freeze: 0.3, shrink: 0.3 };

export function tracer(a, b, k) {
  const tc =
    THEME && THEME.tracer && THEME.tracer[k] !== undefined ? THEME.tracer[k] : (TRACER_COLORS[k] ?? 0xfff2a8);
  const dark = new THREE.Color(tc).getHSL({}).l < 0.3;
  const m = new THREE.Mesh(
    tracerGeo,
    new THREE.MeshBasicMaterial({
      color: dark ? tc : new THREE.Color(tc).multiplyScalar(2.2),
      transparent: true,
      opacity: 0.95,
      blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const d = new V3().subVectors(b, a),
    L = d.length();
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(YAX, d.normalize());
  const thick = k === 'freeze' || k === 'shrink' ? 3 : k === 'grapple' ? 1.6 : 1;
  m.scale.set(thick, L, thick);
  scene.add(m);
  fxParticles.push({
    m,
    t: 0,
    life: TRACER_LIFE[k] || 0.1,
    update(f) {
      m.material.opacity = 0.95 * (1 - f);
      m.scale.x = m.scale.z = thick * (1 - f * 0.5);
    },
  });
}

export function updateFx(dt) {
  for (let i = fxParticles.length - 1; i >= 0; i--) {
    const e = fxParticles[i];
    e.t += dt;
    const f = Math.min(1, e.t / e.life);
    e.update(f, dt);
    if (f >= 1) {
      scene.remove(e.m);
      if (e.m.material) e.m.material.dispose();
      fxParticles.splice(i, 1);
    }
  }
  updateFlashLights(dt);
}

game.shake = 0;
game.hurtFlash = 0;
