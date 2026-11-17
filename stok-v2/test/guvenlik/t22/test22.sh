#!/bin/bash
# 22 — SİTE KAYIT ONAYI TEK İŞLEM + ESKİ ERP ENGELİ. YALITILMIŞ PostgreSQL; canlıya dokunmaz.
#
# Kurulum: 19 sonrası canlı durumu (ad02222'deki site-portal.sql + rls-rol + rls-kimlik, t19/temel.sh) + t19/veri.sql + cariler'in
# uygulamanın yazdığı sütunları (cari-sutunlari.sql) → 22-site-onay-atomik.sql uygulanır. Ölçülen:
#   0) Üretim: 22 dosyaları site-portal.sql'den yeniden üretilince aynı; Editor denetimi temiz; önkoşul HAZIR → UYGULANMIŞ; ikinci
#      uygulama reddedilir; site-portal.sql ile kurulan veritabanında gövdeler 22 ile aynı.
#   1) Aynı talebe FARKLI cari kimlikleriyle eşzamanlı onay → bir cari, bir hesap (iki oturum kilitte bekleşir; 6 oturum aynı anda).
#   2) Onay–ret yarışı, iki sırayla; yeni cari ile mevcut cariye bağlama yarışı → tek tutarlı sonuç.
#   3) Cevabı kaybolan istek: aynı kimlikle tekrar 'zaten', hiçbir tablo değişmez. İşlem bitmeden kopan bağlantı: hiçbir şey
#      yazılmaz; ikinci Yönetici onaylar → tek cari; ilk cihazın tekrarı "işlenmiş".
#   4) Eski ERP: 1.744.21 (ad02222) ve 7c6ec2e paketlerinin YAKALANMIŞ cari isteği PostgREST gibi oynatılır → KR013, satır yok;
#      ardından eski onay "Cari bulunamadı", tablolar değişmez. Talep başka cihazda onaylanmış / reddedilmiş olsa da aynı. Not ve
#      siteOdemeSor alanları silinse, ünvan / telefon biçimi değişse, sürüm başlığı sahte olsa da aynı. İlgisiz cari, var olan
#      kimliğin upsert'i, JWT'siz ve service_role yazması geçer. İstemci istisnayı taklit edemez: talep tablosuna yazamaz.
#   4b) GECİKMİŞ eski yazma (bekleyen defterden günler sonra): talep 2 gün önce onaylanmış / reddedilmiş ya da 4 gündür bekliyor ya da
#      22'den önce işlenmiş — eski cihazın 3 gün önce üretilmiş kimlikle bugün gelen yazması KR013; bugün üretilmiş kimlik serbest.
#   5) Sunucunun açtığı cari = eski ERP'nin aynı talep için yazdığı satır (kimlik, kod, sürüm hariç); vergi no kuralı = uygulamanınki.
#   6) Kapı: Yönetici olmayan → YETKI_YOK, tablolar değişmez; anon çalıştıramaz.
#   7) Geri alma: 19 hâline döner; açılmış cari ve hesaplar kalır; yeniden uygulanabilir. Editor taklidiyle uygula / geri al.
# Kullanım: ./test22.sh  (T19_HOST / T19_PORT; postgres + authenticator şifresiz bağlanabilmeli)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); T19=$T/../t19; G=$A/stok-v2/guvenlik
H=${T19_HOST:-localhost}; PT=${T19_PORT:-5432}; export T19_HOST=$H T19_PORT=$PT; DB=t22; Y=$(mktemp -d)
PG="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
YON='{"role":"authenticated","email":"yonetici@firma.test"}'
YON2='{"role":"authenticated","email":"yonetici2@firma.test"}'
PER='{"role":"authenticated","email":"personel@firma.test"}'
SRV='{"role":"service_role"}'
# Çıktı sınıflaması (t19 / t21 ile aynı): ok:<çıktı> | ret:kapı | ret:izin-fonksiyon | ret:izin-tablo | hata:<SQLSTATE: ileti>
sinifla() {
  local out="$1" kod="$2"
  if [ "$kod" -eq 0 ]; then echo "ok:$(echo "$out" | grep -v '^$' | sed -n '2,$p' | grep -v '^\(t\|f\)$' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in
    "ERROR:  42501: YETKI_YOK: "*)                  echo "ret:kapı" ;;
    "ERROR:  42501: permission denied for function"*) echo "ret:izin-fonksiyon" ;;
    "ERROR:  42501: permission denied for table"*)    echo "ret:izin-tablo" ;;
    *) echo "hata:${hat#ERROR:  }" ;;
  esac
}
# api <db> <rol> <claims> <sql> [başlıklar-json]  — PostgREST'in yaptığı gibi: authenticator → rol, JWT talepleri, istek başlıkları.
api() {
  local bas="${5:-{\}}" out kod
  out=$(psql -X -q -h $H -p $PT -U authenticator -d $1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role $2" -c "select set_config('request.jwt.claims', '$3', true) is null" \
    -c "select set_config('request.headers', '$bas', true) is null" -c "$4" -c "commit" 2>&1); kod=$?
  sinifla "$out" $kod
}
# arka <db> <claims> <sql> <uyku sn> <çıktı dosyası>  — işlemi açık tutarak (pg_sleep) çalıştırır; bitiş anını da yazar.
arka() {
  local out kod bas=$(date +%s%N)
  out=$(psql -X -q -h $H -p $PT -U authenticator -d $1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role authenticated" -c "select set_config('request.jwt.claims', '$2', true) is null" \
    -c "$3" -c "select pg_sleep($4)" -c "commit" 2>&1); kod=$?
  { sinifla "$out" $kod | sed 's/ *$//'; echo $(( ($(date +%s%N) - bas) / 1000000 )); } > $5
}
q() { $PG -d $1 -Atc "$2"; }
durum() { q $1 "select md5(string_agg(x, '|' order by x)) from (
  select 'h:'||t::text x from public.site_hesaplari t union all select 'o:'||t::text from public.site_oturumlari t
  union all select 'k:'||(to_jsonb(t) - 'islenme')::text from public.site_kayit_talepleri t union all select 'c:'||t::text from public.cariler t) z"; }
talep() {   # talep <db> <id> <ünvan> <telefon> <kullanıcı>
  $PG -d $1 -c "insert into public.site_kayit_talepleri (id, bilgiler, kullanici, sifre_ozeti) values ('$2', jsonb_build_object('unvan', '$3', 'telefon', '$4'), '$5', extensions.crypt('S-sifre-1', extensions.gen_salt('bf', 4)))" >/dev/null
}
sayi() { q $1 "select (select count(*) from public.cariler where unvan = '$2') || '/' || (select count(*) from public.site_hesaplari where kullanici = '$3')"; }
git -C $A show ad02222:site-portal.sql > $Y/site-19.sql
kur() {   # 19 sonrası canlı + test verisi + ikinci Yönetici + eski ERP'nin talebi
  $T19/temel.sh $1 "" $Y/site-19.sql >/dev/null 2>&1 || { echo "kurulum başarısız: $1"; exit 2; }
  $PG -d $1 -f $T19/veri.sql >/dev/null && PGOPTIONS='-c client_min_messages=warning' $PG -d $1 -f $T/cari-sutunlari.sql >/dev/null || { echo "veri başarısız: $1"; exit 2; }
  # Değişiklik sayacı (canlıda kurulu; 22 önkoşulu ister): yalnız var olan tablolara tetikleyici kurar.
  PGOPTIONS='-c client_min_messages=warning' $PG -d $1 -f $A/degisiklik-sayaci.sql >/dev/null || { echo "sayaç başarısız: $1"; exit 2; }
  $PG -d $1 -c "update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || '[{\"kullaniciAdi\":\"İkinci Yönetici\",\"rol\":\"Yönetici\",\"eposta\":\"yonetici2@firma.test\"}]'::jsonb) where id = 'tekil'" \
    -c "insert into auth.users (email) values ('yonetici2@firma.test')" >/dev/null
  python3 - "$T/eski-ad02222.json" > $Y/eski-talep.sql <<'PY'
import json, sys
t = json.load(open(sys.argv[1], encoding="utf-8"))["talep"]
b = json.dumps(t["bilgiler"], ensure_ascii=False).replace("'", "''")
print(f"insert into public.site_kayit_talepleri (id, bilgiler, kullanici, sifre_ozeti) values ('{t['id']}', '{b}'::jsonb, '{t['kullanici']}', extensions.crypt('E-sifre-1', extensions.gen_salt('bf', 4)));")
PY
  $PG -d $1 -f $Y/eski-talep.sql >/dev/null
  # 22'den ÖNCE işlenmiş talep (islenme sütunu henüz yok): 4b ölçer
  $PG -d $1 -c "insert into public.site_kayit_talepleri (id, bilgiler, kullanici, durum) values ('onceki-red', '{\"unvan\":\"Önceden Reddedilen Ltd\",\"telefon\":\"05327770004\"}', 'onceki.red', 'reddedildi')" >/dev/null
}
uygula22() { $PG -d $1 -f $G/22-site-onay-atomik.sql >/dev/null 2>$Y/uygula.err; }
onkosul() { $PG -d $1 -At -F'|' -f $G/22-onkosul-salt-okur.sql | grep '>>> GENEL' | cut -d'|' -f3; }
onk() { $PG -d $1 -At -F'|' -f $G/22-onkosul-salt-okur.sql | awk -F'|' -v s=$2 '$1 == s { print $3 "|" $4 }'; }   # önkoşul satırı: sonuç|durum
nesne22() { q $1 "select (select count(*) from pg_proc where proname in ('site_kayit_onayla_yeni_cari', 'site_cari_ekleme_koru', 'site_eslesme_anahtari', 'site_vergi_no_kaydedilecek', 'site_kimlik_zamani')) || '/' || (select count(*) from pg_trigger where tgname = 'site_cari_ekleme_koru') || '/' || (select count(*) from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attname = 'islenme' and not attisdropped)"; }
katalog() { q $1 "select md5(string_agg(x, '|' order by x)) from (select p.oid::regprocedure::text || md5(p.prosrc) || coalesce(p.proacl::text, '') x from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'site\_%'
  union all select tgname || pg_get_triggerdef(oid) || tgenabled::text from pg_trigger where tgrelid = 'public.cariler'::regclass and not tgisinternal
  union all select attname || format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.site_kayit_talepleri'::regclass and attnum > 0 and not attisdropped) z"; }

echo "== 0) Üretim, Editor uyumu, önkoşul"
sonuc "22 dosyaları site-portal.sql'den yeniden üretilince" "22 üretimi: AYNI" "$(python3 $G/22-uret.py --denetle)"
for f in 22-site-onay-atomik.sql 22-site-onay-atomik-geri-al.sql 22-onkosul-salt-okur.sql; do
  sonuc "Editor denetimi: $f" "temiz" "$(python3 -B -c "
import sys, importlib.util
s = importlib.util.spec_from_file_location('e', '$A/stok-v2/editor-icin.py'); e = importlib.util.module_from_spec(s); s.loader.exec_module(e)
h = e.denetle(e.ayikla(open('$G/$f', encoding='utf-8').read())); print('; '.join(h) or 'temiz')")"
done
kur $DB
sonuc "önkoşul (19 sonrası, 22 öncesi)" "HAZIR — 22 uygulanabilir" "$(onkosul $DB)"
o1=$(durum $DB)
uygula22 $DB; sonuc "22 uygulandı (psql -f)" "0" "$?"
sonuc "  veri değişmedi (yalnız şema / fonksiyon)" "$o1" "$(durum $DB)"
sonuc "önkoşul (sonra)" "UYGULANMIŞ" "$(onkosul $DB)"
sonuc "ikinci kez uygulama" "22 zaten uygulanmış" "$($PG -d $DB -f $G/22-site-onay-atomik.sql 2>&1 | grep -o '22 zaten uygulanmış' | head -1)"
$T19/temel.sh t22p >/dev/null 2>&1; PGOPTIONS='-c client_min_messages=warning' $PG -d t22p -f $T/cari-sutunlari.sql >/dev/null; PGOPTIONS='-c client_min_messages=warning' $PG -d t22p -f $A/degisiklik-sayaci.sql >/dev/null
sonuc "site-portal.sql (depo) ile kurulan veritabanı: gövdeler 22 ile aynı" "UYGULANMIŞ (yedeksiz: site-portal.sql ile kurulmuş; geri alma dosyası çalışmaz)" "$(onkosul t22p)"

echo "== 1) Aynı talebe farklı cari kimlikleriyle eşzamanlı onay"
talep $DB es-1 "Eşzaman Ltd" "05320000001" es.bir
arka $DB "$YON" "select public.site_kayit_onayla_yeni_cari('es-1', 'cari-es1-aaaa')" 1.5 $Y/s1 &
sleep 0.4
arka $DB "$YON2" "select public.site_kayit_onayla_yeni_cari('es-1', 'cari-es1-bbbb')" 0 $Y/s2 &
wait
sonuc "oturum 1 (işlemi 1,5 sn açık tutar)" 'ok:{"durum": "onaylandi", "cari_id": "cari-es1-aaaa"}' "$(head -1 $Y/s1)"
sonuc "oturum 2 (0,4 sn sonra, başka Yönetici, başka kimlik)" "hata:P0001: Talep bulunamadı ya da işlenmiş" "$(head -1 $Y/s2)"
sonuc "  oturum 2 kilitte bekledi (≥ 0,8 sn sürdü; kendi işi anlık)" "evet" "$([ $(tail -1 $Y/s2) -ge 800 ] && echo evet || echo "hayır ($(tail -1 $Y/s2) ms)")"
sonuc "  cari / hesap" "1/1" "$(sayi $DB 'Eşzaman Ltd' es.bir)"
sonuc "  talep → kazanan cari" "onaylandi|cari-es1-aaaa" "$(q $DB "select durum || '|' || cari_id from site_kayit_talepleri where id = 'es-1'")"
talep $DB es-2 "Altı Oturum Ltd" "05320000002" es.iki
for i in 1 2 3 4 5 6; do arka $DB "$([ $((i % 2)) -eq 0 ] && echo "$YON2" || echo "$YON")" "select public.site_kayit_onayla_yeni_cari('es-2', 'cari-es2-000$i')" 0.3 $Y/a$i & done
wait
sonuc "6 oturum aynı anda: onaylanan / işlenmiş" "1/5" "$(grep -l '"durum": "onaylandi"' $Y/a? | wc -l)/$(grep -l 'Talep bulunamadı ya da işlenmiş' $Y/a? | wc -l)"
sonuc "  cari / hesap" "1/1" "$(sayi $DB 'Altı Oturum Ltd' es.iki)"

echo "== 2) Onay–ret yarışı"
talep $DB yr-1 "Önce Onay Ltd" "05320000003" yr.bir
arka $DB "$YON" "select public.site_kayit_onayla_yeni_cari('yr-1', 'cari-yr1-aaaa')" 1.5 $Y/r1 & sleep 0.4
arka $DB "$YON2" "select public.site_kayit_reddet('yr-1')" 0 $Y/r2 & wait
sonuc "onay önde: onay" 'ok:{"durum": "onaylandi", "cari_id": "cari-yr1-aaaa"}' "$(head -1 $Y/r1)"
sonuc "onay önde: ret (kilitte bekledi)" "hata:P0001: Talep onaylanmış; reddedilemez" "$(head -1 $Y/r2)"
sonuc "  son durum · cari / hesap" "onaylandi · 1/1" "$(q $DB "select durum from site_kayit_talepleri where id = 'yr-1'") · $(sayi $DB 'Önce Onay Ltd' yr.bir)"
talep $DB yr-2 "Önce Ret Ltd" "05320000004" yr.iki
arka $DB "$YON2" "select public.site_kayit_reddet('yr-2')" 1.5 $Y/r3 & sleep 0.4
arka $DB "$YON" "select public.site_kayit_onayla_yeni_cari('yr-2', 'cari-yr2-aaaa')" 0 $Y/r4 & wait
sonuc "ret önde: ret" "ok:" "$(head -1 $Y/r3)"
sonuc "ret önde: onay (kilitte bekledi)" "hata:P0001: Talep bulunamadı ya da işlenmiş" "$(head -1 $Y/r4)"
sonuc "  son durum · cari / hesap" "reddedildi · 0/0" "$(q $DB "select durum from site_kayit_talepleri where id = 'yr-2'") · $(sayi $DB 'Önce Ret Ltd' yr.iki)"
talep $DB yr-3 "Bağlama Yarışı Ltd" "05320000005" yr.uc
arka $DB "$YON" "select public.site_kayit_onayla_yeni_cari('yr-3', 'cari-yr3-aaaa')" 1.5 $Y/r5 & sleep 0.4
arka $DB "$YON2" "select public.site_kayit_onayla('yr-3', '11111111-1111-1111-1111-111111111111')" 0 $Y/r6 & wait
sonuc "yeni cari ile mevcut cariye bağlama yarışı: yeni cari" 'ok:{"durum": "onaylandi", "cari_id": "cari-yr3-aaaa"}' "$(head -1 $Y/r5)"
sonuc "  mevcut cariye bağlama" "hata:P0001: Talep bulunamadı ya da işlenmiş" "$(head -1 $Y/r6)"
sonuc "  hesap tek ve yeni caride" "1|cari-yr3-aaaa" "$(q $DB "select count(*) || '|' || max(cari_id) from site_hesaplari where kullanici = 'yr.uc'")"

echo "== 3) Cevabı kaybolan istek ve işlem bitmeden kopan bağlantı"
talep $DB ck-1 "Kayıp Cevap Ltd" "05320000006" ck.bir
sonuc "ilk çağrı" 'ok:{"durum": "onaylandi", "cari_id": "cari-ck1-aaaa"}' "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('ck-1', 'cari-ck1-aaaa')")"
o=$(durum $DB)
sonuc "aynı kimlikle tekrar (cevap kaybolmuştu)" 'ok:{"durum": "zaten", "cari_id": "cari-ck1-aaaa"}' "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('ck-1', 'cari-ck1-aaaa')")"
sonuc "  hiçbir tablo değişmedi" "$o" "$(durum $DB)"
sonuc "  cari / hesap" "1/1" "$(sayi $DB 'Kayıp Cevap Ltd' ck.bir)"
sonuc "mevcut cariye bağlamada aynı tekrar" "ok:" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
o=$(durum $DB)
sonuc "  ikinci kez (cevap kaybolmuştu)" "ok:" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "  hiçbir tablo değişmedi" "$o" "$(durum $DB)"
talep $DB ck-2 "Kopan Bağlantı Ltd" "05320000007" ck.iki
arka $DB "$YON" "select public.site_kayit_onayla_yeni_cari('ck-2', 'cari-ck2-aaaa')" 30 $Y/k1 &
sleep 1.2
q $DB "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$DB' and query like '%pg_sleep(30)%' and pid <> pg_backend_pid()" >/dev/null
wait
sonuc "cihaz işlem bitmeden koptu (bağlantı sonlandırıldı)" "hata" "$(head -1 $Y/k1 | cut -d: -f1)"
sonuc "  hiçbir şey yazılmadı: talep · cari / hesap" "yeni · 0/0" "$(q $DB "select durum from site_kayit_talepleri where id = 'ck-2'") · $(sayi $DB 'Kopan Bağlantı Ltd' ck.iki)"
sonuc "  ikinci Yönetici onaylar" 'ok:{"durum": "onaylandi", "cari_id": "cari-ck2-bbbb"}' "$(api $DB authenticated "$YON2" "select public.site_kayit_onayla_yeni_cari('ck-2', 'cari-ck2-bbbb')")"
sonuc "  ilk cihaz döner, Tamamla (kendi kimliği)" "hata:P0001: Talep bulunamadı ya da işlenmiş" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('ck-2', 'cari-ck2-aaaa')")"
sonuc "  cari / hesap · ilk kimlikle cari yok" "1/1 · 0" "$(sayi $DB 'Kopan Bağlantı Ltd' ck.iki) · $(q $DB "select count(*) from cariler where id = 'cari-ck2-aaaa'")"
sonuc "geçersiz kimlik biçimi" "hata:P0001: Cari kimliği geçersiz" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('ck-2', 'x; drop table cariler')")"
talep $DB ck-3 "Kimlik Çakışması Ltd" "05320000008" ck.uc
sonuc "var olan cari kimliğiyle yeni cari" "hata:P0001: Cari kimliği kullanılıyor" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('ck-3', 'cari-es1-aaaa')")"
sonuc "  talep bekliyor" "yeni" "$(q $DB "select durum from site_kayit_talepleri where id = 'ck-3'")"

echo "== 4) Eski ERP paketleri (yakalanmış gerçek istek, PostgREST gibi oynatılır)"
for p in ad02222 7c6ec2e; do
  F=$T/eski-$p.json; BAS=$(python3 $T/oynat.py $F --basliklar)
  cid=$(python3 -c "import json;d=json.load(open('$F'));print(next(r['id'] for i in d['cariIstekleri'] for r in i['govde'] if r.get('unvan')==d['talep']['bilgiler']['unvan']))")
  o=$(durum $DB)
  sonuc "$p ($(echo $BAS | python3 -c 'import json,sys;print(json.load(sys.stdin)["x-atolye-surum"])')): bekleyen talep için cari yazması" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F)" "$BAS" | cut -d: -f1-2)"
  sonuc "  ardından eski onay çağrısı" "hata:P0001: Cari bulunamadı" "$(api $DB authenticated "$YON" "select public.site_kayit_onayla('t22-eski', '$cid')" "$BAS")"
  sonuc "  hiçbir tablo değişmedi (cari yok, hesap yok, talep bekliyor)" "$o" "$(durum $DB)"
done
F=$T/eski-ad02222.json; BAS=$(python3 $T/oynat.py $F --basliklar)
sonuc "not / siteOdemeSor alanları silinmiş" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --ek-bos --id cari-v0-0001)" "$BAS" | cut -d: -f1-2)"
sonuc "ünvan büyük harf + fazla boşluk, telefon biçimi farklı" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan '  ESKİ İSTEMCİ   DERİ LTD ' --telefon '0532-111-22-33' --id cari-v1-0001)" "$BAS" | cut -d: -f1-2)"
sonuc "sahte sürüm başlığı (9.9.9)" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --id cari-v2-0001)" '{"x-atolye-surum":"9.9.9"}' | cut -d: -f1-2)"
sonuc "Yönetici olmayan aynı yazma" "hata:KR013" "$(api $DB authenticated "$PER" "$(python3 $T/oynat.py $F --id cari-v3-0001)" "$BAS" | cut -d: -f1-2)"
sonuc "  varyantların hiçbiri yazılmadı" "0" "$(q $DB "select count(*) from cariler where id like 'cari-v_-0001' or id like 'cari-mwj%'")"
sonuc "istisna taklit edilemez: talebi doğrudan güncellemek" "ret:izin-tablo" "$(api $DB authenticated "$YON" "update public.site_kayit_talepleri set durum = 'onaylandi', cari_id = 'cari-sahte-0001' where id = 't22-eski'")"
sonuc "istisna taklit edilemez: talep eklemek" "ret:izin-tablo" "$(api $DB authenticated "$YON" "insert into public.site_kayit_talepleri (id, kullanici, durum, cari_id) values ('sahte', 'sahte', 'onaylandi', 'cari-sahte-0001')")"
sonuc "ilgisiz yeni cari (eski paket, aynı istek biçimi)" "ok:" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Elle Açılan Başka Ltd' --id cari-elle-0001)" "$BAS")"
$PG -d $DB -c "insert into public.cariler (id, unvan, telefon) values ('cari-var-0001', 'Eski İstemci Deri Ltd', '0532 111 22 33')" >/dev/null
sonuc "var olan kimliğin upsert'i (aynı ünvan + telefon)" "ok:" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --id cari-var-0001)" "$BAS")"
$PG -d $DB -c "delete from public.cariler where id = 'cari-var-0001'" >/dev/null
sonuc "service_role yazması (sunucu)" "ok:" "$(api $DB service_role "$SRV" "$(python3 $T/oynat.py $F --id cari-srv-0001)")"
$PG -d $DB -c "delete from public.cariler where id = 'cari-srv-0001'" >/dev/null
sonuc "JWT'siz doğrudan bağlantı (SQL Editor)" "0" "$($PG -d $DB -c "$(python3 $T/oynat.py $F --id cari-jwt-0001)" >/dev/null 2>&1; echo $?)"
$PG -d $DB -c "delete from public.cariler where id = 'cari-jwt-0001'" >/dev/null
# Talep başka cihazda işlenmişken (yarışın eski-istemci hâli): onay → yine engel; ret → engel; 1 günden eski işlenme → engel yok.
sonuc "talep başka Yöneticiyle (yeni yolla) onaylandı" 'ok:{"durum": "onaylandi", "cari_id": "cari-eski-yeni"}' "$(api $DB authenticated "$YON2" "select public.site_kayit_onayla_yeni_cari('t22-eski', 'cari-eski-yeni')")"
sonuc "  eski paket aynı anda kendi carisini yazıyor (yarış)" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F)" "$BAS" | cut -d: -f1-2)"
sonuc "  sunucunun açtığı cari tek" "1/1" "$(sayi $DB 'Eski İstemci Deri Ltd' eski.firma)"
sonuc "  bu talebin carisinin geri yüklenmesi (aynı kimlik, çöpten)" "ok:" "$($PG -d $DB -c "delete from public.cariler where id = 'cari-eski-yeni'" >/dev/null; api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --id cari-eski-yeni)" "$BAS")"
talep $DB rd-1 "Reddedilen Deri Ltd" "05329998877" rd.bir
api $DB authenticated "$YON" "select public.site_kayit_reddet('rd-1')" >/dev/null
sonuc "reddedilmiş talebin bilgileriyle cari (son 1 gün)" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Reddedilen Deri Ltd' --telefon '05329998877' --id cari-rd-0001)" "$BAS" | cut -d: -f1-2)"
$PG -d $DB -c "update public.site_kayit_talepleri set islenme = now() - interval '2 days' where id = 'rd-1'" >/dev/null
sonuc "  1 günden eski ret: elle açılış serbest" "ok:" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Reddedilen Deri Ltd' --telefon '05329998877' --id cari-rd-0001)" "$BAS")"

echo "== 4b) GECİKMİŞ ESKİ YAZMA: eski cihazın bekleyen cari yazması 1 günden uzun süre sonra gelir"
# Eski ERP (1.744.0+) gönderemediği yazmayı bekleyen defterde tutar ve AYNI kayıtla (aynı kimlik) yeniden gönderir (025 bekleyen kayıt
# defteri). Kimlik uygulamanın uid("cari") biçimidir: cari-<oluşturma anı, ms, 36 tabanında>-<rastgele>. Burada kimlik 3 gün önce
# üretilmiş (onay o gün tıklandı), talep 2 gün önce başka yoldan işlenmiş, yazma BUGÜN geliyor.
kimlik() { python3 -B -c "
import sys, time
ms = int((time.time() + float(sys.argv[1])) * 1000); d = '0123456789abcdefghijklmnopqrstuvwxyz'; s = ''
while ms: ms, r = divmod(ms, 36); s = d[r] + s
print('cari-' + s + '-' + sys.argv[2])" "$1" "$2"; }
UC_GUN=$(kimlik -259200 gc01); UC_GUN2=$(kimlik -259200 gc02); UC_GUN3=$(kimlik -259200 gc03); UC_GUN4=$(kimlik -259200 gc04); SIMDI=$(kimlik 0 gc05)
talep $DB gc-1 "Gecikmiş Onay Ltd" "05327770001" gc.bir
api $DB authenticated "$YON2" "select public.site_kayit_onayla_yeni_cari('gc-1', 'cari-gc1-yeni')" >/dev/null
$PG -d $DB -c "update public.site_kayit_talepleri set islenme = now() - interval '2 days' where id = 'gc-1'" >/dev/null
sonuc "talep başka Yöneticiyle onaylandı (2 gün önce); eski cihazın 3 günlük yazması bugün gelir" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Gecikmiş Onay Ltd' --telefon '0532 777 00 01' --id $UC_GUN)" "$BAS" | cut -d: -f1-2)"
sonuc "  cari tek (sunucunun açtığı)" "1" "$(q $DB "select count(*) from cariler where unvan = 'Gecikmiş Onay Ltd'")"
talep $DB gc-2 "Gecikmiş Ret Ltd" "05327770002" gc.iki
api $DB authenticated "$YON2" "select public.site_kayit_reddet('gc-2')" >/dev/null
$PG -d $DB -c "update public.site_kayit_talepleri set islenme = now() - interval '2 days' where id = 'gc-2'" >/dev/null
sonuc "talep reddedildi (2 gün önce); eski cihazın 3 günlük yazması bugün gelir" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Gecikmiş Ret Ltd' --telefon '0532 777 00 02' --id $UC_GUN2)" "$BAS" | cut -d: -f1-2)"
sonuc "  cari yok" "0" "$(q $DB "select count(*) from cariler where unvan = 'Gecikmiş Ret Ltd'")"
talep $DB gc-3 "Hâlâ Bekleyen Ltd" "05327770003" gc.uc
$PG -d $DB -c "update public.site_kayit_talepleri set olusturma = now() - interval '4 days' where id = 'gc-3'" >/dev/null
sonuc "talep 4 gündür bekliyor; eski cihazın 3 günlük yazması" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Hâlâ Bekleyen Ltd' --telefon '0532 777 00 03' --id $UC_GUN3)" "$BAS" | cut -d: -f1-2)"
sonuc "22'den ÖNCE reddedilmiş talep (işlenme zamanı yoktu): eski cihazın 3 günlük yazması" "hata:KR013" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Önceden Reddedilen Ltd' --telefon '0532 777 00 04' --id $UC_GUN4)" "$BAS" | cut -d: -f1-2)"
sonuc "elle açılış: kimlik BUGÜN üretildi, talep 2 gün önce reddedilmiş" "ok:" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Gecikmiş Ret Ltd' --telefon '0532 777 00 02' --id $SIMDI)" "$BAS")"
sonuc "biçimsiz kimlik: varış anı esas (talep 2 gün önce işlenmiş → serbest)" "ok:" "$(api $DB authenticated "$YON" "$(python3 $T/oynat.py $F --unvan 'Gecikmiş Onay Ltd' --telefon '0532 777 00 01' --id elle-0001)" "$BAS")"
$PG -d $DB -c "delete from public.cariler where id in ('$SIMDI', 'elle-0001')" >/dev/null
sonuc "kimlikten oluşturma anı: bugünkü uid ±5 sn · 3 gün önceki ±5 sn · biçimsiz / eski kimlik boş" "evet · evet · boş/boş" "$(q $DB "select (case when abs(extract(epoch from public.site_kimlik_zamani('$SIMDI') - now())) < 5 then 'evet' else 'hayır' end) || ' · ' || (case when abs(extract(epoch from public.site_kimlik_zamani('$UC_GUN') - (now() - interval '3 days'))) < 5 then 'evet' else 'hayır' end) || ' · ' || coalesce(public.site_kimlik_zamani('c1')::text, 'boş') || '/' || coalesce(public.site_kimlik_zamani('11111111-1111-1111-1111-111111111111')::text, 'boş')")"
sonuc "22'den önce işlenmiş talebin işlenme zamanı uygulama anıyla dolduruldu" "dolu" "$(q $DB "select case when islenme is not null then 'dolu' else 'boş' end from site_kayit_talepleri where id = 'onceki-red'")"

echo "== 5) Biçim: sunucunun açtığı cari = eski ERP'nin yazdığı satır"
$PG -d $DB -c "delete from public.site_hesaplari where kullanici = 'eski.firma'" -c "delete from public.cariler where unvan = 'Eski İstemci Deri Ltd'" \
  -c "update public.site_kayit_talepleri set durum = 'yeni', cari_id = null, islenme = null, sifre_ozeti = extensions.crypt('E-sifre-1', extensions.gen_salt('bf', 4)) where id = 't22-eski'" >/dev/null
sonuc "eski ERP talebi yeni yolla onaylanır" 'ok:{"durum": "onaylandi", "cari_id": "cari-bicim-0001"}' "$(api $DB authenticated "$YON" "select public.site_kayit_onayla_yeni_cari('t22-eski', 'cari-bicim-0001')")"
python3 - $T/eski-ad02222.json > $Y/beklenen.json <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8")); u = d["talep"]["bilgiler"]["unvan"]
r = next(r for i in d["cariIstekleri"] for r in i["govde"] if r.get("unvan") == u)
print(json.dumps(r, ensure_ascii=False))
PY
BEK=$(sed "s/'/''/g" $Y/beklenen.json)
sonuc "satır (kimlik, kod, sürüm hariç; boş = yok)" "aynı" "$(q $DB "select case when jsonb_strip_nulls(to_jsonb(c) - 'id' - 'kod' - 'surum') = jsonb_strip_nulls('$BEK'::jsonb - 'id' - 'kod' - 'surum') then 'aynı' else 'FARKLI: sunucu ' || jsonb_strip_nulls(to_jsonb(c) - 'id' - 'kod' - 'surum')::text end from public.cariler c where id = 'cari-bicim-0001'")"
sonuc "  sürüm 1, kod boş (uygulama ilk kayıtta atar)" "1|" "$(q $DB "select surum || '|' || coalesce(kod, '') from public.cariler where id = 'cari-bicim-0001'")"
GIRDI='["0010013108", " 001 001 3108 ", "0010013109", "10000000146", "10000000147", "1234-567.890", "abc", "", "  12 ", "01000000146"]'
JS=$(node -e "
const k = require('fs').readFileSync('$A/src/077-vergino.jsx', 'utf8'); eval(k + ';globalThis.f = vergiNoKaydedilecek;');
console.log(JSON.stringify(JSON.parse(process.argv[1]).map((x) => f(x))));" "$GIRDI")
PGV=$(q $DB "select json_agg(public.site_vergi_no_kaydedilecek(x) order by n)::text from jsonb_array_elements_text('$GIRDI'::jsonb) with ordinality as e(x, n)")
sonuc "vergi no kuralı = uygulamanın vergiNoKaydedilecek (10 girdi)" "$JS" "$(echo "$PGV" | python3 -c 'import json,sys;print(json.dumps(json.load(sys.stdin), ensure_ascii=False, separators=(",",":")))')"

echo "== 6) Kapı"
talep $DB kp-1 "Kapı Ltd" "05320000009" kp.bir
o=$(durum $DB)
sonuc "Personel: yeni cariyle onay" "ret:kapı" "$(api $DB authenticated "$PER" "select public.site_kayit_onayla_yeni_cari('kp-1', 'cari-kp1-aaaa')")"
sonuc "  tablolar değişmedi" "$o" "$(durum $DB)"
sonuc "anon: yeni cariyle onay" "ret:izin-fonksiyon" "$(api $DB anon '{"role":"anon"}' "select public.site_kayit_onayla_yeni_cari('kp-1', 'cari-kp1-aaaa')")"
sonuc "authenticated: yardımcı fonksiyon (tetikleyici)" "ret:izin-fonksiyon" "$(api $DB authenticated "$YON" "select public.site_eslesme_anahtari('a', 'b')")"

echo "== 7) Geri alma ve Editor taklidi"
n=$(q $DB "select count(*) from cariler")/$(q $DB "select count(*) from site_hesaplari")
$PG -d $DB -f $G/22-site-onay-atomik-geri-al.sql >/dev/null 2>$Y/geri.err; sonuc "geri alma (psql -f)" "0" "$?"
sonuc "  önkoşul" "HAZIR — 22 uygulanabilir" "$(onkosul $DB)"
sonuc "  açılmış cari / hesap sayısı korundu" "$n" "$(q $DB "select count(*) from cariler")/$(q $DB "select count(*) from site_hesaplari")"
uygula22 $DB; sonuc "  yeniden uygulama" "0" "$?"
kur t22e
python3 $T19/editor-calistir.py $H $PT t22e $G/22-site-onay-atomik.sql > $Y/e1 2>&1; sonuc "Editor taklidi: uygula" "EDITOR: 2 ifade ayrı ayrı çalıştı" "$(tail -1 $Y/e1)"
sonuc "  önkoşul" "UYGULANMIŞ" "$(onkosul t22e)"
python3 $T19/editor-calistir.py $H $PT t22e $G/22-site-onay-atomik-geri-al.sql > $Y/e2 2>&1; sonuc "Editor taklidi: geri al" "EDITOR: 2 ifade ayrı ayrı çalıştı" "$(tail -1 $Y/e2)"
sonuc "  önkoşul" "HAZIR — 22 uygulanabilir" "$(onkosul t22e)"
$PG -d t22e -c "create or replace function public.site_kayit_reddet(p_id text) returns void language sql as 'select 1'" >/dev/null
sonuc "önkoşul tutmazsa (reddet farklı) uygulama durur" "19 hâlinden farklı" "$($PG -d t22e -f $G/22-site-onay-atomik.sql 2>&1 | grep -o '19 hâlinden farklı' | head -1)"
sonuc "  hiçbir şey değişmedi" "0" "$(q t22e "select count(*) from pg_proc where proname in ('site_kayit_onayla_yeni_cari', 'site_cari_ekleme_koru')")"

echo "== 8) Uygulama / geri alma korumaları"
kur t22k
DURMSJ="DUR — 22 uygulanmaz (DUR satırlarına bakın)"
$PG -d t22k -c "alter table public.cariler disable trigger degisiklik_izle" >/dev/null
k=$(katalog t22k); o=$(durum t22k)
sonuc "değişiklik sayacı DEVRE DIŞI: önkoşul satırı · GENEL" "DEVRE DIŞI|DUR · $DURMSJ" "$(onk t22k 10) · $(onkosul t22k)"
SAYAC_DUR="değişiklik sayacı (degisiklik_izle) yok ya da normal yazmada çalışmıyor"
sonuc "  uygulama durur" "$SAYAC_DUR" "$($PG -d t22k -f $G/22-site-onay-atomik.sql 2>&1 | grep -o "$SAYAC_DUR" | head -1)"
sonuc "  katalog ve veri değişmedi" "$k · $o" "$(katalog t22k) · $(durum t22k)"
$PG -d t22k -c "drop trigger degisiklik_izle on public.cariler" >/dev/null
sonuc "değişiklik sayacı YOK: önkoşul satırı · GENEL" "YOK|DUR · $DURMSJ" "$(onk t22k 10) · $(onkosul t22k)"
sonuc "  uygulama durur, katalog değişmedi" "durdu · 0/0/0" "$($PG -d t22k -f $G/22-site-onay-atomik.sql >/dev/null 2>&1 && echo uygulandı || echo durdu) · $(nesne22 t22k)"
q t22k "select public.degisiklik_izle_kur('cariler')" >/dev/null
SAYAC_TAMAM="var, etkin (O), degisiklik_bump()|tamam"
sonuc "sayaç yeniden kuruldu" "$SAYAC_TAMAM · HAZIR — 22 uygulanabilir" "$(onk t22k 10) · $(onkosul t22k)"
# YALNIZ REPLİKA (tgenabled R): normal oturumdaki yazmada çalışmaz — sayaç artmaz.
$PG -d t22k -c "alter table public.cariler enable replica trigger degisiklik_izle" >/dev/null
k=$(katalog t22k); o=$(durum t22k)
sayac() { q t22k "select coalesce(sayaclar ->> 'cariler', '0') from public.degisiklik where id = 'tekil'"; }
s1=$(sayac); $PG -d t22k -c "insert into public.cariler (id, unvan) values ('sayac-deneme', 'Sayaç Deneme'); delete from public.cariler where id = 'sayac-deneme'" >/dev/null; s2=$(sayac)
sonuc "sayaç YALNIZ REPLİKA (R): normal yazmada sayaç artmaz" "artmadı" "$([ "$s1" = "$s2" ] && echo artmadı || echo "arttı ($s1 → $s2)")"
sonuc "  önkoşul satırı · GENEL" "YALNIZ REPLİKA (R) — normal yazmada çalışmaz|DUR · $DURMSJ" "$(onk t22k 10) · $(onkosul t22k)"
sonuc "  uygulama durur" "$SAYAC_DUR" "$($PG -d t22k -f $G/22-site-onay-atomik.sql 2>&1 | grep -o "$SAYAC_DUR" | head -1)"
sonuc "  katalog değişmedi" "$k" "$(katalog t22k)"
# HER ZAMAN (tgenabled A): normal yazmada da çalışır — kabul.
$PG -d t22k -c "alter table public.cariler enable always trigger degisiklik_izle" >/dev/null
s1=$(sayac); $PG -d t22k -c "insert into public.cariler (id, unvan) values ('sayac-deneme', 'Sayaç Deneme'); delete from public.cariler where id = 'sayac-deneme'" >/dev/null; s2=$(sayac)
sonuc "sayaç HER ZAMAN (A): normal yazmada sayaç artar; önkoşul" "arttı · var, etkin (A), degisiklik_bump()|tamam" "$([ "$s1" != "$s2" ] && echo arttı || echo artmadı) · $(onk t22k 10)"
# YANLIŞ FONKSİYON: aynı adlı tetikleyici başka fonksiyona bağlı (sayaç artmaz).
$PG -d t22k -c "drop trigger degisiklik_izle on public.cariler" \
  -c "create function public.sahte_sayac() returns trigger language plpgsql as 'begin return null; end'" \
  -c "create trigger degisiklik_izle after insert or update or delete on public.cariler for each statement execute function public.sahte_sayac()" >/dev/null
k=$(katalog t22k)
s1=$(sayac); $PG -d t22k -c "insert into public.cariler (id, unvan) values ('sayac-deneme', 'Sayaç Deneme'); delete from public.cariler where id = 'sayac-deneme'" >/dev/null; s2=$(sayac)
sonuc "sayaç YANLIŞ FONKSİYONA bağlı: sayaç artmaz" "artmadı" "$([ "$s1" = "$s2" ] && echo artmadı || echo arttı)"
sonuc "  önkoşul satırı · GENEL" "YANLIŞ FONKSİYON (sahte_sayac())|DUR · $DURMSJ" "$(onk t22k 10) · $(onkosul t22k)"
sonuc "  uygulama durur" "$SAYAC_DUR" "$($PG -d t22k -f $G/22-site-onay-atomik.sql 2>&1 | grep -o "$SAYAC_DUR" | head -1)"
sonuc "  katalog değişmedi" "$k" "$(katalog t22k)"
$PG -d t22k -c "drop trigger degisiklik_izle on public.cariler" -c "drop function public.sahte_sayac()" >/dev/null
q t22k "select public.degisiklik_izle_kur('cariler')" >/dev/null
sonuc "sayaç doğru kuruldu" "$SAYAC_TAMAM · HAZIR — 22 uygulanabilir" "$(onk t22k 10) · $(onkosul t22k)"
$PG -d t22k -c "alter table public.site_kayit_talepleri add column islenme timestamptz" -c "update public.site_kayit_talepleri set islenme = '2026-01-02 03:04:05+00' where id = 'talep-1'" >/dev/null
k=$(katalog t22k); iv=$(q t22k "select md5(string_agg(id || coalesce(islenme::text, '-'), ',' order by id)) from site_kayit_talepleri")
sonuc "islenme sütunu ÖNCEDEN var: GENEL" "KISMİ / BEKLENMEYEN — uygulamayın, sonucu paylaşın" "$(onkosul t22k)"
sonuc "  uygulama durur ve söyler" "sütun site_kayit_talepleri.islenme" "$($PG -d t22k -f $G/22-site-onay-atomik.sql 2>&1 | grep -o 'sütun site_kayit_talepleri.islenme' | head -1)"
sonuc "  sütun ve değerleri değişmedi; katalog aynı" "$iv · $k" "$(q t22k "select md5(string_agg(id || coalesce(islenme::text, '-'), ',' order by id)) from site_kayit_talepleri") · $(katalog t22k)"
$PG -d t22k -c "alter table public.site_kayit_talepleri drop column islenme" >/dev/null
$PG -d t22k -c "create function public.site_kimlik_zamani(p text) returns timestamptz language sql immutable as 'select null::timestamptz'" >/dev/null
k=$(katalog t22k); fm=$(q t22k "select md5(prosrc) from pg_proc where proname = 'site_kimlik_zamani'")
sonuc "yardımcı fonksiyon ÖNCEDEN var (site_kimlik_zamani): uygulama durur ve söyler" "public.site_kimlik_zamani(text)" "$($PG -d t22k -f $G/22-site-onay-atomik.sql 2>&1 | grep -o 'public.site_kimlik_zamani(text)' | head -1)"
sonuc "  fonksiyon gövdesi aynı; katalog aynı" "$fm · $k" "$(q t22k "select md5(prosrc) from pg_proc where proname = 'site_kimlik_zamani'") · $(katalog t22k)"
$PG -d t22k -c "drop function public.site_kimlik_zamani(text)" >/dev/null
# Önceki (19 hâli) yetkiyi değiştir: reddet'e anon EXECUTE (22 bunu kaldırır) — geri alma 22 öncesini BİREBİR kurmalı.
$PG -d t22k -c "grant execute on function public.site_kayit_reddet(text) to anon" >/dev/null
once_red=$(q t22k "select proacl::text from pg_proc where oid = 'public.site_kayit_reddet(text)'::regprocedure")
once_ony=$(q t22k "select proacl::text from pg_proc where oid = 'public.site_kayit_onayla(text, text)'::regprocedure")
# site_kayit_listesi: 22 DOKUNMAZ — özel bir yetki verilir; uygulama ve geri alma sonrası aynı kalmalı.
$PG -d t22k -c "grant execute on function public.site_kayit_listesi() to service_role" >/dev/null
lst() { q t22k "select proacl::text from pg_proc where oid = 'public.site_kayit_listesi()'::regprocedure"; }
once_lst=$(lst)
sonuc "temizlendi: önkoşul" "HAZIR — 22 uygulanabilir" "$(onkosul t22k)"
uygula22 t22k; sonuc "22 uygulandı" "0 · UYGULANMIŞ · 5/1/1" "$? · $(onkosul t22k) · $(nesne22 t22k)"
sonuc "  site_kayit_listesi yetkisi dokunulmadı (service_role dahil)" "$once_lst" "$(lst)"
sonuc "  reddet'ten anon kaldırıldı (22)" "hayır" "$(q t22k "select case when has_function_privilege('anon', 'public.site_kayit_reddet(text)', 'execute') then 'evet' else 'hayır' end")"
sonuc "  önkoşul: geri alma hazır" "0 nesne değişmiş|tamam" "$(onk t22k 16)"
geri_dur() {   # $1 açıklama, $2 beklenen ileti parçası; geri alma DURMALI ve katalog / veri değişmemeli
  local k o m; k=$(katalog t22k); o=$(durum t22k)
  m=$($PG -d t22k -f $G/22-site-onay-atomik-geri-al.sql 2>&1 | grep -o "$2" | head -1)
  sonuc "$1: geri alma durur" "$2" "$m"
  sonuc "  değişiklik ezilmedi; katalog ve veri aynı; 22 nesneleri yerinde" "$k · $o · 5/1/1" "$(katalog t22k) · $(durum t22k) · $(nesne22 t22k)"
}
$PG -d t22k -c "alter table public.cariler disable trigger site_cari_ekleme_koru" >/dev/null
sonuc "tetikleyici sonradan KAPATILDI: önkoşul" "1 nesne değişmiş|UYARI" "$(onk t22k 16)"
geri_dur "  tetikleyici kapalı" "site_cari_ekleme_koru tetikleyicisi uygulandıktan sonra değişmiş"
sonuc "  tetikleyici hâlâ kapalı" "D" "$(q t22k "select tgenabled from pg_trigger where tgname = 'site_cari_ekleme_koru'")"
$PG -d t22k -c "alter table public.cariler enable trigger site_cari_ekleme_koru" >/dev/null
$PG -d t22k -c "drop trigger site_cari_ekleme_koru on public.cariler" -c "create trigger site_cari_ekleme_koru before insert or update on public.cariler for each row execute function public.site_cari_ekleme_koru()" >/dev/null
geri_dur "tetikleyici sonradan YENİDEN TANIMLANDI (insert or update)" "site_cari_ekleme_koru tetikleyicisi uygulandıktan sonra değişmiş"
$PG -d t22k -c "drop trigger site_cari_ekleme_koru on public.cariler" -c "create trigger site_cari_ekleme_koru before insert on public.cariler for each row execute function public.site_cari_ekleme_koru()" >/dev/null
$PG -d t22k -c "grant execute on function public.site_kayit_onayla_yeni_cari(text, text) to anon" >/dev/null
geri_dur "yeni fonksiyona sonradan anon yetkisi VERİLDİ" "public.site_kayit_onayla_yeni_cari(text, text) yetkisi / sahibi / ayarı uygulandıktan sonra değişmiş"
sonuc "  anon yetkisi duruyor (ezilmedi)" "evet" "$(q t22k "select case when has_function_privilege('anon', 'public.site_kayit_onayla_yeni_cari(text, text)', 'execute') then 'evet' else 'hayır' end")"
$PG -d t22k -c "revoke execute on function public.site_kayit_onayla_yeni_cari(text, text) from anon" >/dev/null
$PG -d t22k -c "revoke execute on function public.site_kayit_onayla(text, text) from authenticated" >/dev/null
geri_dur "onayla'dan sonradan authenticated yetkisi ALINDI" "public.site_kayit_onayla(text, text) yetkisi / sahibi / ayarı uygulandıktan sonra değişmiş"
$PG -d t22k -c "grant execute on function public.site_kayit_onayla(text, text) to authenticated" >/dev/null
$PG -d t22k -c "alter function public.site_eslesme_anahtari(text, text) set search_path = public" >/dev/null
geri_dur "yardımcının ayarı sonradan DEĞİŞTİ (search_path)" "public.site_eslesme_anahtari(text, text) yetkisi / sahibi / ayarı uygulandıktan sonra değişmiş"
$PG -d t22k -c "alter function public.site_eslesme_anahtari(text, text) set search_path = public, pg_temp" >/dev/null
sonuc "değişiklikler geri çekildi: önkoşul" "0 nesne değişmiş|tamam" "$(onk t22k 16)"
$PG -d t22k -f $G/22-site-onay-atomik-geri-al.sql >/dev/null 2>$Y/geri-k.err; sonuc "geri alma çalışır" "0" "$?"
sonuc "  22 nesneleri kalmadı" "0/0/0" "$(nesne22 t22k)"
sonuc "  reddet / onayla yetkileri 22 ÖNCESİYLE birebir (reddet'te anon geri geldi)" "$once_red · $once_ony" "$(q t22k "select proacl::text from pg_proc where oid = 'public.site_kayit_reddet(text)'::regprocedure") · $(q t22k "select proacl::text from pg_proc where oid = 'public.site_kayit_onayla(text, text)'::regprocedure")"
sonuc "  önkoşul" "HAZIR — 22 uygulanabilir" "$(onkosul t22k)"
sonuc "  site_kayit_listesi yetkisi geri almadan sonra da aynı" "$once_lst" "$(lst)"
sonuc "22 dosyalarında site_kayit_listesi geçmiyor (uygula / geri al)" "0 0" "$(grep -c site_kayit_listesi $G/22-site-onay-atomik.sql) $(grep -c site_kayit_listesi $G/22-site-onay-atomik-geri-al.sql)"
$PG -d t22k -c "revoke execute on function public.site_kayit_reddet(text) from anon" >/dev/null

echo
echo "SONUÇ: $GECTI geçti, $KALDI kaldı"
for d in $DB t22p t22e t22k; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
rm -rf $Y
[ $KALDI -eq 0 ]
