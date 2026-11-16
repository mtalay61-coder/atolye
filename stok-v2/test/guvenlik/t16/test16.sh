#!/bin/bash
# 16 (varsayılan fonksiyon yetkisi) — uygulama + geri alma + korumalar; İKİ modda: tek oturum (psql -f) ve Supabase SQL Editor taklidi
# (her ifade ayrı bağlantıda, ilk hatada durur — ../t19/editor-calistir.py). YALNIZ yerel / yalıtılmış sunucu: t16* veritabanlarını SİLİP
# yeniden kurar. Kullanım: T16_HOST=localhost T16_PORT=5432 bash stok-v2/test/guvenlik/t16/test16.sh
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
H=${T16_HOST:-localhost}; PT=${T16_PORT:-5432}; Y=$(mktemp -d)
P="psql -X -q -h $H -p $PT -U postgres -v ON_ERROR_STOP=1"
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
$P -d postgres -c "do \$x\$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='raporcu') then create role raporcu nologin; end if; end \$x\$" >/dev/null
# Varsayılan yetki kayıtları + yedek satır sayısı + sınama / sonuç tabloları (karşılaştırma için).
durum() { $P -d $1 -Atc "select string_agg(x, ' ; ' order by x) from (
  select coalesce(case when defaclnamespace = 0 then '(global)' else defaclnamespace::regnamespace::text end, '?') || '=' ||
         (select string_agg(e.grantee::regrole::text || ':' || e.privilege_type || ':' || e.is_grantable, ',' order by e.grantee::regrole::text) from aclexplode(defaclacl) e) x
  from pg_default_acl where defaclrole = 'postgres'::regrole and defaclobjtype = 'f'
  union all select 'yedek=' || coalesce((xpath('/row/c/text()', query_to_xml(case when to_regclass('guvenlik.varsayilan_yetki_yedek') is null then 'select 0 as c'
                         else 'select count(*) as c from guvenlik.varsayilan_yetki_yedek' end, false, true, '')))[1]::text, '?')
  union all select 'deneme_fn=' || count(*) from pg_proc where proname = 'yetki_sinama_16') z"; }
kur() { $P -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null 2>&1
        $P -d $1 -c "alter default privileges for role postgres in schema public grant execute on functions to authenticated, service_role" >/dev/null
        [ -n "$2" ] && $P -d $1 -c "$2" >/dev/null; }
calistir() { # mod db dosya → "tamam" | hata iletisi
  if [ "$1" = editor ]; then out=$(python3 $T/../t19/editor-calistir.py $H $PT $2 $3 2>&1); else out=$($P -d $2 -f $3 2>&1); fi
  [ $? -eq 0 ] && echo tamam || echo "$out" | grep -m1 -o 'ERROR: .*' | cut -c1-140; }
senaryo() { # mod ad onhazirlik aradaki beklenen(ok|dur) [ileti-parcasi]
  local mod=$1 db=t16_${1:0:1}_$(echo $2 | tr A-Z a-z | cut -c1-20); kur $db "$3"; local ilk=$(durum $db)
  local r1=$(calistir $mod $db $G/16-varsayilan-yetki-kapat.sql)
  [ "$r1" = tamam ] || { sonuc "$mod · $2: uygula" tamam "$r1"; return; }
  [ -n "$4" ] && $P -d $db -c "$4" >/dev/null
  local once=$(durum $db); local r2=$(calistir $mod $db $G/16-varsayilan-yetki-geri-al.sql); local sonra=$(durum $db)
  if [ "$5" = ok ]; then
    sonuc "$mod · $2: geri alındı, ilk hâle döndü" "tamam | $(echo "$ilk" | sed 's/yedek=[0-9]*/yedek=0/')" "$r2 | $sonra"
  else
    echo "$r2" | grep -q "$6" && [ "$once" = "$sonra" ] && sonuc "$mod · $2: geri alma durdu, hiçbir şey değişmedi" durdu durdu \
      || sonuc "$mod · $2: geri alma durdu, hiçbir şey değişmedi" "durdu ($6)" "$r2 · $( [ "$once" = "$sonra" ] && echo değişmedi || echo DEĞİŞTİ)"
  fi
}
GLB="alter default privileges for role postgres"
for mod in psql editor; do
  echo "== $mod modu"
  senaryo $mod A_yalin "" "" ok
  senaryo $mod B_anon_eklendi "" "$GLB grant execute on functions to anon" dur "başka bir işlemle değiştirilmiş"
  senaryo $mod C_servis_alindi "" "$GLB revoke execute on functions from service_role" dur "başka bir işlemle değiştirilmiş"
  senaryo $mod D_publice_geri "" "$GLB grant execute on functions to public" dur "başka bir işlemle değiştirilmiş"
  senaryo $mod E_aktarma_hakki "" "$GLB grant execute on functions to authenticated with grant option" dur "başka bir işlemle değiştirilmiş"
  senaryo $mod F_degisip_geri "" "$GLB grant execute on functions to anon; $GLB revoke execute on functions from anon" ok
  senaryo $mod G_ozel_global "$GLB grant execute on functions to raporcu with grant option" "" ok
  senaryo $mod I_sema_degisti "" "$GLB in schema public grant execute on functions to anon" dur "Şemaya özgü"
  senaryo $mod J_ozel_sonra_degisti "$GLB grant execute on functions to raporcu with grant option" "$GLB revoke execute on functions from raporcu" dur "başka bir işlemle değiştirilmiş"
  senaryo $mod K_global_silindi "" "$GLB revoke execute on functions from authenticated, service_role; $GLB grant execute on functions to public" dur "başka bir işlemle değiştirilmiş"
  # uygula iki kez → yedek ilk hâli korur, geri alma ilk hâle döner
  db=t16_${mod:0:1}_iki_kez; kur $db; ilk=$(durum $db); calistir $mod $db $G/16-varsayilan-yetki-kapat.sql >/dev/null
  r=$(calistir $mod $db $G/16-varsayilan-yetki-kapat.sql); r2=$(calistir $mod $db $G/16-varsayilan-yetki-geri-al.sql)
  sonuc "$mod · uygula iki kez, sonra geri al" "tamam tamam | $(echo "$ilk" | sed 's/yedek=[0-9]*/yedek=0/')" "$r $r2 | $(durum $db)"
  # sınama tutmazsa (anon'a doğrudan genel yetki varken) HİÇBİR şey değişmez — Editor modunda da
  db=t16_${mod:0:1}_sinama_tutmaz; kur $db "$GLB grant execute on functions to anon"; ilk=$(durum $db)
  r=$(calistir $mod $db $G/16-varsayilan-yetki-kapat.sql)
  sonuc "$mod · sınama tutmazsa uygula durur ve hiçbir şey değişmez" "durdu | $ilk" "$(echo "$r" | grep -q 'Sınama tutmadı' && echo durdu || echo "$r") | $(durum $db)"
  # sonuç tabloları ve görünürlük
  db=t16_${mod:0:1}_a_yalin
  sonuc "$mod · geri alma sonucu tablosu (sınama satırı)" "anon ✓ · authenticated ✓ · service_role ✓" "$($P -d $db -Atc "select deger from guvenlik.yetki_geri_sonuc_16 where sira = 40")"
  sonuc "$mod · sonuç tablolarına anon / authenticated erişemez" "false false false false" "$($P -d $db -Atc "select has_table_privilege('anon','guvenlik.yetki_geri_sonuc_16','select') || ' ' || has_table_privilege('authenticated','guvenlik.yetki_geri_sonuc_16','select') || ' ' || has_table_privilege('anon','guvenlik.yetki_sinama_16','select') || ' ' || has_table_privilege('authenticated','guvenlik.yetki_sinama_16','select')")"
done
echo "== uygula sonrası: yeni fonksiyon anon'a kapalı doğar, authenticated / service_role açık (tek oturum)"
db=t16_yeni_fn; kur $db; calistir psql $db $G/16-varsayilan-yetki-kapat.sql >/dev/null
$P -d $db -c "create function public.yeni_deneme() returns int language sql as 'select 1'" >/dev/null
sonuc "yeni fonksiyon: anon · authenticated · service_role" "false true true" "$($P -d $db -Atc "select has_function_privilege('anon','public.yeni_deneme()','execute') || ' ' || has_function_privilege('authenticated','public.yeni_deneme()','execute') || ' ' || has_function_privilege('service_role','public.yeni_deneme()','execute')")"
sonuc "uygula sonuç tablosu: sınama satırı tamam" "tamam" "$($P -d $db -Atc "select case when not anon_x and auth_x and servis_x then 'tamam' else 'FARKLI' end from guvenlik.yetki_sinama_16")"
echo "== KARŞILAŞTIRMA: ESKİ 16 (git 89e8796) Editor'de — sorun buydu"
git -C $A show 89e8796:stok-v2/guvenlik/16-varsayilan-yetki-kapat.sql > $Y/16-eski.sql
db=t16_eski_editor; kur $db "$GLB grant execute on functions to anon"; ilk=$(durum $db); r=$(calistir editor $db $Y/16-eski.sql)
sonuc "eski 16, sınama tutmayacak durumda, Editor'de: hata" "relation yetki_sinama_16 yok" "$(echo "$r" | grep -q 'relation "yetki_sinama_16" does not exist' && echo 'relation yetki_sinama_16 yok' || echo "$r")"
sonuc "  → global varsayılan YİNE DE değişti (yeni sürümde değişmiyor)" "değişti" "$( [ "$ilk" != "$(durum $db)" ] && echo değişti || echo değişmedi)"
echo; echo "TOPLAM: $GECTI geçti, $KALDI kaldı"
