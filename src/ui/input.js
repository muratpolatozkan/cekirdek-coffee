// Fare/dokunmatik/klavye.
// Yeni eşya: kamera dükkana yaklaşır, eşya uygun bir yere kendiliğinden konur; sürükle ya da kareye dokun, ✓ Koy.
// Mevcut eşya: dokun (ya da basılı tut) → ↻ Döndür · ✋ Taşı · 💸 Sat.
import * as THREE from 'three';
import { UD, CATALOG } from '../config.js';
import { S, B, save } from '../state.js';
import { $, fmt, V } from '../utils.js';
import { renderer, scene, camera, IS_TOUCH, groundAt, panBy, setZoom, setCamTarget, requestRender } from '../engine/scene.js';
import { makeModel } from '../engine/models.js';
import { toast, haptic } from './toast.js';
import { floatText } from './overlay.js';
import { refreshUI } from './hud.js';
import { takePhoto } from './photo.js';
import { inBounds, itemAt, tileCenter, frontTile, addItem, removeItem, bars, placeProblem, ownX0, ownX1, ownedCount, cleanItem } from '../sim/grid.js';
import { assignBaristas, helpBar } from '../sim/staff.js';
import { track } from '../sim/progress.js';
import { spend } from '../sim/economy.js';
import { sheet, closeSheet, openSheet } from './panels.js';

// mode: 'none' | 'build' (yeni ya da taşınan eşya) | 'select' (eşya seçili) | 'sell' / 'move' (eski araçlar)
export let mode = 'none', buildType = null, buildRot = 0, moving = null, selItem = null;
let sel = null, ghost = null, gridLines = null, hover = null, lastPointer = null, lastTap = 0, sellArmed = false, moveFromTool = false;
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .55, depthWrite: false });
const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .35, depthWrite: false }));
hl.rotation.x = -Math.PI / 2; hl.position.y = 0.012; hl.visible = false; scene.add(hl);
const frontHl = hl.clone(); frontHl.material = new THREE.MeshBasicMaterial({ color: 0x9be7c4, transparent: true, opacity: .4, depthWrite: false }); scene.add(frontHl);
const bar = $('actionbar');
const refund = it => Math.floor(CATALOG[it.type].price * 0.5);

function rebuildGrid() {
  if (gridLines) scene.remove(gridLines);
  const pts = [], x0 = ownX0(), x1 = ownX1(), d = B().terrace ? UD + 1 : UD;
  for (let i = x0; i <= x1; i++) pts.push(i, 0.008, 0, i, 0.008, d);
  for (let j = 0; j <= d; j++) pts.push(x0, 0.008, j, x1, 0.008, j);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gridLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5a4030, transparent: true, opacity: .28 }));
  gridLines.visible = mode === 'build' || mode === 'sell' || mode === 'move'; scene.add(gridLines);
}
// dükkanı ekrana sığdır (yerleştirirken kareler rahat seçilsin)
function focusShop() {
  const x0 = ownX0(), x1 = ownX1();
  setCamTarget(V((x0 + x1) / 2, UD / 2 + 0.7));
  const n = ownedCount(), want = IS_TOUCH ? (n === 1 ? 1.75 : n === 2 ? 1.2 : 0.9) : (n === 1 ? 1.6 : n === 2 ? 1.2 : 0.95);
  if (camera.zoom < want) setZoom(want);
}
// ekranın ortasına en yakın uygun kare
function findSpot(type, r) {
  const c = groundAt(innerWidth / 2, innerHeight * 0.42) || V((ownX0() + ownX1()) / 2, UD / 2);
  const tiles = [];
  for (let i = ownX0(); i < ownX1(); i++) for (let j = 0; j <= (B().terrace ? UD : UD - 1); j++) tiles.push({ i, j });
  tiles.sort((a, b) => Math.hypot(a.i + .5 - c.x, a.j + .5 - c.z) - Math.hypot(b.i + .5 - c.x, b.j + .5 - c.z));
  return tiles.find(t => !placeProblem(type, t.i, t.j, r)) || null;
}

export function setMode(m, type) {
  if (moving && !(m === 'build' && type === moving.type)) { addItem(moving); assignBaristas(); moving = null; }
  mode = m; buildType = m === 'build' ? type : null; sel = null; sellArmed = false;
  if (m !== 'select') selItem = null;
  if (m === 'none') moveFromTool = false;
  rebuildGrid();
  if (ghost) { scene.remove(ghost); ghost = null; }
  if (m === 'build') {
    ghost = makeModel(type);
    ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } if (o.isLight) o.visible = false; });
    scene.add(ghost);
    focusShop();
    sel = moving ? { i: moving.i, j: moving.j } : findSpot(type, buildRot);
  }
  if (m === 'sell' || m === 'move') focusShop();
  bar.classList.toggle('show', m !== 'none');
  updateHover(); refreshUI();
}
export function selectItem(it) {
  if (moving) setMode('none');
  mode = 'select'; selItem = it; sellArmed = false;
  rebuildGrid(); if (ghost) { scene.remove(ghost); ghost = null; }
  bar.classList.add('show');
  haptic(10); updateHover();
}

// ---- yerleştirme çubuğu ----
const target = () => (mode === 'select' ? selItem && { i: selItem.i, j: selItem.j } : IS_TOUCH ? sel : hover || sel);
function show(id, on) { $(id).style.display = on ? '' : 'none'; }
function updateBar() {
  if (mode === 'none') return;
  const t = target(), it = t && itemAt(t.i, t.j);
  let title = '', msg = '', bad = false, ok = false, okLabel = '✓';
  show('abRot', mode === 'build' || mode === 'select'); show('abMove', mode === 'select'); show('abSell', mode === 'select');
  show('abOk', mode === 'build' || mode === 'sell');
  if (mode === 'build') {
    const d = CATALOG[buildType];
    title = moving ? `✋ ${d.icon} ${d.name} taşınıyor` : `${d.icon} ${d.name} · ${fmt(d.price)}`;
    if (!t) msg = IS_TOUCH ? 'Koymak istediğin kareye dokun' : 'Koymak istediğin kareye tıkla';
    else {
      const prob = placeProblem(buildType, t.i, t.j, buildRot) || (!moving && S.money < d.price ? 'Yeterli paran yok' : null);
      if (prob) { msg = prob; bad = true; }
      else { msg = IS_TOUCH ? 'Sürükle ya da başka kareye dokun · uygunsa ✓' : 'Uygun yer · tıkla ya da ✓'; ok = true; }
    }
    okLabel = moving ? '✓ Bırak' : '✓ Koy';
  } else if (mode === 'select') {
    const d = CATALOG[selItem.type];
    title = `${d.icon} ${d.name}`;
    msg = sellArmed ? `Satmak için tekrar dokun (+${fmt(refund(selItem))})` : 'Döndür, taşı ya da sat';
    $('abSell').textContent = sellArmed ? `✓ +${fmt(refund(selItem))}` : '💸';
    $('abSell').classList.toggle('ok', sellArmed);
  } else if (mode === 'sell') {
    title = '💸 Sat (%50 iade)';
    if (it) { msg = `${CATALOG[it.type].icon} ${CATALOG[it.type].name} · +${fmt(refund(it))}`; ok = true; }
    else msg = IS_TOUCH ? 'Satmak istediğin eşyaya dokun' : 'Satmak istediğin eşyaya tıkla';
    okLabel = '✓ Sat';
  } else if (mode === 'move') {
    title = '✋ Taşı'; msg = IS_TOUCH ? 'Taşımak istediğin eşyaya dokun' : 'Taşımak istediğin eşyaya tıkla';
  }
  $('abTitle').textContent = title;
  const m = $('abMsg'); m.textContent = msg; m.classList.toggle('bad', bad);
  const okb = $('abOk'); okb.textContent = okLabel; okb.disabled = !ok;
}
function tileFromEvent(e) {
  const p = groundAt(e.clientX, e.clientY); if (!p) return null;
  const t = { i: Math.floor(p.x), j: Math.floor(p.z) };
  return inBounds(t.i, t.j) ? t : null;
}
export function updateHover() {
  hover = lastPointer ? tileFromEvent(lastPointer) : null;
  hl.visible = frontHl.visible = false;
  if (ghost) ghost.visible = false;
  renderer.domElement.style.cursor = hover && (mode === 'none' || mode === 'select') && itemAt(hover.i, hover.j) ? 'pointer' : 'default';
  const t = target();
  if (t && mode !== 'none') {
    hl.visible = true; hl.position.x = t.i + 0.5; hl.position.z = t.j + 0.5;
    if (mode === 'build') {
      const ok = !placeProblem(buildType, t.i, t.j, buildRot) && (moving || S.money >= CATALOG[buildType].price);
      const col = ok ? 0x2ecc71 : 0xe74c3c;
      hl.material.color.setHex(col); ghostMat.color.setHex(col);
      ghost.visible = true; ghost.position.copy(tileCenter(t.i, t.j)); ghost.rotation.y = buildRot * Math.PI / 2;
      if (buildType === 'bar') { const f = frontTile({ i: t.i, j: t.j, r: buildRot }); frontHl.visible = true; frontHl.position.set(f.i + .5, .012, f.j + .5); }
    } else if (mode === 'select') hl.material.color.setHex(0x3498db);
    else hl.material.color.setHex(itemAt(t.i, t.j) ? (mode === 'sell' ? 0xe74c3c : 0x3498db) : 0x999999);
  }
  updateBar();
  requestRender();
}

// ---- işlemler ----
function confirmAt(t) {
  if (!t) return;
  const it = itemAt(t.i, t.j);
  if (mode === 'build') {
    const def = CATALOG[buildType];
    if (!moving && S.money < def.price) return toast('Yeterli paran yok.');
    const prob = placeProblem(buildType, t.i, t.j, buildRot);
    if (prob) { haptic(30); return toast('Buraya konamaz: ' + prob.toLowerCase()); }
    haptic(12);
    if (moving) {
      addItem({ type: buildType, i: t.i, j: t.j, r: buildRot }); moving = null; assignBaristas(); save();
      floatText('✓', tileCenter(t.i, t.j).setY(0.8));
      setMode(moveFromTool ? 'move' : 'none'); return;
    }
    spend(def.price);
    addItem({ type: buildType, i: t.i, j: t.j, r: buildRot });
    floatText('−' + fmt(def.price), tileCenter(t.i, t.j).setY(0.8), 'bad');
    if (buildType === 'bar') assignBaristas();
    save(); refreshUI();
    if (S.money < def.price) { toast('Bütçe bitti.'); setMode('none'); return; }
    sel = findSpot(buildType, buildRot);   // bir sonraki için hazır
    updateHover();
  } else if (mode === 'sell' && it) sellItem(it);
}
function sellItem(it) {
  const r = refund(it);
  haptic(16);
  removeItem(it); S.money += r;
  floatText('+' + fmt(r), tileCenter(it.i, it.j).setY(0.8));
  if (!bars().length) toast('⚠️ Espresso bar olmadan servis yapılamaz!');
  save(); refreshUI();
}
function rotateSelected() {
  const it = selItem; if (!it) return;
  const data = { type: it.type, i: it.i, j: it.j, r: it.r };
  removeItem(it);
  const nr = (data.r + 1) % 4, prob = placeProblem(data.type, data.i, data.j, nr);
  const placed = addItem({ ...data, r: prob ? data.r : nr });
  if (data.type === 'bar') assignBaristas();
  if (prob) toast('Bu yöne dönemez: ' + prob.toLowerCase()); else haptic(8);
  selItem = placed; save(); updateHover();
}
function pickUp(it, fromTool = false) {
  moving = { type: it.type, i: it.i, j: it.j, r: it.r };
  removeItem(it); buildRot = it.r; moveFromTool = fromTool; haptic(10);
  setMode('build', it.type);
}
function onTap(e) {
  const t = tileFromEvent(e), it = t && itemAt(t.i, t.j);
  if (sheet && mode === 'none') { closeSheet(); return; }
  if (mode === 'none' || mode === 'select') {
    if (!it) { if (mode === 'select') setMode('none'); return; }
    if (it.type === 'bar' && it.cur && helpBar(it)) { haptic(6); return; }      // barı hızlandır
    if (it.seats?.some(s => s.dirty) && cleanItem(it)) { haptic(8); track('cleans'); return; }   // masayı topla
    if (mode === 'select' && selItem === it) { setMode('none'); return; }
    selectItem(it);
    return;
  }
  if (mode === 'move') { if (it) pickUp(it, true); return; }
  if (e.pointerType === 'touch') {
    // aynı kareye kısa sürede iki kez dokunmak da onaylar
    const same = sel && t && sel.i === t.i && sel.j === t.j && performance.now() - lastTap < 600;
    sel = t ? { ...t } : sel; lastTap = performance.now();
    updateHover();
    if (same) confirmAt(sel);
  } else { sel = t ? { ...t } : null; confirmAt(t); }
}

$('abOk').onclick = () => confirmAt(target());
$('abRot').onclick = () => { if (mode === 'select') return rotateSelected(); buildRot = (buildRot + 1) % 4; haptic(6); updateHover(); };
$('abMove').onclick = () => { if (selItem) pickUp(selItem); };
$('abSell').onclick = () => {
  if (!selItem) return;
  if (!sellArmed) { sellArmed = true; haptic(10); updateBar(); return; }
  const it = selItem; setMode('none'); sellItem(it);
};
$('abCancel').onclick = () => { const wasNew = mode === 'build' && !moving; setMode('none'); if (wasNew && IS_TOUCH) openSheet('build'); };

// ---- dokunma: sürükle (kamera ya da hayalet eşya), basılı tut (eşyayı seç), iki parmak (yakınlaştır) ----
const cvs = renderer.domElement;
let drag = null, pinch = null, holdTimer = null;
const touches = new Map();
const touchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('pointerdown', e => {
  if (e.button === 2) { setMode('none'); return; }
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
  clearTimeout(holdTimer);
  if (touches.size === 2) { pinch = { d: touchDist(), zoom: camera.zoom }; drag = null; return; }
  if (touches.size > 2) return;
  const t = tileFromEvent(e);
  // hayalet eşyanın üstünden başlayan sürükleme eşyayı taşır, başka yerden başlayan kamerayı kaydırır
  const onGhost = mode === 'build' && t && sel && Math.abs(t.i - sel.i) <= 1 && Math.abs(t.j - sel.j) <= 1;
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, ghost: onGhost, held: false };
  // basılı tutunca eşyayı seç
  if ((mode === 'none' || mode === 'select') && t && itemAt(t.i, t.j)) {
    holdTimer = setTimeout(() => { if (drag && !drag.moved) { drag.held = true; closeSheet(); selectItem(itemAt(t.i, t.j)); } }, 420);
  }
});
cvs.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size === 2) { setZoom(pinch.zoom * touchDist() / pinch.d); return; }
  if (e.pointerType !== 'touch') lastPointer = e;
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) { drag.moved = true; clearTimeout(holdTimer); }
    if (drag.moved) {
      if (drag.ghost) { const t = tileFromEvent(e); if (t && (!sel || t.i !== sel.i || t.j !== sel.j)) { sel = t; haptic(4); updateHover(); } }
      else { panBy(e.clientX - drag.lx, e.clientY - drag.ly); }
      drag.lx = e.clientX; drag.ly = e.clientY;
    }
  }
  if (e.pointerType !== 'touch') updateHover();
});
function endPointer(e) {
  touches.delete(e.pointerId);
  clearTimeout(holdTimer);
  if (touches.size < 2) pinch = null;
  const tap = e.type !== 'pointercancel' && drag && !drag.moved && !drag.held; drag = null;
  if (tap) onTap(e);
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; lastPointer = null; updateHover(); });
cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(camera.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); updateHover(); }, { passive: false });

export function initInput({ setSpeed, getSpeed }) {
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') { if (mode !== 'none') setMode('none'); else closeSheet(); }
    else if (e.key === 'r' || e.key === 'R') { if (mode === 'select') rotateSelected(); else { buildRot = (buildRot + 1) % 4; updateHover(); } }
    else if (e.key === 's' || e.key === 'S') setMode(mode === 'sell' ? 'none' : 'sell');
    else if (e.key === 'm' || e.key === 'M') { if (mode === 'select' && selItem) pickUp(selItem); else setMode(mode === 'move' ? 'none' : 'move'); }
    else if (e.key === 'p' || e.key === 'P') takePhoto();
    else if (e.key === 'Enter' && (mode === 'build' || mode === 'sell')) confirmAt(target());
    else if (e.key === ' ') { e.preventDefault(); setSpeed(getSpeed() ? 0 : 1); }
    else if (/^[1-9]$/.test(e.key)) { const t = Object.keys(CATALOG)[+e.key - 1]; if (t) { closeSheet(); setMode(mode === 'build' && buildType === t ? 'none' : 'build', t); } }
  });
}
