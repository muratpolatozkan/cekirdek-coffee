// Haritada kiralık dükkanların üstünde duran, dokununca kira kartını açan tabelalar
import { NU } from '../config.js';
import { B } from '../state.js';
import { fmt } from '../utils.js';
import { overlay } from './overlay.js';
import { toScreen } from '../engine/scene.js';
import { rentBlock, unitCenter, unitDeposit, isAdjacent } from '../sim/expand.js';
import { isUnlocked } from '../sim/progress.js';
import { mode } from './input.js';
import { showRentCard } from './modal.js';

const tags = [];
export function updatePlots() {
  const b = B();
  for (let u = 0; u < NU; u++) {
    let el = tags[u];
    const show = b.units[u] === 'rent' && mode === 'none';
    if (!show) { if (el) el.style.display = 'none'; continue; }
    if (!el) {
      el = tags[u] = document.createElement('button'); el.className = 'plot';
      el.addEventListener('click', e => { e.stopPropagation(); showRentCard(u); });
      overlay.appendChild(el);
    }
    const ok = !rentBlock(u), html = !isUnlocked('expand') ? '🔑 Kiralık<br><small>🔒 Seviye 2</small>'
      : !isAdjacent(u) ? '🔑 Kiralık<br><small>önce yandakini kirala</small>' : `🔑 Kiralık<br><b>${fmt(unitDeposit(u))}</b>`;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
    el.classList.toggle('ok', ok);
    el.style.display = '';
    // dükkan ekran dışındaysa tabela kenarda durur ve yönü gösterir
    const p = toScreen(unitCenter(u).setY(1.25)), m = 70;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 110;
    const x = Math.min(innerWidth - m, Math.max(m, p.x)), y = Math.min(innerHeight - 170, Math.max(top + 70, p.y));
    const dir = p.x > innerWidth - m ? 'right' : p.x < m ? 'left' : '';
    el.classList.toggle('edge', !!dir); el.dataset.dir = dir;
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
}
