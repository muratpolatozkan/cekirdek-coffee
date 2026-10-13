// Marka (franchise) döngüsü: şubeleri büyütünce markanı franchise yapıp yıldız kazanırsın,
// yıldızlar kalıcı yeteneklere harcanır, her yeni sezonun da bir kuralı olur (zor kural = fazladan yıldız)
import { S, meta, saveMeta, wipeSave, perk, CHALLENGE } from '../state.js';
import { netWorth } from './economy.js';

// cost(l): l. seviyeden bir sonrakine geçmenin yıldız bedeli
export const PERKS = {
  sermaye: { icon: '💰', name: 'Sermaye', max: 3, cost: l => 1 + l, desc: l => `Yeni oyuna +${(l * 1500).toLocaleString('tr-TR')} ₺ ile başla` },
  sohret:  { icon: '📣', name: 'Şöhret', max: 3, cost: l => 2 + l, desc: l => `Caddeden %${l * 6} daha çok kişi uğrar` },
  marka:   { icon: '🏷️', name: 'Marka değeri', max: 3, cost: l => 2 + l, desc: l => `Müşteriler %${l * 4} daha yüksek fiyata razı` },
  usta:    { icon: '🧑‍🍳', name: 'Usta eller', max: 1, cost: () => 2, desc: () => 'Kendi hızın %25, güler yüzün %20 fazla (yeni oyunda)' },
  tedarik: { icon: '🚚', name: 'Tedarik zinciri', max: 1, cost: () => 2, desc: () => 'Otomatik stok yeni oyunda baştan açık' },
  tecrube: { icon: '🎓', name: 'Tecrübe', max: 2, cost: l => 2 + l * 2, desc: l => `%${l * 25} daha hızlı seviye atla` },
  genis:   { icon: '🏠', name: 'Geniş başlangıç', max: 1, cost: () => 4, desc: () => 'Yeni oyunda yandaki dükkan baştan senin' },
  yatirim: { icon: '🏙️', name: 'Yatırımcı', max: 2, cost: l => 3 + l, desc: l => `Yeni şube açmak %${l * 25} ucuz` },
};
export const perkCost = id => PERKS[id].cost(meta.perks[id] || 0);
export function buyPerk(id) {
  const P = PERKS[id], l = meta.perks[id] || 0;
  if (!P || l >= P.max || meta.stars < P.cost(l)) return false;
  meta.stars -= P.cost(l); meta.perks[id] = l + 1; saveMeta();
  return true;
}

// sezon kuralları: bonus, bu kuralla oynanan sezon franchise edilince kazanılan fazladan yıldız
export const RULES = {
  normal:     { icon: '☕', name: 'Klasik sezon', desc: 'Özel bir kural yok.', bonus: 0 },
  sut:        { icon: '🥛', name: 'Süt krizi', desc: 'Süt iki kat pahalı.', bonus: 2 },
  kira:       { icon: '🏚️', name: 'Pahalı sokaklar', desc: 'Bütün kiralar %50 fazla.', bonus: 2 },
  yagmur:     { icon: '🌧️', name: 'Yağmurlu yıl', desc: 'Kötü hava çok daha sık.', bonus: 1 },
  turist:     { icon: '📸', name: 'Turist akını', desc: 'Cadde %40 daha kalabalık ama herkes daha sabırsız.', bonus: 1 },
  zor:        { icon: '🧐', name: 'Zor beğenenler', desc: 'Müşteriler daha zor memnun olur.', bonus: 3 },
  kriz:       { icon: '🪙', name: 'Ekonomik kriz', desc: 'Müşteriler %20 daha az ödemeye razı.', bonus: 2 },
};
export const ruleNow = () => S.rule ? RULES[S.rule] : null;
export function ruleChoices() {
  const pool = Object.keys(RULES).filter(k => k !== 'normal'), out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return ['normal', ...out];
}

export const canFranchise = () => !CHALLENGE && (S.branches.length >= 3 || netWorth() >= 100000);
export function starBreakdown() {
  const nw = netWorth();
  const parts = [['Temel', 1], ['Servet', Math.floor(nw / 120000)], ['Şubeler', Math.max(0, S.branches.length - 1)]];
  if (ruleNow()?.bonus) parts.push([`${ruleNow().icon} ${ruleNow().name}`, ruleNow().bonus]);
  return parts.filter(p => p[1] > 0);
}
export const franchiseStars = () => starBreakdown().reduce((a, p) => a + p[1], 0);
// franchise ağı: bıraktığın her marka sonraki sezonlarda her gün telif öder
export const royaltyOf = e => Math.round((80 * e.branches + e.worth * .0015) / 10) * 10;
export const royaltyTotal = () => CHALLENGE ? 0 : meta.network.reduce((a, e) => a + royaltyOf(e), 0);
// kasadan yeni sezona götürdüğün kurucu payı
export const carryOf = () => Math.min(20000, Math.round(Math.max(0, S.money) * .05 / 100) * 100);
export const networkEntry = () => ({ name: S.brand.name, icon: S.brand.icon, hoods: S.branches.map(b => b.hood), branches: S.branches.length, worth: netWorth(), day: S.day, rule: S.rule });
export function franchise(nextRule) {
  if (!canFranchise()) return;
  const n = franchiseStars();
  meta.network.push(networkEntry()); meta.carry = carryOf();
  meta.brand = { ...S.brand }; meta.customs = S.customs.map(c => ({ ...c }));
  meta.stars += n; meta.earned += n; meta.runs++;
  if ((ruleNow()?.bonus || 0) >= 2) meta.hardRuns++;
  meta.nextRule = nextRule && nextRule !== 'normal' ? nextRule : null;
  saveMeta(); wipeSave(); location.reload();
}
export const branchCost = open => Math.round(open * (1 - .25 * perk('yatirim')));
