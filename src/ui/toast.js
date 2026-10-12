// Üstte üst üste dizilen kısa bildirim kartları (en fazla 3 tane görünür).
// note(): bildirim + gün sonu raporundaki "Günün olayları" listesine kayıt
import { S } from '../state.js';
import { $ } from '../utils.js';

const box = $('toasts');
export function toast(msg, dur = 2800) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, dur);
}
export function note(msg, dur = 4200) {
  toast(msg, dur);
  if (S.dayLog) { S.dayLog.push(msg); if (S.dayLog.length > 30) S.dayLog.shift(); }
}
export const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch (e) {} };
