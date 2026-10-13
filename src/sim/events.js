// Rastgele günlük olaylar (influencer, denetim, kesinti…) ve etkinlik müzisyeni
import { EVENTS, UD, VIPS, XP, TYPES } from '../config.js';
import { S, B } from '../state.js';
import { pick, rand, clamp, fmt } from '../utils.js';
import { isUnlocked, level, addXP } from './progress.js';
import { confetti } from '../ui/overlay.js';
import { coin } from '../audio.js';
import { note, toast } from '../ui/toast.js';
import { scene } from '../engine/scene.js';
import { makePerson } from '../engine/models.js';
import { allSeats, tileCenter, ownX0, ownX1, itemAt, bars, frontTile } from './grid.js';
import { spawnVisitor, addReview } from './people.js';
import { shopOpen, outageNow } from './economy.js';
import { statUp } from './achievements.js';

// sabah planı: akın saatleri ve VIP ziyareti
export function planDay() {
  S.rushPlan = isUnlocked('rush') ? [8.6, 12.4, 17.8].filter(() => Math.random() < .45) : [];
  S.vipAt = isUnlocked('vip') && Math.random() < .5 ? rand(10, 18) : null;
  S.rush = null;
}
export function rollEvent() {
  if (!isUnlocked('events') || Math.random() > .45) return null;
  const id = pick(Object.keys(EVENTS));
  const ev = { id, done: false };
  if (id === 'influencer') ev.hour = rand(10, 17.5);
  if (id === 'denetim') ev.hour = rand(9.5, 19);
  return ev;
}
export function updateEvents(h, dt) {
  updateRush(h, dt);
  if (S.vipAt && h >= S.vipAt && shopOpen()) {
    S.vipAt = null;
    const v = pick(VIPS);
    spawnVisitor(v.type, { special: 'vip', name: v.name, look: v.look });
    note(`⭐ VIP müşteri geliyor: ${v.name}! Siparişini hızlı hazırla, büyük bahşiş bırakır.`, 4500);
  }
  const ev = S.event;
  if (ev && !ev.done && ev.hour && h >= ev.hour && shopOpen()) {
    ev.done = true;
    if (ev.id === 'influencer') spawnVisitor('turist', { special: 'influencer', name: '@kahvegezgini', look: { shirt: 0xff7eb6, hair: 0xd9c08a, acc: 'camera', sunglasses: true } });
    if (ev.id === 'denetim') spawnVisitor('ofis', { special: 'inspector', name: 'Denetçi', look: { shirt: 0x4a4f57, hair: 0x2b1d14, acc: 'clipboard', pants: 0x2b2b2e } });
  }
  if (ev?.id === 'elektrik') {
    const on = outageNow(h);
    if (on && !ev.started) { ev.started = true; note('⚡ Elektrik kesildi! Makineler 15:30’a kadar çalışmıyor.'); }
    if (!on && ev.started && !ev.ended) { ev.ended = true; toast('💡 Elektrik geldi, makineler yeniden çalışıyor.'); }
  }
  updateMusician(h);
}
export function judgeInspection(p) {
  const dirty = allSeats(false).filter(x => x.s.dirty).length;
  if (dirty) {
    const fine = Math.min(2000, 400 * dirty);
    S.money -= fine; B().today.fines += fine;
    note(`🧾 Denetçi ${dirty} kirli yer buldu: ${fine.toLocaleString('tr-TR')} ₺ ceza!`); p.say('❌ Ceza', 2.5, 'warnb');
  } else {
    S.money += 500; B().today.gifts += 500; statUp('insp');
    addReview(5, 'Denetimden tam puanla geçti, tertemiz bir işletme.', 'Belediye', '🏛️');
    note('🧾 Denetimden tam puanla geçtin! Temiz işletme teşviki: +500 ₺'); p.say('✅ Tertemiz!', 2.5);
  }
}
export function onInfluencerReview(stars) {
  if (stars >= 4) {
    statUp('infl');
    for (let k = 0; k < 4; k++) addReview(5, 'Influencer paylaşımını görüp geldim, gerçekten harika!', 'Takipçi', '📱');
    S.buzz = Math.max(S.buzz, 3);
    note('📸 Influencer bayıldı ve paylaştı! 4 harika yorum, 3 gün boyunca cadde dolu.', 5000);
  } else if (stars <= 2) {
    for (let k = 0; k < 3; k++) addReview(1, 'Influencer’ın videosunu izledim, gitmeyin diyor.', 'Takipçi', '📱');
    note('📸 Influencer memnun kalmadı ve kötü paylaştı… 3 kötü yorum geldi.', 5000);
  } else note('📸 Influencer idare eder buldu, paylaşmadı.');
}

// akustik gecede dükkanda bir müzisyen çalar
let musician = null;
function updateMusician(h) {
  const p = S.pevent, on = p && p.id === 'akustik' && p.day === S.day && h >= 19 && h < 22;
  if (on && !musician) {
    const spot = freeSpot(); if (!spot) return;
    musician = makePerson({ acc: 'guitar', shirt: 0x2b2b2e, hair: 0x5a3a22 });
    musician.position.copy(tileCenter(spot.i, spot.j)); musician.rotation.y = 0.5; scene.add(musician);
  } else if (!on && musician) removeMusician();
  if (musician) musician.userData.body.rotation.z = Math.sin(performance.now() / 280) * .05;
}
export function removeMusician() { if (musician) { scene.remove(musician); musician = null; } }
function freeSpot() {
  const fronts = bars().map(frontTile);
  for (let j = 0; j < UD - 1; j++) for (let i = ownX1() - 1; i >= ownX0(); i--)
    if (!itemAt(i, j) && !fronts.some(f => f.i === i && f.j === j)) return { i, j };
  return null;
}

// ---- yoğun saat akını: kısa sürede çok müşteri gelir, hedefi tutturursan ödül ----
function updateRush(h, dt) {
  if (!S.rush && S.rushPlan?.length && h >= S.rushPlan[0] && shopOpen() && bars().some(b => b.barista)) {
    S.rushPlan.shift();
    const target = clamp(bars().filter(b => b.barista).length * 4 + 2, 5, 14);
    S.rush = { t: 60, target, base: S.daily?.m.served || 0, spawnLeft: target + 2, spawnT: 0, done: false };
    note(`🏃 ${h < 11 ? 'Sabah' : h < 15 ? 'Öğle' : 'Akşam'} akını! 60 saniyede ${target} servis yap. Bara dokunarak hızlandır!`, 4500);
  }
  const r = S.rush; if (!r || r.done) return;
  r.t -= dt;
  if (r.spawnLeft > 0 && (r.spawnT -= dt) <= 0) {
    r.spawnLeft--; r.spawnT = rand(.8, 1.8);
    spawnVisitor(pick(Object.keys(TYPES)), {});
  }
  const count = (S.daily?.m.served || 0) - r.base;
  if (count >= r.target || r.t <= 0) {
    r.done = true;
    if (count >= r.target) {
      const prize = 250 + level() * 100;
      S.money += prize; addXP(XP.rush); statUp('rush'); confetti(40); coin();
      note(`🏆 Akını başarıyla karşıladın! ${count}/${r.target} servis · +${fmt(prize)}`, 4500);
    } else note(`⌛ Akın bitti: ${count}/${r.target} servis. Bir dahakine daha çok bar ve barista!`, 4000);
    setTimeout(() => { if (S.rush === r) S.rush = null; }, 3000);
  }
}
export const rushInfo = () => S.rush && !S.rush.done ? { count: (S.daily?.m.served || 0) - S.rush.base, target: S.rush.target, t: Math.max(0, Math.ceil(S.rush.t)) } : null;
