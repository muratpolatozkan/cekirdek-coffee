// Dükkan birimleri: zemin, duvarlar, tabelalar, komşuların içi, bizim dekor, teras, yılbaşı ışıkları
import * as THREE from 'three';
import { UW, UD, NU, GW, WALL_H, HOODS, NEIGHBORS, WALL_COLORS, BRAND_COLORS, DRINKS } from '../config.js';
import { S, B, seasonOf } from '../state.js';
import { scene } from '../engine/scene.js';
import { M, Mc, G, box, cyl, sph, cone, MAT, canvasTex, floorTex, signTexture, bannerTex } from '../engine/assets.js';
import { makePerson, makeWallDecor, sitPose, PRODUCT_COLORS } from '../engine/models.js';
import { pick, rand } from '../utils.js';
import { ownX0, ownX1, ownedCount } from '../sim/grid.js';

let group = new THREE.Group(); scene.add(group);
export const unitLights = [];
for (let u = 0; u < NU; u++) {
  const l = new THREE.PointLight(0xffd9a8, 0, 7, 1.2); l.position.set(u * UW + UW / 2, 1.45, UD / 2); scene.add(l); unitLights.push(l);
}
let npcs = [], poles = [], xmasMats = [], clocks = [];
let menuBoard = null;
// arka duvardaki dekor yuvaları (birim içi x konumu); ilk dükkanda tabela ve menü olduğu için tek yuva var
export const wallSlots = u => u === 1 ? [4.45] : [1.0, 2.5, 4.0];

function menuTexture() {
  const on = Object.entries(DRINKS).filter(([id]) => S.menu[id].on);
  return canvasTex(512, 300, (g) => {
    g.fillStyle = '#1e1e1e'; g.fillRect(0, 0, 512, 300);
    g.fillStyle = '#f2ead8'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('MENÜ', 256, 38);
    g.font = `500 ${on.length > 8 ? 18 : 21}px system-ui, sans-serif`;
    on.slice(0, 12).forEach(([id, d], k) => {
      const col = k % 2, row = Math.floor(k / 2), x = 22 + col * 250, y = 78 + row * 37;
      g.textAlign = 'left'; g.fillStyle = d.sig ? '#ffd28a' : '#f2ead8'; g.fillText(d.name, x, y);
      g.textAlign = 'right'; g.fillStyle = '#d6b480'; g.fillText(S.menu[id].price + '₺', x + 222, y);
    });
  });
}
export function refreshMenuBoard() { if (!menuBoard) return; menuBoard.material.map.dispose(); menuBoard.material.map = menuTexture(); }

function fascia(u) {
  const b = B(), status = b.units[u], kind = HOODS[b.hood].units[u].kind;
  let txt, bg, fg;
  if (status === 'own') { txt = `${S.brand.icon} ${S.brand.name} COFFEE`; bg = BRAND_COLORS[S.brand.color]; fg = '#f3e9d6'; }
  else if (status === 'occupied') { const N = NEIGHBORS[kind]; txt = N.sign; bg = N.signBg; fg = N.signFg; }
  else { txt = 'KİRALIK  ☎ 555 01 23'; bg = '#f6f2ea'; fg = '#c0392b'; }
  const tex = bannerTex(txt, bg, fg);
  const side = Mc(0x3a3430);
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: .6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12 });
  const m = new THREE.Mesh(G('b3,0.3,0.1', () => new THREE.BoxGeometry(3, .3, .1)), [side, side, side, side, front, side]);
  m.position.set(u * UW + 1.5, .15, UD + .05); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildUnits() {
  scene.remove(group);
  group = new THREE.Group(); scene.add(group);
  npcs = []; poles = []; xmasMats = []; clocks = []; menuBoard = null;
  const g = group, b = B(), H = HOODS[b.hood];
  const wallOwn = WALL_COLORS[b.decor.wall]?.c ?? 0xf4f0ea;
  for (let u = 0; u < NU; u++) {
    const st = b.units[u], kind = H.units[u].kind, own = st === 'own', x0 = u * UW, cx = x0 + UW / 2;
    const N = NEIGHBORS[kind];
    const ftex = own ? floorTex(b.decor.floor) : st === 'occupied' && N ? floorTex(N.floor) : floorTex('beton');
    const floor = new THREE.Mesh(G('floorU', () => new THREE.PlaneGeometry(UW, UD)), new THREE.MeshStandardMaterial({ map: ftex, roughness: .8 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, UD / 2); floor.receiveShadow = true; g.add(floor);
    g.add(box(UW, 0.3, UD, Mc(0x8a6a4f), cx, -0.151, UD / 2));
    const wallCol = own ? wallOwn : st === 'occupied' && N ? N.wall : 0xd6d0c6;
    g.add(box(UW, WALL_H, 0.15, Mc(wallCol), cx, WALL_H / 2, -0.075));
    g.add(box(UW, 0.08, 0.17, MAT.trim, cx, 0.04, -0.075));
    // birimler arası: iki taraf da bizimse duvar yok, değilse alçak duvar
    if (u === 0) { g.add(box(0.15, WALL_H, UD, Mc(wallCol), -0.075, WALL_H / 2, UD / 2)); g.add(box(0.17, 0.08, UD, MAT.trim, -0.075, 0.04, UD / 2)); }
    else if (!(own && b.units[u - 1] === 'own')) { g.add(box(0.12, 0.35, UD, Mc(0xe9e3da), x0, 0.175, UD / 2)); g.add(box(0.14, 0.03, UD, MAT.trim, x0, 0.36, UD / 2)); }
    if (u === NU - 1) { g.add(box(0.12, 0.35, UD, Mc(0xe9e3da), GW, 0.175, UD / 2)); g.add(box(0.14, 0.03, UD, MAT.trim, GW, 0.36, UD / 2)); }
    // ön cephe: tabelalı alçak duvar (kapı boşluklu); yüksek cephe içeriyi kapatacağı için yok
    g.add(fascia(u));
    g.add(box(1, 0.3, 0.1, Mc(0x3a3430), x0 + 4.5, 0.15, UD + 0.05));
    g.add(box(0.12, 0.38, 0.12, MAT.trim, x0 + 0.06, 0.19, UD + 0.05));
    if (u === NU - 1) g.add(box(0.12, 0.38, 0.12, MAT.trim, GW - 0.06, 0.19, UD + 0.05));
    if (!(own && b.terrace)) g.add(box(0.8, 0.01, 0.45, Mc(0x2f2f2f), x0 + 3.5, 0.006, UD - 0.28));
    if (own) {
      if (u === 1) decorOurs(g, x0);
      wallSlots(u).forEach((sx, k) => {
        const d = b.decor.slots[`${u}-${k}`]; if (!d) return;
        const m = makeWallDecor(d); m.position.set(x0 + sx, 0.95, 0.02); g.add(m);
        if (d === 'saat') clocks.push(m);
      });
      if (seasonOf(S.day).id === 'kis') xmasLights(g, x0);
    } else if (st === 'occupied') decorNeighbor(g, x0, kind);
    else decorEmpty(g, x0);
  }
  if (b.terrace) terraceDeck(g);
}

function decorOurs(g, x0) {
  const color = BRAND_COLORS[S.brand.color];
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.48), new THREE.MeshBasicMaterial({ map: signTexture(S.brand.name, 'specialty coffee · roastery', '#23201d', '#ffe2b8') }));
  sign.position.set(x0 + 0.95, 1.05, 0.012); g.add(sign);
  g.add(box(1.5, 0.04, 0.03, Mc(parseInt(color.slice(1), 16)), x0 + 0.95, 0.78, 0.015));
  menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.94), new THREE.MeshBasicMaterial({ map: menuTexture() }));
  menuBoard.position.set(x0 + 3.0, 1.0, 0.012); g.add(menuBoard);
}
function xmasLights(g, x0) {
  const cols = [0xff4d4d, 0xffd84d, 0x4dd2ff, 0x7dff6b];
  if (!xmasMats.length) for (const c of cols) xmasMats.push(M(c, { extra: { emissive: c, emissiveIntensity: 1 } }));
  let k = 0;
  for (let x = x0 + .1; x < x0 + UW - .05; x += .22) { if (x > x0 + 3 && x < x0 + 4) continue; g.add(sph(0.022, xmasMats[k++ % 4], x, 0.32, UD + 0.11)); }
}
function terraceDeck(g) {
  const x0 = ownX0(), w = ownX1() - x0;
  const tex = floorTex('deck').clone(); tex.needsUpdate = true; tex.repeat.set(w / 1.5, 1 / 1.5);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }));
  deck.rotation.x = -Math.PI / 2; deck.position.set(x0 + w / 2, 0.004, UD + 0.5); deck.receiveShadow = true; g.add(deck);
  for (const x of [x0 + .15, x0 + w - .15]) { g.add(box(0.26, 0.26, 0.26, Mc(0x3a3430), x, 0.13, UD + .85)); g.add(sph(0.16, MAT.leaf2, x, 0.38, UD + .85)); }
  g.add(box(w, 0.03, 0.03, MAT.trim, x0 + w / 2, 0.02, UD + 1.0));
}

// ---- komşu dükkanların içi ----
function npc(g, x, z, kind, rotY = 0) {
  const look = NEIGHBORS[kind].npc;
  const p = makePerson({ shirt: look.shirt, hair: look.hair, skin: 0xe0ac7e });
  p.position.set(x, 0, z); p.rotation.y = rotY; g.add(p); npcs.push(p);
  return p;
}
function counter(g, x, z, col = 0xa0522d) {
  g.add(box(1.15, 0.5, 0.45, Mc(col), x, 0.25, z));
  g.add(box(1.2, 0.03, 0.5, MAT.woodL, x, 0.515, z));
  g.add(box(0.22, 0.14, 0.18, MAT.dark, x - 0.25, 0.6, z));
}
function shelves(g, x0, colors, thin = false) {
  const shelfMat = Mc(0x8b6b4a);
  for (let k = 0; k < 3; k++) {
    const sx = x0 + 0.95 + k * 1.55;
    g.add(box(1.4, 1.15, 0.04, shelfMat, sx, 0.575, 0.05));
    for (const y of [0.05, 0.42, 0.79]) {
      g.add(box(1.4, 0.03, 0.3, shelfMat, sx, y, 0.2));
      const n = thin ? 14 : 6, w = thin ? 0.07 : 0.17, step = 1.3 / n;
      for (let i = 0; i < n; i++) { const h = pick(thin ? [0.2, 0.24, 0.27] : [0.14, 0.18, 0.22]); g.add(box(w, h, thin ? 0.18 : 0.15, Mc(pick(colors)), sx - 0.62 + i * step + step / 2, y + 0.015 + h / 2, 0.2)); }
    }
  }
}
function crate(g, x, z, fruitCols, ice = false) {
  g.add(box(0.48, 0.2, 0.34, ice ? Mc(0xdfeff5) : MAT.woodL, x, 0.1, z));
  for (let n = 0; n < 6; n++) {
    const f = sph(0.06, Mc(pick(fruitCols)), x - 0.14 + (n % 3) * 0.14, 0.24, z - 0.07 + Math.floor(n / 3) * 0.14);
    if (ice) f.scale.set(1.8, .6, .8); g.add(f);
  }
}
function decorNeighbor(g, x0, kind) {
  if (kind === 'bakkal') {
    shelves(g, x0, PRODUCT_COLORS);
    g.add(box(0.55, 1.15, 0.5, MAT.white, x0 + 0.35, 0.575, 2.3), box(0.02, 0.85, 0.4, Mc(0x9fd3e6), x0 + 0.63, 0.62, 2.3));
    counter(g, x0 + 1.4, 4.3); npc(g, x0 + 1.4, 3.8, kind);
    for (let k = 0; k < 3; k++) crate(g, x0 + 0.55 + k * 0.55, UD + 0.28, [[0xf39c12], [0xc0392b], [0x7cb342]][k]);
  } else if (kind === 'kuafor') {
    for (const sx of [x0 + 1.4, x0 + 3.2]) {
      g.add(box(0.75, 0.6, 0.02, M(0xd5ecf4, { r: .05, m: .6 }), sx, 0.95, 0.02));
      g.add(box(0.85, 0.06, 0.26, MAT.white, sx, 0.5, 0.14));
      g.add(cyl(0.1, 0.13, 0.22, MAT.black, sx, 0.11, 1.0, 12));
      g.add(box(0.32, 0.08, 0.32, Mc(0x8b1e1e), sx, 0.26, 1.0), box(0.32, 0.34, 0.06, Mc(0x8b1e1e), sx, 0.45, 1.15));
    }
    const client = makePerson({ shirt: 0xffffff }); client.position.set(x0 + 1.4, 0, 1.0); client.rotation.y = Math.PI; sitPose(client, 0.3); g.add(client);
    npc(g, x0 + 1.85, 1.25, kind, -Math.PI * 0.75);
    g.add(box(0.32, 0.22, 1.3, MAT.woodD, x0 + 0.3, 0.11, 3.6));
    const poleTex = canvasTex(64, 128, (c) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 128);
      for (let k = -2; k < 8; k++) { c.fillStyle = k % 2 ? '#c0392b' : '#2c5f8a'; c.beginPath(); c.moveTo(0, k * 32); c.lineTo(64, k * 32 - 32); c.lineTo(64, k * 32 - 16); c.lineTo(0, k * 32 + 16); c.fill(); }
    }, [1, 1]);
    g.add(cyl(0.05, 0.05, 0.55, new THREE.MeshStandardMaterial({ map: poleTex }), x0 + 0.25, 0.75, UD + 0.18, 16));
    g.add(sph(0.06, MAT.steel, x0 + 0.25, 1.05, UD + 0.18), cyl(0.06, 0.06, 0.04, MAT.steel, x0 + 0.25, 0.46, UD + 0.18));
    poles.push(poleTex);
  } else if (kind === 'cicekci') {
    const flowers = [0xe74c3c, 0xf1c40f, 0xff7eb6, 0xffffff, 0x9b59b6, 0xff9f43];
    const bucket = (x, z) => { g.add(cyl(0.12, 0.1, 0.22, Mc(0x8a96a0), x, 0.11, z, 12)); for (let n = 0; n < 5; n++) { const a = n * 1.25; g.add(cyl(0.008, 0.008, 0.3, MAT.leaf1, x + Math.cos(a) * .05, 0.35, z + Math.sin(a) * .05, 4)); g.add(sph(0.045, Mc(pick(flowers)), x + Math.cos(a) * .07, 0.52, z + Math.sin(a) * .07)); } };
    for (let k = 0; k < 6; k++) bucket(x0 + 0.5 + k * 0.7, 0.4);
    for (let k = 0; k < 4; k++) bucket(x0 + 0.5, 1.4 + k * 0.6);
    counter(g, x0 + 2.6, 3.6, 0xf3e1e6); npc(g, x0 + 2.6, 3.1, kind);
    for (let k = 0; k < 3; k++) bucket(x0 + 0.5 + k * 0.6, UD + 0.3);
  } else if (kind === 'balikci') {
    g.add(box(4.2, 0.55, 0.7, MAT.white, x0 + 2.5, 0.275, 0.6), box(4.1, 0.06, 0.65, Mc(0xdff1f7), x0 + 2.5, 0.58, 0.62));
    for (let n = 0; n < 14; n++) { const f = sph(0.06, Mc(pick([0xb8c6cf, 0xd98880, 0x9aa9b3])), x0 + 0.6 + n * 0.28, 0.63, 0.55 + (n % 2) * 0.15); f.scale.set(2.2, .55, .8); g.add(f); }
    counter(g, x0 + 1.5, 3.6, 0x1f6f8b); npc(g, x0 + 2.4, 1.3, kind, Math.PI);
    crate(g, x0 + 0.8, UD + 0.28, [0xb8c6cf, 0x9aa9b3], true); crate(g, x0 + 1.4, UD + 0.28, [0xd98880], true);
  } else if (kind === 'kirtasiye') {
    shelves(g, x0, [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xffffff, 0xff7eb6], true);
    counter(g, x0 + 1.4, 4.3, 0xe2a400); npc(g, x0 + 1.4, 3.8, kind);
    g.add(box(0.5, 0.7, 0.25, MAT.woodD, x0 + 0.6, 0.35, UD + 0.25));
    for (let k = 0; k < 3; k++) g.add(box(0.42, 0.02, 0.18, Mc(pick([0xf3f1ea, 0xe8dcc6])), x0 + 0.6, 0.25 + k * 0.2, UD + 0.25));
  } else if (kind === 'kurutemizleme') {
    g.add(cyl(0.015, 0.015, 4.2, MAT.steel, x0 + 2.5, 1.0, 0.35, 6).rotateZ(Math.PI / 2));
    for (let n = 0; n < 16; n++) g.add(box(0.2, 0.55, 0.05, Mc(pick([0x2c3e50, 0xf0efe9, 0x8e2b2b, 0x5c6670, 0xe3b23c, 0x3b4d8f])), x0 + 0.6 + n * 0.25, 0.7, 0.35));
    counter(g, x0 + 2.5, 3.8, 0x3b4d8f); npc(g, x0 + 2.5, 3.3, kind);
  } else if (kind === 'fotokopi') {
    for (const x of [x0 + 1, x0 + 2.2]) { g.add(box(0.7, 0.75, 0.55, Mc(0xb5b8bc), x, 0.375, 0.5)); g.add(box(0.72, 0.05, 0.57, MAT.dark, x, 0.78, 0.5)); g.add(box(0.2, 0.02, 0.15, Mc(0x4dd2ff), x + 0.2, 0.765, 0.79)); }
    for (let k = 0; k < 4; k++) g.add(box(0.3, 0.12 + k * 0.03, 0.22, MAT.white, x0 + 3.6, 0.06 + k * 0.015, 0.4 + k * 0.3));
    counter(g, x0 + 1.6, 3.9, 0x3a3a3a); npc(g, x0 + 1.6, 3.4, kind);
  } else if (kind === 'kitapci') {
    shelves(g, x0, [0x8e2b2b, 0x2c5f8a, 0x3d6b45, 0xb5651d, 0x5a3d2b, 0xd8c39a], true);
    g.add(box(1.2, 0.4, 0.7, MAT.woodD, x0 + 2.5, 0.2, 3.0));
    for (let k = 0; k < 5; k++) g.add(box(0.25, 0.05, 0.18, Mc(pick([0x8e2b2b, 0x2c5f8a, 0x3d6b45, 0xd8c39a])), x0 + 2.1 + (k % 3) * 0.3, 0.43 + Math.floor(k / 3) * 0.05, 2.9 + (k % 2) * 0.2));
    npc(g, x0 + 1.2, 3.8, kind);
    g.add(box(0.7, 0.4, 0.35, MAT.woodL, x0 + 0.7, 0.2, UD + 0.25));
    for (let k = 0; k < 7; k++) g.add(box(0.06, 0.2, 0.25, Mc(pick([0x8e2b2b, 0x2c5f8a, 0x3d6b45, 0xb5651d])), x0 + 0.45 + k * 0.08, 0.5, UD + 0.25));
  }
}
function decorEmpty(g, x0) {
  g.add(box(0.5, 0.35, 0.4, MAT.kraft, x0 + 1.2, 0.175, 1.0), box(0.4, 0.3, 0.35, MAT.kraft, x0 + 1.3, 0.5, 1.0));
  g.add(box(0.45, 0.3, 0.45, MAT.kraft, x0 + 3.8, 0.15, 3.2));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('KİRALIK', '☎ 555 01 23', '#fbf7ee', '#c0392b') }));
  paper.position.set(x0 + 2.5, 0.95, 0.012); g.add(paper);
}

export function updateUnits(dt) {
  const t = performance.now();
  for (const n of npcs) n.userData.body.rotation.y = Math.sin(t / 1500 + n.position.x) * .4;
  for (const p of poles) p.offset.y = (p.offset.y + dt * .6) % 1;
  xmasMats.forEach((m, k) => m.emissiveIntensity = .5 + .5 * Math.sin(t / 400 + k * 1.7));
  const hr = (S.time / 60) % 12, mn = S.time % 60;
  for (const c of clocks) { const [h1, h2] = c.userData.hands; h1.rotation.z = -hr / 12 * Math.PI * 2; h2.rotation.z = -mn / 60 * Math.PI * 2; }
}
