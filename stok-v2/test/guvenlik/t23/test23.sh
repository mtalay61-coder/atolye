#!/bin/bash
# 23 — YÖNETİM PANELİ VERİSİ (platform_ tabloları). YALITILMIŞ veritabanı; canlıya dokunmaz.
# Kurulum: t19/kur.sql (Supabase taklidi: anon / authenticated / authenticator rolleri, auth.uid() = JWT "sub", auth.users,
# "public'te yeni tablo herkese açık doğar" varsayılanı) + ERP kullanıcı listesi (tanimlar: Yönetici + Personel).
# Ölçülen:
#   1) önkoşul HAZIR → uygula (sonuç tablosu hepsi tamam) → önkoşul UYGULANMIŞ; ikinci uygulama DURUR ve hiçbir şey değişmez.
#   2) Platform yöneticisi (PostgREST yolu: authenticator → authenticated + JWT): firma / sözleşme / ödeme ekler, okur, firmayı
#      değiştirir; olay günlüğü tetikleyicilerle dolar. SİLEMEZ; ödemeyi değiştiremez; günlüğe yazamaz; yönetici listesine erişemez.
#   3) ERP'nin "Yönetici" rolündeki ama platform yöneticisi OLMAYAN hesap, Personel ve anon: hiçbir satır görmez, yazamaz,
#      kendini platform yöneticisi yapamaz. Reddedilen her denemeden sonra tabloların tam içeriği DEĞİŞMEZ.
#   4) Kurallar: sözleşme başka firmanın ödemesine bağlanamaz; ödeme ile sözleşme para birimi aynı; eksi tutar yalnız düzeltme;
#      düzeltme aynı firma + para birimi; bitiş ≥ başlangıç; kod biçimi; geçersiz para birimi / durum.
#   5) (17 Kasım inceleme) ödemesi olan sözleşmenin para birimi değişmez; düzeltme aynı sözleşmede; önkoşul içeriği birebir
#      karşılaştırır (10 bozma denemesi → KARIŞIK, satır adıyla); para birimi değişikliği ile ödeme aynı anda → biri bekler, reddeder.
#   7) Eksik tablo senaryoları (17 Kasım): önkoşul hata vermeden KARIŞIK der, eksik tabloyu adıyla gösterir; geri alma yarım hâli
#      tamamlar (kayıt varsa yine durur).
#   6) Geri alma: kayıt varken DURUR (hiçbir şey silinmez); kayıtlar yokken her şeyi kaldırır → önkoşul HAZIR.
# Kullanım: ./test23.sh   (T23_HOST / T23_PORT; postgres + authenticator şifresiz bağlanabilmeli)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
H=${T23_HOST:-localhost}; PT=${T23_PORT:-5432}; DB=t23
PG="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
U_PLAT=00000000-0000-0000-0000-0000000000a1; U_ERPY=00000000-0000-0000-0000-0000000000b2; U_PER=00000000-0000-0000-0000-0000000000c3
PLAT="{\"role\":\"authenticated\",\"sub\":\"$U_PLAT\",\"email\":\"platform@firma.test\"}"
ERPY="{\"role\":\"authenticated\",\"sub\":\"$U_ERPY\",\"email\":\"yonetici@firma.test\"}"
PER="{\"role\":\"authenticated\",\"sub\":\"$U_PER\",\"email\":\"personel@firma.test\"}"
ANON='{"role":"anon"}'
# api <rol> <claims> <sql> → "ok:<çıktı>" | "ret:izin" | "ret:rls" | "ret:kural" | "hata:<ileti>"
api() {
  local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d $DB -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role $1" -c "select set_config('request.jwt.claims', '$2', true) is null" -c "$3" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | grep -v '^COMMIT$' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in
    "ERROR:  42501: permission denied"*) echo "ret:izin" ;;
    "ERROR:  42501: new row violates row-level security"*) echo "ret:rls" ;;
    "ERROR:  23514:"*|"ERROR:  23503:"*|"ERROR:  23505:"*|"ERROR:  22P02:"*) echo "ret:kural" ;;
    *) echo "hata:${hat#ERROR:  }" ;;
  esac
}
q() { $PG -d $DB -Atc "$1"; }
# editor <dosya>: Supabase SQL Editor gibi — editor-icin.py'nin böldüğü her ifade AYRI istek (ilk hatada durur). Çıktı: -At, '|' ayraçlı.
editor() { python3 $A/stok-v2/editor-icin.py --bol "$1" | python3 -c '
import subprocess, sys
for p in [x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]:
    r = subprocess.run(sys.argv[1:] + ["-c", p.decode()], capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(1)' psql -X -q -h $H -p $PT -U postgres -d ${HEDEF_DB:-$DB} -v ON_ERROR_STOP=1 -At -F '|'; }
durum() { q "select md5(coalesce(string_agg(x, '|' order by x), '-')) from (
  select 'y:'||t::text x from public.platform_yoneticileri t union all select 'f:'||t::text from public.platform_firmalar t
  union all select 's:'||t::text from public.platform_sozlesmeler t union all select 'o:'||t::text from public.platform_odemeler t
  union all select 'g:'||t::text from public.platform_olaylar t) z"; }
genel() { editor $G/23-onkosul-salt-okur.sql | grep '^99|' | cut -d'|' -f3; }

$PG -d postgres -c "drop database if exists $DB" -c "create database $DB" 2>/dev/null
$PG -d $DB -f $A/stok-v2/test/guvenlik/t19/kur.sql >/dev/null || { echo "kurulum başarısız (kur.sql)"; exit 2; }
$PG -d $DB -c "insert into auth.users (id, email) values ('$U_PLAT', 'platform@firma.test'), ('$U_ERPY', 'yonetici@firma.test'), ('$U_PER', 'personel@firma.test');
  insert into public.tanimlar values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(
    jsonb_build_object('kullaniciAdi', 'Platform', 'rol', 'Yönetici', 'eposta', 'platform@firma.test'),
    jsonb_build_object('kullaniciAdi', 'ERP Yönetici', 'rol', 'Yönetici', 'eposta', 'yonetici@firma.test'),
    jsonb_build_object('kullaniciAdi', 'Personel', 'rol', 'Personel', 'eposta', 'personel@firma.test'))));" >/dev/null
echo "== Kurulum: t19/kur.sql (Supabase taklidi, açık varsayılan yetkiler) · 23 dosyaları $(git -C $A rev-parse --short HEAD) + çalışma ağacı"

echo "== 0) Supabase SQL Editor uyumu (editor-icin.py: yalnız düz çift-dolar gövde; parça sayısı)"
for f in 23-platform-yonetim.sql:2 23-platform-yonetim-geri-al.sql:2 23-onkosul-salt-okur.sql:1; do
  sonuc "${f%%:*} Editor'de ${f##*:} ifadeye bölünür" "${f##*:}" "$(python3 $A/stok-v2/editor-icin.py --bol $G/${f%%:*} 2>/dev/null | python3 -c 'import sys; print(len([x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]))')"
done
echo "== 1) Önkoşul → uygula → önkoşul; ikinci uygulama (her dosya Editor gibi: ifade başına ayrı istek)"
sonuc "önkoşul (uygulamadan önce)" "HAZIR" "$(genel)"
cikti=$(editor $G/23-platform-yonetim.sql 2>&1)
sonuc "uygula: hata yok, sonuç tablosu 8 satır, hepsi tamam" "8/8 tamam" "$(echo "$cikti" | grep -c '|tamam$')/$(echo "$cikti" | grep -cE '^[0-9]+\|') tamam"
sonuc "önkoşul (uygulamadan sonra)" "UYGULANMIŞ" "$(genel)"
once=$(durum); ikinci=$(editor $G/23-platform-yonetim.sql 2>&1 | grep -m1 -o 'DUR: platform_ nesneleri zaten var')
sonuc "ikinci uygulama durur" "DUR: platform_ nesneleri zaten var" "$ikinci"
sonuc "ikinci uygulamadan sonra tablolar aynı" "$once" "$(durum)"
sonuc "Supabase varsayılanına rağmen anon platform_firmalar okuyamaz" "f" "$(q "select has_table_privilege('anon', 'public.platform_firmalar', 'select')")"

echo "== 2) Kendini platform yöneticisi yapma denemesi (henüz yönetici yok)"
for kim in ERPY PER; do
  sonuc "$kim: platform_yoneticileri'ne kendini ekler" "ret:izin" "$(api authenticated "${!kim}" "insert into public.platform_yoneticileri (kullanici) values (auth.uid())")"
  sonuc "$kim: platform_yoneticileri okur" "ret:izin" "$(api authenticated "${!kim}" "select count(*) from public.platform_yoneticileri")"
done
sonuc "anon: platform_yonetici_mi çağırır" "ret:izin" "$(api anon "$ANON" "select public.platform_yonetici_mi()")"
sonuc "anon: platform_yoneticileri'ne ekler" "ret:izin" "$(api anon "$ANON" "insert into public.platform_yoneticileri (kullanici) values ('$U_PER')")"
q "insert into public.platform_yoneticileri (kullanici, ad) select id, 'Platform yöneticisi' from auth.users where email = 'platform@firma.test'" >/dev/null
sonuc "SQL Editor yolu (postgres) ile platform yöneticisi eklendi" "1" "$(q "select count(*) from public.platform_yoneticileri")"
sonuc "platform_yonetici_mi — platform yöneticisi" "ok:t" "$(api authenticated "$PLAT" "select public.platform_yonetici_mi()")"
sonuc "platform_yonetici_mi — ERP Yönetici rolü (platform yöneticisi değil)" "ok:f" "$(api authenticated "$ERPY" "select public.platform_yonetici_mi()")"
sonuc "platform_yonetici_mi — Personel" "ok:f" "$(api authenticated "$PER" "select public.platform_yonetici_mi()")"
sonuc "platform_yonetici_mi — JWT'siz authenticated" "ok:f" "$(api authenticated '{"role":"authenticated"}' "select public.platform_yonetici_mi()")"
sonuc "platform yöneticisi bile yönetici listesini okuyamaz (yalnız SQL Editor)" "ret:izin" "$(api authenticated "$PLAT" "select count(*) from public.platform_yoneticileri")"

echo "== 3) Platform yöneticisi: ekler, okur, değiştirir; silemez"
sonuc "firma ekle (deneme, firmanın hesabı)" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_firmalar (kod, unvan, supabase_adres, il, kullanici_sayisi, ek) values ('ozderi', 'Öz Deri Ltd.', 'https://abcdefgh12.supabase.co', 'İstanbul', 5, '{\"sektor_notu\":\"deri\"}')")"
sonuc "ikinci firma ekle" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_firmalar (kod, unvan) values ('baska-firma', 'Başka Firma')")"
F1=$(q "select id from public.platform_firmalar where kod = 'ozderi'"); F2=$(q "select id from public.platform_firmalar where kod = 'baska-firma'")
sonuc "sözleşme ekle (TRY)" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F1', '2026-12-01', '2027-11-30', 24000, 'TRY')")"
sonuc "sözleşme ekle (USD, ikinci firma)" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F2', '2026-12-01', '2027-11-30', 600, 'USD')")"
S1=$(q "select id from public.platform_sozlesmeler where firma_id = '$F1'"); S2=$(q "select id from public.platform_sozlesmeler where firma_id = '$F2'")
sonuc "ödeme ekle (sözleşmeye bağlı, TRY)" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi, yontem) values ('$F1', '$S1', '2026-12-05', 12000, 'TRY', 'havale')")"
O1=$(q "select id from public.platform_odemeler where firma_id = '$F1'")
sonuc "ödeme düzeltmesi (eksi, düzelttiği ödemeyi gösterir)" "ok:" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi, duzeltilen_odeme, notlar) values ('$F1', '$S1', '2026-12-06', -2000, 'TRY', '$O1', 'fazla girilmiş')")"
sonuc "firma durumunu değiştir (deneme → aktif, barındırma → bizim_org)" "ok:" "$(api authenticated "$PLAT" "update public.platform_firmalar set durum = 'aktif', barindirma = 'bizim_org' where id = '$F1'")"
sonuc "platform yöneticisi okur: firma sayısı / ödenen net TRY" "ok:2 10000.00" "$(api authenticated "$PLAT" "select (select count(*) from public.platform_firmalar) || ' ' || (select sum(tutar) from public.platform_odemeler where para_birimi = 'TRY')")"
sonuc "olay günlüğü tetikleyicilerle doldu (firma 2 + sözleşme 2 + ödeme 2 + değişiklik 1)" "ok:7" "$(api authenticated "$PLAT" "select count(*) from public.platform_olaylar")"
sonuc "durum değişikliği olayı" "ok:durum: deneme → aktif; barındırma: firma_hesabi → bizim_org" "$(api authenticated "$PLAT" "select aciklama from public.platform_olaylar where tur = 'firma değişti'")"
sonuc "olayda 'kim' = platform yöneticisi" "ok:$U_PLAT" "$(api authenticated "$PLAT" "select distinct kim from public.platform_olaylar")"
for t in platform_firmalar platform_sozlesmeler platform_odemeler platform_olaylar; do
  sonuc "SİLEMEZ: $t" "ret:izin" "$(api authenticated "$PLAT" "delete from public.$t")"
done
sonuc "ödemeyi DEĞİŞTİREMEZ" "ret:izin" "$(api authenticated "$PLAT" "update public.platform_odemeler set tutar = 1")"
sonuc "günlüğe YAZAMAZ" "ret:izin" "$(api authenticated "$PLAT" "insert into public.platform_olaylar (firma_id, tur) values ('$F1', 'sahte')")"
sonuc "günlüğü DEĞİŞTİREMEZ" "ret:izin" "$(api authenticated "$PLAT" "update public.platform_olaylar set aciklama = 'x'")"
sonuc "tetikleyici fonksiyonunu doğrudan çağıramaz" "ret:izin" "$(api authenticated "$PLAT" "select public.platform_olay_yaz()")"

echo "== 4) Kurallar (platform yöneticisi bile)"
sonuc "ödeme başka firmanın sözleşmesine bağlanamaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi) values ('$F1', '$S2', '2026-12-05', 10, 'USD')")"
sonuc "ödeme para birimi sözleşmeninkiyle aynı olmalı" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi) values ('$F1', '$S1', '2026-12-05', 10, 'USD')")"
sonuc "eksi tutar düzeltme olmadan olmaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, tarih, tutar, para_birimi) values ('$F1', '2026-12-05', -10, 'TRY')")"
sonuc "sıfır tutar olmaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, tarih, tutar, para_birimi) values ('$F1', '2026-12-05', 0, 'TRY')")"
sonuc "düzeltme başka firmanın ödemesini gösteremez" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, tarih, tutar, para_birimi, duzeltilen_odeme) values ('$F2', '2026-12-05', -10, 'TRY', '$O1')")"
sonuc "geçersiz para birimi (EUR)" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F1', '2027-01-01', '2027-12-31', 1, 'EUR')")"
sonuc "bitiş başlangıçtan önce olamaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F1', '2027-01-01', '2026-12-31', 1, 'TRY')")"
sonuc "kod biçimi (büyük harf / boşluk)" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_firmalar (kod, unvan) values ('Öz Deri', 'x')")"
sonuc "aynı kod ikinci kez" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_firmalar (kod, unvan) values ('ozderi', 'x')")"
sonuc "geçersiz durum" "ret:kural" "$(api authenticated "$PLAT" "update public.platform_firmalar set durum = 'silindi' where id = '$F2'")"
sonuc "proje adresi yalnız https://<ref>.supabase.co" "ret:kural" "$(api authenticated "$PLAT" "update public.platform_firmalar set supabase_adres = 'https://kotu.example.com' where id = '$F2'")"
S3=$(q "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F1', '2027-12-01', '2028-11-30', 30000, 'TRY') returning id" | head -1)
sonuc "BULGU 1: ödemesi olan sözleşmenin para birimi değiştirilemez (TRY → USD)" "ret:kural" "$(api authenticated "$PLAT" "update public.platform_sozlesmeler set para_birimi = 'USD' where id = '$S1'")"
sonuc "BULGU 1: ödemesi olan sözleşmenin ücreti / tarihi / durumu değişebilir" "ok:" "$(api authenticated "$PLAT" "update public.platform_sozlesmeler set yillik_ucret = 25000, durum = 'gecerli' where id = '$S1'")"
sonuc "BULGU 1: ödemesi OLMAYAN sözleşmenin para birimi değişebilir (ve geri)" "ok:" "$(api authenticated "$PLAT" "update public.platform_sozlesmeler set para_birimi = 'USD' where id = '$S3'; update public.platform_sozlesmeler set para_birimi = 'TRY' where id = '$S3'")"
sonuc "BULGU 2: düzeltme, aynı firmanın BAŞKA sözleşmesine bağlanamaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi, duzeltilen_odeme) values ('$F1', '$S3', '2026-12-07', -100, 'TRY', '$O1')")"
sonuc "BULGU 2: sözleşmeli ödemenin düzeltmesi sözleşmesiz olamaz" "ret:kural" "$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, tarih, tutar, para_birimi, duzeltilen_odeme) values ('$F1', '2026-12-07', -100, 'TRY', '$O1')")"
sonuc "sözleşme ödemesi varken başka firmaya taşınamaz" "ret:kural" "$(api authenticated "$PLAT" "update public.platform_sozlesmeler set firma_id = '$F2' where id = '$S1'")"

echo "== 5) Platform yöneticisi OLMAYANLAR: hiçbir şey görmez, yazamaz; tablolar değişmez"
once=$(durum)
for kim in ERPY PER; do
  for t in platform_firmalar platform_sozlesmeler platform_odemeler platform_olaylar; do
    sonuc "$kim okur: $t" "ok:0" "$(api authenticated "${!kim}" "select count(*) from public.$t")"
  done
  sonuc "$kim firma ekler" "ret:rls" "$(api authenticated "${!kim}" "insert into public.platform_firmalar (kod, unvan) values ('sizma', 'Sızma')")"
  sonuc "$kim ödeme ekler" "ret:rls" "$(api authenticated "${!kim}" "insert into public.platform_odemeler (firma_id, tarih, tutar, para_birimi) values ('$F1', '2026-12-05', 1, 'TRY')")"
  sonuc "$kim firma değiştirir (0 satır)" "ok:0" "$(api authenticated "${!kim}" "with u as (update public.platform_firmalar set unvan = 'x' returning 1) select count(*) from u")"
  sonuc "$kim sözleşme değiştirir (0 satır)" "ok:0" "$(api authenticated "${!kim}" "with u as (update public.platform_sozlesmeler set yillik_ucret = 0 returning 1) select count(*) from u")"
  sonuc "$kim siler" "ret:izin" "$(api authenticated "${!kim}" "delete from public.platform_firmalar")"
done
for t in platform_firmalar platform_sozlesmeler platform_odemeler platform_olaylar platform_yoneticileri; do
  sonuc "anon okur: $t" "ret:izin" "$(api anon "$ANON" "select count(*) from public.$t")"
done
sonuc "anon firma ekler" "ret:izin" "$(api anon "$ANON" "insert into public.platform_firmalar (kod, unvan) values ('anon', 'Anon')")"
sonuc "reddedilen denemelerden sonra beş tablonun tam içeriği aynı" "$once" "$(durum)"

echo "== 6) Önkoşul 'UYGULANMIŞ' demeden önce içeriği birebir karşılaştırır (bozma → KARIŞIK, satır adıyla; geri al → UYGULANMIŞ)"
boz() { # $1 ad · $2 bozan SQL · $3 onaran SQL · $4 beklenen satır (sıra|içerik)
  q "$2" >/dev/null 2>&1; local c; c=$(editor $G/23-onkosul-salt-okur.sql)
  sonuc "$1 → GENEL" "KARIŞIK" "$(echo "$c" | grep '^99|' | cut -d'|' -f3)"
  sonuc "$1 → farkın adı" "$4" "$(echo "$c" | grep "^${4%%|*}|" | cut -d'|' -f1,3)"
  q "$3" >/dev/null 2>&1; sonuc "$1 → onarınca" "UYGULANMIŞ" "$(genel)"; }
boz "okuma kuralı herkese açık (using true)" "alter policy platform_firmalar_oku on public.platform_firmalar using (true)" \
    "alter policy platform_firmalar_oku on public.platform_firmalar using (public.platform_yonetici_mi())" "4|platform_firmalar.platform_firmalar_oku"
boz "okuma kuralı anon'a da" "alter policy platform_odemeler_oku on public.platform_odemeler to authenticated, anon" \
    "alter policy platform_odemeler_oku on public.platform_odemeler to authenticated" "4|platform_odemeler.platform_odemeler_oku"
boz "ödemeye UPDATE (tablo)" "grant update on public.platform_odemeler to authenticated" \
    "revoke update on public.platform_odemeler from authenticated" "5|platform_odemeler → authenticated"
boz "ödemeye UPDATE (yalnız bir sütun)" "grant update (notlar) on public.platform_odemeler to authenticated" \
    "revoke update (notlar) on public.platform_odemeler from authenticated" "5|platform_odemeler → authenticated"
boz "firmaya DELETE PUBLIC'ten" "grant delete on public.platform_firmalar to public" \
    "revoke delete on public.platform_firmalar from public" "5|platform_firmalar → anon, platform_firmalar → authenticated"
boz "günlüğe TRUNCATE" "grant truncate on public.platform_olaylar to authenticated" \
    "revoke truncate on public.platform_olaylar from authenticated" "5|platform_olaylar → authenticated"
boz "kapı fonksiyonu herkese true" "create or replace function public.platform_yonetici_mi() returns boolean language sql stable security definer set search_path = public, pg_catalog as 'select true'" \
    "create or replace function public.platform_yonetici_mi() returns boolean language sql stable security definer set search_path = public, pg_catalog as ' select auth.uid() is not null and exists (select 1 from public.platform_yoneticileri y where y.kullanici = auth.uid()) '" "6|platform_yonetici_mi()"
boz "kapı fonksiyonu anon'a açık" "grant execute on function public.platform_yonetici_mi() to anon" \
    "revoke execute on function public.platform_yonetici_mi() from anon" "6|platform_yonetici_mi()"
boz "ödeme denetimi kapalı" "alter table public.platform_odemeler disable trigger platform_odeme_denetle" \
    "alter table public.platform_odemeler enable trigger platform_odeme_denetle" "7|platform_odemeler.platform_odeme_denetle"
boz "RLS kapalı" "alter table public.platform_sozlesmeler disable row level security" \
    "alter table public.platform_sozlesmeler enable row level security" "8|platform_sozlesmeler"

echo "== 7) Eşzamanlılık: sözleşmenin para birimi değişikliği ile ödeme girişi aynı anda (iki ayrı oturum, PostgREST yolu)"
# oturum <claims> <sql>: işlem açar, sql'i çalıştırır, 3 sn tutar, kapatır → ok / ret:kural / hata
oturum() { local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d $DB -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
  -c "begin" -c "set local role authenticated" -c "select set_config('request.jwt.claims', '$1', true) is null" -c "$2" -c "select pg_sleep(3)" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo ok; elif echo "$out" | grep -q '^ERROR:  23514:'; then echo ret:kural; else echo "hata:$(echo "$out" | grep -m1 '^ERROR:')"; fi; }
SE=$(q "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F2', '2028-01-01', '2028-12-31', 100, 'TRY') returning id" | head -1)
# a) ödeme önce: ödeme işlemi açıkken para birimi değişikliği gelir → beklemeli, ödeme görünce reddetmeli
oturum "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi) values ('$F2', '$SE', '2028-01-05', 10, 'TRY')" > $DB.a1 & P1=$!
sleep 1; t0=$(date +%s.%N)
a2=$(api authenticated "$PLAT" "update public.platform_sozlesmeler set para_birimi = 'USD' where id = '$SE'"); t1=$(date +%s.%N); wait $P1
sonuc "a) ödeme (önce başladı)" "ok" "$(cat $DB.a1)"
sonuc "a) para birimi değişikliği ödemenin bitmesini BEKLEDİ" "evet" "$(python3 -c "print('evet' if $t1 - $t0 > 1.5 else 'hayır')")"
sonuc "a) sonra ödemeyi görüp REDDETTİ" "ret:kural" "$a2"
sonuc "a) son hâl: sözleşme ve ödeme aynı para biriminde" "TRY TRY" "$(q "select (select para_birimi from public.platform_sozlesmeler where id = '$SE') || ' ' || (select string_agg(distinct para_birimi, ',') from public.platform_odemeler where sozlesme_id = '$SE')")"
# b) para birimi değişikliği önce: değişiklik açıkken eski para birimiyle ödeme gelir → beklemeli, yeni para birimini görüp reddetmeli
SE2=$(q "insert into public.platform_sozlesmeler (firma_id, baslangic, bitis, yillik_ucret, para_birimi) values ('$F2', '2029-01-01', '2029-12-31', 100, 'TRY') returning id" | head -1)
oturum "$PLAT" "update public.platform_sozlesmeler set para_birimi = 'USD' where id = '$SE2'" > $DB.b1 & P1=$!
sleep 1; t0=$(date +%s.%N)
b2=$(api authenticated "$PLAT" "insert into public.platform_odemeler (firma_id, sozlesme_id, tarih, tutar, para_birimi) values ('$F2', '$SE2', '2029-01-05', 10, 'TRY')"); t1=$(date +%s.%N); wait $P1
sonuc "b) para birimi değişikliği (önce başladı)" "ok" "$(cat $DB.b1)"
sonuc "b) ödeme değişikliğin bitmesini BEKLEDİ" "evet" "$(python3 -c "print('evet' if $t1 - $t0 > 1.5 else 'hayır')")"
sonuc "b) sonra yeni para birimini (USD) görüp TRY ödemeyi REDDETTİ" "ret:kural" "$b2"
sonuc "b) son hâl: sözleşme USD, ödeme yok" "USD 0" "$(q "select (select para_birimi from public.platform_sozlesmeler where id = '$SE2') || ' ' || (select count(*) from public.platform_odemeler where sozlesme_id = '$SE2')")"
rm -f $DB.a1 $DB.b1

echo "== 8) Geri alma"
once=$(durum)
geri=$(editor $G/23-platform-yonetim-geri-al.sql 2>&1 | grep -m1 -oE 'DUR: platform tablolarında [0-9]+ kayıt var')
sonuc "kayıt varken geri alma durur" "DUR: platform tablolarında 10 kayıt var" "$geri"
sonuc "durduktan sonra hiçbir şey silinmedi" "$once" "$(durum)"
sonuc "önkoşul hâlâ UYGULANMIŞ" "UYGULANMIŞ" "$(genel)"
q "truncate public.platform_olaylar, public.platform_odemeler, public.platform_sozlesmeler, public.platform_firmalar" >/dev/null
sonuc "kayıtlar yokken geri alma" "tamam — platform_ nesnesi kalmadı" "$(editor $G/23-platform-yonetim-geri-al.sql 2>&1 | tail -1)"
sonuc "önkoşul (geri almadan sonra)" "HAZIR" "$(genel)"
sonuc "yeniden uygulama (geri alınmış hâlden)" "8/8 tamam" "$(editor $G/23-platform-yonetim.sql 2>&1 | grep -c '|tamam$')/8 tamam"

echo "== 9) Eksik tablo senaryoları (yarım kalmış / elle bozulmuş kurulum): önkoşul HATA vermez, KARIŞIK der; geri alma tamamlar"
# Her senaryo temiz uygulanmış hâlin (bu noktada kayıtsız) KOPYASINDA: tablo(lar) düşürülür → önkoşul → geri alma → önkoşul.
eksik() { # $1 ad · $2 düşürülecek tablolar (boşlukla)
  $PG -d postgres -c "drop database if exists ${DB}e" -c "create database ${DB}e template $DB" >/dev/null 2>&1
  for t in $2; do $PG -d ${DB}e -c "drop table public.$t cascade" >/dev/null 2>&1; done
  local c; c=$(HEDEF_DB=${DB}e editor $G/23-onkosul-salt-okur.sql 2>&1)
  sonuc "$1: önkoşul hata vermez" "0" "$(echo "$c" | grep -c 'ERROR')"
  sonuc "$1: GENEL" "KARIŞIK" "$(echo "$c" | grep '^99|' | cut -d'|' -f3)"
  sonuc "$1: eksik tablo yetki farkında adıyla görünür" "evet" "$(for t in $2; do echo "$c" | grep '^5|' | grep -q "$t" || echo hayır; done | grep -q hayır && echo hayır || echo evet)"
  sonuc "$1: geri alma tamamlar" "tamam — platform_ nesnesi kalmadı" "$(HEDEF_DB=${DB}e editor $G/23-platform-yonetim-geri-al.sql 2>&1 | tail -1)"
  sonuc "$1: sonra önkoşul" "HAZIR" "$(HEDEF_DB=${DB}e editor $G/23-onkosul-salt-okur.sql | grep '^99|' | cut -d'|' -f3)"
  $PG -d postgres -c "drop database ${DB}e" >/dev/null 2>&1; }
eksik "yalnız sözleşmeler yok" "platform_sozlesmeler"
eksik "yalnız ödemeler yok" "platform_odemeler"
eksik "yalnız firmalar yok (bağlı tablolar kalır)" "platform_firmalar"
eksik "yalnız günlük yok" "platform_olaylar"
eksik "yalnız yöneticiler yok" "platform_yoneticileri"
eksik "sözleşmeler + ödemeler yok" "platform_sozlesmeler platform_odemeler"
eksik "yöneticiler dışında hepsi yok" "platform_firmalar platform_sozlesmeler platform_odemeler platform_olaylar"
# kayıtlı tablolarla yarım hâl: geri alma kayıt varken yine DURUR (eksik tablo bunu atlatmaz)
$PG -d postgres -c "drop database if exists ${DB}e" -c "create database ${DB}e template $DB" >/dev/null 2>&1
$PG -d ${DB}e -c "insert into public.platform_firmalar (kod, unvan) values ('kalan', 'Kalan'); drop table public.platform_sozlesmeler cascade" >/dev/null 2>&1
sonuc "yarım hâlde kayıt varken geri alma durur" "DUR: platform tablolarında 1 kayıt var" "$(HEDEF_DB=${DB}e editor $G/23-platform-yonetim-geri-al.sql 2>&1 | grep -m1 -oE 'DUR: platform tablolarında [0-9]+ kayıt var')"
sonuc "yarım hâlde önkoşul kayıt satırı" "10|1 / yok / 0" "$(HEDEF_DB=${DB}e editor $G/23-onkosul-salt-okur.sql | grep '^10|' | cut -d'|' -f1,3)"
$PG -d postgres -c "drop database ${DB}e" >/dev/null 2>&1

$PG -d postgres -c "drop database $DB" >/dev/null
echo "── test23: $GECTI geçti, $KALDI kaldı ──"; [ $KALDI = 0 ]
