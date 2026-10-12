// Baristalar (sipariş, yorgunluk, mola), komiler ve aday üretimi
import { DRINKS, TYPES, NAMES, TRAITS, XP } from '../config.js';
import { S, B } from '../state.js';
import { scene } from '../engine/scene.js';
import { Mc, MAT } from '../engine/assets.js';
import { makePerson } from '../engine/models.js';
import { puff } from '../engine/fx.js';
import { pick, rand, clamp } from '../utils.js';
import { floatText, itemTag, flyCoin } from '../ui/overlay.js';
import { track, addXP } from './progress.js';
import { note } from '../ui/toast.js';
import { coin } from '../audio.js';
import { bars, items, localToWorld, tileCenter, ownedDoors, ownX0, ownX1, approachTiles, blockedGrid, pathTiles, cleanItem, hasItem, refreshVitrin } from './grid.js';
import { reflowQueue, chooseDrink, consume, evaluate, walkLegs } from './people.js';
import { fairPrice, effPrice, prepTime, staffCharm, outageNow, fairWage, beanStock } from './economy.js';
import { offerArt, closeArt } from '../ui/minigame.js';
import { warnOnce } from './day.js';

// ---- baristaları barlara yerleştir (moladakiler hariç) ----
export function assignBaristas() {
  const baristas = B().staff.filter(s => s.role === 'barista' && !(s.breakT > 0)).sort((a, b) => b.speed - a.speed);
  bars().forEach((bar, k) => {
    const b = baristas[k] || null;
    if (bar.barista !== b) {
      if (bar.baristaMesh) { scene.remove(bar.baristaMesh); bar.baristaMesh = null; }
      bar.barista = b;
      if (b) {
        const m = makePerson({ acc: 'apron', apron: b.owner ? MAT.apronOwner : MAT.apron, shirt: b.owner ? 0xf0efe9 : 0x2b2b2e, ...(b.look || {}) });
        m.position.copy(localToWorld(bar, 0, -0.3)); m.rotation.y = bar.r * Math.PI / 2;
        scene.add(m); bar.baristaMesh = m;
      }
      if (bar.cur) { const c = bar.cur; bar.cur = null; c.state = 'queued'; closeArt(bar); }
    }
  });
  for (const bar of bars()) if (!bar.barista) for (const c of [...bar.queue]) c.rejoin();
}

function startOrder(bar, c) {
  const T = TYPES[c.type];
  const id = chooseDrink(c);
  if (id === null) { c.leaveShop('🤷'); return; }
  if (id === 'nobeans') { B().today.angry++; c.leaveShop('❌ Kahve bitti', 'nostock'); warnOnce('beans', '⚠️ Çekirdek bitti! Stok panelinden hemen al.'); return; }
  const price = effPrice(id), ratio = price / fairPrice(id);
  if (c.special !== 'influencer' && Math.random() < Math.max(0, ratio - 1.15) * T.price * 1.6) { B().today.refused++; c.leaveShop('💸 Pahalı', 'refused'); return; }
  c.fresh = consume(id);
  bar.cur = c; bar.drinkId = id; bar.prog = 0; bar.need = prepTime(id, bar.barista);
  c.state = 'ordering'; c.drinkId = id; c.price = price; c.baristaName = bar.barista.owner ? 'patron' : bar.barista.name;
  // VIP: aynı içecekten birkaç tane ister, toplu hazırlanır
  if (c.special === 'vip') {
    const can = DRINKS[id].beans ? Math.floor(beanStock() / DRINKS[id].beans) + 1 : 9;   // ilk bardak zaten ayrıldı
    c.vipCount = Math.max(1, Math.min(c.vipCount || 2 + Math.floor(Math.random() * 2), can, DRINKS[id].milk ? B().milk + 1 : 9));
    for (let k = 1; k < c.vipCount; k++) consume(id);
    bar.need *= c.vipCount * 0.75; c.price = price * c.vipCount;
  }
  if (S.latteArt && DRINKS[id].milk) offerArt(bar, c);
}
function finishOrder(bar) {
  const c = bar.cur, b = bar.barista;
  closeArt(bar);
  bar.cur = null; bar.queue = bar.queue.filter(x => x !== c); c.bar = null; reflowQueue(bar);
  const T = TYPES[c.type];
  c.food = hasItem('vitrin') && B().croissant > 0 && Math.random() < (c.regular?.food ? .9 : T.food);
  if (c.food) { B().croissant--; refreshVitrin(); }
  evaluate(c, b);
  const tipMult = (c.art === 'perfect' ? 1.2 : 1) * (b.trait === 'guler' ? 1.2 : 1);
  const tip = Math.round(c.price * clamp((c.sat - 3.2) * .12, 0, .3) * staffCharm(b) * tipMult);
  const food = c.food ? S.foodPrice : 0;
  S.money += c.price + tip + food;
  const t = B().today;
  t.revenue += c.price; t.tips += tip; t.foodRev += food; t.served++; S.served++; B().served++;
  S.sales[c.drinkId] = (S.sales[c.drinkId] || 0) + 1;
  S.typeCounts[c.type] = (S.typeCounts[c.type] || 0) + 1;
  floatText('+' + (c.price + tip + food) + ' ₺' + (c.food ? ' 🥐' : ''), c.headPos());
  flyCoin(c.headPos());
  coin();
  track('served'); track('revenue', c.price + tip + food); addXP(XP.serve);
  if (c.food) track('food');
  if (c.special === 'vip') {
    const fast = c.f.vip > 0;
    if (fast) { addXP(XP.vip); S.money += Math.round(c.price * .5); B().today.tips += Math.round(c.price * .5); }
    note(fast ? `⭐ ${c.name} çok memnun kaldı! VIP bahşişi: +${Math.round(c.price * .5)} ₺` : `⭐ ${c.name} siparişini geç aldı, pek memnun değil.`, 4000);
  }
  b.fatigue = Math.min(100, b.fatigue + 1.4 * (b.trait === 'dayanikli' ? .6 : 1));
  c.state = 'served';
  c.afterServe();
}

export function updateBars(dt) {
  const outage = outageNow();
  // mola ve yorgunluk
  let changed = false;
  for (const s of B().staff) {
    if (s.role !== 'barista') continue;
    if (s.breakT > 0) { s.breakT -= dt; if (s.breakT <= 0) { s.breakT = 0; s.fatigue = 35; changed = true; } continue; }
    const busy = bars().some(b => b.barista === s && b.cur);
    s.fatigue = clamp(s.fatigue + (busy ? dt * .35 * (s.trait === 'dayanikli' ? .6 : 1) : -dt * 1.1), 0, 100);
    if (s.fatigue >= 92 && !busy) { s.breakT = 16; changed = true; floatText('☕ Mola', tileCenter(...barTileOf(s)).setY(1.1)); }
  }
  if (changed) assignBaristas();

  for (const bar of bars()) {
    if (!bar.barista) {
      const onBreak = B().staff.some(s => s.role === 'barista' && s.breakT > 0);
      itemTag(bar, onBreak ? '☕ Barista molada' : '👤 Barista yok', 'warnb');
      continue;
    }
    if (outage) { itemTag(bar, '⚡ Elektrik yok', 'warnb'); continue; }
    itemTag(bar, bar.barista.fatigue > 70 ? '😓 Yorgun' : '');
    if (!bar.cur) {
      const c = bar.queue[0];
      if (c && c.state === 'queued' && !c.path.length) startOrder(bar, c);
    }
    const body = bar.baristaMesh?.userData.body;
    if (bar.cur) {
      bar.prog += dt;
      if (body) body.rotation.y = Math.sin(bar.prog * 6) * .25;
      if (Math.random() < dt * 8) puff(localToWorld(bar, -0.18, 0.18).setY(0.7));
      if (bar.prog >= bar.need) finishOrder(bar);
    } else if (body) body.rotation.y *= .9;
  }
}
// oyuncu bara dokununca barista hızlanır (aktif oyun)
const lastHelp = new WeakMap();
export function helpBar(bar) {
  if (!bar?.cur || !bar.barista) return false;
  const now = performance.now(); if (now - (lastHelp.get(bar) || 0) < 90) return true;
  lastHelp.set(bar, now);
  bar.prog += 0.35;
  puff(localToWorld(bar, -0.18, 0.18).setY(0.75));
  floatText('⚡', localToWorld(bar, 0, 0).setY(1.0), 'star');
  track('taps');
  return true;
}
function barTileOf(s) { const bar = bars().find(b => b.barista === s) || bars()[0]; return bar ? [bar.i, bar.j] : [ownX0() + 1, 1]; }

// ---- komiler ----
export let workers = [];
class Worker {
  constructor(staff) {
    this.staff = staff;
    this.mesh = makePerson({ acc: 'apron', shirt: MAT.komi, apron: Mc(0x222222) });
    const d = ownedDoors()[0]; this.pos = tileCenter(d.i, d.j - 1);
    this.mesh.position.copy(this.pos); scene.add(this.mesh);
    this.path = []; this.state = 'idle'; this.cool = 1; this.t = 0;
  }
  tile() { return { i: clamp(Math.floor(this.pos.x), ownX0(), ownX1() - 1), j: clamp(Math.floor(this.pos.z), 0, B().terrace ? 6 : 5) }; }
  update(dt) {
    this.t += dt;
    if (this.path.length) {
      const target = this.path[0], dx = target.x - this.pos.x, dz = target.z - this.pos.z, dist = Math.hypot(dx, dz), step = 1.4 * this.staff.speed * dt;
      if (dist <= step) { this.pos.x = target.x; this.pos.z = target.z; this.path.shift(); } else { this.pos.x += dx / dist * step; this.pos.z += dz / dist * step; }
      if (dist > .001) this.mesh.rotation.y = Math.atan2(dx, dz);
      this.mesh.position.set(this.pos.x, Math.abs(Math.sin(this.t * 11)) * .018, this.pos.z);
      walkLegs(this.mesh, Math.sin(this.t * 11) * .55);
      if (!this.path.length && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); }
      return;
    }
    this.mesh.position.y = 0; walkLegs(this.mesh, 0);
    if (this.state === 'cleaning') {
      this.mesh.userData.body.rotation.y = Math.sin(this.t * 10) * .3;
      if ((this.timer -= dt) <= 0) {
        this.mesh.userData.body.rotation.y = 0;
        if (items.includes(this.target)) cleanItem(this.target);
        this.target.cleaner = null; this.target = null; this.state = 'idle'; this.cool = .5;
      }
    } else if (this.state === 'idle' && (this.cool -= dt) <= 0) {
      this.cool = 1;
      const b = blockedGrid();
      const dirty = items.filter(it => it.seats && it.seats.some(s => s.dirty) && !it.cleaner)
        .sort((a, c) => tileCenter(a.i, a.j).distanceTo(this.pos) - tileCenter(c.i, c.j).distanceTo(this.pos));
      for (const it of dirty) {
        let path = null;
        const a = approachTiles(it, b).find(t => (path = pathTiles(this.tile(), t)));
        if (!a) continue;
        it.cleaner = this; this.target = it; this.state = 'walking'; this.path = path;
        this.onArrive = () => {
          this.state = 'cleaning'; this.timer = 1.4 / this.staff.speed / (this.staff.trait === 'titiz' ? 2 : 1);
          const c = tileCenter(it.i, it.j); this.mesh.rotation.y = Math.atan2(c.x - this.pos.x, c.z - this.pos.z);
        };
        if (!this.path.length) { const f = this.onArrive; this.onArrive = null; f(); }
        break;
      }
    }
  }
  remove() { scene.remove(this.mesh); if (this.target) this.target.cleaner = null; }
}
export function syncWorkers() {
  const komis = B().staff.filter(s => s.role === 'komi');
  for (const w of workers) if (!komis.includes(w.staff)) w.remove();
  workers = workers.filter(w => komis.includes(w.staff));
  for (const s of komis) if (!workers.some(w => w.staff === s)) workers.push(new Worker(s));
}
export function despawnWorkers() { for (const w of workers) w.remove(); workers = []; }

// ---- adaylar ----
export function genCandidates(b = B()) {
  b.candidates = Array.from({ length: 3 }, () => {
    const role = Math.random() < .7 ? 'barista' : 'komi';
    const traits = Object.entries(TRAITS).filter(([, t]) => t.role === role || t.role === 'any').map(([k]) => k);
    const c = { id: S.nextId++, name: pick(NAMES), role, speed: +rand(.8, 1.35).toFixed(2), charm: +rand(.75, 1.4).toFixed(2), lvl: 1,
      fatigue: 0, morale: 70, trait: Math.random() < .6 ? pick(traits) : null };
    c.wage = fairWage(c);
    return c;
  });
}
