// Gün döngüsü: zaman, kapanış, gün sonu raporu, yeni gün, hava, borsa, tedarik
import { CLOSE, DAY_START, MIN_PER_SEC, BEANS, BAG, MILK_PACK, MILK_PACK_COST, FOOD, DRINKS, HOODS, WEATHER, EVENTS, PEVENTS, PACE } from '../config.js';
import { S, B, save, newToday, seasonOf, backupNow, ruleIs, CHALLENGE } from '../state.js';
import { rand, pick, weightedPick, avg, randn, clamp } from '../utils.js';
import { toast, note } from '../ui/toast.js';
import { puff } from '../engine/fx.js';
import { people, insideCount, spawnPasser, passerRate } from './people.js';
import { updateBars, workers, genCandidates, assignBaristas, syncWorkers } from './staff.js';
import { items, hasItem, localToWorld, refreshVitrin } from './grid.js';
import { beanStock, rating, rentOf, wagesOf, fairWage, milkPackCost, onMenu } from './economy.js';
import { scheduleRegulars, updateRegulars } from './regulars.js';
import { rollEvent, updateEvents, removeMusician, planDay } from './events.js';
import { newDaily } from './progress.js';
import { maybeOpenRival, rivalDaily } from './rival.js';
import { checkGoals, questsEndOfDay, questsMorning } from './quests.js';
import { passiveIncome } from './branches.js';
import { buildUnits } from '../world/units.js';
import { applyWeather } from '../world/weather.js';
import { showReport, hideModal, showChallengeResult } from '../ui/modal.js';
import { finishChallenge } from './challenge.js';
import { royaltyTotal } from './prestige.js';
import { closeAllArt } from '../ui/minigame.js';

const warned = {};
export function warnOnce(key, msg) { if (warned[key]) return; warned[key] = true; toast(msg, 4000); setTimeout(() => warned[key] = false, 30000); }
export const rollWeather = day => ruleIs('yagmur') && Math.random() < .45 ? (seasonOf(day).id === 'kis' ? 'kar' : 'yagmur') : weightedPick(seasonOf(day).weather);

let passT = 0.5, slowT = 0;
export function simulate(dt) {
  S.time += dt * MIN_PER_SEC;
  const h = S.time / 60;
  if (S.phase === 'open' && S.time >= CLOSE) { S.phase = 'closing'; toast('🌙 Saat 22:00, dükkan kapandı. İçerideki müşteriler çıkınca gün bitecek.', 3500); }
  if (S.phase === 'closing') {
    if (S.time >= CLOSE + 45) for (const p of [...people]) if (p.kind === 'customer') p.leaveShop();
    if (insideCount() === 0) { endDay(); return; }
  }
  if ((passT -= dt) <= 0) { spawnPasser(h); passT = 1 / passerRate(h) * rand(.5, 1.5); }
  updateRegulars();
  updateEvents(h, dt);
  updateBars(dt);
  updateRoasters(dt);
  for (const p of [...people]) p.update(dt);
  for (const w of workers) w.update(dt);
  if ((slowT += dt) > 1) {
    slowT = 0; autoSupply(); checkGoals();
    if (beanStock() < 25) warnOnce('beansLow', `⚠️ ${BEANS[B().activeBean].name} azalıyor (${beanStock()} doz). Stok panelinden al.`);
    const milkOn = Object.keys(DRINKS).some(k => onMenu(k) && DRINKS[k].milk);
    if (milkOn && B().milk < 8) warnOnce('milk', '⚠️ Süt azalıyor! Stok panelinden al.');
  }
}

function updateRoasters(dt) {
  const b = B(), on = S.time >= 7.5 * 60 && S.time < CLOSE;
  for (const it of items) if (it.type === 'roaster') {
    const id = [b.activeBean, ...Object.keys(BEANS)].find(k => b.beans[k].g > 0);
    if (!on || !id) continue;
    it.acc = (it.acc || 0) + dt * PACE / 0.8;
    while (it.acc >= 1 && b.beans[id].g > 0) { it.acc--; b.beans[id].g--; b.beans[id].h++; }
    it.mesh.userData.drum.rotation.z += dt * 4;
    it.mesh.userData.paddle.rotation.y += dt * 3;
    if (Math.random() < dt * 3) puff(localToWorld(it, -0.19, -0.28).setY(1.15), 0x9a9a9a, 1.5);
  }
}
export function autoSupply() {
  if (!S.autoSupply) return;
  const b = B(), id = b.activeBean, st = b.beans[id], roast = hasItem('roaster');
  if (st.r + st.h + st.g < 40) {
    const cost = Math.round(BEANS[id].cost * S.market[id] * BAG * (roast ? .55 : 1) * 1.1);
    if (S.money >= cost) { S.money -= cost; b.today.stock += cost; if (roast) st.g += BAG; else st.r += BAG; toast(`🚚 Otomatik tedarik: ${BAG} doz ${BEANS[id].name}${roast ? ' (çiğ)' : ''}`); }
  }
  const milkOn = Object.keys(DRINKS).some(k => onMenu(k) && DRINKS[k].milk);
  if (milkOn && b.milk < 15) {
    const cost = Math.round(milkPackCost() * 1.1);
    if (S.money >= cost) { S.money -= cost; b.today.stock += cost; b.milk += MILK_PACK; toast('🚚 Otomatik tedarik: süt'); }
  }
}
// kahve borsası: her gün fiyatlar biraz oynar, arada bir sert hareket olur
function updateMarket() {
  S.marketPrev = { ...S.market };
  for (const k of Object.keys(BEANS)) S.market[k] = clamp(S.market[k] * Math.exp(randn() * .07) + (1 - S.market[k]) * .08, .65, 1.6);
  const r = Math.random(), k = pick(Object.keys(BEANS));
  if (r < .12) { S.market[k] = clamp(S.market[k] * 1.3, .65, 1.6); note(`📈 Kahve borsası: ${BEANS[k].name} fiyatı fırladı!`); }
  else if (r < .22) { S.market[k] = clamp(S.market[k] * .75, .65, 1.6); note(`📉 Kahve borsası: ${BEANS[k].name} ucuzladı, stok yapma zamanı!`); }
}

export function endDay() {
  for (const p of [...people]) if (p.kind === 'customer') p.leaveShop();
  removeMusician(); closeAllArt();
  const b = B(), T = b.today;
  questsEndOfDay();
  rivalDaily();
  const rent = rentOf(b), wages = wagesOf(b);
  const waste = hasItem('vitrin') ? b.croissant : 0;
  b.croissant = 0; refreshVitrin();
  S.money -= rent + wages;
  const income = T.revenue + T.foodRev + T.tips + T.gifts;
  const net = income - rent - wages - T.stock - T.fines;
  b.histNet.push(net); if (b.histNet.length > 7) b.histNet.shift();
  const others = passiveIncome();
  const royalty = royaltyTotal(); S.money += royalty;
  // personel morali: adil maaş ve yorgunluk; morali çok düşen istifa edebilir
  const quits = [];
  for (const s of [...b.staff]) {
    if (s.owner) continue;
    s.morale = clamp(s.morale + (s.wage >= fairWage(s) ? 5 : -8) - (s.fatigue > 80 ? 6 : 0), 0, 100);
    if (s.morale < 20 && Math.random() < .5) { b.staff = b.staff.filter(x => x !== s); quits.push(s.name); }
  }
  if (quits.length) { assignBaristas(); syncWorkers(); }
  const todays = b.reviews.filter(r => r.day === S.day);
  updateMarket();
  S.history.push({ day: S.day, income, net: net + royalty + others.reduce((a, o) => a + o.net, 0), served: T.served, rating: +rating().toFixed(2), weather: S.weather.today });
  if (S.history.length > 60) S.history.shift();
  S.lastReport = {
    day: S.day, hood: b.hood, income, revenue: T.revenue, foodRev: T.foodRev, tips: T.tips, gifts: T.gifts, fines: T.fines,
    rent, wages, stock: T.stock, invest: T.invest, waste, net, served: T.served, angry: T.angry, turned: T.turned, refused: T.refused,
    avg: avg(T.sats), best: todays.slice().sort((a, c) => c.stars - a.stars)[0] || null, worst: todays.slice().sort((a, c) => a.stars - c.stars)[0] || null,
    others, royalty, quits, log: [...(S.dayLog || [])], weather: S.weather.today, tomorrow: S.weather.tomorrow, tomorrowSeason: seasonOf(S.day + 1).id,
    rivalShare: b.rival.active ? b.rival.share : null,
  };
  S.phase = 'report';
  if (CHALLENGE) { showChallengeResult(finishChallenge()); return; }
  save(); backupNow(); showReport();
}

const SEASON_TIPS = {
  ilkbahar: 'Çiçekler açtı, teras keyfi geri döndü.',
  yaz: 'Cold brew ve lokumlu cold brew talebi artar. Teras zamanı!',
  sonbahar: 'Yağmurlar başlıyor. Fındıklı latte zamanı!',
  kis: 'Sıcak içecekler ve salep zamanı. Mağazada yılbaşı ağacı var!',
};
export function startDay() {
  const prevSeason = seasonOf(S.day).id;
  S.day++; S.time = DAY_START; S.phase = 'open'; S.dayLog = [];
  const se = seasonOf(S.day);
  S.weather.today = S.weather.tomorrow; S.weather.tomorrow = rollWeather(S.day + 1);
  if (S.buzz > 0) S.buzz--;
  S.event = rollEvent();
  for (const br of S.branches) {
    br.age++; br.today = newToday(); genCandidates(br);
    for (const s of br.staff) { s.fatigue = 0; s.breakT = 0; }
  }
  const b = B();
  let rebuild = false;
  HOODS[b.hood].units.forEach((u, k) => {
    if (b.units[k] !== 'occupied' || !u.unlock) return;
    const c = u.unlock;
    if (b.age >= c.age && (!c.rating || rating() >= c.rating) && (!c.served || b.served >= c.served)) { b.units[k] = 'rent'; note(u.news, 5000); rebuild = true; }
  });
  if (!S.geisha && S.day >= 4 && rating() >= 4.3) { S.geisha = true; note('🌱 Nadir çekirdek tedarikçisi seninle çalışmak istiyor: Panama Geisha açıldı!'); }
  maybeOpenRival(b);
  if (se.id !== prevSeason) { note(`${se.icon} ${se.name} geldi! ${SEASON_TIPS[se.id]}`, 5000); rebuild = true; }
  if (rebuild) buildUnits();
  if (hasItem('vitrin') && b.croissantOrder > 0) {
    const cost = b.croissantOrder * FOOD.cost;
    if (S.money >= cost) { S.money -= cost; b.today.stock += cost; b.croissant = b.croissantOrder; refreshVitrin(); }
    else note('🥐 Para yetmediği için kruvasan siparişi verilemedi.');
  }
  for (const s of b.staff) s.breakT = 0;
  assignBaristas();
  scheduleRegulars(); questsMorning(); newDaily(); planDay();
  applyWeather();
  hideModal(); save();
  const W = WEATHER[S.weather.today];
  toast(`☀️ Gün ${S.day} · ${se.icon} ${se.name} · ${W.icon} ${W.name}`, 3000);
  if (S.event) note(`${EVENTS[S.event.id].icon} ${EVENTS[S.event.id].name}: ${EVENTS[S.event.id].desc}`, 6000);
  if (S.pevent?.day === S.day) { const E = PEVENTS[S.pevent.id]; toast(`${E.icon} Bugün ${E.name} var (${E.from}:00–${E.to}:00)`, 3500); }
}
