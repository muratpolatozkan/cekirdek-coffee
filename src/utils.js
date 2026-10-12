import * as THREE from 'three';

export const fmt = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const V = (x, z) => new THREE.Vector3(x, 0, z);
export const $ = id => document.getElementById(id);
export const hhmm = t => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const starStr = n => { const k = clamp(Math.round(n), 0, 5); return '★'.repeat(k) + '☆'.repeat(5 - k); };
export const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

export function weightedPick(w) {
  let tot = 0; for (const k in w) tot += Math.max(0, w[k]);
  let r = Math.random() * tot;
  for (const k in w) { r -= Math.max(0, w[k]); if (r <= 0) return k; }
  return Object.keys(w)[0];
}
export function randn() {
  let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
