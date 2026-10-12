// Ekranın üstünde sırayla gösterilen kısa bildirimler.
// note(): bildirim + gün sonu raporundaki "Günün olayları" listesine kayıt
import { S } from '../state.js';
import { $ } from '../utils.js';

const queue = []; let busy = false;
export function toast(msg, dur = 2600) { queue.push([msg, dur]); if (!busy) next(); }
function next() {
  const t = $('toast'), n = queue.shift();
  if (!n) { busy = false; t.style.opacity = 0; return; }
  busy = true; t.textContent = n[0]; t.style.opacity = 1;
  setTimeout(next, n[1]);
}
export function note(msg, dur = 4200) {
  toast(msg, dur);
  if (S.dayLog) { S.dayLog.push(msg); if (S.dayLog.length > 30) S.dayLog.shift(); }
}
