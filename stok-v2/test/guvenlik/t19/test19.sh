#!/bin/bash
# Kullanım: T19_HOST=localhost T19_PORT=5432 bash stok-v2/test/guvenlik/t19/test19.sh   (YALNIZ yerel / yalıtılmış sunucu: t19* veritabanlarını SİLİP yeniden kurar;
# sunucuda anon / authenticated / service_role / authenticator rolleri yoksa açar. Canlıya ASLA yöneltmeyin.)
# 19 testleri — YALNIZ yerel, yalıtılmış PostgreSQL 16 (her senaryo kendi veritabanında). Canlıya bağlanmaz.
# Kimlikler PostgREST gibi: `authenticator` ile bağlanır, istek başına `set local role` + request.jwt.claims.
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik; H=${T19_HOST:-localhost}; PT=${T19_PORT:-5432}; export T19_HOST=$H T19_PORT=$PT; Y=$(mktemp -d)
PG="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
YON='{"role":"authenticated","email":"yonetici@firma.test"}'
NOR='{"role":"authenticated","email":"personel@firma.test"}'
YAB='{"role":"authenticated","email":"listede-yok@baska.test"}'
ANO='{"role":"anon"}'
# api <db> <rol> <claims> <sql>  → "ok:<çıktı>" | "ret:kapı" (42501 + YETKI_YOK: fonksiyon çalıştı, iç yönetici kontrolü reddetti)
#   | "ret:izin-fonksiyon" (42501, EXECUTE yetkisi yok) | "ret:izin-tablo" (42501, tablo yetkisi yok) | "hata:<sqlstate ileti>"
api() {
  local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d $1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role $2" -c "select set_config('request.jwt.claims', '$3', true) is null" -c "$4" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in
    "ERROR:  42501: YETKI_YOK: "*)                  echo "ret:kapı" ;;
    "ERROR:  42501: permission denied for function"*) echo "ret:izin-fonksiyon" ;;
    "ERROR:  42501: permission denied for table"*)    echo "ret:izin-tablo" ;;
    *) echo "hata:${hat#ERROR:  }" ;;
  esac
}
q() { $PG -d $1 -Atc "$2"; }
kur() { $T/temel.sh $1 "${2:-}" "${3:-}" >/dev/null 2>&1; $PG -d $1 -f $T/veri.sql >/dev/null;
        $PG -d $1 -c "insert into public.site_talepleri (cari_id, cari_unvan, kalemler, toplam_cift) values ('11111111-1111-1111-1111-111111111111', 'Müşteri A', '[]', 1)" >/dev/null; }
# Katalog anlık görüntüsü: dört tablo + sıra yetkileri, sütun yetkileri, politikalar, fonksiyon gövde/yetki, kapı, yedek tablosu.
goruntu() { q $1 "select string_agg(x, E'\n' order by x) from (
  select 'acl '||c.relname||' '||coalesce((select string_agg(e.grantee::regrole::text||':'||e.privilege_type||':'||e.is_grantable, ',' order by e.grantee::regrole::text||':'||e.privilege_type) from aclexplode(c.relacl) e),'-') x from pg_class c where c.relname in ('site_oturumlari','site_hesaplari','site_giris_kaydi','site_kayit_talepleri','site_talepleri','site_giris_kaydi_id_seq')
  union all select 'sutun '||a.attrelid::regclass||'.'||a.attname||' '||a.attacl::text from pg_attribute a where a.attrelid in ('public.site_hesaplari'::regclass,'public.site_oturumlari'::regclass) and a.attacl is not null
  union all select 'pol '||tablename||'.'||policyname||' '||cmd||' '||array_to_string(roles,',')||' '||coalesce(qual,'')||' '||coalesce(with_check,'') from pg_policies where tablename like 'site\_%'
  union all select 'fn '||p.oid::regprocedure||' '||md5(p.prosrc)||' '||coalesce(p.proacl::text,'-')||' '||p.prosecdef from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'site\_%'
  union all select 'yedek satır '||(xpath('/row/c/text()', query_to_xml(case when to_regclass('guvenlik.site_erisim_yedek') is null then 'select 0 as c' else 'select count(*) as c from guvenlik.site_erisim_yedek' end, false, true, '')))[1]::text) z"; }
uygula() { $PG -d $1 -f $G/19-site-erisim-kapat.sql 2>&1 && echo "SONUC:TAMAM"; }
geri() { $PG -d $1 -f $G/19-site-erisim-geri-al.sql 2>&1 && echo "SONUC:TAMAM"; }
editor() { python3 $T/editor-calistir.py $H $PT $1 $2 2>&1 && echo "SONUC:TAMAM"; }   # Supabase SQL Editor taklidi (ifade başına ayrı bağlantı)
durum19() { $PG -d $1 -At -F'|' -f $G/19-durum-salt-okur.sql | grep '^>>> GENEL DURUM' | cut -d'|' -f2; }
sinama_tamam_disi() { $PG -d $1 -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1 || { echo HATA; return; }; q $1 "select count(*) filter (where durum <> 'tamam') || '/' || count(*) from guvenlik.site_19_sinama"; }
sinama_satir() { q $1 "select sonuc || ' | ' || durum from guvenlik.site_19_sinama where kontrol like '$2' order by sira limit 1"; }
hash() { q $1 "select md5(sifre_ozeti) from site_hesaplari where cari_id = '$2'"; }

echo "== 1) ÖNCE (canlıdaki açık durum: depodaki ESKİ site-portal + ESKİ rls-kimlik) — açığın kanıtı"
git -C $A show dda54b9:site-portal.sql > $Y/eski-site-portal.sql; git -C $A show dda54b9:rls-kimlik.sql > $Y/eski-rls-kimlik.sql
eski_kur() { kur $1 $Y/eski-rls-kimlik.sql $Y/eski-site-portal.sql; }
eski_kur t19a
sonuc "normal kullanıcı müşteri oturum anahtarlarını okur" "ok:2" "$(api t19a authenticated "$NOR" "select count(*) from site_oturumlari")"
h=$(hash t19a 22222222-2222-2222-2222-222222222222)
sonuc "normal kullanıcı B müşterisinin şifresini değiştirir" "ok:" "$(api t19a authenticated "$NOR" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
[ "$h" != "$(hash t19a 22222222-2222-2222-2222-222222222222)" ] && sonuc "B'nin şifre özeti değişti (açık doğrulandı)" evet evet || sonuc "B'nin şifre özeti değişti" evet hayır
sonuc "normal kullanıcı site_hesaplari'na doğrudan UPDATE" "ok:" "$(api t19a authenticated "$NOR" "update site_hesaplari set hatali_deneme = hatali_deneme where false")"
sonuc "18: tablolar AÇIK sayısı" "4" "$($PG -d t19a -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c '^A tablo · erişim|.*|AÇIK$')"
sonuc "18: yönetim işlemleri AÇIK sayısı" "4" "$($PG -d t19a -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c '^B yönetim · yetkilendirme|.*|AÇIK$')"

echo "== 2) 19 UYGULA (aynı veritabanı)"
eski_kur t19b; once=$(goruntu t19b)
out=$(uygula t19b); echo "$out" | grep -q "^SONUC:TAMAM" && sonuc "19 tamamlandı" COMMIT COMMIT || { sonuc "19 tamamlandı" COMMIT HATA; echo "$out" | grep ERROR; }
sonuc "19-durum: genel durum" "KATALOG TAMAMEN UYGULANMIŞ (davranış sınaması çalışmadı)" "$(durum19 t19b)"
sonuc "19-site-erisim-sinama: tamam dışı / toplam" "0/58" "$(sinama_tamam_disi t19b)"
sonuc "18: tablolarda AÇIK" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$')"
sonuc "18: FARKLI satır" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'FARKLI$')"

sonuc "  sınama: N2 (listede, Yönetici değil) site_hesap_sil" "kapı reddetti (YETKI_YOK) | tamam" "$(sinama_satir t19b 'N2%site_hesap_sil')"
sonuc "  sınama: Y Yönetici site_hesap_kaydet (authenticated rolünde)" "iş kuralı hatası P0001: Cari bulunamadı | tamam" "$(sinama_satir t19b 'Y Yönetici: site_hesap_kaydet')"
sonuc "  sınama: Y Yönetici site_kayit_onayla" "iş kuralı hatası P0001: Talep bulunamadı ya da işlenmiş | tamam" "$(sinama_satir t19b 'Y Yönetici: site_kayit_onayla')"
sonuc "  sınama: Y Yönetici site_hesap_sil" "çağrı tamamlandı | tamam" "$(sinama_satir t19b 'Y Yönetici: site_hesap_sil')"
sonuc "  sınama: N1 site_hesap_listesi çıktısında gizli değer" "yok (6 gizli değerle karşılaştırıldı) | tamam" "$(sinama_satir t19b 'N1%site_hesap_listesi() çıktısında%')"
sonuc "  sınama: site_raporu gövde + dönüş tipi" "yok | tamam" "$(sinama_satir t19b 'gövde + dönüş tipi: public.site_raporu%')"
echo "== 2b) NEGATİF KONTROLLER — sınama dosyası gerçek bir açığı / farkı YAKALIYOR mu (ayrı veritabanları)"
eski_kur t19v; uygula t19v >/dev/null
$PG -d t19v -c "create or replace function public.site_hesap_listesi() returns table (cari_id text, kullanici text, son_giris timestamptz) language sql stable security definer set search_path = public as 'select h.cari_id, h.sifre_ozeti, h.son_giris from site_hesaplari h'" >/dev/null
$PG -d t19v -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "şifre özeti döndüren site_hesap_listesi: gövde denetimi" "anahtar/özet sütunu | AÇIK" "$(sinama_satir t19v 'gövde + dönüş tipi: public.site_hesap_listesi%')"
sonuc "  … ve çıktı denetimi (gerçek değer)" "GİZLİ DEĞER VAR | AÇIK" "$(sinama_satir t19v 'N1%site_hesap_listesi() çıktısında%')"
eski_kur t19w; uygula t19w >/dev/null; $PG -d t19w -c "revoke execute on function public.site_hesap_sil(text) from authenticated" >/dev/null
$PG -d t19w -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "EXECUTE yetkisi alınmış site_hesap_sil: normal kullanıcıda YETKI_YOK sayılmaz" "çalıştırma izni yok | FARKLI" "$(sinama_satir t19w 'N1%site_hesap_sil')"
sonuc "  … yönetici için de" "çalıştırma izni yok | FARKLI" "$(sinama_satir t19w 'Y Yönetici: site_hesap_sil')"
eski_kur t19x; uygula t19x >/dev/null; $PG -d t19x -c "grant select on site_oturumlari to authenticated; create policy p on site_oturumlari for select to authenticated using (true)" >/dev/null
$PG -d t19x -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "yeniden açılmış site_oturumlari: sınama yakalar" "ERİŞTİ | AÇIK" "$(sinama_satir t19x 'N1%doğrudan select site_oturumlari')"
eski_kur t19y; uygula t19y >/dev/null; $PG -d t19y -c "create or replace function public.site_hesap_sil(p_cari_id text) returns void language sql volatile security definer set search_path = public as 'delete from site_oturumlari where cari_id = p_cari_id'" >/dev/null
$PG -d t19y -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "kapısı kaldırılmış site_hesap_sil: normal kullanıcı geçer → sınama yakalar" "çağrı tamamlandı | AÇIK" "$(sinama_satir t19y 'N2%site_hesap_sil')"
sonuc "  sınama: Y Yönetici site_kayit_reddet" "çağrı tamamlandı | tamam" "$(sinama_satir t19b 'Y Yönetici: site_kayit_reddet')"
echo "== 2c) NEGATİF KONTROLLER — yönetici için YALNIZ beklenen sonuç kabul ediliyor mu"
KAPI_BAS="language plpgsql volatile security definer set search_path = public as 'begin perform public.site_yonetici_kapisi();"
eski_kur t19z1; uygula t19z1 >/dev/null; $PG -d t19z1 -c "create or replace function public.site_kayit_reddet(p_id text) returns void $KAPI_BAS perform 1 / 0; end'" >/dev/null
$PG -d t19z1 -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "kapıdan sonra beklenmeyen hata (sıfıra bölme) → yönetici satırı FARKLI" "HATA 22012: division by zero | FARKLI" "$(sinama_satir t19z1 'Y Yönetici: site_kayit_reddet')"
sonuc "  … normal kullanıcı yine kapıda reddedilir" "kapı reddetti (YETKI_YOK) | tamam" "$(sinama_satir t19z1 'N1%site_kayit_reddet')"
eski_kur t19z2; uygula t19z2 >/dev/null; $PG -d t19z2 -c "create or replace function public.site_hesap_kaydet(p_cari_id text, p_kullanici text, p_sifre text) returns void $KAPI_BAS raise exception ''Beklenmeyen kural''; end'" >/dev/null
$PG -d t19z2 -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "beklenmeyen iş kuralı iletisi (P0001) → FARKLI" "iş kuralı hatası P0001: Beklenmeyen kural | FARKLI" "$(sinama_satir t19z2 'Y Yönetici: site_hesap_kaydet')"
eski_kur t19z3; uygula t19z3 >/dev/null; $PG -d t19z3 -c "create or replace function public.site_hesap_sil(p_cari_id text) returns void $KAPI_BAS raise exception ''Cari bulunamadı''; end'" >/dev/null
$PG -d t19z3 -f $G/19-site-erisim-sinama.sql >/dev/null 2>&1
sonuc "başka fonksiyonun beklenen iletisi (site_hesap_sil'de 'Cari bulunamadı') → FARKLI" "iş kuralı hatası P0001: Cari bulunamadı | FARKLI" "$(sinama_satir t19z3 'Y Yönetici: site_hesap_sil')"
echo "== 3) 19 SONRASI — NORMAL KULLANICI: ERP LİSTESİNDE, Yönetici DEĞİL (personel@firma.test, rol Personel)"
for t in site_oturumlari site_hesaplari site_giris_kaydi site_kayit_talepleri; do
  sonuc "select $t" "ret:izin-tablo" "$(api t19b authenticated "$NOR" "select count(*) from $t")"; done
sonuc "doğrudan UPDATE site_hesaplari" "ret:izin-tablo" "$(api t19b authenticated "$NOR" "update site_hesaplari set sifre_ozeti = 'x'")"
sonuc "doğrudan INSERT site_oturumlari" "ret:izin-tablo" "$(api t19b authenticated "$NOR" "insert into site_oturumlari values (repeat('c',64), '22222222-2222-2222-2222-222222222222', now() + interval '1 day')")"
sonuc "doğrudan DELETE site_kayit_talepleri" "ret:izin-tablo" "$(api t19b authenticated "$NOR" "delete from site_kayit_talepleri")"
h=$(hash t19b 22222222-2222-2222-2222-222222222222)
sonuc "site_hesap_kaydet (B'nin şifresi)" "ret:kapı" "$(api t19b authenticated "$NOR" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "  → B'nin şifre özeti değişmedi" "$h" "$(hash t19b 22222222-2222-2222-2222-222222222222)"
sonuc "site_hesap_kaydet (yalnız kullanıcı adı)" "ret:kapı" "$(api t19b authenticated "$NOR" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'baskaad', '')")"
sonuc "site_hesap_sil (A'nın erişimini kapat)" "ret:kapı" "$(api t19b authenticated "$NOR" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "  → A'nın hesabı ve oturumu duruyor" "1 1" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '1111%') || ' ' || (select count(*) from site_oturumlari where cari_id like '1111%')")"
sonuc "site_kayit_onayla (talep-1 → C)" "ret:kapı" "$(api t19b authenticated "$NOR" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "site_kayit_reddet (talep-2)" "ret:kapı" "$(api t19b authenticated "$NOR" "select site_kayit_reddet('talep-2')")"
sonuc "  → talepler hâlâ 'yeni', C'nin hesabı yok" "yeni,yeni 0" "$(q t19b "select (select string_agg(durum, ',' order by id) from site_kayit_talepleri) || ' ' || (select count(*) from site_hesaplari where cari_id like '3333%')")"
sonuc "site_yonetici_kapisi() RPC olarak" "ret:izin-fonksiyon" "$(api t19b authenticated "$NOR" "select site_yonetici_kapisi()")"
sonuc "okuma: site_hesap_listesi" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_hesap_listesi()")"
sonuc "okuma: site_hesap_bilgi(A)" "ok:musteria" "$(api t19b authenticated "$NOR" "select site_hesap_bilgi('11111111-1111-1111-1111-111111111111') ->> 'kullanici'")"
sonuc "okuma: site_kayit_listesi" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_kayit_listesi()")"
sonuc "okuma: site_raporu" "ok:2" "$(api t19b authenticated "$NOR" "select jsonb_array_length(site_raporu(30))")"
sonuc "ERP talepleri: select site_talepleri" "ok:1" "$(api t19b authenticated "$NOR" "select count(*) from site_talepleri")"

# Okuma fonksiyonlarının ÇIKTISINDA gerçek oturum anahtarı / şifre özeti var mı (normal kullanıcı; veritabanındaki bütün değerlerle)
GIZLI=$(q t19b "select string_agg(x, E'\\n') from (select anahtar x from site_oturumlari union all select sifre_ozeti from site_hesaplari union all select sifre_ozeti from site_kayit_talepleri where sifre_ozeti is not null) z")
sonuc "  (karşılaştırılacak gizli değer sayısı: oturum + hesap + bekleyen kayıt)" "6" "$(echo "$GIZLI" | grep -c .)"
for c in "site_hesap_listesi|select jsonb_agg(x) from site_hesap_listesi() x" \
         "site_hesap_bilgi (A ve B)|select jsonb_agg(site_hesap_bilgi(c)) from unnest(array['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']) c" \
         "site_kayit_listesi|select jsonb_agg(x) from site_kayit_listesi() x" "site_raporu|select site_raporu(730)"; do
  ad=${c%%|*}; cikti=$(api t19b authenticated "$NOR" "${c#*|}")
  [ "${cikti%%:*}" = ok ] || { sonuc "okuma $ad çalıştı" ok "$cikti"; continue; }
  sizan=$(echo "$GIZLI" | while read -r g; do [ -n "$g" ] && case "$cikti" in *"$g"*) echo x;; esac; done | grep -c x)
  sonuc "okuma $ad çıktısında oturum anahtarı / şifre özeti" "0" "$sizan"
  sonuc "okuma $ad çıktısında bcrypt biçimi" "0" "$(echo "$cikti" | grep -c '\$2[abxy]\$')"
done

echo "== 3b) ERP LİSTESİNDE, Yönetici DEĞİL, MODÜL YETKİLERİ VAR (muhasebe@firma.test, rol Kullanıcı, cari kaydetme+silme)"
MUH='{"role":"authenticated","email":"muhasebe@firma.test"}'
sonuc "yonetici_mi() bu kimlikte" "ok:f" "$(api t19b authenticated "$MUH" "select public.yonetici_mi()")"
sonuc "yetki_var_mi(cari, kaydetme) bu kimlikte (modül yetkisi gerçekten var)" "ok:t" "$(psql -X -q -h $H -p $PT -U postgres -d t19b -At -c "begin" -c "select set_config('request.jwt.claims', '$MUH', true) is null" -c "select public.yetki_var_mi(array['cari'], 'kaydetme')" -c "commit" 2>/dev/null | sed -n 2p | sed 's/^/ok:/')"
sonuc "site_hesap_kaydet" "ret:kapı" "$(api t19b authenticated "$MUH" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "site_hesap_sil" "ret:kapı" "$(api t19b authenticated "$MUH" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "site_kayit_onayla" "ret:kapı" "$(api t19b authenticated "$MUH" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "site_kayit_reddet" "ret:kapı" "$(api t19b authenticated "$MUH" "select site_kayit_reddet('talep-2')")"
sonuc "select site_hesaplari" "ret:izin-tablo" "$(api t19b authenticated "$MUH" "select count(*) from site_hesaplari")"
sonuc "  → veri değişmedi (B özeti, A hesabı + oturumu, talepler)" "$h 1 1 yeni,yeni" "$(hash t19b 22222222-2222-2222-2222-222222222222) $(q t19b "select (select count(*) from site_hesaplari where cari_id like '1111%') || ' ' || (select count(*) from site_oturumlari where cari_id like '1111%') || ' ' || (select string_agg(durum, ',' order by id) from site_kayit_talepleri)")"

echo "== 4) 19 SONRASI — ERP LİSTESİNDE OLMAYAN e-posta ve ANON"
sonuc "listede yok: site_hesap_kaydet" "ret:kapı" "$(api t19b authenticated "$YAB" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "listede yok: site_kayit_onayla" "ret:kapı" "$(api t19b authenticated "$YAB" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "listede yok: site_kayit_reddet" "ret:kapı" "$(api t19b authenticated "$YAB" "select site_kayit_reddet('talep-2')")"
sonuc "listede yok: site_hesap_sil" "ret:kapı" "$(api t19b authenticated "$YAB" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "listede yok: select site_oturumlari" "ret:izin-tablo" "$(api t19b authenticated "$YAB" "select count(*) from site_oturumlari")"
for f in "site_hesap_sil('11111111-1111-1111-1111-111111111111')" "site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')" "site_kayit_reddet('talep-2')" "site_hesap_listesi()" "site_raporu(30)"; do
  sonuc "anon: ${f%%(*} (fonksiyona hiç giremez)" "ret:izin-fonksiyon" "$(api t19b anon "$ANO" "select $f")"; done
sonuc "anon: site_hesap_kaydet" "ret:izin-fonksiyon" "$(api t19b anon "$ANO" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "anon: select site_hesaplari" "ret:izin-tablo" "$(api t19b anon "$ANO" "select count(*) from site_hesaplari")"

echo "== 5) 19 SONRASI — YÖNETİCİ: JWT ile authenticated ROLÜNDE gerçek yönetim RPC'leri (yonetici@firma.test, rol Yönetici)"
sonuc "yönetici oturumu authenticated rolünde (current_user)" "ok:authenticated" "$(api t19b authenticated "$YON" "select current_user")"
h=$(hash t19b 22222222-2222-2222-2222-222222222222)
sonuc "site_hesap_kaydet (B'ye yeni şifre)" "ok:" "$(api t19b authenticated "$YON" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Yeni-sifre-1')")"
[ "$h" != "$(hash t19b 22222222-2222-2222-2222-222222222222)" ] && sonuc "  → B'nin şifre özeti değişti, oturumu kapandı" "evet 0" "evet $(q t19b "select count(*) from site_oturumlari where cari_id like '2222%'")" || sonuc "  → B'nin şifre özeti değişti" evet hayır
sonuc "site_kayit_onayla (talep-1 → C)" "ok:" "$(api t19b authenticated "$YON" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "  → C'nin hesabı açıldı, talep onaylandı" "1 onaylandi" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '3333%') || ' ' || (select durum from site_kayit_talepleri where id = 'talep-1')")"
sonuc "site_kayit_reddet (talep-2)" "ok:" "$(api t19b authenticated "$YON" "select site_kayit_reddet('talep-2')")"
sonuc "site_hesap_sil (A)" "ok:" "$(api t19b authenticated "$YON" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "  → A'nın hesabı ve oturumu silindi" "0 0" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '1111%') || ' ' || (select count(*) from site_oturumlari where cari_id like '1111%')")"
sonuc "yönetici de tabloyu DOĞRUDAN okuyamaz" "ret:izin-tablo" "$(api t19b authenticated "$YON" "select count(*) from site_oturumlari")"

echo "== 6) 19 SONRASI — SİTE (anon) ve DİĞER YOLLAR"
sonuc "anon portal_giris (B, yönetici verdiği şifre)" "ok:64" "$(api t19b anon "$ANO" "select length(portal_giris('musterib', 'Yeni-sifre-1'))")"
sonuc "anon portal_giris (yanlış şifre → boş)" "ok:" "$(api t19b anon "$ANO" "select portal_giris('musterib', 'yanlis')")"
sonuc "anon portal_cikis" "ok:" "$(api t19b anon "$ANO" "select portal_cikis(repeat('z', 64))")"
KAL='[{"urunId":"aaaaaaaa-0000-0000-0000-000000000001","renk":"Siyah","beden":"41","miktar":3}]'
ANAHTAR=$(api t19b anon "$ANO" "select portal_giris('musterib', 'Yeni-sifre-1')"); ANAHTAR=${ANAHTAR#ok:}   # site gibi: giriş ayrı istek
sonuc "anon portal (müşteri sayfası: B'nin modeli ve fiyatı)" "ok:Bot 30" "$(api t19b anon "$ANO" "select (portal('$ANAHTAR') -> 'modeller' -> 0 ->> 'ad') || ' ' || (portal('$ANAHTAR') -> 'modeller' -> 0 ->> 'fiyat')")"
sonuc "anon portal_hesap (hesap sayfası açılır)" "ok:Müşteri B" "$(api t19b anon "$ANO" "select portal_hesap('$ANAHTAR', null, null) ->> 'unvan'")"
TID=$(api t19b anon "$ANO" "select portal_siparis('$ANAHTAR', '$KAL', 'test notu', null)")
sonuc "anon portal_siparis (talep gönderir)" "ok" "${TID%%:*}"; TID=${TID#ok:}
sonuc "  → talep site_talepleri'ne düştü (B, 3 çift, fiyat sunucuda 30)" "22222222-2222-2222-2222-222222222222 3 30" "$(q t19b "select cari_id || ' ' || toplam_cift || ' ' || (kalemler -> 0 ->> 'birimFiyat') from site_talepleri where id = '$TID'")"
sonuc "normal kullanıcı (ERP) yeni talebi görür" "ok:1" "$(api t19b authenticated "$NOR" "select count(*) from site_talepleri where id = '$TID' and durum = 'yeni'")"
sonuc "normal kullanıcı (ERP) site_talep_reddet" "ok:" "$(api t19b authenticated "$NOR" "select site_talep_reddet('$TID', 'stok yok')")"
sonuc "  → talep reddedildi, sebep yazıldı" "reddedildi stok yok" "$(q t19b "select durum || ' ' || red_sebebi from site_talepleri where id = '$TID'")"
sonuc "anon site_kayit_ol" "ok:ok" "$(api t19b anon "$ANO" "select site_kayit_ol('{\"unvan\":\"Yeni Firma\",\"telefon\":\"05551112233\"}', 'yenifirma', 'Sifre-123')")"
sonuc "service_role JWT: site_hesap_sil (kapı geçer)" "ok:" "$(psql -X -q -h $H -p $PT -U postgres -d t19b -At -c "begin" -c "select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true) is null" -c "select site_hesap_sil('__yok__')" -c "commit" >/dev/null 2>&1 && echo ok: || echo hata)"
sonuc "SQL Editor (postgres, JWT yok): site_hesap_kaydet" "ok:" "$(q t19b "select site_hesap_kaydet('33333333-3333-3333-3333-333333333333', 'musteric', 'Editor-sifre-1')" >/dev/null 2>&1 && echo ok: || echo hata)"

echo "== 7) rls-kimlik.sql YENİDEN ÇALIŞTIRILINCA"
$PG -d t19b -f $A/rls-kimlik.sql >/dev/null 2>&1
sonuc "YENİ rls-kimlik sonrası normal kullanıcı select site_oturumlari" "ret:izin-tablo" "$(api t19b authenticated "$NOR" "select count(*) from site_oturumlari")"
sonuc "YENİ rls-kimlik sonrası 18 AÇIK sayısı" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$')"
sonuc "YENİ rls-kimlik sonrası ERP site_talepleri okur (ilk talep + portaldan gelen)" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_talepleri")"
kur t19c; $PG -d t19c -f $Y/eski-rls-kimlik.sql >/dev/null 2>&1   # (bilgi) ESKİ dosya yeniden çalışırsa ne olur
sonuc "(bilgi) ESKİ rls-kimlik yeniden çalışırsa tablo yeniden açılır" "ok:2" "$(api t19c authenticated "$NOR" "select count(*) from site_oturumlari")"
sonuc "  … ama yönetici kapısı kalır (site-portal.sql'de)" "ret:kapı" "$(api t19c authenticated "$NOR" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
# 22 (16 Kasım) site_kayit_onayla / site_kayit_reddet'i bilerek değiştirdi; 18 bu iki gövdeyi 19 hâliyle karşılaştırır. 19'un "yeni
# kurulum" ölçüsü bu yüzden 19'un kendi kaynağıyla (ad02222) yapılır; güncel depo ayrıca: fark yalnız o iki fonksiyonda (22'nin sınaması t22).
git -C $A show ad02222:site-portal.sql > $Y/site-19-kaynak.sql
sonuc "YENİ kurulum (19 kaynağı ad02222: site-portal + rls-kimlik): 18 AÇIK / FARKLI" "0 0" "$(kur t19d "" $Y/site-19-kaynak.sql; $PG -d t19d -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$') $($PG -d t19d -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'FARKLI$')"
sonuc "GÜNCEL depo (22 dahil): 18 AÇIK · FARKLI satırlar" "0 · site_kayit_onayla,site_kayit_reddet" "$(kur t19d2; $PG -d t19d2 -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$') · $($PG -d t19d2 -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep 'FARKLI$' | grep -o 'site_kayit_[a-z]*' | sort -u | paste -sd,)"

echo "== 8) GERİ ALMA"
eski_kur t19e; once=$(goruntu t19e); uygula t19e >/dev/null
out=$(geri t19e); echo "$out" | grep -q "^SONUC:TAMAM" && sonuc "geri alma tamamlandı" COMMIT COMMIT || { sonuc "geri alma tamamlandı" COMMIT HATA; echo "$out" | grep ERROR; }
sonra=$(goruntu t19e)
[ "$once" = "$sonra" ] && sonuc "katalog 19 öncesiyle BİREBİR (yetki, sütun, politika, fonksiyon gövdesi+yetkisi)" aynı aynı || { sonuc "katalog 19 öncesiyle birebir" aynı FARKLI; diff <(echo "$once") <(echo "$sonra"); }
sonuc "geri alma sonrası normal kullanıcı yine yönetebilir (eski hâl)" "ok:" "$(api t19e authenticated "$NOR" "select site_hesap_sil('__yok__')")"
sonuc "yedek boşaldı" "0" "$(q t19e "select count(*) from guvenlik.site_erisim_yedek")"
out=$(uygula t19e); echo "$out" | grep -q "^SONUC:TAMAM" && sonuc "geri almadan sonra 19 yeniden uygulanabilir" COMMIT COMMIT || sonuc "19 yeniden" COMMIT HATA
sonuc "geri alma iki kez: ikincisi durur" "durdu" "$(geri t19e >/dev/null; geri t19e | grep -q 'Yedek bulunamadı' && echo durdu || echo DEVAM)"

echo "== 9) KORUMALAR (her biri 'hiçbir şey değişmedi' ile)"
koruma() { # ad, db, hazırlık-sql, komut(uygula|geri), beklenen ileti parçası
  local s1 s2 out; [ -n "$3" ] && $PG -d $2 -c "$3" >/dev/null 2>&1; s1=$(goruntu $2); out=$($4 $2); s2=$(goruntu $2)
  if echo "$out" | grep -q "$5" && [ "$s1" = "$s2" ]; then sonuc "$1" "durdu, değişmedi" "durdu, değişmedi"
  else sonuc "$1" "durdu, değişmedi" "$(echo "$out" | grep -m1 'ERROR\|SONUC') · $( [ "$s1" = "$s2" ] && echo değişmedi || echo DEĞİŞTİ)"; fi; }
eski_kur t19f; uygula t19f >/dev/null
koruma "19 iki kez uygulanırsa" t19f "" uygula "zaten uygulanmış"
koruma "geri al: 19 sonrası authenticated'a SELECT verilmiş" t19f "grant select on site_oturumlari to authenticated" geri "başka bir değişiklik"
eski_kur t19g; uygula t19g >/dev/null
koruma "geri al: 19 sonrası politika kurulmuş" t19g "create policy p on site_hesaplari for select to authenticated using (true)" geri "başka bir değişiklik"
eski_kur t19h; uygula t19h >/dev/null
koruma "geri al: 19 sonrası site_hesap_sil gövdesi değişmiş" t19h "create or replace function public.site_hesap_sil(p_cari_id text) returns void language sql security definer set search_path = public as 'select 1'" geri "başka bir değişiklik"
eski_kur t19i; koruma "uygula: giriş sistemi kapalı" t19i "update tanimlar set veri = veri || '{\"girisAktifMi\": false}'" uygula "Giriş sistemi kapalı"
eski_kur t19j; koruma "uygula: bulut hesabı olan Yönetici yok" t19j "delete from auth.users where email = 'yonetici@firma.test'" uygula "Yönetici yok"
eski_kur t19k; koruma "uygula: canlı gövde depodan farklı" t19k "create or replace function public.site_kayit_reddet(p_id text) returns void language sql security definer set search_path = public as 'select 1'" uygula "depodaki sürümden farklı"
eski_kur t19l; koruma "uygula: bu tablolara başvuran INVOKER fonksiyon" t19l "create function public.sinama_invoker() returns bigint language sql as 'select count(*) from public.site_hesaplari'" uygula "bozulur"
eski_kur t19m; koruma "uygula: bu tablolara başvuran görünüm" t19m "create view public.sinama_gorunum as select cari_id from public.site_hesaplari" uygula "görünüm var"
kur t19n; koruma "uygula: zaten korumalı (yeni site-portal) kurulum" t19n "" uygula "depodaki sürümden farklı"

echo "== 10) SUPABASE SQL EDITOR TAKLİDİ (her ifade ayrı bağlantıda, ilk hatada durur)"
git -C $A show 0232474:stok-v2/guvenlik/19-site-erisim-kapat.sql > $Y/19-ilk-surum.sql
eski_kur t19p; sonuc "uygulanmamış veritabanında 19-durum" "HİÇ UYGULANMAMIŞ (19 öncesi hâl)" "$(durum19 t19p)"
out=$(editor t19p $Y/19-ilk-surum.sql)
sonuc "CANLI HATANIN YENİDEN ÜRETİMİ: ilk 19 sürümü Editor'de" "42P01 site_19_sinama" "$(echo "$out" | grep -o 'relation "site_19_sinama" does not exist' | sed 's/.*/42P01 site_19_sinama/')"
sonuc "  → hatadan önceki ifadeler kalıcı oldu (19-durum)" "KATALOG TAMAMEN UYGULANMIŞ (davranış sınaması çalışmadı)" "$(durum19 t19p)"
sonuc "  → bu hâlde 19-site-erisim-sinama (Editor'de): çalıştı" "SONUC:TAMAM" "$(editor t19p $G/19-site-erisim-sinama.sql | tail -1)"
sonuc "  → sınama sonucu tamam dışı / toplam" "0/58" "$(q t19p "select count(*) filter (where durum <> 'tamam') || '/' || count(*) from guvenlik.site_19_sinama")"
sonuc "  → normal kullanıcı select site_oturumlari" "ret:izin-tablo" "$(api t19p authenticated "$NOR" "select count(*) from site_oturumlari")"
sonuc "  → normal kullanıcı site_hesap_sil" "ret:kapı" "$(api t19p authenticated "$NOR" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "  → yönetici site_hesap_kaydet" "ok:" "$(api t19p authenticated "$YON" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Yeni-sifre-1')")"
once_p=$(goruntu t19p)
eski_kur t19q; once=$(goruntu t19q)
out=$(editor t19q $G/19-site-erisim-kapat.sql); echo "$out" | grep -q "^SONUC:TAMAM" && sonuc "DÜZELTİLMİŞ 19 Editor'de tamamlandı" tamam tamam || { sonuc "DÜZELTİLMİŞ 19 Editor'de" tamam HATA; echo "$out" | tail -3; }
sonuc "  → 19-durum" "KATALOG TAMAMEN UYGULANMIŞ (davranış sınaması çalışmadı)" "$(durum19 t19q)"
sonuc "  → 19-site-erisim-sinama (Editor'de) tamam dışı / toplam" "0/58" "$(editor t19q $G/19-site-erisim-sinama.sql >/dev/null; q t19q "select count(*) filter (where durum <> 'tamam') || '/' || count(*) from guvenlik.site_19_sinama")"
out=$(editor t19q $G/19-site-erisim-geri-al.sql); echo "$out" | grep -q "^SONUC:TAMAM" && sonuc "geri alma Editor'de tamamlandı" tamam tamam || { sonuc "geri alma Editor'de" tamam HATA; echo "$out" | tail -3; }
sonra=$(goruntu t19q | grep -v '^yedek satır')
[ "$(echo "$once" | grep -v '^yedek satır')" = "$sonra" ] && sonuc "  → katalog 19 öncesiyle birebir (Editor modunda uygula + geri al)" aynı aynı || { sonuc "  → katalog 19 öncesiyle birebir" aynı FARKLI; diff <(echo "$once") <(goruntu t19q); }
sonuc "  → 19-durum geri almadan sonra" "HİÇ UYGULANMAMIŞ (19 öncesi hâl)" "$(durum19 t19q)"
eski_kur t19r; $PG -d t19r -c "update tanimlar set veri = veri || '{\"girisAktifMi\": false}'" >/dev/null; s1=$(goruntu t19r)
out=$(editor t19r $G/19-site-erisim-kapat.sql)
[ "$s1" = "$(goruntu t19r)" ] && echo "$out" | grep -q "Giriş sistemi kapalı" && sonuc "Editor'de önkoşul tutmazsa: ilk ifadede durur, hiçbir şey değişmez" "durdu, değişmedi" "durdu, değişmedi" || sonuc "Editor'de önkoşul" "durdu, değişmedi" "$(echo "$out" | tail -1)"
eski_kur t19s; sonuc "uygulanmamış veritabanında 19-site-erisim-sinama durur" "durdu" "$($PG -d t19s -f $G/19-site-erisim-sinama.sql 2>&1 | grep -q '19 uygulanmamış' && echo durdu || echo DEVAM)"

echo; echo "TOPLAM: $GECTI geçti, $KALDI kaldı"
