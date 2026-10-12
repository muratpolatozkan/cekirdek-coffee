// Üst bilgi çubuğu, mağaza kartlarının durumu ve sağ üstteki takip kutusu
import { DRINKS, HOODS, WEATHER, EVENTS, PEVENTS, CATALOG, OPEN } from '../config.js';
import { S, B, meta } from '../state.js';
import { $, fmt, hhmm } from '../utils.js';
import { rating, beanStock, season, weatherNow } from '../sim/economy.js';
import { hasItem, atmosphere } from '../sim/grid.js';
import { insideCount } from '../sim/people.js';
import { GOALS } from '../sim/quests.js';
import { mode, buildType, moving } from './input.js';

export function refreshUI() {
  const b = B();
  $('brand').textContent = `${S.brand.icon} ${S.brand.name}${meta.stars ? ' ⭐' + meta.stars : ''}`;
  const m = $('money'); m.textContent = '💰 ' + fmt(S.money); m.classList.toggle('neg', S.money < 0);
  $('rating').innerHTML = `<span class="stars">★</span> ${rating().toFixed(1)}`;
  const status = S.phase === 'report' ? 'Kapalı' : S.time < OPEN ? 'Açılıyor' : S.phase === 'closing' ? 'Kapanıyor' : 'Açık';
  $('clock').textContent = `${S.branches.length > 1 ? HOODS[b.hood].icon + ' ' : ''}📅 Gün ${S.day} · ${hhmm(S.time)} · ${status}`;
  const W = weatherNow(), se = season();
  $('weather').textContent = `${se.icon} ${W.icon}`;
  $('weather').title = `${se.name} · ${W.name}`;
  const ev = S.event ? EVENTS[S.event.id] : null, pe = S.pevent?.day === S.day ? PEVENTS[S.pevent.id] : null;
  const evEl = $('eventChip');
  if (ev || pe || S.buzz > 0) {
    evEl.style.display = '';
    evEl.textContent = [ev && `${ev.icon} ${ev.name}`, pe && `${pe.icon} ${pe.from}:00`, S.buzz > 0 && '🔥 Popüler'].filter(Boolean).join(' · ');
  } else evEl.style.display = 'none';
  const bs = beanStock(), milkOn = Object.keys(DRINKS).some(k => S.menu[k].on && DRINKS[k].milk);
  $('stock').innerHTML = `🫘 <span class="${bs < 25 ? 'low' : ''}">${bs}</span>${milkOn ? ` · 🥛 <span class="${b.milk < 10 ? 'low' : ''}">${b.milk}</span>` : ''}${hasItem('vitrin') ? ` · 🥐 ${b.croissant}` : ''}`;
  const sid = se.id;
  document.querySelectorAll('#shop .card[data-type]').forEach(c => {
    const def = CATALOG[c.dataset.type];
    c.style.display = def.season && def.season !== sid ? 'none' : '';
    c.disabled = S.money < def.price;
    c.classList.toggle('active', mode === 'build' && buildType === c.dataset.type && !moving);
  });
  document.querySelectorAll('#shop .card[data-mode]').forEach(c => c.classList.toggle('active', mode === c.dataset.mode || (!!moving && c.dataset.mode === 'move')));
  const T = b.today, next = GOALS.filter(g => !S.goalsDone.includes(g.id)).slice(0, 3);
  const regToday = b.todayRegulars.length;
  $('tracker').innerHTML = `<b>Bugün</b>
    <div class="g">Ciro <span>${fmt(T.revenue + T.foodRev + T.tips)}</span> · Servis <span>${T.served}</span> · Kaçan <span>${T.angry + T.turned + T.refused}</span></div>
    <div class="g">İçeride <span>${insideCount()}</span> · Atmosfer <span>${atmosphere()}</span>${regToday ? ` · Müdavim <span>${regToday}</span>` : ''}</div>
    ${b.quests.length ? `<div class="g">📬 Bekleyen istek: <span>${b.quests.length}</span></div>` : ''}
    <b style="display:block;margin-top:6px">🎯 Sıradaki hedefler</b>${next.map(g => `<div class="g"><span>${g.text}</span> · +${fmt(g.reward)}</div>`).join('') || '<div class="g">Hepsi tamam! 🎉</div>'}`;
}
