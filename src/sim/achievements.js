// Başarımlar (kalıcı rozetler) ve koleksiyon albümü (satılan içecekler, ağırlanan müşteri tipleri ve ünlüler)
import { DRINKS, VIPS } from '../config.js';
import { S, meta, saveMeta, saveHooks, CHALLENGE } from '../state.js';
import { rating, netWorth } from './economy.js';
import { level } from './progress.js';
import { note } from '../ui/toast.js';
import { confetti } from '../ui/overlay.js';
import { sparkle } from '../audio.js';

const st = k => S.stat?.[k] || 0;
const owned = b => b.units.filter(x => x === 'own').length;
const baseDrinks = () => Object.keys(DRINKS).filter(id => !DRINKS[id].custom);
const menuCount = () => Object.keys(DRINKS).filter(id => S.menu[id]?.on).length;

// [id, ikon, ad, açıklama, şart]
export const ACH = [
  ['s10', '☕', 'İlk fincanlar', '10 müşteriye servis yap', () => S.served >= 10],
  ['s100', '☕', 'Mahallenin kahvecisi', '100 servis yap', () => S.served >= 100],
  ['s1k', '🏆', 'Bin fincan', '1.000 servis yap', () => S.served >= 1000],
  ['s5k', '🏆', 'Kahve fabrikası', '5.000 servis yap', () => S.served >= 5000],
  ['s20k', '👑', 'Efsane', '20.000 servis yap', () => S.served >= 20000],
  ['day1', '🌙', 'İlk gün', 'İlk günü bitir', () => S.day >= 2],
  ['day7', '📅', 'Bir hafta', '7 gün dayan', () => S.day >= 8],
  ['day30', '📅', 'Bir ay', '30 gün dayan', () => S.day >= 31],
  ['m10k', '💰', 'İlk birikim', 'Servetin 10.000 ₺ olsun', () => netWorth() >= 1e4],
  ['m50k', '💰', 'Esnaf', 'Servetin 50.000 ₺ olsun', () => netWorth() >= 5e4],
  ['m250k', '💎', 'Zengin', 'Servetin 250.000 ₺ olsun', () => netWorth() >= 2.5e5],
  ['m1m', '💎', 'Milyoner', 'Servetin 1.000.000 ₺ olsun', () => netWorth() >= 1e6],
  ['r45', '⭐', 'Çok sevilen', 'Bir şubenin puanı 4.5 olsun (en az 20 yorum)', () => S.branches.some(b => b.reviews.length >= 20 && rating(b) >= 4.5)],
  ['r48', '🌟', 'Kusursuz', 'Bir şubenin puanı 4.8 olsun (en az 40 yorum)', () => S.branches.some(b => b.reviews.length >= 40 && rating(b) >= 4.8)],
  ['u2', '🔑', 'Duvar yıkıldı', 'Yandaki dükkanı kirala', () => S.branches.some(b => owned(b) >= 2)],
  ['u4', '🏠', 'Sokağın sahibi', 'Bir caddedeki 4 dükkanın hepsi senin olsun', () => S.branches.some(b => owned(b) >= 4)],
  ['b2', '🏙️', 'İkinci şube', 'Yeni bir mahallede şube aç', () => S.branches.length >= 2],
  ['b4', '🌆', 'Zincir', '4 şuben olsun', () => S.branches.length >= 4],
  ['lv3', '🎖️', 'Tanınan', 'Seviye 3’e ulaş', () => level() >= 3],
  ['lv6', '🎖️', 'Usta', 'Seviye 6’ya ulaş', () => level() >= 6],
  ['lv10', '🎖️', 'Şehrin markası', 'Seviye 10’a ulaş', () => level() >= 10],
  ['art1', '🎨', 'İlk kalp', 'Mükemmel bir latte art yap', () => S.perfectArts >= 1],
  ['art25', '🎨', 'Sanatçı', '25 mükemmel latte art yap', () => S.perfectArts >= 25],
  ['art100', '🖼️', 'Latte ustası', '100 mükemmel latte art yap', () => S.perfectArts >= 100],
  ['rec1', '🧪', 'Mucit', 'Atölyede kendi tarifini yarat', () => S.customs.length >= 1],
  ['rec5', '📒', 'Tarif defteri', '5 tarif yarat', () => S.customs.length >= 5],
  ['menu', '📋', 'Zengin menü', 'Menünde aynı anda 10 içecek olsun', () => menuCount() >= 10],
  ['ev1', '🎸', 'Organizatör', 'Bir etkinlik düzenle', () => S.eventsHeld >= 1],
  ['ev10', '🎪', 'Mahallenin kalbi', '10 etkinlik düzenle', () => S.eventsHeld >= 10],
  ['rush1', '🏃', 'Akını karşıla', 'Bir yoğun saat akınını başarıyla karşıla', () => st('rush') >= 1],
  ['rush10', '⚡', 'Akın ustası', '10 akını başarıyla karşıla', () => st('rush') >= 10],
  ['goal10', '🎯', 'Hedef odaklı', '10 günlük hedef tamamla', () => st('goals') >= 10],
  ['goal50', '🎯', 'Planlı çalışan', '50 günlük hedef tamamla', () => st('goals') >= 50],
  ['insp', '🧾', 'Tertemiz', 'Sağlık denetiminden tam puanla geç', () => st('insp') >= 1],
  ['infl', '📸', 'Viral', 'Influencer’ı memnun et', () => st('infl') >= 1],
  ['vip5', '⭐', 'VIP salonu', '5 VIP’yi hızlıca ağırla', () => st('vip') >= 5],
  ['rival', '🥊', 'Rakip kapandı', 'Rakip kahveciyi kapanmaya zorla', () => S.branches.some(b => b.rival.closed)],
  ['alldr', '📖', 'Tadımcı', 'Bütün içecekleri en az bir kez sat', () => baseDrinks().every(id => meta.album.drinks[id])],
  ['allvip', '📖', 'Ünlüler albümü', 'Bütün ünlüleri ağırla', () => VIPS.every(v => meta.album.vips[v.name])],
  ['fr1', '⭐', 'Franchise', 'Markanı ilk kez franchise yap', () => meta.runs >= 1],
  ['fr3', '🌟', 'Marka imparatorluğu', '3 kez franchise yap', () => meta.runs >= 3],
  ['hard', '🔥', 'Zor yoldan', 'Zor kurallı (+2⭐ ve üstü) bir sezonu franchise ile bitir', () => meta.hardRuns >= 1],
  ['ch1', '🏆', 'Meydan okuyan', 'Günün meydan okumasını bitir', () => Object.keys(meta.ch).length >= 1],
  ['ch7', '🔥', 'Haftalık seri', '7 gün üst üste meydan okumayı bitir', () => meta.chStreak >= 7],
].map(([id, icon, name, desc, test]) => ({ id, icon, name, desc, test }));
export const ACH_REWARD = 300;
export const achCount = () => ACH.filter(a => meta.ach[a.id]).length;

// birkaç saniyede bir çağrılır; aynı anda tek rozet kutlanır
export function checkAch() {
  if (CHALLENGE || !S.branches) return;
  for (const a of ACH) {
    if (meta.ach[a.id]) continue;
    let ok = false; try { ok = a.test(); } catch (e) {}
    if (!ok) continue;
    meta.ach[a.id] = Date.now(); saveMeta();
    S.money += ACH_REWARD;
    note(`🏅 Başarım: ${a.icon} ${a.name} · +${ACH_REWARD} ₺`, 4000);
    confetti(30); sparkle();
    return;
  }
}

// koleksiyon: kind = drinks | types | vips
export function collect(kind, id) {
  if (CHALLENGE || id == null) return;
  const m = meta.album[kind];
  if (!m[id] && kind === 'vips') note(`📖 Koleksiyona eklendi: ⭐ ${id}`, 3000);
  m[id] = (m[id] || 0) + 1;
}
export const statUp = (k, n = 1) => { if (S.stat) S.stat[k] = (S.stat[k] || 0) + n; };
saveHooks.push(() => { if (!CHALLENGE) saveMeta(); });
