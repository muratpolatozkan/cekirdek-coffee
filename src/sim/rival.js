// Rakip kahveci: sokağın köşesinde açılır, müşteri payı için seninle yarışır
import { HOODS, GW } from '../config.js';
import { S, B } from '../state.js';
import { clamp } from '../utils.js';
import { note } from '../ui/toast.js';
import { rating, priceAppeal } from './economy.js';
import { atmPerUnit } from './grid.js';
import { buildRival } from '../world/street.js';

export const RIVAL_X0 = GW + 1.5, RIVAL_W = 5;   // sağdaki köşe binası
export const rivalDoorX = () => RIVAL_X0 + 3.5;
export const rivalName = (b = B()) => HOODS[b.hood].rival.name;
export const rivalOpen = () => { const r = B().rival; return r.active && !r.closed; };
function myScore() {
  return rating() ** 2 * (1 + Math.min(.6, atmPerUnit() * .04)) * priceAppeal() * (1 + .15 * S.ads) * (S.loyaltyCard ? 1.15 : 1);
}
function rivalScore() { const r = B().rival; return r.rating ** 2 * 1.25 * (r.promo > 0 ? 1.35 : 1) * 1.1; }
export const rivalShare = () => { const m = myScore(); return m / (m + rivalScore()); };
export const rivalFactor = () => rivalOpen() ? clamp(rivalShare() * 1.6 + .2, .55, 1.15) : 1;

export function maybeOpenRival(b = B()) {
  const r = b.rival;
  if (r.active || r.closed || b.age < HOODS[b.hood].rival.age) return;
  r.active = true; r.health = 100; r.openedDay = S.day;
  if (b === B()) { note(`🏪 Sokağın köşesine rakip kahveci açıldı: ${rivalName(b)}! Puanın, fiyatın ve atmosferinle müşterilerini koru.`, 6000); buildRival(); }
}
export function rivalDaily() {
  const r = B().rival; if (!rivalOpen()) return;
  const share = rivalShare(); r.share = share;
  if (r.promo > 0) r.promo--;
  if (share > .55) r.health -= (share - .5) * 40;
  else if (share < .45) { r.health = Math.min(100, r.health + 5); r.rating = Math.min(4.6, r.rating + .05); }
  if (r.health < 50 && !r.promoUsed) { r.promo = 2; r.promoUsed = true; note(`📢 ${rivalName()} %30 indirime girdi! Birkaç gün müşteri çalacak.`); }
  if (r.health <= 0) {
    r.closed = true; r.active = false; S.money += 5000;
    note(`🎉 ${rivalName()} kapandı! Mahallenin kahvecisi artık sensin. (+5.000 ₺)`, 6000);
    buildRival();
  }
}
