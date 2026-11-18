# A6 düzeltmesi — deneme projesinde sınama adımları (18 Kasım 2026)

> **YALNIZ deneme projesi (atolye-deneme).** Canlıya uygulanmaz; main'e birleştirilmez; `surum.json` / yayın yok.
> Dal: `claude/a6-tanim-kimligi-koruma` (main'den; #362 / #363'e bağlı değil).

## A6 nedir

- **Açık:** Yetkisi olmayan personel (ya da giriş hesabı olup listede olmayan biri) tanımlar satırının kimliğini
  (`tekil`) değiştirebiliyordu.
- **Sonucu:**
  - Satır bulunamayınca `yetki_var_mi` herkese "evet" dedi. Tek istekle bütün modül yetkileri açılıyordu: kasa, fiş, stok.
  - `yonetici_mi` herkese "hayır" dedi; gerçek yönetici de yönetici sayılmaz hâle geliyordu.
- **Kanıt:** 18 Kasım deneme projesinde gerçekleşti (`../t24` sonuçları; bu dalda değil).

## Düzeltme (`stok-v2/guvenlik/24-a6-tanim-kimligi.sql`)

1. **`tanimlar_kullanici_koruma`:** Oturumlu her istekte, Yönetici dahil, satırın kimliği değiştirilemez (42501).
   - Uygulama tanımlar kimliğini hiç değiştirmez. Gerekirse bakım oturumsuz yapılır (SQL Editor).
2. **`yetki_var_mi`:** Tanımlar satırı yoksa ya da bozuksa oturumlu hesaba yetki VERMEZ.
   - Bozuk sayılan: `veri` nesne değil; `kullanicilar` dizi değil; `girisAktifMi` yok ya da boolean değil.
   - "Giriş sistemi kapalı, herkes yetkili" yalnız `girisAktifMi` açıkça `false` ise. Bu alanı yalnız Yönetici değiştirebilir.
   - Oturumsuz çağrı (servis rolü, SQL Editor) eskisi gibi serbest.
3. **Korunanlar:**
   - İlk yönetici kurulumu: tablo boşken ilk satır serbest.
   - Yöneticinin normal işlemleri: tanım ve kullanıcı değiştirme, uygulamanın upsert'i.
4. **Kaynaklar:** `rls-rol.sql` ve `rls-yazma.sql` aynı gövdelerle güncellendi. Eski dosyalar yeniden çalıştırılırsa açık geri gelmez.

**Geri alma** (`24-a6-tanim-kimligi-geri-al.sql`) **A6 AÇIĞINI YENİDEN AÇAR.** Yalnız düzeltme uygulamayı bozarsa, onayla
ve geçici olarak kullanılır. Yerelde ölçüldü: geri almadan sonra A6 yeniden AÇIK (`sonuc-test-a6.txt`, bölüm 5).

## Yerel sonuçlar

- **`test-a6.sh`: 36/36** (`sonuc-test-a6.txt`). Sırayla ölçülenler:
  1. düzeltme öncesi açık görülüyor;
  2. düzeltme sonrası kapalı, yönetici işlemleri geçiyor;
  3. satır eksik / bozuksa yetki yok;
  4. ilk yönetici kurulumu çalışıyor;
  5. geri alma açığı yeniden açıyor;
  6. tekrar uygulanabilir; güncel kaynaklar düzeltmeyi koruyor.
- **`api-sinama.js` yerel prova** (PostgREST taklidi): açıkken 200 ve `yetki_var_mi` true; düzeltilince 403 / 42501
  (`sonuc-api-prova-yerel.txt`).
- **Sınama betiği düzeltmesi** (`yetki-sinama.sql`):
  - Her denemenin beklenen hata kodu var. Başka hata `BAŞARISIZ`; eskiden her hata başarılı ret sayılıyordu.
  - Yönetici işlemleri de ölçülüyor.
  - Sonda özet satırı var.

## Deneme projesinde adımlar (sırayla; her adımın sonucunu paylaşın)

1. **Hazırlık:**
   - Authentication › Users › Add user: `listedeyok@atolye.local`, Auto Confirm. Tanımlar listesine EKLENMEZ.
   - Kayıt kapalı kalır.
2. **Önce (açık hâl):**
   - a) `24-a6-onkosul-salt-okur.sql` → GENEL **HAZIR**.
   - b) `yetki-sinama.sql` → A6, A6b, Y7 **AÇIK**; **BAŞARISIZ 0**.
   - c) Deneme sunucusunun sayfasında konsol → `api-sinama.js`. İki hesabın şifresini pencereye siz yazarsınız.
     Beklenen: 3. adım **AÇIK — 200**, 4. adım **true**, 8. adım **tekil** (betik kimliği geri alır).
3. **Düzeltme:** `24-a6-tanim-kimligi.sql` (SQL Editor, tek Run) → `24-a6-onkosul-salt-okur.sql` → **UYGULANMIŞ**.
4. **Sonra:**
   - a) `yetki-sinama.sql` → **AÇIK 0 · BAŞARISIZ 0**.
   - b) `api-sinama.js` → 3. adım **KAPALI — 403**, 8. adım **tekil**.
   - c) Uygulama (deneme sunucusu):
     - deneme (Yönetici) ile giriş → Tanımlar'da bir renk ekle → kaydedilir;
     - F5 → şifre istenmez;
     - stok girişi → fiş kesilir.
   - d) personel ile giriş → uygulama açılır (yetkisiz modüller kapalı).
5. **Geri alma deneme projesinde UYGULANMAZ.** Etkisi yerelde ölçüldü; açığı yeniden açar.
