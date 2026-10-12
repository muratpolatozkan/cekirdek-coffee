// 3D sahnenin üstünde duran HTML baloncuklar ve uçan yazılar
import { toScreen } from '../engine/scene.js';
import { $ } from '../utils.js';

export const overlay = $('overlay');
export function floatText(text, pos, cls = '') {
  const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text;
  const p = toScreen(pos); el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  overlay.appendChild(el); setTimeout(() => el.remove(), 1400);
}
// bir eşyanın üstünde sabit duran etiket (ör. "Barista yok", "🧽")
export function itemTag(it, html, cls = '') {
  if (!html) { if (it.tagEl) it.tagEl.style.display = 'none'; return; }
  if (!it.tagEl) { it.tagEl = document.createElement('div'); overlay.appendChild(it.tagEl); }
  it.tagEl.className = 'bubble ' + cls;
  if (it.tagHtml !== html) { it.tagEl.innerHTML = html; it.tagHtml = html; }
  it.tagEl.style.display = 'block';
}
export function placeEl(el, pos) { const p = toScreen(pos); el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }

// ---- kutlama ve geri bildirim efektleri ----
const CONFETTI = ['#e0a100', '#1f6f54', '#c0392b', '#3498db', '#ff7eb6', '#f1c40f'];
export function confetti(n = 40) {
  const box = document.getElementById('confetti'); if (!box) return;
  for (let k = 0; k < n; k++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = CONFETTI[k % CONFETTI.length];
    p.style.animationDelay = Math.random() * .3 + 's';
    p.style.animationDuration = 1.1 + Math.random() * .8 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p); setTimeout(() => p.remove(), 2400);
  }
}
let lastCoin = 0;
// müşteri ödeyince ekrandan para kutusuna uçan bozuk para
export function flyCoin(pos) {
  const now = performance.now(); if (now - lastCoin < 140) return; lastCoin = now;
  const target = document.getElementById('money')?.getBoundingClientRect(); if (!target) return;
  const p = toScreen(pos), el = document.createElement('div');
  el.className = 'coin'; el.textContent = '🪙';
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transform = `translate(${target.left + target.width / 2 - p.x}px, ${target.top + target.height / 2 - p.y}px) scale(.6)`;
    el.style.opacity = '.4';
  }));
  setTimeout(() => {
    el.remove();
    const m = document.getElementById('money'); m?.classList.remove('bump'); void m?.offsetWidth; m?.classList.add('bump');
  }, 650);
}
