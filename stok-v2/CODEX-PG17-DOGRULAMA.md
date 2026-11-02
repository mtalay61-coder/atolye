# PostgreSQL 17 doğrulaması

Tarih: 2026-11-02T20:13:29+03:00. İncelenen kaynak: `0e30715a1bb35660a39f27a75c36af2228eaf033` (`codex/erp-butunluk-tamamlama`). Uygulama adayı 1.744.3; bu çalışma üretim kodunu veya SQL'yi değiştirmez.

## Sonuç

PostgreSQL 17.11 üzerinde mevcut bütünlük koşucusu ve ayrı kopyada geri dönüş/yeniden kurulum provası çıkış 0 ile tamamlandı. F0 60/60 yeşil. F2 70 yeşil ve eski istemciye ait 3 bilinen kırmızıyla beklentiye uydu. Bütün sistemin kusursuz olduğu veya canlıya geçiş onayı verildiği anlamına gelmez.

| Kontrol | Sonuç |
|---|---|
| Temiz kurulum, göçler, SQL Editor gibi parça parça kurulum ve tekrar kurulum | Geçti |
| Uçtan uca stok/cari/kasa fişleri, R1/R1b | Geçti |
| F0 | 60 yeşil, 0 kırmızı |
| Çek çift tahsil | 100 yarış; tek tahsil/tek kasa hareketi; bayat yazma reddi |
| Sipariş iptali / yeni rezervasyon | 100 yarış; iptal siparişte aktif rezervasyon kalmadı |
| Sipariş iptali / teslim | 100 doğal ve iki yönde 3'er zorlanmış sıra; kilit beklemesi gözlendi |
| F3 satış sınırı / teslim yarışı | Sınır, yetkili istisna ve 100 yarış geçti |
| F8 renk taşıma / fiş iptali | Zorlanmış sıra ve 100 doğal yarış; sıfır kilitlenme/bozuk veri |
| F2 teslim geçmişi koruması | Beş çiftin her birinde 100 doğal yarış ve zorlanmış sıralar; beklentiyle aynı |
| Finans ek kontrolleri | Hesap koruması, sonlu tutar, sürüm kapısı, toplu iptal, seyrek alan, RLS tekrar kurulumu geçti |
| Birim testleri | 92 dosya; başarısız süreç 0; çıktıda 1.636 ✓ ve 0 ✗ işareti |
| Kaynak birleştirme / kontrol.sh / diff boşluk kontrolü | Temiz |
| Geri dönüş / yeniden kurulum | İki eski hata geri üretildi; güncel SQL yeniden kurulunca korumalar geçti; audit kaybı yok |

F2'nin üç kırmızısı eski 1.742.1 istemcinin otomatik yeniden denemesi, inceleme durumunu göstermesi ve ilgisiz değişikliği ayırmasıdır. Beklentiler veya test kodları değiştirilmedi. Güvenli geçişte minimum istemci sürümü etkinleştirilerek eski istemcilerin yazması engellenmelidir.

## Ortam ve kanıt sınırı

- Yerel TCP 127.0.0.1:55437, yalnız `atolye_stok_v2_sinama` ve geri dönüş kopyası; UTC, JIT kapalı, tmpfs. Gerçek PostgreSQL işlemleri ve çok bağlantılı kilitler kullanıldı.
- PostgreSQL 17.11, canlıdaki 17.6.1.166 ile aynı ana sürümdedir; aynı Supabase derlemesi değildir. Paket kaynakları ve doğrulanan SHA256 değerleri `test/pg17/runtime.json` içinde.
- Ortam yalnız uid 0 eşlediği için önceki test ortamındaki yerel UID/ownership adaptörü sunucu sürecinde kullanıldı. PostgreSQL ikilileri değiştirilmedi; işletim sistemi güvenliği veya üretim diskinin dayanıklılığı bu testin kapsamı değildir.
- Supabase JWT/rolleri depo fixture'ıyla taklit edildi; gerçek HTTPS, PostgREST, gerçek kullanıcı oturumu ve portal yetki matrisi bu koşuyla doğrulanmadı. Canlı şemanın birebir kopyası değil, deponun test şeması kullanıldı.
- Testler kasıtlı bozuk veri ve hata enjeksiyonu oluşturur. Ham logdaki kapsam dışı genel denetim gözlemleri veya kasıtlı ret/deadlock satırları canlı veri sonucu değildir; kabul, test kimlikleri ve koşucu sonucuna göredir.
- Bu turda tarayıcı altın çıktıları yeniden çalıştırılmadı. Önceki rapordaki 8/8 sonucu bu koşunun yeni kanıtı olarak sunulmaz.
- Canlıya SQL uygulanmadı; main, deploy, minimum sürüm, fiş ayarları ve surum.json değiştirilmedi.

## Yeniden çalıştırma

Boş, yerel PostgreSQL 17 test sunucusunda `npm ci --ignore-scripts --no-audit --no-fund` sonrası:

```bash
export PGHOST=127.0.0.1 PGPORT=55437 PGUSER=postgres
bash stok-v2/test/kos-butunluk.sh
ATOLYE_GERI_CIKTI=/tmp bash stok-v2/test/butunluk/geri-donus.sh
```

Birim koşusu, sıralanmış `test/birim-*.js` dosyalarının tamamını ayrı Node süreçleriyle çalıştırdı; süreç sonuçları `test/pg17/ozet-birim.json` içinde. Ham çıktılar `test/pg17/sonuc-*.txt`, kasıtlı geri dönüş kırmızıları `geri-cek-red.txt` ve `geri-alt-red.txt` içindedir. SHA256 listesi `test/pg17/sha256.json` içindedir.

## Kalan kabul işi

Canlı şemaya göre geçiş paketinin ayrı ortamda provası, gerçek oturumlarla yetki/portal testi ve uygulama yayın paketinin doğrulanması. Sonrasında ayrı açık canlı geçiş onayı gerekir. Bu raporun kaydı, canlı geçişi etkinleştirmez.
