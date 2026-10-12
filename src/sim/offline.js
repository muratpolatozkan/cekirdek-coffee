// Sen yokken kazanç: uygulama kapalıyken şubeler son günlerin kârına göre para biriktirir
import { S } from '../state.js';
import { avg } from '../utils.js';

const RATE = 0.25, MAX_HOURS = 8, MIN_MINUTES = 3;
export function offlineEarnings(now = Date.now()) {
  const mins = (now - (S.lastSeen || now)) / 60000;
  S.lastSeen = now;
  if (mins < MIN_MINUTES) return null;
  const daily = S.branches.reduce((a, b) => {
    const working = b.items.some(i => i.type === 'bar') && b.staff.some(s => s.role === 'barista');
    const base = avg(b.histNet.slice(-3));
    return a + (working && base > 0 ? base : 0);
  }, 0);
  if (daily <= 0) return null;
  const hours = Math.min(MAX_HOURS, mins / 60);
  const amount = Math.round(daily * RATE * hours);
  if (amount < 10) return null;
  S.money += amount;
  return { amount, mins: Math.round(mins), capped: mins / 60 > MAX_HOURS };
}
