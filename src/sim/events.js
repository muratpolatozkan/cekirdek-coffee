// Rastgele günlük olaylar (influencer, denetim, kesinti…) ve etkinlik müzisyeni
import { EVENTS, UD } from '../config.js';
import { S, B } from '../state.js';
import { pick, rand } from '../utils.js';
import { note, toast } from '../ui/toast.js';
import { scene } from '../engine/scene.js';
import { makePerson } from '../engine/models.js';
import { allSeats, tileCenter, ownX0, ownX1, itemAt, bars, frontTile } from './grid.js';
import { spawnVisitor, addReview } from './people.js';
import { shopOpen, outageNow } from './economy.js';

export function rollEvent() {
  if (S.day < 3 || Math.random() > .45) return null;
  const id = pick(Object.keys(EVENTS));
  const ev = { id, done: false };
  if (id === 'influencer') ev.hour = rand(10, 17.5);
  if (id === 'denetim') ev.hour = rand(9.5, 19);
  return ev;
}
export function updateEvents(h) {
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
    S.money += 500; B().today.gifts += 500;
    addReview(5, 'Denetimden tam puanla geçti, tertemiz bir işletme.', 'Belediye', '🏛️');
    note('🧾 Denetimden tam puanla geçtin! Temiz işletme teşviki: +500 ₺'); p.say('✅ Tertemiz!', 2.5);
  }
}
export function onInfluencerReview(stars) {
  if (stars >= 4) {
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
