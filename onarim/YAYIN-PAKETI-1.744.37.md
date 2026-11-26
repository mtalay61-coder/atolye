# Yayın paketi — v1.744.37 (renk adı değişince kombinasyon renkleri çökmesin)

Durum: **HAZIR, YAYINLANMADI.** Birleştirme, `surum.json` ve yayın ayrı kullanıcı onayı bekliyor. Veri onarımı bu paketin
DIŞINDA (ayrı onay; `renk-cokmesi-envanteri-salt-okur.sql` sonucu bekleniyor).

## Kesin içerik

| | |
|---|---|
| Dal | `claude/renk-ad-kombinasyon` |
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

Not: 1. adım `surum.json`'suz yapılırsa yayındaki sürüm DEĞİŞMEZ (başlatıcı 1.744.36'ya yönlendirmeye devam eder);
yayını başlatan 2. adımdır.

## Geri dönüş

- `surum.json` yalnız İLERİ gider (açık uygulama eski numaraya geçmez). Geri dönüş = 1.744.36 kodu daha büyük numarayla:
  bu dalın `src/` değişiklikleri `git revert`, SURUM 1.744.38, `./yap.sh`, `surum.json` 1.744.38.
- SQL geri alma YOK (sunucu değişmedi). Veri: 1.744.37'nin yazdığı kayıtlar 1.744.36 biçimiyle aynı; geri dönüşte veri işi yok.
- Bedeli: geri dönülürse HATA GERİ GELİR — o sürede kombinasyonda kullanılan renklerin adı DEĞİŞTİRİLMEMELİ.

## Yayından önce / sonra kullanıcıya

- Yayına kadar: kombinasyonda kullanılan bir rengin adını (büyük/küçük harf dahil) değiştirmeyin; kaybolan renkleri elle eklemeyin.
- Yayından sonra da önceden çökmüş modeller kendiliğinden düzelmez → veri onarımı (ayrı onay).
