#!/bin/bash
# A6 DÜZELTMESİ — YEREL KABUL TESTİ (18 Kasım 2026). Yalnız yerel PostgreSQL; canlıya / deneme projesine bağlanmaz.
# Kaynak: atolye_guvenlik (hazirla.sh; canlı benzeri) kopyası + iki giriş hesabı (deneme = Yönetici, personel = yetkisiz).
# Ölçülen (sırayla, aynı veritabanında):
#   1) Öncesi: önkoşul HAZIR; yetki-sinama.sql → A6 AÇIK (test açığı GÖRÜYOR), BAŞARISIZ 0.
#   2) Düzeltme (24-a6-tanim-kimligi.sql, SQL Editor gibi): önkoşul UYGULANMIŞ; yetki-sinama → AÇIK 0, BAŞARISIZ 0.
#   3) Satır eksik / bozuk (jetonsuz bakımla oluşturulur): personel ve YÖNETİCİ yetki_var_mi = false; jetonsuz = true;
#      girisAktifMi açıkça false → personel true (tasarım korunur).
#   4) İlk yönetici kurulumu: tablo boşken listede olmayan hesap ilk satırı ekler; ikinci satırı personel ekleyemez.
#   5) Geri alma: önkoşul HAZIR; yetki-sinama → A6 YENİDEN AÇIK (geri almanın açığı açtığı belgelenir).
#   1b) Atomiklik: ikinci fonksiyon bilerek bozulunca HİÇBİR kısmi değişiklik kalmaz (eski atomik olmayan sürüm yarım kalıyordu).
#   7) stok-v2/editor/15-duzeltme.sql'in (rls-rol.sql kopyası) yeniden çalıştırılması düzeltmeyi bozmaz (eski hâli bozardı).
#   6) Yeniden düzeltme iki kez (tekrar çalıştırılabilir) → UYGULANMIŞ; güncellenen kaynaklar (rls-rol.sql, rls-yazma.sql)
#      çalıştırılınca da UYGULANMIŞ kalır (eski dosyalar açığı geri getirmez).
# Kullanım: ./test-a6.sh   (postgres yerel; su postgres ile)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
DB=a6_test; KAYNAK=${GUVENLIK_DB:-atolye_guvenlik}
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
q() { su postgres -c "psql -X -qAt -v ON_ERROR_STOP=1 -d $DB" ; }
# editor <dosya>: SQL Editor gibi — editor-icin.py parçaları, her biri ayrı oturum
editor() { python3 -I $A/stok-v2/editor-icin.py --bol "$1" | python3 -c '
import sys, subprocess
for p in [x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]:
    r = subprocess.run(["su", "postgres", "-c", "psql -X -qAt -F \"|\" -v ON_ERROR_STOP=1 -d '$DB'"], input=p, capture_output=True)
    sys.stdout.write(r.stdout.decode()); sys.stderr.write(r.stderr.decode())
    if r.returncode: sys.exit(1)'; }
genel() { editor $G/24-a6-onkosul-salt-okur.sql 2>/dev/null | awk -F'|' '$1=="99"{print $3}'; }
# Sınama TEK oturumda (SQL Editor betiğin tamamını tek istekte gönderir; geçici tablo oturuma bağlı).
sinama() { su postgres -c "psql -X -qAt -F '|' -d $DB" < $T/yetki-sinama.sql 2>/dev/null; }
ozet() { sinama | awk -F'|' '$1=="ZZ"{print $3}'; }
satir() { sinama | awk -F'|' -v s="$1" '$1==s{print $6}'; }
# rol <eposta> <sql>: PostgREST gibi authenticated + JWT iddiası; tek değer döner ya da "ret:<kod>"
rol() { local id; id=$(echo "select coalesce((select id::text from auth.users where email = '$1'), '00000000-0000-4000-8000-000000000099')" | q)
  printf "%s\n" "begin;" "set local role authenticated;" "select set_config('request.jwt.claims', json_build_object('sub','$id','email','$1','role','authenticated')::text, true) \\g /dev/null" \
    "select set_config('request.headers', '{\"x-atolye-surum\":\"1.744.25\"}', true) \\g /dev/null" "\\set VERBOSITY verbose" "$2;" "rollback;" \
  | su postgres -c "psql -X -qAt -d $DB" 2>&1 | sed -n 's/^ERROR:  \([0-9A-Z]*\):.*/ret:\1/p; /^ERROR/!p' | grep -v '^$' | head -1; }

su postgres -c "psql -X -q -c 'drop database if exists $DB' -c 'create database $DB template $KAYNAK'" >/dev/null 2>&1 || { echo "kurulum başarısız ($KAYNAK yok — hazirla.sh)"; exit 2; }
cat <<'EOF' | q >/dev/null
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
delete from auth.users where email in ('deneme@atolye.local', 'personel@atolye.local');
insert into auth.users (email) values ('deneme@atolye.local'), ('personel@atolye.local');
insert into public.tanimlar (id, veri) values ('tekil', '{}') on conflict (id) do nothing;
update public.tanimlar set veri = jsonb_build_object('girisAktifMi', true, 'renkler', '["Siyah"]'::jsonb, 'kullanicilar', jsonb_build_array(
  jsonb_build_object('id','kullanici-ilk','ad','Deneme Yönetici','kullaniciAdi','deneme','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','deneme@atolye.local'),
  jsonb_build_object('id','kullanici-personel','ad','Deneme Personel','kullaniciAdi','personel','rol','Personel','yetkiler','{}'::jsonb,'eposta','personel@atolye.local')))
  where id = 'tekil';
delete from public.tanimlar where id <> 'tekil';
insert into public.urunler (id, ad) values ('a6-urun', 'A6 Bot') on conflict do nothing;
insert into public.cariler (id, unvan) values ('a6-cari', 'A6 Müşteri') on conflict do nothing;
insert into public.kas_hesap (id, tur, veri) values ('A6K', 'kasa', '{"ad":"A6 Kasa"}') on conflict do nothing;
insert into public.gunluk (id) values ('a6-g') on conflict do nothing;
EOF
# Deneme projesine denk olsun: 23 (platform tabloları) ve v2 kurulum betiği — bu dalda yok, v2 dalından (A6_V2_REF).
V2=${A6_V2_REF:-origin/claude/yeni-firma-kurulum-v2}
for f in stok-v2/guvenlik/23-platform-yonetim.sql kurulum-betigi.sql; do
  git -C $A show "$V2:$f" > $T/.v2.sql 2>/dev/null || { echo "kurulum başarısız ($V2:$f okunamadı — git fetch origin claude/yeni-firma-kurulum-v2)"; exit 2; }
  editor $T/.v2.sql >/dev/null 2>$T/.hata || { echo "kurulum başarısız ($f): $(grep -m1 ERROR $T/.hata)"; exit 2; }
done; rm -f $T/.v2.sql
# DÜZELTME ÖNCESİ HÂL (20 Kasım'dan sonra): A6 main'e girdi (#364) ve kaynaklar (rls-rol.sql, 15-duzeltme.sql) düzeltilmiş
# gövdeleri taşıyor → hazirla.sh'ın kurduğu $KAYNAK artık UYGULANMIŞ doğar. Testin "öncesi" adımı canlının 20 Kasım'dan ÖNCEKİ
# hâlini ölçer; o hâl geri alma dosyasıyla birebir kurulur (eski gövdelerin md5'i canlı arşiviyle aynı —
# 24-a6-canli-yedek-2026-11-18.sql). Kaynak zaten eskiyse (main'in eski bir kopyası) geri alma zararsızdır.
editor $G/24-a6-tanim-kimligi-geri-al.sql >/dev/null 2>$T/.hata || { echo "kurulum başarısız (öncesi hâl): $(grep -m1 ERROR $T/.hata)"; exit 2; }
echo "== a6_test: $KAYNAK kopyası · $(git -C $A rev-parse --short HEAD) + çalışma ağacı"

echo "== 1) Düzeltme öncesi"
sonuc "önkoşul" "HAZIR" "$(genel)"
sonuc "A6 (kimlik değiştirme) — test açığı görüyor" "AÇIK" "$(satir A6)"
sonuc "A6b (ardından yetki_var_mi)" "AÇIK" "$(satir A6b)"
sonuc "sınamada BAŞARISIZ yok (yalnız A6/A6b/Y7 AÇIK)" "AÇIK: 3 · BAŞARISIZ: 0" "$(ozet | sed 's/ · BİLİNEN.*//')"

echo "== 1b) Atomiklik: ikinci fonksiyon bilerek bozulur (Editor gibi ayrı oturumlar)"
# Bozma: yalnız yetki_var_mi'nin gövdesinde geçen 'end loop;' → 'end lop;' (birinci fonksiyonda 'loop' yok) → derleme hatası.
sed '0,/end loop;/s//end lop;/' $G/24-a6-tanim-kimligi.sql > $T/.bozuk.sql
sonuc "bozulan dosya gerçekten yalnız ikinci fonksiyonda farklı" "1" "$(diff $G/24-a6-tanim-kimligi.sql $T/.bozuk.sql | grep -c '^>')"
editor $T/.bozuk.sql >/dev/null 2>$T/.hata; sonuc "bozuk düzeltme hata verdi" "1" "$(grep -c ERROR $T/.hata | tr -d ' ' | sed 's/^[1-9][0-9]*$/1/')"
sonuc "kısmi değişiklik yok: iki fonksiyon da eski (önkoşul)" "HAZIR" "$(genel)"
sonuc "kısmi değişiklik yok: koruma fonksiyonu" "eski" "$(editor $G/24-a6-onkosul-salt-okur.sql 2>/dev/null | awk -F'|' '$1=="1"{print $3}')"
# Karşılaştırma: ESKİ (atomik olmayan, begin; f1; f2; commit) sürüm aynı bozulmada yarım kalıyordu — risk gerçekti.
git -C $A show 1bbc910:stok-v2/guvenlik/24-a6-tanim-kimligi.sql 2>/dev/null | sed '0,/end loop;/s//end lop;/' > $T/.eski-bozuk.sql
if [ -s $T/.eski-bozuk.sql ]; then
  editor $T/.eski-bozuk.sql >/dev/null 2>&1
  sonuc "eski (atomik olmayan) sürüm aynı bozulmada YARIM kalıyordu" "KARIŞIK" "$(genel)"
  editor $G/24-a6-tanim-kimligi-geri-al.sql >/dev/null 2>&1
  sonuc "geri alma (atomik) yarım durumu toparladı" "HAZIR" "$(genel)"
fi
rm -f $T/.bozuk.sql $T/.eski-bozuk.sql

echo "== 2) Düzeltme (Editor gibi)"
editor $G/24-a6-tanim-kimligi.sql >/dev/null 2>$T/.hata; sonuc "düzeltme hatasız" "" "$(grep -m1 ERROR $T/.hata)"
sonuc "önkoşul" "UYGULANMIŞ" "$(genel)"
sonuc "A6" "UYGUN" "$(satir A6)"
sonuc "A6b" "UYGUN" "$(satir A6b)"
sonuc "Y7 yönetici kimlik değiştiremez" "UYGUN" "$(satir Y7)"
sonuc "yönetici işlemleri (Y1–Y6) geçer" "UYGUN UYGUN UYGUN UYGUN UYGUN UYGUN" "$(for s in Y1 Y2 Y3 Y4 Y5 Y6; do satir $s; done | tr '\n' ' ' | sed 's/ $//')"
sonuc "sınama özeti" "AÇIK: 0 · BAŞARISIZ: 0" "$(ozet | sed 's/ · BİLİNEN.*//')"

echo "== 3) Satır eksik / bozuk → jetonlu hesaba yetki yok"
yv="select public.yetki_var_mi(array['muhasebe'], 'kaydetme')"
echo "update public.tanimlar set id = 'bakim-tasidi' where id = 'tekil'" | q    # jetonsuz bakım (SQL Editor) — serbest
sonuc "satır yok: personel" "f" "$(rol personel@atolye.local "$yv")"
sonuc "satır yok: yönetici" "f" "$(rol deneme@atolye.local "$yv")"
sonuc "satır yok: listede olmayan" "f" "$(rol yok@atolye.local "$yv")"
sonuc "satır yok: jetonsuz (servis / Editor)" "t" "$(echo "$yv" | q)"
echo "update public.tanimlar set id = 'tekil' where id = 'bakim-tasidi'" | q
for b in "veri || '{\"girisAktifMi\": \"evet\"}'::jsonb#girisAktifMi metin" "veri - 'girisAktifMi'#girisAktifMi yok" "jsonb_set(veri, '{kullanicilar}', '{}'::jsonb)#kullanicilar nesne"; do
  ifade=${b%%#*}; ad=${b##*#}   # ayraç '#': SQL'deki '||' bölünmesin
  echo "update public.tanimlar set veri = $ifade where id = 'tekil'" | q
  sonuc "bozuk ($ad): personel" "f" "$(rol personel@atolye.local "$yv")"
  sonuc "bozuk ($ad): yönetici" "f" "$(rol deneme@atolye.local "$yv")"
  su postgres -c "psql -X -qAt -d $DB" <<'EOF' >/dev/null
update public.tanimlar set veri = jsonb_build_object('girisAktifMi', true, 'renkler', '["Siyah"]'::jsonb, 'kullanicilar', jsonb_build_array(
  jsonb_build_object('id','kullanici-ilk','ad','Deneme Yönetici','kullaniciAdi','deneme','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','deneme@atolye.local'),
  jsonb_build_object('id','kullanici-personel','ad','Deneme Personel','kullaniciAdi','personel','rol','Personel','yetkiler','{}'::jsonb,'eposta','personel@atolye.local')))
  where id = 'tekil';
EOF
done
echo "update public.tanimlar set veri = veri || '{\"girisAktifMi\": false}'::jsonb where id = 'tekil'" | q
sonuc "girisAktifMi AÇIKÇA false (tasarım): personel" "t" "$(rol personel@atolye.local "$yv")"
echo "update public.tanimlar set veri = veri || '{\"girisAktifMi\": true}'::jsonb where id = 'tekil'" | q
sonuc "geri true: personel" "f" "$(rol personel@atolye.local "$yv")"

echo "== 4) İlk yönetici kurulumu (tablo boşken)"
ilk="insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(jsonb_build_object('id','k1','ad','Ilk','kullaniciAdi','ilk','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','ilk@atolye.local')))) returning 'eklendi'"
# tabloyu gerçekten boşaltıp (jetonsuz) dene, sonra geri koy
echo "create table a6_yedek as select * from public.tanimlar; alter table public.tanimlar disable trigger user; delete from public.tanimlar; alter table public.tanimlar enable trigger user;" | q
sonuc "boş tabloya ilk yönetici satırı (listede olmayan hesap)" "eklendi" "$(rol ilk@atolye.local "$ilk")"
sonuc "boş tabloda personel de ilk satırı ekleyebilir (kurulum kuralı)" "eklendi" "$(rol personel@atolye.local "$ilk")"
echo "insert into public.tanimlar (id, veri) values ('tekil', '{\"girisAktifMi\": true, \"kullanicilar\": []}')" | q
sonuc "dolu tabloya ikinci satırı personel ekleyemez" "ret:42501" "$(rol personel@atolye.local "insert into public.tanimlar (id, veri) values ('ikinci', '{}') returning 'eklendi'")"
echo "alter table public.tanimlar disable trigger user; delete from public.tanimlar; insert into public.tanimlar select * from a6_yedek; alter table public.tanimlar enable trigger user; drop table a6_yedek;" | q

echo "== 5) Geri alma (A6 YENİDEN AÇILIR)"
editor $G/24-a6-tanim-kimligi-geri-al.sql >/dev/null 2>$T/.hata; sonuc "geri alma hatasız" "" "$(grep -m1 ERROR $T/.hata)"
sonuc "önkoşul" "HAZIR" "$(genel)"
sonuc "A6 yeniden AÇIK (geri almanın bedeli)" "AÇIK" "$(satir A6)"

echo "== 6) Yeniden düzeltme (iki kez) ve güncellenen kaynaklar"
editor $G/24-a6-tanim-kimligi.sql >/dev/null 2>&1; editor $G/24-a6-tanim-kimligi.sql >/dev/null 2>$T/.hata
sonuc "iki kez uygulama hatasız" "" "$(grep -m1 ERROR $T/.hata)"
sonuc "önkoşul" "UYGULANMIŞ" "$(genel)"
editor $G/24-a6-tanim-kimligi-geri-al.sql >/dev/null 2>&1
q < $A/rls-rol.sql >/dev/null 2>$T/.hata; sonuc "rls-rol.sql (güncel) hatasız" "" "$(grep -m1 ERROR $T/.hata)"
q < $A/rls-yazma.sql >/dev/null 2>$T/.hata; sonuc "rls-yazma.sql (güncel) hatasız" "" "$(grep -m1 ERROR $T/.hata)"
sonuc "kaynaklardan kurulunca önkoşul" "UYGULANMIŞ" "$(genel)"
sonuc "kaynaklardan kurulunca A6" "UYGUN" "$(satir A6)"

echo "== 7) stok-v2/editor/15-duzeltme.sql yeniden çalıştırılırsa"
# 15-duzeltme.sql rls-rol.sql'in kopyasını taşır; yalnız o kopyadaki tanimlar_kullanici_koruma kurulur (dosyanın geri kalanı v2 kurulumu ister).
awk '/^create or replace function public.tanimlar_kullanici_koruma\(/,/^end \$\$;/' $A/stok-v2/editor/15-duzeltme.sql > $T/.k15.sql
q < $T/.k15.sql >/dev/null 2>$T/.hata; sonuc "15-duzeltme kopyası hatasız" "" "$(grep -m1 ERROR $T/.hata)"
sonuc "15-duzeltme (güncel) yeniden çalışınca önkoşul" "UYGULANMIŞ" "$(genel)"
git -C $A show ${A6_ESKI_MAIN:-b4594bc}:stok-v2/editor/15-duzeltme.sql 2>/dev/null | awk '/^create or replace function public.tanimlar_kullanici_koruma\(/,/^end \$\$;/' > $T/.k15eski.sql
if [ -s $T/.k15eski.sql ]; then
  q < $T/.k15eski.sql >/dev/null 2>&1
  sonuc "ESKİ 15-duzeltme (A6 öncesi main, b4594bc) yeniden çalışsaydı koruma eskiye dönerdi" "KARIŞIK" "$(genel)"
  q < $T/.k15.sql >/dev/null 2>&1
  sonuc "güncel kopya yeniden kurulunca" "UYGULANMIŞ" "$(genel)"
fi
rm -f $T/.k15.sql $T/.k15eski.sql
sonuc "son sınama özeti" "AÇIK: 0 · BAŞARISIZ: 0" "$(ozet | sed 's/ · BİLİNEN.*//')"
rm -f $T/.hata
echo "── test-a6: $GECTI geçti, $KALDI kaldı ──"
[ $KALDI -eq 0 ]
