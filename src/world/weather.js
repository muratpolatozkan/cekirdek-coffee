// Gün ışığı (saate ve havaya göre), yağmur/kar parçacıkları
import * as THREE from 'three';
import { GW, UD, WEATHER } from '../config.js';
import { S, B } from '../state.js';
import { scene, hemi, sun, camTarget } from '../engine/scene.js';
import { MAT } from '../engine/assets.js';
import { clamp, lerp, rand } from '../utils.js';
import { streetLights, setSnow, setSeasonLook } from './street.js';
import { unitLights } from './units.js';
import { outageNow } from '../sim/economy.js';

const SKY = [
  [5, 0x2a2f45, .35, 0, 0xff9a5a], [7, 0xe9cdb0, .95, .9, 0xffb27a], [9, 0xefe7dc, 1.5, 2.0, 0xfff0dd],
  [13, 0xf1ebe2, 1.7, 2.5, 0xffffff], [17, 0xefe0cc, 1.4, 1.9, 0xffd8a8], [19, 0xe0b48e, .95, .9, 0xff9a5a],
  [20.5, 0x4a4a68, .5, .15, 0xff8050], [22, 0x262b42, .38, 0, 0xff8050], [26, 0x262b42, .38, 0, 0xff8050],
];
const GRAY = new THREE.Color(0x9aa0a8), _c1 = new THREE.Color(), _c2 = new THREE.Color();
export function setDayLight(h) {
  const W = WEATHER[S.weather.today];
  let k = 0; while (k < SKY.length - 2 && h > SKY[k + 1][0]) k++;
  const a = SKY[k], b = SKY[k + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  scene.background.lerpColors(_c1.set(a[1]), _c2.set(b[1]), t);
  if (W.sun < .9) scene.background.lerp(GRAY, (1 - W.sun) * .45);
  hemi.intensity = lerp(a[2], b[2], t) * (W.sun < 1 ? .85 + W.sun * .15 : 1);
  sun.intensity = lerp(a[3], b[3], t) * W.sun;
  sun.color.lerpColors(_c1.set(a[4]), _c2.set(b[4]), t);
  const az = clamp((h - 6) / 14, 0, 1) * Math.PI;
  sun.position.set(GW / 2 - Math.cos(az) * 16, 5 + Math.sin(az) * 12, UD / 2 + 12);
  const night = clamp((h - 18) / 2 + (W.precip ? .25 : 0), 0, 1);
  streetLights.forEach(l => l.intensity = night * 3);
  MAT.lampHead.emissiveIntensity = .2 + night * 2;
  MAT.headlight.emissiveIntensity = .1 + night * 2;
  const out = outageNow(h);
  B().units.forEach((st, u) => unitLights[u].intensity = out && st === 'own' ? 0 : st === 'own' ? night * 3.2 : st === 'occupied' && h < 21 ? night * 2.2 : 0);
}

// ---- yağış ----
const RAIN_N = 700, SNOW_N = 800, BOX = { x: 18, z: 14, y: 7 };
const rainPos = new Float32Array(RAIN_N * 6);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8fa9bf, transparent: true, opacity: .75 }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const snowPos = new Float32Array(SNOW_N * 3), snowPh = new Float32Array(SNOW_N);
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: .9 }));
snow.frustumCulled = false; snow.visible = false; scene.add(snow);
function seedDrop(arr, i, stride, randomY) {
  arr[i * stride] = camTarget.x + rand(-BOX.x, BOX.x);
  arr[i * stride + 1] = randomY ? rand(0, BOX.y) : BOX.y;
  arr[i * stride + 2] = camTarget.z + rand(-BOX.z, BOX.z);
}
for (let i = 0; i < RAIN_N; i++) seedDrop(rainPos, i, 6, true);
for (let i = 0; i < SNOW_N; i++) { seedDrop(snowPos, i, 3, true); snowPh[i] = rand(0, 6); }

export function applyWeather() {
  const W = WEATHER[S.weather.today];
  rain.visible = W.precip === 'rain';
  snow.visible = W.precip === 'snow';
  setSnow(W.precip === 'snow');
  setSeasonLook();
}
export function updateWeather(dt) {
  if (rain.visible) {
    for (let i = 0; i < RAIN_N; i++) {
      const o = i * 6;
      rainPos[o + 1] -= dt * 9;
      if (rainPos[o + 1] < 0) seedDrop(rainPos, i, 6, false);
      rainPos[o + 3] = rainPos[o] + .03; rainPos[o + 4] = rainPos[o + 1] + .28; rainPos[o + 5] = rainPos[o + 2] + .03;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  if (snow.visible) {
    const t = performance.now() / 1000;
    for (let i = 0; i < SNOW_N; i++) {
      const o = i * 3;
      snowPos[o + 1] -= dt * .8;
      snowPos[o] += Math.sin(t + snowPh[i]) * dt * .2;
      if (snowPos[o + 1] < 0) seedDrop(snowPos, i, 3, false);
    }
    snowGeo.attributes.position.needsUpdate = true;
  }
}
