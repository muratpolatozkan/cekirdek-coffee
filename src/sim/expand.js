// Dükkanı genişletme: yandaki kiralık dükkanı kiralayıp duvarı yıkmak
import { HOODS, NEIGHBORS, UW, UD } from '../config.js';
import { S, B, save } from '../state.js';
import { fmt, V } from '../utils.js';
import { isUnlocked, unlockLevel, levelProgress, levelXp } from './progress.js';
import { unitDeposit, unitRent, rating, spend } from './economy.js';
import { ownMinU, ownMaxU, recomputeBounds } from './grid.js';
import { buildUnits } from '../world/units.js';

export const isAdjacent = u => u === ownMinU - 1 || u === ownMaxU + 1;
export const unitCenter = u => V(u * UW + UW / 2, UD / 2);
// kiralanamıyorsa sebebini döner
export function rentBlock(u) {
  const b = B();
  if (b.units[u] !== 'rent') return 'Bu dükkan kiralık değil';
  if (!isUnlocked('expand')) return `Seviye ${unlockLevel('expand')}’de açılır`;
  if (!isAdjacent(u)) return 'Önce aradaki dükkanı kiralamalısın';
  if (S.money < unitDeposit(u)) return `${fmt(unitDeposit(u))} gerekli`;
  return null;
}
// kiralama şartları (kart ve liste için)
export function rentChecks(u) {
  const need = levelXp(unlockLevel('expand')), lp = levelProgress();
  return [
    { ok: isUnlocked('expand'), text: isUnlocked('expand') ? `Seviye ${unlockLevel('expand')}` : `Seviye ${unlockLevel('expand')} (şu an ${S.xp}/${need} XP)` },
    { ok: isAdjacent(u), text: isAdjacent(u) ? 'Dükkanının hemen yanında' : 'Önce aradaki dükkanı kirala' },
    { ok: S.money >= unitDeposit(u), text: `Depozito ${fmt(unitDeposit(u))}${S.money >= unitDeposit(u) ? '' : ` (paran ${fmt(S.money)})`}` },
  ];
}
export function rentUnit(u) {
  if (rentBlock(u) || !spend(unitDeposit(u))) return false;
  B().units[u] = 'own';
  recomputeBounds(); buildUnits(); save();
  return true;
}
// komşu dükkanın ne zaman kiralığa düşeceği
export function neighborProgress(u) {
  const b = B(), c = HOODS[b.hood].units[u].unlock;
  if (!c) return [];
  const out = [{ label: 'Gün', cur: b.age, need: c.age }];
  if (c.rating) out.push({ label: 'Puan', cur: +rating().toFixed(1), need: c.rating });
  if (c.served) out.push({ label: 'Servis', cur: b.served, need: c.served });
  return out;
}
export const unitInfo = u => {
  const b = B(), U = HOODS[b.hood].units[u], st = b.units[u];
  if (st === 'own') return { icon: S.brand.icon, name: u === 1 ? 'Senin dükkanın' : 'Senin (ek alan)' };
  if (st === 'occupied') return { icon: NEIGHBORS[U.kind].icon, name: NEIGHBORS[U.kind].name };
  return { icon: '🔑', name: 'Kiralık dükkan' };
};
export { unitDeposit, unitRent };
