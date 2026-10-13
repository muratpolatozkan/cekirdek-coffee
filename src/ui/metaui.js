// "Daha" altındaki uzun vadeli sayfalar: Marka (franchise ve yetenekler), Koleksiyon (başarımlar, albüm), Meydan (günlük meydan okuma)
import { DRINKS, TYPES, VIPS } from '../config.js';
import { S, meta, save, CHALLENGE } from '../state.js';
import { fmt } from '../utils.js';
import { item, btn, meter, stats } from './kit.js';
import { toast, haptic } from './toast.js';
import { confetti } from './overlay.js';
import { netWorth } from '../sim/economy.js';
import { PERKS, perkCost, buyPerk, canFranchise, franchiseStars, ruleNow, franchise, RULES, royaltyOf, royaltyTotal } from '../sim/prestige.js';
import { HOODS } from '../config.js';
import { ACH, achCount, ACH_REWARD } from '../sim/achievements.js';
import { challengeInfo, keyLabel, lastDays, shareText, share, playChallenge, leaveChallenge } from '../sim/challenge.js';
import { showFranchise, getLastResult, hideModal, showModal } from './modal.js';
import { esc } from '../utils.js';
import { openSheet } from './panels.js';

const dots = (l, max) => '●'.repeat(l) + '○'.repeat(max - l);

function marka() {
  let h = stats([[`${meta.stars} ⭐`, 'Harcanabilir'], [meta.earned, 'Toplam yıldız'], [meta.runs, 'Franchise']]);
  if (CHALLENGE) return h + '<p class="note">Meydan okumada herkes eşit: yetenekler kapalı.</p>';
  const R = ruleNow();
  if (R) h += item({ ic: R.icon, t: `Bu sezonun kuralı: ${R.name}`, s: `${R.desc}${R.bonus ? ` Sezonu franchise ile bitirirsen +${R.bonus} ⭐.` : ''}` });
  h += '<div class="sec">Franchise</div>';
  if (canFranchise()) h += item({ col: true, ic: '🌟', t: `Hazırsın! +${franchiseStars()} ⭐ kazanırsın`, s: 'Markanı franchise yap, yıldızları yeteneklere harcayıp yeni bir sezona daha güçlü başla.', ac: btn('franchiseOpen', null, '⭐ Franchise yap', 'primary') });
  else {
    const nw = netWorth();
    h += item({ col: true, ic: '⭐', t: 'Franchise için şartlardan biri yeter', s: 'Para, şube ve eşyalar sıfırlanır; yıldızlar, yetenekler, başarımlar ve koleksiyon kalır.',
      extra: `<div class="mlabel"><span>🏙️ Şube</span><span>${S.branches.length} / 3</span></div>${meter(S.branches.length / 3 * 100)}
        <div class="mlabel"><span>💰 Servet</span><span>${fmt(nw)} / ${fmt(100000)}</span></div>${meter(nw / 1000)}` });
  }
  if (meta.network.length) {
    h += `<div class="sec">🤝 Franchise ağın · günde ${fmt(royaltyTotal())}</div><p class="note">Bıraktığın markalar franchise olarak çalışmaya devam ediyor ve her gün sonunda sana telif ödüyor.</p>`;
    h += meta.network.map((e, k) => item({ ic: e.icon, t: `${k + 1}. sezon · ${e.name}`,
      s: e.legacy ? 'Telif sisteminden önceki franchise’ın' : `${e.hoods.map(x => HOODS[x]?.icon || '').join('')} ${e.branches} şube · ${e.day}. gün · ${fmt(e.worth)} servet${e.rule ? ` · ${RULES[e.rule].icon}` : ''}`,
      ac: `<b class="good">+${fmt(royaltyOf(e))}</b>` })).join('');
  }
  h += '<div class="sec">Yetenekler</div><p class="note">Yıldızlarla alınır ve sonsuza dek kalır. “Yeni oyunda” yazanlar bir sonraki franchise sonrası işe yarar.</p>';
  for (const [id, P] of Object.entries(PERKS)) {
    const l = meta.perks[id] || 0, full = l >= P.max, c = full ? 0 : perkCost(id);
    h += item({ ic: P.icon, t: `${P.name} <span class="dots">${dots(l, P.max)}</span>`, s: full ? P.desc(l) : `${l ? `Şimdi: ${P.desc(l)} · ` : ''}Sonraki: ${P.desc(l + 1)}`,
      ac: full ? '<span class="tag">Tam</span>' : btn('perk', id, `${c} ⭐`, 'primary', meta.stars < c) });
  }
  return h;
}

function album() {
  const drinks = Object.keys(DRINKS).filter(id => !DRINKS[id].custom), got = drinks.filter(id => meta.album.drinks[id]).length;
  const guests = [...Object.keys(TYPES).map(k => ['types', k, TYPES[k].icon, TYPES[k].name]), ...VIPS.map(v => ['vips', v.name, '⭐', v.name])];
  const gotG = guests.filter(([k, id]) => meta.album[k][id]).length;
  let h = stats([[`${achCount()}/${ACH.length}`, 'Başarım'], [`${got}/${drinks.length}`, 'İçecek'], [`${gotG}/${guests.length}`, 'Misafir']]);
  if (CHALLENGE) h += '<p class="note">Meydan okumada başarım ve koleksiyon kazanılmaz.</p>';
  h += `<div class="sec">🏅 Başarımlar · her biri +${ACH_REWARD} ₺</div><div class="achgrid">${ACH.map(a => { const on = !!meta.ach[a.id];
    return `<div class="ach${on ? ' on' : ''}"><span class="e">${on ? a.icon : '🔒'}</span><span class="n">${a.name}</span><span class="d">${a.desc}</span></div>`; }).join('')}</div>`;
  h += `<div class="sec">☕ İçecekler</div><div class="achgrid small">${drinks.map(id => { const n = meta.album.drinks[id];
    return `<div class="ach${n ? ' on' : ''}"><span class="e">${n ? DRINKS[id].icon : '❔'}</span><span class="n">${n ? DRINKS[id].name : '???'}</span><span class="d">${n ? `${n.toLocaleString('tr-TR')} satıldı` : 'Henüz satılmadı'}</span></div>`; }).join('')}</div>`;
  h += `<div class="sec">👋 Misafirler</div><div class="achgrid small">${guests.map(([k, id, ic, name]) => { const n = meta.album[k][id];
    return `<div class="ach${n ? ' on' : ''}"><span class="e">${n ? ic : '❔'}</span><span class="n">${n ? name : '???'}</span><span class="d">${n ? `${n.toLocaleString('tr-TR')} kez` : k === 'vips' ? 'Ünlü bir misafir' : 'Henüz gelmedi'}</span></div>`; }).join('')}</div>`;
  return h;
}

function meydan() {
  const days = lastDays(7), played = Object.keys(meta.ch).length, today = days[0][1];
  if (CHALLENGE) {
    const i = challengeInfo();
    return item({ col: true, ic: '🏆', t: `Günün Meydan Okuması · ${keyLabel(i.key)}`, s: `${i.hood.icon} ${i.hood.name}<br>${i.rule.icon} ${i.rule.name}: ${i.rule.desc}${i.event ? `<br>${i.event.icon} ${i.event.name}` : ''}<br>Gün sonunda puan: kâr + servis × 25 + memnuniyet × 400` })
      + `<div class="actions"><button class="btn block" data-act="chHome">🏠 Ana oyuna dön</button></div>`;
  }
  let h = item({ col: true, ic: '🏆', t: 'Günün Meydan Okuması', s: 'Bugün herkes aynı mahallede, aynı hava, aynı olay ve aynı kuralla tek bir gün oynar. Skorunu arkadaşlarına gönder, bakalım geçebilecekler mi?' });
  h += stats([[today ? today.toLocaleString('tr-TR') : '—', 'Bugünkü rekorun'], [`🔥 ${meta.chStreak && (days[0][1] || days[1][1]) ? meta.chStreak : 0}`, 'Gün serisi'], [played, 'Oynanan gün']]);
  h += `<div class="actions"><button class="btn primary block" data-act="chPlay">${today ? '🔁 Tekrar oyna' : '▶ Bugünkü meydan okumayı oyna'}</button></div>
    <p class="note">Ana oyunun kaydedilir; meydan okuma ona dokunmaz. Her gün yeni bir meydan okuma gelir.</p><div class="sec">Son 7 gün</div>`;
  h += days.map(([k, v]) => item({ dim: !v, ic: v ? '🏆' : '▫️', t: keyLabel(k), ac: `<b>${v ? v.toLocaleString('tr-TR') : '—'}</b>` })).join('');
  return h;
}

export function renderMeta(sg) { return sg === 'marka' ? marka() : sg === 'album' ? album() : meydan(); }

export const META_ACT = {
  seg(arg) { const [sh, sg] = arg.split(':'); hideModal(); openSheet(sh, sg); },
  perk(id) {
    if (!buyPerk(id)) return;
    confetti(30); haptic(20);
    toast(`${PERKS[id].icon} ${PERKS[id].name} alındı!`);
  },
  franchiseOpen() { showFranchise(false); },
  franchiseGo(rule) { if (canFranchise()) franchise(rule); },
  chPlay() { save(); playChallenge(); },
  chRetry() { playChallenge(); },
  chHome() { leaveChallenge(); },
  async chShare() {
    const r = getLastResult(); if (!r) return;
    const res = await share(shareText(r));
    if (res === 'copied') toast('📋 Skorun kopyalandı! WhatsApp’a yapıştırıp gönderebilirsin.', 4000);
    else if (res === 'fail') showModal(`<h2>📤 Skorunu paylaş</h2><p>Metni kopyalayıp arkadaşlarına gönder:</p>
      <textarea readonly rows="5" style="width:100%" onclick="this.select()">${esc(shareText(r))}</textarea>
      <div class="actions"><button class="btn block" data-act="chHome">🏠 Ana oyun</button><button class="btn primary block" data-act="chRetry">🔁 Tekrar dene</button></div>`);
  },
};
