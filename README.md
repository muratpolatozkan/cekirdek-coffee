# ☕ Çekirdek Coffee

Mahalle arasında küçük bir 3. dalga kahveci açıp onu caddenin en sevilen dükkanına dönüştürdüğün izometrik bir tarayıcı oyunu.

**Oyna:** https://muratpolatozkan.github.io/cekirdek-coffee/

## Oyun

- Caddeden geçenler; puanın, atmosferin ve fiyatların uygunsa içeri girer
- Barista ve komi işe al, eğit
- Çekirdek ve süt stoğunu yönet, kendi çekirdeğini kavur
- Menüyü genişlet, fiyatları belirle
- Yandaki dükkanları kiralayıp duvarları yık, büyü
- Gün sonu raporları, müşteri yorumları ve hedefler

## Telefona kurma

Oyun bir PWA: telefona uygulama gibi kurulur, tam ekran açılır ve internet olmadan da oynanır.

- **iPhone (Safari):** Paylaş butonu → **Ana Ekrana Ekle**
- **Android (Chrome):** ⋮ menü → **Uygulamayı yükle** / **Ana ekrana ekle**

Telefonda tek parmakla kaydır, iki parmakla yakınlaştır. Eşya koyarken önce dokunup önizle, aynı kareye tekrar dokunarak onayla.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| Tıkla | Eşya yerleştir / kirli masayı topla |
| R | Döndür |
| Esc | İptal |
| S / M | Sat / Taşı |
| 1–9 | Eşya seç |
| Boşluk | Duraklat |
| Sürükle / Tekerlek | Kaydır / Yakınlaştır |

## Yerelde çalıştırma

```bash
python3 -m http.server 8642
```

Sonra http://127.0.0.1:8642 adresini aç.

Three.js ile yapıldı. Tek dosya: `index.html`.
