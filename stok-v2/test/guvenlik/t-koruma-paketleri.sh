#!/usr/bin/env bash
# İKİ KORUMA AÇMA / DOĞRULAMA / GERİ ALMA PAKETLERİ (9, 10) SINAMASI (4 Kasım). Yalnız yerel; Supabase'e bağlanmaz.
# Veritabanı: atolye_guvenlik'in (canlı benzeri: site tabloları, 7 istisnası, rls-kimlik) kopyası, canlının BUGÜNKÜ hâline getirilir:
# fiş kuralları kapalı, sürüm kapısı kapalı, iki yabancı anahtar doğrulanmış (6). Dosyalar Editor'daki gibi çalıştırılır.
# Kahin:
#   SIRA    10, 9'dan önce → DUR, hiçbir şey değişmez; 9-geri-al kapı açıkken → DUR.
#   İZ      son 24 saatte başlıksız ERP yazması varken 10 → DUR (o cihaz eski); iz eskiyince 10 açılır.
#   AÇMA    9 → 9-sonra-dogrula hepsi tamam; 9 ikinci kez → DUR (zaten açık). 10 → 10-sonra-dogrula hepsi tamam.
#   DAVRANIŞ (iki koruma açık, uygulama oturumu): 1.744.7 başlıklı fis_kes geçer; başlıksız / 1.744.6 → AT001;
#           köprüden hareket (stk_yaz satır) → red; site girişi (portal_giris, anon) çalışır.
#   GERİ    10-geri-al → kapı kapalı, kurallar AÇIK; 9-geri-al → ikisi kapalı; 7-sonra-dogrula yine 6/6 (canlının bugünkü hâli).
#   EDITOR  dört yazar dosyası ve iki doğrulama dosyası Editor uyumlu (editor-icin.py).
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../.."
G=stok-v2/guvenlik; DB=atolye_koruma_paket
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
q() { psql -X -q -At -d "$DB" "$@"; }
dosya() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -f "$1" > /dev/null 2> /tmp/koruma-paket-hata.txt; echo $?; }
durdu() { grep -c "DUR:" /tmp/koruma-paket-hata.txt; }
tamam_hepsi() { psql -X -q -At -F'|' -d "$DB" -f "$1" | awk -F'|' '{ if ($4 != "t") bad = bad $1 "(" $3 ") " } END { print (bad == "" ? "hepsi" : bad) }'; }
ayar() { q -c "select coalesce(fis_aktif::text, '-') || '/' || coalesce(min_istemci_surum, '-') || '/' || public.fis_kural_aktif()::text from public.stk_ayar where id = 'tekil'"; }
uygulama() {  # uygulama <başlık sürümü | yok> <sql> → SONUC ya da SQLSTATE
  local b='{}'; [ "$1" != yok ] && b="{\"x-atolye-surum\":\"$1\"}"
  psql -X -q -At -d "$DB" 2>&1 <<SQL | grep -oE "SONUC:.*|ERROR: +[0-9A-Z]{5}" | head -1 | sed -E 's/ERROR: +//; s/SONUC://'
\set VERBOSITY verbose
begin;
select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true);
select set_config('request.headers', '$b', true);
set local role authenticated;
$2
commit;
SQL
}
yuk() { echo "{\"istek\":\"$1\",\"fis\":{\"aile\":\"stok\",\"tur\":\"Alış\",\"onek\":\"AF\",\"kaynak\":\"Satınalma\",\"cariId\":\"c-yeni\",\"paraBirimi\":\"TRY\",\"tutar\":100,\"kalemler\":[{\"urunId\":\"u-yeni\",\"renk\":\"Siyah\",\"miktar\":1,\"birimFiyat\":100}]},\"stok\":{\"satirlar\":[{\"id\":\"$1-h\",\"urunId\":\"u-yeni\",\"renk\":\"Siyah\",\"miktar\":1,\"kaynak\":\"Satınalma\",\"cariId\":\"c-yeni\"}]},\"cari\":{\"satirlar\":[{\"id\":\"$1-c\",\"cari_id\":\"c-yeni\",\"tarih\":\"2026-11-04\",\"yon\":\"Alacak\",\"tutar\":100}]}}"; }

psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template atolye_guvenlik"
q -c "update public.stk_ayar set fis_aktif = false, min_istemci_surum = null where id = 'tekil'"
# atolye_guvenlik'te F0 sınamasının bilerek bıraktığı sahipsiz hareket bağı var (canlıda ihlal 0 ve 6 uygulanmış) — yalnız bu
# kopyada bağ boşaltılır (tetikleyiciler atlanır: test verisi), sonra 6 canlıdaki gibi uygulanır.
q -c "set session_replication_role = replica; update public.stk_hareket set kalem_id = null where kalem_id is not null and kalem_id not in (select id from public.siparis_kalemleri); update public.stk_hareket set gecmis_kalem_id = null where gecmis_kalem_id is not null and gecmis_kalem_id not in (select id from public.siparis_kalemleri);"
k "BASLANGIC.6-fk-dogrula" "$(dosya $G/6-fk-dogrula.sql)" 0
q -c "update public.stk_istemci_iz set zaman = zaman - interval '3 days'"   # sınamanın kendi geçmiş yazmaları 24 saatin dışına
echo "t-koruma-paketleri · $DB (atolye_guvenlik kopyası, canlının bugünkü hâli: $(ayar))"
k "BASLANGIC.7-sonra-dogrula" "$(tamam_hepsi $G/7-sonra-dogrula.sql)" hepsi

# SIRA
k "SIRA.10-once-9-DUR" "$(dosya $G/10-surum-kapisi-ac.sql):$(durdu)" "3:1"
k "SIRA.10-once-9-degismedi" "$(ayar)" "false/-/false"
# AÇMA 9
k "ACMA.9" "$(dosya $G/9-kurallar-ac.sql)" 0
k "ACMA.9-sonra-dogrula" "$(tamam_hepsi $G/9-sonra-dogrula.sql)" hepsi
k "ACMA.9-ikinci-kez-DUR" "$(dosya $G/9-kurallar-ac.sql):$(durdu)" "3:1"
k "ACMA.9-sonra-davranis.kopru-hareket-red" "$(uygulama 1.744.7 "select 'SONUC:' || public.stk_yaz('{\"satirlar\":[{\"id\":\"pk-b1\",\"fisId\":\"PK-1\",\"urunId\":\"u-yeni\",\"renk\":\"Siyah\",\"miktar\":1,\"kaynak\":\"Sayım\"}]}'::jsonb)::text;")" 42501
k "ACMA.9-sonra-davranis.basliksiz-fis_kes-gecer (kapı kapalı)" "$(uygulama yok "select 'SONUC:' || (public.fis_kes('$(yuk pk-9a)'::jsonb) ? 'fisNo')::text;")" true
# İZ
q -c "insert into public.stk_istemci_iz (tablo, islem, surum) values ('tanimlar', 'UPDATE', null)"
k "IZ.taze-baslksiz-yazma-10-DUR" "$(dosya $G/10-surum-kapisi-ac.sql):$(durdu)" "3:1"
k "IZ.10-acilmadi" "$(ayar)" "true/-/true"
q -c "update public.stk_istemci_iz set zaman = now() - interval '2 days' where zaman > now() - interval '24 hours'"
# AÇMA 10
k "ACMA.10" "$(dosya $G/10-surum-kapisi-ac.sql)" 0
k "ACMA.10-sonra-dogrula" "$(tamam_hepsi $G/10-sonra-dogrula.sql)" hepsi
k "ACMA.10-ikinci-kez-DUR" "$(dosya $G/10-surum-kapisi-ac.sql):$(durdu)" "3:1"
# DAVRANIŞ
k "DAV.1.744.7-fis_kes-gecer" "$(uygulama 1.744.7 "select 'SONUC:' || (public.fis_kes('$(yuk pk-d1)'::jsonb) ? 'fisNo')::text;")" true
k "DAV.basliksiz-AT001" "$(uygulama yok "select 'SONUC:' || public.fis_kes('$(yuk pk-d2)'::jsonb)::text;")" AT001
k "DAV.1.744.6-AT001" "$(uygulama 1.744.6 "select 'SONUC:' || public.fis_kes('$(yuk pk-d3)'::jsonb)::text;")" AT001
k "DAV.reddedilenlerden-satir-yok" "$(q -c "select count(*) from public.stk_fis where istek in ('pk-d2', 'pk-d3')")" 0
k "DAV.kopru-hareket-red" "$(uygulama 1.744.7 "select 'SONUC:' || public.stk_yaz('{\"satirlar\":[{\"id\":\"pk-b2\",\"fisId\":\"PK-2\",\"urunId\":\"u-yeni\",\"renk\":\"Siyah\",\"miktar\":1,\"kaynak\":\"Sayım\"}]}'::jsonb)::text;")" KR009
kul=$(q -c "select kullanici from public.site_hesaplari order by kullanici limit 1")
giris=$(psql -X -q -At -d "$DB" -c "begin; select set_config('request.jwt.claims','{\"role\":\"anon\"}',true); set local role anon; select public.portal_giris('$kul', 'Sifre123!'); commit;" 2>&1 | tail -1)
k "DAV.site-girisi-calisir (kapı açık)" "$([ ${#giris} -ge 16 ] && echo kod || echo "$giris")" kod
k "DAV.10-sonra-dogrula-iz-hala-0" "$(tamam_hepsi $G/10-sonra-dogrula.sql)" hepsi
# GERİ
k "GERI.9-kapi-acikken-DUR" "$(dosya $G/9-geri-al.sql):$(durdu)" "3:1"
k "GERI.9-degismedi" "$(ayar)" "true/1.744.7/true"
k "GERI.10" "$(dosya $G/10-geri-al.sql)" 0
k "GERI.10-sonra-kurallar-hala-acik" "$(ayar)" "true/-/true"
k "GERI.9" "$(dosya $G/9-geri-al.sql)" 0
k "GERI.ikisi-kapali" "$(ayar)" "false/-/false"
k "GERI.7-sonra-dogrula (canlının bugünkü hâli)" "$(tamam_hepsi $G/7-sonra-dogrula.sql)" hepsi
# EDITOR
for f in 9-kurallar-ac 9-sonra-dogrula 9-geri-al 10-surum-kapisi-ac 10-sonra-dogrula 10-geri-al; do
  python3 stok-v2/editor-icin.py $G/$f.sql > /dev/null 2>&1; k "EDITOR.$f" "$?" 0; done

psql -X -q -d postgres -c "drop database $DB"
echo "── t-koruma-paketleri.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
