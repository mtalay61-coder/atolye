# Renk çökmesi — silinen varyant kimlikleri ve bağlantılar (araştırma, 26 Kasım)

Durum: KOD VE ŞEMA İNCELEMESİ. Canlı envanter sonucu (`renk-cokmesi-envanteri-salt-okur.sql`) HENÜZ GELMEDİ; aşağıdaki
"kesin / şüpheli" ayrımı o sonuca uygulanacak kurallar. Yeni kimlik ÜRETİLMEDİ, hiçbir veri değişmedi.

## 1. Bulutta varyant kimliği nasıl doğuyor, kim ona bağlı

- `stk_varyant.id` varsayılanı `'vry-' || gen_random_uuid()` — RASTGELE. Ad / renk / ölçüden TÜRETİLEMEZ; aynı
  (ürün, renk, ölçü) için yeniden açılan varyant YENİ kimlik alır (`stk_varyant_tekil` eşsiz dizini (urun_id, renk_id, olcu_id)).
- Kimliğe bağlı TEK yabancı anahtar: `stk_hareket.varyant_id` (stok-v2 kurulum). Sipariş kalemi, üretim, rezervasyon,
  koli, reçete, renk resmi, harici barkod varyant kimliği DEĞİL renk ADI (ve kimi yerde renk tanım kimliği) taşır.
- İstemci varyant kimliğini HİÇ bilmez (src'de `varyant_id` / `vry-` yok); `varyantlar` görünümü (`stk_eski_varyantlar_g`)
  kimliği dışarı vermez. Bu yüzden istemcinin yerel yedekleri de bu kimliği İÇERMEZ.
- `stk_yaz` varyantKaldir: stoğu ≠ 0 → dokunmaz ("atlanan"); hareketi var → `aktif=false` (KİMLİK DURUYOR);
  ikisi de yok → DELETE.

Sonuç: SİLİNEN varyant tanım gereği hareketsiz ve stoksuzdu → veritabanında o kimliğe bağlı hiçbir kayıt yok;
kimliğin kendisi kayıp bağlantı taşımıyor. Hareketli olanlar silinmedi, PASİF duruyor — onlar envanterin `2-varyant`
bölümünde eski kimlikleriyle görünecek ve onarımda YENİ KİMLİK GEREKMEDEN yeniden etkinleştirilebilir.

## 2. Silinen kimliği geri bulma olanakları

| Kaynak | Kimliği içerir mi | Ne verir | Not |
|---|---|---|---|
| Supabase günlük yedeği / PITR (Dashboard › Database › Backups) | EVET | silinen `stk_varyant` satırları (id, renk_id, olcu_id, min_stok, olusturma) | Plan ve saklama süresine bağlı; kullanıcı panelden bakmalı. Canlıya GERİ YÜKLENMEZ — ayrı projeye açılıp salt okur sorgulanır |
| İstemci otomatik yedeği `yedek:<gün>` (cihazın IndexedDB'si, son **3 gün**, günde bir, açılışta) | HAYIR | ürünün o günkü varyantları: renk etiketi, beden, renkId, miktar, minStok | Yalnız uygulamanın açıldığı cihazda; her yeni gün en eskisini siler → hata gününden önceki yedek birkaç gün içinde kaybolur |
| Elle alınan JSON yedek dosyaları (Tanımlar › Bakım) | HAYIR | aynı içerik | Bilgisayarda indirilenler klasörü |
| `stk_renk` | — | kombinasyon tanımı (`tur='model'`, id = kombinasyon kimliği) DURUYOR; adı Tanımlar'la birlikte yeni yazıma güncellenmiş olmalı | envanter `7-renk-tanimi` |
| `stk_varyant.olusturma` / `stk_renk.guncelleme` | — | çöken düz-ad varyantının açıldığı an ≈ ad değişikliği anı | hangi yedeğin "önce" olduğunu belirler |

Öneri: (a) Supabase panelinde yedek / PITR süresine bakın (yalnız bakmak; geri yükleme YAPMAYIN). (b) Ad değişikliğini
yaptığınız bilgisayarda uygulamayı açmadan önce bana söyleyin — Tanımlar › Bakım'daki otomatik yedek listesinde hata
gününden önceki gün duruyorsa onu geri YÜKLEMEDEN JSON olarak almanın yolunu birlikte seçelim. (Geri yükleme bütün veriyi
eski güne döndürür — YAPILMAMALI.)

Kimlik gerçekten gerekli mi: silinenler hiçbir kayda bağlı olmadığı için eski kimlikle yeniden açmak yalnız "aynı satır"
izlenimi verir; işlevsel fark yok. Karar sizin: (1) yedekten eski kimliği alıp AYNI kimlikle geri koymak, (2) kimliksiz
yeniden açmak (sunucu yeni `vry-` verir). Yedek bulunamazsa yalnız (2) mümkün.

## 3. Barkod — önemli

Barkod kimlikten değil KODLARDAN kurulur: stok no + renk kodu + beden kodu (`077 varyantinBarkodu` → `renkKoduBul(tanimlar,
variant.renkId, variant.renk)`). Kombinasyon varyantının renk kodu kombinasyonun `barkodKodu`'dur. Çöken varyant rengin
DÜZ kimliğini taşıdığı için barkodu artık düz rengin koduyla kuruluyor (ekrandaki "Vizon Yılan 0018 · …").

- Daha önce basılmış kombinasyon etiketleri (1054 / 1055 kodlu) çözülünce kombinasyonun adını verir; o adla etkin varyant
  olmadığı için şu an TANINMAYABİLİR. Kombinasyon varyantları geri gelince eski etiketler yeniden tanınır (kod değişmedi).
- Çöken düz-ad varyantı için basılmış YENİ etiket varsa (0018 kodlu), onarımda o varyant kaldırılırsa bu etiketler tanınmaz
  olur → envanterde `6-barkod` (harici barkod) ve etiket basımı sorulacak; düz-ad varyantı stok / hareket / etiket
  taşıyorsa SİLİNMEZ (bkz. 5).

## 4. Envanter sonucu gelince sınıflandırma kuralları

KESİN ETKİLENMİŞ (model bazında, hepsi birden):
- `2-varyant`ta PASİF `renk_tur='model'` varyant VAR, ve
- aynı üründe ETKİN `renk_tur='renk'` varyant VAR ve o renk, pasif kombinasyonun `renkIdler`'inde geçiyor (`7-renk-tanimi`
  `gectigi_kombinasyonlar`), ve/veya
- `3-siparis` / `4-uretim`te o kombinasyonun adıyla `etkin_varyanta_bagli=false` satır var.

KESİN ETKİLENMİŞ — silinmiş (pasif izi yok): sipariş / üretim / reçete / resim kombinasyon adını taşıyor, o ad üründe
hiç varyant olarak yok, aynı üründe o kombinasyonun parçası olan düz renkle etkin varyant var.

ŞÜPHELİ (elle bakılacak):
- yalnız `duz_renk` nedeni (mamul düz renkle bilerek açılmış olabilir);
- yalnız `recete` / `resim` / `barkod` nedeni (eski, bu hatadan bağımsız artık kayıt olabilir);
- sipariş / üretim rengi eşleşmiyor ama ürün kombinasyon kullanmıyor (yazım farkı, başka hata).

## 5. Onarım planının biçimi (envanterden sonra, AYRI ONAY)

Her model için tablo: varyant kimliği · renk (önce → sonra) · ölçü · aktif (önce → sonra) · stok · hareket · bağlı
sipariş / üretim / barkod / reçete / resim · işlem. İşlem türleri:

1. PASİF kombinasyon varyantı → `aktif=true` (kimlik ve hareket geçmişi korunur).
2. Silinmiş kombinasyon varyantı → yedekten eski kimlikle ya da kimliksiz yeniden aç (karar 2).
3. Çöken düz-ad varyantı → stok 0, hareket 0, ona basılmış / kayıtlı barkod yoksa pasif (SİLME yok); stok ya da hareket
   varsa DOKUNULMAZ, miktarın kombinasyonlara nasıl ayrılacağı size sorulur (fişle, fişsiz hareket olmaz).
4. İstemci tarafı: ürünün `variants` listesi (stok kartı) ve reçetenin mamulRenk / mamulRenkId'si kombinasyon adlarına
   döner — yalnız 1.744.37 yayındayken (yoksa sonraki ad değişikliği yine çökertir).

Geri dönüş: işlem öncesi bütün etkilenen satırların tam dökümü (salt okur) saklanır; 1 ve 3 yalnız `aktif` bayrağını
değiştirir → tersine çevrilebilir; 2'de açılan satırlar kimlikleriyle listelenir, geri dönüşte hareketsizse kaldırılır.
