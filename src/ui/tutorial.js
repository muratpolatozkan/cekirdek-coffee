// İlk oyun için adım adım rehber: üstte bir kart, ilgili butonun etrafında yanıp sönen halka
import { S, save } from '../state.js';
import { $ } from '../utils.js';
import { sheet } from './panels.js';
import { mode, buildType } from './input.js';
import { items } from '../sim/grid.js';
import { addXP } from '../sim/progress.js';
import { confetti } from './overlay.js';

const tables = () => items.filter(i => i.type === 'table').length;
const STEPS = [
  { t: '👋 Hoş geldin! İlk müşterilerin geliyor. Önce oturacak yer ekleyelim: alttaki 🛠️ İnşa’ya dokun.', sel: '#tabbar [data-sheet=build]', done: () => sheet === 'build' || mode === 'build' },
  { t: '🪑 Masa kartına dokun.', sel: '.tile[data-arg=table]', done: () => mode === 'build' && buildType === 'table' },
  { t: '👆 Haritada boş bir kareye dokun, sonra alttaki ✓ Koy’a bas.', sel: '#abOk', done: () => tables() >= 2 },
  { t: '👍 Süper! ✕ ile yerleştirmeyi bitir.', sel: '#abCancel', done: () => mode === 'none' && sheet !== 'build' },
  { t: '⚡ Barista kahve hazırlarken bara dokun: her dokunuş siparişi hızlandırır. Bir dene!', sel: null, done: () => (S.daily?.m.taps || 0) >= 1, skip: true },
  { t: '🧽 Kalkan müşteriler masada bardak bırakır. 🧽 işaretli masaya dokunarak topla.', sel: null, done: () => (S.daily?.m.cleans || 0) >= 1, skip: true },
  { t: '📦 Çekirdek azalınca ☕ Dükkan → Stok’tan alırsın. Bir göz at.', sel: '#tabbar [data-sheet=shop]', done: () => sheet === 'shop' },
  { t: '⏩ Zamanı hızlandırmak için hız butonuna dokun.', sel: '#speedBtn', done: ctx => ctx.speed() > 1, skip: true },
  { t: '🎉 Hazırsın! Servis yaptıkça seviye atlar, yeni özellikler açarsın. Üstteki 🏅 rozetine dokunarak günlük hedeflerine bakabilirsin.', sel: '#levelPill', next: true },
];
const card = $('coach');
let lastTarget = null;
function highlight(sel) {
  const el = sel ? document.querySelector(sel) : null;
  if (el === lastTarget) return;
  lastTarget?.classList.remove('coach-target');
  el?.classList.add('coach-target');
  lastTarget = el;
}
function finish(reward) {
  S.tut = 'done'; card.style.display = 'none'; document.body.classList.remove('coach-on'); highlight(null);
  if (reward) { S.money += 300; addXP(10); confetti(40); }
  save();
}
export function updateTutorial(ctx) {
  if (S.tut === 'done' || S.phase === 'report' || $('modal').style.display === 'flex') { card.style.display = 'none'; document.body.classList.remove('coach-on'); highlight(null); return; }
  const k = S.tut || 0, st = STEPS[k];
  if (!st) { finish(true); return; }
  if (!st.next && st.done(ctx)) { S.tut = k + 1; return updateTutorial(ctx); }
  card.style.display = 'block'; document.body.classList.add('coach-on');
  const html = `<div class="coach-step">Rehber ${k + 1}/${STEPS.length}</div><p>${st.t}</p><div class="coach-btns">
    <button class="btn sm" data-coach="skip">Rehberi geç</button>${st.next ? '<button class="btn sm primary" data-coach="next">Başla! (+300 ₺)</button>' : st.skip ? '<button class="btn sm" data-coach="next">Sonraki →</button>' : ''}</div>`;
  if (card.dataset.k !== String(k)) { card.innerHTML = html; card.dataset.k = k; }
  highlight(st.sel);
}
card.addEventListener('click', e => {
  const b = e.target.closest('[data-coach]'); if (!b) return;
  if (b.dataset.coach === 'skip') finish(false);
  else { const k = S.tut || 0; if (k >= STEPS.length - 1) finish(true); else S.tut = k + 1; card.dataset.k = ''; }
});
