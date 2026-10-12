// Hedefler (kalıcı) ve mahalle görevleri (süreli istekler)
import { QUESTS, NEIGHBORS, HOODS, NU } from '../config.js';
import { S, B } from '../state.js';
import { pick, avg, fmt } from '../utils.js';
import { note, toast } from '../ui/toast.js';
import { coin } from '../audio.js';
import { rating, beanStock, beanPrice } from './economy.js';
import { hasItem, ownedCount, refreshVitrin } from './grid.js';
import { addReview } from './people.js';

const dayIncome = () => { const t = B().today; return t.revenue + t.foodRev + t.tips; };
export const GOALS = [
  { id: 's20', text: '20 müşteriye servis yap', reward: 300, check: () => S.served >= 20 },
  { id: 'hire', text: 'İlk personelini işe al', reward: 500, check: () => S.branches.some(b => b.staff.length > 1) },
  { id: 'latte', text: "Latte'yi menüye ekle", reward: 300, check: () => S.menu.latte.on },
  { id: 'r40', text: '⭐ 4.0 puana ulaş', reward: 800, check: () => B().reviews.length >= 10 && rating() >= 4 },
  { id: 'expand', text: 'Yan dükkanı kirala', reward: 1000, check: () => ownedCount() >= 2 },
  { id: 'regular', text: 'Bir müdavimin sadakatini 80’e çıkar', reward: 800, check: () => B().regulars.some(r => r.loyalty >= 80) },
  { id: 'd4000', text: 'Bir günde 4.000 ₺ ciro yap', reward: 1000, check: () => dayIncome() >= 4000 },
  { id: 'art5', text: '5 mükemmel latte art yap', reward: 600, check: () => S.perfectArts >= 5 },
  { id: 'sig', text: 'Menüye bir imza tarif ekle', reward: 800, check: () => Object.entries(S.menu).some(([id, m]) => m.on && ['turk', 'tahinli', 'findikli', 'lokumlu', 'salep'].includes(id)) },
  { id: 'event', text: 'Bir etkinlik düzenle', reward: 500, check: () => S.eventsHeld >= 1 },
  { id: 'terrace', text: 'Teras aç', reward: 800, check: () => B().terrace },
  { id: 'vitrin', text: 'Pasta vitrini koy', reward: 500, check: () => hasItem('vitrin') },
  { id: 'roast', text: 'Kavurma makinesi al', reward: 1500, check: () => hasItem('roaster') },
  { id: 'v60', text: "V60'ı menüye ekle", reward: 1000, check: () => S.menu.v60.on },
  { id: 'rival', text: 'Rakip kahveciyi kapattır', reward: 3000, check: () => S.branches.some(b => b.rival.closed) },
  { id: 'r45', text: '⭐ 4.5 puana ulaş', reward: 2000, check: () => B().reviews.length >= 30 && rating() >= 4.5 },
  { id: 'all', text: 'Bütün caddeyi kirala', reward: 5000, check: () => ownedCount() === NU },
  { id: 'branch', text: 'İkinci şubeyi aç', reward: 5000, check: () => S.branches.length >= 2 },
  { id: 's2000', text: '2.000 servis', reward: 5000, check: () => S.served >= 2000 },
  { id: 'd15000', text: 'Bir günde 15.000 ₺ ciro yap', reward: 5000, check: () => dayIncome() >= 15000 },
];
export function checkGoals() {
  for (const g of GOALS) if (!S.goalsDone.includes(g.id) && g.check()) {
    S.goalsDone.push(g.id); S.money += g.reward; coin();
    note(`🎯 Hedef tamamlandı: ${g.text} (+${fmt(g.reward)})`, 4000);
  }
}

// ---- mahalle görevleri ----
export function neighborName(b = B()) {
  const u = b.units.findIndex(s => s === 'occupied');
  return u >= 0 ? NEIGHBORS[HOODS[b.hood].units[u].kind].name : null;
}
export function offerQuest(b = B()) {
  if (b.quests.length >= 2) return;
  const nb = neighborName(b);
  const pool = QUESTS.filter(q => !b.quests.some(x => x.id === q.id) && (!q.neighbor || nb) && (!q.requires || hasItem(q.requires)));
  if (!pool.length) return;
  const t = pick(pool);
  const q = { id: t.id, icon: t.icon, from: t.neighbor ? nb : t.from, text: t.text(nb), need: t.need, reward: t.reward, auto: !!t.auto, expires: S.day + t.days - 1 };
  b.quests.push(q);
  note(`📬 Yeni mahalle isteği: ${q.from}. Mahalle panelinden bakabilirsin.`);
}
const tpl = q => QUESTS.find(t => t.id === q.id);
export function questProblem(q) {
  const n = q.need, b = B();
  if (q.auto) return 'Gün sonunda otomatik kontrol edilir';
  if (n.beans && beanStock() < n.beans) return `${n.beans} doz çekirdek gerekli`;
  if (n.milk && b.milk < n.milk) return `${n.milk} süt gerekli`;
  if (n.croissant && b.croissant < n.croissant) return `Vitrinde ${n.croissant} kruvasan olmalı`;
  if (n.money && S.money < n.money) return `${fmt(n.money)} gerekli`;
  if (n.fresh && b.beans[b.activeBean].h < n.fresh) return `${n.fresh} doz taze kavrulmuş çekirdek gerekli`;
  return null;
}
function takeBeans(n) {
  const b = B().beans[B().activeBean];
  const fromR = Math.min(b.r, n); b.r -= fromR; b.h -= n - fromR;
}
function giveReward(q) {
  const r = q.reward, b = B(), msgs = [];
  if (r.money) { S.money += r.money; msgs.push(`+${fmt(r.money)}`); }
  if (r.beansMult) { const m = Math.round(q.need.beans * beanPrice(b.activeBean) * r.beansMult); S.money += m; msgs.push(`+${fmt(m)}`); }
  if (r.reviews) { for (let k = 0; k < r.reviews; k++) addReview(5, `${q.from} çok memnun kaldı, herkese tavsiye ediyor.`, q.from, q.icon); msgs.push(`+${r.reviews} harika yorum`); }
  if (r.civic) { b.civic += r.civic; msgs.push('caddeye daha çok insan geliyor'); }
  if (r.buzz) { S.buzz = Math.max(S.buzz, r.buzz); msgs.push(`${r.buzz} gün boyunca kalabalık`); }
  coin();
  note(`✅ ${q.from} isteği tamamlandı! (${msgs.join(', ')})`);
}
export function completeQuest(id) {
  const b = B(), q = b.quests.find(x => x.id === id);
  if (!q || questProblem(q)) return;
  const n = q.need;
  if (n.beans) takeBeans(n.beans);
  if (n.milk) b.milk -= n.milk;
  if (n.croissant) { b.croissant -= n.croissant; refreshVitrin(); }
  if (n.money) S.money -= n.money;
  if (n.fresh) b.beans[b.activeBean].h -= n.fresh;
  b.quests = b.quests.filter(x => x !== q);
  giveReward(q);
}
// gün sonunda: otomatik görevleri kontrol et, süresi dolanları sil
export function questsEndOfDay() {
  const b = B(), sat = avg(b.today.sats);
  for (const q of [...b.quests]) {
    if (q.auto && q.need.avgSat && sat != null && sat >= q.need.avgSat) { b.quests = b.quests.filter(x => x !== q); giveReward(q); continue; }
    if (S.day >= q.expires) { b.quests = b.quests.filter(x => x !== q); note(`⌛ ${q.from} isteğinin süresi doldu.`); }
  }
}
export function questsMorning() {
  const b = B();
  if (--b.questTimer <= 0) { offerQuest(b); b.questTimer = 3; }
}
