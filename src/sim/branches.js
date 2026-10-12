// Şubeler (yeni mahalleler) ve franchise (kalıcı bonusla baştan başlama)
import { HOODS } from '../config.js';
import { S, B, save, newBranch, meta, saveMeta, wipeSave } from '../state.js';
import { avg } from '../utils.js';
import { note } from '../ui/toast.js';
import { spend, rentOf, wagesOf, netWorth } from './economy.js';
import { ownedCountOf, clearItems, loadItems, recomputeBounds } from './grid.js';
import { despawnAll } from './people.js';
import { assignBaristas, syncWorkers, despawnWorkers, genCandidates } from './staff.js';
import { genRegulars, scheduleRegulars } from './regulars.js';
import { removeMusician } from './events.js';
import { buildStreet, buildRival } from '../world/street.js';
import { buildUnits, refreshMenuBoard } from '../world/units.js';
import { applyWeather } from '../world/weather.js';
import { focusShop } from '../engine/scene.js';
import { closeAllArt } from '../ui/minigame.js';
import { setMode } from '../ui/input.js';

export const canOpenBranch = () => S.branches.every(b => ownedCountOf(b) >= 3);
export const availableHoods = () => Object.keys(HOODS).filter(h => HOODS[h].open > 0 && !S.branches.some(b => b.hood === h));

export function rebuildWorld() {
  recomputeBounds(); buildStreet(); buildUnits(); loadItems(); assignBaristas(); syncWorkers(); buildRival(); applyWeather(); refreshMenuBoard(); focusShop();
  if (B().regDay !== S.day) scheduleRegulars();
}
export function switchBranch(i) {
  if (i === S.activeBranch || !S.branches[i]) return;
  setMode('none'); save();
  despawnAll(); despawnWorkers(); closeAllArt(); removeMusician(); clearItems();
  S.activeBranch = i;
  rebuildWorld(); save();
  note(`${HOODS[B().hood].icon} ${HOODS[B().hood].name} şubesine geçtin.`, 2500);
}
export function openBranch(hood) {
  if (!canOpenBranch() || !availableHoods().includes(hood) || !spend(HOODS[hood].open)) return;
  const b = newBranch(hood, false); b.age = 1;
  genRegulars(b); genCandidates(b);
  S.branches.push(b);
  switchBranch(S.branches.length - 1);
  note(`🎉 ${HOODS[hood].icon} ${HOODS[hood].name} şubesi açıldı! Şube müdürün ${b.staff[0].name} barın başında.`, 5000);
}
// aktif olmayan şubeler son günlerinin ortalamasının %85'ini kazanır
export function passiveIncome() {
  const out = [];
  S.branches.forEach((b, k) => {
    if (k === S.activeBranch) return;
    const working = b.items.some(it => it.type === 'bar') && b.staff.some(s => s.role === 'barista');
    const base = avg(b.histNet.slice(-3));
    const net = working && base != null ? Math.round(base * .85) : -(rentOf(b) + wagesOf(b));
    S.money += net;
    out.push({ name: HOODS[b.hood].name, icon: HOODS[b.hood].icon, net });
  });
  return out;
}
export const canFranchise = () => S.branches.length >= 3 || netWorth() >= 100000;
export const franchiseStars = () => 1 + Math.floor(netWorth() / 150000);
export function franchise() {
  if (!canFranchise()) return;
  meta.stars += franchiseStars(); meta.runs++; saveMeta();
  wipeSave(); location.reload();
}
