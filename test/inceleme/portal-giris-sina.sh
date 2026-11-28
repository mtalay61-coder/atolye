#!/usr/bin/env bash
# PORTAL GİRİŞİ SINAMASI (28 Kasım): carisi olmayan / pasif / geçerli site hesabıyla giriş — düzeltmeden ÖNCE ve SONRA.
# Yalnız yerel: PostgreSQL kopyası (şablon $1, vars. b12_crlf) ya da SB=1 ile yerel Supabase (giriş GERÇEK API'den, anon anahtarla).
# Hesaplar bu sınamanın kurduğu SAHTE hesaplardır. Kullanım:  PGHOST=localhost PGUSER=postgres test/inceleme/portal-giris-sina.sh
set -uo pipefail
cd "$(dirname "$0")/../.."; G=stok-v2/guvenlik; gecen=0; kalan=0
if [ "${SB:-0}" = 1 ]; then Q() { psql -X -q -At -v ON_ERROR_STOP=1 "$KOPRU_SUPABASE_DB" "$@"; }; KIP="yerel Supabase (gerçek API, anon)"
else DB=portal_giris_sina; psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template ${1:-b12_crlf}"; Q() { psql -X -q -At -v ON_ERROR_STOP=1 -d $DB "$@"; }; KIP="PostgreSQL (şablon ${1:-b12_crlf})"; fi
giris() { # kullanıcı şifre → anahtar | (boş) | RET …
  if [ "${SB:-0}" = 1 ]; then curl -s -X POST "$KOPRU_SUPABASE/rest/v1/rpc/portal_giris" -H "apikey: $KOPRU_SUPABASE_ANAHTAR" -H "Content-Type: application/json" -d "{\"p_kullanici\":\"$1\",\"p_sifre\":\"$2\"}" | sed 's/^null$//; s/^"\(.*\)"$/\1/; s/^{.*"message":"\([^"]*\)".*$/RET \1/'
  else Q -c "set role anon" -c "select coalesce(public.portal_giris('$1', '$2'), '')" 2>&1 | sed 's/^ERROR: *\(.*\)$/RET \1/' | grep -v "^CONTEXT\|^PL/pgSQL" | head -1; fi; }
portal() { if [ "${SB:-0}" = 1 ]; then curl -s -X POST "$KOPRU_SUPABASE/rest/v1/rpc/portal" -H "apikey: $KOPRU_SUPABASE_ANAHTAR" -H "Content-Type: application/json" -d "{\"p_kod\":\"$1\"}" | grep -o '"unvan" *: *"[^"]*"\|GECERSIZ_KOD' | head -1 | sed 's/^"unvan" *: *"\(.*\)"$/\1/'
  else Q -c "set role anon" -c "select public.portal('$1') ->> 'unvan'" 2>&1 | grep -o "GECERSIZ_KOD\|^[^E].*" | head -1; fi; }
k() { if [ "$2" = "$3" ]; then gecen=$((gecen + 1)); echo "  ✓ $1"; else kalan=$((kalan + 1)); echo "  ✗ KALDI $1 — görülen [$2] · beklenen [$3]"; fi; }
say() { Q -c "select count(*) from $1"; }
tohum() { Q <<'SQL'
set session_replication_role = replica;
delete from public.site_oturumlari where cari_id like 'pg-%'; delete from public.site_giris_kaydi where cari_id like 'pg-%'; delete from public.site_hesaplari where cari_id like 'pg-%'; delete from public.cariler where id like 'pg-%';
insert into public.cariler (id, unvan, tip) values ('pg-gecerli', 'Geçerli Müşteri', 'Müşteri'), ('pg-pasif', 'Pasif Müşteri', 'Müşteri');
update public.cariler set pasif = true where id = 'pg-pasif';
insert into public.site_hesaplari (cari_id, kullanici, sifre_ozeti) values
  ('pg-gecerli', 'pg.gecerli', extensions.crypt('dogru-sifre', extensions.gen_salt('bf', 4))), ('pg-pasif', 'pg.pasif', extensions.crypt('dogru-sifre', extensions.gen_salt('bf', 4))),
  ('pg-yetim', 'pg.yetim', extensions.crypt('dogru-sifre', extensions.gen_salt('bf', 4))), ('pg-kilit', 'pg.kilit', extensions.crypt('dogru-sifre', extensions.gen_salt('bf', 4)));
insert into public.site_oturumlari values ('pg-yetim-eski-oturum', 'pg-yetim', now() + interval '10 days'), ('pg-gecerli-eski-oturum', 'pg-gecerli', now() + interval '10 days');
set session_replication_role = origin;
SQL
}
tur() { # $1 = once | sonra
  local y=$1; tohum
  echo "■ $([ $y = once ] && echo 'DÜZELTMEDEN ÖNCE (bugünkü gövde)' || echo 'DÜZELTMEDEN SONRA')"
  local a; a=$(giris pg.gecerli dogru-sifre); echo "    geçerli hesap, doğru şifre → $([ -n "$a" ] && echo 'anahtar verildi' || echo 'boş') · portal → $(portal "$a")"
  k "G1 geçerli hesap girer ve portalı okur" "$([ ${#a} = 64 ] && echo anahtar)|$(portal "$a")" 'anahtar|Geçerli Müşteri'
  local b; b=$(giris pg.gecerli yanlis); k "G2 geçerli hesap, yanlış şifre → boş; hatalı deneme sayacı 1" "$b|$(Q -c "select hatali_deneme from public.site_hesaplari where cari_id = 'pg-gecerli'")" "|1"
  local o0; o0=$(say "public.site_oturumlari where cari_id = 'pg-yetim'"); local c; c=$(giris pg.yetim dogru-sifre)
  echo "    CARİSİ OLMAYAN hesap, doğru şifre → $([ -n "$c" ] && echo "anahtar VERİLDİ · portal → $(portal "$c")" || echo 'boş (giriş reddedildi)') · oturum $o0 → $(say "public.site_oturumlari where cari_id = 'pg-yetim'") · başarılı giriş kaydı $(say "public.site_giris_kaydi where cari_id = 'pg-yetim' and basarili") · son giriş $(Q -c "select coalesce(son_giris::text, 'yok') from public.site_hesaplari where cari_id = 'pg-yetim'")"
  if [ $y = sonra ]; then k "G3 carisi olmayan hesap doğru şifreyle GİREMEZ: anahtar yok, yeni oturum yok, başarılı giriş kaydı yok, son giriş değişmez" "$c|$(say "public.site_oturumlari where cari_id = 'pg-yetim'")|$(say "public.site_giris_kaydi where cari_id = 'pg-yetim' and basarili")|$(Q -c "select coalesce(son_giris::text, 'yok') from public.site_hesaplari where cari_id = 'pg-yetim'")" "|1|0|yok"
  else k "G3 (bugünkü durum) carisi olmayan hesap anahtar ALIYOR ama portal kapısından geçemiyor" "$([ ${#c} = 64 ] && echo anahtar)|$(portal "$c")" "anahtar|GECERSIZ_KOD"; fi
  k "G4 carisi olmayan hesabın ESKİ oturumu silinmedi ve portaldan geçmiyor" "$(say "public.site_oturumlari where anahtar = 'pg-yetim-eski-oturum'")|$(portal pg-yetim-eski-oturum)" "1|GECERSIZ_KOD"
  local d; d=$(giris pg.pasif dogru-sifre); k "G5 carisi PASİF hesap doğru şifreyle giremez (oturum açılmaz)" "$d|$(say "public.site_oturumlari where cari_id = 'pg-pasif'")" "|0"
  local e; e=$(giris pg.yetim yanlis); k "G6 carisi olmayan hesap, yanlış şifre → boş; hatalı deneme sayılır" "$e|$(Q -c "select hatali_deneme from public.site_hesaplari where cari_id = 'pg-yetim'")" "|1"
  k "G7 olmayan kullanıcı → boş" "$(giris pg.hic dogru-sifre)" ""
  for i in 1 2 3 4 5; do giris pg.kilit yanlis > /dev/null; done; local f; f=$(giris pg.kilit dogru-sifre); k "G8 beş hatalı denemeden sonra hesap kilitlenir (carisi olmasa da)" "$(echo "$f" | grep -o HESAP_KILITLI)" "HESAP_KILITLI"
  k "G9 geçerli hesabın önceki oturumu duruyor ve çalışıyor" "$(portal pg-gecerli-eski-oturum)" 'Geçerli Müşteri'
}
echo "portal-giris-sina · $KIP"
durum() { Q -F ' | ' -f $G/58-portal-giris-durum-salt-okur.sql | cut -d'|' -f1; }
[ "$(durum | grep -c ESKİ)" = 1 ] || Q -f $G/58-portal-giris-geri-al.sql > /dev/null
echo "  durum: $(durum)"; tur once
T=$(mktemp); sed 's/$/\r/' $G/58-portal-giris-uygula.sql > $T; Q -f $T > /dev/null; Q -f $T > /dev/null; echo "  kurulum (CRLF, iki kez) → durum: $(durum)"; tur sonra
sed 's/$/\r/' $G/58-portal-giris-geri-al.sql > $T; Q -f $T > /dev/null; echo "  geri alma (CRLF) → durum: $(durum)"; k "geri almadan sonra gövde eski sürüm" "$(durum | grep -c ESKİ)" "1"
[ "${SB:-0}" = 1 ] && Q -c "set session_replication_role = replica; delete from public.site_oturumlari where cari_id like 'pg-%'; delete from public.site_giris_kaydi where cari_id like 'pg-%'; delete from public.site_hesaplari where cari_id like 'pg-%'; delete from public.cariler where id like 'pg-%'" > /dev/null
rm -f $T; echo "SONUÇ: $gecen geçti · $kalan kaldı"; [ $kalan = 0 ]
