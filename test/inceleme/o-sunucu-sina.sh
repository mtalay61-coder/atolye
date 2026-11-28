#!/usr/bin/env bash
# PAKET Ö SUNUCU SINAMASI (28 Kasım): ölçü ürünün grubunda ve mevcut kimlikleri üzerinden çözülür. Yalnız yerel PostgreSQL.
# PAKET_O=0 → bugünkü davranış (Paket V kurulu şablonda: ikiz reddedilir ama doğru varyant KULLANILAMAZ) · PAKET_O=1 → paketle.
set -uo pipefail
cd "$(dirname "$0")/../.."; G=stok-v2/guvenlik; DB=o_sina; SABLON=${1:-b12_v}; gecen=0; acik=0
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template $SABLON" 2>/dev/null
Q() { psql -X -q -At -v ON_ERROR_STOP=1 -d $DB "$@"; }
T=$(mktemp); sed 's/$/\r/' $G/62-o-uygula.sql > $T
[ "${PAKET_O:-1}" = 1 ] && { Q -f $T > /dev/null 2>&1; Q -f $T > /dev/null 2>&1; }
JW="select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"email\":\"ali@atolye.local\"}', true), set_config('request.headers', '{\"x-atolye-surum\":\"1.744.48\"}', true)"
ali() { Q -c "begin" -c "$JW" -c "set local role authenticated" -c "$1" -c "commit" 2>&1 | grep '^ERROR' | sed 's/^ERROR: *//' | cut -c1-150 | head -1; }
ac() { ali "select public.stk_varyant_ac('$1'::jsonb)"; }
k() { if [ "$2" = "$3" ]; then gecen=$((gecen + 1)); echo "  ✓ $1"; else acik=$((acik + 1)); echo "  ✗ AÇIK $1 — görülen [$2] · hedef [$3]"; fi; }
say() { Q -c "select count(*) from public.stk_varyant v left join public.stk_olcu o on o.id = v.olcu_id where $1"; }
Q <<'SQL'
set session_replication_role = replica;
insert into public.stk_olcu (id, ad, tur, aktif) values ('olcu-mvwf-36', '36', 'Beden', true), ('olcu-mwng-36', '36', 'Boyut', true), ('olcu-mvwf-37', '37', 'Beden', true), ('olcu-mwng-37', '37', 'Boyut', true),
  ('olcu-mwng-90', '90', 'Boyut', true), ('olcu-mvwf-44', '44', 'Beden', true), ('olcu-cift-a', '50', 'Boyut', true), ('olcu-cift-b', '50', 'Boyut', true);
insert into public.urunler (id, ad, kategori, olcu_tipi, birim) values ('o-sunger', 'SÜNGER', 'Hammadde', 'Boyut', 'adet'), ('o-bot', 'BOT', 'Mamul', 'Beden', 'çift'),
  ('o-celiski', 'ÇELİŞKİLİ', 'Hammadde', 'Beden', 'adet'), ('o-serbest', 'SERBEST', 'Hammadde', 'Serbest', 'metre'), ('o-olcusuz', 'ÖLÇÜSÜZ', 'Hammadde', 'Beden', 'desi');
insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('ov-sunger-36', 'o-sunger', null, 'olcu-mwng-36'), ('ov-celiski-36', 'o-celiski', null, 'olcu-mwng-36'), ('ov-olcusuz', 'o-olcusuz', null, null);
SQL
echo "o-sunucu-sina · şablon $SABLON · Paket Ö $([ "${PAKET_O:-1}" = 1 ] && echo 'KURULU (CRLF, iki kez)' || echo 'YOK')"
r=$(ac '{"urunId":"o-sunger","renk":"Standart","olcu":"36"}'); echo "    Ö1 Boyut ürününde mevcut 36 [Boyut] varyantı, adla istek → ${r:-tamam}"
k "Ö1 Boyut ürününde adla gelen istek MEVCUT Boyut varyantını bulur; yeni varyant açılmaz, ret yok" "$(say "v.urun_id = 'o-sunger'")|${r:+ret}" "1|"
r=$(ac '{"urunId":"o-sunger","renk":"Standart","olcu":"37"}'); echo "    Ö2 Boyut ürününde henüz olmayan 37 (ad iki grupta da tanımlı) → ${r:-tamam}"
k "Ö2 ilk varyant ürünün grubundaki (Boyut) ölçü kaydıyla açılır" "$(say "v.urun_id = 'o-sunger' and o.ad = '37' and o.tur = 'Boyut'")|$(say "v.urun_id = 'o-sunger' and o.tur = 'Beden'")" "1|0"
r=$(ac '{"urunId":"o-bot","renk":"Siyah","olcu":"36"}'); echo "    Ö3 Beden ürününde 36 → ${r:-tamam}"
k "Ö3 Beden ürününde aynı ad Beden kaydına çözülür" "$(say "v.urun_id = 'o-bot' and o.tur = 'Beden' and o.ad = '36'")|$(say "v.urun_id = 'o-bot' and o.tur = 'Boyut'")" "1|0"
r=$(ac '{"urunId":"o-celiski","renk":"Standart","olcu":"36"}'); echo "    Ö4 ürün ölçü tipi Beden, varyantı Boyut kaydında; adla istek → ${r:-tamam}"
k "Ö4 ürün ayarı ile varyant grubu çelişince AÇIK HATA (KR062); hiçbiri seçilmez, varyant sayısı değişmez" "$(echo "$r" | grep -o KR062)|$(say "v.urun_id = 'o-celiski'")" "KR062|1"
r=$(ac '{"urunId":"o-celiski","renk":"Standart","olcuId":"olcu-mwng-36","olcu":"36"}'); echo "    Ö5 aynı çelişki, istek KİMLİKLE gelir → ${r:-tamam}"
k "Ö5 kimlikle gelen istekte de çelişki açık hata" "$(echo "$r" | grep -o KR062)|$(say "v.urun_id = 'o-celiski'")" "KR062|1"
r=$(ac '{"urunId":"o-bot","renk":"Siyah","olcu":"90"}'); echo "    Ö6 Beden ürününde yalnız Boyut grubunda tanımlı ölçü (90) → ${r:-tamam}"
k "Ö6 ad yalnız başka grupta tanımlıysa o kayıt kullanılmaz: açık hata (KR062), varyant açılmaz" "$(echo "$r" | grep -o KR062)|$(say "v.urun_id = 'o-bot' and o.ad = '90'")" "KR062|0"
r=$(ac '{"urunId":"o-sunger","renk":"Standart","olcu":"50"}'); echo "    Ö7 grupta aynı adla iki etkin ölçü kaydı (50) → ${r:-tamam}"
k "Ö7 grup içinde ad belirsizse açık hata (KR061), varyant açılmaz" "$(echo "$r" | grep -o KR061)|$(say "v.urun_id = 'o-sunger' and o.ad = '50'")" "KR061|0"
r=$(ac '{"urunId":"o-bot","renk":"Siyah","olcu":"47"}'); echo "    Ö8 hiçbir grupta tanımlı olmayan ölçü (47) → ${r:-tamam}"
k "Ö8 tanımsız ölçüde eski davranış sürer (serbest ölçü kaydı ve varyant açılır)" "$(say "v.urun_id = 'o-bot' and o.ad = '47' and o.tur = 'serbest'")" "1"
r=$(ac '{"urunId":"o-serbest","renk":"Standart","olcu":"36"}'); echo "    Ö9 ölçü tipi Serbest üründe 36 → ${r:-tamam}"
k "Ö9 grubu olmayan (Serbest) üründe eski kural sürer, ret yok" "$(say "v.urun_id = 'o-serbest'")|${r:+ret}" "1|"
r=$(ac '{"urunId":"o-olcusuz","renk":"Standart","olcu":"Standart"}'); echo "    Ö10 ölçüsüz + renksiz üründe mevcut varyant → ${r:-tamam}"
k "Ö10 ölçüsüz / renksiz üründe mevcut varyant bulunur, yenisi açılmaz" "$(say "v.urun_id = 'o-olcusuz'")|${r:+ret}" "1|"
# eşzamanlı iki İLK istek: Boyut ürününde henüz olmayan 36... (o-yaris): ikisi de adla
Q -c "insert into public.urunler (id, ad, kategori, olcu_tipi, birim) values ('o-yaris', 'YARIŞ', 'Hammadde', 'Boyut', 'adet')" > /dev/null
( Q -c "begin" -c "$JW" -c "set local role authenticated" -c "select public.stk_varyant_ac('{\"urunId\":\"o-yaris\",\"renk\":\"Standart\",\"olcu\":\"36\"}'::jsonb)" -c "reset role" -c "select pg_sleep(3)" -c "commit" > /dev/null 2>&1 ) &
sleep 1; r=$(ac '{"urunId":"o-yaris","renk":"Standart","olcu":"36"}'); wait; echo "    Ö11 eşzamanlı iki ilk istek (aynı ürün, aynı ad) → ikinci: ${r:-tamam}"
k "Ö11 eşzamanlı iki ilk istek tek varyant açar; o da ürünün grubunda (Boyut)" "$(say "v.urun_id = 'o-yaris'")|$(say "v.urun_id = 'o-yaris' and o.tur = 'Boyut'")|${r:+ret}" "1|1|"
if [ "${PAKET_O:-1}" = 1 ]; then
  k "durum sorgusu: YENİ gövde; çelişen ürün bilgi olarak listelenir" "$(Q -f $G/62-o-durum-salt-okur.sql | head -1 | grep -o 'YENİ')|$(Q -f $G/62-o-durum-salt-okur.sql | tail -1 | grep -c 'ÇELİŞKİLİ')" "YENİ|1"
  sed 's/$/\r/' $G/62-o-geri-al.sql > $T; Q -f $T > /dev/null; Q -f $T > /dev/null
  psql -X -q -d postgres -c "drop database if exists ${DB}_o" -c "create database ${DB}_o template $SABLON" 2>/dev/null
  # Şablonda gövde CRLF ile kurulu olabilir; geri alma LF ile yazar — karşılaştırma satır sonu ve boş satır farkından bağımsız.
  duz() { pg_dump -s $1 | grep -v restrict | tr -d '\r' | sed 's/[[:space:]]*$//' | grep -v '^$'; }
  k "geri almadan sonra şema ve fonksiyon gövdeleri paketsiz şablonla aynı (satır sonu / boşluk dışında fark 0 satır)" "$(diff <(duz ${DB}_o) <(duz $DB) | wc -l)" "0"; psql -X -q -d postgres -c "drop database if exists ${DB}_o"
fi
rm -f $T; echo "SONUÇ: $gecen hedefte · $acik AÇIK"
