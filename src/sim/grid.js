// Izgara: eşyalar, dükkan sınırları, teras satırı ve yol bulma
import { UW, UD, GW, DIRS, CATALOG, TERRACE_OK, WALL_DECOR, WEATHER } from '../config.js';
import { S, B, saveHooks } from '../state.js';
import { scene } from '../engine/scene.js';
import { cyl, MAT } from '../engine/assets.js';
import { makeModel } from '../engine/models.js';
import { bake, disposeBaked, Q } from '../engine/perf.js';
import { requestRender } from '../engine/scene.js';
import { V } from '../utils.js';
import { floatText } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { assignBaristas } from './staff.js';

export let items = [];
export let ownMinU = 1, ownMaxU = 1;
export function recomputeBounds() {
  const own = B().units.map((s, u) => s === 'own' ? u : -1).filter(u => u >= 0);
  ownMinU = Math.min(...own); ownMaxU = Math.max(...own);
}
export const ownX0 = () => ownMinU * UW, ownX1 = () => (ownMaxU + 1) * UW;
export const ownedCount = () => ownMaxU - ownMinU + 1;
export const ownedCountOf = b => b.units.filter(s => s === 'own').length;
// teras açıksa kaldırımın ilk satırı (j = UD) da dükkana dahil
export function inBounds(i, j) {
  if (i < ownX0() || i >= ownX1() || j < 0) return false;
  return j < UD || (j === UD && B().terrace);
}
export const isDoorCol = i => i >= ownX0() && i < ownX1() && (i - 3) % UW === 0;
export const isDoor = (i, j) => j === UD - 1 && isDoorCol(i);
export const doorOf = u => ({ i: u * UW + 3, j: UD - 1 });
export function ownedDoors() { const a = []; for (let u = ownMinU; u <= ownMaxU; u++) a.push(doorOf(u)); return a; }
export const itemAt = (i, j) => items.find(it => it.i === i && it.j === j);
export const tileCenter = (i, j) => V(i + 0.5, j + 0.5);
export function localToWorld(item, x, z) {
  const t = item.r * Math.PI / 2, c = Math.cos(t), s = Math.sin(t);
  return V(item.i + 0.5 + x * c + z * s, item.j + 0.5 - x * s + z * c);
}
export const frontTile = it => ({ i: it.i + DIRS[it.r][0], j: it.j + DIRS[it.r][1] });
export const bars = () => items.filter(it => it.type === 'bar');
export const hasItem = t => items.some(it => it.type === t);
export function atmosphere() {
  let a = items.reduce((s, it) => s + CATALOG[it.type].amb, 0);
  for (const k of Object.values(B().decor.slots)) if (WALL_DECOR[k]) a += WALL_DECOR[k].amb;
  return a;
}
export const atmPerUnit = () => atmosphere() / ownedCount();
// terastaki masalar yağışta kapalı; şemsiyeli masa yağmurda da açık
export function seatOpen(it) {
  if (it.j < UD) return true;
  const w = WEATHER[S.weather.today];
  return !w.precip || (it.type === 'umbrella' && w.precip === 'rain');
}
export function allSeats(onlyOpen = true) {
  return items.filter(it => it.seats && (!onlyOpen || seatOpen(it))).flatMap(it => it.seats.map(s => ({ it, s })));
}
// oturma eşyasının yanında durulacak kareler (teras içi ve dükkan içi birbirinden duvarla ayrı)
export function approachTiles(it, b = blockedGrid()) {
  return DIRS.map(([di, dj]) => ({ i: it.i + di, j: it.j + dj }))
    .filter(t => free(b, t.i, t.j) && (it.j === UD ? t.j === UD : t.j < UD));
}

export function addItem(data) {
  const it = { ...data, queue: [], cur: null, prog: 0, barista: null };
  it.mesh = makeModel(it.type);
  it.mesh.traverse(o => { if (o.isLight) o.visible = Q.lampLights; });
  bake(it.mesh);
  it.mesh.position.copy(tileCenter(it.i, it.j));
  it.mesh.rotation.y = it.r * Math.PI / 2;
  scene.add(it.mesh);
  requestRender();
  const def = CATALOG[it.type];
  if (def.seats) it.seats = def.seats.map(s => {
    const pos = localToWorld(it, s.x, s.z), f = localToWorld(it, s.fx, s.fz);
    return { pos, h: s.h, face: Math.atan2(f.x - pos.x, f.z - pos.z), cup: localToWorld(it, s.cx, s.cz), occ: null, dirty: false, cupMesh: null };
  });
  items.push(it);
  if (it.type === 'vitrin') refreshVitrin();
  return it;
}
function disposeItem(it) {
  scene.remove(it.mesh); disposeBaked(it.mesh); requestRender();
  if (it.tagEl) it.tagEl.remove();
  if (it.baristaMesh) scene.remove(it.baristaMesh);
  for (const s of it.seats || []) if (s.cupMesh) scene.remove(s.cupMesh);
}
export function removeItem(it) {
  items = items.filter(x => x !== it);
  disposeItem(it);
  if (it.seats) for (const s of it.seats) if (s.occ) s.occ.leaveShop();
  for (const c of [...it.queue]) c.rejoin();
  if (it.type === 'bar') assignBaristas();
}
export function loadItems() { clearItems(); for (const d of B().items) addItem(d); }
export function clearItems() { for (const it of items) disposeItem(it); items = []; }
saveHooks.push(() => { if (S.branches?.length) B().items = items.map(({ type, i, j, r }) => ({ type, i, j, r })); });

export function markDirty(it, s) {
  if (s.dirty || !items.includes(it)) return;
  s.dirty = true;
  s.cupMesh = cyl(0.03, 0.025, 0.06, MAT.white, s.cup.x, CATALOG[it.type].cupY, s.cup.z, 10);
  scene.add(s.cupMesh);
  if (!S.tipsShown.dirty) { S.tipsShown.dirty = true; toast('🧽 Masalar kirlendi! Kirli masaya tıklayarak topla ya da Personel’den komi işe al.', 5000); }
}
export function cleanItem(it) {
  let any = false;
  for (const s of it.seats || []) if (s.dirty) { s.dirty = false; scene.remove(s.cupMesh); s.cupMesh = null; any = true; }
  if (any) floatText('✨', tileCenter(it.i, it.j).setY(0.7));
  return any;
}
export function refreshVitrin() {
  for (const it of items) if (it.type === 'vitrin') it.mesh.userData.croissants.forEach((c, k) => c.visible = k < B().croissant);
}

// ---- yol bulma: 8 yönlü BFS, köşe kesmeden; teras ile iç arasında sadece kapı sütunundan geçilir ----
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export function blockedGrid(extra) {
  const g = Array.from({ length: UD + 1 }, () => new Array(GW).fill(false));
  for (const it of items) g[it.j][it.i] = true;
  if (extra) g[extra.j][extra.i] = true;
  return g;
}
export const free = (b, i, j) => inBounds(i, j) && !b[j][i];
function canStep(b, i, j, ni, nj) {
  if (!free(b, ni, nj)) return false;
  const cross = (j === UD - 1 && nj === UD) || (j === UD && nj === UD - 1);
  if (cross && (ni !== i || !isDoorCol(i))) return false;
  if (ni !== i && nj !== j) {
    if ((j === UD) !== (nj === UD)) return false;
    if (!free(b, ni, j) || !free(b, i, nj)) return false;
  }
  return true;
}
export function bfs(blocked, s, isGoal) {
  const key = (i, j) => j * GW + i, prev = new Map([[key(s.i, s.j), null]]), q = [[s.i, s.j]];
  while (q.length) {
    const [i, j] = q.shift();
    if (isGoal(i, j)) {
      const path = []; let k = key(i, j);
      while (prev.get(k)) { path.unshift({ i: k % GW, j: Math.floor(k / GW) }); k = key(...prev.get(k)); }
      return path;
    }
    for (const [di, dj] of N8) {
      const ni = i + di, nj = j + dj;
      if (!canStep(blocked, i, j, ni, nj)) continue;
      const k = key(ni, nj); if (prev.has(k)) continue;
      prev.set(k, [i, j]); q.push([ni, nj]);
    }
  }
  return null;
}
export function pathTiles(from, to) {
  const p = bfs(blockedGrid(), from, (i, j) => i === to.i && j === to.j);
  return p ? p.map(t => tileCenter(t.i, t.j)) : null;
}
export function placeProblem(type, i, j, r) {
  if (!inBounds(i, j)) return 'Dükkanın dışı';
  if (itemAt(i, j)) return 'Burada zaten bir eşya var';
  if (isDoor(i, j)) return 'Kapının önü boş kalmalı';
  if (j === UD && (!TERRACE_OK.includes(type) || isDoorCol(i))) return isDoorCol(i) ? 'Kapının önü boş kalmalı' : 'Bu eşya terasa konamaz';
  if (CATALOG[type].terraceOnly && j !== UD) return 'Şemsiyeli masa sadece terasa konur';
  const b = blockedGrid({ i, j }), doors = ownedDoors(), reach = new Set();
  bfs(b, doors[0], (ii, jj) => { reach.add(jj * GW + ii); return false; });
  const ok = (ti, tj) => free(b, ti, tj) && reach.has(tj * GW + ti);
  if (!doors.every(d => ok(d.i, d.j))) return 'Kapıya giden yol kapanıyor';
  for (const it of [...items, { type, i, j, r }]) {
    if (it.type === 'bar') { const f = frontTile(it); if (f.j >= UD || !ok(f.i, f.j)) return 'Barın önü (sıra yeri) boş ve ulaşılabilir olmalı'; }
    if (CATALOG[it.type].seats && !approachTiles(it, b).some(t => ok(t.i, t.j))) return 'Masaya ulaşılamıyor';
  }
  return null;
}
export const canPlace = (type, i, j, r) => !placeProblem(type, i, j, r);
