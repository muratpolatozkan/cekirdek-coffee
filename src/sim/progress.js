// İlerleme: tecrübe puanı (XP), seviyeler ve açtıkları, günlük hedefler
import { LEVELS, XP } from '../config.js';
import { S, perk } from '../state.js';
import { fmt, pick } from '../utils.js';
import { note } from '../ui/toast.js';
import { confetti } from '../ui/overlay.js';
import { coin } from '../audio.js';
import { hasItem } from './grid.js';

// ---- seviye ----
const LAST = LEVELS[LEVELS.length - 1].xp, STEP = 700;   // son seviyeden sonra her 700 XP bir seviye
export function levelOf(xp = S.xp) {
  if (xp >= LAST) return LEVELS.length + Math.floor((xp - LAST) / STEP);
  let l = 1; LEVELS.forEach((L, k) => { if (xp >= L.xp) l = k + 1; }); return l;
}
export const levelXp = l => l <= LEVELS.length ? LEVELS[l - 1].xp : LAST + (l - LEVELS.length) * STEP;
export const level = () => levelOf();
export function levelProgress() {
  const l = level(), a = levelXp(l), b = levelXp(l + 1);
  return { l, cur: S.xp - a, need: b - a, pct: Math.min(1, (S.xp - a) / (b - a)) };
}
export const levelTitle = l => (LEVELS[Math.min(l, LEVELS.length) - 1]).title;
const unlockAt = {};
LEVELS.forEach((L, k) => L.unlocks.forEach(u => { unlockAt[u] = k + 1; }));
export const unlockLevel = key => unlockAt[key] || 1;
export const isUnlocked = key => level() >= unlockLevel(key);
export const unlocksOf = l => (LEVELS[l - 1]?.unlocks) || [];
export function addXP(n) {
  if (!(n > 0)) return;
  const extra = n * .25 * perk('tecrube');   // Tecrübe yeteneği: kesirli kısım şansla eklenir
  S.xp += n + Math.floor(extra) + (Math.random() < extra % 1 ? 1 : 0);
}

// ---- günlük hedefler ----
const POOL = [
  { id: 'serve', icon: '☕', m: 'served', text: n => `${n} müşteriye servis yap`, target: l => 10 + l * 4 },
  { id: 'revenue', icon: '💰', m: 'revenue', text: n => `Bugün ${fmt(n)} ciro yap`, target: l => 700 + l * 450 },
  { id: 'clean', icon: '🧽', m: 'cleans', text: n => `${n} kez masa topla`, target: () => 5 },
  { id: 'taps', icon: '⚡', m: 'taps', text: n => `Bara dokunarak ${n} kez hızlandır`, target: () => 15 },
  { id: 'five', icon: '⭐', m: 'five', text: n => `${n} tane 5 yıldızlı yorum al`, target: l => l > 4 ? 3 : 2 },
  { id: 'art', icon: '🎨', m: 'arts', text: n => `${n} mükemmel latte art yap`, target: () => 2, ok: () => S.latteArt && S.menu.latte.on },
  { id: 'regular', icon: '👋', m: 'regulars', text: n => `${n} müdavim ağırla`, target: () => 2, ok: () => isUnlocked('tab:hood') },
  { id: 'food', icon: '🥐', m: 'food', text: n => `${n} kruvasan sat`, target: () => 5, ok: () => hasItem('vitrin') },
];
export function newDaily() {
  const l = level(), pool = POOL.filter(p => !p.ok || p.ok()), picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  S.daily = { day: S.day, m: {}, goals: picks.map(p => { const t = p.target(l); return { id: p.id, icon: p.icon, m: p.m, text: p.text(t), target: t, done: false, reward: 150 + l * 60 }; }) };
}
export function ensureDaily() { if (!S.daily || S.daily.day !== S.day) newDaily(); }
export function track(metric, n = 1) {
  if (!S.daily) return;
  S.daily.m[metric] = (S.daily.m[metric] || 0) + n;
  for (const g of S.daily.goals) if (!g.done && g.m === metric && S.daily.m[metric] >= g.target) {
    g.done = true; S.money += g.reward; addXP(XP.daily); if (S.stat) S.stat.goals = (S.stat.goals || 0) + 1;
    note(`🎯 Günlük hedef tamam: ${g.text} (+${fmt(g.reward)})`, 3500);
    confetti(24); coin();
  }
}
export const dailyProgress = g => Math.min(g.target, S.daily?.m[g.m] || 0);
