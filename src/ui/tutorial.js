// Rehberlik: ilk oyun rehberi, gerektiği anda çıkan ipuçları ve dokunulacak yeri gösteren parmak işareti
import { S, B, save } from '../state.js';
import { $ } from '../utils.js';
import { toScreen } from '../engine/scene.js';
import { sheet } from './panels.js';
import { mode, buildType } from './input.js';
import { items, bars, tileCenter } from '../sim/grid.js';
import { beanStock } from '../sim/economy.js';
import { addXP, level } from '../sim/progress.js';
import { confetti } from './overlay.js';

const tables = () => items.filter(i => i.type === 'table').length;
const busyBar = () => bars().find(b => b.cur);
const dirtyItem = () => items.find(it => it.seats?.some(s => s.dirty));
const at = it => it && tileCenter(it.i, it.j).setY(it.type === 'bar' ? 0.9 : 0.6);

// pause: bu adımda oyun durur (oyuncu acele etmeden öğrensin)
const STEPS = [
  { t: 'Müşteriler oturacak yer arıyor. <b>İnşa</b>’ya dokun.', el: '#tabbar [data-sheet=build]', done: () => sheet === 'build' || mode === 'build', pause: true },
  { t: '<b>Masa</b>’yı seç.', el: '.tile[data-arg=table]', done: () => mode === 'build' && buildType === 'table', pause: true },
  { t: 'Masa yeşilse yer uygun. <b>✓ Koy</b>’a bas. İstersen önce sürükleyip yerini değiştir.', el: '#abOk', done: () => tables() >= 2, pause: true },
  { t: 'Süper! <b>✕</b> ile bitir.', el: '#abCancel', done: () => mode === 'none' && sheet !== 'build', pause: true },
  { t: 'Barista kahve yaparken <b>bara dokun</b>, sipariş hızlanır!', world: () => at(busyBar()), done: () => (S.daily?.m.taps || 0) >= 1, skip: true },
  { t: 'Kalkan müşteriler bardak bırakır. <b>🧽 masaya dokun</b>, topla.', world: () => at(dirtyItem()), done: () => (S.daily?.m.cleans || 0) >= 1, skip: true },
  { t: 'Çekirdeğin bitmesin! Stok <b>burada</b>, dokununca alırsın.', el: '#stock', done: () => sheet === 'shop', skip: true },
  { t: 'Şu anki hedefin hep burada. Tamamla, <b>seviye atla</b>, yeni şeyler aç! 🎉', el: '#goalChip', next: true },
];
// rehber bittikten sonra, ilk kez gerektiği anda bir kere çıkan ipuçları
const TIPS = [
  { id: 'beans', when: () => beanStock() < 40, t: '🫘 Çekirdek azalıyor! <b>Stok</b> kutusuna dokunup çekirdek al.', el: '#stock' },
  { id: 'queue', when: () => bars().some(b => b.queue.length >= 3), t: 'Sıra uzadı! <b>Bara dokunarak</b> hızlandır. İleride ikinci bar ve barista ekleyebilirsin.', world: () => at(bars().find(b => b.queue.length >= 3)) },
  { id: 'angry', when: () => B().today.angry > 0, t: '😠 Bir müşteri beklemekten sıkılıp gitti. Bara dokunarak hızlandır, sıra kısa kalsın.' },
  { id: 'dirty2', when: () => dirtyItem(), t: '🧽 Masada bardak kaldı. <b>Dokunarak topla</b>, kirli masaya kimse oturmaz.', world: () => at(dirtyItem()) },
  { id: 'select', when: () => items.length >= 4 && S.time > 11 * 60, t: '💡 Bir eşyaya <b>dokunursan</b> döndürebilir, taşıyabilir ya da satabilirsin.' },
  { id: 'night', when: () => S.phase === 'closing', t: '🌙 Dükkan kapandı. Gün sonu raporunda kazancını ve yarının havasını göreceksin.' },
  { id: 'lv2', when: () => level() >= 2, t: '👥 <b>Ekip</b> açıldı! Buradan barista ya da masaları toplayan komi işe al.', el: '#tabbar [data-sheet=staff]' },
  { id: 'lv3', when: () => level() >= 3, t: '👋 <b>Mahalle</b> açıldı: müdavimlerini ve yorumları buradan takip et.', el: '#tabbar [data-sheet=hood]' },
];

const card = $('coach'), finger = $('finger');
let lastTarget = null, pausedByUs = false, tip = null, tipUntil = 0;
function point(sel, worldPos) {
  const el = sel ? document.querySelector(sel) : null;
  if (el !== lastTarget) { lastTarget?.classList.remove('coach-target'); el?.classList.add('coach-target'); lastTarget = el; }
  let x, y, up = true;
  if (el && el.offsetParent !== null) {
    const r = el.getBoundingClientRect(); x = r.left + r.width / 2;
    if (r.top > innerHeight * 0.55) { y = r.top - 6; up = false; } else y = r.bottom + 6;
  } else if (worldPos) { const p = toScreen(worldPos); x = p.x; y = p.y - 8; up = false; }
  if (x == null) { finger.style.display = 'none'; return; }
  finger.textContent = up ? '👆' : '👇';
  finger.className = up ? 'up' : 'down';
  finger.style.left = x + 'px'; finger.style.top = y + 'px'; finger.style.display = 'block';
}
function hide() { card.style.display = 'none'; document.body.classList.remove('coach-on'); point(null); }
function showCard(html, k) {
  card.style.display = 'block'; document.body.classList.add('coach-on');
  if (card.dataset.k !== k) { card.innerHTML = html; card.dataset.k = k; }
}
function finish(ctx, reward) {
  S.tut = 'done'; hide();
  if (pausedByUs) { ctx.setSpeed(1); pausedByUs = false; }
  if (reward) { S.money += 300; addXP(10); confetti(40); }
  save();
}
let ctxRef = null;
export function updateTutorial(ctx) {
  ctxRef = ctx;
  const blocked = S.phase === 'report' || $('modal').style.display === 'flex';
  if (blocked) { hide(); return; }
  // ---- rehber ----
  if (S.tut !== 'done') {
    const k = S.tut || 0, st = STEPS[k];
    if (!st) return finish(ctx, true);
    if (!st.next && st.done(ctx)) { S.tut = k + 1; return updateTutorial(ctx); }
    if (st.pause && ctx.speed() > 0) { ctx.setSpeed(0); pausedByUs = true; }
    if (!st.pause && pausedByUs) { ctx.setSpeed(1); pausedByUs = false; }
    showCard(`<div class="coach-step">Rehber ${k + 1}/${STEPS.length}${st.pause ? ' · oyun duraklatıldı' : ''}</div><p>${st.t}</p><div class="coach-btns">
      <button class="btn sm" data-coach="skip">Rehberi geç</button>${st.next ? '<button class="btn sm primary" data-coach="next">Başla! (+300 ₺)</button>' : st.skip ? '<button class="btn sm" data-coach="next">Sonraki →</button>' : ''}</div>`, 's' + k);
    point(st.el, st.world?.());
    return;
  }
  // ---- anlık ipuçları ----
  if (tip && performance.now() > tipUntil) tip = null;
  if (!tip) {
    tip = TIPS.find(t => !S.tipsShown[t.id] && t.when());
    if (tip) { S.tipsShown[tip.id] = true; tipUntil = performance.now() + 9000; }
  }
  if (!tip) { hide(); return; }
  showCard(`<div class="coach-step">İpucu</div><p>${tip.t}</p><div class="coach-btns"><button class="btn sm primary" data-coach="ok">Anladım</button></div>`, 't' + tip.id);
  point(tip.el, tip.world?.());
}
card.addEventListener('click', e => {
  const b = e.target.closest('[data-coach]'); if (!b) return;
  const ctx = ctxRef;
  if (b.dataset.coach === 'skip') finish(ctx, false);
  else if (b.dataset.coach === 'ok') { tip = null; hide(); }
  else { const k = S.tut || 0; if (k >= STEPS.length - 1) finish(ctx, true); else S.tut = k + 1; card.dataset.k = ''; updateTutorial(ctx); }
});
