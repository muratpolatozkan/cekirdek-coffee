// Buhar / duman parçacıkları (sabit havuz)
import * as THREE from 'three';
import { scene } from './scene.js';
import { G } from './assets.js';
import { V, rand } from '../utils.js';

const puffs = [];
for (let k = 0; k < 60; k++) {
  const m = new THREE.Mesh(G('puff', () => new THREE.SphereGeometry(0.035, 8, 6)), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m); puffs.push({ m, life: 0, size: 1 });
}
export function puff(pos, color = 0xffffff, size = 1) {
  const p = puffs.find(p => p.life <= 0); if (!p) return;
  p.life = 1.2; p.size = size; p.m.material.color.setHex(color);
  p.m.position.copy(pos).add(V(rand(-.03, .03), rand(-.03, .03))); p.m.visible = true;
}
export function updatePuffs(dt) {
  for (const p of puffs) if (p.life > 0) {
    p.life -= dt; p.m.position.y += dt * .35; p.m.position.x += dt * .05;
    p.m.scale.setScalar(p.size * (1 + (1.2 - p.life) * 2));
    p.m.material.opacity = Math.max(0, p.life / 1.2) * .5;
    if (p.life <= 0) p.m.visible = false;
  }
}
