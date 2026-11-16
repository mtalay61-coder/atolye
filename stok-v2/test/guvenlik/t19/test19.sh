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
# api <db> <rol> <claims> <sql>  → "ok:<çıktı>" | "ret:YETKI_YOK" | "ret:izin" | "hata:<ileti>"
api() {
  local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d $1 -v ON_ERROR_STOP=1 -At \
    -c "begin" -c "set local role $2" -c "select set_config('request.jwt.claims', '$3', true) is null" -c "$4" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | tr '\n' ' ' | sed 's/ *$//')"
  elif echo "$out" | grep -q "YETKI_YOK"; then echo "ret:YETKI_YOK"
  elif echo "$out" | grep -q "permission denied"; then echo "ret:izin"
  else echo "hata:$(echo "$out" | grep -m1 ERROR)"; fi
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
sonuc "19 sonuç tablosunda 'tamam' dışı satır (bilgi hariç)" "0" "$(echo "$out" | grep '|' | grep -v 'kontrol\|bilgi *$' | grep -vc 'tamam *$')"
sonuc "18: tablolarda AÇIK" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$')"
sonuc "18: FARKLI satır" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'FARKLI$')"

echo "== 3) 19 SONRASI — NORMAL KULLANICI (personel@firma.test, rol Personel)"
for t in site_oturumlari site_hesaplari site_giris_kaydi site_kayit_talepleri; do
  sonuc "select $t" "ret:izin" "$(api t19b authenticated "$NOR" "select count(*) from $t")"; done
sonuc "doğrudan UPDATE site_hesaplari" "ret:izin" "$(api t19b authenticated "$NOR" "update site_hesaplari set sifre_ozeti = 'x'")"
sonuc "doğrudan INSERT site_oturumlari" "ret:izin" "$(api t19b authenticated "$NOR" "insert into site_oturumlari values (repeat('c',64), '22222222-2222-2222-2222-222222222222', now() + interval '1 day')")"
sonuc "doğrudan DELETE site_kayit_talepleri" "ret:izin" "$(api t19b authenticated "$NOR" "delete from site_kayit_talepleri")"
h=$(hash t19b 22222222-2222-2222-2222-222222222222)
sonuc "site_hesap_kaydet (B'nin şifresi)" "ret:YETKI_YOK" "$(api t19b authenticated "$NOR" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "  → B'nin şifre özeti değişmedi" "$h" "$(hash t19b 22222222-2222-2222-2222-222222222222)"
sonuc "site_hesap_kaydet (yalnız kullanıcı adı)" "ret:YETKI_YOK" "$(api t19b authenticated "$NOR" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'baskaad', '')")"
sonuc "site_hesap_sil (A'nın erişimini kapat)" "ret:YETKI_YOK" "$(api t19b authenticated "$NOR" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "  → A'nın hesabı ve oturumu duruyor" "1 1" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '1111%') || ' ' || (select count(*) from site_oturumlari where cari_id like '1111%')")"
sonuc "site_kayit_onayla (talep-1 → C)" "ret:YETKI_YOK" "$(api t19b authenticated "$NOR" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "site_kayit_reddet (talep-2)" "ret:YETKI_YOK" "$(api t19b authenticated "$NOR" "select site_kayit_reddet('talep-2')")"
sonuc "  → talepler hâlâ 'yeni', C'nin hesabı yok" "yeni,yeni 0" "$(q t19b "select (select string_agg(durum, ',' order by id) from site_kayit_talepleri) || ' ' || (select count(*) from site_hesaplari where cari_id like '3333%')")"
sonuc "site_yonetici_kapisi() RPC olarak" "ret:izin" "$(api t19b authenticated "$NOR" "select site_yonetici_kapisi()")"
sonuc "okuma: site_hesap_listesi" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_hesap_listesi()")"
sonuc "okuma: site_hesap_bilgi(A)" "ok:musteria" "$(api t19b authenticated "$NOR" "select site_hesap_bilgi('11111111-1111-1111-1111-111111111111') ->> 'kullanici'")"
sonuc "okuma: site_kayit_listesi" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_kayit_listesi()")"
sonuc "okuma: site_raporu" "ok:2" "$(api t19b authenticated "$NOR" "select jsonb_array_length(site_raporu(30))")"
sonuc "ERP talepleri: select site_talepleri" "ok:1" "$(api t19b authenticated "$NOR" "select count(*) from site_talepleri")"

echo "== 4) 19 SONRASI — ERP LİSTESİNDE OLMAYAN e-posta ve ANON"
sonuc "listede yok: site_hesap_sil" "ret:YETKI_YOK" "$(api t19b authenticated "$YAB" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "listede yok: select site_oturumlari" "ret:izin" "$(api t19b authenticated "$YAB" "select count(*) from site_oturumlari")"
sonuc "anon: site_hesap_kaydet" "ret:izin" "$(api t19b anon "$ANO" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Ele-gecirdim-1')")"
sonuc "anon: select site_hesaplari" "ret:izin" "$(api t19b anon "$ANO" "select count(*) from site_hesaplari")"

echo "== 5) 19 SONRASI — YÖNETİCİ (yonetici@firma.test, rol Yönetici)"
h=$(hash t19b 22222222-2222-2222-2222-222222222222)
sonuc "site_hesap_kaydet (B'ye yeni şifre)" "ok:" "$(api t19b authenticated "$YON" "select site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'musterib', 'Yeni-sifre-1')")"
[ "$h" != "$(hash t19b 22222222-2222-2222-2222-222222222222)" ] && sonuc "  → B'nin şifre özeti değişti, oturumu kapandı" "evet 0" "evet $(q t19b "select count(*) from site_oturumlari where cari_id like '2222%'")" || sonuc "  → B'nin şifre özeti değişti" evet hayır
sonuc "site_kayit_onayla (talep-1 → C)" "ok:" "$(api t19b authenticated "$YON" "select site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "  → C'nin hesabı açıldı, talep onaylandı" "1 onaylandi" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '3333%') || ' ' || (select durum from site_kayit_talepleri where id = 'talep-1')")"
sonuc "site_kayit_reddet (talep-2)" "ok:" "$(api t19b authenticated "$YON" "select site_kayit_reddet('talep-2')")"
sonuc "site_hesap_sil (A)" "ok:" "$(api t19b authenticated "$YON" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "  → A'nın hesabı ve oturumu silindi" "0 0" "$(q t19b "select (select count(*) from site_hesaplari where cari_id like '1111%') || ' ' || (select count(*) from site_oturumlari where cari_id like '1111%')")"
sonuc "yönetici de tabloyu DOĞRUDAN okuyamaz" "ret:izin" "$(api t19b authenticated "$YON" "select count(*) from site_oturumlari")"

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
sonuc "YENİ rls-kimlik sonrası normal kullanıcı select site_oturumlari" "ret:izin" "$(api t19b authenticated "$NOR" "select count(*) from site_oturumlari")"
sonuc "YENİ rls-kimlik sonrası 18 AÇIK sayısı" "0" "$($PG -d t19b -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$')"
sonuc "YENİ rls-kimlik sonrası ERP site_talepleri okur (ilk talep + portaldan gelen)" "ok:2" "$(api t19b authenticated "$NOR" "select count(*) from site_talepleri")"
kur t19c; $PG -d t19c -f $Y/eski-rls-kimlik.sql >/dev/null 2>&1   # (bilgi) ESKİ dosya yeniden çalışırsa ne olur
sonuc "(bilgi) ESKİ rls-kimlik yeniden çalışırsa tablo yeniden açılır" "ok:2" "$(api t19c authenticated "$NOR" "select count(*) from site_oturumlari")"
sonuc "  … ama yönetici kapısı kalır (site-portal.sql'de)" "ret:YETKI_YOK" "$(api t19c authenticated "$NOR" "select site_hesap_sil('11111111-1111-1111-1111-111111111111')")"
sonuc "YENİ kurulum (site-portal + rls-kimlik depodan): 18 AÇIK / FARKLI" "0 0" "$(kur t19d; $PG -d t19d -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'AÇIK$') $($PG -d t19d -At -F'|' -f $G/18-site-tablo-politika-salt-okur.sql | grep -c 'FARKLI$')"

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

echo; echo "TOPLAM: $GECTI geçti, $KALDI kaldı"
