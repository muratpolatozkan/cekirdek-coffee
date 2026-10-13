// Üst çubuk, alt sekme rozetleri ve geniş ekrandaki takip kutusu
import { DRINKS, HOODS, EVENTS, PEVENTS, OPEN } from '../config.js';
import { S, B, meta } from '../state.js';
import { $, fmt, hhmm } from '../utils.js';
import { rating, beanStock, season, weatherNow, unitDeposit } from '../sim/economy.js';
import { hasItem, atmosphere, bars, ownMinU, ownMaxU } from '../sim/grid.js';
import { insideCount } from '../sim/people.js';
import { GOALS } from '../sim/quests.js';
import { rushInfo } from '../sim/events.js';
import { levelProgress, isUnlocked, unlockLevel, dailyProgress } from '../sim/progress.js';

const SHORT = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
function badge(sheet, val) {
  const el = document.querySelector(`#tabbar [data-sheet="${sheet}"] .badge`);
  el.textContent = val === true ? '!' : val || '';
  el.classList.toggle('show', !!val);
}
export function refreshUI() {
  const b = B();
  $('brand').textContent = `${S.brand.icon} ${S.brand.name}${meta.stars ? ' ⭐' + meta.stars : ''}`;
  const m = $('money');
  m.textContent = '💰 ' + (innerWidth < 420 && Math.abs(S.money) >= 100000 ? SHORT.format(S.money) + ' ₺' : fmt(S.money));
  m.title = fmt(S.money); m.classList.toggle('neg', S.money < 0);
  $('rating').innerHTML = `<span style="color:var(--gold)">★</span> ${rating().toFixed(1)}`;
  const compact = innerWidth < 520;
  const W = weatherNow(), se = season();
  const status = S.phase === 'report' ? (compact ? ' 🔒' : ' · kapalı') : S.time < OPEN ? (compact ? ' ⏳' : ' · açılıyor') : S.phase === 'closing' ? (compact ? ' 🌙' : ' · kapanıyor') : '';
  $('clock').textContent = `${S.branches.length > 1 ? HOODS[b.hood].icon + ' ' : ''}${se.icon}${W.icon} ${compact ? 'G' : 'Gün '}${S.day} · ${hhmm(S.time)}${status}`;
  $('clock').title = `${se.name} · ${W.name} · Gün ${S.day}`;
  const ev = S.event ? EVENTS[S.event.id] : null, pe = S.pevent?.day === S.day ? PEVENTS[S.pevent.id] : null;
  const evEl = $('eventChip');
  const parts = [ev && [ev.icon, ev.name], pe && [pe.icon, `${pe.name} ${pe.from}:00`], S.buzz > 0 && ['🔥', 'Popüler']].filter(Boolean);
  const ri = rushInfo();
  evEl.classList.toggle('rush', !!ri);
  if (ri) { evEl.style.display = ''; evEl.textContent = `🏃 ${ri.count}/${ri.target} · ${ri.t} sn`; evEl.title = `Akın: ${ri.t} saniyede ${ri.target} servis`; }
  else {
    evEl.style.display = parts.length ? '' : 'none';
    evEl.textContent = compact ? parts.map(p => p[0]).join('') : parts.map(p => p.join(' ')).join(' · ');
    evEl.title = parts.map(p => p.join(' ')).join(' · ');
  }
  const lp = levelProgress(), dDone = S.daily ? S.daily.goals.filter(g => g.done).length : 0, dAll = S.daily?.goals.length || 0;
  $('levelPill').innerHTML = `🏅 ${lp.l}${dAll ? `<small>🎯${dDone}/${dAll}</small>` : ''}<i style="width:${Math.round(lp.pct * 100)}%"></i>`;
  $('levelPill').title = `Seviye ${lp.l} · ${lp.cur}/${lp.need} XP`;
  for (const t of ['staff', 'hood']) {
    const btn = document.querySelector(`#tabbar [data-sheet="${t}"]`), locked = !isUnlocked('tab:' + t);
    btn.classList.toggle('locked', locked); btn.dataset.lock = locked ? unlockLevel('tab:' + t) : '';
  }
  const bs = beanStock(), milkOn = Object.keys(DRINKS).some(k => S.menu[k].on && DRINKS[k].milk);
  const lowBeans = bs < 25, lowMilk = milkOn && b.milk < 10;
  $('stock').innerHTML = `🫘<span class="${lowBeans ? 'low' : ''}">${bs}</span>${milkOn ? ` 🥛<span class="${lowMilk ? 'low' : ''}">${b.milk}</span>` : ''}${hasItem('vitrin') ? ` 🥐${b.croissant}` : ''}`;
  // rozetler: dikkat isteyen şeyler
  const baristas = b.staff.filter(s => s.role === 'barista').length;
  badge('staff', isUnlocked('tab:staff') && (baristas < bars().length || b.staff.some(s => s.fatigue > 85 || (!s.owner && s.morale < 25))));
  badge('shop', lowBeans || lowMilk);
  badge('hood', isUnlocked('seg:hood:istek') ? b.quests.length : 0);
  const rentable = isUnlocked('expand') && [ownMinU - 1, ownMaxU + 1].some(u => b.units[u] === 'rent' && S.money >= unitDeposit(u));
  badge('more', rentable);
  // şu anki hedef: önce bitmemiş günlük hedef, yoksa sıradaki büyük hedef
  const dg = S.daily?.goals.find(g => !g.done), big = GOALS.find(g => !S.goalsDone.includes(g.id)), gc = $('goalChip');
  if (dg) { const v = dailyProgress(dg); gc.innerHTML = `🎯 ${dg.text} <b>${v}/${dg.target}</b><i style="width:${Math.round(v / dg.target * 100)}%"></i>`; }
  else if (big) gc.innerHTML = `🏆 ${big.text} <b>+${fmt(big.reward)}</b>`;
  gc.style.display = dg || big ? '' : 'none';
  document.documentElement.style.setProperty('--top-h', $('topbar').offsetHeight + 'px');
  // geniş ekran takip kutusu
  const T = b.today, next = GOALS.filter(g => !S.goalsDone.includes(g.id)).slice(0, 3);
  $('tracker').innerHTML = `<b>Bugün</b>
    <div class="g">Ciro <span>${fmt(T.revenue + T.foodRev + T.tips)}</span> · Servis <span>${T.served}</span> · Kaçan <span>${T.angry + T.turned + T.refused}</span></div>
    <div class="g">İçeride <span>${insideCount()}</span> · Atmosfer <span>${atmosphere()}</span>${b.todayRegulars.length ? ` · Müdavim <span>${b.todayRegulars.length}</span>` : ''}</div>
    <b style="display:block;margin-top:6px">🎯 Sıradaki hedefler</b>${next.map(g => `<div class="g"><span>${g.text}</span> · +${fmt(g.reward)}</div>`).join('') || '<div class="g">Hepsi tamam! 🎉</div>'}`;
}
