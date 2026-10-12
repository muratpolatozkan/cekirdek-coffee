// Malzemeler, geometri önbelleği, kanvasla üretilen dokular
import * as THREE from 'three';
import { UW, UD } from '../config.js';
import { pick } from '../utils.js';

export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.75, metalness: o.m ?? 0, ...(o.extra || {}) });
const matCache = new Map();
export function Mc(color) { let m = matCache.get(color); if (!m) { m = M(color); matCache.set(color, m); } return m; }
const geoCache = new Map();
export function G(key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }
export function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
export const box = (w, h, d, mat, x, y, z) => mesh(G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat, x, y, z);
export const cyl = (rt, rb, h, mat, x, y, z, s = 16) => mesh(G(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), mat, x, y, z);
export const sph = (r, mat, x, y, z) => mesh(G(`s${r}`, () => new THREE.SphereGeometry(r, 14, 10)), mat, x, y, z);
export const cone = (r, h, mat, x, y, z, s = 16) => mesh(G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)), mat, x, y, z);

export const MAT = {
  dark: M(0x2b2b2e, { r: .6 }), wood: M(0xb98a5a), woodL: M(0xd8b48a), woodD: M(0x6b4a33),
  steel: M(0xc9cdd2, { m: .8, r: .3 }), black: M(0x1c1c1c, { r: .5 }), white: M(0xf7f5f0),
  fabric: M(0x3f5e4f, { r: .95 }), fabricL: M(0x557a6a, { r: .95 }), pot: M(0xe8e2d8), soil: M(0x4a3526),
  leaf1: M(0x2f7a4a, { r: .8 }), leaf2: M(0x3d9460, { r: .8 }), olive: M(0x7d9a5c, { r: .9 }), kraft: M(0xc9a46b),
  trim: M(0x2f2a26), terracotta: M(0xb5603a), copper: M(0xb87333, { m: .7, r: .35 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfe6ee, roughness: .1, metalness: .1, transparent: true, opacity: .28, depthWrite: false }),
  shade: M(0xf3e7cf, { extra: { emissive: 0xffd9a0, emissiveIntensity: .6 } }),
  lampHead: M(0xfff1d0, { extra: { emissive: 0xffd28a, emissiveIntensity: .2 } }),
  headlight: M(0xfffbe8, { extra: { emissive: 0xfff3c0, emissiveIntensity: .1 } }),
  apron: M(0x1f4f3e), apronOwner: M(0x5a3d2b), komi: M(0x34495e), croissant: M(0xd9a24a, { r: .6 }),
  canopy: M(0xe8dcc6, { r: .9 }), canopy2: M(0xb5603a, { r: .9 }), pine: M(0x2e6b3f, { r: .85 }),
  water: new THREE.MeshStandardMaterial({ color: 0x3f8fb0, roughness: .25, metalness: .2 }),
  towerGlass: M(0x8fb3c9, { r: .15, m: .5 }), brick: M(0xa5543d, { r: .95 }),
};

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export function noise(g, w, h, base, spread, n = 4000) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) { const v = Math.random() * spread - spread / 2; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}
function planks(tones) {
  return (g) => {
    const rows = 8, h = 64;
    for (let r = 0; r < rows; r++) {
      let x = -(r % 2) * 128;
      while (x < 512) { const w = 160 + Math.random() * 120; g.fillStyle = pick(tones); g.fillRect(x, r * h, w, h); g.fillStyle = 'rgba(40,25,10,.25)'; g.fillRect(x, r * h, 2, h); x += w; }
      g.fillStyle = 'rgba(40,25,10,.3)'; g.fillRect(0, r * h, 512, 2);
    }
  };
}
const FLOOR_DRAW = {
  mese: [512, planks(['#d9b88f', '#d3b085', '#ddbf98', '#cfa97c', '#d6b48a']), 3],
  ceviz: [512, planks(['#7a5236', '#6e4a30', '#83593b', '#6a452c', '#76503a']), 3],
  balik: [512, (g) => {
    g.fillStyle = '#c9a074'; g.fillRect(0, 0, 512, 512);
    const tones = ['#d6ad80', '#c79a6c', '#dcb58a', '#c29266'];
    for (let y = -128; y < 640; y += 32) for (let x = -64; x < 576; x += 64) {
      for (const dir of [1, -1]) {
        g.save(); g.translate(x + (dir < 0 ? 32 : 0), y); g.rotate(dir * Math.PI / 4);
        g.fillStyle = pick(tones); g.fillRect(0, 0, 90, 22); g.strokeStyle = 'rgba(60,35,15,.3)'; g.strokeRect(0, 0, 90, 22); g.restore();
      }
    }
  }, 2.5],
  terrazzo: [256, (g, w, h) => {
    g.fillStyle = '#ebe6de'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) { g.fillStyle = pick(['#b7a99a', '#8c8c8c', '#d9a77a', '#6f7d73', '#ffffff', '#c97c5d']); const s = 2 + Math.random() * 6; g.fillRect(Math.random() * w, Math.random() * h, s, s * (.5 + Math.random())); }
  }, 2],
  karo: [256, (g) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f1f0e8' : '#2f6b55'; g.fillRect(i * 64, j * 64, 64, 64); }
  }, 2],
  beton: [256, (g, w, h) => noise(g, w, h, '#bdb7ad', .12), 3],
  tile: [256, (g) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#efe4cf' : '#e6d8bd'; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 2;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 256); g.moveTo(0, k * 64); g.lineTo(256, k * 64); g.stroke(); }
  }, 2],
  checker: [256, (g) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f4f4f4' : '#2a2a2a'; g.fillRect(i * 64, j * 64, 64, 64); }
  }, 2],
  deck: [256, planks(['#a77b52', '#9c7049', '#b0845a']), 1.5],
};
const floorCache = {};
export function floorTex(key) {
  if (!floorCache[key]) { const [s, draw, div] = FLOOR_DRAW[key] || FLOOR_DRAW.mese; floorCache[key] = canvasTex(s, s, draw, [UW / div, UD / div]); }
  return floorCache[key];
}

export function signTexture(text, sub, bg, fg) {
  return canvasTex(512, 160, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 160);
    g.shadowColor = fg; g.shadowBlur = 16; g.fillStyle = fg; g.textAlign = 'center';
    g.font = `800 ${text.length > 10 ? 50 : 62}px system-ui, sans-serif`; g.fillText(text, 256, 82);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '500 25px system-ui, sans-serif'; g.fillText(sub, 256, 126);
  });
}
export function bannerTex(text, bg, fg, w = 512, h = 52) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg;
    g.font = `800 ${text.length > 16 ? Math.round(h * .48) : Math.round(h * .58)}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h * .54);
  });
}
