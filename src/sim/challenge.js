// Günün meydan okuması: herkes aynı gün aynı mahalle, hava, olay ve kuralla tek bir gün oynar.
// Skor paylaşılır; ana kayda dokunulmaz (state.js'de CHALLENGE modunda kayıt kapalı).
import { HOODS, EVENTS, LEVELS } from '../config.js';
import { S, B, meta, saveMeta, newBranch, todayKey } from '../state.js';
import { pick, rand, avg } from '../utils.js';
import { netWorth } from './economy.js';
import { RULES } from './prestige.js';

const GAME_URL = 'https://muratpolatozkan.github.io/cekirdek-coffee/';
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const keyLabel = k => `${k % 100} ${MONTHS[Math.floor(k / 100) % 100 - 1]}`;
const dayBefore = k => { const d = new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100 - 1); return todayKey(d); };

// oyun açılırken (Math.random günün tohumuyla) bir kere çağrılır
export function setupChallenge() {
  const hood = pick(Object.keys(HOODS));
  S.branches = [newBranch(hood, true)];
  S.activeBranch = 0;
  S.money = 3500 + Math.floor(rand(0, 5)) * 500;
  S.weather.today = S.weather.tomorrow = pick(['gunes', 'gunes', 'bulut', 'yagmur', 'sicak']);
  S.rule = pick(Object.keys(RULES).filter(k => k !== 'normal'));
  const ev = pick(Object.keys(EVENTS));
  S.event = { id: ev, done: false };
  if (ev === 'influencer') S.event.hour = rand(10, 17.5);
  if (ev === 'denetim') S.event.hour = rand(9.5, 19);
  // orta seviye bir dükkan: ekip, olaylar, akınlar ve VIP açık; rehber ve ipuçları yok
  S.xp = LEVELS[4].xp; S.levelSeen = 99;
  S.tut = 'done'; S.introSeen = true; S.news3 = true;
  S.tipsShown = new Proxy({}, { get: () => true });
  S.challenge = { key: todayKey(), startWorth: netWorth() };
}
export const challengeInfo = () => ({ hood: HOODS[B().hood], rule: RULES[S.rule], event: S.event && EVENTS[S.event.id], key: S.challenge.key });

// gün bitince skoru hesapla ve kaydet
export function finishChallenge() {
  const T = B().today, key = S.challenge.key;
  const profit = Math.round(netWorth() - S.challenge.startWorth), sat = avg(T.sats) || 0;
  const parts = [['💰 Kâr', Math.max(0, profit)], [`☕ ${T.served} servis × 25`, T.served * 25], [`😊 Memnuniyet ${sat.toFixed(1)} × 400`, Math.round(sat * 400)]];
  const score = parts.reduce((a, p) => a + p[1], 0);
  const prev = meta.ch[key] || 0, record = score > prev;
  if (record) meta.ch[key] = score;
  if (meta.chLast !== key) { meta.chStreak = meta.chLast === dayBefore(key) ? meta.chStreak + 1 : 1; meta.chLast = key; }
  saveMeta();
  return { key, score, parts, best: Math.max(prev, score), record, profit, served: T.served, sat, streak: meta.chStreak };
}
export function shareText(r) {
  const i = challengeInfo();
  return `☕ Çekirdek Coffee · Günün Meydan Okuması (${keyLabel(r.key)})\n${i.hood.icon} ${i.hood.name} · ${i.rule.icon} ${i.rule.name}\n🏆 ${r.score.toLocaleString('tr-TR')} puan · ${r.served} servis · 😊 ${r.sat.toFixed(1)}\nGeçebilir misin? ${GAME_URL}?meydan`;
}
export async function share(text) {
  try { if (navigator.share) { await navigator.share({ text }); return 'shared'; } } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch (e) { return 'fail'; }
}
export const lastDays = (n = 7) => { const out = []; let k = todayKey(); for (let i = 0; i < n; i++) { out.push([k, meta.ch[k] || 0]); k = dayBefore(k); } return out; };
export const playChallenge = () => { location.href = location.pathname + '?meydan'; };
export const leaveChallenge = () => { location.href = location.pathname; };
