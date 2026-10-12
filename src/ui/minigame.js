// Latte art mini oyunu: sütlü siparişte barın üstünde 🎨 çıkar; dokununca doğru anda durdurmaya çalışırsın
import { S, B } from '../state.js';
import { $ } from '../utils.js';
import { overlay, placeEl, floatText } from './overlay.js';
import { localToWorld } from '../sim/grid.js';
import { sparkle, thud } from '../audio.js';
import { track } from '../sim/progress.js';
import { haptic } from './toast.js';

const PATTERNS = ['💗 Kalp', '🌷 Lale', '🦢 Kuğu'];

const offers = new Map();   // bar -> { btn, c }
let game = null;
const box = $('artGame');

export function offerArt(bar, c) {
  if (offers.has(bar)) return;
  const btn = document.createElement('div'); btn.className = 'artbtn'; btn.textContent = '🎨 Latte art!';
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); openGame(bar); });
  overlay.appendChild(btn); offers.set(bar, { btn, c });
}
export function closeArt(bar) {
  const o = offers.get(bar); if (o) { o.btn.remove(); offers.delete(bar); }
  if (game && game.bar === bar) endGame(null);
}
export function closeAllArt() { for (const bar of [...offers.keys()]) closeArt(bar); if (game) endGame(null); }

function openGame(bar) {
  const o = offers.get(bar); if (!o || game) return;
  o.btn.remove(); offers.delete(bar);
  const wide = bar.barista?.trait === 'latte', zw = wide ? .3 : .18;
  const z0 = .05 + Math.random() * (.9 - zw);
  game = { bar, c: o.c, start: performance.now(), z0, zw, pw: zw * .3, pos: 0 };
  $('artZone').style.left = z0 * 100 + '%'; $('artZone').style.width = zw * 100 + '%';
  $('artPerfect').style.left = (z0 + zw / 2 - game.pw / 2) * 100 + '%'; $('artPerfect').style.width = game.pw * 100 + '%';
  const lv = Math.min(PATTERNS.length - 1, Math.floor((S.artStreak || 0) / 2));
  box.querySelector('b').textContent = `🎨 Sıradaki desen: ${PATTERNS[lv]}${S.artStreak ? ` · ${S.artStreak} seri` : ''}`;
  box.style.display = 'block';
}
function endGame(result) {
  box.style.display = 'none';
  const g = game; game = null;
  if (!g || !result) return;
  g.c.art = result;
  let label;
  // üst üste mükemmel yaptıkça desen zorlaşır ve memnuniyet artar
  if (result === 'perfect') {
    S.artStreak = (S.artStreak || 0) + 1; S.perfectArts++; B().today.arts++; track('arts'); sparkle(); haptic(20);
    const lv = Math.min(PATTERNS.length - 1, Math.floor((S.artStreak - 1) / 2));
    g.c.artLevel = lv; label = `${PATTERNS[lv]}! ${S.artStreak > 1 ? `(${S.artStreak} seri)` : ''}`;
  } else {
    S.artStreak = 0;
    if (result === 'bad') { thud(); haptic(40); }
    label = result === 'good' ? '🎨 Güzel' : '🎨 Dağıldı…';
  }
  floatText(label, localToWorld(g.bar, 0, 0.3).setY(1.2), result === 'bad' ? 'bad' : 'star');
}
box.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  if (!game) return;
  const p = game.pos, center = game.z0 + game.zw / 2;
  endGame(Math.abs(p - center) <= game.pw / 2 ? 'perfect' : p >= game.z0 && p <= game.z0 + game.zw ? 'good' : 'bad');
});
// her karede çağrılır (oyun duraklatılmış olsa da)
export function updateArt() {
  for (const [bar, o] of offers) placeEl(o.btn, localToWorld(bar, 0, 0).setY(1.15));
  if (!game) return;
  const t = (performance.now() - game.start) / 1000;
  if (t > 4.5) { endGame(null); return; }
  game.pos = (Math.sin(t * 2.8 - Math.PI / 2) + 1) / 2;
  $('artNeedle').style.left = game.pos * 100 + '%';
}
