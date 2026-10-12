// Fare/dokunmatik/klavye: eşya yerleştirme, satma, taşıma, kamera kaydırma ve yakınlaştırma
import * as THREE from 'three';
import { UD, CATALOG } from '../config.js';
import { S, B, save } from '../state.js';
import { $, fmt } from '../utils.js';
import { renderer, scene, camera, IS_TOUCH, groundAt, panBy, setZoom } from '../engine/scene.js';
import { makeModel } from '../engine/models.js';
import { toast } from './toast.js';
import { floatText } from './overlay.js';
import { refreshUI } from './hud.js';
import { takePhoto } from './photo.js';
import { inBounds, itemAt, tileCenter, frontTile, addItem, removeItem, bars, placeProblem, ownX0, ownX1 } from '../sim/grid.js';
import { assignBaristas } from '../sim/staff.js';
import { spend } from '../sim/economy.js';
import { cleanItem } from '../sim/grid.js';

export let mode = 'none', buildType = null, buildRot = 0, moving = null;
let pendingTap = null, ghost = null, gridLines = null, hover = null, lastPointer = null;
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .55, depthWrite: false });
const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: .35, depthWrite: false }));
hl.rotation.x = -Math.PI / 2; hl.position.y = 0.012; hl.visible = false; scene.add(hl);
const frontHl = hl.clone(); frontHl.material = new THREE.MeshBasicMaterial({ color: 0x9be7c4, transparent: true, opacity: .4, depthWrite: false }); scene.add(frontHl);

function rebuildGrid() {
  if (gridLines) scene.remove(gridLines);
  const pts = [], x0 = ownX0(), x1 = ownX1(), d = B().terrace ? UD + 1 : UD;
  for (let i = x0; i <= x1; i++) pts.push(i, 0.008, 0, i, 0.008, d);
  for (let j = 0; j <= d; j++) pts.push(x0, 0.008, j, x1, 0.008, j);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gridLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5a4030, transparent: true, opacity: .25 }));
  gridLines.visible = mode !== 'none'; scene.add(gridLines);
}

export function setMode(m, type) {
  if (moving && !(m === 'build' && type === moving.type)) { addItem(moving); assignBaristas(); moving = null; }
  mode = m; buildType = m === 'build' ? type : null;
  pendingTap = null;
  rebuildGrid();
  if (ghost) { scene.remove(ghost); ghost = null; }
  if (m === 'build') {
    ghost = makeModel(type);
    ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } if (o.isLight) o.visible = false; });
    scene.add(ghost);
  }
  $('hint').style.display = m === 'none' ? 'none' : 'flex';
  $('hintRot').style.display = m === 'build' ? '' : 'none';
  $('hintText').textContent = IS_TOUCH
    ? (m === 'build' ? 'Dokun, sonra onayla' : m === 'sell' ? 'Seç, sonra onayla' : 'Eşyaya dokun')
    : (m === 'build' ? `Tıkla: yerleştir · R: döndür${type === 'bar' ? ' · açık yeşil kare: müşteri sırası' : ''}${B().terrace ? ' · teras: kaldırım satırı' : ''}`
      : m === 'sell' ? 'Satmak için eşyaya tıkla (%50 iade)' : 'Taşımak istediğin eşyaya tıkla');
  updateHover(); refreshUI();
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
  if (!hover || mode === 'none') return;
  hl.visible = true; hl.position.x = hover.i + 0.5; hl.position.z = hover.j + 0.5;
  if (mode === 'build') {
    const ok = !placeProblem(buildType, hover.i, hover.j, buildRot) && (moving || S.money >= CATALOG[buildType].price);
    const col = ok ? 0x2ecc71 : 0xe74c3c;
    hl.material.color.setHex(col); ghostMat.color.setHex(col);
    ghost.visible = true; ghost.position.copy(tileCenter(hover.i, hover.j)); ghost.rotation.y = buildRot * Math.PI / 2;
    if (buildType === 'bar') { const f = frontTile({ i: hover.i, j: hover.j, r: buildRot }); frontHl.visible = true; frontHl.position.set(f.i + .5, .012, f.j + .5); }
  } else hl.material.color.setHex(itemAt(hover.i, hover.j) ? (mode === 'sell' ? 0xe74c3c : 0x3498db) : 0x999999);
}
function onClick() {
  if (!hover) return;
  const it = itemAt(hover.i, hover.j);
  if (mode === 'build') {
    const def = CATALOG[buildType];
    if (!moving && S.money < def.price) return toast('Yeterli paran yok.');
    const prob = placeProblem(buildType, hover.i, hover.j, buildRot);
    if (prob) return toast('Buraya konamaz: ' + prob.toLowerCase());
    if (moving) { addItem({ type: buildType, i: hover.i, j: hover.j, r: buildRot }); moving = null; assignBaristas(); save(); setMode('move'); return; }
    spend(def.price);
    addItem({ type: buildType, i: hover.i, j: hover.j, r: buildRot });
    floatText('−' + fmt(def.price), tileCenter(hover.i, hover.j).setY(0.8), 'bad');
    if (buildType === 'bar') assignBaristas();
    save(); refreshUI(); updateHover();
    if (S.money < def.price) setMode('none');
  } else if (mode === 'sell' && it) {
    const refund = Math.floor(CATALOG[it.type].price * 0.5);
    removeItem(it); S.money += refund;
    floatText('+' + fmt(refund), tileCenter(it.i, it.j).setY(0.8));
    if (!bars().length) toast('⚠️ Espresso bar olmadan servis yapılamaz!');
    save(); refreshUI(); updateHover();
  } else if (mode === 'move' && it) {
    moving = { type: it.type, i: it.i, j: it.j, r: it.r };
    removeItem(it); buildRot = it.r;
    setMode('build', it.type);
  } else if (mode === 'none' && it && it.seats) cleanItem(it);
}

const cvs = renderer.domElement;
let drag = null, pinch = null;
const touches = new Map();
const touchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('pointerdown', e => {
  if (e.button === 2) { setMode('none'); return; }
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  cvs.setPointerCapture(e.pointerId);
  if (touches.size === 2) { pinch = { d: touchDist(), zoom: camera.zoom }; drag = null; return; }
  if (touches.size > 2) return;
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
});
cvs.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size === 2) { setZoom(pinch.zoom * touchDist() / pinch.d); return; }
  if (e.pointerType !== 'touch' || drag) lastPointer = e;
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (drag.moved) { panBy(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; }
  }
  updateHover();
});
function endPointer(e) {
  touches.delete(e.pointerId);
  if (touches.size < 2) pinch = null;
  if (e.type === 'pointercancel') { drag = null; return; }
  const tap = drag && !drag.moved; drag = null;
  if (!tap) return;
  lastPointer = e; updateHover();
  // dokunmatikte yanlışlıkla yerleştirme/satma olmasın: ilk dokunuş önizler, aynı kareye ikinci dokunuş onaylar
  if (e.pointerType === 'touch' && (mode === 'build' || mode === 'sell') && hover) {
    if (!pendingTap || pendingTap.i !== hover.i || pendingTap.j !== hover.j) { pendingTap = { ...hover }; return; }
    pendingTap = null;
  }
  onClick();
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; lastPointer = null; updateHover(); });
cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(camera.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); updateHover(); }, { passive: false });
$('hintRot').onclick = () => { buildRot = (buildRot + 1) % 4; updateHover(); };
$('hintCancel').onclick = () => setMode('none');

export function initInput({ setSpeed, getSpeed }) {
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') setMode('none');
    else if (e.key === 'r' || e.key === 'R') { buildRot = (buildRot + 1) % 4; updateHover(); }
    else if (e.key === 's' || e.key === 'S') setMode(mode === 'sell' ? 'none' : 'sell');
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'move' ? 'none' : 'move');
    else if (e.key === 'p' || e.key === 'P') takePhoto();
    else if (e.key === ' ') { e.preventDefault(); setSpeed(getSpeed() ? 0 : 1); }
    else if (/^[1-9]$/.test(e.key)) { const t = Object.keys(CATALOG)[+e.key - 1]; if (t) setMode(mode === 'build' && buildType === t ? 'none' : 'build', t); }
  });
}
