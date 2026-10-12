// Alttan açılan sayfalar (mobilde bottom sheet, geniş ekranda sol panel) ve butonların yaptığı işler
import { DRINKS, BEANS, FOOD, BAG, MILK_PACK, MILK_PACK_COST, TYPES, TRAITS, HOODS, NEIGHBORS, PEVENTS, ROASTS, SWEET, WALL_COLORS, FLOORS, CATALOG,
  WALL_DECOR, BRAND_COLORS, BRAND_ICONS, WALL_COST, FLOOR_COST, TERRACE_COST, TERRACE_FEE, LOYALTY_CARD_COST, AUTO_SUPPLY_COST, NU } from '../config.js';
import { S, B, save, meta, wipeSave } from '../state.js';
import { $, fmt, starStr, esc, clamp } from '../utils.js';
import { toast, note, haptic } from './toast.js';
import { refreshUI } from './hud.js';
import { hideModal, getLastPhoto, showIntro } from './modal.js';
import { takePhoto } from './photo.js';
import { setMusic } from '../audio.js';
import { rating, fairPrice, cupCost, beanPrice, machineCost, adsCost, trainCost, spend, unitRent, unitDeposit, rentOf, wagesOf, fairWage, netWorth, season } from '../sim/economy.js';
import { hasItem, atmosphere, atmPerUnit, ownMinU, ownMaxU, recomputeBounds, refreshVitrin, bars, ownedCountOf, allSeats } from '../sim/grid.js';
import { assignBaristas, syncWorkers } from '../sim/staff.js';
import { startDay } from '../sim/day.js';
import { GOALS, questProblem, completeQuest } from '../sim/quests.js';
import { rivalName, rivalShare } from '../sim/rival.js';
import { canOpenBranch, availableHoods, openBranch, switchBranch, canFranchise, franchiseStars, franchise } from '../sim/branches.js';
import { buildUnits, refreshMenuBoard, wallSlots } from '../world/units.js';
import { setMode } from './input.js';

const SHEETS = {
  build: { title: '🛠️ İnşa', segs: [['oturma', '🪑 Oturma'], ['ekipman', '☕ Ekipman'], ['dekor', '🪴 Dekor'], ['arac', '✋ Taşı / Sat']] },
  staff: { title: '👥 Ekip', segs: [['ekip', 'Ekibim'], ['aday', 'Adaylar']] },
  shop: { title: '☕ Dükkan', segs: [['menu', '📋 Menü'], ['stok', '📦 Stok'], ['gelistir', '⬆️ Geliştir']] },
  hood: { title: '👋 Mahalle', segs: [['mudavim', 'Müdavimler'], ['istek', 'İstekler'], ['rakip', 'Rakip'], ['etkinlik', 'Etkinlik'], ['yorum', 'Yorumlar']] },
  more: { title: '☰ Daha fazla', segs: [['cadde', '🏠 Cadde'], ['dekor', '🎨 Dekor'], ['istatistik', '📊 İstatistik'], ['hedef', '🎯 Hedefler'], ['ayar', '⚙️ Ayarlar']] },
};
export let sheet = null;
const segOf = {};
let lastHtml = '', decorPick = 'tablo', holding = false;
const el = $('sheet'), bodyEl = $('sheetBody');

// ---- küçük yapı taşları ----
const item = ({ ic, t, s = '', ac = '', extra = '', col = false, dim = false }) =>
  `<div class="item${col ? ' col' : ''}${dim ? ' dim' : ''}">${ic ? `<div class="ic">${ic}</div>` : ''}<div class="bd"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}${extra}</div>${ac ? `<div class="ac">${ac}</div>` : ''}</div>`;
const btn = (act, arg, label, cls = '', disabled = false) => `<button class="btn sm ${cls}" data-act="${act}"${arg != null ? ` data-arg="${arg}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
const buy = (act, arg, label, cost, cls = 'primary') => btn(act, arg, label, cls, S.money < cost);
const meter = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const lvl = v => v > 70 ? 'bad' : v > 45 ? 'warn' : '';
const stepper = (act, minus, plus, val) => `<div class="stepper"><button data-act="${act}" data-arg="${minus}">−</button><b>${val}</b><button data-act="${act}" data-arg="${plus}">+</button></div>`;
const segctl = (act, opts, cur) => `<div class="segctl">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-arg="${v}">${l}</button>`).join('')}</div>`;
const stats = arr => `<div class="stats">${arr.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
const traitTag = t => t ? ` <span class="tag gray">${TRAITS[t].icon} ${TRAITS[t].name}</span>` : '';
const hhm = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round(h % 1 * 60)).padStart(2, '0')}`;

// ---- sayfa içerikleri ----
const BUILD_CATS = {
  oturma: [['table', 'stool', 'sofa', 'umbrella'], 'Müşteri oturacak yer bulamazsa memnuniyet düşer. Şemsiyeli masa sadece terasa konur ve yağmurda da açık kalır.'],
  ekipman: [['bar', 'vitrin', 'roaster', 'pikap', 'lamp'], 'Her espresso barın başında bir barista olmalı. Vitrin kruvasan satışını, kavurma makinesi taze çekirdeği açar.'],
  dekor: [['plant', 'tree', 'shelf', 'xmas'], 'Dekor atmosferi (✨) artırır. Atmosfer arttıkça daha çok müşteri girer ve memnuniyet yükselir.'],
};
const R = {
  build(sg) {
    const top = stats([[fmt(S.money), 'Bütçe'], [atmosphere() + ' ✨', 'Atmosfer'], [allSeats(false).length, 'Koltuk']]);
    if (sg === 'arac') return top + `<div class="grid">
      <button class="tile tool" data-act="tool" data-arg="move"><span class="e">✋</span><span class="n">Taşı</span><span class="p">ücretsiz</span></button>
      <button class="tile tool" data-act="tool" data-arg="sell"><span class="e">💸</span><span class="n">Sat</span><span class="p">%50 iade</span></button></div>
      <p class="note" style="margin-top:10px">Taşı: eşyaya dokun, sonra yeni yerine koy. Sat: eşyaya dokun, sonra onayla.</p>`;
    const [types, tip] = BUILD_CATS[sg], se = season().id;
    return top + `<div class="grid">${types.filter(t => !CATALOG[t].season || CATALOG[t].season === se).map(t => {
      const d = CATALOG[t], locked = d.terraceOnly && !B().terrace;
      return `<button class="tile" data-act="build" data-arg="${t}" ${S.money < d.price || locked ? 'disabled' : ''}>${d.amb ? `<span class="k">+${d.amb}✨</span>` : ''}
        <span class="e">${d.icon}</span><span class="n">${d.name}</span><span class="p">${locked ? 'Teras gerekli' : fmt(d.price)}</span></button>`;
    }).join('')}</div><p class="note" style="margin-top:10px">${tip}</p>`;
  },
  staff(sg) {
    const b = B();
    if (sg === 'aday') {
      let h = `<p class="note">Adaylar her sabah yenilenir. Maaş, gün sonunda ödenir.</p>`;
      if (!b.candidates.length) h += `<p class="note">Bugünlük başka aday yok.</p>`;
      for (const c of b.candidates) h += item({ ic: c.role === 'barista' ? '☕' : '🧹', t: `${esc(c.name)}${traitTag(c.trait)}`,
        s: `${c.role === 'barista' ? 'Barista' : 'Komi'} · Hız ${c.speed.toFixed(2)}× · Güler yüz ${c.charm.toFixed(2)}<br><b>${fmt(c.wage)}</b> / gün${c.trait ? ` · ${TRAITS[c.trait].desc}` : ''}`,
        ac: btn('hire', c.id, 'İşe al', 'primary') });
      return h;
    }
    const nb = bars().length, nBar = b.staff.filter(s => s.role === 'barista').length;
    let h = stats([[nBar, 'Barista'], [b.staff.length - nBar, 'Komi'], [fmt(wagesOf()), 'Günlük maaş']]);
    if (nBar < nb) h += `<div class="warn">⚠️ ${nb - nBar} bar boşta. Adaylar sekmesinden barista işe al.</div>`;
    if (nBar > nb) h += `<div class="warn">⚠️ ${nBar - nb} barista boşta. İnşa menüsünden espresso bar koyabilirsin.</div>`;
    if (!b.staff.some(s => s.role === 'komi')) h += `<p class="note">💡 Komi işe alırsan kirli masaları kendisi toplar.</p>`;
    for (const s of b.staff) {
      const fair = fairWage(s), under = !s.owner && s.wage < fair;
      h += item({ col: true, ic: s.role === 'barista' ? '☕' : '🧹',
        t: `${esc(s.name)}${s.owner ? ' <span class="tag">patron</span>' : s.manager ? ' <span class="tag">müdür</span>' : ''}${traitTag(s.trait)}${s.breakT > 0 ? ' <span class="tag gold">☕ molada</span>' : ''}`,
        s: `Hız ${s.speed.toFixed(2)}× · Güler yüz ${s.charm.toFixed(2)} · Seviye ${s.lvl}${s.owner ? '' : ` · <b>${fmt(s.wage)}</b>/gün${under ? ` <span class="bad">(adil ${fmt(fair)})</span>` : ''}`}`,
        extra: `<div class="mlabel"><span>Yorgunluk</span><span>${Math.round(s.fatigue)}%</span></div>${meter(s.fatigue, lvl(s.fatigue))}
          ${s.owner ? '' : `<div class="mlabel"><span>Moral</span><span>${Math.round(s.morale)}%</span></div>${meter(s.morale, s.morale < 30 ? 'bad' : s.morale < 55 ? 'warn' : '')}`}`,
        ac: `${s.lvl < 5 ? buy('train', s.id, `📚 Eğit ${fmt(trainCost(s))}`, trainCost(s), '') : ''}${s.owner ? '' : btn('raise', s.id, '💰 Zam +%10') + btn('fire', s.id, 'Çıkar', 'danger')}` });
    }
    return h;
  },
  shop(sg) {
    const b = B();
    if (sg === 'menu') {
      let h = `<p class="note">Adil fiyatın üstüne çıkarsan müşteri memnuniyetsizleşir, bazıları vazgeçer. Altında kalırsan daha çok kişi uğrar.</p>`;
      const drink = (id, d) => {
        const m = S.menu[id];
        if (!m.on) return item({ dim: true, ic: d.icon, t: d.name, s: `${d.desc ? d.desc + ' · ' : ''}${d.base} ₺ · ${d.beans ? d.beans + ' doz' : 'çekirdeksiz'}${d.milk ? ' + süt' : ''}`, ac: buy('unlock', id, `Ekle ${fmt(d.cost)}`, d.cost) });
        const fair = fairPrice(id), r = m.price / fair;
        const likes = d.likes ? Object.entries(d.likes).sort((a, c) => c[1] - a[1]).slice(0, 2).map(([t]) => TYPES[t].icon).join('') : '';
        return item({ col: !!d.sig, ic: d.icon, t: `${d.name}${d.season ? ` <span class="tag gray">${d.season}</span>` : ''}`,
          s: `Maliyet ~${fmt(cupCost(id))} · Adil ~<b class="${r > 1.1 ? 'bad' : r < .95 ? 'good' : ''}">${fmt(fair)}</b>${likes ? ` · Sevenler ${likes}` : ''}`,
          extra: d.sig ? segctl('sweet', SWEET.map((sw, k) => [`${id}:${k}`, `${sw} tatlı`]), `${id}:${m.sweet}`) : '',
          ac: stepper('price', `${id}:-5`, `${id}:5`, m.price + ' ₺') });
      };
      h += `<div class="sec">Klasikler</div>`;
      for (const [id, d] of Object.entries(DRINKS)) if (!d.sig) h += drink(id, d);
      h += `<div class="sec">İmza tarifler</div><p class="note">Yerel tarifler bazı müşteri tiplerini çok mutlu eder. Öğrenciler tatlı sever, kahve tutkunları sevmez.</p>`;
      for (const [id, d] of Object.entries(DRINKS)) if (d.sig) h += drink(id, d);
      h += `<div class="sec">Yiyecek</div>` + (hasItem('vitrin')
        ? item({ ic: '🥐', t: 'Kruvasan', s: `Maliyet ${fmt(FOOD.cost)} · kahvenin yanında satılır`, ac: stepper('foodprice', '-5', '5', S.foodPrice + ' ₺') })
        : `<p class="note">🥐 Kruvasan satmak için İnşa → Ekipman’dan Pasta Vitrini koy.</p>`);
      return h;
    }
    if (sg === 'stok') {
      const roast = hasItem('roaster');
      let h = `<p class="note">Seçili çekirdek bütün içeceklerde kullanılır. Fiyatlar kahve borsasına göre her gün değişir.${roast ? ' Kendi kavurduğun taze çekirdek +0.4 kalite verir.' : ''}</p><div class="sec">Çekirdek</div>`;
      for (const [id, bn] of Object.entries(BEANS)) {
        const st = b.beans[id], active = b.activeBean === id, p = beanPrice(id), tr = S.market[id] / (S.marketPrev[id] || 1);
        const arrow = tr > 1.03 ? ' <span class="bad">▲</span>' : tr < .97 ? ' <span class="good">▼</span>' : '';
        if (id === 'geisha' && !S.geisha) { h += item({ dim: true, ic: '🔒', t: bn.name, s: 'Puanın ⭐4.3 olunca (4. günden sonra) tedarikçi açılır.' }); continue; }
        h += item({ col: true, ic: '🫘', t: `${bn.name}${active ? ' <span class="tag">kullanılıyor</span>' : ''}`,
          s: `${bn.note} · Kalite ${bn.q.toFixed(1)} · ${p.toFixed(1)} ₺/doz${arrow}<br>Stok: <b class="${active && st.r + st.h < 25 ? 'bad' : ''}">${st.r + st.h} doz</b>${st.h ? ` (taze ${st.h})` : ''}${roast ? ` · çiğ ${st.g}` : ''}`,
          ac: `${active ? '' : btn('bean', id, 'Kullan')}${buy('buyR', id, `+${BAG} · ${fmt(p * BAG)}`, Math.round(p * BAG))}${roast ? buy('buyG', id, `+${BAG} çiğ · ${fmt(p * BAG * .55)}`, Math.round(p * BAG * .55), '') : ''}` });
      }
      if (roast) h += `<div class="sec">Kavurma profili</div>` + item({ ic: '🔥', t: 'Kendi kavurduğun çekirdek', s: 'Kahve tutkunları ve turistler açık, emekliler ve ofis çalışanları koyu kavrum sever.',
        extra: segctl('roast', Object.entries(ROASTS), b.roast) });
      h += `<div class="sec">Süt ve yiyecek</div>` + item({ ic: '🥛', t: 'Süt', s: `Sütlü içecekler için · Stok: <b class="${b.milk < 10 ? 'bad' : ''}">${b.milk}</b>`, ac: buy('milk', null, `+${MILK_PACK} · ${fmt(MILK_PACK_COST)}`, MILK_PACK_COST) });
      if (hasItem('vitrin')) h += item({ col: true, ic: '🥐', t: `Kruvasan · bugün ${b.croissant} adet`, s: 'Satılmayanlar gün sonunda çöpe gider. Her sabah otomatik sipariş:',
        ac: stepper('corder', '-2', '2', b.croissantOrder + ' adet') + buy('croissant', null, `+10 şimdi · ${fmt(10 * FOOD.cost)}`, 10 * FOOD.cost, '') });
      h += `<p class="note">${S.autoSupply ? '🚚 Otomatik tedarik açık: çekirdek ve süt azalınca %10 farkla kendiliğinden sipariş verilir.' : '🚚 Stok takibiyle uğraşmak istemezsen Geliştir sekmesinden otomatik tedarik al.'}</p>`;
      return h;
    }
    const up = (ic, t, s, done, act, arg, cost, doneText = '✓ Aktif') => item({ ic, t, s, ac: done ? `<span class="tag">${doneText}</span>` : buy(act, arg, fmt(cost), cost) });
    return up('⚙️', `Espresso makinesi · Sv ${b.machine}/5`, 'Bu şubedeki bütün içecekler %15 daha hızlı hazırlanır.', b.machine >= 5, 'up', 'machine', machineCost(), 'MAKS')
      + up('📣', `Sosyal medya · Sv ${S.ads}/5`, 'Bütün şubelerde caddeye daha çok kişi gelir, içeri girme ihtimali artar.', S.ads >= 5, 'up', 'ads', adsCost(), 'MAKS')
      + up('⛱️', 'Teras izni', `Kaldırıma masa koyabilirsin. Güneşli havada müşteriler terası sever. Günlük ${fmt(TERRACE_FEE)} harç.`, b.terrace, 'up', 'terrace', TERRACE_COST, '✓ Açık')
      + up('💳', 'Sadakat kartı', 'Müdavimler daha hızlı bağlanır, rakibe karşı +%15 avantaj.', S.loyaltyCard, 'up', 'loyalty', LOYALTY_CARD_COST)
      + up('🚚', 'Otomatik tedarik', 'Çekirdek ve süt bitmeden kendiliğinden sipariş verilir (%10 fark).', S.autoSupply, 'up', 'auto', AUTO_SUPPLY_COST)
      + `<p class="note">✨ Atmosfer: toplam ${atmosphere()}, dükkan başına ${atmPerUnit().toFixed(1)}.</p>`;
  },
  hood(sg) {
    const b = B();
    if (sg === 'mudavim') {
      let h = `<p class="note">Her gün belli saatte gelirler. Mutlu ettikçe sadakatleri artar; 80’de arkadaşlarını getirirler, 90’da sürpriz yaparlar. Kızarlarsa giderler.</p>`;
      for (const r of b.regulars) h += item({ dim: r.status === 'lost', ic: r.emoji,
        t: `${esc(r.name)}${r.status === 'lost' ? ' <span class="tag red">gelmiyor</span>' : r.loyalty >= 80 ? ' <span class="tag">sadık</span>' : ''}`,
        s: `${esc(r.story)}<br>☕ ${DRINKS[r.fav].name}${S.menu[r.fav].on ? '' : ' <span class="bad">(menüde yok!)</span>'} · 🕐 ${hhm(r.hour)} · ${r.visits} ziyaret`,
        extra: `<div class="mlabel"><span>Sadakat</span><span>${Math.round(r.loyalty)}</span></div>${meter(r.loyalty, r.loyalty < 30 ? 'bad' : r.loyalty < 55 ? 'warn' : '')}` });
      return h;
    }
    if (sg === 'istek') {
      if (!b.quests.length) return `<p class="note">Şu an bekleyen istek yok. Birkaç günde bir komşulardan ve mahalleden yeni istek gelir.</p>`;
      return b.quests.map(q => { const prob = questProblem(q), left = q.expires - S.day;
        return item({ col: true, ic: q.icon, t: esc(q.from), s: `${esc(q.text)}<br>⏳ ${left > 0 ? `${left + 1} gün kaldı` : 'Bugün son gün'}${prob && !q.auto ? ` · <span class="bad">${prob}</span>` : ''}`,
          ac: q.auto ? '<span class="tag gray">Gün sonunda otomatik</span>' : btn('quest', q.id, 'Tamamla', 'primary', !!prob) }); }).join('');
    }
    if (sg === 'rakip') {
      const rv = b.rival, rn = rivalName();
      if (rv.closed) return item({ ic: '🎉', t: `${rn} kapandı`, s: 'Mahallenin kahvecisi artık sensin!' });
      if (!rv.active) return item({ ic: '🚧', t: rn, s: 'Sokağın köşesindeki binada “YAKINDA” yazıyor. Birkaç gün içinde açılacak gibi. Puanını ve atmosferini şimdiden yükselt!' });
      const share = rivalShare();
      return stats([[`%${Math.round(share * 100)}`, 'Müşteri payın'], [`⭐${rv.rating.toFixed(1)}`, 'Rakip puanı'], [`${Math.round(rv.health)}`, 'Dayanıklılık']])
        + item({ ic: '🏪', t: rn + (rv.promo > 0 ? ' <span class="tag red">%30 indirimde</span>' : ''), s: 'Puanın, fiyatların, atmosferin, sosyal medyan ve sadakat kartın payını belirler. Payın uzun süre %55’in üstünde kalırsa kapanırlar.',
          extra: `<div class="mlabel"><span>Senin payın</span><span>%${Math.round(share * 100)}</span></div>${meter(share * 100, share < .45 ? 'bad' : share < .55 ? 'warn' : '')}` });
    }
    if (sg === 'etkinlik') {
      const cur = S.pevent && S.pevent.day >= S.day ? S.pevent : null;
      let h = `<p class="note">Günde bir etkinlik düzenleyebilirsin. Bugün için başlama saatinden önce ayarlaman gerekir.</p>`;
      if (cur) h += `<div class="warn">${PEVENTS[cur.id].icon} ${PEVENTS[cur.id].name}: ${cur.day === S.day ? 'bugün' : 'yarın'} ${PEVENTS[cur.id].from}:00–${PEVENTS[cur.id].to}:00</div>`;
      for (const [id, E] of Object.entries(PEVENTS)) {
        const todayOk = !cur && S.phase !== 'report' && S.time < E.from * 60;
        h += item({ col: true, ic: E.icon, t: E.name, s: `${E.desc}<br>🕐 ${E.from}:00–${E.to}:00 · ${E.cost ? fmt(E.cost) : 'ücretsiz'}`,
          ac: btn('pevent', `${id}:0`, 'Bugün', 'primary', !todayOk || S.money < E.cost) + btn('pevent', `${id}:1`, 'Yarın', '', !!cur || S.money < E.cost) });
      }
      return h;
    }
    const r = rating(), n = b.reviews.length;
    let h = `<div class="item"><div class="bd"><div class="big">${r.toFixed(2)}</div><div class="stars" style="font-size:18px;margin-top:4px">${starStr(r)}</div></div><div class="s" style="max-width:55%">${n} yorum. Yeni yorumlar daha ağır basar. Puan, kaç kişinin içeri gireceğini doğrudan etkiler.</div></div>`;
    if (!n) h += `<p class="note">Henüz yorum yok.</p>`;
    for (const rv of b.reviews.slice(0, 30)) h += `<div class="rev"><span class="stars">${starStr(rv.stars)}</span> <span class="who">${rv.icon} ${esc(rv.who)} · Gün ${rv.day}</span><p>${esc(rv.text)}</p></div>`;
    return h;
  },
  more(sg) {
    const b = B();
    if (sg === 'cadde') {
      const H = HOODS[b.hood];
      let h = `<p class="note">${H.icon} <b>${H.name}</b>: ${H.desc} Yanındaki dükkan kiralık olunca kiralayıp duvarı yıkabilirsin.</p>`;
      b.units.forEach((st, u) => {
        const U = H.units[u], adj = u === ownMinU - 1 || u === ownMaxU + 1;
        if (st === 'own') h += item({ ic: '✅', t: u === 1 ? 'İlk dükkanın' : 'Ek alan', s: `Kira ${fmt(unitRent(u))} / gün` });
        else if (st === 'occupied') h += item({ dim: true, ic: NEIGHBORS[U.kind].icon, t: NEIGHBORS[U.kind].name, s: U.hint });
        else h += item({ ic: '🔑', t: 'Kiralık dükkan', s: `Depozito ${fmt(unitDeposit(u))} · Kira ${fmt(unitRent(u))} / gün${adj ? '' : '<br>Önce aradaki dükkanı kiralamalısın.'}`,
          ac: btn('rent', u, 'Kirala', 'primary', !adj || S.money < unitDeposit(u)) });
      });
      h += `<p class="note">Günlük sabit gider: kira ${fmt(rentOf())} + maaşlar ${fmt(wagesOf())} = <b>${fmt(rentOf() + wagesOf())}</b></p><div class="sec">Şubeler</div>`;
      S.branches.forEach((br, k) => { const HB = HOODS[br.hood], last = br.histNet[br.histNet.length - 1];
        h += item({ ic: HB.icon, t: `${HB.name}${k === S.activeBranch ? ' <span class="tag">buradasın</span>' : ''}`,
          s: `${ownedCountOf(br)} dükkan · ⭐ ${rating(br).toFixed(1)}${last != null ? ` · son gün ${fmt(last)}` : ''}`,
          ac: k === S.activeBranch ? '' : btn('switch', k, 'Git', 'primary') }); });
      if (S.branches.length > 1) h += `<p class="note">Başında olmadığın şubeler, son günlerinin ortalama kârının %85’ini kendiliğinden kazanır.</p>`;
      const hoods = availableHoods();
      if (hoods.length) {
        h += `<div class="sec">Yeni şube</div>${canOpenBranch() ? '' : '<p class="note">Yeni şube için her şubende en az 3 dükkan olmalı.</p>'}`;
        for (const hd of hoods) { const HH = HOODS[hd]; h += item({ dim: !canOpenBranch(), ic: HH.icon, t: HH.name, s: HH.desc, ac: btn('openBranch', hd, fmt(HH.open), 'primary', !canOpenBranch() || S.money < HH.open) }); }
      }
      h += `<div class="sec">Franchise</div>` + item({ col: true, ic: '⭐', t: `Franchise · ${meta.stars} yıldızın var`,
        s: `Markanı satıp her şeyi sıfırlarsın, yıldızlar kalıcıdır. Her yıldız +1.000 ₺ başlangıç, +%5 yaya, +%3 adil fiyat. Şart: 3 şube ya da 100.000 ₺ servet. Servetin: <b>${fmt(netWorth())}</b>`,
        ac: btn('franchise', null, canFranchise() ? `Franchise yap (+${franchiseStars()}⭐)` : 'Henüz olmaz', canFranchise() ? 'primary' : '', !canFranchise()) });
      return h;
    }
    if (sg === 'dekor') {
      let h = `<div class="sec">Duvar rengi · ${fmt(WALL_COST)}</div><div class="swatches">${Object.entries(WALL_COLORS).map(([k, w]) =>
        `<button class="sw ${b.decor.wall === k ? 'on' : ''}" title="${w.name}" style="background:#${w.c.toString(16).padStart(6, '0')}" data-act="wall" data-arg="${k}"></button>`).join('')}</div>`;
      h += `<div class="sec">Zemin · ${fmt(FLOOR_COST)}</div><div class="swatches">${Object.entries(FLOORS).map(([k, n]) =>
        `<button class="btn sm ${b.decor.floor === k ? 'on' : ''}" data-act="floor" data-arg="${k}">${n}</button>`).join('')}</div>`;
      h += `<div class="sec">Duvar dekorları</div><p class="note">Önce bir dekor seç, sonra duvardaki yerine koy.</p><div class="swatches">${Object.entries(WALL_DECOR).map(([k, d]) =>
        `<button class="sw ${decorPick === k ? 'on' : ''}" data-act="pick" data-arg="${k}">${d.icon}</button>`).join('')}</div>
        <p class="note">Seçili: <b>${WALL_DECOR[decorPick].name}</b> · ${fmt(WALL_DECOR[decorPick].cost)} · +${WALL_DECOR[decorPick].amb}✨</p>`;
      for (let u = 0; u < NU; u++) {
        if (b.units[u] !== 'own') continue;
        wallSlots(u).forEach((_, k) => { const key = `${u}-${k}`, cur = b.decor.slots[key];
          h += item({ ic: cur ? WALL_DECOR[cur].icon : '▫️', t: `${u === 1 ? 'İlk dükkan' : `${u + 1}. dükkan`} · duvar ${k + 1}`, s: cur ? WALL_DECOR[cur].name : 'Boş',
            ac: `${cur ? btn('slot', `${key}:`, 'Kaldır') : ''}${buy('slot', `${key}:${decorPick}`, cur ? 'Değiştir' : 'Koy', WALL_DECOR[decorPick].cost)}` }); });
      }
      h += `<div class="sec">Marka</div>` + item({ col: true, ic: S.brand.icon, t: 'Dükkan adı', s: 'Tabelada ve fotoğraflarda görünür.',
        extra: `<div style="display:flex;gap:6px;margin-top:8px"><input type="text" id="brandName" maxlength="14" value="${esc(S.brand.name)}"><button class="btn primary" data-act="brandName">Kaydet</button></div>` });
      h += `<p class="note">Tabela rengi</p><div class="swatches">${Object.entries(BRAND_COLORS).map(([k, c]) => `<button class="sw ${S.brand.color === k ? 'on' : ''}" style="background:${c}" data-act="brandColor" data-arg="${k}"></button>`).join('')}</div>
        <p class="note">Logo</p><div class="swatches">${BRAND_ICONS.map(ic => `<button class="sw ${S.brand.icon === ic ? 'on' : ''}" data-act="brandIcon" data-arg="${ic}">${ic}</button>`).join('')}</div>`;
      return h;
    }
    if (sg === 'istatistik') {
      const hist = S.history.slice(-30);
      let h = stats([[S.served.toLocaleString('tr-TR'), 'Toplam servis'], [S.perfectArts, 'Mükemmel latte art'], [S.branches.length, 'Şube']]);
      if (hist.length >= 2) {
        const W = 340, Hh = 140, pad = 10, vals = hist.flatMap(x => [x.income, x.net]);
        const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
        const X = i => pad + i * (W - 2 * pad) / (hist.length - 1), Y = v => Hh - pad - (v - min) / (max - min) * (Hh - 2 * pad);
        const line = (k, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${hist.map((x, i) => `${X(i).toFixed(1)},${Y(x[k]).toFixed(1)}`).join(' ')}"/>`;
        h += `<svg class="chart" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="#d8cfc2" stroke-dasharray="4 4"/>${line('income', '#1f6f54')}${line('net', '#e0a100')}</svg>
          <div class="legend"><span><i style="background:#1f6f54"></i>Gelir</span><span><i style="background:#e0a100"></i>Net kâr</span><span>Son ${hist.length} gün · en iyi ${fmt(Math.max(...hist.map(x => x.income)))}</span></div>`;
      } else h += `<p class="note">Grafik için en az iki gün tamamlamalısın.</p>`;
      const bars = (obj, label) => { const ent = Object.entries(obj).sort((a, c) => c[1] - a[1]), tot = ent.reduce((a, [, v]) => a + v, 0) || 1, mx = ent[0]?.[1] || 1;
        return ent.map(([k, v]) => `<div class="barrow"><span>${label(k)}</span><div class="bar"><i style="width:${v / mx * 100}%"></i></div><b>%${Math.round(v / tot * 100)}</b></div>`).join('') || '<p class="note">Henüz veri yok.</p>'; };
      return h + `<div class="sec">En çok satanlar</div>${bars(S.sales, k => `${DRINKS[k]?.icon || ''} ${DRINKS[k]?.name || k}`)}<div class="sec">Müşteri tipleri</div>${bars(S.typeCounts, k => `${TYPES[k]?.icon || ''} ${TYPES[k]?.name || k}`)}`;
    }
    if (sg === 'hedef') {
      const done = GOALS.filter(g => S.goalsDone.includes(g.id)).length;
      return stats([[`${done}/${GOALS.length}`, 'Tamamlanan'], [fmt(GOALS.filter(g => !S.goalsDone.includes(g.id)).reduce((a, g) => a + g.reward, 0)), 'Kalan ödül'], ['🎯', 'Hedefler']])
        + GOALS.map(g => { const ok = S.goalsDone.includes(g.id); return item({ dim: ok, ic: ok ? '✅' : '🎯', t: g.text, ac: `<span class="tag ${ok ? '' : 'gold'}">+${fmt(g.reward)}</span>` }); }).join('');
    }
    const tgl = (act, on, label) => btn(act, null, on ? label[0] : label[1], on ? 'primary' : '');
    return item({ ic: '🔊', t: 'Ses efektleri', s: 'Kapı zili ve kasa sesi', ac: tgl('sound', S.sound, ['Açık', 'Kapalı']) })
      + item({ ic: '🎵', t: 'Lo-fi müzik', s: 'Arka planda sakin kahveci müziği', ac: tgl('music', S.music, ['Açık', 'Kapalı']) })
      + item({ ic: '🎨', t: 'Latte art mini oyunu', s: 'Sütlü siparişlerde 🎨 butonu çıksın', ac: tgl('art', S.latteArt, ['Açık', 'Kapalı']) })
      + item({ ic: '❓', t: 'Nasıl oynanır', s: 'Başlangıç rehberini tekrar göster', ac: btn('help', null, 'Göster') })
      + item({ ic: '⌨️', t: 'Kısayollar', s: 'Bilgisayarda: R döndür · Esc bitir · S sat · M taşı · 1–9 eşya · P fotoğraf · Boşluk duraklat. Telefonda: tek parmakla kaydır, iki parmakla yakınlaştır.' })
      + item({ ic: '🔄', t: 'Oyunu sıfırla', s: 'Bütün ilerleme silinir (franchise yıldızları kalır).', ac: btn('reset', null, 'Sıfırla', 'danger') });
  },
};

// ---- sayfa aç / kapa / çiz ----
export function openSheet(name, sg) {
  if (sheet === name && !sg) { closeSheet(); return; }
  setMode('none');
  sheet = name;
  if (sg) segOf[name] = sg;
  else if (name === 'hood' && B().quests.length) segOf[name] = 'istek';
  segOf[name] = segOf[name] || SHEETS[name].segs[0][0];
  el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
  bodyEl.scrollTop = 0;
  renderSheet(true);
}
export function closeSheet() {
  sheet = null; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); el.style.transform = '';
  updateTabs();
}
function updateTabs() { document.querySelectorAll('#tabbar [data-sheet]').forEach(b => b.classList.toggle('active', b.dataset.sheet === sheet)); }
export function renderSheet(force) {
  updateTabs();
  if (!sheet) return;
  if (!force && (holding || (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT'))) return;
  const def = SHEETS[sheet], sg = segOf[sheet];
  $('sheetTitle').textContent = def.title;
  const segHtml = def.segs.map(([k, l]) => `<button class="seg ${k === sg ? 'active' : ''}" data-seg="${k}">${l}</button>`).join('');
  if ($('sheetSegs').dataset.k !== sheet + sg) { $('sheetSegs').innerHTML = segHtml; $('sheetSegs').dataset.k = sheet + sg; }
  const html = R[sheet](sg);
  if (force || html !== lastHtml) { bodyEl.innerHTML = html; lastHtml = html; }
}
// ana döngü bunu çağırır
export const renderPanel = renderSheet;

$('sheetSegs').addEventListener('click', e => {
  const b = e.target.closest('[data-seg]'); if (!b || !sheet) return;
  haptic(5);
  segOf[sheet] = b.dataset.seg; bodyEl.scrollTop = 0; renderSheet(true);
  $('sheetSegs').querySelector('.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
});
$('sheetClose').onclick = closeSheet;
document.querySelectorAll('#tabbar [data-sheet]').forEach(b => b.onclick = () => { haptic(6); openSheet(b.dataset.sheet); });
// tutamaktan aşağı çekince kapanır (mobil)
{
  let y0 = null, dy = 0;
  const head = $('sheetHead');
  head.addEventListener('pointerdown', e => { if (innerWidth >= 900 || e.target.closest('button')) return; y0 = e.clientY; dy = 0; el.classList.add('drag'); try { head.setPointerCapture(e.pointerId); } catch (err) {} });
  head.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = `translateY(${dy}px)`; });
  const end = () => { if (y0 == null) return; el.classList.remove('drag'); el.style.transform = ''; if (dy > 80) closeSheet(); y0 = null; };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
}
// parmak ekrandayken yeniden çizme (yoksa tıklama kaybolur); kaydırırken yanlış satın alma olmasın diye "click" kullanılır
for (const t of [bodyEl, $('modal')]) {
  t.addEventListener('pointerdown', () => { holding = true; });
  t.addEventListener('pointerup', () => setTimeout(() => holding = false, 60));
  t.addEventListener('pointercancel', () => { holding = false; });
}

// ---- butonların işleri ----
const staffById = id => B().staff.find(x => x.id === +id);
const ACT = {
  build(t) { closeSheet(); setMode('build', t); },
  tool(m) { closeSheet(); setMode(m); },
  hire(id) {
    const b = B(), c = b.candidates.find(x => x.id === +id); if (!c) return;
    b.staff.push({ ...c, fatigue: 0, morale: 75, breakT: 0 }); b.candidates = b.candidates.filter(x => x !== c);
    assignBaristas(); syncWorkers(); toast(`👋 ${c.name} ekibe katıldı!`);
  },
  fire(id) { const s = staffById(id); if (!s || s.owner || !confirm(`${s.name} işten çıkarılsın mı?`)) return; B().staff = B().staff.filter(x => x !== s); assignBaristas(); syncWorkers(); },
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
    if (k === 'terrace' && !b.terrace && spend(TERRACE_COST)) { b.terrace = true; buildUnits(); toast('⛱️ Teras açıldı! İnşa menüsünden kaldırıma masa koyabilirsin.', 4500); }
  },
  rent(u) {
    u = +u; const b = B();
    if (b.units[u] !== 'rent' || !(u === ownMinU - 1 || u === ownMaxU + 1) || !spend(unitDeposit(u))) return;
    b.units[u] = 'own'; recomputeBounds(); buildUnits();
    note('🔨 Duvar yıkıldı! Dükkanın büyüdü. Yeni alana eşya yerleştirebilirsin.', 4000);
  },
  switch(k) { closeSheet(); switchBranch(+k); },
  openBranch(h) { closeSheet(); openBranch(h); },
  franchise() { if (canFranchise() && confirm(`Markanı franchise yapıp ${franchiseStars()} yıldızla baştan başlamak istiyor musun? Şubeler, para ve eşyalar sıfırlanır.`)) franchise(); },
  quest(id) { completeQuest(id); },
  pevent(arg) {
    const [id, tom] = arg.split(':'), E = PEVENTS[id];
    if ((S.pevent && S.pevent.day >= S.day) || !spend(E.cost)) return;
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
  brandName() { const v = ($('brandName')?.value || '').trim().toLocaleUpperCase('tr-TR').slice(0, 14); if (!v) return; S.brand.name = v; buildUnits(); document.activeElement?.blur(); toast(`🏷️ Tabelan değişti: ${v}`); },
  brandColor(k) { S.brand.color = k; buildUnits(); },
  brandIcon(ic) { S.brand.icon = ic; buildUnits(); },
  sound() { S.sound = !S.sound; },
  music() { setMusic(!S.music); },
  art() { S.latteArt = !S.latteArt; },
  help() { closeSheet(); showIntro(); },
  reset(arg) { if (arg !== 'force' && !confirm('Bütün ilerleme silinip oyun baştan başlasın mı? (Franchise yıldızların kalır.)')) return; wipeSave(); location.reload(); },
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
  holding = false;
  haptic(8);
  ACT[b.dataset.act]?.(b.dataset.arg);
  renderSheet(true); refreshUI(); save();
}
bodyEl.addEventListener('click', onAct);
$('modal').addEventListener('click', onAct);
