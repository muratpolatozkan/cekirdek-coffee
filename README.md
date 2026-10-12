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
