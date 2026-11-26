# Yayın paketi — v1.744.37 (renk adı değişince kombinasyon renkleri çökmesin)

Durum: **HAZIR, YAYINLANMADI.** Birleştirme, `surum.json` ve yayın ayrı kullanıcı onayı bekliyor. Veri onarımı bu paketin
DIŞINDA (ayrı onay; `renk-cokmesi-envanteri-salt-okur.sql` sonucu bekleniyor).

## Kesin içerik

| | |
|---|---|
| Dal | `claude/renk-ad-kombinasyon` (depo `mtalay61-coder/atolye`, taslak PR #370) |
| Taban | main `3f175bc` (1.744.36 yayında). Main'de dalda olmayan commit: 0 → birleştirme fast-forward |
| Uygulama kodu commit'i | `dabe939` (src + HTML). Sonrakiler yalnız `onarim/` belgeleri (uygulamayı değiştirmez) |
| HTML | `atolye-erp-v1.744.37.html` — sha256 `bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a` |
| Tekrarlanabilirlik | Dalın ucundan TEMİZ çalışma ağacında `./yap.sh` → birebir aynı özet |
| Sunucu (SQL) değişikliği | YOK |
| Veri biçimi değişikliği | YOK (açılışta göç / düzeltme çalışmaz) |

Değişen kaynak: `src/046-renk-ad-eslesme.jsx` (yeni, saf `renkAdVaryantReceteUygula`), `src/082-ad-degistir.jsx` (onu
çağırır), `src/015-sabitler.jsx` (sürüm). Test: `test/birim-renk-ad-kombinasyon.js` (+ `derle.js` dışa aktarım, `kosu.sh`).
`yap.sh` eski `atolye-erp-v1.744.34.html`'i sildi (son 3 + yayındaki kalır: .35, .36, .37).

Davranış farkı yalnız Tanımlar › renk adı değiştirmede: kombinasyon etiketi artık yalnız adla eşleşir ve renk kimliğiyle
damgalanmaz; rengin kendi adı eskisi gibi kimlikle eşleşir ve damgalanır. Reçetede aynı kural.

## Doğrulama

- `./yap.sh`: bütün denetimler TEMİZ, derleme OK.
- `./test/kosu.sh` (PW_CHROMIUM=/opt/pw-browsers/chromium, KOSU_IS=6): birim testleri temiz (✗ 0),
  **274/274 senaryo AYNI**; FARKLI / HATALI / ALTIN BOZUK / ATLANDI yok.
- Yeni birim testi 6/6; ESKİ kodla koşunca hatayı birebir üretir (`çıkan: ["Vizon Yılan"]`, dört varyantta da renk kimliği).
- Sınanmayan: canlı veriyle ekrandan ad değiştirme (canlıya dokunulmadı); önceden çökmüş kayıtların görünümü (bu sürüm
  onları değiştirmez).

## Yayın adımları (onaydan SONRA)

1. Taslak PR hazır durumuna alınır, main'e birleştirilir (fast-forward; HTML özeti yukarıdakiyle aynı olmalı).
2. `surum.json` (ayrı commit, main'de):
   `{"surum": "1.744.37", "url": "atolye-erp-v1.744.37.html", "not": "Kombinasyonda kullanılan bir rengin adı değişince modelin renkleri artık tek renge çökmüyor"}`
3. GitHub Pages 1-2 dk; açık uygulamalar açılışta / 10 dk arka plandan dönüşte geçer, çalışırken şerit gösterir.
4. Doğrulama: yayındaki HTML'in özeti = yukarıdaki; uygulamada sürüm 1.744.37.

**DİKKAT — birleştirme = dağıtım.** Depoda ayrı bir Pages iş akışı yok; GitHub Pages `main` dalından yayın yapıyor
(alan adı erp.newdiamond.com.tr). `main`'e her birleştirme Pages dağıtımını TETİKLER ve `main`'deki bütün dosyalar
yayına çıkar. Yani 1. adımdan 1-2 dk sonra `https://erp.newdiamond.com.tr/atolye-erp-v1.744.37.html` adresi
**doğrudan açılabilir olur** — `surum.json` değişmese bile. Değişmeyen tek şey yönlendirme: başlatıcı (`index.html`) ve
açık uygulamalar `surum.json`'a baktıkları için 1.744.36'da kalır; yeni sürüme yalnız adresi bilen / yazan geçer.
Sonuç: 1. adım da bir yayın kararıdır; ayrı onay olmadan birleştirilmez. Kullanıcıları geçiren 2. adımdır.

## Sekmeler gerçekten düzeltilmiş sürümde mi (veri onarımından ÖNCE zorunlu)

Yenilemek yetmez: eski bir sekme hâlâ 1.744.36 kodunu çalıştırıyor olabilir ve bir renk adı değiştirirse çökmeyi yeniden üretir
ya da onarılmış ürünlerin üstüne eski reçeteyi yazabilir. Yayından sonra, onarımdan önce:
1. Uygulamayı kullanan HER cihazda / tarayıcıda: kullanıcı menüsünün altında **`v1.744.37 · 2026-11-26`** görünmeli
   (görünmüyorsa sayfayı kapatıp açın; uygulama açılışta yeni sürüme kendiliğinden geçer). Görülmeyen cihaz kapalı tutulur.
2. Onarım bitene kadar Tanımlar'da renk adı DEĞİŞTİRİLMEZ, ürün kartlarında reçete düzenlenmez.

İsteğe bağlı, daha güçlü (AYRI KARAR): sunucu sürüm kapısı `stk_ayar.min_istemci_surum = '1.744.37'` (guvenlik/10 düzeni) —
1.744.37'den eski her sekmenin ERP tablolarına yazmasını sunucuda reddeder (AT001). DİKKAT: kapı doluyken fiş kuralları da
etkin olur (`fis_kural_aktif = fis_aktif VEYA min_istemci_surum dolu`); 17 Kasım kaydına göre ikisi de kapalı. Bu yüzden kapı
ayrı bir karardır; önce salt okur `select fis_aktif, min_istemci_surum from public.stk_ayar;` ile bugünkü değer görülür.

## Taslak PR

**https://github.com/mtalay61-coder/atolye/pull/370** (TASLAK). Depo `mtalay61-coder/atolye`.
Düzeltme: önceki "403 Resource not accessible by integration" hatası izin eksikliği DEĞİLDİ — istek yanlış depo adına
(`NewDiamond`) gönderilmişti (benim hatam). Doğru depoda PR açıldı; GitHub izinlerinde değişiklik GEREKMİYOR. Aynı yanlış ad
Actions sorgusunda da kullanılmıştı; boş liste de bu yüzdendi (doğru depoda 21 gece koşusu görünüyor).
Taslak PR birleştirilmez; birleştirme = yayın kararı (yukarıda), ayrı onay.

## Geri dönüş

- `surum.json` yalnız İLERİ gider (açık uygulama eski numaraya geçmez). Geri dönüş = 1.744.36 kodu daha büyük numarayla:
  bu dalın `src/` değişiklikleri `git revert`, SURUM 1.744.38, `./yap.sh`, `surum.json` 1.744.38.
- SQL geri alma YOK (sunucu değişmedi). Veri: 1.744.37'nin yazdığı kayıtlar 1.744.36 biçimiyle aynı; geri dönüşte veri işi yok.
- Bedeli: geri dönülürse HATA GERİ GELİR — o sürede kombinasyonda kullanılan renklerin adı DEĞİŞTİRİLMEMELİ.

## Yayından önce / sonra kullanıcıya

- Yayına kadar: kombinasyonda kullanılan bir rengin adını (büyük/küçük harf dahil) değiştirmeyin; kaybolan renkleri elle eklemeyin.
- Yayından sonra da önceden çökmüş modeller kendiliğinden düzelmez → veri onarımı (ayrı onay).
