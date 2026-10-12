// Ortadaki pencere: gün sonu raporu, giriş, fotoğraf önizleme
import { HOODS, WEATHER, SEASONS } from '../config.js';
import { S, meta } from '../state.js';
import { $, fmt, starStr, esc } from '../utils.js';

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
    ${R.others?.length ? row('Toplam', `<span class="${R.net + othersNet >= 0 ? 'good' : 'bad'}">${fmt(R.net + othersNet)}</span>`, 'sum') : ''}</table>
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
  if (S.money < -3000) h += `<p class="bad"><b>💸 İflas ettin!</b> Borcun çok büyüdü. Baştan başlaman gerekiyor.</p><div class="actions"><button class="primary" data-act="reset" data-arg="force">Baştan başla</button></div>`;
  else h += `${S.money < 0 ? '<p class="bad">⚠️ Borçtasın! Giderlerini azalt ya da fiyatlarını gözden geçir.</p>' : ''}<div class="actions"><button class="primary" data-act="startDay">☀️ Yeni güne başla</button></div>`;
  showModal(h);
}
export function showIntro() {
  showModal(`<h2>${S.brand.icon} Çekirdek Coffee</h2>
    ${meta.stars ? `<p>⭐ <b>${meta.stars} franchise yıldızın</b> var: daha fazla başlangıç parası, daha kalabalık caddeler ve daha yüksek adil fiyat.</p>` : ''}
    <p>Çınar Sokak’ta, Bakkal Hasan ile Kuaför Ahmet’in arasında küçük bir kahveci açtın. Hedefin, burayı mahallenin en sevilen 3. dalga kahvecisi yapmak.</p>
    <ul><li>🚶 Caddeden geçenler; <b>puanın</b>, <b>atmosferin</b> ve <b>fiyatların</b> uygunsa içeri girer.</li>
    <li>☕ Her espresso barın başında bir <b>barista</b> olmalı. Şimdilik barista sensin.</li>
    <li>🎨 Sütlü siparişlerde barın üstünde <b>Latte art</b> çıkar. Dokunup doğru anda durdur!</li>
    <li>👋 Mahallenin <b>müdavimleri</b> var. Onları mutlu tut, arkadaşlarını getirsinler.</li>
    <li>🌦️ Her gün hava ve olaylar değişir. Gün sonundaki raporda yarının tahminini görürsün.</li>
    <li>🔑 Yandaki dükkanları kiralayıp büyü. Sonra yeni mahallelerde şube aç.</li></ul>
    <div class="actions"><button class="primary" data-act="closeIntro">Dükkanı aç</button></div>`);
}
export function showNews() {
  showModal(`<h2>🎉 Büyük güncelleme!</h2>
    <p>Dükkanın ve ilerlemen yerinde. Bunlar yeni:</p>
    <ul><li>🌦️ <b>Hava durumu ve mevsimler:</b> yağmur, kar, sıcak günler; gün sonunda yarının tahmini.</li>
    <li>🎲 <b>Rastgele olaylar:</b> influencer, sağlık denetimi, maç günü, elektrik kesintisi, festival. Bir de kahve borsası.</li>
    <li>👋 <b>Müdavimler</b>, <b>mahalle istekleri</b> ve sokağın köşesine açılacak <b>rakip kahveci</b>.</li>
    <li>🎨 <b>Latte art mini oyunu</b>, <b>imza tarifler</b> (Türk kahvesi, tahinli latte, salep…), kavurma profili.</li>
    <li>😓 Personelin <b>yorgunluğu, morali ve özel yetenekleri</b>. Kendi <b>etkinliklerini</b> de düzenleyebilirsin.</li>
    <li>⛱️ <b>Teras</b>, 🎨 <b>dekorasyon</b> (duvar rengi, zemin, tablolar, kendi tabelan), 📷 <b>fotoğraf modu</b>, 🎵 lo-fi müzik.</li>
    <li>🏙️ <b>Yeni mahallelerde şubeler</b> (Kampüs, Moda, Levent), 📊 istatistikler ve ⭐ franchise.</li></ul>
    <div class="actions"><button class="primary" data-act="closeNews">Hadi bakalım!</button></div>`);
}
let lastPhoto = null;
export const getLastPhoto = () => lastPhoto;
export function showPhoto(url) {
  lastPhoto = url;
  const canShare = !!navigator.share && !!navigator.canShare;
  showModal(`<h2>📷 Dükkanının fotoğrafı</h2><img class="photo" src="${url}" alt="Dükkan fotoğrafı">
    <div class="actions">${canShare ? '<button data-act="sharePhoto">📤 Paylaş</button>' : ''}
    <a class="btnlink" href="${url}" download="cekirdek-coffee-gun-${S.day}.jpg">⬇️ İndir</a>
    <button data-act="closeModal">Kapat</button></div>`);
}
