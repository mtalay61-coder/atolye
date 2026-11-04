# Yedekten dönüş provası — plan (4 Kasım; öncelikli iş)

Amaç: canlı veritabanı kaybolursa / bozulursa **gerçekten geri dönülebildiğini** kanıtlamak. Bugüne kadar yalnız **SQL geri
dönüş dosyaları** (geri-donus-*.sql, guvenlik/3-geri-al.sql) sınandı; bunlar şemayı / fonksiyonları geri alır, **veriyi geri
getirmez**. Veri yedeğinden geri yükleme hiç denenmedi (ACIK-ISLER madde 6).

**Kurallar.** Prova canlıya DOKUNMAZ: canlıda yalnız okuma (envanter, döküm) olur; geri yükleme her zaman AYRI, BOŞ bir
veritabanına yapılır. Parola, gizli değer (SMTP, gün sonu anahtarı, service_role) ve döküm dosyası **depoya, sohbete, bulut
oturumuna girmez**. Sohbete yalnız `ozet.txt` / envanter / karşılaştırma çıktısı yapıştırılır (sayı, boyut, özet — kişisel veri yok).

Sıra: **1 panel kontrolü → 2 envanter → 3 bağımsız döküm → 4 ayrı ortamda geri yükleme → 5 doğrulama → 6 temizlik.**

## 1. Panel yedeği ve PITR — kontrol adımları (kullanıcı; hiçbir şey değiştirmez)

Menü adları Supabase sürümüne göre değişebilir; bulunamayan adımı "bulamadım" diye bildirin. Hiçbir düğmeye ("Restore",
"Enable PITR", "Upgrade") basmayın — panelden geri yükleme **canlı projenin üstüne** yazar.

| # | Nerede | Neye bakılır | Bildirilecek |
|---|---|---|---|
| 1.1 | Organization › **Billing** (ya da Project Settings › Billing) | Plan adı (Free / Pro / Team / Enterprise), varsa **PITR** ve **Compute** eklentileri | plan + eklentiler |
| 1.2 | Proje › **Database › Backups** (sekmeler: *Scheduled backups*, *Point in time*, *Restore to new project*) | Liste dolu mu; **en son yedeğin tarihi / saati**; kaç gün geriye gidiyor; her satırda **Download** var mı | son yedek tarihi, kaç adet, indirilebilir mi |
| 1.3 | Aynı sayfa › **Point in time** | "Enabled" mı, saklama süresi (7 / 14 / 28 gün), en eski geri dönülebilir an | açık/kapalı + süre |
| 1.4 | Aynı sayfa › **Restore to new project** (varsa) | Seçenek görünüyor mu (yalnız bakın, BAŞLATMAYIN) | var / yok |
| 1.5 | Proje › **Storage** | Kova adları, her kovada kabaca dosya sayısı / boyut | kova listesi |
| 1.6 | Proje › **Edge Functions › Secrets** | Yalnız **adlar** (SMTP_SIFRE, GUN_SONU_ANAHTAR …) — değerleri KOPYALAMAYIN | ad listesi + "değerler parola yöneticisinde mi?" evet/hayır |

**Yorum (genel bilgi; panelde gördüğünüz esas alınır):** Ücretsiz planda indirilebilir / geri yüklenebilir proje yedeği yoktur
ya da çok kısıtlıdır. Ücretli planlarda günlük yedek tutulur (saklama süresi plana göre); PITR ayrı ücretli eklentidir ve
açıldığında günlük yedeklerin yerini alır. Hiçbir panel yedeği **Storage dosyalarını** içermez (yalnız `storage.objects`
satırları). Bu yüzden plan ne olursa olsun § 3'teki bağımsız döküm gerekir. (Bu bulut oturumundan supabase.com belgelerine
erişilemedi; ayrıntılar orada teyit edilmeli: "Database Backups" ve "Backup and Restore using the CLI" sayfaları.)

## 2. Envanter (canlı, SALT-OKUR)

SQL Editor'da `stok-v2/guvenlik/8-yedek-envanter-salt-okur.sql` → CSV indir. Kişisel veri döndürmez (tablo satır sayıları,
fonksiyon/tetikleyici md5, auth.users sayısı, kova başına dosya sayısı ve bayt, cron işleri, uzantılar). `dokum-al.sh` aynı
sorguyu dökümden hemen önce kendisi de alır; Editor'daki kopya panel kontrolüyle birlikte bildirmek içindir.

## 3. Bağımsız döküm (kullanıcının bilgisayarı) — `stok-v2/yedek/dokum-al.sh`

Gerekenler: PostgreSQL istemcisi (`pg_dump`, `psql`; sürümü sunucu sürümünden eski olmamalı — envanterde "sunucu sürümü"),
bash, python3. Bağlantı bilgisi panelde **Connect › Session pooler** (host ve `postgres.<proje>` kullanıcı adı). Parolayı betik
sorar; komut satırına, dosyaya, sohbete yazılmaz.

```bash
KAYNAK_HOST=<pooler host> KAYNAK_KULLANICI=postgres.<proje> \
  ./stok-v2/yedek/dokum-al.sh ~/AtolyeYedek/2026-11-05      # klasör DEPO DIŞINDA ve boş olmalı
```

Betik: salt-okur oturumda envanter → `public.dump` (şema + satır + fonksiyon + yetki) → `auth-storage.sql` (yalnız auth ve
storage satırları) → `ozet.txt` (tarih, süreler, boyut, sha256 başı). Dosyalar 600, klasör 700. Depo içindeki klasörü, dolu
klasörü, eski `pg_dump`'ı reddeder. **cron işlerini bilerek dökmez** (provada çalışırsa canlı gün sonu fonksiyonunu
çağırabilir); envanterde listelenir. Sohbete yalnız `ozet.txt`.

Klasör şifreli bir yerde saklanır (şifreli disk / parola korumalı arşiv). Nerede tutulacağı kullanıcı kararı.

## 4. Ayrı ortamda geri yükleme — `stok-v2/yedek/prova-geri-yukle.sh`

Hedef (kullanıcı seçer, ikisi de canlıdan bağımsız):

| | Yeni, boş Supabase projesi (önerilen) | Kendi bilgisayarında PostgreSQL |
|---|---|---|
| Benzerlik | auth / storage / roller canlıyla aynı; istenirse uygulama bile bağlanıp denenebilir | anon / authenticated / service_role ve auth / storage şemaları önce kurulmalı |
| Risk | müşteri verisi ikinci bir bulut projesinde durur → prova biter bitmez proje silinir | veri yalnız o bilgisayarda |

```bash
PROVA_HOST=<PROVA projesinin pooler host'u> PROVA_KULLANICI=postgres.<PROVA proje> \
  ./stok-v2/yedek/prova-geri-yukle.sh ~/AtolyeYedek/2026-11-05
```

Korumalar: hedefte canlı proje kimliği geçiyorsa durur; hedefin public şemasında tablo varsa durur (`--clean` yok, üstüne
yazmaz); "PROVA" yazılmadan başlamaz. Hataları dosyaya toplar (durmaz), sonda prova üzerinde envanteri alıp
`envanter-karsilastir.sh` ile kaynakla karşılaştırır, `prova-<zaman>/ozet.txt` yazar.

Beklenen ve açıklanabilir farklar: yeni projede `uzantılar` satırı (projede fazladan açık uzantılar); `cron` satırları (bilerek
taşınmadı). Bunların dışındaki her fark (satır sayısı, fonksiyon/tetikleyici md5, auth.users) provanın BAŞARISIZ olduğu yerdir.

## 5. Ne zaman "tamam" sayılır

1. Panel kontrolü (§ 1) bildirildi: plan, son yedek tarihi, PITR durumu, kovalar, gizli değer adları.
2. Döküm alındı; `ozet.txt` (tarih, süre, boyut) kayda geçti.
3. Prova geri yüklemesi bitti; `hatalar-*.txt` boş ya da her satırı açıklanmış.
4. `envanter-karsilastir.sh`: AYNI (ya da yalnız § 4'teki açıklanmış farklar).
5. PROVA veritabanında `canli-salt-okur-kontrol.sql` (D1–D6) canlıdaki son sonuçla aynı; `guvenlik/2-sonra-dogrula.sql`
   8/8 ve `guvenlik/7-sonra-dogrula.sql` 6/6 (yetkiler ve kapı dökümle geldi).
6. Süreler kayda geçti (felakette ne kadar beklenir).

Kapsam dışı, ayrı satır olarak kayda geçer: Storage dosyaları, Edge Function gizli değerleri, Authentication / proje ayarları,
cron işleri (envanterden elle yeniden kurulur).

## 6. Temizlik ve sonrası

Prova projesi / veritabanı silinir; döküm kullanıcının seçtiği yerde kalır ya da silinir. Kayda yalnız tarih, süre, boyut, sonuç
geçer. Öneriler (ayrı karar): haftalık `dokum-al.sh` (ya da büyük işlemden önce), son N kopya; Storage dosyalarının ayrı kopyası;
gizli değerlerin parola yöneticisinde olduğunun teyidi; planda indirilebilir yedek / PITR yoksa "en fazla ne kadar veri kaybı
kabul edilir" kararı.
