// Cadde: kaldırım, yol, karşı taraf (mahalleye göre park/sahil/plaza/kampüs), arka binalar, rakip binası, araçlar, kedi
import * as THREE from 'three';
import { UD, UW, NU, GW, STREET_X0, STREET_X1, WALL_H, HOODS } from '../config.js';
import { S, B, seasonOf } from '../state.js';
import { scene } from '../engine/scene.js';
import { M, Mc, box, cyl, sph, cone, MAT, canvasTex, noise, bannerTex } from '../engine/assets.js';
import { makeCar, makeCat, makeBoat } from '../engine/models.js';
import { rand, pick, V } from '../utils.js';
import { RIVAL_X0, RIVAL_W, rivalName } from '../sim/rival.js';

let group = null, rivalGroup = null, rivalSnow = null, boats = [];
export const streetLights = [];
for (let k = 0; k < 5; k++) { const l = new THREE.PointLight(0xffc77a, 0, 4.5, 1.4); scene.add(l); streetLights.push(l); }
const foliage = [M(0x4e8a4a, { r: .9 }), M(0x5b9a52, { r: .9 }), M(0x447d44, { r: .9 })];
const grassMat = M(0x9dbf7c, { r: 1 });
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf6f8fb, roughness: .9, transparent: true, opacity: .88 });
const snowCover = new THREE.Group(); snowCover.visible = false; scene.add(snowCover);
export function setSnow(v) { snowCover.visible = v; if (rivalSnow) rivalSnow.visible = v; }

const LEN = STREET_X1 - STREET_X0 + 20, CX = (STREET_X0 + STREET_X1) / 2;
const SEASON_COLORS = {
  ilkbahar: [[0xf2a7c3, 0x7cbf5a, 0xe98fb0], 0xa6c97f],
  yaz: [[0x4e8a4a, 0x5b9a52, 0x447d44], 0x8fb86a],
  sonbahar: [[0xd9822b, 0xc0392b, 0xe0a100], 0xb5a26a],
  kis: [[0x8a7f72, 0x9a8f80, 0x7d7368], 0xb8b6a6],
};
export function setSeasonLook() {
  const [cols, grass] = SEASON_COLORS[seasonOf(S.day).id];
  foliage.forEach((m, k) => m.color.setHex(cols[k]));
  grassMat.color.setHex(grass);
}

function tree(g, x, z, s = 1) {
  g.add(cyl(0.05 * s, 0.07 * s, 0.6 * s, MAT.woodD, x, 0.3 * s, z, 8));
  g.add(sph(0.38 * s, pick(foliage), x, 0.85 * s, z), sph(0.26 * s, pick(foliage), x + .2 * s, 1.1 * s, z - .1 * s));
}
function bench(g, x, z) {
  g.add(box(1.0, 0.05, 0.3, MAT.wood, x, 0.25, z), box(1.0, 0.25, 0.05, MAT.wood, x, 0.4, z + .16));
  g.add(box(0.05, 0.25, 0.3, MAT.black, x - .45, .12, z), box(0.05, 0.25, 0.3, MAT.black, x + .45, .12, z));
}
function busStop(g, bs) {
  g.add(box(1.8, 0.05, 0.8, MAT.trim, bs, 1.2, UD + 6.6));
  g.add(box(0.05, 1.2, 0.05, MAT.trim, bs - .85, .6, UD + 6.95), box(0.05, 1.2, 0.05, MAT.trim, bs + .85, .6, UD + 6.95));
  g.add(box(1.7, 1.0, 0.03, MAT.glass, bs, .65, UD + 6.97));
  g.add(box(1.2, 0.05, 0.25, MAT.wood, bs, 0.3, UD + 6.8));
  const sign = canvasTex(128, 128, (c) => { c.fillStyle = '#1d5fa8'; c.fillRect(0, 0, 128, 128); c.font = '800 64px system-ui'; c.textAlign = 'center'; c.fillText('🚌', 64, 84); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: sign }));
  p.position.set(bs - 1.1, 1.05, UD + 6.2); g.add(p, cyl(0.02, 0.02, 1.0, MAT.trim, bs - 1.1, .5, UD + 6.18, 6));
}
function snowPlane(w, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), snowMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; snowCover.add(m);
}

export function buildStreet() {
  if (group) scene.remove(group);
  group = new THREE.Group(); scene.add(group);
  boats = [];
  snowCover.clear();
  const g = group, theme = HOODS[B().hood].theme;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(theme === 'sea' ? 0xd9d2c4 : 0xd8cdbd, { r: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(CX, -0.14, UD); ground.receiveShadow = true; g.add(ground);
  // yakın kaldırım, bordür, yol
  const swTex = canvasTex(128, 128, (c) => { noise(c, 128, 128, '#d3cdc3', .08, 600); c.strokeStyle = 'rgba(90,80,70,.25)'; c.lineWidth = 2; c.strokeRect(0, 0, 128, 128); }, [LEN / 0.85, 2]);
  g.add(box(LEN, 0.1, 1.7, new THREE.MeshStandardMaterial({ map: swTex, roughness: .95 }), CX, -0.05, UD + 0.85));
  g.add(box(LEN, 0.13, 0.12, Mc(0xa9a196), CX, -0.05, UD + 1.72));
  const asph = canvasTex(256, 256, (c, w, h) => noise(c, w, h, '#4a4a4f', .1, 5000), [LEN / 4, 1]);
  g.add(box(LEN, 0.1, 3.7, new THREE.MeshStandardMaterial({ map: asph, roughness: .95 }), CX, -0.12, UD + 3.6));
  const white = Mc(0xf2f0e8);
  for (let x = STREET_X0 - 8; x < STREET_X1 + 8; x += 1.6) g.add(box(0.8, 0.01, 0.07, white, x, -0.065, UD + 3.6));
  for (let k = 0; k < 7; k++) g.add(box(1.1, 0.01, 0.26, white, 2.5, -0.064, UD + 2.0 + k * 0.5));
  g.add(box(LEN, 0.13, 0.12, Mc(0xa9a196), CX, -0.05, UD + 5.48));
  const sw2 = swTex.clone(); sw2.needsUpdate = true;
  g.add(box(LEN, 0.1, 1.8, new THREE.MeshStandardMaterial({ map: sw2, roughness: .95 }), CX, -0.05, UD + 6.35));
  snowPlane(LEN, 1.7, CX, 0.012, UD + 0.85); snowPlane(LEN, 1.8, CX, 0.012, UD + 6.35);

  // karşı taraf
  if (theme === 'park' || theme === 'campus') {
    g.add(box(LEN, 0.1, 3.2, grassMat, CX, -0.06, UD + 8.85));
    snowPlane(LEN, 3.2, CX, 0.0, UD + 8.85);
    if (theme === 'campus') {
      const brick = MAT.brick;
      g.add(box(9.5, 0.45, 0.2, brick, 4.25, 0.22, UD + 7.6), box(14, 0.45, 0.2, brick, 21, 0.22, UD + 7.6));
      g.add(box(0.4, 1.2, 0.4, brick, 9.4, 0.6, UD + 7.6), box(0.4, 1.2, 0.4, brick, 13.6, 0.6, UD + 7.6));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.4), new THREE.MeshBasicMaterial({ map: bannerTex('ÜNİVERSİTE', '#7a2e22', '#f3e9d6', 512, 56) }));
      s.position.set(11.5, 1.05, UD + 7.82); g.add(s, box(4.4, 0.08, 0.3, brick, 11.5, 1.24, UD + 7.6));
      for (let x = STREET_X0 + 1; x < STREET_X1; x += 3) tree(g, x + rand(-.4, .4), UD + 8.9 + rand(-.2, .4), rand(1, 1.3));
    } else {
      for (let x = STREET_X0 + 1; x < STREET_X1; x += 3.6) tree(g, x + rand(-.5, .5), UD + 8.3 + rand(-.3, .5));
      bench(g, 6, UD + 7.5); bench(g, 16, UD + 7.5);
    }
    busStop(g, theme === 'campus' ? 17.5 : 12.5);
  } else if (theme === 'sea') {
    g.add(box(LEN, 0.1, 1.2, Mc(0xe4dccd), CX, -0.05, UD + 7.85));
    snowPlane(LEN, 1.2, CX, 0.006, UD + 7.85);
    for (let x = STREET_X0 - 6; x < STREET_X1 + 6; x += 1.2) g.add(box(0.05, 0.4, 0.05, Mc(0xf2f2f2), x, 0.2, UD + 8.4));
    g.add(box(LEN, 0.04, 0.06, Mc(0xf2f2f2), CX, 0.4, UD + 8.4));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 40, 40), MAT.water);
    water.rotation.x = -Math.PI / 2; water.position.set(CX, -0.09, UD + 28.5); water.receiveShadow = true; g.add(water);
    for (const [x, z, c] of [[4, 11, 0xffffff], [13, 13, 0xc0392b], [22, 10.5, 0x2c5f8a]]) {
      const b = makeBoat(c); b.position.set(x, -0.06, UD + z); b.rotation.y = rand(-.4, .4); g.add(b); boats.push({ b, ph: rand(0, 6) });
    }
    for (let x = STREET_X0 + 2; x < STREET_X1; x += 5) {
      g.add(cyl(0.05, 0.07, 1.3, MAT.woodD, x, 0.65, UD + 7.75, 8));
      for (let k = 0; k < 5; k++) { const f = cone(0.08, 0.6, foliage[1], x + Math.cos(k * 1.26) * .25, 1.25, UD + 7.75 + Math.sin(k * 1.26) * .25, 6); f.rotation.set(Math.sin(k * 1.26) * 1.2, 0, -Math.cos(k * 1.26) * 1.2); g.add(f); }
    }
    bench(g, 8, UD + 7.7); bench(g, 17, UD + 7.7);
    busStop(g, 12.5);
  } else if (theme === 'plaza') {
    g.add(box(LEN, 0.1, 3.2, Mc(0xd9d6d0), CX, -0.06, UD + 8.85));
    snowPlane(LEN, 3.2, CX, 0.0, UD + 8.85);
    g.add(cyl(0.9, 0.95, 0.3, Mc(0xbab5ad), 8, 0.15, UD + 8.6, 24));
    const w = cyl(0.8, 0.8, 0.04, MAT.water, 8, 0.29, UD + 8.6, 24); g.add(w);
    g.add(cyl(0.12, 0.16, 0.8, Mc(0xbab5ad), 8, 0.55, UD + 8.6, 12), sph(0.14, MAT.water, 8, 1.0, UD + 8.6));
    for (const x of [2, 14, 18, 23]) { g.add(box(0.8, 0.4, 0.8, Mc(0x5c5f63), x, 0.2, UD + 8.5)); tree(g, x, UD + 8.5, .8); }
    bench(g, 11, UD + 7.6); bench(g, 20.5, UD + 7.6);
    busStop(g, 5);
  }

  // arka binalar
  if (theme === 'plaza') {
    const winTex = canvasTex(64, 128, (c) => { c.fillStyle = '#7fa3b8'; c.fillRect(0, 0, 64, 128); c.fillStyle = 'rgba(255,255,255,.25)'; for (let y = 4; y < 128; y += 12) for (let x = 4; x < 64; x += 15) c.fillRect(x, y, 10, 7); }, [1, 1]);
    for (const [x, h, w, z] of [[-4, 6, 4, -4], [1.5, 8, 3.5, -6], [7, 5, 4, -3.5], [12, 9, 4, -7], [17, 6.5, 3.5, -4.5], [22, 7.5, 4, -6], [27, 5, 4, -4]]) {
      const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(w / 2, h / 2);
      g.add(box(w, h, 3, new THREE.MeshStandardMaterial({ map: t, roughness: .2, metalness: .4 }), x, h / 2, z));
    }
  } else {
    const roofCols = theme === 'sea' ? [0xf2efe8, 0xe9e2d6, 0xf5f2ec, 0xece6dc] : theme === 'campus' ? [0xa5543d, 0x9c4f3a, 0xb05c43, 0x96503d] : [0x9b8f84, 0x8e857c, 0xa0948a, 0x938a80];
    for (let u = 0; u < NU; u++) {
      g.add(box(UW, WALL_H + .05, 3.5, Mc(roofCols[u]), u * UW + UW / 2, (WALL_H + .05) / 2, -1.9));
      g.add(box(0.5, 0.3, 0.4, Mc(0xd8d8d8), u * UW + 1 + u * .7, WALL_H + .2, -1.4));
      if (theme === 'sea') g.add(box(UW, 0.12, 3.5, MAT.terracotta, u * UW + UW / 2, WALL_H + .11, -1.9));
      else if (u % 2 === 0) g.add(cyl(0.25, 0.25, 0.45, Mc(0xe8e8e8), u * UW + 3.6, WALL_H + .27, -2.3, 12));
      snowPlane(UW, 3.5, u * UW + UW / 2, WALL_H + .07 + (theme === 'sea' ? .12 : 0), -1.9);
    }
  }
  // yan binalar (sol uç ve sağ uçtaki küçük bina; sağdaki köşe rakip kahveciye ayrıldı)
  const sideBld = (x0, x1, h, col) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    g.add(box(w, h, UD + 3.5, Mc(col), cx, h / 2, (UD - 3.5) / 2));
    for (let x = x0 + .8; x < x1 - .5; x += 1.4) g.add(box(0.7, 0.45, 0.03, Mc(0x5c6b73), x, h * .55, UD + 0.02));
    g.add(box(0.6, 0.9, 0.03, Mc(0x5a3d2b), x1 - 1, .45, UD + 0.02));
    snowPlane(w, UD + 3.5, cx, h + .01, (UD - 3.5) / 2);
  };
  sideBld(-9, -0.08, 1.9, theme === 'sea' ? 0xf0ece4 : theme === 'campus' ? 0xb86a50 : 0xd9b99b);
  sideBld(RIVAL_X0 + RIVAL_W + .4, 31, 1.1, 0xc9d3c0);
  // sokak lambaları
  const lamps = [[0, UD + 1.6], [10, UD + 1.6], [20, UD + 1.6], [5, UD + 5.7], [15, UD + 5.7]];
  lamps.forEach(([x, z], k) => {
    g.add(cyl(0.03, 0.04, 1.25, MAT.trim, x, 0.62, z, 8));
    g.add(box(0.06, 0.04, 0.3, MAT.trim, x, 1.23, z - 0.13));
    g.add(box(0.16, 0.06, 0.2, MAT.lampHead, x, 1.19, z - 0.27));
    streetLights[k].position.set(x, 1.05, z - 0.3);
  });
  setSeasonLook();
}

// ---- rakip kahvecinin binası: yakında / açık / kapandı ----
export function buildRival() {
  if (rivalGroup) scene.remove(rivalGroup);
  rivalGroup = new THREE.Group(); scene.add(rivalGroup);
  const g = rivalGroup, r = B().rival, x0 = RIVAL_X0, cx = x0 + RIVAL_W / 2, h = 1.1;
  const open = r.active && !r.closed;
  g.add(box(RIVAL_W, h, UD + 1, Mc(open ? 0xf4efe6 : 0xcfc8bd), cx, h / 2, (UD - 1) / 2));
  rivalSnow = new THREE.Mesh(new THREE.PlaneGeometry(RIVAL_W, UD + 1), snowMat);
  rivalSnow.rotation.x = -Math.PI / 2; rivalSnow.position.set(cx, h + .01, (UD - 1) / 2); rivalSnow.visible = snowCover.visible; g.add(rivalSnow);
  for (const x of [x0 + .9, x0 + 2.2]) {
    g.add(box(1.0, 0.5, 0.03, open ? M(0xffe2a8, { extra: { emissive: 0xffc870, emissiveIntensity: .5 } }) : Mc(0x8c8478), x, .45, UD + .02));
    if (!open) for (const k of [-1, 1]) { const p = box(1.05, 0.06, 0.04, MAT.woodL, x, .45 + k * .08, UD + .04); p.rotation.z = k * .25; g.add(p); }
  }
  const doorX = x0 + 3.5;
  g.add(box(0.6, 0.8, 0.03, open ? Mc(0x3a2a20) : Mc(0x6e665c), doorX, .4, UD + .02));
  const name = rivalName();
  let txt, bg, fg;
  if (r.closed) { txt = 'KAPANDI · KİRALIK'; bg = '#9a9186'; fg = '#ffffff'; }
  else if (open) { txt = name + (r.promo > 0 ? '  %30 İNDİRİM' : ''); bg = '#c0392b'; fg = '#ffffff'; }
  else { txt = 'YAKINDA: ' + name; bg = '#f1c40f'; fg = '#2a211b'; }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(RIVAL_W - .3, 0.28), new THREE.MeshBasicMaterial({ map: bannerTex(txt, bg, fg, 640, 52) }));
  sign.position.set(cx, h - .17, UD + .03); g.add(sign);
  if (open) {
    const aw = box(RIVAL_W - .2, 0.04, 0.5, Mc(0xc0392b), cx, .9, UD + .25); aw.rotation.x = .25; g.add(aw);
    g.add(box(0.5, 0.6, 0.08, Mc(0x2b2b2e), doorX + 1, .3, UD + .55));
  }
}

// ---- cadde hayatı ----
const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0xecf0f1, 0x2c3e50, 0x16a085, 0x8e44ad, 0xe67e22];
const cars = [];
for (let k = 0; k < 6; k++) {
  const dir = k % 2 ? -1 : 1, car = makeCar(pick(CAR_COLORS));
  car.position.set(rand(STREET_X0 - 6, STREET_X1 + 6), -0.07, dir > 0 ? UD + 2.65 : UD + 4.5);
  car.rotation.y = dir > 0 ? 0 : Math.PI;
  scene.add(car); cars.push({ car, dir, speed: rand(2.2, 3.6) });
}
const cat = { mesh: makeCat(), pos: V(4, UD + 0.4), target: null, wait: 2 };
scene.add(cat.mesh);
export function updateStreet(dt) {
  for (const c of cars) {
    c.car.position.x += c.dir * c.speed * dt;
    if (c.dir > 0 && c.car.position.x > STREET_X1 + 8) c.car.position.x = STREET_X0 - 8;
    if (c.dir < 0 && c.car.position.x < STREET_X0 - 8) c.car.position.x = STREET_X1 + 8;
  }
  if (cat.wait > 0) { cat.wait -= dt; cat.mesh.position.y = -0.02; }
  else {
    if (!cat.target) cat.target = V(rand(STREET_X0 + 4, STREET_X1 - 4), UD + rand(0.15, 1.6));
    const dx = cat.target.x - cat.pos.x, dz = cat.target.z - cat.pos.z, d = Math.hypot(dx, dz);
    if (d < .05) { cat.target = null; cat.wait = rand(4, 12); }
    else { cat.pos.x += dx / d * .7 * dt; cat.pos.z += dz / d * .7 * dt; cat.mesh.rotation.y = Math.atan2(dx, dz) - Math.PI / 2; cat.mesh.position.y = Math.abs(Math.sin(performance.now() / 90)) * .015; }
  }
  cat.mesh.position.x = cat.pos.x; cat.mesh.position.z = cat.pos.z;
  const t = performance.now() / 1000;
  for (const b of boats) { b.b.position.y = -0.06 + Math.sin(t + b.ph) * .04; b.b.rotation.z = Math.sin(t * .8 + b.ph) * .05; }
}
