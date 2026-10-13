// Fiyat, puan ve günün koşullarına (hava, olay, etkinlik) bağlı çarpanlar
import { OPEN, DRINKS, BEANS, HOODS, WEATHER, PEVENTS, CATALOG, MILK_PACK, MILK_PACK_COST, TERRACE_FEE } from '../config.js';
import { S, B, seasonOf, perk, ruleIs } from '../state.js';
import { clamp } from '../utils.js';
import { toast } from '../ui/toast.js';

// yeni yorumlar daha ağır basar: kötü bir dönemden sonra puan toparlanabilir
export function rating(b = B()) {
  let sum = 3.5 * 6, w = 6, k = 1;
  for (const r of b.reviews.slice(0, 60)) { sum += r.stars * k; w += k; k *= 0.96; }
  return sum / w;
}
export const beanQ = () => BEANS[B().activeBean].q + (B().beans[B().activeBean].h > 0 ? 0.4 : 0);
export const beanStock = (id = B().activeBean) => B().beans[id].r + B().beans[id].h;
export const beanPrice = id => Math.max(1, Math.round(BEANS[id].cost * S.market[id] * 10) / 10);
export const fairPrice = id => DRINKS[id].base * (1 + 0.15 * (beanQ() - 2.5)) * (0.65 + 0.1 * rating()) * (1 + 0.04 * perk('marka')) * (ruleIs('kriz') ? .8 : 1);
export const cupCost = id => DRINKS[id].beans * beanPrice(B().activeBean) + DRINKS[id].milk * (milkPackCost() / MILK_PACK) + (DRINKS[id].extra || 0);
export const milkPackCost = () => MILK_PACK_COST * (ruleIs('sut') ? 2 : 1);
export const season = () => seasonOf(S.day);
export const weatherNow = () => WEATHER[S.weather.today];
export const hourNow = () => S.time / 60;
export const eventIs = id => S.event?.id === id;
export function peventNow(h = hourNow()) {
  const p = S.pevent; if (!p || p.day !== S.day) return null;
  const E = PEVENTS[p.id]; return h >= E.from && h < E.to ? E : null;
}
export const outageNow = (h = hourNow()) => eventIs('elektrik') && h >= 14 && h < 15.5;
// menü ortak; her şubenin kendi fiyat yüzdesi ve kapattığı içecekler var
export const onMenu = (id, b = B()) => !!S.menu[id]?.on && !b.off?.[id];
export const branchPrice = (id, b = B()) => Math.round(S.menu[id].price * (1 + (b.priceAdj || 0) / 100));
export const effPrice = id => Math.round(branchPrice(id) * (1 - (peventNow()?.discount || 0)));

// caddeden geçen kişi sayısı çarpanı
export function passMult(h) {
  let m = weatherNow().pass * HOODS[B().hood].passMult * (1 + B().civic) * (1 + 0.06 * perk('sohret')) * (ruleIs('turist') ? 1.4 : 1) * (1 + 0.12 * S.ads);
  if (eventIs('mac')) m *= h >= 17 && h < 19 ? 1.3 : h >= 19 ? 0.35 : 1;
  if (eventIs('festival')) m *= 1.7;
  if (S.buzz > 0) m *= 1.35;
  const E = peventNow(h); if (E?.pass) m *= E.pass;
  return m;
}
// müşteri tipi ağırlık çarpanları (mahalle + olaylar)
export function typeMult(h) {
  const m = { ...HOODS[B().hood].typeMult };
  if (eventIs('festival')) m.turist = (m.turist ?? 1) * 3;
  const E = peventNow(h);
  if (E?.types) for (const [k, v] of Object.entries(E.types)) m[k] = (m[k] ?? 1) * v;
  return m;
}
export function priceAppeal() {
  const on = Object.keys(DRINKS).filter(id => onMenu(id));
  const a = on.reduce((s, id) => s + effPrice(id) / fairPrice(id), 0) / on.length;
  return clamp(2 - a, 0.3, 1.3);
}
// personelin anlık hız/güler yüzü (yorgunluk, moral, özellik)
export const staffSpeed = s => s.speed * (s.fatigue > 70 ? 0.8 : 1) * (s.morale < 30 ? 0.85 : 1);
export const staffCharm = s => s.charm + (s.trait === 'guler' ? 0.15 : 0) - (s.fatigue > 70 ? 0.2 : 0);
export const prepTime = (id, s) => DRINKS[id].time * 0.8 * Math.pow(0.85, B().machine - 1) / staffSpeed(s) / (s.trait === 'hizli' && !DRINKS[id].milk ? 1.15 : 1);
export const fairWage = s => Math.round(((s.role === 'barista' ? 220 + (s.speed - .8) * 300 + (s.charm - .75) * 200 : 150 + (s.speed - .8) * 200 + (s.charm - .75) * 100) + (s.trait ? 30 : 0)) / 10) * 10;

export const machineCost = () => [0, 1200, 2500, 4500, 8000][B().machine];
export const adsCost = () => [800, 1600, 3200, 6000, 10000][S.ads];
export const trainCost = s => 500 * s.lvl;
export const shopOpen = () => S.phase === 'open' && S.time >= OPEN;
export function spend(cost, kind = 'invest') {
  if (S.money < cost) { toast('Yeterli paran yok.'); return false; }
  S.money -= cost; B().today[kind] += cost; return true;
}
export const unitRent = (u, b = B()) => Math.round(HOODS[b.hood].units[u].rent * HOODS[b.hood].rentMult * (ruleIs('kira') ? 1.5 : 1));
export const unitDeposit = (u, b = B()) => Math.round((HOODS[b.hood].units[u].deposit || 0) * HOODS[b.hood].rentMult);
export const rentOf = (b = B()) => b.units.reduce((a, st, u) => a + (st === 'own' ? unitRent(u, b) : 0), 0) + (b.terrace ? TERRACE_FEE : 0);
export const wagesOf = (b = B()) => b.staff.reduce((a, s) => a + s.wage, 0);
export function netWorth() {
  let w = S.money;
  for (const b of S.branches) {
    w += b.items.reduce((a, it) => a + CATALOG[it.type].price * 0.5, 0);
    b.units.forEach((st, u) => { if (st === 'own') w += unitDeposit(u, b) * 0.5; });
  }
  return Math.round(w);
}
