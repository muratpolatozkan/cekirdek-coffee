// Fare/dokunmatik/klavye: yerleştirme (önizle → ✓ onayla), satma, taşıma, kamera kaydırma ve yakınlaştırma
import * as THREE from 'three';
import { UD, CATALOG } from '../config.js';
import { S, B, save } from '../state.js';
import { $, fmt } from '../utils.js';
import { renderer, scene, camera, IS_TOUCH, groundAt, panBy, setZoom } from '../engine/scene.js';
import { makeModel } from '../engine/models.js';
import { toast, haptic } from './toast.js';
import { floatText } from './overlay.js';
import { refreshUI } from './hud.js';
import { takePhoto } from './photo.js';
import { inBounds, itemAt, tileCenter, frontTile, addItem, removeItem, bars, placeProblem, ownX0, ownX1, cleanItem } from '../sim/grid.js';
import { assignBaristas } from '../sim/staff.js';
import { spend } from '../sim/economy.js';
import { sheet, closeSheet, openSheet } from './panels.js';

export let mode = 'none', buildType = null, buildRot = 0, moving = null;
let sel = null, ghost = null, gridLines = null, hover = null, lastPointer = null, lastTap = null;
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .55, depthWrite: false });
const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .35, depthWrite: false }));
hl.rotation.x = -Math.PI / 2; hl.position.y = 0.012; hl.visible = false; scene.add(hl);
const frontHl = hl.clone(); frontHl.material = new THREE.MeshBasicMaterial({ color: 0x9be7c4, transparent: true, opacity: .4, depthWrite: false }); scene.add(frontHl);
const bar = $('actionbar');

function rebuildGrid() {
  if (gridLines) scene.remove(gridLines);
  const pts = [], x0 = ownX0(), x1 = ownX1(), d = B().terrace ? UD + 1 : UD;
  for (let i = x0; i <= x1; i++) pts.push(i, 0.008, 0, i, 0.008, d);
  for (let j = 0; j <= d; j++) pts.push(x0, 0.008, j, x1, 0.008, j);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gridLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5a4030, transparent: true, opacity: .28 }));
  gridLines.visible = mode !== 'none'; scene.add(gridLines);
}

export function setMode(m, type) {
  if (moving && !(m === 'build' && type === moving.type)) { addItem(moving); assignBaristas(); moving = null; }
  mode = m; buildType = m === 'build' ? type : null; sel = null; lastTap = null;
  rebuildGrid();
  if (ghost) { scene.remove(ghost); ghost = null; }
  if (m === 'build') {
    ghost = makeModel(type);
    ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } if (o.isLight) o.visible = false; });
    scene.add(ghost);
  }
  bar.classList.toggle('show', m !== 'none');
  updateHover(); refreshUI();
}

// ---- önizleme ve yerleştirme çubuğu ----
const target = () => (IS_TOUCH ? sel : hover || sel);
function updateBar() {
  if (mode === 'none') return;
  const t = target(), it = t && itemAt(t.i, t.j);
  let title = '', msg = '', bad = false, ok = false, okLabel = '✓';
  if (mode === 'build') {
    const d = CATALOG[buildType];
    title = moving ? `✋ ${d.icon} ${d.name} taşınıyor` : `${d.icon} ${d.name} · ${fmt(d.price)}`;
    if (!t) msg = IS_TOUCH ? 'Koymak istediğin kareye dokun' : 'Koymak istediğin kareye tıkla · R: döndür';
    else {
      const prob = placeProblem(buildType, t.i, t.j, buildRot) || (!moving && S.money < d.price ? 'Yeterli paran yok' : null);
      if (prob) { msg = prob; bad = true; } else { msg = buildType === 'bar' ? 'Açık yeşil kare: müşteri sırası' : 'Uygun yer'; ok = true; }
    }
    okLabel = moving ? '✓ Bırak' : '✓ Koy';
  } else if (mode === 'sell') {
    title = '💸 Sat (%50 iade)';
    if (it) { msg = `${CATALOG[it.type].icon} ${CATALOG[it.type].name} · +${fmt(Math.floor(CATALOG[it.type].price * .5))}`; ok = true; }
    else msg = IS_TOUCH ? 'Satmak istediğin eşyaya dokun' : 'Satmak istediğin eşyaya tıkla';
    okLabel = '✓ Sat';
  } else if (mode === 'move') {
    title = '✋ Taşı'; msg = IS_TOUCH ? 'Taşımak istediğin eşyaya dokun' : 'Taşımak istediğin eşyaya tıkla';
  }
  $('abTitle').textContent = title;
  const m = $('abMsg'); m.textContent = msg; m.classList.toggle('bad', bad);
  $('abRot').style.display = mode === 'build' ? '' : 'none';
  const okb = $('abOk'); okb.style.display = mode === 'move' ? 'none' : ''; okb.textContent = okLabel; okb.disabled = !ok;
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
  renderer.domElement.style.cursor = hover && mode === 'none' && itemAt(hover.i, hover.j)?.seats?.some(s => s.dirty) ? 'pointer' : 'default';
  const t = target();
  if (t && mode !== 'none') {
    hl.visible = true; hl.position.x = t.i + 0.5; hl.position.z = t.j + 0.5;
    if (mode === 'build') {
      const ok = !placeProblem(buildType, t.i, t.j, buildRot) && (moving || S.money >= CATALOG[buildType].price);
      const col = ok ? 0x2ecc71 : 0xe74c3c;
      hl.material.color.setHex(col); ghostMat.color.setHex(col);
      ghost.visible = true; ghost.position.copy(tileCenter(t.i, t.j)); ghost.rotation.y = buildRot * Math.PI / 2;
      if (buildType === 'bar') { const f = frontTile({ i: t.i, j: t.j, r: buildRot }); frontHl.visible = true; frontHl.position.set(f.i + .5, .012, f.j + .5); }
    } else hl.material.color.setHex(itemAt(t.i, t.j) ? (mode === 'sell' ? 0xe74c3c : 0x3498db) : 0x999999);
  }
  updateBar();
}

// seçili karede işlemi yap (✓ butonu, bilgisayarda tıklama)
function confirmAt(t) {
  if (!t) return;
  const it = itemAt(t.i, t.j);
  if (mode === 'build') {
    const def = CATALOG[buildType];
    if (!moving && S.money < def.price) return toast('Yeterli paran yok.');
    const prob = placeProblem(buildType, t.i, t.j, buildRot);
    if (prob) { haptic(30); return toast('Buraya konamaz: ' + prob.toLowerCase()); }
    haptic(12);
    if (moving) { addItem({ type: buildType, i: t.i, j: t.j, r: buildRot }); moving = null; assignBaristas(); save(); setMode('move'); return; }
    spend(def.price);
    addItem({ type: buildType, i: t.i, j: t.j, r: buildRot });
    floatText('−' + fmt(def.price), tileCenter(t.i, t.j).setY(0.8), 'bad');
    if (buildType === 'bar') assignBaristas();
    sel = null; save(); refreshUI(); updateHover();
    if (S.money < def.price) { toast('Bütçe bitti.'); setMode('none'); }
  } else if (mode === 'sell' && it) {
    const refund = Math.floor(CATALOG[it.type].price * 0.5);
    haptic(16);
    removeItem(it); S.money += refund;
    floatText('+' + fmt(refund), tileCenter(it.i, it.j).setY(0.8));
    if (!bars().length) toast('⚠️ Espresso bar olmadan servis yapılamaz!');
    sel = null; save(); refreshUI(); updateHover();
  }
}
function onTap(e) {
  const t = tileFromEvent(e);
  if (sheet && mode === 'none') { closeSheet(); return; }
  if (mode === 'none') { const it = t && itemAt(t.i, t.j); if (it?.seats && cleanItem(it)) haptic(8); return; }
  if (mode === 'move') {
    const it = t && itemAt(t.i, t.j); if (!it) return;
    moving = { type: it.type, i: it.i, j: it.j, r: it.r };
    removeItem(it); buildRot = it.r; haptic(10);
    setMode('build', it.type); sel = { ...t }; updateHover();
    return;
  }
  if (e.pointerType === 'touch') {
    // aynı kareye iki kez dokunmak da onaylar
    const same = sel && t && sel.i === t.i && sel.j === t.j && lastTap && performance.now() - lastTap < 600;
    sel = t ? { ...t } : null; lastTap = performance.now();
    updateHover();
    if (same) confirmAt(sel);
  } else { sel = t ? { ...t } : null; confirmAt(t); }
}

$('abOk').onclick = () => confirmAt(target());
$('abRot').onclick = () => { buildRot = (buildRot + 1) % 4; haptic(6); updateHover(); };
$('abCancel').onclick = () => { const wasBuild = mode === 'build' && !moving; setMode('none'); if (wasBuild && IS_TOUCH) openSheet('build'); };

// ---- kamera: sürükle, iki parmakla / tekerlekle yakınlaştır ----
const cvs = renderer.domElement;
let drag = null, pinch = null;
const touches = new Map();
const touchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('pointerdown', e => {
  if (e.button === 2) { setMode('none'); return; }
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
  if (touches.size === 2) { pinch = { d: touchDist(), zoom: camera.zoom }; drag = null; return; }
  if (touches.size > 2) return;
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
});
cvs.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size === 2) { setZoom(pinch.zoom * touchDist() / pinch.d); return; }
  if (e.pointerType !== 'touch') lastPointer = e;
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
    if (drag.moved) { panBy(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; }
  }
  if (e.pointerType !== 'touch') updateHover();
});
function endPointer(e) {
  touches.delete(e.pointerId);
  if (touches.size < 2) pinch = null;
  const tap = e.type !== 'pointercancel' && drag && !drag.moved; drag = null;
  if (tap) onTap(e);
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; lastPointer = null; updateHover(); });
cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(camera.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); updateHover(); }, { passive: false });

export function initInput({ setSpeed, getSpeed }) {
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') { if (mode !== 'none') setMode('none'); else closeSheet(); }
    else if (e.key === 'r' || e.key === 'R') { buildRot = (buildRot + 1) % 4; updateHover(); }
    else if (e.key === 's' || e.key === 'S') setMode(mode === 'sell' ? 'none' : 'sell');
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'move' ? 'none' : 'move');
    else if (e.key === 'p' || e.key === 'P') takePhoto();
    else if (e.key === 'Enter' && mode !== 'none') confirmAt(target());
    else if (e.key === ' ') { e.preventDefault(); setSpeed(getSpeed() ? 0 : 1); }
    else if (/^[1-9]$/.test(e.key)) { const t = Object.keys(CATALOG)[+e.key - 1]; if (t) { closeSheet(); setMode(mode === 'build' && buildType === t ? 'none' : 'build', t); } }
  });
}
