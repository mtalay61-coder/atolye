# 1.744.3 geliştirme — kesinti ve devam kaydı

2 Kasım 2026. Bu belge kaynak değişikliklerinin yerine geçmez.

## Kesin durum

Son yayımlanmadan GitHub'a kaydedilmiş geliştirme tabanı `codex/f8-eski-fis-koruma`, commit `834f625df830990661405eb76cb760aa44395cca`, ağaç `b7d61995e3e626d4c17af1fce00cba28c2961774`.

Sonraki çalışma yerelde `codex/erp-butunluk-tamamlama` dalında yapıldı. 1.744.3 kaynak değişiklikleri henüz commit/push edilmedi. Çalışma ortamı erişilemez oldu; son kontrol aracı "No usable execution environment is available" döndürdü. Bu dal yalnız kesinti/devam belgesini içerir; 1.744.3 uygulama kodunu içerdiği varsayılmamalıdır.

Canlı Supabase'e bağlanılıp değişiklik yapılmadı; main birleştirilmedi, dağıtım yapılmadı, surum.json değiştirilmedi. Bu işlemler için kullanıcıdan açık onay şartı devam ediyor.

## Yerelde uygulanan değişiklikler

- Çek/senet: `kas_cek_kilitle` önceki belgeyi karşılaştırıp çek kimliğine göre advisory transaction kilidi alıyor. `fis_kes` kilitleri ilk fiş/sayaç yazmasından önce topluyor; ana/bağlı fiş birlikte değerlendirilip aynı çekin iki kez değiştirilmesi reddediliyor. KR008.
- `fis_cek_iz` fişin çek üzerinde önceki/sonraki hallerini tutuyor. Fiş iptali çek ve kasa/cariyi aynı transaction içinde geri alıyor; daha yeni değişiklik varsa bütün iptal reddediliyor. İptal edilmiş eski fişin tekrarı yeni tahsili bozmuyor. İç yardımcı RPC erişimi kapalı.
- Kasa/banka: `kas_hesap_kilitle` ilk fiş yazmasından önce hesapları sıralı kilitliyor; bakiyeli hesap kapatılamıyor, hareket geçmişindeki hesap türü/para birimi değişmiyor, kapalı hesaba hareket yazılamıyor.
- Cari/kasa/stok: sonlu olmayan tutar/miktar reddi; finans tutarında açık null/bozuk sayı sessiz sıfıra çevrilmiyor. KR010 (stok fiş kesicide önceki KR007).
- Eski yazma: istemci köprüsü fiş defteri kuruluysa ham hareket değişikliğini ağa çıkmadan kalıcı reddediyor. Reddedilen hareketin kimliği incelemeye ayrılıyor; ilgisiz asgari stok gibi değişikliklerin devam etmesi korunuyor.
- Eski istemci: REST yazmaları `x-atolye-surum` taşıyor. `stk_ayar.min_istemci_surum` doluyken eski/sürümsüz/bozuk sürüm bütün kayıt tablolarında AT001 ile reddediliyor. AT001 istemcide kalıcı ret. Minimum sürüm etkinse `fis_aktif=false` eski hareket kapılarını tekrar açmıyor; KR009. Minimum varsayılan NULL, canlıda etkinleştirilmedi.
- Sipariş durumu: `siparis_durum_hesap` ve `siparisler_okuma` güncel kalemlerden durum üretiyor. Yeni ayar bayrağıyla uygulama bu görünümü okuyor; başlık güncellemesi de durumu normalize ediyor. Kalem tetikleyicisinden parent başlığa yan yazma eklenmedi. Ham `siparisler.durum` alanı önbellek olarak eski kalabilir; okuma görünümü yetkilidir. D5 denetimindeki ham önbellek farkı ayrıca raporlanabilir.
- Sipariş iptali/silmesi: `fis_bag_coz` üretim, koli, kalem rezervasyonu, sipariş zinciri ve stok rezervasyonunu aynı transaction'da çözüyor. Silme isteği de bu yoldan geçiyor; teslim geçmişi varsa F2 silme koruması bütün işlemi geri alıyor. `baglarAtomik` yanıtında istemci bu alanları tekrar ayrı bulut yazmalarıyla değiştirmiyor.
- `siparis_canli_bag_koru` iptal/silinmiş siparişe yeni operasyon bağı kurulmasını reddediyor; bağlı parent durumu SHARE kilidiyle denetleniyor. REST'ten tek başına iptal engellendi. SQL 40P01/40001 için yalnız atomik RPC'lerde aynı gövde/istek kimliğiyle en fazla iki tekrar var.
- Üretim teslimi birden çok fiş doğurmuşsa yeni `fis_iptal_toplu` hepsini tek transaction'da iptal ediyor; kalem/çek/hesap/fiş kilitleri ilk yazmadan önce toplanıyor. Son fişte hata olursa önceki fiş de geri alınıyor.
- `alt_yaz`: farklı alan kümeli satırlar aynı yükte birbirinin gönderilmeyen alanını NULL yapıyordu; hata eski işlevle üretildi. Artık satır başına yalnız verilen alanlar yazılıyor, son aynı-kimlik kazanıyor; açık null temizliyor; tanınmayan alan bütün işlemi KR010 ile reddediyor. **Hem alt-v2.sql hem fis-defteri.sql içindeki F2 ön kilitli override düzeltildi.** 15-duzeltme üreticisi ön kilitli güncel tanımı seçiyor; bu override unutulmamalı.
- RLS betiği yeniden çalıştığında fiş sayacı/audit tablolarına genel politika ve yetki açılabiliyordu. `rls-kimlik.sql` özel tabloları hariç tutuyor, eski politikaları da kaldırıyor; fiş/çek/karşılanan/sürüm izleri özel kalıyor.
- Bayat yerel fiş defteri eski silme yolunu açmıyor; önce sunucu fişi doğrulanıyor. Açılışta otomatik stok göçü fiş defteri varken çalışmıyor.
- Test derleyicisi varsayılan olarak güncel src parçalarını okuyor. Kural provası çöken/başlamayan senaryoyu başarı saymıyor, her koşunun klasörü ayrı; ağa çıkmadan engellenen girişimler ayrı sayılıyor. Taklit edilmemiş HTTP istekleri tarayıcı bağlamında kapalı.

## Doğrulanmış sonuçlar

Yerel PostgreSQL 16.15 (JWT/rol kabuğu taklidi, Supabase HTTPS kimlik doğrulaması değil); localhost, tmpfs, önceki native uid uyarlayıcısı, JIT kapalı. Canlı veritabanı kullanılmadı.

- F0: **60 yeşil**, beklenenle eşleşti. Yedek testlerinde minimum sürüm açık eski istemci yazması sınanıyor; yeni istemcinin tam geri yükleme girişindeki engeli korunuyor.
- **92 birim dosyası**, süreç hatası 0; son okunabilen sonuçta 1.634 başarılı kontrol.
- 100 çek tahsil yarışı: her çiftte tek tahsil/tek 500 kasa girişi; güvenli tekrar; bayat çek yazması reddedildi.
- Çek/fiş/kasa atomik iptal, sonraki değişiklikte tam ret ve audit erişimi testleri geçti.
- Kasa/banka bakiyeli kapatma, para birimi/tür koruması, geçerli ad düzenlemesi ve kapalı hesap testleri geçti.
- 13 sonlu/bozuk tutar kontrolünde yarım fiş oluşmadı.
- Seyrek alt satır güncellemesinin eski işlevde fiyatı NULL yaptığı üretildi; iki güncel tanım eşitlenince koruma ve bilinmeyen alanın tam reddi geçti.
- Minimum sürüm ve stok/cari/kasa eski kapı testi geçti; sürüm kapısı açıkken fis_aktif=false eski yolu açamadı.
- Genel RLS betiğinin tekrarından sonra özel tablolara erişim ve iç RPC'ler kapalı kaldı; sipariş okuma görünümü çalıştı.
- Sipariş iptalinde son adım bilerek düşürüldü: fiş/üretim/koli/rezervasyon tam geri alındı; başarılı işlemde başka siparişin payı ve miktarlar korundu.
- 100 iptal/yeni rezervasyon yarışı; 100 iptal/teslim yarışı ve iki yönde 3'er zorlanmış sıra geçti.
- F3 sınır senaryoları ve 100 teslim yarışı geçti.
- F8 zorlanmış renk/iptal ve 100 doğal renk yarışı geçti.
- Son geniş native koşu temiz kurulum/Editor/R1/R1b ve yukarıdaki kontrollere kadar geçti. F2 sonunda bir yeni-istemci sapması görüldü: KR009'un hareket kimliği yokken ilgisiz asgari stok değişikliğini de bekletmesi. Kimlik eklendi; hedef `t-bekleyen-red.js` tekrarında **7/7 geçti**. **Tam F2 kümesi bu son istemci düzeltmesinden sonra tekrar tamamlanmadı.**
- Tam kural provası: **260 senaryo, 0 eski yol yazması, 8 ağa çıkmadan engellenmiş girişim, 0 süreç hatası.** Bu altın çıktı UI testi değildir. Son açık ağ izolasyonu eklenmiş tekrarın sonucu ortam kesilince henüz okunamamıştı.
- Finans altın çıktılarının son okunabilen kısmında stok-fis-kes, para-fis-kes, banka-fis-kes aynıydı. Başlatılmış toplam 8 senaryonun kalan sonuçları okunamadı; 8/8 iddiası yapılmamalı.
- Statik kontroldeki tek son bulgu sürüm geçmişi kaydıydı; 1.744.3 kaydı eklendi. Derleme tekrar geçti; statik tam koşu bu eklemeden sonra yeniden okunmadı.
- Native ham çıktıda bilerek satırsız fiş reddi ve yanlış kilit sırası taklidi kontrolündeki deadlock bulunur; bunlar üretim işlevlerinin başarısız koşusu diye sayılmamalıdır.

## Ortam yeniden erişilebilir olduğunda

1. Çalışma ağacını kurtar/doğrula: `/workspace/scratch/09b612fecffd/atolye`. Son erişimde yaklaşık 40 değiştirilmiş/yeni dosya vardı; 1.744.3 için git commit yoktu. Kayıp olmadığını varsayma.
2. Güncel kaynak ve üretilmiş 1/4/7/9/15/18 SQL Editor kopyalarını karşılaştır. `surum.json` farkı olmadığını doğrula. `test/derle.js` güncel src'yi varsayılan seçmeli.
3. Final araç oturumları yeniden kullanılabilir olmayabilir. İzole `kos-butunluk.sh` tek koşucusu hazır; localhost ve yalnız `atolye_stok_v2_sinama` veritabanını kabul eder. `pg-test-runtime/run-local.sh` ile aynı çağrıda PG başlatıp test çalıştır; ayrı exec hücreleri farklı ağ ad alanındadır. Aynı PGDATA'ya iki PG açma.
4. `/tmp/atolye-tam-aday.log` son geniş native koşudur; F2 sapması sonrasında hedef düzeltme çıktısı `/tmp/atolye-bekleyen-red.log` 7/7. Tam F2'yi yeniden doğrula. Native testte gerçek kaynak override'ını `pg_get_functiondef` ile kontrol etmek yararlı.
5. `/tmp/atolye-izole-prova.log`, `/tmp/atolye-finans-tarayici.log` ve `/tmp/atolye-ui-*.txt` sonuçlarını oku; eksik/başarısız kontrolleri düzelt. Test tarayıcısı `PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/09b612fecffd/test-browser-runtime` idi; yoksa yeniden kur.
6. `geri-donus-1.744.3.sql` hazırlandı fakat **henüz çalıştırılarak doğrulanmadı**. Ana sınama DB'sinin ayrı kopyasında dene: audit satırları silinmemeli; eski çek çift tahsil ve seyrek NULL hatası geri gelmeli; güncel SQL tekrar kurulunca testler geçmeli. Rollback `alt_yaz`ı önceki F2 ön kilitli fis-defteri.sql sürümüne döndürmeli.
7. Rollback okuma bayrağını false yapıyor. Güncel SQL yeniden kurulduğunda mevcut false bayrağın otomatik true olmadığı durumu değerlendir; `ALTER ADD COLUMN IF NOT EXISTS DEFAULT true` mevcut false değeri düzeltmez.
8. Minimum sürümü canlıda açacak son geçiş/preflight metni ve rapor henüz tamamlanmadı. Kurulumda minimum NULL; yayında bütün istemciler güncellenip ayrı açık kullanıcı onayı verilmeden kapı etkinleştirilmez. Canlı Supabase, main, deploy ve surum.json için izin varsayma.
9. Bütün son doğrulamaları rapora/ham çıktılara kaydet, kodu ayrı geliştirme dalına commit/push et, uzak ağacı doğrula. Bu kesinti belgesiyle kaynakların GitHub'a gittiğini söyleme.

Bu kayıt işi "bitti" ilan etmez; kesintiden sonra doğrulanabilir biçimde devam etmek içindir.
