# Ekran sınaması — 1.744.7 stok ve kasa (7 Kasım; e386369)

**Kapsam:** canlıdaki 1.744.7 (origin/main) uygulama EKRANINDAN — Playwright tarayıcısında giriş yapılır, düğmelere basılır, formlar
doldurulur. Bulut istekleri `test/gercek-pg-kopru.js` ile **yerel** PostgreSQL'e gider (Supabase'e değil): gerçek sunucu işlemleri
(`fis_kes`, `fis_iptal`), tetikleyiciler, RLS, yetkiler. Veritabanı canlı benzeri kopya (`atolye_guvenlik` → 12-geri-al = canlının
bugünkü hâli; fiş kuralları ve sürüm kapısı KAPALI; kullanıcı girişi açık, Ali = Yönetici). Koşucu: `test/ekran/kos-ekran.sh`.

**Sınırlar (dürüst):** PostgREST yerine kendi köprümüz (uygulamanın kullandığı alt küme; desteklenmeyen biçim hata döner, sessiz
geçmez). Yerel test şeması canlının sadeleştirilmiş hâli — ana tablolardaki eksik sütunlar uygulamanın kendi şema tanımından
tamamlandı (`test/ekran/sema-tamamla.sql`, türler tahmini); stok / kasa HAREKETLERİ ve fişler v2 tablolarında, canlıyla aynı
kaynaktan. Şifre doğrulanmaz (yerel jeton). Gerçek cihazda, gerçek Supabase'de elle deneme bunun yerini tutmaz.

**Ölçüm:** her adımda iki yerden — SUNUCU (stok: `stk_stok` görünümü; kasa: `kas_hareket` geçerli Giriş − Çıkış) ve EKRAN (stok:
Bağımsız Stok Girişi formunda her beden için "mevcut:"; kasa: Kasa & Banka listesinde Merkez Kasa bakiyesi).

## Sonuç

### Stok — Ekran Bot, renk / beden (beklenen = sunucu = ekran)

| Adım | Siyah 40 | Siyah 41 | Taba 40 | Taba 41 | Sunucu | Ekran |
|---|---|---|---|---|---|---|
| 0 · başlangıç | 0 | 0 | 0 | 0 | ✓ | ✓ |
| 1 · giriş Siyah 40:5 41:3 | 5 | 3 | 0 | 0 | ✓ | ✓ |
| 2 · giriş Taba 40:2 | 5 | 3 | 2 | 0 | ✓ | ✓ |
| 3 · çıkış Siyah 40:2 | 3 | 3 | 2 | 0 | ✓ | ✓ |
| 4 · çıkış fişinin iptali | 5 | 3 | 2 | 0 | ✓ | ✓ |
| 5 · sayfa yenilendi | 5 | 3 | 2 | 0 | ✓ | ✓ |
| 6 · Kaydet'e çift tık (Taba 41:4) | 5 | 3 | 2 | 4 | ✓ | ✓ |
| 7 · aynı kaydetme isteği ağda iki kez (Siyah 41:1) | 5 | 4 | 2 | 4 | ✓ | ✓ |
| 8 · yanıt kaybı (Taba 40:3) | 5 | 4 | 5 | 4 | ✓ | ✓ |
| 9 · sayfa yenilendi | 5 | 4 | 5 | 4 | ✓ | ✓ |

### Kasa — Merkez Kasa (TRY) bakiyesi

| Adım | Beklenen | Sunucu | Ekran |
|---|---|---|---|
| 0 · başlangıç | 50.400 | 50.400 ✓ | 50.400 ✓ |
| 1 · gelir 1.000 | 51.400 | 51.400 ✓ | 51.400 ✓ |
| 2 · gider 250 | 51.150 | 51.150 ✓ | 51.150 ✓ |
| 3 · gelirin iptali | 50.150 | 50.150 ✓ | 50.150 ✓ |
| 4 · sayfa yenilendi | 50.150 | 50.150 ✓ | 50.150 ✓ |
| 5 · Kaydet'e çift tık (gelir 400) | 50.550 | 50.550 ✓ | 50.550 ✓ |
| 6 · aynı kaydetme isteği ağda iki kez (gider 75) | 50.475 | 50.475 ✓ | 50.475 ✓ |
| 7 · yanıt kaybı (gelir 60) | 50.535 | 50.535 ✓ | 50.535 ✓ |
| 8 · sayfa yenilendi | 50.535 | 50.535 ✓ | 50.535 ✓ |

Çift kaydetme denemeleri (her birinde sunucuda **tek fiş**):
- **Kaydet'e çift tık** — stok ve kasa: tek fiş.
- **Aynı istek ağda iki kez** (aynı istek kimliği) — sunucu ikinciye `zatenVar: true` döndü, yeni satır yok.
- **Yanıt kaybı** (sunucu yazdı, cihaz yanıtı alamadı) — uygulama isteği AYNI kimlikle kendisi yeniden gönderdi, sunucu "zaten var"
  dedi, form kapandı, "kaydedildi" bildirimi; tek fiş. Kullanıcının yeniden basmasına gerek kalmadı.
- İptal: stokta Fişler › sağ tık › Sil (çıkış fişi `MNL-…` iptal, 1 stok satırı); kasada Tahsilat / Ödeme gir › son hareketler › sil
  (gelir fişi `GL-…` iptal, 1 kasa satırı). İki yenilemeden sonra stok ve bakiye aynı.

Tekrarlanabilirlik: tam koşu (stok 24 + kasa 22 + yarış 8 deneme + zorla tazeleme yarışı) iki kez, ikisi de TEMİZ (46 ✓ / 0 ✗; `test/ekran/sonuc-kos-ekran-1.txt`, `-2.txt`); stok ve kasa ayrıca birer kez tek başına temiz.

## Gözlemler

1. **Tek seferlik ekran gecikmesi (yeniden üretilemedi).** İlk keşif koşusunda çıkıştan sonra bildirim "Başka cihazdan güncellendi:
   Stok" oldu ve formdaki "mevcut:" eski değeri (5) gösterdi; sunucu doğruydu (3), sayfa yenilenince ekran düzeldi. Aynı adım 8 kez
   art arda (`ekran-stok-yaris.js`) ve zorla kurulmuş yeniden-okuma ↔ kaydetme yarışında (`ekran-stok-tazeleme.js`: okuma 4 sn
   bekletildi, okuma yoldayken çıkış) ekran her seferinde sunucuyla aynı. Sunucu verisi hiçbir koşuda yanlış değildi.
2. **Yanlış "Başka cihazdan güncellendi: Stok" bildirimi.** Tek cihazla çalışırken, kendi kaydından ~12 sn sonra (ör. kasa gideri,
   ilk stok girişi) çıkıyor ve kaydetme bildiriminin yerini alıyor. Kod: yeniden okunan stok cihazdaki kopyadan "farklı" çıkınca
   (047 / 100 `bulutDegisikligiUygula`). Kasa sınamasında stoğa dokunulmadan da çıktı → kopya ile sunucu arasında biçim farkı.
   Veri değişmiyor; test verisinden mi (eski sınama satırları) canlıda da mı olduğu bu ortamda kanıtlanamadı.

## Karar

- **Stok: günlük kullanıma hazır.** Giriş / çıkış / iptal doğru renk-beden stoğunu verdi; yenileme sonrası korundu; çift
  kaydetmenin üç biçiminde de tek hareket. Gözlem 2 kozmetik (yanlış bildirim).
- **Kasa: günlük kullanıma hazır.** Gelir / gider / iptal doğru bakiyeyi verdi; yenileme sonrası korundu; çift kaydetmede tek hareket.
  Gözlem 2 burada da görüldü (kozmetik).
