# Deneme projesi — 0. adım sonuçları (salt okur; kullanıcı SQL Editor'de çalıştırdı, 26 Kasım)

Proje: `drtmnovafswzcmpacubl` (kullanıcı adres çubuğunda doğruladı). Hiçbir şey yazılmadı.

## Önkoşul (`25-onkosul-salt-okur.sql`)
1 yedek yok · 2–4 car_yaz / fis_kes / fis_iptal "eski (G-25 öncesi, beklenen)" · 5 A6 UYGULANMIŞ · 6 G-25 nesneleri 0 ·
7 **kurallar AÇIK** · min_istemci_surum boş · 8 kullanıcılar 1 · 0 · 0 · 0 · 1 · **GENEL HAZIR**.

## Durum (`25-deneme/durum-salt-okur.sql`)
1 postgres · postgres · 2 surum tablosu yok · 3 giriş açık (true) · 4 kullanıcı 2 (Yönetici 1, cari/muhasebe 0, üretim 0) ·
5 kimliksiz 0 · 6 auth hesabı 3 · 7 bölüm 0 / personel 0 / maaşlı 0 · 8 cari: yalnız 1 Müşteri · 9 proses ücretli ürün 0 ·
10 üretim 0 · 11 fiş 3 (iptal 0, son 2026-11-18) · 12 kurallar AÇIK · 13 G-25 nesneleri yok.

## Değerlendirme
- Paket uygulanabilir (HAZIR). Deneme projesinde fiş kuralları AÇIK (yerel sınamaların çoğu kapalıydı) → yerelde kurallar AÇIK iken
  yeniden ölçüldü: matris 271 / 271 (A7: fiş dışı car_yaz kurallar açıkken herkese kapalı — fiş kuralı, G-25'ten bağımsız; beklenti
  kurala bağlandı), ekran akışı 33 / 33 (`sonuc-matris-sonra-kurallar-acik.txt`, `test/ekran/sonuc-ekran-g25-akis-kurallar-acik.txt`).
- Deneme projesi neredeyse boş: Muhasebe / Üretim / Şef kullanıcısı, Personel carisi, bölüm, proses ücretli ürün, üretim YOK.
  Kontrol listesi için bunların açılması gerekir — deneme projesine YAZMA; ayrı onay.

# 1. adım — G-25 UYGULANDI (deneme projesi, kullanıcı SQL Editor'de, 25 Kasım)

Dosyalar kullanıcının bilgisayarında SHA-256 ile doğrulandı (dördü `SABIT.md` ile birebir; commit 2a9295e).
- `25-cari-yetki-uygula.sql` → 1 "G-25 hâlinde (f83e760f, c071d802, 2ea9f6ce)" · 2 yeni fonksiyonlar 21 · 3 tablolar kuruldu ·
  4 tetikleyici kuruldu, etkin · 5 yedek (3 fonksiyon) · 99 **UYGULANDI**
- `25-sonra-dogrula-salt-okur.sql` → 1–10 hepsi `tamam` · 99 **TAMAM**
- `25-onkosul-salt-okur.sql` (yeniden) → 1 VAR · 2–4 G-25 uygulanmış · 5 A6 UYGULANMIŞ · 6 25 · 7 kurallar AÇIK · min_istemci_surum boş ·
  8 1 · 0 · 0 · 0 · 1 · 99 **UYGULANMIŞ**
Veri silinmedi / sıfırlanmadı. Kullanıcı / veri eklemeleri (EKLEMELER.md) henüz YAPILMADI.

# 2. adım — korumalı sunucu + `kullanici` sunucu fonksiyonu (deneme projesi, 25 Kasım)

- Korumalı sunucu kullanıcının bilgisayarında açıldı: `ANA PROJE: ENGELLENDİ · DENEME: ulaştı (401)`; Yönetici girişi tamam.
- İlk `DenemeMuhasebe` ekleme denemesi: "Kullanıcı EKLENMEDİ: bulut hesabı açılamadı. Fonksiyona ulaşılamadı…" — deneme projesinde
  `kullanici` fonksiyonu YOKTU. Hiçbir şey yazılmadı; durduruldu.
- Kullanıcı onayıyla `supabase-kullanici-fonksiyonu.ts` (SHA-256 `e3a0291e…ca5ea`, kullanıcıda doğrulandı) yalnız deneme projesine
  `kullanici` olarak kuruldu. Kurulumdan önce kaynak incelendi: jeton `auth.getUser` ile sunucuda doğrulanır; rol, doğrulanmış
  e-postayla `tanimlar.veri.kullanicilar`'dan okunur (istemcinin gönderdiği rol kullanılmaz); rol denetimi gövde okunmadan önce.
  Listeyi yalnız Yönetici değiştirebilir: `tanimlar_kullanici_koruma` deneme projesinde etkin (`O · true · 1`).
- Ağ geçidi JWT denetimi ("Verify JWT with legacy secret") açıkken jetonsuz POST geçidin kendi 401'ini aldı
  (`UNAUTHORIZED_NO_AUTH_HEADER`); kullanıcı yalnız bu fonksiyon için kapattı (genel Auth ayarlarına dokunulmadı).
- Kapattıktan sonra konteynerden ölçüldü (hiçbiri yazmaz):
  OPTIONS → **200** · jetonsuz POST → **401** "Oturum jetonu yok — bulut kimliğiyle giriş yapılmalı" ·
  sahte jetonlu POST → **401** "Oturum geçersiz ya da süresi dolmuş — çıkıp yeniden girin".
- Sınanmadı (sıradaki): gerçek oturumlu, Yönetici OLMAYAN çağrının 403 alması (DenemeMuhasebe açıldıktan sonra, yetki verilmeden).
- Gerçek kullanıcı açma (`DenemeMuhasebe`, Yönetici oturumuyla): "Kullanıcı EKLENMEDİ: bulut hesabı açılamadı. Tanımlar okunamadı:
  permission denied for table tanimlar". Oturum doğrulaması geçti (401 değil); fonksiyon 2. aşamada düştü, hesap açan koddan önce.
  Durduruldu. Salt okur teşhis (`teshis-tanimlar-yetki-salt-okur.sql`): 1 service_role SELECT **false** · 2 USAGE true ·
  3 bypassrls true · 4 anon false · 5 authenticated true · 6 RLS true · false · 7 `postgres=arwdDxtm/postgres authenticated=arwdxt/postgres`
  · 8 kullanıcı 2 · 9 auth 3 → neden H1 (service_role'ün tanimlar okuma yetkisi yok); deneme hiçbir şey yazmadı.
  Önerilen düzeltme: `tanimlar-service-role-okuma.sql` (yalnız SELECT, yalnız deneme) — kullanıcı onayı bekleniyor.
- Kullanıcı onayı (25 Kasım): yalnız deneme projesinde `grant select on public.tanimlar to service_role`; diğer yetkilere dokunulmaz.
  Dosya `tanimlar-service-role-okuma.sql` (doğrulama sütunları: service_role_okur, anon_okur, yetki_listesi, authenticated_ayni).
  Neden eksik kaldığı: `KURULUM-SERVICE-ROLE.md` (kurulum_betigi 8. adımı service_role'ü taşımıyor). Yerel kopyada iki dosya sınandı
  (geçici veritabanı, sonra silindi): grant sonrası `t · f · … service_role=r/postgres · t`.
- Deneme projesinde UYGULANDI (kullanıcı, SQL Editor, 25 Kasım): service_role_okur **true** · anon_okur **false** · yetki listesi
  `postgres=arwdDxtm/postgres authenticated=arwdxt/postgres service_role=r/postgres` · authenticated_ayni **true** (değişmedi).
- `sonra-kullanici-ve-kapsam-salt-okur.sql` (25 Kasım): 1 uygulama listesinde DenemeMuhasebe **0** · 2 Auth hesabı **0** →
  yeniden deneme serbest. 3 public tablolar 49 · service_role SELECT YOK **35** · 4 fonksiyonlar 140 · service_role EXECUTE YOK **0** ·
  5 ilk 15: cariler, cek_gorselleri, cop, degisiklik, fis_cek_iz, fis_karsilanan_iz, fis_sayac, gorevler, gunluk, hesap_hareketleri,
  isc_odeme, mes_bildirim, modeller, onaylar, platform_firmalar · 6 postgres varsayılan yetkileri `postgres=arwdDxtm/postgres
  authenticated=arwdDxt/postgres` (service_role YOK). Yetki verilmedi; yalnız ölçüm.
- `DenemeMuhasebe` yeniden denendi (bir kez): "Deneme Muhasebe eklendi · bulut hesabı: denememuhasebe@atolye.local"; listede rol
  Kullanıcı, "bulut" etiketli. Ardından konteynerden `islem: "ekle"` ile hesap açma denemeleri: OPTIONS 200 · jetonsuz **401**
  "Oturum jetonu yok" · sahte jeton **401** "Oturum geçersiz" → girişsiz kullanıcı oluşturamıyor (ölçüldü).
- Yönetici OLMAYAN çağrı (DenemeMuhasebe oturumu, tarayıcı konsolu, `islem: "yok"`): **HTTP 403** "Bu işlem için Yönetici rolü gerekli"
  → gerçek oturumlu, Yönetici olmayan kullanıcı fonksiyonda hiçbir işlem yapamıyor (rol denetimi gövdeden önce; ölçüldü).
  Konsoldaki `surum.json` CSP satırı beklenen (korumalı sunucu yayın sürüm dosyasını vermez; uygulama null sayar).
- `deneme-kullanicilari-salt-okur.sql` (ekleme öncesi): denememuhasebe var · Kullanıcı · kimlik var · auth 1 · para false ·
  yetkiler **boş** (şablon eklemede uygulanmamış; 403 sınaması bu hâlde yapıldı — rol Kullanıcı olduğu için geçerli) ·
  denemeuretim yok · 0 · denemesef yok · 0. Şablon, satırdaki "Yetkiler" › "Rol şablonu" seçimiyle uygulanır (rol alanı da şablon
  adına döner: Muhasebe / Üretim; G-25 sunucusu PARA'yı yetki kutularından okur, rol adından değil — yalnız "Yönetici" özel).
- Eklemeler sonrası (kullanıcı "OLDU"): denememuhasebe var · Muhasebe · auth 1 · para **true** · cari=gdks fisler=gdk muhasebe=gdks
  siparis=g (beklenen) · denemeuretim **yok · auth 0** (beklenen: var) · denemesef var · Üretim · auth 1 · para false · yetkiler
  fisler=g siparis=g stok=gdk uretim=gdk (beklenen elle eklenecek cari=g ve fisler=dk YOK). Durduruldu; tekrar ekleme yapılmadı.
- "deneme%" taraması (salt okur): liste deneme (Yönetici) · DenemeMuhasebe (Muhasebe) · DenemeSef (Üretim); auth deneme ·
  denememuhasebe · denemesef. Üretim kullanıcısı başka adla da AÇILMAMIŞ → DenemeUretim bir kez eklenecek; yarım kayıt yok.
- Kullanıcılar TAMAM (salt okur doğrulama): denememuhasebe Muhasebe · auth 1 · para true · cari=gdks fisler=gdk muhasebe=gdks siparis=g ·
  denemeuretim Üretim · auth 1 · para false · fisler=g siparis=g stok=gdk uretim=gdk · denemesef Üretim · auth 1 · para false ·
  cari=g fisler=gdk siparis=g stok=gdk uretim=gdk. Üçü de kimlikli. Her biri bir kez açıldı.
- Deneme verisi ÖNCESİ (`deneme-verisi-salt-okur.sql`): 1 cariler: `Deneme Müşteri · Müşteri` (önceden var; planlananlar yok) ·
  2 bölüm yok · 3 ürün: **`Deneme Bot · {}`** (önceden VAR, proses ücreti boş — EKLEMELER'deki adla çakışıyor) · 4 üretim 0 · 5 atama yok.
  Karar bekleniyor: var olan `Deneme Bot`'a dokunmadan ayrı adlı yeni mamul mü, yoksa var olana Kesim 35 eklemek mi.
- Kullanıcı kararı (25 Kasım): deneme mamulü **`Deneme Bot G25`** (eski `Deneme Bot`'a dokunulmaz); iki Personel carisi, `Deneme Bölüm`
  (maaş 30.000; Deneme Usta bölüme BAĞLANMAZ) ve yeni mamul eklenir. EKLEMELER.md ve deneme paketindeki mamul adı güncellendi.
  `deneme-verisi-salt-okur.sql` adet / maaş / Kesim ücreti / ön koşul satırlarıyla genişletildi (yerelde boş ve dolu kopyada sınandı).
- Genişletilmiş `deneme-verisi-salt-okur.sql` (ekleme öncesi): 0 ön koşul **Kesim false** · Siyah true · 40 true · 4 adet 0·0·0·0 ·
  6 ürün yok · 7 0 · 8 yok. Kesim prosesi Tanımlar'da YOK → mamul eklemesi durduruldu (Tanımlar'a proses eklemek onay listesinde
  değildi); cariler ve bölüm etkilenmez.
- Proses listesi (salt okur): **boş** (deneme projesinde hiç proses tanımlı değil) → benzer adlı proses yok.
- Kullanıcı onayı (25 Kasım): yalnız deneme projesinde Kesim prosesi bir kez; onaylı test verisinin rutin bağımlılıkları (var olanlar kontrol edilerek) aynı kapsamda — mevcut kaydı değiştirme / silme veya yeni yetki gerekirse önce bildirilir.
- Aşama A sonrası (salt okur): 0 true·true·true · 1 iki Personel carisi + eski Deneme Müşteri · 3 eski `Deneme Bot · {}` değişmedi,
  `Deneme Bot G25 · {"Kesim": 35}` · 4 **1·1·1·1** · 5 **30000 · false** · 6 **35** · 7 0 · 8 yok. SAPMA: 2 `Deneme Bölüm … prosesler: **Kesim**`
  — plan "bağlı proses seçilmez" idi. Bölüme bağlı prosesin teslimi cariye yazılmaz (130-tanimlar: "bu proseslerin teslimi cariye
  yazılmaz") → Deneme Usta'nın Kesim işçiliği / ücret onayı sınaması geçersiz olur. Aşama B durduruldu; bağın kaldırılması için
  kullanıcıya bildirildi (yeni eklenen kaydı değiştirmek).
- Bölüm–Kesim bağı kullanıcı tarafından kaldırıldı; doğrulama: 2 `Deneme Bölüm · Deneme Maaşlı Personel=30000 · prosesler: -`, diğer satırlar aynı (1·1·1·1 · 30000·false · 35 · 0 · yok). Aşama A TAMAM.
- Aşama B: Yeni Üretim Siparişi reddedildi — "Deneme Bot G25: reçete tamamlanmadan üretim açılamaz — Reçetede hiç hammadde yok". Hiçbir şey yazılmadı. Rutin bağımlılık: deneme hammaddesi + reçete satırı + reçete onayı (EKLEMELER 4b).
- Aşama B sonrası: 7 `1 · 10` · 8 `Kesim · Deneme Usta · 10 · true · **true**` — atama TAMAMLANMIŞ görünüyor (beklenen false). İz için salt okur `deneme-uretim-iz-salt-okur.sql`.
- Teslim YÖNETİCİ ile alındı (kullanıcı). Kaynak: g25_fis_cari_yetki_tek'te PARA yetkilisi (Yönetici dahil) onay aranmadan geçer — tasarım gereği; ret yalnız PARA'sız kullanıcıya. Bu iş tamamlandı; testler için aynı biçimde ikinci üretim + iş açılacak (iptal YOK). Yan gözlem (ölçülecek): PARA yolunda isc_odeme yazılmıyor olabilir.
- İz (`deneme-uretim-iz-salt-okur.sql`): 1 `10001 · Tamamlandı · 10 | 10002 · Planlandı · 10` · 2 ilk atama tamamlandı (sağlam 40=10),
  ikinci `atama-mww74ght-09dp · Kesim · 10 · true · false` (AÇIK — test işi) · 3 tek ÜRT fişi 350, iptalsiz, Yönetici · 4 Deneme Usta
  Alacak 350 "Kesim işçilik ücreti — Deneme Bot G25 · 10 adet × 35 ₺" · 5 ucr_onay **yok** · 6 isc_odeme **yok** → PARA yolu ödeme
  kaydı yazmıyor (yan gözlem DOĞRULANDI; etkisi ayrıca değerlendirilecek, bu işte değil). Ekranda hammadde stoğu −10 (beklenen −20)
  → `deneme-hammadde-salt-okur.sql` ile bakılacak.

# Kontrol listesi (deneme projesi, korumalı sunucu, 25 Kasım)

- **Test 1 — GEÇERSİZ (Yönetici ile girilmişti; kullanıcı teyidi). Gözlem olarak:** Üretim Takibi › Ücret onayları → "Onay bekleyen ücretler (1) — onaylanmamış ücretle teslimde
  işçilik yazılmaz; cari / muhasebe yetkilisi Onaylar'dan onaylar" · `10002 · Kesim · Deneme Usta · 10 adet × 35 ₺`; şeritte onayla düğmesi
  yok (Yönetici ekranında da). DenemeUretim ile YENİDEN yapılacak.
- 10002 de YÖNETİCİ ile teslim alındı (kullanıcı): önce 0 adetle teslim, sonra adet düzeltilip yeniden; kullanıcıya göre stok düşümü olmadı. Test işi tükendi → ölçüm (iz + hammadde sorguları) bekleniyor; sonra üçüncü üretim.
- İz (10002 Yönetici teslimi sonrası): iki üretim de Tamamlandı; ikinci atama sağlam 40=10, 14:08:48. Fişler: 10001 ÜRT 350 (geçerli) ·
  10002 ÜRT 350 **iptal** 14:08:32 · 10002 ÜRT 350 geçerli 14:08:47. Deneme Usta: 350 geçerli · 350 iptal · 350 geçerli → net 700 = 2 × 10 × 35;
  ÇİFT İŞÇİLİK YOK (düzeltme eski fişi iptal edip yenisini kesmiş). ucr_onay yok · isc_odeme yok (PARA yolu). Hammadde hareketleri bekleniyor.
- Hammadde (`deneme-hammadde-salt-okur.sql`): hammadde düşümü İŞ VERMEDE değil TESLİMDE (ÜRT fişinde) yazılıyor. 10001 −10 · 10002 ilk fiş −10
  (iptal) · 10002 geçerli fiş −10 ve **+10 "Artan iade (Kesim)"** → 10002 net 0; toplam −10. Ekrandaki −10 sunucuyla tutarlı. Neden:
  düzeltilmiş teslimde artan hammadde 10 girilmiş / kalmış (kullanıcı ilk denemede bir kutuya 0 girmişti). G-25 dışı; veri olduğu gibi
  bırakıldı (düzeltmek iptal + yeniden teslim = mevcut kaydı değiştirmek). Olası arayüz sorunu (düzeltmede eski değer taşınıyor mu)
  ÖLÇÜLMEDİ — ayrı madde.
- Üçüncü üretim 10003 açıldı, Kesim Deneme Usta'ya verildi. Test 1 (yeniden): "Onay bekleyen ücretler (1)" · `10003 · Kesim · Deneme Usta · 10 adet × 35 ₺` — kullanıcının DenemeUretim olduğu teyit bekleniyor.
- **Test 1 — GEÇTİ:** oturum "Deneme Uretim · Üretim · v1.745.1" (ekrandan teyit); "Onay bekleyen ücretler (1)" · 10003 · Kesim · Deneme Usta · 10 adet × 35 ₺; onayla düğmesi yok; kartta "10 / 10 adet dağıtıldı". Not (test 4 için): üst menüde Cari yok ama "Finans" menüsü ve önceki oturumdan kalan "Cari" sekmesi görünüyor — test 4'te bakılacak.
- **Test 2 — GEÇTİ (ekran):** DenemeUretim, 10003 Kesim teslim (sağlam 40=10) → "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (Cari hareketi gerçek bir üretim işlemine bağlı değil (Kesim işi (10 adet × 35 ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra miktar / kişi / ücret değişti) — bu kayıt için cari veya muhasebe kaydetme yetkisi gerekir)". Sunucu doğrulaması (iz sorgusu) bekleniyor.
- Test 4 (kısmi): DenemeUretim'de Finans menüsünde yalnız "Fişler" (yetki fisler=g — beklenen; cari / kasa / muhasebe maddeleri yok). Cari sekmesi, maaş şeridi bekleniyor.
- Test 4: kalan "Cari" sekmesine tıklanınca ekran bir an açılır gibi olup Anasayfa'ya yönleniyor (yetkisiz modül kapısı; cari verisi gösterilmedi — kullanıcı gözlemi). Maaş şeridi bekleniyor.
- **Test 4 — GEÇTİ:** Finans'ta yalnız Fişler; Cari sekmesi yetki kapısıyla Anasayfa'ya döndürüyor (100-app 1262–1268); Anasayfa'da maaş şeridi YOK.
- **Test 3 — GEÇTİ (ekran):** DenemeUretim, Mesai bildirimi Kasım 2026 · Deneme Maaşlı Personel (Deneme Bölüm) · hafta içi 10 · cmt 0 · pazar 0 → "onay bekliyor"; TL tutarı yok.
- **Test 2 — sunucuda doğrulandı:** iz: 10003 ataması verildi true · tamamlandı **false**; ÜRT fişleri yalnız önceki 3 (10003 için fiş YOK); Deneme Usta hareketleri yalnız önceki 3 (yeni hareket YOK); ucr_onay / isc_odeme yok. Ret hiçbir şey yazmadı.
- **Test 5 — GEÇTİ (ekran, DenemeSef):** Deneme Maaşlı Personel › Bilgiler: "Maaş ve aylık çalışma saati: bu işlem için cari veya muhasebe kaydetme yetkisi gerekir"; maaş / saat kutuları kod gereği disabled (272: disabled={!bolum || !para}); "Mesaiyi onaya gönder" VAR, "Mesaiyi yaz" ve Tutar YOK (ekran PARA'sız oturumu kanıtlar). Gözlem: maaş rakamı (30000) ve "Saat ücreti 133,33 ₺" cari görüntüleme yetkisiyle GÖRÜNÜYOR — yazma kapalı; görünürlük G-25 kapsamı dışı (ayrı karar). Kesim çipi seçili değil.
- Test 6 başlangıç (DenemeMuhasebe): "Maaş tahakkuku bekliyor — Kasım 2026: 1 personel, 30.000 ₺ (Deneme Maaşlı Personel)" şeridi GÖRÜNÜYOR (PARA'lı kullanıcı; DenemeUretim'de yoktu — test 4 ile tutarlı) · "Onay bekliyor: 1 mesai bildirimi · 1 işçilik ücreti" şeridi VAR. Maaş tahakkuku onaylanmadı (planda yok; mesai ölçümünü karıştırmasın).
- Test 6 durum sorgusu: 6 mesai `2026-11 · haftaIci 10 · onaylandi · MS-261125001` (TEK MS fişi) · 7 Deneme Maaşlı Personel **2 hareket · 32000** → maaş tahakkuku 30000 (şeritten onaylanmış — planda yoktu) + mesai **2000** (= 133,33 × 10 × 1,5 — beklenenle aynı). 4 ücret onayı **yok** → 10003 işinin ücret onayı yapılmamış ya da düşmüş; soruldu. 1 10003 açık · 3 `3 · 700` değişmedi.
- Ekran: şerit "Onay bekliyor: 0 mesai bildirimi · 1 işçilik ücreti" — şerit sayısı ucret_onaylari'ndan (sunucu) geliyor → ücret onayı sunucuda YOK (durum sorgusu satır 4 ile tutarlı). Kullanıcı "hepsi onaylandı" diyor; Ücretler sekmesi (onay kutusu + "Seçilenleri onayla", hata kutusu data-onay-ucret-hata) ekran görüntüsü istendi.
- Ücret onayı: kullanıcı "onaylandı" (Seçilenleri onayla) — durum sorgusuyla doğrulama bekleniyor.
- **Test 6 — GEÇTİ (sunucu):** 4 `atama|atama-mww7le6a-sp6d · denememuhasebe@atolye.local` (tek onay, DenemeMuhasebe) · 1 10003 hâlâ açık · 3 `3 · 700` değişmedi · 5 ödeme yok · 6 mesai onaylandi MS-261125001 · 7 `2 · 32000`.
- **Test 8 — GEÇTİ (sunucu):** DenemeUretim, 10003 sağlam 6 → atama 6 tamamlandı + kalan 4 açık parça (aynı usta) · yeni ÜRT 210 (14:40:53) · Deneme Usta `4 · 910` · onay değişmedi (tek, iş onayı geçerli kaldı) · isc_odeme `atama:atama-mww7le6a-sp6d · 6 · 35` (kök = onaylanan atama).
- **Test 9 — GEÇTİ (sunucu):** kalan 4 teslim → iki parça da tamamlandı, üçüncü parça YOK · ÜRT 140 (14:42:07) · Deneme Usta `5 · 1050` · isc_odeme 6 + 4 = 10 = onaylanan miktar. **Test 10 (çift basış):** tek 140 fişi, tek ödeme satırı → ikinci fiş açılmadı (kullanıcı: "2 kez bastım hızlıca" — teyit edildi; tarayıcı düzeyinde mi sunucu istek kimliğiyle mi engellendiği bu ölçümden ayrılamaz, sonuç aynı).
- **Test 13 — GEÇTİ (ekran, DenemeUretim):** Mesai bildirimi Kasım 2026 · Deneme Maaşlı Personel: "onaylandı · MS-261125001", Bildir düğmesi kapalı (soluk). Not: saat kutuları düzenlenebilir görünüyor; düğme kapalı olduğu için gönderilemez — sunucuda da onaylı ay için bildirim reddedilir (bu ekrandan ayrıca sınanmadı).
- Test 11: Fişler ekranında ÜRT fişi iptali KAPALI — "Üretimden geri alınır" (250-fisler: üretim fişi yalnız üretim kartındaki 'teslim almayı geri al' ile iptal edilir; 1.733.0: geri alma fişi iptal eder, satırlar iz olarak kalır). Beklenen tasarım; iptal yolu üretim kartına yönlendirildi (Yönetici).
- **Test 11 — GEÇTİ (sunucu, Yönetici, üretim kartı › 4'lük parça "Geri Al"):** 4'lük parça yeniden açık (tamamlandı false) · ÜRT 140
  fişi **iptal true** · Deneme Usta \`5 · 910\` (hareket iptal işaretli, geçerli toplamdan düştü) · isc_odeme satırı `atama:atama-mww8e1p5-q8bf · 4`
  DURUYOR — tasarım gereği: ödeme kaydı fişe istek kimliğiyle bağlı, fiş iptal olunca sayılmaz (yeni.sql 239, 278–306, 539), yeniden
  teslimde satır silinip yenisi yazılır. Beklentim ("satır silinir") yanlıştı; durum sorgusu 5. satırı fişin geçerli / İPTAL durumunu
  gösterecek biçimde düzeltildi.
- Güncel sorgu (iptal sonrası): 5 `… 6 · 35 · geçerli | atama:atama-mww8e1p5-q8bf · 4 · 35 · İPTAL` → iptal edilen ödeme sayılmıyor (DOĞRULANDI). Yeniden teslim henüz sunucuda yok (4'lük parça açık, yeni fiş yok).
- **Test 11 (yeniden teslim) — GEÇTİ (sunucu, DenemeUretim):** 4'lük parça tamamlandı · TEK yeni ÜRT 140 (15:06:56) · iptal edilen 140 iptal kaldı · Deneme Usta `6 · 1050` · ödemeler 6 geçerli + 4 geçerli (yeniden yazıldı) = 10 = onaylanan; yeni onay istenmedi.
- Kullanıcı onayı (25 Kasım): yalnız deneme, Deneme Bot G25 Kesim ücreti 35 → 40 → 35 (Test 12). Düzeltilmiş beklenti: 40'ta eski onay
  geçersiz + teslim ret; 35'e dönünce de YENİ muhasebe onayı olmadan teslim geçmez; yeniden onayla teslim geçer, tek ödeme.
  Kaynak okuması (ölçümden önce): `g25_onayli` = "onaylanan özet == güncel özet" → 35'e dönünce eski onay KENDİLİĞİNDEN CANLANIR
  (ABA). Deneme projesinde ölçülecek (`deneme-onay-gecerlilik-salt-okur.sql`); düzeltme yerelde sınanacak.
- **Test 12 D (ücret 40):** onay geçerlilik sorgusu: 10003 ve 10004 onayları `su_an_gecerli false` (onaylanan 35, güncel 40) — eski onay düştü ✓. (10003 zaten tamamlanmıştı; etkisiz.)
- **Test 12 F (ücret 40, DenemeUretim, 10004 teslim):** "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (… Kesim işi (10 adet × 40 ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra miktar / kişi / ücret değişti) …" → ret ✓ (E ekranı ayrıca bekleniyor).
- Bilgisayar değişti (kullanıcı): yeni PC'de Node v26.13.1 kuruldu; korumalı sunucu HTML özetiyle başladı (0957fa0d2972…, connect-src yalnız deneme + esm.sh); konsol: "ANA PROJE: ENGELLENDİ · DENEME: ulaştı (401)".
- **Test 12 H (ücret 35'e geri, yeni onay YOK):** onay geçerlilik sorgusu: 10004 `atama|atama-mww9mkke-8hua` **su_an_gecerli TRUE**
  (onaylanan 35 = güncel 35, onay saati 15:15:53 — YENİ onay verilmedi); 10003 de true. → **BULGU DENEME PROJESİNDE DOĞRULANDI:** eski onay
  kendiliğinden canlandı; bu hâlde teslim yeni muhasebe onayı olmadan geçerdi. **Test 12 bu pakette BAŞARISIZ.** Teslim denenmedi.
  Düzeltme: `25b-onay-muhru-uygula.sql` (yerelde eski paket + 25b 288/288; mühürsüz eski paket 12 ✗). Deneme projesine uygulanması ayrı onay bekliyor.

# 25b — onay geçersizlik mührü DENEME PROJESİNE UYGULANDI (kullanıcı, SQL Editor, 25 Kasım; onay: yalnız drtmnovafswzcmpacubl)
Dosya `25b-onay-muhru-uygula.sql` SHA-256 `5ba5620a1914279dc835f989c2feb55a2e1b501384c6d286c85f926ec9bc6246` (atomiklik: sonuc-25b-atomiklik.txt).
Çıktı: 1 gecersiz sütunu eklendi · 2 g25_onayli / ucret_onayla mührü dikkate alıyor · 3 mühür tetikleyicileri (4) kuruldu, etkin ·
4 şu an geçerli onay sayısı **2** (10003 + 10004 — uygulamadan önce de 2'ydi; değişmedi) · 99 **UYGULANDI**. Salt okur doğrulamalar bekleniyor.
- 25b sonrası `25-sonra-dogrula-salt-okur.sql` (be4141ee…): 1–10 tamam (4: 22 fonksiyon · 8: 5 tetikleyici etkin) · 99 **TAMAM**. Önkoşul bekleniyor.
- 25b sonrası `25-onkosul-salt-okur.sql` (1be58205…): 1 VAR · 2–4 G-25 uygulanmış · 5 A6 · 6 **30** (22+3+5) · 7 kurallar AÇIK · 99 **UYGULANMIŞ**. 25b uygulaması TAMAM.
- Anlık görüntü (kullanıcı; hangi adımda alındığı soruldu): car_hareket 9 0de77f81… · Usta bakiye 1050 · isc_odeme 2 27a9389d… · kas_hareket 1 591c1ff7… · stk_fis 11 d7e2043e… · stk_hareket 13 1e6c98dd… · ucr_onay 2 8f25b49a… · uretim 4 ac49f562… · uretim_atamalari 5 fc356893…
- Anlık görüntü 2: yalnız ucr_onay özeti değişti (8f25b49a… → 1eba16b4…); diğer 8 satır birebir aynı — mühür basılması ile tutarlı (gecersiz sütunu doldu); fiş / hareket / ödeme / bakiye değişmedi.
- **Test 12 (2. döngü) ücret 40:** 10003 ve 10004 su_an_gecerli false · muhurlu true · kaynak urunler · mühürdeki ücret 40 · ürün 40.
- **Test 12 (2. döngü) ücret 35'e GERİ:** 10004 `su_an_gecerli FALSE` · onaylanan 35 = güncel 35 · muhurlu true (kaynak urunler, mühürdeki 40) → **eski onay CANLANMADI** (1. döngüde aynı durumda true idi). Düzeltme deneme projesinde çalışıyor.
- **DİKKAT:** 10004 teslimi GEÇTİ: "ÜRT-261125007 · 10004 tüm prosesler tamamlandı — mamul stoğa eklendi". Hangi kullanıcıyla yapıldığı soruldu (Yönetici ise PARA yolu — tasarım; DenemeUretim ise BULGU). Ölçüm bekleniyor.
- 10004 teslimi YÖNETİCİ (DY) ile yapıldı (kullanıcı) → PARA yolu, onay aranmaz (tasarım; bulgu değil). Test 12'nin "Üretim hesabı reddedilmeli / anlık görüntü aynı / yeniden onay + tek ödeme" adımları bu işte YAPILAMADI (iş tükendi). Yeni iş + 3. ücret döngüsü için onay istendi.
- 10004 iz (salt okur): fiş ÜRT 350, iptalsiz, oluşturan deneme@atolye.local (Yönetici) 17:56:48 · onay geçerli false / mühürlü true (teslim onayı kullanmadı) · isc_odeme YOK (PARA yolu) · atama tamamlandı. Yönetici teyidiyle tutarlı.
- 10005 üretimi açıldı ve Kesim Deneme Usta'ya verildi — DenemeUretim kullanıcısıyla (kullanıcı). Üçüncü ücret döngüsü için onay henüz verilmedi.
- Kullanıcı onayı (25 Kasım): "yol 1 onaylıyorum" — yalnız deneme projesinde Kesim ücreti ÜÇÜNCÜ kez 35 → 40 → 35 (10005 üzerinde Test 12'nin ret / anlık görüntü / yeniden onay + tek ödeme adımları), ardından Test 7.
- **Test 12 (3. döngü, 10005):** 35 → 40 → 35 sonrası 10005 (onay 18:00:36) su_an_gecerli **false** · güncel 35 = onaylanan 35 · mühürlü (urunler, 40) → eski onay canlanmadı ✓.
- Test 12 (3. döngü) anlık görüntü ÖNCE: car_hareket 10 5565de2c… · Usta 1400 (1050 + 10004'ün 350'si) · isc_odeme 2 27a9389d… · kas 1 591c1ff7… · stk_fis 12 708f17a0… · stk_hareket 15 66f6aeb8… · ucr_onay 3 3dfdfbee… · uretim 5 ca156b80… · atama 6 15cc50c0…
- **Test 12 (3. döngü) DU teslimi (ücret 35, onay mühürlü):** "Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (… Kesim işi (10 adet × 35 ₺) cari / muhasebe onayı bekliyor ya da onaydan sonra miktar / kişi / ücret değişti) …" → RET ✓ (ilk döngüde bu durumda onay canlıydı, teslim geçerdi). SONRA anlık görüntüsü bekleniyor.
- Test 12 (3. döngü) anlık görüntü SONRA: 9 satırın 9'u ÖNCE ile BİREBİR aynı (car_hareket 10 5565de2c… · Usta 1400 · stk_fis 12 708f17a0… · stk_hareket 15 66f6aeb8… · ucr_onay 3 3dfdfbee… · atama 6 15cc50c0… · isc_odeme 2 · kas 1 · uretim 5) → reddedilen teslim HİÇBİR kayıt / bakiye değiştirmedi ✓.
