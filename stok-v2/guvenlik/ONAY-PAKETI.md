# Güvenlik + portal düzeltmeleri — SON ONAY PAKETİ (3 Kasım; canlıya UYGULANMADI)

Kapsam DIŞI (ayrı onay): fiş kuralları (`19-fis-kural-ac.sql`), sürüm kapısı (`min_istemci_surum`), sızmış parola denetimi
(plan uygunluğu ve mevcut ayar önce panelden doğrulanacak).

## Uygulama sırası (Supabase › SQL Editor, her dosya ayrı sekmede, tamamı yapıştırılıp Run)

| # | Dosya | Ne yapar | Etkilenen | Geri alma |
|---|---|---|---|---|
| — | `0-site-yetki-onar.sql` | 8 site fonksiyonuna girişsiz çalıştırma yetkisi | **3 Kasım'da canlıda çalıştırıldı** (giriş çalıştı) | gerekmez (site-portal.sql'in verdiği yetkiler) |
| ✓ 1 | `0b-portal-hesap-duzelt.sql` — **3 Kasım'da canlıda çalıştırıldı**; A: 4× true, B: satır yok, C: hatasız (Deneme Müşteri, dönemde hareket yok), sayfa açıldı | `portal_hesap`: tarih metin karşılaştırması (42883); `site_pb`: boş para birimi → TRY (22023). `site_pb`'nin yolu tanımla sabitlenir | 2 fonksiyon, yetkiler aynı | `0b-portal-hesap-geri.sql` (main'deki = canlıdaki tanımlar) |
| 2 | `2-sikilastir.sql` | 22 fonksiyonun anon + PUBLIC çalıştırma yetkisi alınır (authenticated / service_role bugünkü hâliyle açıkça korunur); 21 (0b'den sonra 20) fonksiyona `search_path = public, extensions, pg_temp`; postgres'in public varsayılan yetkisinden anon çıkar; önceki hâl `guvenlik.yedek`'e | 22 + 21 fonksiyon, 1 varsayılan yetki | `3-geri-al.sql` (yedekten birebir; sonunda karşılaştırır) |
| 3 | `rls-kimlik.sql` (değişti) | Yalnız İLERİDE yeniden çalıştırıldığında: anon'dan alınan yetkilerden sonra 8 site fonksiyonunu geri açar (site bir daha kapanmasın). Şimdi çalıştırmak gerekmez | — | git'teki önceki rls-kimlik.sql |
| 4 | `stok-v2/editor/1`, `18`, `site-portal.sql` (değişti) | Yalnız İLERİDE yeniden çalıştırıldığında: 19 fonksiyonun tanımı `set search_path` içerir (sıkılaştırmanın yolu kaybolmaz) | — | — |

`2-sikilastir.sql` KİLİT'li: canlı, listelerle (22 / 21) birebir uyuşmazsa HİÇBİR ŞEY değiştirmeden durur ve farkı yazar. Yolu
zaten hedef değerde olan fonksiyonu (0b sonrası site_pb) atlar. İkinci kez çalıştırmak zararsız ("zaten uygulanmış").

## Kapanacak 22 (girişsiz kullanıcı artık çalıştıramaz)

Tetikleyiciler (tablo yazımında yine çalışır — yetki denetlenmez, yerelde sınandı): degisiklik_bump, fis_bag_iz_koru, fis_baslik_koru,
fis_kalem_karsilanan_koru, fis_kalem_teslim_koru, fis_satir_koru, fis_satirsiz_denetle, fis_siparis_iptal_koru, fis_siparis_teslim_koru,
guncelleme_yaz, gunluk_silme_koruma, lst_sayac, surum_arttir, tanimlar_kullanici_koruma, yazma_yetkisi_koruma.
Fonksiyonlar: fis_alt_karsilanansiz, fis_kalem_idleri, fis_kapi_acik, fis_kural_aktif, fis_yer_tutucu, site_pb, yetki_var_mi.

Açık kalan 9: sitenin 8 fonksiyonu + `yonetici_mi` (storage.objects `gorsel_yonetici_yazar` politikası, rol public, onu çağırıyor).

## search_path sabitlenecek 21

fis_alt_artissiz, fis_alt_karsilanansiz, fis_bag_iz_koru, fis_baslik_koru, fis_kalem_idleri, fis_kalem_karsilanan_koru, fis_kapi_acik,
fis_satir_koru, fis_siparis_iptal_koru, fis_yer_tutucu, guncelleme_yaz, siparis_durum_hesap, site_pb, stk_dizi, stk_kaynak_tur, stk_mantik,
stk_nrm, stk_sayi, stk_yer_tutucu_mu, stk_zaman, surum_arttir. (guncelleme_yaz ve surum_arttir yalnız canlıda var — kaynakta yok.)

## Kanıt

`canli/` — canlı Bölüm 1 (104 fonksiyon), 2 (satır yok), 3. Yerel sınama: `../test/guvenlik/kos-guvenlik.sh` (çıktı
`../test/guvenlik/sonuc-yerel.txt`), bütünlük `../test/guvenlik/sonuc-butunluk-kaynak.txt`, geçiş provası `stok-v2/test/butunluk/gecis-provasi.sh`.

## Test sonuçları (3 Kasım, son tur — hepsi çıkış 0)

| Sınama | Sonuç |
|---|---|
| Güvenlik sınaması `kos-guvenlik.sh` (`sonuc-yerel.txt`) | **TEMİZ** — canlıyla aynı 100+ fonksiyonluk kurulum (22 / 21 liste depodakiyle aynı); 0 → 0b → 2 sırası Editor gibi; KİLİT eksik listede durdu, hiçbir yetki değişmedi; 0b'nin sabitlediği site_pb atlandı; batarya (fonksiyon × girişsiz / Kullanıcı / Yönetici): Kullanıcı 0 fark, Yönetici 0 fark, girişsizde açık kalan tam 9; vitrin / kayıt / onay / giriş / müşteri sayfası / hesap / sipariş / çıkış akışı önce ve sonra temiz; regresyon (F0, finans, F2, F3, F4, F8, düzeltme) sıkılaştırılmış veritabanında geçti; rls-kimlik.sql yeniden çalışınca site açık kaldı; kaynak dosyalar (site-portal, Editor 1, 18) yeniden çalışınca yetki ve yol aynı; ikinci uygulama zararsız; geri alma → özet ilk hâlle birebir (101 satır), batarya önceyle aynı; geri almadan sonra yeniden uygulama aynı sonuç |
| `t-portal-hesap.js` | devir / dönem / bakiye / saatli tarih / para birimi boş kalem doğru; eski tanımlar 42883 ve 22023'ü yeniden üretiyor |
| Bütünlük koşucusu `kos-butunluk.sh` (`sonuc-butunluk-kaynak.txt`) | çıkış 0 — yeni kaynaklarla (search_path, rls-kimlik) bütün sistem |
| Geçiş provası `gecis-provasi.sh` (`sonuc-gecis-provasi.txt`) | **TEMİZ** — 1.742.1 + değişen Editor dosyaları + rls-kimlik Editor gibi, iki kez; sıfırdan kurulumla aynı gövdeler, 9 kritik test |
| Editor uyumluluğu (`editor-icin.py`) | 0, 0b, 0b-geri, 1-liste, 2, 3, rls-kimlik uyumlu (site_pb'de dolar işareti chr(36)) |
