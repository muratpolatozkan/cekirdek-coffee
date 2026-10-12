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
