/**
 * three.js setup: renderer, scene, camera, lights, explosion flash lights, post-processing (bloom, color
 * grade, vignette, hurt flash) and the sky dome.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { game } from '../core/state.js';
import { V3 } from '../core/util.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

renderer.setSize(innerWidth, innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();

scene.fog = new THREE.Fog(0x9fd6ff, 40, 140);

export const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 700);

camera.position.set(0, 12, 12);

// soft image-based lighting so materials pick up gentle reflections
const pmrem = new THREE.PMREMGenerator(renderer);

scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

export const hemi = new THREE.HemisphereLight(0xe4f3ff, 0x55606f, 0.7);
scene.add(hemi);

export const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);

sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);

Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });

sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;

scene.add(sun);
scene.add(sun.target);

// pooled flash lights (fixed count so shaders never recompile mid-fight)
const flashLights = [];

for (let i = 0; i < 4; i++) {
  const l = new THREE.PointLight(0xffaa55, 0, 10, 2);
  l.userData = { t: 0, life: 1, peak: 0 };
  scene.add(l);
  flashLights.push(l);
}

export function flashLight(p, color, peak, dist, life) {
  let l = flashLights[0];
  for (const q of flashLights) if (q.intensity < l.intensity) l = q;
  l.position.copy(p);
  l.color.setHex(color);
  l.distance = dist;
  l.userData = { t: 0, life, peak };
  l.intensity = peak;
}

export function updateFlashLights(dt) {
  for (const l of flashLights) {
    const u = l.userData;
    if (l.intensity <= 0) continue;
    u.t += dt;
    l.intensity = Math.max(0, u.peak * (1 - u.t / u.life));
  }
}

/* ---------- post-processing (bloom + grade + vignette) ---------- */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.32 }, sat: { value: 1.1 }, hurt: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig,sat,hurt; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(l),c.rgb,sat);
      vec2 d=vUv-.5; float v=smoothstep(.85,.25,length(d*vec2(1.15,1.))); c.rgb*=mix(1.-vig,1.,v);
      c.rgb=mix(c.rgb,vec3(.85,.08,.05),hurt*(1.-v)*.65); gl_FragColor=c; }`,
};

export let composer = null,
  bloomPass = null,
  gradePass = null,
  quality = 'high';

function setupPost() {
  if (composer) return;
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.45, 1.25);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  gradePass = new ShaderPass(GradeShader);
  composer.addPass(gradePass);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
}

export function applyQuality(q) {
  quality = q;
  renderer.setPixelRatio(q === 'high' ? Math.min(devicePixelRatio, 2) : 1);
  const sz = q === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== sz) {
    sun.shadow.mapSize.set(sz, sz);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  }
  if (q === 'high') {
    setupPost();
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
  }
  if (game.grassMesh) game.grassMesh.visible = q === 'high';
}

export function renderFrame() {
  if (quality === 'high' && composer) {
    gradePass.uniforms.hurt.value = game.hurtFlash;
    composer.render();
  } else renderer.render(scene, camera);
}

/* ---------- sky dome ---------- */
export const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    top: { value: new THREE.Color() },
    hor: { value: new THREE.Color() },
    bot: { value: new THREE.Color() },
    sunDir: { value: new V3(0.2, 0.25, -1).normalize() },
    sunCol: { value: new THREE.Color() },
  },
  vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top,hor,bot,sunCol,sunDir; varying vec3 vP;
    void main(){ vec3 d=normalize(vP); float y=d.y;
      vec3 c= y>0. ? mix(hor,top,pow(clamp(y,0.,1.),.55)) : mix(hor,bot,pow(clamp(-y,0.,1.),.45));
      float s=max(dot(d,normalize(sunDir)),0.); c+=sunCol*(pow(s,90.)*1.6+pow(s,8.)*.22);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});

export const skyDome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
skyDome.renderOrder = -10;
skyDome.frustumCulled = false;
scene.add(skyDome);
