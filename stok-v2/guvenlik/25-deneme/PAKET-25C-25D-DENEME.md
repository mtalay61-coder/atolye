# Deneme projesi — 25c + 25d uygulama ve B kuralı sınaması (ONAYA SUNULAN PAKET; uygulanmadı)

Kapsam: YALNIZ `drtmnovafswzcmpacubl`. Canlı, main, yayın, Faz 2 DEĞİL. Her SQL adımı ayrı Run; çıktı görülmeden sonrakine geçilmez.
Sabitleme: `SABIT.md` (GÜNCEL-2). Geri alma: `25-cari-yetki-geri-al.sql` (G-25'in TAMAMINI geri alır; ayrı onay).

## 0. Salt okur — deneme projesinin GERÇEK durumu (yerel kopya değil)

1. `deneme-paket-durumu-salt-okur.sql` → 5. satır beklenen **"G-25 + 25b (sırada 25c, sonra 25d)"**. Başka bir şey çıkarsa DUR.
   6. satır: açık atama / açık tamir sayısı (25d'den sonra bunları 1.745.2 teslim etmeli).
2. `deneme-anlik-goruntu-salt-okur.sql` → ÖNCE görüntüsü (uygulama veri yazmaz; SQL'den sonra 9 satır birebir aynı olmalı).
3. `deneme-is-defteri-salt-okur.sql` → 10001–10006 dört defter (başlangıç).

Uygulama sırası buna göre: **25c → 25d** (25d 25c'yi önkoşul sayar; 25c yoksa reddeder). Tam paket burada KULLANILMAZ (G-25 zaten var).

## 1. 25c (yazar) — `25c-para-teslim-odeme-uygula.sql`

SHA-256 `8d222633ce4c24358d4f5621d5d175181bee7bb20c9c0900abfb5dab03c82112` · 22 977 karakter (CRLF ile 23 277).
Beklenen: `1 g25_uretim_butunluk kuruldu · 2 PARA dalı ödeme defterine · 3 defter dışı geçmiş işçilik proses tavanında · 99 UYGULANDI`.
Atomiklik (yerel): son adım düşürüldü → hiçbir şey değişmedi (`sonuc-25c-atomiklik.txt`).

## 2. 25d (yazar) — `25d-tamir-ilk-iscilik-uygula.sql`

SHA-256 `493c58d01d83ae529b63203767dea92d014c3dca1102672464120fd6fb1efc97` · 29 148 karakter (CRLF ile 29 517).
Beklenen: `1 g25_alt_saglam + g25_ilk_atama kuruldu · 2 işçilik ≤ sağlam; ilk işçilik ilk ustaya · 99 UYGULANDI`.

## 3. Salt okur doğrulama

- `25-sonra-dogrula-salt-okur.sql` (3f9c6e56…) → 1–10 tamam, **TAMAM**.
- `25-onkosul-salt-okur.sql` (fcdc0c32…) → 6. satır **34** (26 fonksiyon + 3 tablo + 5 tetikleyici), **UYGULANMIŞ**.
- `deneme-paket-durumu-salt-okur.sql` → 5. satır **"G-25 + 25b + 25c + 25d"**.
- `deneme-anlik-goruntu-salt-okur.sql` → 0. adımdaki ÖNCE ile 9 / 9 birebir (SQL veri yazmadı).

## 4. İstemci — YALNIZ 1.745.2 (25d eski istemciyle uyumsuz: 1.745.1 tamirli teslimde 10'u öder → sunucu reddeder)

1. Açık 1.745.1 sekmelerini KAPATIN; eski korumalı sunucuyu (PowerShell penceresinde Ctrl+C) durdurun.
2. `atolye-erp-v1.745.2.html` (SHA-256 `bea508d4137187c57eab2e14bcb3d013d7be45ce3b7a93f91369fb8463c52ce5`) `g25-deneme` klasörüne; `Get-FileHash` ile doğrulayın.
3. `node korumali-sunucu.js atolye-erp-v1.745.2.html bea508d4137187c57eab2e14bcb3d013d7be45ce3b7a93f91369fb8463c52ce5`
   (sunucu her istekte özeti denetler; yalnız bu dosyayı sunar; connect-src yalnız deneme + esm.sh). Ana proje ENGELLİ denetimi yeniden.
4. Uygulamada sürüm (sağ üst menü) **v1.745.2** görünmeli.

## 5. Sınama A — 25c: Yönetici teslim → iptal → Üretim kullanıcısıyla yeniden teslim (yeni iş 10007)

| Adım | Kim | Beklenen (deneme-is-defteri, 10007 satırı) |
|---|---|---|
| a | DU: 10007 aç (Deneme Bot G25 · Siyah · 40 = 10), Kesim → Deneme Usta | fiş 0 · ödeme - |
| b | DenemeMuhasebe: 10007 onayla | — |
| c | Yönetici: teslim al, sağlam 10 | fiş 1 · Usta 350 · ödeme `atama Usta 10×35` (25c ÖNCESİ burada ödeme YOKTU) · stok 10 |
| d | Yönetici: üretim kartı › Kesim › Geri Al | fiş 0 (iptal 1) · cari - · ödeme - · stok 0 |
| e | DU: aynı işi yeniden teslim al, sağlam 10 | fiş 1 (iptal 1) · Usta 350 · ödeme `atama Usta 10×35` · stok 10 — TEK geçerli fiş / TEK ödeme |

## 6. Sınama B — 25d / 1.745.2: B kuralı gerçek hesaplarla (yeni iş 10008)

Rutin bağımlılık: ikinci usta carisi `Deneme Tamirci` (Personel, bölüme EKLENMEZ) — yoksa bir kez açılır.

| Adım | Kim | Beklenen (10008) |
|---|---|---|
| a | DU: 10008 aç, Kesim → Deneme Usta; DenemeMuhasebe onaylar | — |
| b | DU: teslim sağlam 8 + tamir 2, "Tamiri kim yapacak" = Deneme Tamirci, önerilen 10 | fiş 1 · Usta **280** · ödeme `atama Usta 8×35` · stok 8; tamir işi açık |
| c | DU: tamir parçasını onaysız teslim dener | RET ("tamir işi … onayı bekliyor"); dört defter değişmez |
| d | DenemeMuhasebe: Onaylar › Ücretler › tamir satırı ücret **15** → Seçilenleri onayla | — |
| e | DU: tamir parçasını teslim, sağlam 2 | fiş 2 · Usta **350** (280 + 70) · Tamirci **30** · ödeme `atama Usta 8×35 · atama(tamir) Tamirci 2×15 · ilk Usta 2×35` · stok 10 |
| f | Fişler › 10008 fişleri | ilk fiş işçilik tablosu: sağlam 8 · tamir 2 · hurda 0 · ödenen 8 · 35 · 280; tamir fişinde iki satır (Tamirci 2×15=30, Usta 2×35=70) |

Her adımdan sonra `deneme-is-defteri-salt-okur.sql`; ret adımlarında öncesi / sonrası `deneme-anlik-goruntu-salt-okur.sql`.
Geçmiş kayıtlar (10001, 10002, 10004 — defter dışı) DEĞİŞTİRİLMEZ; `defter_disi_gecmis` sütunu 25c sonrası her birinde 10 gösterir.
