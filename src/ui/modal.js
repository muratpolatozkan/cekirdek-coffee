// Ortadaki pencere: gün sonu raporu, giriş, fotoğraf önizleme
import { HOODS, WEATHER, SEASONS } from '../config.js';
import { S, B, meta } from '../state.js';
import { $, fmt, starStr, esc } from '../utils.js';
import { CHANGELOG, seenVersion } from '../changelog.js';
import { challengeInfo, keyLabel } from '../sim/challenge.js';
import { RULES, ruleChoices, starBreakdown, franchiseStars, canFranchise, royaltyTotal, royaltyOf, networkEntry, carryOf } from '../sim/prestige.js';
import { rentBlock, rentChecks, unitDeposit, unitRent, isAdjacent } from '../sim/expand.js';

export function showModal(html) { $('modalBox').innerHTML = html; $('modal').style.display = 'flex'; }
export function hideModal() { $('modal').style.display = 'none'; }
export const isModalOpen = () => $('modal').style.display === 'flex';

export function showReport() {
  const R = S.lastReport; if (!R) return;
  const neg = v => (v ? '−' : '') + fmt(v);
  const row = (a, b, cls = '') => `<tr class="${cls}"><td>${a}</td><td>${b}</td></tr>`;
  const W = WEATHER[R.weather] || WEATHER.gunes, TW = WEATHER[R.tomorrow] || WEATHER.gunes;
  const TS = SEASONS.find(s => s.id === R.tomorrowSeason) || SEASONS[0];
  const othersNet = (R.others || []).reduce((a, o) => a + o.net, 0);
  let h = `<h2>🌙 Gün ${R.day} bitti <small style="font-weight:400;color:var(--muted);font-size:14px">${HOODS[R.hood]?.icon || ''} ${HOODS[R.hood]?.name || ''} · ${W.icon}</small></h2><table>
    ${row('☕ İçecek satışı', fmt(R.revenue))}${R.foodRev ? row('🥐 Kruvasan', fmt(R.foodRev)) : ''}${row('💝 Bahşiş', fmt(R.tips))}${R.gifts ? row('🎁 Ödül / teşvik', fmt(R.gifts)) : ''}
    ${row('Toplam gelir', fmt(R.income), 'sum')}
    ${row('🏠 Kira', neg(R.rent))}${row('👥 Maaşlar', neg(R.wages))}${row('📦 Stok alımları', neg(R.stock))}${R.fines ? row('🧾 Ceza', neg(R.fines)) : ''}
    ${row('Bu şubenin net kârı', `<span class="${R.net >= 0 ? 'good' : 'bad'}">${fmt(R.net)}</span>`, 'sum')}
    ${(R.others || []).map(o => row(`${o.icon} ${o.name} (uzaktan)`, `<span class="${o.net >= 0 ? 'good' : 'bad'}">${fmt(o.net)}</span>`)).join('')}
    ${R.royalty ? row('🤝 Franchise telifi', `<span class="good">${fmt(R.royalty)}</span>`) : ''}
    ${R.others?.length || R.royalty ? row('Toplam', `<span class="${R.net + othersNet + (R.royalty || 0) >= 0 ? 'good' : 'bad'}">${fmt(R.net + othersNet + (R.royalty || 0))}</span>`, 'sum') : ''}</table>
    <ul><li>✅ ${R.served} müşteriye servis${R.avg ? ` · ortalama memnuniyet <span class="stars">${starStr(R.avg)}</span> ${R.avg.toFixed(1)}` : ''}</li>
    ${R.angry ? `<li>😠 ${R.angry} kişi bekleyip gitti</li>` : ''}${R.turned ? `<li>😕 ${R.turned} kişi kapıdan döndü (sıra doluydu)</li>` : ''}
    ${R.refused ? `<li>💸 ${R.refused} kişi fiyatı pahalı buldu</li>` : ''}${R.waste ? `<li>🗑️ ${R.waste} kruvasan çöpe gitti</li>` : ''}
    ${R.rivalShare != null ? `<li>🏪 Rakibe karşı müşteri payın: <b>%${Math.round(R.rivalShare * 100)}</b></li>` : ''}
    ${R.quits?.length ? `<li class="bad">👋 İstifa edenler: ${R.quits.map(esc).join(', ')} (moralleri çok düşüktü)</li>` : ''}
    ${R.invest ? `<li>🛠️ Yatırım harcaması: ${fmt(R.invest)} (net kâra dahil değil)</li>` : ''}</ul>
    ${R.log?.length ? `<details><summary><b>Günün olayları (${R.log.length})</b></summary><ul>${R.log.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
    ${R.best ? `<p><b>Günün yorumu:</b> <span class="stars">${starStr(R.best.stars)}</span> “${esc(R.best.text)}”</p>` : ''}
    ${R.worst && R.worst !== R.best && R.worst.stars <= 2 ? `<p><b>En sert eleştiri:</b> <span class="stars">${starStr(R.worst.stars)}</span> “${esc(R.worst.text)}”</p>` : ''}
    <div class="forecast">🔮 <b>Yarın:</b> ${TS.icon} ${TS.name} · ${TW.icon} ${TW.name}${TW.precip ? ' · terastaki masalar kapalı olabilir' : TW.temp > 0 ? ' · soğuk içecek talebi artar' : ''}</div>`;
  if (S.money < -3000) h += `<p class="bad"><b>💸 İflas ettin!</b> Borcun çok büyüdü. Baştan başlaman gerekiyor.</p><div class="actions"><button class="btn primary block" data-act="reset" data-arg="force">Baştan başla</button></div>`;
  else h += `${S.money < 0 ? '<p class="bad">⚠️ Borçtasın! Giderlerini azalt ya da fiyatlarını gözden geçir.</p>' : ''}<div class="actions"><button class="btn primary block" data-act="startDay">☀️ Yeni güne başla</button></div>`;
  showModal(h);
}
export function showIntro() {
  showModal(`<h2>${S.brand.icon} Çekirdek Coffee</h2>
    ${meta.runs ? `<div class="forecast"><b>⭐ ${meta.runs}. franchise sonrası yeni sezon!</b>
      ${S.carryIn ? `<div>💼 Kurucu payın kasada: <b>${fmt(S.carryIn)}</b></div>` : ''}
      ${royaltyTotal() ? `<div>🤝 Franchise ağın her gün <b>${fmt(royaltyTotal())}</b> telif ödeyecek</div>` : ''}
      ${S.customs.length ? `<div>🧪 ${S.customs.length} imza tarifin menünde</div>` : ''}
      ${meta.stars ? `<div>⭐ Harcanmamış <b>${meta.stars} yıldızın</b> var: Daha → Marka</div>` : ''}
      ${S.rule ? `<div>${RULES[S.rule].icon} Sezon kuralı: <b>${RULES[S.rule].name}</b> · ${RULES[S.rule].desc}</div>` : ''}</div>` : ''}
    <p>Çınar Sokak’ta, Bakkal Hasan ile Kuaför Ahmet’in arasında küçük bir kahveci açtın. Hedefin, burayı mahallenin en sevilen 3. dalga kahvecisi yapmak.</p>
    <p>Kısa bir rehber sana ilk adımları gösterecek. Servis yaptıkça seviye atlayacak ve yeni özellikler açacaksın. ☕</p>
    <div class="actions"><button class="btn primary block" data-act="closeIntro">☕ Dükkanı aç</button></div>`);
}
export function showOffline(off) {
  const h = Math.floor(off.mins / 60), m = off.mins % 60;
  showModal(`<div class="center"><div class="bigemoji">🌙</div><h2>Tekrar hoş geldin!</h2>
    <p>Sen ${h ? `${h} saat ` : ''}${m} dakika yokken dükkanın çalışmaya devam etti.</p>
    <div class="earn">+${fmt(off.amount)}</div>
    ${off.capped ? '<p class="note">En fazla 8 saatlik kazanç birikir.</p>' : ''}</div>
    <div class="actions"><button class="btn primary block" data-act="closeModal">💰 Topla</button></div>`);
}
export function showLevelUp(l, title, unlocks) {
  showModal(`<div class="center"><div class="bigemoji">🏅</div><h2>Seviye ${l}!</h2><p><b>${esc(title)}</b></p></div>
    ${unlocks.length ? `<p>Yeni açılanlar:</p><ul>${unlocks.map(u => `<li>${u}</li>`).join('')}</ul>` : '<p class="note">Tebrikler, ün kazanmaya devam!</p>'}
    <div class="actions"><button class="btn primary block" data-act="closeModal">Harika!</button></div>`);
}
// güncellemeden sonra (ya da Ayarlar'dan) sürüm notları
export function showChangelog(all = false) {
  const seen = seenVersion(), list = all ? CHANGELOG : CHANGELOG.filter(c => c.v > seen).slice(0, 3);
  showModal(`<div class="center"><div class="bigemoji">🎉</div><h2>${all ? 'Yenilikler' : 'Oyun güncellendi!'}</h2>
    ${all ? '' : '<p>Dükkanın ve ilerlemen yerinde. Bunlar yeni:</p>'}</div>
    <div class="changelog">${list.map(c => `<div class="cl"><div class="cl-h"><b>${c.title}</b><small>${c.date}</small></div>
      <ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>
    <div class="actions"><button class="btn primary block" data-act="closeNews">${all ? 'Kapat' : 'Hadi bakalım!'}</button></div>`);
}
export function showConflict() {
  showModal(`<div class="center"><div class="bigemoji">📱</div><h2>Oyun başka bir yerde açıldı</h2>
    <p>Çekirdek Coffee başka bir sekmede ya da pencerede açıldığı için bu pencere ilerlemeni kaydetmeyi durdurdu. Böylece iki pencere birbirinin kaydını silemez.</p></div>
    <div class="actions"><button class="btn primary block" data-act="reloadPage">Burada devam et</button></div>`);
}
export function showLoadProblem() {
  showModal(`<div class="center"><div class="bigemoji">🛟</div><h2>Kayıt okunamadı</h2>
    <p>Eski kaydın açılırken bir sorun çıktı, bu yüzden yeni bir oyun başladı. Eski kayıt silinmedi, saklandı.</p></div>
    <div class="actions"><button class="btn block" data-act="closeModal">Yeni oyunla devam</button><button class="btn primary block" data-act="restore" data-arg="broken">Eski kaydı dene</button></div>`);
}
export function showExport(code) {
  showModal(`<h2>📤 Kaydını taşı</h2><p class="note">Bu kodu kopyala, oyunu açtığın diğer yerde (ör. ana ekrandaki uygulamada) ⚙️ Ayarlar → İçe aktar’a yapıştır.</p>
    <textarea readonly style="width:100%;height:120px;font-size:11px;border-radius:12px;border:1px solid var(--line);padding:8px;user-select:text;-webkit-user-select:text">${code}</textarea>
    <div class="actions"><button class="btn primary block" data-act="closeModal">Tamam</button></div>`);
  const ta = document.querySelector('#modalBox textarea'); ta?.focus(); ta?.select();
}
// kiralık dükkan kartı: ne kazandırır, ne kadar tutar, şartlar
export function showRentCard(u) {
  const blk = rentBlock(u), checks = rentChecks(u);
  showModal(`<div class="center"><div class="bigemoji">🔑</div><h2>Kiralık dükkan</h2>
    <p>Yandaki dükkanı kiralarsan aradaki duvar yıkılır, ${B().units.filter(x => x === 'own').length === 1 ? 'dükkanın iki katına çıkar.' : 'dükkanın daha da büyür.'}</p></div>
    <table><tr><td>Depozito (bir kere)</td><td>${fmt(unitDeposit(u))}</td></tr><tr><td>Günlük kira</td><td>${fmt(unitRent(u))}</td></tr></table>
    <ul style="list-style:none;padding:0"><li>✨ Daha geniş vitrin: caddeden <b>%20 daha çok</b> kişi içeri girer</li><li>🪑 25 karelik yeni alan: daha çok masa ve bar</li><li>🚪 Yeni bir kapı: içerisi daha az sıkışır</li></ul>
    <div class="forecast">${checks.map(c => `${c.ok ? '✅' : '⬜'} ${c.text}`).join('<br>')}</div>
    ${!blk && S.money - unitDeposit(u) < 800 ? `<div class="warn">⚠️ Kiralarsan elinde ${fmt(S.money - unitDeposit(u))} kalacak. Çekirdek, süt ve gün sonu kirası (${fmt(unitRent(u))} fazladan) için para gerekecek.</div>` : ''}
    <div class="actions"><button class="btn block" data-act="closeModal">Vazgeç</button>
    <button class="btn primary block" data-act="rent" data-arg="${u}" ${blk ? 'disabled' : ''}>${blk ? blk : `🔨 Kirala · ${fmt(unitDeposit(u))}`}</button></div>`);
}
let lastPhoto = null;
export const getLastPhoto = () => lastPhoto;
export function showPhoto(url) {
  lastPhoto = url;
  const canShare = !!navigator.share && !!navigator.canShare;
  showModal(`<h2>📷 Dükkanının fotoğrafı</h2><img class="photo" src="${url}" alt="Dükkan fotoğrafı">
    <div class="actions">${canShare ? '<button class="btn block" data-act="sharePhoto">📤 Paylaş</button>' : ''}
    <a class="btn primary block" href="${url}" download="cekirdek-coffee-gun-${S.day}.jpg">⬇️ İndir</a>
    <button class="btn block" data-act="closeModal">Kapat</button></div>`);
}

// ---- günün meydan okuması ----
export function showChallengeIntro() {
  const i = challengeInfo(), best = meta.ch[i.key];
  showModal(`<div class="center"><div class="bigemoji">🏆</div><h2>Günün Meydan Okuması</h2><p>${keyLabel(i.key)} · bugün herkes aynı koşullarla oynuyor</p></div>
    <div class="forecast">
      <div>${i.hood.icon} <b>${i.hood.name}</b> · ${i.hood.desc}</div>
      <div>${i.rule.icon} <b>${i.rule.name}</b> · ${i.rule.desc}</div>
      ${i.event ? `<div>${i.event.icon} <b>${i.event.name}</b> · ${i.event.desc}</div>` : ''}
      <div>💰 <b>${fmt(S.money)}</b> ile başlıyorsun</div>
    </div>
    <p>Tek bir gün oyna. Gün sonunda <b>kâr + servis + memnuniyet</b> puanın hesaplanır. Skorunu arkadaşlarına gönder!</p>
    ${best ? `<p class="note">Bugünkü rekorun: <b>${best.toLocaleString('tr-TR')}</b> puan. Tekrar oynayabilirsin, en iyisi sayılır.</p>` : ''}
    <p class="note">Ana oyunun güvende, buradaki hiçbir şey ona dokunmaz.</p>
    <div class="actions"><button class="btn block" data-act="chHome">Ana oyuna dön</button><button class="btn primary block" data-act="closeModal">Başla!</button></div>`);
}
let lastResult = null;
export const getLastResult = () => lastResult;
export function showChallengeResult(r) {
  lastResult = r;
  showModal(`<div class="center"><div class="bigemoji">🏆</div><h2>Gün bitti!</h2><p>Günün Meydan Okuması · ${keyLabel(r.key)}</p>
    <div class="bigscore">${r.score.toLocaleString('tr-TR')}<small>puan</small></div>
    ${r.record ? '<div class="tag gold">🎉 Bugünkü yeni rekorun!</div>' : `<p class="note">Bugünkü rekorun: <b>${r.best.toLocaleString('tr-TR')}</b></p>`}</div>
    <table class="rep">${r.parts.map(([k, v]) => `<tr><td>${k}</td><td>${v.toLocaleString('tr-TR')}</td></tr>`).join('')}</table>
    <p class="center">🔥 <b>${r.streak} gün</b> üst üste meydan okuma${r.streak >= 2 ? '!' : ''} · yarın yeni bir gün</p>
    <div class="actions"><button class="btn primary block" data-act="chShare">📤 Skorunu paylaş</button></div>
    <div class="actions"><button class="btn block" data-act="chRetry">🔁 Tekrar dene</button><button class="btn block" data-act="chHome">🏠 Ana oyun</button></div>`);
}

// ---- franchise ----
export function showFranchise(offer = false) {
  const ok = canFranchise();
  const choices = ruleChoices();
  showModal(`<div class="center"><div class="bigemoji">⭐</div><h2>${offer ? 'Markan büyüdü!' : 'Markanı franchise yap'}</h2>
    <p>${offer ? 'Artık markanı franchise yapabilirsin. ' : ''}Şubelerin franchise olarak çalışmaya devam eder, sen yeni bir sokakta sıfırdan, ama çok daha güçlü başlarsın.</p></div>
    <div class="forecast"><b>Yanına aldıkların</b>
      <div class="kv"><span>⭐ Yıldız (${starBreakdown().map(([k, v]) => `${k} ${v}`).join(' · ')})</span><b>+${franchiseStars()} ⭐</b></div>
      <div class="kv"><span>🤝 Her gün franchise telifi, sonsuza dek</span><b>+${fmt(royaltyOf(networkEntry()))}/gün</b></div>
      ${royaltyTotal() ? `<div style="color:var(--muted);font-size:12px">Önceki franchise’larınla toplam ${fmt(royaltyTotal() + royaltyOf(networkEntry()))}/gün</div>` : ''}
      <div class="kv"><span>💼 Kurucu payı (kasanın %5’i)</span><b>+${fmt(carryOf())}</b></div>
      <div>🏷️ Marka adın${S.customs.length ? ` ve ${S.customs.length} imza tarifin` : ''}, yeteneklerin, başarımların, koleksiyonun</div></div>
    <p><b>Yeni sezonun kuralını seç.</b> Zor kurallar, o sezonu bitirince fazladan yıldız kazandırır:</p>
    <div class="rules">${choices.map(k => { const R = RULES[k]; return `<button class="rulecard" data-act="franchiseGo" data-arg="${k}" ${ok ? '' : 'disabled'}>
      <span class="e">${R.icon}</span><span class="n">${R.name}</span><span class="d">${R.desc}</span><span class="tag ${R.bonus ? 'gold' : 'gray'}">${R.bonus ? `+${R.bonus} ⭐` : 'bonus yok'}</span></button>`; }).join('')}</div>
    <div class="actions"><button class="btn block" data-act="closeModal">${offer ? 'Şimdi değil' : 'Vazgeç'}</button>${offer ? '<button class="btn primary block" data-act="seg" data-arg="more:marka">Yeteneklere bak</button>' : ''}</div>`);
}
