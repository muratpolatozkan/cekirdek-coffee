// Sürüm notları: oyuna güncellemeden sonra dönen oyuncuya "neler yeni" gösterilir.
// Yeni sürümde en üste bir kayıt ekle ve v'yi bir artır.
export const CHANGELOG = [
  { v: 6, date: '13 Ekim 2026', title: 'Yenilikler penceresi', items: [
    '📰 Oyun güncellenince burada neyin değiştiğini göreceksin. Eski notlar Daha → Ayarlar → Yenilikler’de.',
    '🔑 Kiralık tabelası artık kayıp gitmiyor, hep kiralık dükkanın vitrinindeki afişin üstünde duruyor.',
    '⚡ Güncellemeler artık telefona hemen geliyor.',
  ] },
  { v: 5, date: '13 Ekim 2026', title: 'Dükkan genişletme yenilendi', items: [
    '🔑 Yandaki boş dükkanın üstünde <b>Kiralık</b> tabelası var. Dokun, kira kartında fiyatı ve şartları gör.',
    '🧱 Kiralayınca duvar yıkılıyor ve kamera yeni alana gidiyor.',
    '🏠 Genişletme artık <b>2. seviyede</b> açılıyor. Daha → Genişlet’te caddeyi topluca görürsün.',
    '🛠️ Oyun duraklatılınca ekranın boş kalması düzeltildi.',
  ] },
  { v: 4, date: '12 Ekim 2026', title: 'Kolay başlangıç', items: [
    '👆 Yeni rehber: ne yapacağını parmakla gösteriyor, öğrenirken oyunu duraklatıyor.',
    '🪑 Eşya koymak kolaylaştı: boş yer kendisi bulunuyor, sürükleyip ✓ ile koyuyorsun.',
    '✋ Eşyaya dokun: döndür, taşı ya da sat.',
    '🎯 Üstte hep o anki hedefin yazıyor.',
  ] },
  { v: 3, date: '11 Ekim 2026', title: 'Kayıt koruması', items: [
    '💾 Oyun iki sekmede açılınca kayıtlar artık birbirini silmiyor.',
    '🗂️ Son 3 günün yedeği tutuluyor; Ayarlar’dan geri yükleyebilirsin.',
    '📤 Kaydını kodla başka bir cihaza taşıyabilirsin.',
  ] },
];
export const LATEST = CHANGELOG[0].v;

const KEY = 'cekirdek-seen-ver';
export function seenVersion() { try { return +localStorage.getItem(KEY) || 0; } catch { return LATEST; } }
export function markSeen() { try { localStorage.setItem(KEY, String(LATEST)); } catch {} }
