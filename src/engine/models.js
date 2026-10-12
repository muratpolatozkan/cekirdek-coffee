// Basit şekillerden kurulan 3D modeller
import * as THREE from 'three';
import { M, Mc, G, mesh, box, cyl, sph, cone, MAT, canvasTex } from './assets.js';
import { pick, rand } from '../utils.js';
import { bake, Q } from './perf.js';

export const SHIRTS = [0xd96c4f, 0x4f7cd9, 0xe3b23c, 0x8f5fc2, 0x3aa17e, 0xe07aa1, 0x5c6670, 0xf0efe9, 0x2d4059, 0x7a9e7e, 0xb5651d];
export const SKINS = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0xffdbb5];
export const HAIRS = [0x2b1d14, 0x5a3a22, 0xa8783a, 0x111111, 0xd9c08a, 0x8a3b1e];
export const PRODUCT_COLORS = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0xe67e22, 0x9b59b6, 0xecf0f1, 0x1abc9c];

// ---- insan ----
export function randomLook(base = {}) {
  return { shirt: pick(SHIRTS), skin: pick(SKINS), hair: pick(HAIRS), pants: pick([0x2b2b2e, 0x34495e, 0x5d4e3c, 0x1f2a44]), ...base };
}
export function makePerson(look = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  // bacaklar ayrı döner (yürüme, oturma) → birleştirmeye girmez
  const legs = new THREE.Group(); legs.position.y = 0.18; legs.userData.dynamic = true; body.add(legs);
  const pm = Mc(look.pants ?? pick([0x2b2b2e, 0x34495e, 0x5d4e3c, 0x1f2a44]));
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.x = -0.045; legR.position.x = 0.045;
  legL.add(cyl(0.042, 0.048, 0.18, pm, 0, -0.09, 0, 8)); legR.add(cyl(0.042, 0.048, 0.18, pm, 0, -0.09, 0, 8));
  legs.add(legL, legR);
  const shirt = look.shirt instanceof THREE.Material ? look.shirt : Mc(look.shirt ?? pick(SHIRTS));
  body.add(cyl(0.11, 0.14, 0.32, shirt, 0, 0.34, 0, 14));
  body.add(sph(0.1, Mc(look.skin ?? pick(SKINS)), 0, 0.6, 0));
  const hair = sph(0.104, Mc(look.hair ?? pick(HAIRS)), 0, 0.63, -0.015); hair.scale.set(1, .75, 1); body.add(hair);
  const acc = look.acc;
  if (acc === 'backpack') body.add(box(0.17, 0.2, 0.08, Mc(pick([0x34495e, 0xc0392b, 0x16a085, 0xf39c12])), 0, 0.37, -0.15));
  else if (acc === 'glasses') body.add(box(0.17, 0.025, 0.02, MAT.black, 0, 0.61, 0.095));
  else if (acc === 'cap') { const m = Mc(look.capColor ?? pick([0x7f8c8d, 0x2c3e50, 0x8e6e53])); body.add(cyl(0.106, 0.106, 0.05, m, 0, 0.69, 0, 14), box(0.13, 0.012, 0.09, m, 0, 0.675, 0.1)); }
  else if (acc === 'camera') body.add(box(0.09, 0.06, 0.05, MAT.black, 0, 0.42, 0.14));
  else if (acc === 'tie') body.add(box(0.03, 0.15, 0.012, Mc(0x8e2b2b), 0, 0.39, 0.128));
  else if (acc === 'apron') body.add(box(0.2, 0.26, 0.012, look.apron || MAT.apron, 0, 0.33, 0.135));
  else if (acc === 'clipboard') { body.add(box(0.12, 0.16, 0.015, Mc(0x8a6a4f), 0.08, 0.4, 0.14)); body.add(box(0.1, 0.12, 0.016, MAT.white, 0.08, 0.4, 0.142)); }
  else if (acc === 'guitar') {
    const gt = new THREE.Group(); gt.position.set(0.02, 0.36, 0.15); gt.rotation.z = -0.9;
    gt.add(box(0.16, 0.2, 0.05, Mc(0xb5651d), 0, -0.04, 0), box(0.03, 0.22, 0.02, MAT.woodD, 0, 0.16, 0));
    body.add(gt);
  }
  if (look.sunglasses) body.add(box(0.17, 0.03, 0.02, MAT.black, 0, 0.615, 0.095));
  bake(body, { unify: true });
  g.traverse(o => { if (o.isMesh) { o.castShadow = Q.peopleShadows; o.receiveShadow = false; } });
  g.userData = { body, legs, legL, legR };
  return g;
}
export function sitPose(p, seatH) { p.userData.body.position.y = seatH - 0.16; p.userData.legs.rotation.x = -Math.PI / 2; }
export function standPose(p) { p.userData.body.position.y = 0; p.userData.legs.rotation.x = 0; }

// ---- eşyalar ----
function tableParts(g) {
  g.add(cyl(0.26, 0.26, 0.03, MAT.woodL, 0, 0.36, 0, 28));
  g.add(cyl(0.025, 0.025, 0.34, MAT.black, 0, 0.18, 0, 8));
  g.add(cyl(0.12, 0.12, 0.02, MAT.black, 0, 0.01, 0, 20));
  for (const s of [-1, 1]) {
    const x = s * 0.38;
    g.add(box(0.2, 0.03, 0.2, MAT.wood, x, 0.22, 0));
    for (const [lx, lz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(box(0.02, 0.21, 0.02, MAT.black, x + lx * 0.08, 0.105, lz * 0.08));
    g.add(box(0.025, 0.2, 0.2, MAT.wood, x + s * 0.1, 0.34, 0));
  }
}
export function makeModel(type) {
  const g = new THREE.Group(), ud = g.userData;
  if (type === 'bar') {
    g.add(box(0.92, 0.46, 0.42, MAT.dark, 0, 0.23, 0.08));
    g.add(box(0.96, 0.04, 0.46, MAT.woodL, 0, 0.48, 0.08));
    g.add(box(0.34, 0.22, 0.24, MAT.steel, -0.18, 0.61, 0.02));
    g.add(box(0.3, 0.03, 0.02, MAT.black, -0.18, 0.67, 0.145));
    g.add(cyl(0.02, 0.02, 0.05, MAT.black, -0.24, 0.58, 0.16, 8), cyl(0.02, 0.02, 0.05, MAT.black, -0.12, 0.58, 0.16, 8));
    g.add(cyl(0.05, 0.05, 0.16, MAT.black, 0.2, 0.58, 0.02));
    g.add(cyl(0.075, 0.045, 0.1, M(0x5a3d2b, { r: .3 }), 0.2, 0.71, 0.02));
    g.add(cyl(0.03, 0.025, 0.06, MAT.white, 0.38, 0.53, 0.2, 10), cyl(0.03, 0.025, 0.06, MAT.white, 0.31, 0.53, 0.23, 10));
  } else if (type === 'table') tableParts(g);
  else if (type === 'umbrella') {
    tableParts(g);
    g.add(cyl(0.015, 0.015, 0.9, MAT.woodD, 0, 0.8, 0, 8));
    const c1 = cone(0.58, 0.22, MAT.canopy, 0, 1.3, 0, 8); c1.castShadow = true; g.add(c1);
    g.add(cone(0.6, 0.02, MAT.canopy2, 0, 1.19, 0, 8));
  } else if (type === 'stool') {
    g.add(cyl(0.16, 0.16, 0.025, MAT.woodL, -0.12, 0.44, -0.06, 20));
    g.add(cyl(0.02, 0.02, 0.43, MAT.black, -0.12, 0.215, -0.06, 8), cyl(0.09, 0.09, 0.015, MAT.black, -0.12, 0.008, -0.06, 16));
    g.add(cyl(0.09, 0.09, 0.03, MAT.wood, 0.2, 0.33, 0.14, 16));
    g.add(cyl(0.015, 0.015, 0.32, MAT.black, 0.2, 0.16, 0.14, 6), cyl(0.07, 0.07, 0.01, MAT.black, 0.2, 0.005, 0.14, 12));
  } else if (type === 'sofa') {
    g.add(box(0.9, 0.18, 0.42, MAT.fabric, 0, 0.11, 0));
    g.add(box(0.8, 0.06, 0.34, MAT.fabricL, 0, 0.23, 0.03));
    g.add(box(0.9, 0.3, 0.1, MAT.fabric, 0, 0.3, -0.16));
    g.add(box(0.07, 0.26, 0.42, MAT.fabric, -0.43, 0.2, 0), box(0.07, 0.26, 0.42, MAT.fabric, 0.43, 0.2, 0));
  } else if (type === 'plant') {
    g.add(cyl(0.14, 0.11, 0.26, MAT.pot, 0, 0.13, 0));
    g.add(cyl(0.13, 0.13, 0.01, MAT.soil, 0, 0.255, 0));
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2, rr = k === 0 ? 0 : 0.11, r = pick([0.09, 0.11, 0.13]);
      const leaf = mesh(G(`ico${r}`, () => new THREE.IcosahedronGeometry(r, 0)), k % 2 ? MAT.leaf1 : MAT.leaf2, Math.cos(a) * rr, rand(0.38, 0.6), Math.sin(a) * rr);
      leaf.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(leaf);
    }
  } else if (type === 'tree') {
    g.add(cyl(0.17, 0.13, 0.28, MAT.terracotta, 0, 0.14, 0));
    g.add(cyl(0.03, 0.045, 0.55, MAT.woodD, 0, 0.55, 0, 8));
    for (const [x, y, z, r] of [[0, .95, 0, .2], [.13, .85, .08, .15], [-.12, .88, -.06, .16], [.04, 1.1, -.04, .14]]) g.add(sph(r, MAT.olive, x, y, z));
  } else if (type === 'shelf') {
    g.add(box(0.82, 1.0, 0.03, MAT.woodD, 0, 0.5, -0.4));
    g.add(box(0.03, 1.0, 0.26, MAT.woodD, -0.41, 0.5, -0.28), box(0.03, 1.0, 0.26, MAT.woodD, 0.41, 0.5, -0.28));
    for (const y of [0.04, 0.36, 0.68, 0.99]) g.add(box(0.82, 0.025, 0.26, MAT.woodD, 0, y, -0.28));
    for (const y of [0.04, 0.36, 0.68]) for (let k = 0; k < 4; k++) {
      const h = pick([0.16, 0.19, 0.21]);
      g.add(box(0.12, h, 0.08, k % 3 === 2 ? MAT.black : MAT.kraft, -0.27 + k * 0.18, y + 0.0125 + h / 2, -0.28));
    }
  } else if (type === 'lamp') {
    g.add(cyl(0.1, 0.12, 0.03, MAT.black, 0, 0.015, 0));
    g.add(cyl(0.012, 0.012, 0.9, MAT.black, 0, 0.46, 0, 8));
    g.add(cyl(0.06, 0.16, 0.15, MAT.shade, 0, 0.93, 0));
    const light = new THREE.PointLight(0xffcf8a, 1.2, 3.2, 1.2); light.position.set(0, 0.82, 0); g.add(light);
  } else if (type === 'pikap') {
    g.add(box(0.72, 0.42, 0.36, MAT.woodD, 0, 0.21, -0.12));
    for (let k = 0; k < 6; k++) g.add(box(0.03, 0.26, 0.24, Mc(pick(PRODUCT_COLORS)), -0.28 + k * 0.05, 0.16, -0.08));
    g.add(box(0.34, 0.04, 0.28, MAT.woodL, 0, 0.44, -0.12));
    const disc = cyl(0.11, 0.11, 0.012, MAT.black, -0.03, 0.465, -0.12, 24); disc.userData.dynamic = true; g.add(disc); ud.spin = disc;
    g.add(box(0.14, 0.24, 0.14, MAT.black, -0.27, 0.54, -0.12), box(0.14, 0.24, 0.14, MAT.black, 0.27, 0.54, -0.12));
  } else if (type === 'vitrin') {
    g.add(box(0.9, 0.4, 0.45, MAT.woodL, 0, 0.2, 0));
    g.add(box(0.84, 0.02, 0.4, MAT.white, 0, 0.41, 0));
    const gl = box(0.88, 0.28, 0.43, MAT.glass, 0, 0.55, 0); gl.castShadow = false; g.add(gl);
    g.add(box(0.9, 0.02, 0.45, MAT.trim, 0, 0.7, 0));
    ud.croissants = [];
    for (let k = 0; k < 8; k++) {
      const c = sph(0.05, MAT.croissant, -0.3 + (k % 4) * 0.2, 0.45, -0.08 + Math.floor(k / 4) * 0.16);
      c.scale.set(1.4, 0.7, 0.9); c.userData.dynamic = true; g.add(c); ud.croissants.push(c);
    }
  } else if (type === 'roaster') {
    g.add(box(0.5, 0.36, 0.5, MAT.dark, 0, 0.18, -0.08));
    const drum = new THREE.Group(); drum.position.set(0, 0.55, -0.08);
    const d = cyl(0.17, 0.17, 0.36, MAT.copper, 0, 0, 0, 20); d.rotation.x = Math.PI / 2; drum.add(d);
    drum.add(box(0.05, 0.36, 0.05, MAT.black, 0, 0.17, 0));
    drum.userData.dynamic = true; g.add(drum); ud.drum = drum;
    g.add(cyl(0.12, 0.03, 0.18, MAT.steel, 0, 0.82, -0.16));
    g.add(cyl(0.04, 0.04, 0.75, MAT.black, -0.19, 0.75, -0.28, 10));
    g.add(cyl(0.2, 0.2, 0.06, MAT.steel, 0, 0.34, 0.26, 20));
    const paddle = box(0.34, 0.03, 0.03, MAT.black, 0, 0.385, 0.26); paddle.userData.dynamic = true; g.add(paddle); ud.paddle = paddle;
  } else if (type === 'xmas') {
    g.add(cyl(0.12, 0.1, 0.16, MAT.terracotta, 0, 0.08, 0));
    for (const [y, r] of [[0.35, 0.3], [0.6, 0.23], [0.82, 0.16]]) g.add(cone(r, 0.3, MAT.pine, 0, y, 0, 10));
    g.add(sph(0.045, M(0xffd84d, { extra: { emissive: 0xffc400, emissiveIntensity: 1 } }), 0, 1.0, 0));
    for (let k = 0; k < 9; k++) {
      const a = k * 2.2, y = 0.3 + (k % 3) * 0.22, r = 0.26 - (k % 3) * 0.07;
      g.add(sph(0.025, M(pick([0xe74c3c, 0xf1c40f, 0x3498db, 0xffffff]), { extra: { emissive: 0xffffff, emissiveIntensity: .3 } }), Math.cos(a) * r, y, Math.sin(a) * r));
    }
  }
  return g;
}

// ---- duvar dekorları (arka duvara, +z yönüne bakar) ----
export function makeWallDecor(kind) {
  const g = new THREE.Group();
  if (kind === 'tablo') {
    g.add(box(0.62, 0.48, 0.03, MAT.trim, 0, 0, 0));
    const tex = canvasTex(128, 96, (c) => {
      c.fillStyle = '#f3ead8'; c.fillRect(0, 0, 128, 96);
      for (let k = 0; k < 5; k++) { c.fillStyle = pick(['#c0573a', '#1f4f3e', '#e0a100', '#24365e', '#d98c6b']); c.beginPath(); c.arc(rand(10, 118), rand(10, 86), rand(10, 30), 0, Math.PI * 2); c.fill(); }
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), new THREE.MeshStandardMaterial({ map: tex })); p.position.z = 0.017; g.add(p);
  } else if (kind === 'neon') {
    const tex = canvasTex(256, 96, (c) => {
      c.clearRect(0, 0, 256, 96); c.shadowColor = '#ff6fb5'; c.shadowBlur = 14; c.fillStyle = '#ffd1ea';
      c.font = 'italic 700 30px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('but first,', 128, 40); c.fillText('coffee ☕', 128, 78);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); p.position.z = 0.01; g.add(p);
  } else if (kind === 'ayna') {
    const r = cyl(0.27, 0.27, 0.03, Mc(0xb08d57), 0, 0, 0, 28); r.rotation.x = Math.PI / 2; g.add(r);
    const m = cyl(0.24, 0.24, 0.035, M(0xdfeef3, { r: .05, m: .7 }), 0, 0, 0.005, 28); m.rotation.x = Math.PI / 2; g.add(m);
  } else if (kind === 'raf') {
    g.add(box(0.7, 0.03, 0.16, MAT.woodL, 0, -0.05, 0.07));
    g.add(cyl(0.05, 0.04, 0.08, MAT.pot, -0.22, 0.0, 0.07, 10), cyl(0.05, 0.04, 0.08, MAT.pot, 0.2, 0.0, 0.07, 10));
    for (let k = 0; k < 6; k++) g.add(sph(0.045, k % 2 ? MAT.leaf1 : MAT.leaf2, -0.25 + k * 0.1, -0.1 - (k % 3) * 0.06, 0.1));
    g.add(box(0.08, 0.14, 0.08, MAT.kraft, 0, 0.04, 0.07));
  } else if (kind === 'saat') {
    const c = cyl(0.2, 0.2, 0.04, MAT.white, 0, 0, 0, 24); c.rotation.x = Math.PI / 2; g.add(c);
    const rim = cyl(0.215, 0.215, 0.03, MAT.black, 0, 0, -0.005, 24); rim.rotation.x = Math.PI / 2; g.add(rim);
    const h1 = box(0.02, 0.11, 0.01, MAT.black, 0, 0.045, 0.025), h2 = box(0.015, 0.15, 0.01, MAT.black, 0.04, 0.02, 0.026);
    h2.rotation.z = -1.2; h1.userData.dynamic = h2.userData.dynamic = true; g.add(h1, h2); g.userData.hands = [h1, h2];
  } else if (kind === 'harita') {
    g.add(box(0.8, 0.5, 0.025, MAT.woodD, 0, 0, 0));
    const tex = canvasTex(160, 100, (c) => {
      c.fillStyle = '#efe3c8'; c.fillRect(0, 0, 160, 100);
      c.fillStyle = '#b9a47a'; for (const [x, y, w, h] of [[12, 20, 40, 30], [60, 15, 35, 50], [100, 30, 48, 36], [30, 60, 30, 28]]) { c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#6b1f2e'; for (const [x, y] of [[40, 38], [80, 45], [120, 50], [44, 74]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3a2a1a'; c.font = '700 11px system-ui'; c.fillText('COFFEE ORIGINS', 36, 94);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.44), new THREE.MeshStandardMaterial({ map: tex })); p.position.z = 0.014; g.add(p);
  }
  return g;
}

// ---- araç ve kedi ----
export function makeCar(color) {
  const g = new THREE.Group(), m = Mc(color);
  g.add(box(1.1, 0.26, 0.5, m, 0, 0.21, 0));
  g.add(box(0.6, 0.22, 0.44, Mc(0x37414a), -0.05, 0.45, 0));
  g.add(box(0.62, 0.03, 0.46, m, -0.05, 0.575, 0));
  for (const [x, z] of [[-.35, -.25], [.35, -.25], [-.35, .25], [.35, .25]]) { const w = cyl(0.1, 0.1, 0.07, MAT.black, x, 0.1, z, 12); w.rotation.x = Math.PI / 2; g.add(w); }
  g.add(box(0.02, 0.06, 0.1, MAT.headlight, 0.56, 0.24, -0.15), box(0.02, 0.06, 0.1, MAT.headlight, 0.56, 0.24, 0.15));
  return g;
}
export function makeCat() {
  const g = new THREE.Group(), o = Mc(0xe39a4a);
  g.add(box(0.22, 0.09, 0.09, o, 0, 0.1, 0));
  g.add(box(0.09, 0.08, 0.08, o, 0.14, 0.16, 0));
  g.add(box(0.02, 0.03, 0.02, o, 0.15, 0.215, -0.025), box(0.02, 0.03, 0.02, o, 0.15, 0.215, 0.025));
  const tail = box(0.14, 0.02, 0.02, o, -0.15, 0.17, 0); tail.rotation.z = 0.8; g.add(tail);
  for (const [x, z] of [[-.08, -.03], [-.08, .03], [.08, -.03], [.08, .03]]) g.add(box(0.025, 0.06, 0.025, o, x, 0.03, z));
  return g;
}
export function makeBoat(color) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.18, 0.38, Mc(color), 0, 0.09, 0));
  g.add(box(0.36, 0.2, 0.26, MAT.white, -0.1, 0.28, 0));
  g.add(cyl(0.015, 0.015, 0.6, MAT.woodD, 0.25, 0.45, 0, 6));
  return g;
}
