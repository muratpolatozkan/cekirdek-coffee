// İnsanlar: caddeden geçen yayalar, müşteriler, müdavimler ve özel ziyaretçiler
import { UD, SIDEWALK_Z, FAR_Z, STREET_X0, STREET_X1, MIN_PER_SEC, MAX_QUEUE, MAX_INSIDE, DRINKS, TYPES, NAMES, TXT, BEANS } from '../config.js';
import { S, B } from '../state.js';
import { scene } from '../engine/scene.js';
import { cyl, box, Mc, MAT } from '../engine/assets.js';
import { makePerson, sitPose, standPose } from '../engine/models.js';
import { V, rand, pick, clamp, weightedPick, starStr } from '../utils.js';
import { overlay, floatText, placeEl } from '../ui/overlay.js';
import { chime } from '../audio.js';
import { tileCenter, frontTile, bars, isDoor, inBounds, ownedDoors, ownX0, ownX1, ownedCount, allSeats, approachTiles,
  markDirty, blockedGrid, bfs, pathTiles, atmPerUnit, hasItem } from './grid.js';
import { rating, beanQ, beanStock, fairPrice, priceAppeal, passMult, typeMult, weatherNow, season, peventNow, staffCharm, shopOpen } from './economy.js';
import { rivalFactor, rivalOpen, rivalDoorX } from './rival.js';
import { onRegularServed, onRegularLeft } from './regulars.js';
import { judgeInspection, onInfluencerReview } from './events.js';

export let people = [];
export const insideCount = () => people.filter(p => p.kind === 'customer').length;

export class Person {
  constructor(side, dir, type, opts = {}) {
    this.side = side; this.dir = dir; this.type = type; this.kind = 'passer';
    this.regular = opts.regular || null; this.special = opts.special || null;
    const T = TYPES[type];
    const look = opts.look || { acc: T.look.acc, hair: T.look.hair && Math.random() < .8 ? T.look.hair : undefined, shirt: T.look.shirt && Math.random() < .6 ? T.look.shirt : undefined };
    this.mesh = makePerson(look);
    this.lane = side === 'near' ? SIDEWALK_Z + rand(-.12, .12) : FAR_Z + rand(-.35, .35);
    this.pos = V(dir > 0 ? STREET_X0 : STREET_X1, this.lane);
    this.mesh.position.copy(this.pos); scene.add(this.mesh);
    this.speed = rand(1.05, 1.45); this.path = []; this.onArrive = null; this.state = 'walk';
    this.t = Math.random() * 10; this.wait = 0; this.waitTotal = 0;
    this.bubble = null; this.bubbleKey = ''; this.sayT = 0;
    this.name = opts.name || pick(NAMES); this.f = {};
    people.push(this);
  }
  tile() { return { i: clamp(Math.floor(this.pos.x), ownX0(), ownX1() - 1), j: clamp(Math.floor(this.pos.z), 0, B().terrace ? UD : UD - 1) }; }
  go(points, onArrive) { this.path = points; this.onArrive = onArrive; }
  walkOn() { this.state = 'walk'; this.kind = 'passer'; this.go([V(this.dir > 0 ? STREET_X1 : STREET_X0, this.lane)], () => this.despawn()); }
  despawn() { scene.remove(this.mesh); if (this.bubble) this.bubble.remove(); people = people.filter(p => p !== this); }
  say(html, dur = 2, cls = '') { this.setBubble(html, cls); this.sayT = dur; }
  setBubble(html, cls = '') {
    if (this.bubbleKey === html + cls) return;
    this.bubbleKey = html + cls;
    if (!html) { if (this.bubble) this.bubble.style.display = 'none'; return; }
    if (!this.bubble) { this.bubble = document.createElement('div'); overlay.appendChild(this.bubble); }
    this.bubble.className = 'bubble ' + cls; this.bubble.innerHTML = html; this.bubble.style.display = 'block';
    this.progEl = this.bubble.querySelector('.bar i');
  }
  headPos() { return V(this.pos.x, this.pos.z).setY(0.95); }
  placeBubble() { if (this.bubble && this.bubble.style.display !== 'none') placeEl(this.bubble, this.headPos()); }

  tryEnter(door) {
    if (!shopOpen() || insideCount() >= MAX_INSIDE) return this.walkOn();
    const entry = [V(door.i + .5, UD + .3), tileCenter(door.i, door.j)];
    if (this.special === 'inspector') {
      this.kind = 'customer'; this.door = door; this.reviewed = true; chime();
      const p = bfs(blockedGrid(), door, (i, j) => j <= 2) || [];
      this.state = 'inspect'; this.say('🧾 Belediye denetimi', 3, 'warnb');
      this.go([...entry, ...p.map(t => tileCenter(t.i, t.j))], () => { this.state = 'inspecting'; this.inspectT = 3.5; });
      return;
    }
    const bar = pickBar();
    if (!bar) {
      B().today.turned++; this.say('😕 Sıra çok uzun');
      if (this.regular) onRegularLeft(this, 'turned');
      return this.walkOn();
    }
    this.kind = 'customer'; this.door = door; chime();
    if (this.regular) this.say(`${this.regular.emoji} ${this.regular.name}`, 2.4, 'name');
    if (this.special === 'influencer') this.say('📸 @kahvegezgini', 3, 'vip');
    this.joinQueue(bar, door, entry);
  }
  joinQueue(bar, fromTile, prefix = []) {
    this.bar = bar; bar.queue.push(this); this.state = 'toQueue';
    const tiles = pathTiles(fromTile, frontTile(bar)) || [];
    this.go([...prefix, ...tiles, queueSpot(bar, bar.queue.length - 1)], () => { this.state = 'queued'; });
  }
  rejoin() {
    const old = this.bar;
    if (old) { old.queue = old.queue.filter(c => c !== this); if (old.cur === this) old.cur = null; reflowQueue(old); }
    this.bar = null;
    const b = pickBar();
    if (b) this.joinQueue(b, this.tile()); else this.leaveShop('😕');
  }
  takeaway() { if (this.cup) this.cup.material = MAT.kraft; }
  afterServe() {
    const T = TYPES[this.type], W = weatherNow();
    this.cup = cyl(0.03, 0.025, 0.07, MAT.white, 0.12, 0.38, 0.08, 10); this.cup.castShadow = false;
    this.mesh.userData.body.add(this.cup);
    if (this.regular) onRegularServed(this);
    const seats = allSeats();
    if (seats.length && seats.filter(x => x.s.dirty).length / seats.length > 0.3) addFactor(this, 'dirty', -0.35);
    const freeSeats = seats.filter(x => !x.s.occ && !x.s.dirty);
    const sitP = Math.min(.97, T.sit + W.sit + (peventNow()?.sit || 0) + (this.regular ? .1 : 0));
    if (Math.random() < sitP) {
      let choice = null;
      if (freeSeats.length) {
        const terr = freeSeats.filter(x => x.it.j === UD);
        choice = terr.length && !W.precip && Math.random() < .6 ? pick(terr) : pick(freeSeats);
      }
      if (choice && this.goSit(choice)) {
        if (choice.it.j === UD && !W.precip) addFactor(this, 'terrace', .2);
        else if (W.precip && choice.it.j < UD) addFactor(this, 'cozy', .15);
        return;
      }
      addFactor(this, 'seat', -0.5);
    }
    this.takeaway(); this.leaveShop();
  }
  goSit({ it, s }) {
    const approaches = approachTiles(it).sort((a, c) => tileCenter(a.i, a.j).distanceTo(s.pos) - tileCenter(c.i, c.j).distanceTo(s.pos));
    for (const a of approaches) {
      const tiles = pathTiles(this.tile(), a);
      if (!tiles) continue;
      s.occ = this; this.seat = s; this.seatItem = it; this.approach = a; this.state = 'toSeat';
      this.go([...tiles, s.pos.clone()], () => {
        const T = TYPES[this.type];
        this.state = 'sitting'; this.sitT = rand(...T.sitDur) * weatherNow().dur * (peventNow()?.sit ? 1.25 : 1);
        this.mesh.rotation.y = s.face; sitPose(this.mesh, s.h);
        if (this.type === 'ogrenci' && Math.random() < .7) { this.laptop = box(0.18, 0.012, 0.13, Mc(0x9aa0a6), 0, 0.03, 0.12); this.mesh.userData.legs.add(this.laptop); this.laptop.rotation.x = Math.PI / 2; }
      });
      return true;
    }
    return false;
  }
  leaveShop(emoji, reviewKind) {
    if (this.kind !== 'customer' || this.state === 'leaving') return;
    if (emoji) this.say(emoji, 2.5);
    if (this.bar) {
      const bar = this.bar; this.bar = null;
      if (bar.cur === this) bar.cur = null;
      bar.queue = bar.queue.filter(c => c !== this); reflowQueue(bar);
    }
    const pts = [];
    const fromTerrace = this.seatItem && this.seatItem.j === UD;
    if (this.seat) {
      markDirty(this.seatItem, this.seat);
      this.seat.occ = null; this.seat = null; standPose(this.mesh);
      if (this.laptop) { this.laptop.removeFromParent(); this.laptop = null; }
      pts.push(tileCenter(this.approach.i, this.approach.j));
    }
    if (fromTerrace) pts.push(V(this.approach.i + .5, SIDEWALK_Z + rand(-.1, .1)));
    else {
      const from = this.approach || this.tile();
      const path = bfs(blockedGrid(), from, isDoor);
      let door = this.door;
      if (path) { pts.push(...path.map(t => tileCenter(t.i, t.j))); const last = path.length ? path[path.length - 1] : from; if (isDoor(last.i, last.j)) door = last; }
      if (!door || !inBounds(door.i, door.j)) door = ownedDoors()[0];
      pts.push(V(door.i + .5, UD + .3), V(door.i + .5, SIDEWALK_Z + rand(-.1, .1)));
    }
    this.approach = null; this.seatItem = null;
    this.publishReview(reviewKind);
    this.state = 'leaving';
    this.go(pts, () => { this.lane = this.pos.z; this.dir = Math.random() < .5 ? 1 : -1; this.walkOn(); });
  }
  publishReview(kind) {
    if (this.reviewed) return; this.reviewed = true;
    const T = TYPES[this.type], vip = this.special === 'influencer';
    let stars, text;
    if (kind === 'angry') { if (!vip && Math.random() > .5) return; stars = Math.random() < .6 ? 1 : 2; text = pick(TXT.angry); }
    else if (kind === 'nostock') { if (!vip && Math.random() > .6) return; stars = 1; text = pick(TXT.nostock); }
    else if (kind === 'refused') { if (!vip && Math.random() > .3) return; stars = 2; text = pick(TXT.refused); }
    else if (kind === 'outage') { if (Math.random() > .3) return; stars = 2; text = pick(TXT.outage); }
    else if (this.sat != null) {
      stars = clamp(Math.round(this.sat), 1, 5);
      B().today.sats.push(clamp(this.sat, 1, 5));
      const chance = T.review + (peventNow()?.review || 0);
      if (!vip && Math.random() > chance) return;
      text = reviewText(this, stars);
    } else return;
    const who = vip ? '@kahvegezgini · influencer' : this.regular ? `${this.regular.name} · müdavim` : `${this.name} · ${T.name}`;
    addReview(stars, text, who, vip ? '📸' : this.regular ? this.regular.emoji : T.icon);
    floatText(starStr(stars), this.headPos().setY(1.15), 'star');
    if (vip) onInfluencerReview(stars);
  }
  update(dt) {
    this.t += dt;
    if (this.path.length) {
      const target = this.path[0];
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z, dist = Math.hypot(dx, dz), step = this.speed * dt;
      if (dist <= step) { this.pos.x = target.x; this.pos.z = target.z; this.path.shift(); }
      else { this.pos.x += dx / dist * step; this.pos.z += dz / dist * step; }
      if (dist > 0.001) this.mesh.rotation.y = Math.atan2(dx, dz);
      this.mesh.position.set(this.pos.x, Math.abs(Math.sin(this.t * 11)) * 0.03, this.pos.z);
      if (!this.path.length && this.onArrive) { const f = this.onArrive; this.onArrive = null; f(); }
    } else this.mesh.position.y = 0;

    if (this.kind !== 'customer') { if (this.sayT > 0 && (this.sayT -= dt) <= 0) this.setBubble(''); return; }
    const T = TYPES[this.type];
    if (this.state === 'inspecting') {
      this.mesh.rotation.y += dt * 1.5;
      if ((this.inspectT -= dt) <= 0) { judgeInspection(this); this.leaveShop(); }
    }
    if (this.state === 'toQueue' || this.state === 'queued') {
      this.wait += dt;
      if (this.state === 'queued') this.waitTotal += dt;
      if (this.wait > T.patience * (this.regular ? 1.3 : 1)) {
        B().today.angry++;
        if (this.regular) onRegularLeft(this, 'angry');
        this.leaveShop('😠', 'angry');
      }
    } else if (this.state === 'ordering') this.waitTotal += dt;
    if (this.state === 'sitting' && (this.sitT -= dt) <= 0) this.leaveShop(this.sat >= 4.2 ? '😊' : '');

    if (this.sayT > 0) { if ((this.sayT -= dt) <= 0) this.setBubble(''); }
    else if (this.state === 'ordering' && this.bar) {
      const d = DRINKS[this.bar.drinkId];
      this.setBubble(`${d.icon} ${d.name}${this.art ? ' 🎨' : ''}<div class="bar"><i></i></div>`);
      if (this.progEl) this.progEl.style.width = Math.min(100, this.bar.prog / this.bar.need * 100) + '%';
    } else if (this.state === 'queued' && this.wait > T.patience * .6) this.setBubble('⏰');
    else this.setBubble('');
  }
}

export function addReview(stars, text, who, icon, b = B()) {
  b.reviews.unshift({ stars, text, who, icon, day: S.day });
  if (b.reviews.length > 80) b.reviews.length = 80;
}
export function queueSpot(bar, k) {
  const f = frontTile(bar), d = [frontTile(bar).i - bar.i, frontTile(bar).j - bar.j];
  const p = tileCenter(f.i, f.j).add(V(d[0], d[1]).multiplyScalar(k * 0.42 - 0.12));
  p.x = clamp(p.x, ownX0() + .2, ownX1() - .2); p.z = clamp(p.z, .2, UD - .2);
  return p;
}
export function reflowQueue(bar) {
  bar.queue.forEach((c, k) => {
    const spot = queueSpot(bar, k);
    if (c.state === 'queued') c.go([spot], null);
    else if (c.state === 'toQueue' && c.path.length) c.path[c.path.length - 1] = spot;
  });
}
export const pickBar = () => bars().filter(b => b.barista && b.queue.length < MAX_QUEUE).sort((a, b) => a.queue.length - b.queue.length)[0];

// ---- sipariş seçimi ve memnuniyet ----
export function drinkWeights(type) {
  const T = TYPES[type], w = {}, tmp = weatherNow().temp, se = season().id;
  for (const [id, d] of Object.entries(DRINKS)) {
    let v = d.sig ? (S.menu[id].on ? (d.likes?.[type] || 0.3) * 0.8 : 0) : (T.drinks[id] || 0);
    if (!v) continue;
    if (tmp > 0) v *= d.temp === 'cold' ? 1 + tmp * 1.5 : 1 - tmp * .2;
    if (tmp < 0) v *= d.temp === 'cold' ? Math.max(.15, 1 + tmp * .5) : 1 - tmp * .25;
    if (d.season) v *= d.season === se ? 2.2 : .6;
    w[id] = v;
  }
  return w;
}
export function chooseDrink(c) {
  const w = drinkWeights(c.type);
  const want = c.regular && S.menu[c.regular.fav] && Math.random() < .85 ? c.regular.fav : weightedPick(w);
  const avail = id => S.menu[id].on && B().milk >= DRINKS[id].milk;
  let id = want;
  if (!avail(id)) {
    if (!S.menu[id].on) { c.missed = DRINKS[want].name; if (c.regular) c.missedFav = true; } else c.noMilk = true;
    const opts = Object.keys(w).filter(avail);
    if (!opts.length) return null;
    id = weightedPick(Object.fromEntries(opts.map(o => [o, w[o]])));
  }
  return beanStock() < DRINKS[id].beans ? 'nobeans' : id;
}
export function consume(id) {
  const b = B().beans[B().activeBean]; let need = DRINKS[id].beans, fresh = false;
  const fromH = Math.min(b.h, need); b.h -= fromH; need -= fromH; if (fromH) fresh = true;
  b.r -= need; B().milk -= DRINKS[id].milk;
  return fresh;
}
const ROAST_ORDER = { acik: 0, orta: 1, koyu: 2 };
export function evaluate(c, barista) {
  const T = TYPES[c.type], f = c.f = {}, d = DRINKS[c.drinkId];
  if (d.beans) f.quality = (BEANS[B().activeBean].q + (c.fresh ? .4 : 0) - 3) * .45 * T.qual;
  f.atm = Math.min(.7, (atmPerUnit() + (peventNow()?.atm || 0)) * .045);
  f.charm = (staffCharm(barista) - 1) * .8;
  const waitMin = c.waitTotal * MIN_PER_SEC; c.waitMin = Math.round(waitMin);
  f.wait = waitMin < 8 ? .25 : -Math.min(1.6, Math.max(0, waitMin - 15) * .07);
  const ratio = c.price / fairPrice(c.drinkId);
  f.price = ratio > 1.02 ? -(ratio - 1) * 2.4 * T.price : ratio < .92 ? .3 * T.price : 0;
  if (c.missed) f.missing = c.type === 'tutkun' ? -.55 : -.3;
  if (c.noMilk) f.milk = -.3;
  if (c.food) f.food = .2;
  if (d.sig) f.taste = .3 - .3 * Math.abs(S.menu[c.drinkId].sweet - T.sweet);
  if (c.fresh) { const diff = Math.abs(ROAST_ORDER[B().roast] - ROAST_ORDER[T.roast]); f.roast = diff === 0 ? .3 : diff === 2 ? -.15 : 0; }
  if (c.art) f.art = { perfect: .5, good: .25, bad: -.1 }[c.art];
  const E = peventNow(); if (E && (E.types?.[c.type] || E.atm)) f.pevent = .2;
  c.sat = 3.5 + Object.values(f).reduce((a, b) => a + b, 0) + rand(-.35, .35);
}
export function addFactor(c, k, v) { c.f[k] = (c.f[k] || 0) + v; if (c.sat != null) c.sat += v; }
function reviewText(c, stars) {
  const fill = s => s.replace('{b}', c.baristaName || 'barista').replace('{m}', c.waitMin).replace('{d}', DRINKS[c.drinkId]?.name || 'kahve')
    .replace('{p}', (c.price || 0) + ' ₺').replace('{want}', c.missed || 'istediğim içecek');
  const ent = Object.entries(c.f);
  const pos = ent.filter(([k, v]) => v > .12 && TXT[k]?.pos?.length).sort((a, b) => b[1] - a[1]);
  const neg = ent.filter(([k, v]) => v < -.12 && TXT[k]?.neg?.length).sort((a, b) => a[1] - b[1]);
  const parts = [];
  if (stars >= 3 && pos.length) parts.push(fill(pick(TXT[pos[0][0]].pos)));
  if (neg.length) parts.push((parts.length ? 'Ama ' : '') + fill(pick(TXT[neg[0][0]].neg)).replace(/^./, ch => parts.length ? ch.toLowerCase() : ch));
  if (!parts.length) parts.push(stars >= 4 ? 'Güzel bir kahve molasıydı.' : stars >= 3 ? 'Fena değil, idare eder.' : 'Beklediğim gibi değildi.');
  return parts.join(' ');
}

// ---- yayaların doğması ----
function typeWeights(h) {
  const m = typeMult(h);
  const w = {
    ofis: h < 10 ? 5 : (h >= 12 && h < 14) ? 3 : (h >= 17 && h < 19) ? 2.5 : .6,
    ogrenci: h < 10 ? .6 : h < 12 ? 1.5 : 2.5,
    tutkun: .6 + Math.max(0, beanQ() - 2.5) * .6,
    emekli: (h >= 9 && h < 17) ? 1.8 : .4,
    turist: (h >= 10 && h < 20) ? .3 + Math.max(0, rating() - 3.8) * 2.5 : .1,
  };
  for (const k in w) w[k] *= m[k] ?? 1;
  return w;
}
export function enterChance(type) {
  let p = .3 * Math.max(.35, Math.pow(rating() / 3.5, 2.2));
  p *= 1 + Math.min(.6, atmPerUnit() * .04);
  p *= 1 + .2 * S.ads;
  p *= priceAppeal();
  p *= 1 + .2 * (ownedCount() - 1);
  p *= rivalFactor();
  p *= peventNow()?.enter || 1;
  if (type === 'tutkun') p *= .5 + Math.max(0, beanQ() - 2.5) * .45;
  return Math.min(.85, p);
}
export function passerRate(h) {
  const base = h < 7.5 ? .15 : h < 10 ? .7 : h < 12 ? .4 : h < 14 ? .65 : h < 17 ? .4 : h < 19 ? .6 : h < 22 ? .35 : .12;
  return base * passMult(h);
}
export function spawnPasser(h) {
  if (people.length >= 85) return;
  const near = Math.random() < .6, dir = Math.random() < .5 ? 1 : -1;
  const type = weightedPick(typeWeights(h));
  const p = new Person(near ? 'near' : 'far', dir, type);
  if (near && S.phase === 'open' && Math.random() < enterChance(type)) {
    const door = pick(ownedDoors());
    p.go([V(door.i + .5, p.lane)], () => p.tryEnter(door));
  } else if (near && rivalOpen() && Math.random() < .12) {
    const x = rivalDoorX();
    p.go([V(x, p.lane), V(x, UD + .25)], () => p.despawn());
  } else p.walkOn();
}
// müdavim, influencer, denetçi gibi kesin içeri girecek kişiler
export function spawnVisitor(type, opts = {}) {
  const dir = Math.random() < .5 ? 1 : -1;
  const p = new Person('near', dir, type, opts);
  const doors = ownedDoors();
  const door = doors.reduce((a, d) => Math.abs(d.i - p.pos.x) < Math.abs(a.i - p.pos.x) ? d : a, doors[0]);
  p.speed = rand(1.4, 1.7);
  p.go([V(door.i + .5, p.lane)], () => p.tryEnter(door));
  return p;
}
export function despawnAll() { for (const p of people) { scene.remove(p.mesh); if (p.bubble) p.bubble.remove(); } people = []; }
