#!/bin/bash
# 21 — SİTE HESABI YÖNETİMİ: SUNUCU TARAFI (güvenlik denetimi 1. madde, 16 Kasım). YALITILMIŞ veritabanı; canlıya dokunmaz.
#
# Depodaki (main) site-portal.sql + rls-rol.sql + rls-kimlik.sql kurulur (t19/temel.sh, t19/veri.sql). Ölçülen:
#   1) Kapı her yönetim fonksiyonunun İLK ifadesi (hiçbir yazmadan önce).
#   2) ERP'nin onaydan önce sorduğu ön kontrol fonksiyonları (yonetici_mi, site_kayit_listesi, site_hesap_listesi) authenticated'a
#      açık ve doğru cevap veriyor: Yönetici true, Personel / modül yetkili Kullanıcı / listede olmayan false.
#   3) Yönetici olmayan DOĞRUDAN çağrı (PostgREST'in yaptığı gibi authenticator → authenticated + JWT): dört fonksiyon da kapıda
#      reddedilir (42501 YETKI_YOK) ve site_hesaplari / site_oturumlari / site_kayit_talepleri / cariler DEĞİŞMEZ.
#   4) Yönetici akışı: onay hesabı kurar ve talebi kapatır; ret talebi kapatır; iş kuralıyla reddedilen onay (işlenmiş talep,
#      alınmış kullanıcı adı, olmayan cari) hiçbir tabloyu değiştirmez.
# Kullanım: ./test21.sh   (T19_HOST / T19_PORT ile başka sunucu; postgres + authenticator şifresiz bağlanabilmeli)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); T19=$T/../t19
H=${T19_HOST:-localhost}; PT=${T19_PORT:-5432}; export T19_HOST=$H T19_PORT=$PT; DB=t21
PG="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
YON='{"role":"authenticated","email":"yonetici@firma.test"}'
PER='{"role":"authenticated","email":"personel@firma.test"}'
MUH='{"role":"authenticated","email":"muhasebe@firma.test"}'
YAB='{"role":"authenticated","email":"listede-yok@baska.test"}'
# api <rol> <claims> <sql> → "ok:<çıktı>" | "ret:kapı" | "ret:izin-fonksiyon" | "ret:izin-tablo" | "hata:<sqlstate ileti>"  (t19 ile aynı sınıflama)
api() {
  local out; out=$(psql -X -q -h $H -p $PT -U authenticator -d $DB -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role $1" -c "select set_config('request.jwt.claims', '$2', true) is null" -c "$3" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in
    "ERROR:  42501: YETKI_YOK: "*)                  echo "ret:kapı" ;;
    "ERROR:  42501: permission denied for function"*) echo "ret:izin-fonksiyon" ;;
    "ERROR:  42501: permission denied for table"*)    echo "ret:izin-tablo" ;;
    *) echo "hata:${hat#ERROR:  }" ;;
  esac
}
q() { $PG -d $DB -Atc "$1"; }
# Dört tablonun TAM içeriği (her satır, her sütun) → tek özet. Reddedilen işlemden önce ve sonra karşılaştırılır.
durum() { q "select md5(string_agg(x, '|' order by x)) from (
  select 'h:'||t::text x from public.site_hesaplari t union all select 'o:'||t::text from public.site_oturumlari t
  union all select 'k:'||t::text from public.site_kayit_talepleri t union all select 'c:'||t::text from public.cariler t) z"; }
satir() { q "select count(*) from public.site_hesaplari" ; }

$T19/temel.sh $DB >/dev/null 2>&1 || { echo "kurulum başarısız (temel.sh)"; exit 2; }
$PG -d $DB -f $T19/veri.sql >/dev/null || { echo "kurulum başarısız (veri.sql)"; exit 2; }
echo "== Kurulum: depodaki site-portal.sql + rls-rol.sql + rls-kimlik.sql ($(git -C $A rev-parse --short HEAD))"

echo "== 1) Kapı, yönetim fonksiyonlarının İLK ifadesi"
for f in site_hesap_kaydet site_hesap_sil site_kayit_onayla site_kayit_reddet; do
  ilk=$(q "select (regexp_match(prosrc, 'begin\s+(\S[^;]*;)', 'i'))[1] from pg_proc where proname = '$f' and pronamespace = 'public'::regnamespace")
  sonuc "$f: begin'den sonraki ilk ifade" "perform public.site_yonetici_kapisi();" "$ilk"
done

echo "== 2) ERP'nin onaydan ÖNCE sorduğu ön kontrol (authenticated rolünde, JWT ile)"
sonuc "yonetici_mi — Yönetici" "ok:t" "$(api authenticated "$YON" "select public.yonetici_mi()")"
sonuc "yonetici_mi — Personel (listede, Yönetici değil)" "ok:f" "$(api authenticated "$PER" "select public.yonetici_mi()")"
sonuc "yonetici_mi — Kullanıcı (cari kaydetme + silme yetkili)" "ok:f" "$(api authenticated "$MUH" "select public.yonetici_mi()")"
sonuc "yonetici_mi — listede olmayan hesap" "ok:f" "$(api authenticated "$YAB" "select public.yonetici_mi()")"
sonuc "site_kayit_listesi — Yönetici (bekleyen talepler)" "ok:talep-1 talep-2" "$(api authenticated "$YON" "select id from public.site_kayit_listesi() order by id")"
sonuc "site_hesap_listesi — Yönetici (kullanıcı adları)" "ok:musteria musterib" "$(api authenticated "$YON" "select kullanici from public.site_hesap_listesi() order by 1")"
sonuc "site_hesap_listesi çıktısında şifre özeti sütunu" "ok:cari_id,kullanici,son_giris" "$(api authenticated "$YON" "select string_agg(attname, ',' order by attnum) from (select (jsonb_each(to_jsonb(l))).key attname, 0 attnum from public.site_hesap_listesi() l limit 3) z")"

echo "== 3) Yönetici OLMAYAN doğrudan çağrı: kapıda ret ve HİÇBİR tablo değişmez"
for kim in "Personel|$PER" "Kullanıcı (cari yetkili)|$MUH" "listede olmayan|$YAB"; do
  ad=${kim%%|*}; jwt=${kim#*|}
  for cagri in "site_kayit_onayla|select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')" \
               "site_kayit_reddet|select public.site_kayit_reddet('talep-2')" \
               "site_hesap_kaydet|select public.site_hesap_kaydet('11111111-1111-1111-1111-111111111111', 'ele.gecir', 'Yeni-sifre-9')" \
               "site_hesap_kaydet (yalnız ad)|select public.site_hesap_kaydet('22222222-2222-2222-2222-222222222222', 'baska.ad', '')" \
               "site_hesap_sil|select public.site_hesap_sil('22222222-2222-2222-2222-222222222222')"; do
    once=$(durum); s=$(api authenticated "$jwt" "${cagri#*|}"); sonra=$(durum)
    sonuc "$ad: ${cagri%%|*}" "ret:kapı · tablolar değişmedi" "$s · $([ "$once" = "$sonra" ] && echo 'tablolar değişmedi' || echo 'TABLO DEĞİŞTİ')"
  done
done
sonuc "anon: site_kayit_onayla" "ret:izin-fonksiyon" "$(api anon '{"role":"anon"}' "select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"

echo "== 4) Yönetici akışı"
# İş kuralıyla reddedilen onaylar: hiçbir tablo değişmez.
$PG -d $DB -c "insert into public.site_kayit_talepleri (id, bilgiler, kullanici, sifre_ozeti) values ('talep-3', '{\"unvan\":\"Alınmış Ad\"}', 'musteria', 'x')" >/dev/null
once=$(durum); s=$(api authenticated "$YON" "select public.site_kayit_onayla('talep-3', '33333333-3333-3333-3333-333333333333')"); sonra=$(durum)
sonuc "onay: kullanıcı adı başka caride" "hata:P0001: Bu kullanıcı adı artık kullanılıyor · değişmedi" "$s · $([ "$once" = "$sonra" ] && echo değişmedi || echo DEĞİŞTİ)"
once=$(durum); s=$(api authenticated "$YON" "select public.site_kayit_onayla('talep-1', '99999999-9999-9999-9999-999999999999')"); sonra=$(durum)
sonuc "onay: cari yok (henüz buluta yazılmamış)" "hata:P0001: Cari bulunamadı · değişmedi" "$s · $([ "$once" = "$sonra" ] && echo değişmedi || echo DEĞİŞTİ)"
# Başarılı onay
sonuc "onay: talep-1 → Müşteri C" "ok:" "$(api authenticated "$YON" "select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')")"
sonuc "  hesap kuruldu, şifre özeti talepten" "musteric|true" "$(q "select h.kullanici || '|' || (h.sifre_ozeti = extensions.crypt('C-sifre-1', h.sifre_ozeti)) from public.site_hesaplari h where cari_id = '33333333-3333-3333-3333-333333333333'")"
sonuc "  talep kapandı, şifre özeti silindi" "onaylandi|33333333-3333-3333-3333-333333333333|true" "$(q "select durum || '|' || cari_id || '|' || (sifre_ozeti is null) from public.site_kayit_talepleri where id = 'talep-1'")"
once=$(durum); s=$(api authenticated "$YON" "select public.site_kayit_onayla('talep-1', '33333333-3333-3333-3333-333333333333')"); sonra=$(durum)
sonuc "onay: aynı talep ikinci kez (başka cihaz)" "hata:P0001: Talep bulunamadı ya da işlenmiş · değişmedi" "$s · $([ "$once" = "$sonra" ] && echo değişmedi || echo DEĞİŞTİ)"
sonuc "ret: talep-2" "ok:" "$(api authenticated "$YON" "select public.site_kayit_reddet('talep-2')")"
sonuc "  talep reddedildi, şifre özeti silindi" "reddedildi|true" "$(q "select durum || '|' || (sifre_ozeti is null) from public.site_kayit_talepleri where id = 'talep-2'")"
sonuc "hesap sil: Müşteri B (Yönetici)" "ok:" "$(api authenticated "$YON" "select public.site_hesap_sil('22222222-2222-2222-2222-222222222222')")"
sonuc "  hesap ve oturumu silindi" "0|0" "$(q "select (select count(*) from public.site_hesaplari where cari_id = '22222222-2222-2222-2222-222222222222') || '|' || (select count(*) from public.site_oturumlari where cari_id = '22222222-2222-2222-2222-222222222222')")"

echo "== 5) Negatif kontrol: test açığı YAKALAYABİLİYOR mu (kapısı kaldırılmış site_hesap_sil, yalnız bu test veritabanında)"
$PG -d $DB -c "create or replace function public.site_hesap_sil(p_cari_id text) returns void language plpgsql volatile security definer set search_path = public
  as \$\$ begin delete from site_oturumlari where cari_id = p_cari_id; delete from site_hesaplari where cari_id = p_cari_id; end; \$\$" >/dev/null
once=$(durum); s=$(api authenticated "$PER" "select public.site_hesap_sil('11111111-1111-1111-1111-111111111111')"); sonra=$(durum)
sonuc "kapısız site_hesap_sil: Personel" "ok: · TABLO DEĞİŞTİ" "$s · $([ "$once" = "$sonra" ] && echo 'tablolar değişmedi' || echo 'TABLO DEĞİŞTİ')"

echo
echo "SONUÇ: $GECTI geçti, $KALDI kaldı"
$PG -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
[ $KALDI -eq 0 ]
