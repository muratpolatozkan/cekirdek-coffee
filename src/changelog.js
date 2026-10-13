// Sürüm notları: oyuna güncellemeden sonra dönen oyuncuya "neler yeni" gösterilir.
// Yeni sürümde en üste bir kayıt ekle ve v'yi bir artır.
export const CHANGELOG = [
  { v: 9, date: '13 Ekim 2026', title: 'Şubeye özel fiyat', items: [
    '📍 Menü bütün şubelerde ortak kalıyor ama artık her şubenin kendi <b>fiyat ayarı</b> var (−%30 ile +%50 arası). Kampüs’te indirim yap, Moda’da ve Plaza’da fiyatı artır!',
    '🚫 İstemediğin bir içeceği sadece o şubede kapatabilirsin.',
    '💡 Dükkan → Menü’de her mahalle için hangi yönde ayar yapman gerektiğini anlatan bir ipucu var.',
  ] },
  { v: 8, date: '13 Ekim 2026', title: 'Düzenle modu ve daha cömert franchise', items: [
    '✏️ Eşyaya dokunmak artık taşı/sat menüsünü açmıyor; bara dokunup hızlandırmak ve masa toplamak kesintisiz. Eşyaları düzenlemek için sağdaki <b>Düzenle</b> düğmesi var.',
    '🤝 <b>Franchise telifi:</b> bıraktığın markalar çalışmaya devam ediyor ve her gün sana telif ödüyor, sonsuza dek.',
    '💼 Franchise yaparken kasanın %5’i (en fazla 20.000 ₺) <b>kurucu payı</b> olarak yeni sezona geliyor.',
    '🏷️ Marka adın, logon ve imza tariflerin yeni sezona seninle geliyor.',
    '🎁 Daha önce franchise yaptıysan o markalar da ağına eklendi; telifin hemen başlıyor.',
  ] },
  { v: 7, date: '13 Ekim 2026', title: 'Oyun artık bitmiyor!', items: [
    '🏆 <b>Günün Meydan Okuması:</b> her gün herkes aynı mahalle, hava ve kuralla bir gün oynar. Skorunu arkadaşlarına gönder! (Daha → Meydan)',
    '⭐ <b>Franchise yenilendi:</b> yıldızlarını kalıcı yeteneklere harca, her yeni sezona bir kural seç. Zor kural = fazladan yıldız. (Daha → Marka)',
    '🏅 <b>44 başarım</b> ve <b>koleksiyon albümü:</b> içecekler, müşteri tipleri ve ünlü misafirler. (Daha → Koleksiyon)',
    '💫 Eski franchise yıldızların korunuyor; artık onları yeteneklere harcayabilirsin.',
  ] },
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
