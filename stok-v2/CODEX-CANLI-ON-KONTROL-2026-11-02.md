# Canlı ortam salt okunur ön kontrol — 2 Kasım 2026

Kontrol zamanı: 2 Kasım 2026, 18:59 Türkiye saati. Proje: Nds (`mqdgucoomgqcvhvgixbl`); depo bağlantısındaki Supabase sunucusuyla eşleştirildi.
İncelenen geliştirme adayı: `c6caeaf1f41d80c92266cd4e0db396b88447c265`, `codex/erp-butunluk-tamamlama`, kaynak sürümü 1.744.3.
Bu belge önceki aday raporunun “canlı okunmadı” sınırını yalnız aşağıdaki gözlemler için günceller. Önceki yerel testler bu oturumda yeniden çalıştırılmadı.

## Karar

Canlı şema geliştirme adayını henüz karşılamıyor. Kurulum/yayın kabulü verilmedi. Bu kontrolde canlıda yalnız SELECT ve yönetim metaverisi okumaları yapıldı; DDL, DML, etkinleştirme, veri düzeltme, main birleştirme, deploy ve surum.json değişikliği yapılmadı.

## Doğrudan gözlemler

| Kontrol | Sonuç |
|---|---|
| Proje durumu / PostgreSQL | ACTIVE_HEALTHY / 17.6.1.166 (önceki yerel kanıt 16.15 üzerindeydi) |
| Ürün / sipariş / sipariş kalemi | Her birinde kesin COUNT(*) = 0 |
| Stok fişi / stok hareketi | Her birinde kesin COUNT(*) = 0 |
| Cari hareket / kasa hareket / kas_cek | Her birinde kesin COUNT(*) = 0 |
| stk_ayar | aktif, alt_aktif, cari_aktif, kasa_aktif, liste_aktif true; fis_aktif false |
| Fiş kuralları etkinleşme zamanı | fis_aktif_zamani NULL |
| Aday nesneler | public.siparisler_okuma ve public.kas_cek_audit katalogda yok |
| Fiş fonksiyonları | fis_kes, fis_iptal, fis_bag_coz ve eski yazıcılar var; fis_iptal_toplu listede yok |
| Sipariş kalem koruma tetikleyicisi | Sipariş kalemleri üzerinde yalnız arsiv_silinen ve degisiklik_izle görüldü; aday teslim koruması yok |
| Sipariş ilişkisi FK'leri | Sipariş kalemlerinde mevcut sipariş/ürün FK'leri var; stok hareketlerinde listelenen FK'ler fiş/varyant ile sınırlı |
| RLS | Listelenen 40 public tablonun tamamında açık |

`stok-v2/canli-salt-okur-kontrol.sql` dosyasının iki SELECT bölümü ayrı çalıştırıldı. D1–D6 kapsamındaki 17 denetimin tamamında bulgu sayısı 0. İşlem tabloları boş olduğu için bu sonuç yeni korumaların kurulu veya eşzamanlı işlemde doğru çalıştığının kanıtı değildir. Fiş sayaçlarında eski SF/TH sayaçları bulunuyor; veritabanının tamamı boş değildir.

Fonksiyon gövdesi kimlikleri (canlı md5(prosrc)):
- fis_kes: 02ed0010ec9b8b820334ff063b1af170
- kas_yaz: 670f8d2a081d0389b496d62b27858e3a
- alt_yaz: ae393e6531603c4c530cf3f1a648802e
- fis_satir_koru: 21a8b2f770a4055a9ed3953c0d226eac

## Danışman çıktıları

Bunlar otomatik danışman bulgularıdır; tek başına istismar veya uygulama hatası kanıtı değildir. Özel sayaç/portal fonksiyonlarının erişimleri amaçlarına göre incelenmeli; bütün politikalara topluca izin verilmemeli.

- 14 fonksiyonda sabit search_path yok. [Açıklama](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- 17 SECURITY DEFINER fonksiyon anon, 42 fonksiyon authenticated tarafından çağrılabilir olarak raporlandı; bu kümeler örtüşebilir. [Anon erişim incelemesi](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- 5 tabloda RLS açık, politika yok: fis_sayac ve dört site kimlik/oturum tablosu. Bu varsayılan kapalı erişim kasıtlı olabilir. [Açıklama](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- pg_net public şemasında. [Açıklama](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- Sızmış parola denetimi kapalı. [Açıklama](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- 7 FK için kapsayan indeks eksik; 17 kullanılmamış indeks bilgisi var. Boş işlem tablolarındaki kullanım istatistiği indeks silme gerekçesi değildir. [FK indeksleri](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

Son 24 saat günlük kaynak sayımları alındı; hata içeriği veya uçtan uca oturum doğrulaması yapılmadı. Gerçek HTTPS/JWT/RLS davranışı, yedek geri yükleme ve aday SQL'nin PostgreSQL 17 üzerinde kurulumu bu salt okunur kontrolün kapsamı dışındadır.

## Somut sonraki kabul adımı

1. PostgreSQL 17 kullanan ayrı test ortamında aday kurulumunu ve kritik stok/finans/iptal yarışlarını doğrula.
2. Gerçek oturumlarla yetki matrisi ve portal erişimlerini test et; beklenen izinleri belgele.
3. SQL/uygulama geçişi ve geri dönüş paketini mevcut canlı şemaya göre gözden geçir; 1.744.3 uygulama paketini hazırla.
4. Kullanıcının ayrı canlı geçiş onayından sonra kurulum, tüm istemcilerin güncellenmesi, minimum sürüm ve fiş kurallarının etkinleştirilmesini sırayla uygula; aynı 17 denetimi tekrarla.

Geliştirme dalına gönderim onayı canlı değişikliği onayı olarak yorumlanmadı.
