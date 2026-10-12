# ☕ Çekirdek Coffee

Mahalle arasında küçük bir 3. dalga kahveci açıp onu caddenin en sevilen dükkanına, sonra da bir zincire dönüştürdüğün izometrik bir tarayıcı oyunu.

**Oyna:** https://muratpolatozkan.github.io/cekirdek-coffee/

## Oyun

- **Cadde hayatı:** Yayalar, arabalar, kedi ve komşu dükkanlar. Caddeden geçenler puanına, atmosferine ve fiyatlarına bakıp içeri girer.
- **Hava ve mevsimler:** Yağmurda cadde boşalır ama girenler uzun oturur. Sıcakta cold brew patlar. Gün sonunda yarının tahmini gelir.
- **Rastgele olaylar:** Influencer ziyareti, sağlık denetimi, maç günü, elektrik kesintisi, sokak festivali ve kahve borsası.
- **Müdavimler ve mahalle:** Adı ve hikayesi olan düzenli müşteriler, komşulardan gelen istekler ve sokağın köşesine açılan rakip kahveci.
- **Kahvecilik:** Latte art mini oyunu, imza tarifler (Türk kahvesi, tahinli latte, salep…) ve tatlılık ayarı. Kendi kavurduğun çekirdek ve kavurma profili.
- **Personel:** Barista ve komi işe al, eğit, zam yap. Yorgunluk, moral ve özel yetenekler var.
- **Etkinlikler:** Akustik gece, tadım atölyesi, mutlu saat, kitap kulübü.
- **Büyüme:** Yan dükkanları kiralayıp duvarları yık, teras aç. Kampüs, Moda ve Levent'te şube aç, sonra franchise yapıp kalıcı yıldızlarla baştan başla.
- **Kişiselleştirme:** Duvar rengi, zemin, duvar dekorları, kendi tabelan ve logon. Fotoğraf modu ve lo-fi müzik.

## Oyun akışı

- **Rehber ve seviyeler:** İlk oyunda adım adım rehber var. Servis yaptıkça XP kazanıp seviye atlarsın, her seviye yeni özellikler açar (ekip, mahalle, dekor, rakip, teras, şubeler…).
- **Günlük hedefler:** Her gün 3 küçük hedef ve ödülü.
- **Kısa günler:** Bir gün yaklaşık 6 dakika sürer. Sen yokken dükkan para biriktirir (en fazla 8 saatlik).
- **Aktif oyun:** Barista çalışırken bara dokunarak hızlandır. Yoğun saat akınlarında süre dolmadan hedefi tuttur, VIP siparişlerini hızlı hazırla, latte art'ta seri yaparak kalp → lale → kuğu desenlerini aç, tarif atölyesinde kendi içeceğini tasarla.
- **Pil tasarrufu:** Telefonlarda varsayılan olarak açık. Ayarlardan kapatılabilir.

## Telefona kurma

Oyun bir PWA: telefona uygulama gibi kurulur, tam ekran açılır ve internet olmadan da oynanır.

- **iPhone (Safari):** Paylaş butonu → **Ana Ekrana Ekle**
- **Android (Chrome):** ⋮ menü → **Uygulamayı yükle** / **Ana ekrana ekle**

Telefonda tek parmakla kaydır, iki parmakla yakınlaştır. Alttaki çubuktan **🛠️ İnşa · 👥 Ekip · ☕ Dükkan · 👋 Mahalle · ☰ Daha** sayfalarını aç. Eşya koyarken kareye dokun, alttaki **✓ Koy** ile onayla.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| Tıkla | Eşya yerleştir / kirli masayı topla |
| R | Döndür |
| Esc | İptal |
| S / M | Sat / Taşı |
| 1–9 | Eşya seç |
| P | Fotoğraf çek |
| Boşluk | Duraklat |
| Sürükle / Tekerlek | Kaydır / Yakınlaştır |

## Geliştirme

Build adımı yok: tarayıcının kendi ES modülleri ve CDN'den Three.js kullanılıyor.

```bash
python3 -m http.server 8642
```

Sonra http://127.0.0.1:8642 adresini aç. Adrese `?debug` eklersen konsolda `G` nesnesi açılır: `G.run(saniye)` simülasyonu hızlandırır, `G.reset()` kaydı siler.

```
index.html, styles.css, sw.js, manifest.webmanifest
src/
  main.js        giriş noktası ve ana döngü
  config.js      bütün oyun verisi (eşyalar, içecekler, mahalleler, olaylar…)
  state.js       oyun durumu, kayıt ve eski kayıtları taşıma
  audio.js       ses efektleri ve lo-fi müzik (WebAudio)
  engine/        sahne ve kamera, malzemeler ve dokular, modeller, parçacıklar
  world/         cadde ve mahalle temaları, dükkan birimleri, hava ve ışık
  sim/           ızgara ve yol bulma, ekonomi, insanlar, personel, gün döngüsü,
                 müdavimler, rakip, olaylar, görevler ve hedefler, şubeler
  ui/            üst bilgi, paneller, pencereler, giriş, latte art, fotoğraf
```
