// Sol paneldeki sekmeler ve butonların yaptığı işler
import { DRINKS, BEANS, FOOD, BAG, MILK_PACK, MILK_PACK_COST, TYPES, TRAITS, HOODS, NEIGHBORS, PEVENTS, ROASTS, SWEET, WALL_COLORS, FLOORS,
  WALL_DECOR, BRAND_COLORS, BRAND_ICONS, WALL_COST, FLOOR_COST, TERRACE_COST, TERRACE_FEE, LOYALTY_CARD_COST, AUTO_SUPPLY_COST, NU, UW } from '../config.js';
import { S, B, save, meta, wipeSave } from '../state.js';
import { $, fmt, starStr, esc, clamp } from '../utils.js';
import { toast, note } from './toast.js';
import { refreshUI } from './hud.js';
import { hideModal, getLastPhoto } from './modal.js';
import { takePhoto } from './photo.js';
import { setMusic } from '../audio.js';
import { rating, fairPrice, cupCost, beanPrice, machineCost, adsCost, trainCost, spend, unitRent, unitDeposit, rentOf, wagesOf, fairWage, netWorth } from '../sim/economy.js';
import { hasItem, atmosphere, atmPerUnit, ownMinU, ownMaxU, recomputeBounds, refreshVitrin, bars, ownedCountOf } from '../sim/grid.js';
import { assignBaristas, syncWorkers } from '../sim/staff.js';
import { startDay } from '../sim/day.js';
import { GOALS, questProblem, completeQuest } from '../sim/quests.js';
import { rivalName, rivalShare, rivalOpen } from '../sim/rival.js';
import { canOpenBranch, availableHoods, openBranch, switchBranch, canFranchise, franchiseStars, franchise } from '../sim/branches.js';
import { buildUnits, refreshMenuBoard, wallSlots } from '../world/units.js';
import { setMode } from './input.js';

export let tab = null;
let lastHtml = '', decorPick = 'tablo';
const panel = $('panel');
const dis = cost => S.money < cost ? 'disabled' : '';
const meter = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const traitTag = t => t ? ` <span class="tag gray" title="${TRAITS[t].desc}">${TRAITS[t].icon} ${TRAITS[t].name}</span>` : '';

const PANELS = {
  staff() {
    const b = B(), nb = bars().length, nBar = b.staff.filter(s => s.role === 'barista').length;
    let h = `<h3>👥 Personel</h3><p class="note">Her espresso barın başında bir barista olmalı. Komiler kirli masaları toplar. Yoğun çalışan barista yorulur ve molaya çıkar. Adil maaş alamayanın morali düşer, düşük moralli çalışan istifa edebilir.</p>`;
    if (nBar < nb) h += `<p class="warnp">⚠️ ${nb - nBar} bar boşta, barista işe al.</p>`;
    if (nBar > nb) h += `<p class="warnp">⚠️ ${nBar - nb} barista boşta. Yeni bir espresso bar koyabilirsin.</p>`;
    for (const s of b.staff) {
      const fair = fairWage(s), under = !s.owner && s.wage < fair;
      h += `<div class="row"><div>${s.role === 'barista' ? '☕' : '🧹'} <b>${esc(s.name)}</b>${s.owner ? ' <span class="tag">patron</span>' : s.manager ? ' <span class="tag">müdür</span>' : ''}${traitTag(s.trait)}
        <small>Hız ${s.speed.toFixed(2)}× · Güler yüz ${s.charm.toFixed(2)} · Sv ${s.lvl}${s.breakT > 0 ? ' · ☕ molada' : ''}<br>
        Yorgunluk ${meter(s.fatigue, s.fatigue > 70 ? 'bad' : s.fatigue > 45 ? 'warn' : '')}${s.owner ? '' : `Moral ${meter(s.morale, s.morale < 30 ? 'bad' : s.morale < 55 ? 'warn' : '')}`}
        ${s.owner ? 'maaş yok' : `${fmt(s.wage)} / gün${under ? ` <span class="bad">(adil: ${fmt(fair)})</span>` : ''}`}</small></div>
        <div class="btns">${s.lvl < 5 ? `<button data-act="train" data-arg="${s.id}" ${dis(trainCost(s))}>Eğit ${fmt(trainCost(s))}</button>` : ''}
        ${s.owner ? '' : `<button data-act="raise" data-arg="${s.id}">Zam +%10</button><button data-act="fire" data-arg="${s.id}">Çıkar</button>`}</div></div>`;
    }
    h += `<h3>Adaylar <small>· her sabah yenilenir</small></h3>`;
    if (!b.candidates.length) h += `<p class="note">Bugünlük başka aday yok.</p>`;
    for (const c of b.candidates) h += `<div class="row"><div>${c.role === 'barista' ? '☕' : '🧹'} <b>${esc(c.name)}</b>${traitTag(c.trait)}
      <small>${c.role === 'barista' ? 'Barista' : 'Komi'} · Hız ${c.speed.toFixed(2)}× · Güler yüz ${c.charm.toFixed(2)}<br>${fmt(c.wage)} / gün</small></div>
      <div class="btns"><button class="primary" data-act="hire" data-arg="${c.id}">İşe al</button></div></div>`;
    return h;
  },
  menu() {
    let h = `<h3>📋 Menü ve fiyatlar</h3><p class="note">Adil fiyatın üstüne çıkarsan müşteri memnuniyetsizleşir, bazıları vazgeçer. Altında kalırsan daha çok kişi uğrar. Adil fiyat çekirdek kalitesi ve puanınla birlikte yükselir.</p>`;
    const row = (id, d) => {
      const m = S.menu[id];
      if (!m.on) return `<div class="row"><div>${d.icon} ${d.name}<small>${d.desc ? d.desc + ' · ' : ''}${d.base}₺ · ${d.beans ? d.beans + ' doz çekirdek' : 'çekirdeksiz'}${d.milk ? ' + süt' : ''} · ${d.time} sn</small></div>
        <div class="btns"><button data-act="unlock" data-arg="${id}" ${dis(d.cost)}>Ekle ${fmt(d.cost)}</button></div></div>`;
      const fair = fairPrice(id), r = m.price / fair;
      const likes = d.likes ? Object.entries(d.likes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => TYPES[t].icon).join('') : '';
      return `<div class="row"><div>${d.icon} <b>${d.name}</b>${d.season ? ` <span class="tag gray">${d.season}</span>` : ''}
        <small>Maliyet ~${fmt(cupCost(id))} · Adil ~<span class="${r > 1.1 ? 'bad' : r < .95 ? 'good' : ''}">${fmt(fair)}</span>${likes ? ` · Sevenler ${likes}` : ''}</small>
        ${d.sig ? `<small>Tatlılık: <span class="seg">${SWEET.map((sw, k) => `<button class="${m.sweet === k ? 'active' : ''}" data-act="sweet" data-arg="${id}:${k}">${sw}</button>`).join('')}</span></small>` : ''}</div>
        <div class="btns"><button data-act="price" data-arg="${id}:-5">−</button><span class="price">${m.price}₺</span><button data-act="price" data-arg="${id}:5">+</button></div></div>`;
    };
    for (const [id, d] of Object.entries(DRINKS)) if (!d.sig) h += row(id, d);
    h += `<h3>✨ İmza tarifler <small>· mahalleye özel</small></h3><p class="note">Yerel tarifler bazı müşteri tiplerini çok mutlu eder. Tatlılığı müşterilerine göre ayarla: öğrenciler tatlı sever, kahve tutkunları sevmez.</p>`;
    for (const [id, d] of Object.entries(DRINKS)) if (d.sig) h += row(id, d);
    if (hasItem('vitrin')) h += `<h3>🥐 Yiyecek</h3><div class="row"><div>🥐 <b>Kruvasan</b><small>Maliyet ${fmt(FOOD.cost)} · Kahvenin yanında satılır</small></div>
      <div class="btns"><button data-act="foodprice" data-arg="-5">−</button><span class="price">${S.foodPrice}₺</span><button data-act="foodprice" data-arg="5">+</button></div></div>`;
    else h += `<p class="note" style="margin-top:8px">🥐 Kruvasan satmak için bir <b>Pasta Vitrini</b> koy.</p>`;
    return h;
  },
  stock() {
    const b = B(), roast = hasItem('roaster');
    let h = `<h3>🫘 Çekirdek</h3><p class="note">Seçili çekirdek bütün içeceklerde kullanılır. Fiyatlar kahve borsasına göre her gün değişir.${roast ? ' Kendi kavurduğun taze çekirdek +0.4 kalite verir.' : ''}</p>`;
    for (const [id, bn] of Object.entries(BEANS)) {
      const st = b.beans[id], active = b.activeBean === id, p = beanPrice(id), trend = S.market[id] / (S.marketPrev[id] || 1);
      const arrow = trend > 1.03 ? '<span class="bad">▲</span>' : trend < .97 ? '<span class="good">▼</span>' : '';
      if (id === 'geisha' && !S.geisha) { h += `<div class="row"><div>🔒 ${bn.name}<small>Puanın ⭐4.3 olunca (4. günden sonra) tedarikçi açılır.</small></div></div>`; continue; }
      h += `<div class="row"><div><b>${bn.name}</b>${active ? ' <span class="tag">kullanılıyor</span>' : ''}
        <small>${bn.note} · Kalite ${bn.q.toFixed(1)} · ${p.toFixed(1)} ₺/doz ${arrow}<br>Stok: <b class="${active && st.r + st.h < 25 ? 'low' : ''}">${st.r + st.h}</b> doz${st.h ? ` (taze ${st.h})` : ''}${roast ? ` · çiğ ${st.g}` : ''}</small></div>
        <div class="btns">${active ? '' : `<button data-act="bean" data-arg="${id}">Kullan</button>`}
        <button data-act="buyR" data-arg="${id}" ${dis(Math.round(p * BAG))}>+${BAG} ${fmt(p * BAG)}</button>
        ${roast ? `<button data-act="buyG" data-arg="${id}" ${dis(Math.round(p * BAG * .55))}>+${BAG} çiğ ${fmt(p * BAG * .55)}</button>` : ''}</div></div>`;
    }
    if (roast) h += `<h3>🔥 Kavurma profili</h3><p class="note">Sadece kendi kavurduğun çekirdekte etkilidir. Kahve tutkunları ve turistler açık, emekliler ve ofis çalışanları koyu kavrum sever.</p>
      <div class="seg">${Object.entries(ROASTS).map(([k, n]) => `<button class="${b.roast === k ? 'active' : ''}" data-act="roast" data-arg="${k}">${n}</button>`).join('')}</div>`;
    h += `<h3>🥛 Süt</h3><div class="row"><div>Süt<small>Sütlü içecekler için · Stok: <b class="${b.milk < 10 ? 'low' : ''}">${b.milk}</b></small></div>
      <div class="btns"><button data-act="milk" ${dis(MILK_PACK_COST)}>+${MILK_PACK} ${fmt(MILK_PACK_COST)}</button></div></div>`;
    if (hasItem('vitrin')) h += `<h3>🥐 Kruvasan</h3><div class="row"><div>Bugünkü stok: <b>${b.croissant}</b><small>Satılmayanlar gün sonunda çöpe gider. Her sabah otomatik sipariş:</small></div>
      <div class="btns"><button data-act="corder" data-arg="-2">−</button><span class="price">${b.croissantOrder}</span><button data-act="corder" data-arg="2">+</button>
      <button data-act="croissant" ${dis(10 * FOOD.cost)}>+10 şimdi ${fmt(10 * FOOD.cost)}</button></div></div>`;
    h += `<p class="note" style="margin-top:8px">${S.autoSupply ? '🚚 Otomatik tedarik açık: çekirdek ve süt azalınca %10 farkla kendiliğinden sipariş verilir.' : '🚚 Otomatik tedarik, Geliştir panelinden alınabilir.'}</p>`;
    return h;
  },
  upgrades() {
    const b = B();
    let h = `<h3>⬆️ Geliştirmeler</h3>`;
    h += `<div class="row"><div>⚙️ <b>Espresso makinesi</b> · Sv ${b.machine}/5<small>Bu şubedeki bütün içecekler %15 daha hızlı hazırlanır</small></div>
      <div class="btns">${b.machine < 5 ? `<button data-act="up" data-arg="machine" ${dis(machineCost())}>${fmt(machineCost())}</button>` : '<small>MAKS</small>'}</div></div>`;
    h += `<div class="row"><div>📣 <b>Sosyal medya</b> · Sv ${S.ads}/5<small>Bütün şubelerde caddeye daha çok kişi gelir, içeri girme ihtimali artar</small></div>
      <div class="btns">${S.ads < 5 ? `<button data-act="up" data-arg="ads" ${dis(adsCost())}>${fmt(adsCost())}</button>` : '<small>MAKS</small>'}</div></div>`;
    h += `<div class="row"><div>⛱️ <b>Teras izni</b><small>Dükkanın önündeki kaldırıma masa koyabilirsin. Güneşli havada müşteriler terası sever. Günlük ${fmt(TERRACE_FEE)} belediye harcı.</small></div>
      <div class="btns">${b.terrace ? '<small>✔ Açık</small>' : `<button data-act="up" data-arg="terrace" ${dis(TERRACE_COST)}>${fmt(TERRACE_COST)}</button>`}</div></div>`;
    h += `<div class="row"><div>💳 <b>Sadakat kartı</b><small>Müdavimler daha hızlı bağlanır, rakibe karşı +%15 avantaj</small></div>
      <div class="btns">${S.loyaltyCard ? '<small>✔ Aktif</small>' : `<button data-act="up" data-arg="loyalty" ${dis(LOYALTY_CARD_COST)}>${fmt(LOYALTY_CARD_COST)}</button>`}</div></div>`;
    h += `<div class="row"><div>🚚 <b>Otomatik tedarik</b><small>Çekirdek ve süt bitmeden kendiliğinden sipariş verilir (%10 fark)</small></div>
      <div class="btns">${S.autoSupply ? '<small>✔ Aktif</small>' : `<button data-act="up" data-arg="auto" ${dis(AUTO_SUPPLY_COST)}>${fmt(AUTO_SUPPLY_COST)}</button>`}</div></div>`;
    h += `<h3>✨ Atmosfer</h3><p class="note">Toplam ${atmosphere()} · dükkan başına ${atmPerUnit().toFixed(1)}. Bitki, raf, koltuk, pikap ve duvar dekorları atmosferi artırır. Atmosfer arttıkça müşteri ve memnuniyet de artar.</p>`;
    return h;
  },
  street() {
    const b = B(), H = HOODS[b.hood];
    let h = `<h3>${H.icon} ${H.name}</h3><p class="note">${H.desc} Yanındaki dükkan kiralık olunca kiralayıp duvarı yıkabilirsin.</p>`;
    b.units.forEach((st, u) => {
      const U = H.units[u], adj = u === ownMinU - 1 || u === ownMaxU + 1;
      if (st === 'own') h += `<div class="row"><div>✅ <b>${u === 1 ? 'İlk dükkanın' : 'Ek alan'}</b><small>Kira ${fmt(unitRent(u))} / gün</small></div></div>`;
      else if (st === 'occupied') h += `<div class="row"><div>${NEIGHBORS[U.kind].icon} <b>${NEIGHBORS[U.kind].name}</b><small>${U.hint}</small></div></div>`;
      else h += `<div class="row"><div>🔑 <b>Kiralık dükkan</b><small>Depozito ${fmt(unitDeposit(u))} · Kira ${fmt(unitRent(u))} / gün${adj ? '' : '<br>Önce aradaki dükkanı kiralamalısın.'}</small></div>
        <div class="btns"><button class="primary" data-act="rent" data-arg="${u}" ${adj ? dis(unitDeposit(u)) : 'disabled'}>Kirala</button></div></div>`;
    });
    h += `<p class="note" style="margin-top:8px">Günlük sabit gider: kira ${fmt(rentOf())} + maaşlar ${fmt(wagesOf())} = <b>${fmt(rentOf() + wagesOf())}</b></p>`;
    h += `<h3>🏙️ Şubeler</h3>`;
    S.branches.forEach((br, k) => {
      const HB = HOODS[br.hood], last = br.histNet[br.histNet.length - 1];
      h += `<div class="row"><div>${HB.icon} <b>${HB.name}</b>${k === S.activeBranch ? ' <span class="tag">buradasın</span>' : ''}
        <small>${ownedCountOf(br)} dükkan · ⭐ ${rating(br).toFixed(1)}${last != null ? ` · son gün ${fmt(last)}` : ''}</small></div>
        <div class="btns">${k === S.activeBranch ? '' : `<button data-act="switch" data-arg="${k}">Şubeye git</button>`}</div></div>`;
    });
    if (S.branches.length > 1) h += `<p class="note">Başında olmadığın şubeler, son günlerinin ortalama kârının %85’ini kendiliğinden kazanır.</p>`;
    const hoods = availableHoods();
    if (hoods.length) {
      h += `<h3>Yeni şube <small>· ${canOpenBranch() ? 'açabilirsin' : 'her şubende en az 3 dükkan olmalı'}</small></h3>`;
      for (const hd of hoods) { const HH = HOODS[hd]; h += `<div class="row"><div>${HH.icon} <b>${HH.name}</b><small>${HH.desc}</small></div>
        <div class="btns"><button class="primary" data-act="openBranch" data-arg="${hd}" ${canOpenBranch() ? dis(HH.open) : 'disabled'}>Aç ${fmt(HH.open)}</button></div></div>`; }
    }
    h += `<h3>⭐ Franchise</h3><p class="note">Markanı franchise yapıp her şeyi satarsın ve baştan başlarsın. Kazandığın yıldızlar kalıcıdır: her yıldız +1.000 ₺ başlangıç parası, +%5 yaya ve +%3 adil fiyat verir. (Şu an ${meta.stars} yıldızın var. Şart: 3 şube ya da 100.000 ₺ servet.)</p>
      <div class="row"><div>Servetin: <b>${fmt(netWorth())}</b>${canFranchise() ? `<small>Kazanacağın yıldız: <b>${franchiseStars()}</b></small>` : ''}</div>
      <div class="btns"><button data-act="franchise" ${canFranchise() ? '' : 'disabled'}>Franchise yap</button></div></div>`;
    return h;
  },
  hood() {
    const b = B();
    let h = `<h3>👋 Müdavimler</h3><p class="note">Her gün belli saatte gelirler. Mutlu ettikçe sadakatleri artar, 80’i geçince arkadaşlarını getirirler, 90’da sana sürpriz yaparlar. Kızarlarsa giderler.</p>`;
    for (const r of b.regulars) {
      const lost = r.status === 'lost';
      h += `<div class="row"><div>${r.emoji} <b>${esc(r.name)}</b>${lost ? ' <span class="tag red">gelmiyor</span>' : r.loyalty >= 80 ? ' <span class="tag">sadık</span>' : ''}
        <small>${esc(r.story)}<br>Sever: ${DRINKS[r.fav].name}${S.menu[r.fav].on ? '' : ' <span class="bad">(menüde yok!)</span>'} · ${String(Math.floor(r.hour)).padStart(2, '0')}:${String(Math.round(r.hour % 1 * 60)).padStart(2, '0')} civarı · ${r.visits} ziyaret</small>
        ${meter(r.loyalty, r.loyalty < 30 ? 'bad' : r.loyalty < 55 ? 'warn' : '')}</div></div>`;
    }
    h += `<h3>📬 Mahalle istekleri</h3>`;
    if (!b.quests.length) h += `<p class="note">Şu an bekleyen istek yok. Birkaç günde bir yeni istek gelir.</p>`;
    for (const q of b.quests) {
      const prob = questProblem(q), left = q.expires - S.day;
      h += `<div class="row"><div>${q.icon} <b>${esc(q.from)}</b><small>${esc(q.text)}<br>${left > 0 ? `${left + 1} gün kaldı` : 'Bugün son gün'}${prob && !q.auto ? ` · <span class="bad">${prob}</span>` : ''}</small></div>
        <div class="btns">${q.auto ? '<small>Otomatik</small>' : `<button class="primary" data-act="quest" data-arg="${q.id}" ${prob ? 'disabled' : ''}>Tamamla</button>`}</div></div>`;
    }
    const rv = b.rival, rn = rivalName();
    h += `<h3>🏪 Rakip: ${rn}</h3>`;
    if (rv.closed) h += `<p class="note">🎉 ${rn} kapandı. Mahallenin kahvecisi sensin!</p>`;
    else if (!rv.active) h += `<p class="note">Sokağın köşesindeki binada “YAKINDA” yazıyor… Birkaç gün içinde açılacak gibi.</p>`;
    else { const share = rivalShare(); h += `<p class="note">Puanları ⭐${rv.rating.toFixed(1)}${rv.promo > 0 ? ' · şu an %30 indirimdeler' : ''}. Senin puanın, fiyatların, atmosferin ve sosyal medyan payını belirler. Payın uzun süre yüksek kalırsa kapanırlar.</p>
      <div class="row"><div>Tahmini müşteri payın: <b>%${Math.round(share * 100)}</b>${meter(share * 100, share < .45 ? 'bad' : share < .55 ? 'warn' : '')}</div><div>Dayanıklılıkları<br>${meter(rv.health, 'bad')}</div></div>`; }
    h += `<h3>🎉 Etkinlik düzenle</h3><p class="note">Günde bir etkinlik düzenleyebilirsin. Bugün için, başlama saatinden önce ayarlaman gerekir.</p>`;
    const cur = S.pevent && S.pevent.day >= S.day ? S.pevent : null;
    if (cur) h += `<p class="warnp">${PEVENTS[cur.id].icon} ${PEVENTS[cur.id].name} · ${cur.day === S.day ? 'bugün' : 'yarın'} ${PEVENTS[cur.id].from}:00–${PEVENTS[cur.id].to}:00</p>`;
    for (const [id, E] of Object.entries(PEVENTS)) {
      const todayOk = !cur && S.phase !== 'report' && S.time < E.from * 60;
      h += `<div class="row"><div>${E.icon} <b>${E.name}</b><small>${E.desc} · ${E.from}:00–${E.to}:00 · ${E.cost ? fmt(E.cost) : 'ücretsiz'}</small></div>
        <div class="btns"><button data-act="pevent" data-arg="${id}:0" ${todayOk ? dis(E.cost) : 'disabled'}>Bugün</button><button data-act="pevent" data-arg="${id}:1" ${cur ? 'disabled' : dis(E.cost)}>Yarın</button></div></div>`;
    }
    return h;
  },
  reviews() {
    const b = B(), r = rating(), n = b.reviews.length;
    let h = `<h3>💬 Yorumlar</h3><div><span class="big">${r.toFixed(2)}</span> <span class="stars">${starStr(r)}</span><br><small class="note">${n} yorum. Puanda yeni yorumlar daha ağır basar. Puan, kaç kişinin içeri gireceğini doğrudan etkiler.</small></div>`;
    if (!n) h += `<p class="note">Henüz yorum yok.</p>`;
    for (const rv of b.reviews.slice(0, 30)) h += `<div class="rev"><span class="stars">${starStr(rv.stars)}</span> <span class="who">${rv.icon} ${esc(rv.who)} · Gün ${rv.day}</span><p>${esc(rv.text)}</p></div>`;
    return h;
  },
  stats() {
    const hist = S.history.slice(-30);
    let h = `<h3>📊 İstatistikler</h3>`;
    if (hist.length >= 2) {
      const W = 340, Hh = 130, pad = 8, vals = hist.flatMap(x => [x.income, x.net]);
      const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
      const X = i => pad + i * (W - 2 * pad) / (hist.length - 1), Y = v => Hh - pad - (v - min) / (max - min) * (Hh - 2 * pad);
      const line = (k, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${hist.map((x, i) => `${X(i).toFixed(1)},${Y(x[k]).toFixed(1)}`).join(' ')}"/>`;
      h += `<svg class="chart" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="#d8cfc2" stroke-dasharray="4 4"/>${line('income', '#1f6f54')}${line('net', '#e0a100')}</svg>
        <div class="legend"><span><i style="background:#1f6f54"></i>Gelir</span><span><i style="background:#e0a100"></i>Net kâr</span><span>Son ${hist.length} gün · en iyi gün ${fmt(Math.max(...hist.map(x => x.income)))}</span></div>`;
    } else h += `<p class="note">Grafik için en az iki gün tamamlamalısın.</p>`;
    const bars = (obj, label) => {
      const ent = Object.entries(obj).sort((a, b) => b[1] - a[1]), tot = ent.reduce((a, [, v]) => a + v, 0) || 1, mx = ent[0]?.[1] || 1;
      return ent.map(([k, v]) => `<div class="barrow"><span>${label(k)}</span><div class="bar"><i style="width:${v / mx * 100}%"></i></div><b>%${Math.round(v / tot * 100)}</b></div>`).join('') || '<p class="note">Henüz veri yok.</p>';
    };
    h += `<h3>En çok satanlar</h3>${bars(S.sales, k => `${DRINKS[k]?.icon || ''} ${DRINKS[k]?.name || k}`)}`;
    h += `<h3>Müşteri tipleri</h3>${bars(S.typeCounts, k => `${TYPES[k]?.icon || ''} ${TYPES[k]?.name || k}`)}`;
    h += `<h3>Genel</h3><p class="note">Toplam ${S.served.toLocaleString('tr-TR')} servis · ${S.perfectArts} mükemmel latte art · ${S.eventsHeld} etkinlik · ${S.branches.length} şube</p>`;
    return h;
  },
  decor() {
    const b = B();
    let h = `<h3>🎨 Dekorasyon</h3><p class="note">Bu şubenin duvar rengini, zeminini ve duvar dekorlarını değiştir. Duvar dekorları atmosfer verir.</p>`;
    h += `<h3>Duvar rengi <small>· ${fmt(WALL_COST)}</small></h3><div class="swatches">${Object.entries(WALL_COLORS).map(([k, w]) =>
      `<button class="sw ${b.decor.wall === k ? 'on' : ''}" title="${w.name}" style="background:#${w.c.toString(16).padStart(6, '0')}" data-act="wall" data-arg="${k}"></button>`).join('')}</div>`;
    h += `<h3>Zemin <small>· ${fmt(FLOOR_COST)}</small></h3><div class="seg" style="flex-wrap:wrap">${Object.entries(FLOORS).map(([k, n]) =>
      `<button class="${b.decor.floor === k ? 'active' : ''}" data-act="floor" data-arg="${k}">${n}</button>`).join('')}</div>`;
    h += `<h3>Duvar dekorları</h3><p class="note">Önce bir dekor seç, sonra duvardaki boş yere koy.</p><div class="swatches">${Object.entries(WALL_DECOR).map(([k, d]) =>
      `<button class="sw ${decorPick === k ? 'on' : ''}" title="${d.name} · ${fmt(d.cost)} · atmosfer +${d.amb}" data-act="pick" data-arg="${k}">${d.icon}</button>`).join('')}</div>
      <p class="note">Seçili: <b>${WALL_DECOR[decorPick].name}</b> · ${fmt(WALL_DECOR[decorPick].cost)} · atmosfer +${WALL_DECOR[decorPick].amb}</p>`;
    for (let u = 0; u < NU; u++) {
      if (b.units[u] !== 'own') continue;
      wallSlots(u).forEach((_, k) => {
        const key = `${u}-${k}`, cur = b.decor.slots[key];
        h += `<div class="row"><div>${u === 1 ? 'İlk dükkan' : `${u + 1}. dükkan`} · duvar ${k + 1}<small>${cur ? `${WALL_DECOR[cur].icon} ${WALL_DECOR[cur].name}` : 'Boş'}</small></div>
          <div class="btns">${cur ? `<button data-act="slot" data-arg="${key}:">Kaldır</button>` : ''}<button data-act="slot" data-arg="${key}:${decorPick}" ${dis(WALL_DECOR[decorPick].cost)}>${cur ? 'Değiştir' : 'Koy'}</button></div></div>`;
      });
    }
    h += `<h3>🏷️ Marka</h3><div class="row"><div>Dükkan adı<small>Tabelada ve fotoğraflarda görünür</small></div>
      <div class="btns"><input type="text" id="brandName" maxlength="14" value="${esc(S.brand.name)}"><button data-act="brandName">Kaydet</button></div></div>
      <p class="note">Tabela rengi</p><div class="swatches">${Object.entries(BRAND_COLORS).map(([k, c]) => `<button class="sw ${S.brand.color === k ? 'on' : ''}" style="background:${c}" data-act="brandColor" data-arg="${k}"></button>`).join('')}</div>
      <p class="note">Logo</p><div class="swatches">${BRAND_ICONS.map(ic => `<button class="sw ${S.brand.icon === ic ? 'on' : ''}" data-act="brandIcon" data-arg="${ic}">${ic}</button>`).join('')}</div>`;
    return h;
  },
  goals() {
    let h = `<h3>🎯 Hedefler</h3>`;
    for (const g of GOALS) { const done = S.goalsDone.includes(g.id); h += `<div class="row"><div>${done ? '✅' : '⬜'} ${g.text}</div><div class="btns"><small class="${done ? 'good' : ''}">+${fmt(g.reward)}</small></div></div>`; }
    return h;
  },
  settings() {
    return `<h3>⚙️ Ayarlar</h3>
      <div class="row"><div>Ses efektleri<small>Kapı zili ve kasa sesi</small></div><div class="btns"><button data-act="sound">${S.sound ? '🔊 Açık' : '🔇 Kapalı'}</button></div></div>
      <div class="row"><div>Lo-fi müzik<small>Arka planda sakin kahveci müziği</small></div><div class="btns"><button data-act="music">${S.music ? '🎵 Açık' : '🔇 Kapalı'}</button></div></div>
      <div class="row"><div>Latte art mini oyunu<small>Sütlü siparişlerde 🎨 butonu çıksın</small></div><div class="btns"><button data-act="art">${S.latteArt ? '🎨 Açık' : 'Kapalı'}</button></div></div>
      <div class="row"><div>Kısayollar<small>R: döndür · Esc: iptal · S: sat · M: taşı · 1–9: eşya seç · P: fotoğraf · Boşluk: duraklat · Sürükle: kaydır · Tekerlek / iki parmak: yakınlaştır</small></div></div>
      <div class="row"><div>Oyunu sıfırla<small>Bütün ilerleme silinir (franchise yıldızları kalır)</small></div><div class="btns"><button data-act="reset">🔄 Sıfırla</button></div></div>`;
  },
};

export function setTab(t) { tab = tab === t ? null : t; renderPanel(true); }
export function renderPanel(force) {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (!tab) { panel.style.display = 'none'; lastHtml = ''; return; }
  if (!force && panel.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  const html = PANELS[tab]();
  if (force || html !== lastHtml) { panel.innerHTML = html; lastHtml = html; }
  panel.style.display = 'block';
}

const staffById = id => B().staff.find(x => x.id === +id);
const ACT = {
  hire(id) {
    const b = B(), c = b.candidates.find(x => x.id === +id); if (!c) return;
    b.staff.push({ ...c, fatigue: 0, morale: 75, breakT: 0 }); b.candidates = b.candidates.filter(x => x !== c);
    assignBaristas(); syncWorkers(); toast(`👋 ${c.name} ekibe katıldı!`);
  },
  fire(id) {
    const s = staffById(id); if (!s || s.owner || !confirm(`${s.name} işten çıkarılsın mı?`)) return;
    B().staff = B().staff.filter(x => x !== s); assignBaristas(); syncWorkers();
  },
  train(id) {
    const s = staffById(id); if (!s || s.lvl >= 5 || !spend(trainCost(s))) return;
    s.lvl++; s.speed = +(s.speed + .08).toFixed(2); s.charm = +(s.charm + .08).toFixed(2); s.morale = clamp(s.morale + 10, 0, 100); assignBaristas();
    toast(`📚 ${s.name} eğitimi tamamladı (Sv ${s.lvl})`);
  },
  raise(id) { const s = staffById(id); if (!s) return; s.wage = Math.round(s.wage * 1.1 / 10) * 10; s.morale = clamp(s.morale + 15, 0, 100); toast(`💰 ${s.name} zammı duydu, morali yükseldi!`); },
  unlock(id) { if (!spend(DRINKS[id].cost)) return; S.menu[id].on = true; refreshMenuBoard(); toast(`${DRINKS[id].icon} ${DRINKS[id].name} menüye eklendi!`); },
  price(arg) { const [id, d] = arg.split(':'); S.menu[id].price = clamp(S.menu[id].price + +d, 10, 500); refreshMenuBoard(); },
  sweet(arg) { const [id, k] = arg.split(':'); S.menu[id].sweet = +k; },
  foodprice(d) { S.foodPrice = clamp(S.foodPrice + +d, 30, 300); },
  bean(id) { B().activeBean = id; toast(`🫘 Artık ${BEANS[id].name} kullanılıyor.`); },
  buyR(id) { if (spend(Math.round(beanPrice(id) * BAG), 'stock')) B().beans[id].r += BAG; },
  buyG(id) { if (spend(Math.round(beanPrice(id) * BAG * .55), 'stock')) B().beans[id].g += BAG; },
  roast(k) { B().roast = k; },
  milk() { if (spend(MILK_PACK_COST, 'stock')) B().milk += MILK_PACK; },
  croissant() { if (spend(10 * FOOD.cost, 'stock')) { B().croissant += 10; refreshVitrin(); } },
  corder(d) { B().croissantOrder = clamp(B().croissantOrder + +d, 0, 60); },
  up(k) {
    const b = B();
    if (k === 'machine' && b.machine < 5 && spend(machineCost())) { b.machine++; toast('⚙️ Espresso makinesi yükseltildi!'); }
    if (k === 'ads' && S.ads < 5 && spend(adsCost())) { S.ads++; toast('📣 Takipçi sayın arttı, caddeler hareketlendi!'); }
    if (k === 'auto' && !S.autoSupply && spend(AUTO_SUPPLY_COST)) { S.autoSupply = true; toast('🚚 Otomatik tedarik aktif.'); }
    if (k === 'loyalty' && !S.loyaltyCard && spend(LOYALTY_CARD_COST)) { S.loyaltyCard = true; toast('💳 Sadakat kartları dağıtıldı!'); }
    if (k === 'terrace' && !b.terrace && spend(TERRACE_COST)) { b.terrace = true; buildUnits(); setMode('none'); toast('⛱️ Teras açıldı! Kaldırıma masa, şemsiyeli masa ve bitki koyabilirsin.', 4500); }
  },
  rent(u) {
    u = +u; const b = B();
    if (b.units[u] !== 'rent' || !(u === ownMinU - 1 || u === ownMaxU + 1) || !spend(unitDeposit(u))) return;
    b.units[u] = 'own'; recomputeBounds(); buildUnits(); setMode('none');
    note('🔨 Duvar yıkıldı! Dükkanın büyüdü. Yeni alana eşya yerleştirebilirsin.', 4000);
  },
  switch(k) { switchBranch(+k); },
  openBranch(h) { openBranch(h); },
  franchise() {
    if (!canFranchise() || !confirm(`Markanı franchise yapıp ${franchiseStars()} yıldızla baştan başlamak istiyor musun? Şubeler, para ve eşyalar sıfırlanır.`)) return;
    franchise();
  },
  quest(id) { completeQuest(id); },
  pevent(arg) {
    const [id, tom] = arg.split(':'), E = PEVENTS[id];
    if (S.pevent && S.pevent.day >= S.day) return;
    if (!spend(E.cost)) return;
    S.pevent = { id, day: S.day + (+tom) }; S.eventsHeld++;
    toast(`${E.icon} ${E.name} ${+tom ? 'yarın' : 'bugün'} ${E.from}:00’da!`);
  },
  wall(k) { const b = B(); if (b.decor.wall === k || !spend(WALL_COST)) return; b.decor.wall = k; buildUnits(); },
  floor(k) { const b = B(); if (b.decor.floor === k || !spend(FLOOR_COST)) return; b.decor.floor = k; buildUnits(); },
  pick(k) { decorPick = k; },
  slot(arg) {
    const [key, kind] = arg.split(':'), b = B();
    if (!kind) { delete b.decor.slots[key]; buildUnits(); return; }
    if (!spend(WALL_DECOR[kind].cost)) return;
    b.decor.slots[key] = kind; buildUnits();
  },
  brandName() {
    const v = ($('brandName')?.value || '').trim().toLocaleUpperCase('tr-TR').slice(0, 14);
    if (!v) return; S.brand.name = v; buildUnits(); toast(`🏷️ Tabelan değişti: ${v}`);
  },
  brandColor(k) { S.brand.color = k; buildUnits(); },
  brandIcon(ic) { S.brand.icon = ic; buildUnits(); },
  sound() { S.sound = !S.sound; },
  music() { setMusic(!S.music); },
  art() { S.latteArt = !S.latteArt; },
  reset(arg) {
    if (arg !== 'force' && !confirm('Bütün ilerleme silinip oyun baştan başlasın mı? (Franchise yıldızların kalır.)')) return;
    wipeSave(); location.reload();
  },
  startDay() { startDay(); },
  closeIntro() { S.introSeen = true; S.news3 = true; hideModal(); save(); },
  closeNews() { S.news3 = true; hideModal(); save(); },
  closeModal() { hideModal(); },
  async sharePhoto() {
    try {
      const blob = await (await fetch(getLastPhoto())).blob();
      const file = new File([blob], 'cekirdek-coffee.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: S.brand.name + ' Coffee' });
      else await navigator.share({ title: S.brand.name + ' Coffee', url: location.href });
    } catch (e) {}
  },
  photo() { takePhoto(); },
};
function onAct(e) {
  const b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
  e.preventDefault();
  ACT[b.dataset.act]?.(b.dataset.arg);
  renderPanel(true); refreshUI(); save();
}
panel.addEventListener('pointerdown', onAct);
$('modal').addEventListener('pointerdown', onAct);
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
