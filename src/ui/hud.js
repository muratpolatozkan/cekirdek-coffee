// Üst çubuk, alt sekme rozetleri ve geniş ekrandaki takip kutusu
import { DRINKS, HOODS, EVENTS, PEVENTS, OPEN } from '../config.js';
import { S, B, meta } from '../state.js';
import { $, fmt, hhmm } from '../utils.js';
import { rating, beanStock, season, weatherNow, unitDeposit } from '../sim/economy.js';
import { hasItem, atmosphere, bars, ownMinU, ownMaxU } from '../sim/grid.js';
import { insideCount } from '../sim/people.js';
import { GOALS } from '../sim/quests.js';

function badge(sheet, val) {
  const el = document.querySelector(`#tabbar [data-sheet="${sheet}"] .badge`);
  el.textContent = val === true ? '!' : val || '';
  el.classList.toggle('show', !!val);
}
export function refreshUI() {
  const b = B();
  $('brand').textContent = `${S.brand.icon} ${S.brand.name}${meta.stars ? ' ⭐' + meta.stars : ''}`;
  const m = $('money'); m.textContent = '💰 ' + fmt(S.money); m.classList.toggle('neg', S.money < 0);
  $('rating').innerHTML = `<span style="color:var(--gold)">★</span> ${rating().toFixed(1)}`;
  const status = S.phase === 'report' ? ' · kapalı' : S.time < OPEN ? ' · açılıyor' : S.phase === 'closing' ? ' · kapanıyor' : '';
  const W = weatherNow(), se = season();
  $('clock').textContent = `${S.branches.length > 1 ? HOODS[b.hood].icon + ' ' : ''}${se.icon}${W.icon} Gün ${S.day} · ${hhmm(S.time)}${status}`;
  const ev = S.event ? EVENTS[S.event.id] : null, pe = S.pevent?.day === S.day ? PEVENTS[S.pevent.id] : null;
  const evEl = $('eventChip');
  const evText = [ev && `${ev.icon} ${ev.name}`, pe && `${pe.icon} ${pe.from}:00`, S.buzz > 0 && '🔥 Popüler'].filter(Boolean).join(' · ');
  evEl.style.display = evText ? '' : 'none'; evEl.textContent = evText;
  const bs = beanStock(), milkOn = Object.keys(DRINKS).some(k => S.menu[k].on && DRINKS[k].milk);
  const lowBeans = bs < 25, lowMilk = milkOn && b.milk < 10;
  $('stock').innerHTML = `🫘 <span class="${lowBeans ? 'low' : ''}">${bs}</span>${milkOn ? ` 🥛 <span class="${lowMilk ? 'low' : ''}">${b.milk}</span>` : ''}${hasItem('vitrin') ? ` 🥐 ${b.croissant}` : ''}`;
  // rozetler: dikkat isteyen şeyler
  const baristas = b.staff.filter(s => s.role === 'barista').length;
  badge('staff', baristas < bars().length || b.staff.some(s => s.fatigue > 85 || (!s.owner && s.morale < 25)));
  badge('shop', lowBeans || lowMilk);
  badge('hood', b.quests.length);
  const rentable = [ownMinU - 1, ownMaxU + 1].some(u => b.units[u] === 'rent' && S.money >= unitDeposit(u));
  badge('more', rentable);
  // geniş ekran takip kutusu
  const T = b.today, next = GOALS.filter(g => !S.goalsDone.includes(g.id)).slice(0, 3);
  $('tracker').innerHTML = `<b>Bugün</b>
    <div class="g">Ciro <span>${fmt(T.revenue + T.foodRev + T.tips)}</span> · Servis <span>${T.served}</span> · Kaçan <span>${T.angry + T.turned + T.refused}</span></div>
    <div class="g">İçeride <span>${insideCount()}</span> · Atmosfer <span>${atmosphere()}</span>${b.todayRegulars.length ? ` · Müdavim <span>${b.todayRegulars.length}</span>` : ''}</div>
    <b style="display:block;margin-top:6px">🎯 Sıradaki hedefler</b>${next.map(g => `<div class="g"><span>${g.text}</span> · +${fmt(g.reward)}</div>`).join('') || '<div class="g">Hepsi tamam! 🎉</div>'}`;
}
