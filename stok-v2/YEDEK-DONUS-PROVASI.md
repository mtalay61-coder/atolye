# Yedekten dönüş provası — plan (4 Kasım)

Amaç: canlı veritabanı kaybolursa / bozulursa **gerçekten geri dönülebildiğini** kanıtlamak. Bugüne kadar yalnız **SQL geri
dönüş dosyaları** (geri-donus-*.sql, guvenlik/3-geri-al.sql) sınandı; bunlar şemayı / fonksiyonları geri alır, **veriyi geri
getirmez**. Veri yedeğinden geri yükleme hiç denenmedi (ACIK-ISLER madde 6).

**Kural: prova canlıya DOKUNMAZ.** Canlıda yalnız salt-okur sorgu (envanter) ve yedeğin alınması (okuma) olur. Geri yükleme her
zaman AYRI bir veritabanına yapılır. Döküm gerçek müşteri verisi içerir: nerede tutulacağı ve hangi ortama yükleneceği kullanıcı
kararıdır; döküm ve veritabanı parolası **depoya, sohbete, bu ortama girmez**.

## 1. Bugünkü yedek kapsamı (bilinen / bilinmeyen)

| Yedek | Ne içerir | Durum | Eksik / risk |
|---|---|---|---|
| Supabase otomatik yedeği (panel › Database › Backups) | Veritabanının tamamı (public, auth, storage şemalarının **satırları**) | **DOĞRULANMADI** — varlığı, sıklığı, saklama süresi, PITR olup olmadığı plana bağlı; kimse panelde bakmadı | Ücretsiz planda indirilebilir günlük yedek yok / kısıtlı; Pro'da günlük, 7 gün; PITR ek ücret. Geri yükleme **aynı projenin üstüne** yazar — prova için kullanılamaz (canlıyı ezer). |
| `pg_dump` (kullanıcı bilgisayarında) | Tam mantıksal döküm | **YOK** — VERI-TUTARLILIGI-F0 § 6 ve GECIS-1.744.4 § 1.1 istedi, kaydı yok | Tek bağımsız, indirilebilir kopya bu olurdu. |
| Uygulama otomatik yedeği (`093-yedekleme.jsx`) | Uygulamanın gördüğü veri, JSON | Her cihazda günde bir, **son 3 gün, yalnız o tarayıcıda** | Cihaz / tarayıcı verisi silinince gider; sunucu tarafını (fonksiyonlar, kullanıcılar, fiş defteri bağları, iz tabloları) içermez. |
| Uygulama "JSON Yedek İndir" (Tanımlar) | Aynı JSON, dosya olarak | Elle; düzenli alındığına dair kayıt yok | **Fiş defteri kuruluyken JSON'dan tam geri yükleme KAPALI** (F5) — yalnız okuma / karşılaştırma işine yarar. |
| Depodaki SQL (şema + fonksiyon kaynakları) | Şemayı sıfırdan kurmak | Var, yerelde sınanmış | Veri içermez. |

**Veritabanı yedeğinde OLMAYANLAR** (hangi yöntem seçilirse seçilsin ayrıca ele alınmalı):

1. **Storage dosyaları** (görseller vb.). Veritabanı yedeği yalnız `storage.objects` satırlarını (ad, boyut) taşır, dosyanın
   kendisini taşımaz. Canlıda `storage.objects` üzerinde `gorsel_yonetici_yazar` politikası var → en az bir kova kullanılıyor.
   Envanter (§ 3) kova başına dosya sayısı ve boyutu gösterir.
2. **Edge Function'lar ve gizli değerleri**: kod depoda (`supabase-*.ts`), ama `SMTP_SIFRE`, `GUN_SONU_ANAHTAR` ve proje
   anahtarları Supabase panelinde (Edge Functions › Secrets). Kaybolursa yeniden girilmesi gerekir; nerede saklandığı kullanıcıda.
3. **Proje ayarları**: Authentication ayarları (site adresi, yönlendirmeler, e-posta şablonları, parola kuralları), API ayarları,
   alan adı. Bunlar veritabanında değil.
4. **pg_cron işleri** (gün sonu raporu): `cron` şeması `pg_dump` ile gelir ama `pg_cron` / `pg_net` uzantısı hedefte kurulu
   değilse geri yükleme bu kısımda hata verir. Envanter zamanlanmış işleri listeler.

## 2. Ne zaman "tamam" sayılır (başarı ölçütü)

1. Döküm alındı; tarihi ve boyutu kayda geçti (dosyanın kendisi değil).
2. Döküm ayrı bir veritabanına **hatasız** (ya da yalnız açıklanmış, beklenen uyarılarla) geri yüklendi.
3. `guvenlik/8-yedek-envanter-salt-okur.sql` canlıda ve provada çalıştı; `karsilastir = true` olan bütün satırlar **aynı**
   (her tablonun satır sayısı, fonksiyon ve tetikleyici özeti, auth.users sayısı, uzantılar, cron işleri). Döküm ile canlı
   envanteri arasında yazma olduysa fark açıklanır (envanteri dökümden hemen önce / sonra alın).
4. `canli-salt-okur-kontrol.sql` (D1–D6) provada çalıştı; sonuç canlıdaki son sonuçla aynı.
5. `guvenlik/7-sonra-dogrula.sql` ve `guvenlik/2-sonra-dogrula.sql` provada canlıdaki gibi tamam (yetkiler ve kapı dökümle geldi).
6. Süre kaydı: dökümün ve geri yüklemenin kaç dakika sürdüğü (gerçek felakette ne kadar beklenir).

Storage ve gizli değerler 3–5'e girmez; ayrı satır olarak "kapsam dışı / şurada saklanıyor" diye kayda geçer.

## 3. Adımlar

**A — panel kontrolü (kullanıcı, canlıya yazmaz).** Supabase › Project Settings › Billing: plan. Database › Backups: yedek var mı,
en son tarih, kaç gün saklanıyor, PITR açık mı. Storage: kovalar ve kabaca boyut. Sonucu bildirin (ekran görüntüsü yeter).

**B — envanter (canlı, SALT-OKUR).** SQL Editor'da `stok-v2/guvenlik/8-yedek-envanter-salt-okur.sql` → CSV indir. Kişisel veri
döndürmez; sohbete yapıştırılabilir. Editor 100 satır gösterir; tablo sayısı fazlaysa CSV indirmek yeterli.

**C — döküm (kullanıcının bilgisayarı).** Bağlantı dizesi panelde: Connect › Session pooler (IPv4) veya Direct. Parola komut
satırına değil ortam değişkenine / sorulduğunda girilir:

```bash
# PostgreSQL istemcisi, sunucu sürümüyle aynı ya da daha yeni olmalı (envanterde "sunucu sürümü")
pg_dump "postgresql://postgres.<proje>@<host>:5432/postgres" \
  --format=custom --no-owner \
  --schema=public --schema=auth --schema=storage --schema=cron \
  --file=atolye-$(date +%F).dump
# Yalnız rol tanımları (parolasız) — Supabase rolleri hedefte zaten var, bu yalnız karşılaştırma için
pg_dumpall --roles-only --no-role-passwords -d "<aynı dize>" > roller-$(date +%F).sql
```

Kısa yol olarak Supabase CLI da olur (`supabase db dump`, `supabase db dump --data-only`); hangisi seçilirse seçilsin dosya
kullanıcının bilgisayarında kalır, şifreli bir yerde saklanır.

**D — geri yükleme hedefi (kullanıcı seçer).** İki seçenek; ikisi de canlıdan bağımsız:

| | Ayrı Supabase projesi (önerilen) | Kendi bilgisayarında PostgreSQL |
|---|---|---|
| Benzerlik | auth / storage / roller canlıyla aynı; uygulama bile denenebilir | anon / authenticated / service_role ve `auth` şeması elle kurulmalı (depodaki test düzeneği bunu yapıyor) |
| Maliyet | ücretsiz plan genelde yeter (veri küçük: envanterde "veritabanı boyutu") | yok |
| Risk | müşteri verisi ikinci bir bulut projesinde durur → prova biter bitmez proje silinir | veri yalnız o bilgisayarda |

```bash
# Hedef BOŞ olmalı. --clean KULLANMAYIN (yanlış dizeyle canlıya bağlanırsa siler); dizeyi iki kez kontrol edin.
pg_restore --no-owner -d "<PROVA dizesi>" atolye-YYYY-MM-DD.dump 2> geri-yukleme-hatalari.txt
```

Ayrı Supabase projesinde `auth` / `storage` şemaları zaten dolu kurulur; bu şemalarda "zaten var" uyarıları beklenir, satırlar
için `--data-only --schema=auth --schema=storage` ile ikinci geçiş gerekebilir. Hatalar dosyasını paylaşın (müşteri verisi
içermez; içeriyorsa ilgili satırları çıkarın), birlikte sınıflarız.

**E — doğrulama (PROVA veritabanında).** § 2'deki 3–5. Canlı envanteriyle satır satır karşılaştırma.

**F — temizlik.** Prova projesi / veritabanı silinir; döküm dosyası kullanıcının seçtiği yerde kalır ya da silinir. Kayda yalnız
tarih, süre, boyut ve sonuç geçer.

## 4. Sonrası (öneri, ayrı karar)

- Düzenli döküm: haftada bir (ya da büyük işlemden önce) `pg_dump`, son N kopya saklanır. Zamanlama kullanıcının bilgisayarında.
- Storage dosyalarının ayrı kopyası (panelden indirme ya da `supabase storage` komutları).
- Gizli değerlerin (SMTP, gün sonu anahtarı) parola yöneticisinde saklandığının teyidi.
- Planda indirilebilir günlük yedek / PITR yoksa: "felakette en fazla ne kadar veri kaybını kabul ederiz" kararı.
