# G-25 deneme projesi — KONTROL LİSTESİ SONUÇ RAPORU (25 Kasım)

Proje: deneme `drtmnovafswzcmpacubl` (canlı `mqdgucoomgqcvhvgixbl`'e, main'e, yayına, Faz 2'ye DOKUNULMADI). İstemci korumalı yerel sunucuyla
(yalnız deneme + esm.sh; ana proje iki bilgisayarda da ENGELLENDİ). Her adımın ham çıktısı: `SONUC-0-SALT-OKUR.md`.

## Kullanılan sürümler

| Bileşen | Sürüm / özet |
|---|---|
| G-25 SQL (ilk uygulanan) | `25-cari-yetki-uygula.sql` `fcc5429c6d261898e6a055aa774465838b6fbe41d9ec2d7166dc706ccabfebc5` (commit `2a9295e`) |
| 25b onay mührü (sonradan) | `25b-onay-muhru-uygula.sql` `5ba5620a1914279dc835f989c2feb55a2e1b501384c6d286c85f926ec9bc6246` |
| tanimlar okuma yetkisi | `tanimlar-service-role-okuma.sql` `dd98bfd56722ccc5f8fc093ddff654e4e5d45d09d54eb38a7ea3f55ed91cf9bd` |
| Tam paket (yeni kurulum için, mühür dahil) | `25-cari-yetki-uygula.sql` `eda7e55a1dcde4271b13ae44e38cc11e5acf7eb0e63977313eb4c0c44191444c` |
| İstemci | 1.745.1 `atolye-erp-v1.745.1.html` `0957fa0d2972abfb310bd9a04e73d0aa06853acbbfb06118e5a2d7cff7b0645d` (yayınlanmadı) |
| Korumalı sunucu | `korumali-sunucu.js` `e931a6814d77c9bb2c630d3dd3e3498dc7e1e58241e8db0489706dcbf495a219` |
| Edge Function `kullanici` | `supabase-kullanici-fonksiyonu.ts` `e3a0291eb34bdf5f346e16b3ed14d4c633771f52f0b45dc333f8e2f9958ca5ea` (gateway JWT kapalı; kendi getUser denetimi) |
| Güncel sabitleme | `SABIT.md` — commit `caeb7fffd9a94b363b878edc8e4645e0c931cc8c` |

## 13 test

| # | Test | Sonuç | Nasıl ölçüldü |
|---|---|---|---|
| 1 | Üretim: iş "onay bekliyor" görünür | **GEÇTİ** | DenemeUretim ekranı (10003) |
| 2 | Onaysız teslim ret, hiçbir şey yazılmaz | **GEÇTİ** | ekran ret metni + iz sorgusu (fiş / hareket yok) |
| 3 | Mesai bildirimi: onay bekliyor, tutar yok | **GEÇTİ** | DenemeUretim ekranı |
| 4 | Üretim: para ekranları kapalı | **GEÇTİ** | Finans yalnız Fişler; Cari sekmesi Anasayfa'ya döner; maaş şeridi yok |
| 5 | Şef: maaş kapalı, "Mesaiyi onaya gönder" var | **GEÇTİ** | DenemeSef ekranı (maaş rakamı OKUNUYOR — aşağıda) |
| 6 | Muhasebe: ücret onayı + mesai onayı TEK MS | **GEÇTİ** | ucr_onay 1 satır; MS-261125001 tek, 2.000 ₺ (= 133,33 × 10 × 1,5) |
| 7 | Tamir: onaysız ret, muhasebe onayıyla geçer | **GEÇTİ** (kısmen) | ret → onay (önerilen 10 ₺) → 2 × 10 tek ödeme. Muhasebenin ücreti KENDİSİNİN değiştirmesi deneme projesinde sınanmadı (yerelde sınandı) |
| 8 | Kısmi teslim 6, kalan 4 açık, onay geçerli | **GEÇTİ** | isc_odeme 6; kalan parça açık |
| 9 | Kalan 4, ödenen toplam = onaylanan 10 | **GEÇTİ** | ödemeler 6 + 4 |
| 10 | Çift basış ikinci fiş açmaz | **GEÇTİ** | iki hızlı tıklama → tek fiş, tek ödeme |
| 11 | İptal → ödeme sayılmaz, yeniden teslim tek fiş | **GEÇTİ** | üretim kartı "Geri Al" → fiş iptal, ödeme İPTAL; yeniden teslim tek geçerli fiş |
| 12 | Değişiklik → yeniden onay; geri dönüşte canlanmaz | **İLK PAKETTE BAŞARISIZ → 25b ile GEÇTİ** | 1. döngü: 35'e dönünce eski onay canlandı (BULGU). 25b sonrası 3. döngü (10005): 40'ta düştü, 35'te düşük kaldı, DU teslimi RET, anlık görüntü 9 / 9 birebir, yeni onaydan sonra teslim geçti, TEK fiş / TEK ödeme |
| 13 | Onaylı ay: "onaylandı", Bildir kapalı | **GEÇTİ** | DenemeUretim ekranı |

Ayrıca: `kullanici` fonksiyonu — girişsiz 401, sahte jeton 401, Yönetici olmayan gerçek oturum 403, Yönetici ile hesap açma tamam.

## Kalan sorunlar / kararlar

1. **Kurulum betiği `service_role` yetkilerini taşımıyor** (`kurulum-betigi.sql` 8. adım; `KURULUM-SERVICE-ROLE.md`). Deneme projesinde 49 tablonun
   35'inde service_role okuyamıyor; yalnız `tanimlar` için SELECT verildi. Gün sonu, e-posta, site bildirimi fonksiyonları yeni firmada
   bozulabilir. Öneri yazıldı, uygulanmadı (canlıdaki `kurulum_betigi()`'ni değiştirir — ayrı karar).
2. **Para yetkilisinin (Yönetici) teslimi `isc_odeme` yazmıyor** — onay aranmaz (tasarım) ve ödeme defterine girmez. Karışık zincirde
   (bir parçayı Yönetici, kalanını üretim kullanıcısı teslim ederse) "ödenen ≤ onaylanan" sayımı Yönetici parçasını görmez. Parça tekrar
   teslim edilemediği için çift ödeme beklenmez; ÖLÇÜLMEDİ.
3. **Maaş rakamı ve saat ücreti** cari görüntüleme yetkisiyle okunabiliyor (DenemeSef). Yazma kapalı. G-25 dışı görünürlük kararı.
4. **Onaylı ayın saat kutuları** düzenlenebilir görünüyor (Bildir kapalı); sunucunun onaylı ay için bildirimi reddettiği ekrandan sınanmadı (yerel matris A8'de sınandı).
5. G-25 dışı gözlemler (ölçülmedi): 10002'de düzeltmeli teslimde "artan iade 10" (eski değer taşınmış olabilir); Fişler listesinde iki
   teslim fişinin tür etiketi farklı ("Üretim Girişi" / "Üretim Çıkışı"); tamire giden çiftlerin de usta işçiliğine sayılması (mevcut kural).
6. Deneme verisinde plan dışı kayıtlar: Kasım maaş tahakkuku 30.000 (şeritten onaylandı); `Deneme Hammadde G25` stoğu eksi; 10001,
   10002, 10004 Yönetici ile teslim edildi (onay aranmaz — test işleri tükendi, yerine yenileri açıldı).
7. Canlıya geçiş (bu işin kapsamı DIŞI, ayrı onay): tam paket `eda7e55a…` (25b dahil) + istemci 1.745.1 + canlıda `kullanici`
   fonksiyonunun service_role / tanimlar erişimi ve gateway JWT ayarı kontrolü. Faz 2 ayrı.
