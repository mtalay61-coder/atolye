# B3a — ERP TABLOLARINA DOĞRUDAN YAZMADA "LİSTEDE Mİ + YAZMA YETKİSİ VAR MI" (28 Kasım 2026; HAZIRLIK — canlıya UYGULANMADI)

> **Dal `claude/b3a-tablo-yazma-yetki`** (`main` `526167e` = yayındaki 1.744.37 üzerinden).
> - Yalnız sunucu: istemci değişmez.
> - B4 / B5'ten (`claude/b4-uretim-teslim-koruma`) BAĞIMSIZ: ayrı dosya, ayrı kurulum, ayrı geri alma, ayrı sınama.
> - Canlıya, deneme projesine, `main`'e, G-25'e dokunulmadı.

## Sorun (B3a; kanıt `test/inceleme/yetki-api.js`, canlı yetki / politika / tetikleyicileriyle hizalı taban `inc_tam`)

**Kaynağı:** ERP tablolarında politika `giris_yapmis_hersey` (authenticated için `USING true` / `WITH CHECK true`). Tablo yetkisi INSERT / UPDATE / DELETE.

**Kurulumdan önce ölçülen:**
- Listede olmayan hesap (zeki) ve listede olup yalnız görüntüleme yetkili hesap (okan):
  - ürün adını / sürümünü değiştirdi;
  - cari unvanını değiştirdi;
  - cari ekledi;
  - Tanımlar'da renk adını değiştirdi, bütün renkleri sildi, kod sayacını yazdı.
- Matris: 70 uyumlu · **17 AÇIK** · 3 farklı gerekçe.

## Düzeltme (`28-b3a-uygula.sql`, tek `do` bloğu)

`b3a_yazma_koru` deyim düzeyinde bir BEFORE tetikleyicisi; 14 tabloya bağlanır.

**Kural:** İstek `authenticated` rolündeyse aşağıdakilerden biri doğru olmalı; değilse 42501, hiçbir satır yazılmaz:
- `yetki_var_mi(<7 modül>, kaydetme)`;
- `yetki_var_mi(<7 modül>, duzenleme)`;
- `yetki_var_mi(<7 modül>, silme)`.

Yani hesap listede olmalı ve en az bir modülde görüntüleme dışında bir yetkisi bulunmalı.
- Yönetici her zaman geçer.
- Giriş sistemi kapalıysa herkes geçer (A6 kuralı aynen).
- Jetonsuz istek (SQL Editor, servis rolü) ve anon dokunulmadan geçer; anon'un zaten yazma yetkisi yok.

**Tablolar:** urunler, cariler, tanimlar, siparisler, siparis_kalemleri, uretim, uretim_atamalari, stok_rezervasyonlari, hesaplar, hesap_hareketleri, cekler, cek_gorselleri, onaylar, cop.

**Dışarıda bırakılanlar:**
- gunluk — salt okur kullanıcının uygulama günlüğü düşmesin;
- degisiklik;
- site / portal tabloları;
- surum;
- gun_sonu_gonderim.

**Neden politika değil, tetikleyici:**
- Mevcut politikalar ve yetkiler değişmez; geri alma yalnız tetikleyiciyi kaldırır.
- Sunucu işlemlerinin (`fis_kes` vb.) içinde aynı kural geçerli olur. Bu işlemler zaten `stk_yetki` ile "herhangi bir modülde" yetki istiyor; yeni ret doğmaz.

## Sonuç (`test/inceleme/b3a-sina.sh` 11/11; matris `yetki-api.js`)

| | Uyumlu | AÇIK | Farklı gerekçe |
|---|---|---|---|
| Kurulumdan önce | 70 | 17 | 3 |
| **Kurulumdan sonra** | **86** | **3** | 1 |
| Geri almadan sonra | kurulum öncesiyle BİREBİR aynı | | |

- Listede olmayan hesap ve salt okur hesap: bütün doğrudan yazmalarda 42501.
- Meşru modüller arası yazmalar açık kaldı: yalnız stok yetkili Ayşe hızlı cari ekleyebiliyor, kod sayacını yazabiliyor.
- Kurulum iki kez çalıştırılınca hata vermiyor.
- Bozma: son adımda hata → hiçbir nesne kalmadı.
- Editor gibi parça parça gönderimde de kuruluyor.

## Açık kalan — B3a-2 (ayrı karar)

Yalnız stok yetkili personel cari unvanını değiştirebiliyor; Tanımlar'da renkleri değiştirebiliyor ve silebiliyor (matriste kalan 3 AÇIK).

**Neden bu pakette kapatılmadı:** Uygulama bu tablolara başka modüllerden de meşru yazıyor:
- `hizliCariEkle` — sipariş / stok ekranları;
- Tanımlar'a kod sayaçları, rapor ve reçete şablonları, gün sonu ayarı (`saveTanimlar`'ın 10+ çağıranı).

Tablo düzeyinde modül şartı bunları durdurur. Gereken kural alan düzeyinde: hangi alanı hangi modül yazar, envanteriyle birlikte.

"Farklı gerekçe" satırı: Ayşe'nin sipariş iptali KR006 ile reddediliyor (iptal yalnız bağları çözen işlemden) — ret doğru, kod beklenen 42501 değil.
