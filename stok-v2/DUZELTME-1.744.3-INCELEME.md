# 1.744.3 incelemesi — üç düzeltme (yalnız geliştirme dalı)

**Durum:** 2 Kasım 2026. Dal `claude/erp-uygulamasi-devam-0601mp`; taban Codex `codex/erp-butunluk-tamamlama` `1daa260`.
Yalnız yerel PostgreSQL 16 (test sunucusu) ve yerel tarayıcıda sınandı. **Canlıya geçiş onayı YOK.** Canlı Supabase'e erişilmedi;
main, deploy, `surum.json` (1.742.1) ve sürüm kapısı / fiş kuralları ayarı değiştirilmedi. Değişiklik yalnız SQL'de; istemci
kaynağı ve sürüm numarası (1.744.3) değişmedi.

Codex'in 1.744.3 çalışması incelendi; üç sorun yerelde üretildi ve düzeltildi. Kullanıcı kararı bekleyen iki konu (F3 yönetici onay
düğmesi, F5 geri yükleme politikası) bu turun kapsamı dışında, dokunulmadı.

## 1. Bulgular ve düzeltmeler

| # | Bulgu (1.744.3) | Kanıt (önce) | Düzeltme | Kanıt (sonra) |
|---|---|---|---|---|
| 1 | **Yeni kilitlenme.** `alt_yaz` kalemleri satır satır yazıyor; ilk satırdan sonra `degisiklik.tekil` alınıyor. Sonraki satırda `siparis_canli_bag_koru` planlamadaki Alış siparişine / rezervasyondaki siparişe `FOR SHARE` istiyor (tekil'den sonra yeni satır kilidi). Aynı anda o siparişin başlığı düzenlenince ters sıra. | Doğal 100'de **31 kilitlenme** (20 sade + 20 planlı kalem ∥ Alış başlığı); F2'de (`1a42e48`) aynı deneme 0. Zorlanmış 5/5. | `alt_yaz` yeni bağ hedeflerini sipariş ön kilidi ile kalem kilidi arasında, ilk yazmadan önce, kimlik sırasıyla `FOR SHARE` kilitler. Tetikleyici ile ön kilit aynı hedef tanımını kullanır (`siparis_bag_hedefleri`). | `t-bag-kilit.js`: planlama ve rezervasyon için zorlanmış 3 + doğal 100 → **0 kilitlenme**, iki işlem de tamam. |
| 2 | **Sürüm kapısı sunucu fonksiyonunu kesiyor.** `min_istemci_surum` açılınca sürüm başlığı olmayan her JWT'li yazma AT001; gün sonu Edge Function (service_role) `gun_sonu_gonderim`'e yazamaz → otomatik rapor sessizce durur. İz tablosu her yazma işleminde satır ekliyor. | `t-servis-kapi.js`: servis rolü yazması AT001; güncel uygulama da ize yazılıyor. | `stk_istemci_koru`: service_role JWT'si muaf (anahtar yalnız sunucu fonksiyonlarında). İz yalnız sürüm başlığı OLMAYAN uygulama yazmasını kaydeder. | Servis rolü yazar; sürümsüz ve eski uygulama yine AT001; güncel uygulama yazar ve ize düşmez. |
| 3 | **Eski bağlı kayıt düzenlenemiyor.** Tetikleyici her UPDATE'te satırdaki bütün bağları denetliyor; koruma öncesi iptal edilmiş siparişe bağlı üretimin aşaması / kalemin fiyatı bile değişemiyor (KR006). | `t-eski-bag.js`: 2 kırmızı. | Yalnız **yeni** bağ denetlenir: UPDATE'te eski satırda zaten olan hedef çıkarılır. | Bağ dışı alan değişir; eski bağ korunur. Yeni bağ (ekleme, başka iptal siparişe çevirme, kaldırılanı geri kurma) yine KR006. |

Canlıda işlem tabloları şu an boş (Codex salt-okur kontrolü, 2 Kasım; 31 Ekim sıfırlaması). 3. bulgu bugün canlı veride karşılığı
olan bir sorun değil, ama 1.744.3 kurulmadan önce iptal edilen her sipariş aynı durumu yeniden üretir.

## 2. Commitler

| Commit | Ne |
|---|---|
| `01bca2c` | Başarısızlık testleri: `stok-v2/test/duzeltme/` (t-bag-kilit, t-servis-kapi, t-eski-bag); `kos-butunluk.sh`'e eklendi. Codex 1.744.3'te kırmızı. |
| `bf65323` | Sürüm kapısı: service_role muafiyeti; iz yalnız sürümsüz uygulama |
| `9f28bb7` | Bağ koruması yalnız yeni bağ; `alt_yaz` yeni bağ hedefi ön kilidi; `geri-donus-1.744.3.sql` yardımcıyı da kaldırır |
| sonraki | Geri dönüş betiğine yeni testler, F1.1 beklenen satırı, sonuçlar, bu rapor |

## 3. Doğrulama

| Koşu | Sonuç |
|---|---|
| `kos-butunluk.sh` (temiz kurulum, Editor parça parça kurulum, uçtan uca, R1/R1b, F0, finans, F4, F3, F8, yeni testler, F2) | **Çıkış 0** — "BÜTÜNLÜK ADAYI: bütün süreçler 0". F0 beklenenle AYNI; F2 beklenenle AYNI (eski istemcinin bilinen 3 kırmızısı); t-f2-kilit 21/21. |
| Yeni testler | t-bag-kilit 6/6 (doğal 100 × 2: 0 kilitlenme), t-servis-kapi temiz, t-eski-bag temiz. Codex'in t-canli-bag (iptal siparişe yeni bağ reddi) değişmeden geçti. |
| F1.1 `kos-f11.sh` | Tek sapma `E11.geri-yukleme-kapali` KIRMIZI → YEŞİL. Neden Codex F8 (`834f625`): kesilmiş fişin hareketi kurallar kapalıyken de eski yoldan değişmez, geri yüklemenin stok yazması RED. Codex bu koşucuyu çalıştırmadığından beklenen satırı kırmızı kalmıştı; güncellendi. İkinci koşu beklenenle AYNI, çıkış 0 (`f0/sonuc-f11-1.744.3.txt`). |
| R1, R1b — eski 1.742.1 istemcisi | Temiz |
| `butunluk/geri-donus.sh` (ayrı kopyada `geri-donus-1.744.3.sql` → eski hatalar geri gelir → yeniden kurulum) | **Çıkış 0.** Eski iki açık geri geldi; yeniden kurulumda korumalar ve bu turun iki testi (t-servis-kapi, t-eski-bag) geçti; 104 audit satırı korundu. |
| Birim + tarayıcı (`test/kosu.sh`) | Birim 1635 ✓, 0 ✗. Tarayıcı 256 AYNI, 4 FARKLI; tek başına yine FARKLI. Bu turda `src/` ve `test/` Codex `1daa260` ile birebir aynı ve tarayıcı testleri sahte sunucuyla koşar, yani farklar bu turdan gelmez. `sekmeler` ve `resim-damga` bilinen oynak küme (F1.1'den beri). `tedarik-girisleri` ve `bekleyen-birak` senaryolarını Codex değiştirmiş, altın çıktılarını güncellememiş: `tedarik-girisleri` paylaşım menüsünü yeni yerden açıyor (sonuç modülü "Sipariş Yönetimi", altında "Fişler"); `bekleyen-birak` onay metni "2 ürün varyantı"nı da sayıyor. Niyeti Codex'in değişikliği belirler, altınlara dokunulmadı. |
| Kural provası | 260 senaryo, **0 eski yol hareket yazması**, 12 ağa çıkmadan engellenen girişim, 0 çalıştırma hatası. (Codex raporunda engellenen 8; sayı istemci tarafı, bu turda istemci değişmedi.) |

Ham çıktılar: `stok-v2/test/duzeltme/sonuc/`. Ortam notu: Codex'in finans testleri yalnız `PGHOST=localhost` kabul ediyor; koşular TCP ile (localhost:55432) yapıldı.

## 4. Kalan riskler ve açık kararlar

- **`alt_yaz` hâlâ satır satır yazıyor** (Codex'in seyrek alan düzeltmesi). Kilit sırası artık doğru, ama büyük kayıtlarda başarım
  tek deyime göre düşük; ürün yabancı anahtarı denetimi de satır başına tekil'den sonra `KEY SHARE` alır (ürün silme / anahtar
  değişikliği ile çakışabilir — ölçülmedi, ürün silme seyrek).
- **`fis_kes` içinden çağrılan `alt_yaz`** tekil'den sonra çalışır; teslim yükü bağ alanlarını değiştirmediğinden yeni bağ kilidi
  almaz. Teslim yüküne yeni planlama / rezervasyon eklenirse kilit yine tekil'den sonra düşer (bugünkü istemci eklemiyor).
- **Sürüm kapısı yalnız uyum kapısıdır**, güvenlik değil: sürüm başlığı istemcinin beyanıdır.
- **Kullanıcı kararı bekleyenler:** F3 fazla teslim — arayüzde yönetici onay düğmesi yok, pratikte kimse fazla teslim yapamıyor.
  F5 — fiş defteri kuruluyken tam geri yükleme kapalı. Sürüm kapısı ve fiş kurallarının etkinleştirilmesi, FK `VALIDATE`.
- Codex'in canlı salt-okur kontrolündeki Supabase danışman bulguları (sabit `search_path` olmayan 14 fonksiyon, anon'un
  çağırabildiği 17 SECURITY DEFINER fonksiyon, sızmış parola denetimi kapalı) ayrıca incelenmeli; bu turda dokunulmadı.
- Canlıya geçiş ayrı onay gerektirir.
