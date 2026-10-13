// Haritada kiralık dükkanların üstünde duran, dokununca kira kartını açan tabelalar
import { NU, UD } from '../config.js';
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
    // tabela hep kiralık dükkanın vitrinindeki afişin üstünde durur; dükkan ekrandan çıkınca o da çıkar
    const p = toScreen(unitCenter(u).setZ(UD).setY(1.3));
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
}
