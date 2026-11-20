#!/bin/bash
# 24 — YENİ FİRMA KURULUMU (v2) — KABUL TESTİ. İki BOŞ, yalıtılmış Supabase taklidi proje; yalnız yerel PostgreSQL, canlıya dokunmaz.
# Ana proje: atolye_guvenlik kopyası (canlı benzeri, v2 + fiş defteri) + test/ekran/sema-tamamla.sql (uygulamanın yazdığı sütunlar)
# + 23 + kurulum-betigi.sql + t24/zorla.sql (bugün canlıda geçmeyen yolları zorlayan nesneler + ana firmaya özgü İŞARETLİ veri).
# Ölçülen:
#   1) Üretici: Yönetici olmayan çağıramaz; Yönetici ve SQL Editor (jwt yok) üretir.
#   2) Dosya: Supabase SQL Editor uyumlu (editor-icin.py: tek do bloğu + sonuç select'i = 2 ifade); ana firmanın HİÇBİR işaretli
#      verisi geçmez (cari, ürün, tanımlar / firma bilgisi / SMTP, kasa ayarı, sayaç, platform müşterisi, test tablosu satırı); veri
#      satırı yazan adım yalnız üç ayar tablosu için.
#   3) Kurulum (her iki projede, Editor gibi ifade başına ayrı istek): hatasız; dosyanın kendi doğrulaması 18/18 tamam (16 parmak
#      izi kategorisi + ayar + "ayar dışı tablolarda satır yok"); bağımsız ölçü: ana ↔ firma parmak izi birebir; pg_dump şeması
#      (yorumsuz) ana ile birebir (yalnız bilinen görünüm takma ad listesi farkı süzülür, ayrıca sayılır); 23 önkoşulu UYGULANMIŞ.
#      Proje A'da supabase_realtime yayını önceden VAR, B'de YOK (dosya açar) — iki yol.
#   4) Güvenlik ağı: dolu projeye ikinci uygulama hiçbir şeye dokunmadan durur; bozuk adım → "KURULUM DURDU — n. adım", public boş
#      kalır; doğrulama tutmazsa → "DOĞRULAMASI TUTMADI", public boş kalır.
#   5) Giriş (her firmada; rehberdeki ilk yönetici SQL'i): Yönetici yonetici_mi = t, tanımları okur; listede olmayan hesap
#      yonetici_mi = f; anon tabloları okuyamaz; firma Yönetici'si platform yöneticisi değil.
#   6) Stok ve kasa (uygulamanın sunucu işlemleriyle, Yönetici JWT'siyle): ürün + cari + kasa hesabı (kas_yaz), alış faturası + bağlı
#      ödeme makbuzu (fis_kes: stok + cari + kasa tek işlem). Numara sayaçları her firmada SIFIRDAN (…001); stok (stk_stok) ve kasa
#      bakiyesi (kas_hareket) beklenen.
#   7) Veri ayrımı: A'nın ürün / fiş / kasa / cari satırları B'de ve anada yok; B'ninkiler A'da ve anada yok; ananın işaretli verisi
#      A ve B'de yok; numara sayaçları birbirinden bağımsız.
#   8) A6 ve canlının koruma tetikleyicileri (20 Kasım; A6 canlıda): ana canlı gibi A6 düzeltilmiş (15-duzeltme / rls-rol.sql) VE
#      rls-yazma.sql'in silme korumaları kurulu (canlıda 11 Ekim'den beri; hazirla.sh kurmuyordu). Kurulum dosyası bunları TAŞIMALI:
#      her firmada A6 önkoşulu UYGULANMIŞ, koruma tetikleyicileri anayla birebir; davranış: personel ve Yönetici tanımlar kimliğini
#      değiştiremez, satır yoksa jetonlu hesaba yetki yok, yetkisiz personel / listede olmayan 4 ana tabloda silemez, silme
#      yetkili personel ve Yönetici siler; ta6/yetki-sinama.sql firmada AÇIK 0 · BAŞARISIZ 0, E4 / E5 / F3 RET (silme_koruma).
# Kullanım: ./test24.sh   (T24_HOST / T24_PORT; postgres + authenticator şifresiz; atolye_guvenlik hazır — hazirla.sh)
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd); G=$A/stok-v2/guvenlik
H=${T24_HOST:-localhost}; PT=${T24_PORT:-5432}; KAYNAK=${GUVENLIK_DB:-atolye_guvenlik}
export PGHOST=$H PGPORT=$PT PGUSER=postgres
PG="psql -X -q -v ON_ERROR_STOP=1"
IS=$(mktemp -d /tmp/t24.XXXXXX); trap 'rm -rf "$IS"' EXIT
GECTI=0; KALDI=0
sonuc() { if [ "$2" = "$3" ]; then GECTI=$((GECTI+1)); echo "  [GEÇTİ] $1 → $3"; else KALDI=$((KALDI+1)); echo "  [KALDI] $1 → beklenen: $2 · gelen: $3"; fi; }
q() { $PG -d "$1" -Atc "$2"; }
# editor <db> <dosya>: Supabase SQL Editor gibi — editor-icin.py parçaları, her biri AYRI oturum (stdin); çıktı -At '|'
editor() { python3 - "$1" "$2" "$A/stok-v2/editor-icin.py" <<'PY'
import subprocess, sys
db, dosya, ei = sys.argv[1:4]
b = subprocess.run(["python3", ei, "--bol", dosya], capture_output=True)
if b.returncode: sys.stderr.write(b.stderr.decode()); sys.exit(3)
for p in [x for x in b.stdout.split(b"\0") if x.strip()]:
    r = subprocess.run(["psql", "-X", "-q", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", "-"], input=p.decode(), capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(1)
PY
}
# api <db> <claims> <sql> → ok:<çıktı> | ret:izin | ret:rls | hata:<ileti>   (PostgREST yolu: authenticator → rol + JWT)
api() { local rol=authenticated; case "$2" in *'"anon"'*) rol=anon;; esac
  local out; out=$(psql -X -q -U authenticator -d "$1" -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At \
    -c "begin" -c "set local role $rol" -c "select set_config('request.jwt.claims', '$2', true) is null" -c "$3" -c "commit" 2>&1)
  if [ $? -eq 0 ]; then echo "ok:$(echo "$out" | sed -n '2,$p' | grep -v '^COMMIT$' | tr '\n' ' ' | sed 's/ *$//')"; return; fi
  local hat; hat=$(echo "$out" | grep -m1 '^ERROR:')
  case "$hat" in "ERROR:  42501: permission denied"*) echo "ret:izin" ;; "ERROR:  42501: new row violates row-level security"*) echo "ret:rls" ;;
    "ERROR:  42501:"*) echo "ret:yetki" ;; *) echo "hata:${hat#ERROR:  }" ;; esac; }
YON='{"role":"authenticated","email":"ali@atolye.local"}'
YAB='{"role":"authenticated","email":"listede-yok@baska.test"}'
ANON='{"role":"anon"}'

for d in t24_ana t24_a t24_b t24_c t24_d; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
$PG -d postgres -c "create database t24_ana template $KAYNAK" >/dev/null || { echo "kurulum başarısız ($KAYNAK yok — hazirla.sh)"; exit 2; }
q t24_ana "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text)" >/dev/null
PGOPTIONS='-c client_min_messages=warning' $PG -d t24_ana -f $A/test/ekran/sema-tamamla.sql >/dev/null 2>&1 || { echo "kurulum başarısız (sema-tamamla)"; exit 2; }
editor t24_ana $G/23-platform-yonetim.sql >/dev/null 2>&1 || { echo "kurulum başarısız (23)"; exit 2; }
editor t24_ana $A/kurulum-betigi.sql >/dev/null 2>&1 || { echo "kurulum başarısız (kurulum-betigi.sql Editor gibi)"; exit 2; }
PGOPTIONS='-c client_min_messages=warning' $PG -d t24_ana -f $T/zorla.sql >/dev/null || { echo "kurulum başarısız (zorla.sql)"; exit 2; }
# CANLI GİBİ: rls-yazma.sql'in tamamı (silme_koruma: urunler / cariler / siparisler / uretim; yazma_koruma yalnız muhasebe / faturalar
# TABLOYSA — v2'de ikisi de görünüm, kurulmaz). hazirla.sh yalnız fonksiyonu kurar (kos.sh taklidinde bu tablolar yoktu); canlıda
# tetikleyiciler 11 Ekim'den beri var. Kurulum dosyası ana neyse onu kopyalar — korumayı ancak anada varsa sınayabiliriz.
PGOPTIONS='-c client_min_messages=warning' $PG -d t24_ana -f $A/rls-yazma.sql >/dev/null || { echo "kurulum başarısız (rls-yazma.sql)"; exit 2; }
sed -n '1,/ERP tablolarının en küçük/p' $A/stok-v2/test/guvenlik/t19/kur.sql | grep -v 'ERP tablolarının' > $IS/taban.sql
echo "== Ana: $KAYNAK + sema-tamamla + 23 + kurulum-betigi + zorla.sql + rls-yazma.sql · $(git -C $A rev-parse --short HEAD) + çalışma ağacı"
# koruma <db>: canlının koruma tetikleyicileri (tablo:ad:fonksiyon:argümanlar:etkin), sıralı
koruma() { q "$1" "select string_agg(g.tgrelid::regclass::text || ':' || g.tgname || ':' || g.tgfoid::regproc::text || '(' || encode(g.tgargs, 'escape') || ')' || ':' || g.tgenabled::text, ' ' order by g.tgrelid::regclass::text collate \"C\", g.tgname)
  from pg_trigger g where not g.tgisinternal and g.tgname in ('silme_koruma', 'yazma_koruma', 'tanimlar_kullanici_koruma')" | sed 's/\\000/,/g'; }
a6() { editor "$1" $G/24-a6-onkosul-salt-okur.sql 2>/dev/null | awk -F'|' '$1=="99"{print $3}'; }
KORUMA_BEKLENEN="cariler:silme_koruma:yazma_yetkisi_koruma(cari,silme,):O siparisler:silme_koruma:yazma_yetkisi_koruma(siparis,silme,):O tanimlar:tanimlar_kullanici_koruma:tanimlar_kullanici_koruma():O uretim:silme_koruma:yazma_yetkisi_koruma(uretim,silme,):O urunler:silme_koruma:yazma_yetkisi_koruma(stok,silme,):O"
echo "== 0) Ana canlı gibi mi (kurulum dosyası anayı kopyalar)"
sonuc "ana: A6 önkoşulu (düzeltme kaynakta, canlıda 20 Kasım)" "UYGULANMIŞ" "$(a6 t24_ana)"
sonuc "ana: koruma tetikleyicileri (silme_koruma ×4, tanimlar_kullanici_koruma)" "$KORUMA_BEKLENEN" "$(koruma t24_ana)"

echo "== 1) Üretici erişimi"
sonuc "listede olmayan hesap üretemez" "ret:yetki" "$(api t24_ana "$YAB" "select length(public.kurulum_betigi()) > 0")"
sonuc "anon üretemez" "ret:izin" "$(api t24_ana "$ANON" "select length(public.kurulum_betigi()) > 0")"
ana_yon=$(q t24_ana "select jsonb_build_object('role','authenticated','email', lower(k->>'kullaniciAdi') || '@atolye.local')::text from public.tanimlar, jsonb_array_elements(veri->'kullanicilar') k where k->>'rol' = 'Yönetici' limit 1")
sonuc "ERP Yönetici'si üretir" "ok:t" "$(api t24_ana "$ana_yon" "select length(public.kurulum_betigi()) > 1000")"
q t24_ana "select public.kurulum_betigi()" > $IS/kurulum.sql
echo "   kurulum dosyası: $(wc -l < $IS/kurulum.sql) satır · $(grep -c 'adim := ' $IS/kurulum.sql) adım"

echo "== 2) Dosya: Editor uyumu, veri yok"
sonuc "editor-icin.py: uygun, 2 ifade" "2" "$(python3 $A/stok-v2/editor-icin.py --bol $IS/kurulum.sql 2>/dev/null | python3 -c 'import sys; print(len([x for x in sys.stdin.buffer.read().split(b"\0") if x.strip()]))')"
sonuc "dosyada çift-dolar dışında dolar yok" "0" "$(sed 's/\$\$//g' $IS/kurulum.sql | grep -c '\$')"
sonuc "ana firmanın işaretli verisi dosyada yok (SIZINTI-7Q)" "0" "$(grep -c 'SIZINTI-7Q\|sizinti-7q\|987654' $IS/kurulum.sql)"
sonuc "satır yazan adımlar yalnız ayar tabloları (stk_ayar, zamanları, degisiklik, kas_ayar)" "4" "$(grep -c "aciklama := 'ayar satırı" $IS/kurulum.sql)"
sonuc "başka insert / update adımı yok" "0" "$(grep -A1 'adim := ' $IS/kurulum.sql | grep "execute '" | grep -ciE "^ *execute '(insert|update|copy)" | awk -v n=4 '{print $1-n}')"

echo "== 3) İki boş projede kurulum (Editor gibi)"
for f in a b; do
  $PG -d postgres -c "create database t24_$f" >/dev/null
  PGOPTIONS='-c client_min_messages=warning' $PG -d t24_$f -f $IS/taban.sql >/dev/null 2>&1
  [ $f = a ] && q t24_a "create publication supabase_realtime" >/dev/null   # A: yayın hazır (Supabase gibi); B: yok, dosya açar
  editor t24_$f $IS/kurulum.sql > $IS/sonuc-$f.txt 2> $IS/hata-$f.txt
  sonuc "proje $f: hata yok" "" "$(grep -m1 'ERROR' $IS/hata-$f.txt)"
  sonuc "proje $f: dosyanın doğrulaması (18 satır)" "18/18 tamam" "$(grep -c '|tamam$' $IS/sonuc-$f.txt)/$(grep -cE '^[0-9]+\|' $IS/sonuc-$f.txt) tamam"
  sonuc "proje $f: ana ↔ firma parmak izi (bağımsız sorgu)" "$(q t24_ana "select md5(string_agg(kategori || sayi || ozet, ',' order by kategori collate \"C\")) from public.kurulum_parmak_izi()")" \
        "$(q t24_$f "select md5(string_agg(kategori || sayi || ozet, ',' order by kategori collate \"C\")) from public.kurulum_parmak_izi()")"
  # bağımsız ölçü: pg_dump şeması (yorum / oturum ayarı / pg_dump'ın rastgele \restrict satırı dışında; SIRASIZ — yetki dizisinin
  # iç sırası anlamsız) ana ile birebir; tek bilinen fark siparisler_okuma'nın takma ad listesi (bkz. kurulum_parmak_izi notu)
  pg_dump -d t24_ana --schema-only --schema=public | grep -vE '^--|^SET |^SELECT pg_catalog.set_config|^$|^\\(un)?restrict ' | sort > $IS/dump-ana.sql
  pg_dump -d t24_$f --schema-only --schema=public | grep -vE '^--|^SET |^SELECT pg_catalog.set_config|^$|^\\(un)?restrict ' | sort > $IS/dump-$f.sql
  sonuc "proje $f: pg_dump şeması anayla aynı (sırasız; takma ad listesi satırı hariç)" "0" "$(diff <(grep -vE 'jsonb_populate_record\(NULL::public\.siparisler' $IS/dump-ana.sql) <(grep -vE 'jsonb_populate_record\(NULL::public\.siparisler' $IS/dump-$f.sql) | grep -c '^[<>]')"
  sonuc "proje $f: tüm fark yalnız o satır (bir eksik, bir fazla)" "1 1" "$(diff $IS/dump-ana.sql $IS/dump-$f.sql | grep -c '^<') $(diff $IS/dump-ana.sql $IS/dump-$f.sql | grep -c '^>')"
  sonuc "proje $f: 23 önkoşulu" "UYGULANMIŞ" "$(editor t24_$f $G/23-onkosul-salt-okur.sql | grep '^99|' | cut -d'|' -f3)"
  sonuc "proje $f: koruma tetikleyicileri anayla birebir (silme_koruma ×4, tanimlar_kullanici_koruma)" "$KORUMA_BEKLENEN" "$(koruma t24_$f)"
  sonuc "proje $f: A6 gövdeleri (md5: koruma / yetki = düzeltilmiş)" "yeni yeni" "$(editor t24_$f $G/24-a6-onkosul-salt-okur.sql 2>/dev/null | awk -F'|' '$1=="1"||$1=="2"{print $3}' | tr '\n' ' ' | sed 's/ $//')"
  sonuc "proje $f: yayın üyelikleri" "supabase_realtime:cariler,kz_tablo" "$(q t24_$f "select pubname || ':' || string_agg(tablename, ',' order by tablename) from pg_publication_tables where schemaname = 'public' group by pubname")"
  sonuc "proje $f: zorlayıcı nesneler davranıyor (a→z çağrısı, gövde metni, kimlik başlangıcı, hesaplanan sütun)" \
        "41|tek ' tırnak | \$ ve \$\$ ve \$1 ve \\n ters bölü|100|6" \
        "$(q t24_$f "insert into public.kz_tablo (kod, adet) values ('k', 3); select public.kz_a_cagiran(4) || '|' || public.kz_metin() || '|' || (select id || '|' || iki_kat from public.kz_tablo)")"
  q t24_$f "delete from public.kz_tablo" >/dev/null
  sonuc "proje $f: ana verisi yok (SIZINTI-7Q her tabloda 0)" "0" "$(pg_dump -d t24_$f --data-only --schema=public | grep -c 'SIZINTI-7Q\|sizinti-7q\|987654')"
done

echo "== 4) Güvenlik ağı"
once=$(q t24_a "select md5(string_agg(kategori || sayi || ozet, ',')) from public.kurulum_parmak_izi()")
sonuc "dolu projeye ikinci uygulama durur" "public şeması boş değil" "$(editor t24_a $IS/kurulum.sql 2>&1 | grep -m1 -o 'public şeması boş değil')"
sonuc "durduktan sonra parmak izi aynı" "$once" "$(q t24_a "select md5(string_agg(kategori || sayi || ozet, ',')) from public.kurulum_parmak_izi()")"
$PG -d postgres -c "create database t24_c" -c "create database t24_d" >/dev/null
for d in t24_c t24_d; do PGOPTIONS='-c client_min_messages=warning' $PG -d $d -f $IS/taban.sql >/dev/null 2>&1; done
python3 - $IS/kurulum.sql $IS/bozuk-adim.sql $IS/bozuk-dogrulama.sql <<'PY'
import sys, re
s = open(sys.argv[1], encoding="utf-8").read()
# bir görünüm adımını bozan: tanımı olmayan bir tabloyu seçen görünüm
i = s.index("aciklama := 'görünüm "); j = s.index("execute '", i)
open(sys.argv[2], "w", encoding="utf-8").write(s[:j] + "execute 'create view public.bozuk as select * from public.olmayan_tablo';\n    " + s[j:])
# beklenen parmak izinin bir kategorisini değiştiren (fonksiyonlar)
open(sys.argv[3], "w", encoding="utf-8").write(re.sub(r"\('fonksiyonlar', (\d+), '([0-9a-f]{32})'\)", lambda m: "('fonksiyonlar', %s, '%s')" % (m.group(1), "0" * 32), s, count=1))
PY
sonuc "bozuk adım → hangi adımda durduğunu söyler" "KURULUM DURDU" "$(editor t24_c $IS/bozuk-adim.sql 2>&1 | grep -m1 -o 'KURULUM DURDU')"
sonuc "bozuk adımdan sonra public boş (hiçbir şey kalmadı)" "0" "$(q t24_c "select count(*) from pg_class where relnamespace = 'public'::regnamespace")"
sonuc "doğrulama tutmazsa → geri alınır" "KURULUM DOĞRULAMASI TUTMADI (fonksiyonlar)" "$(editor t24_d $IS/bozuk-dogrulama.sql 2>&1 | grep -m1 -o 'KURULUM DOĞRULAMASI TUTMADI ([a-zçğıöşü ]*)')"
sonuc "doğrulama tutmayınca public boş" "0" "$(q t24_d "select count(*) from pg_class where relnamespace = 'public'::regnamespace")"

echo "== 5) Giriş (rehber adım 3: ilk yönetici) ve 6) stok + kasa, 7) veri ayrımı"
GUN=$(q t24_a "select to_char(now() at time zone 'Europe/Istanbul', 'YYMMDD')")
for f in a b; do
  if [ $f = a ]; then URUN="urun-a"; UAD="A Firması Botu"; CARI="cari-a"; CAD="A Tedarikçisi"; ADET=5; FIYAT=100; ODEME=200; else
                      URUN="urun-b"; UAD="B Firması Çantası"; CARI="cari-b"; CAD="B Tedarikçisi"; ADET=7; FIYAT=50; ODEME=120; fi
  q t24_$f "insert into public.tanimlar (id, veri) values ('tekil', jsonb_build_object('girisAktifMi', true, 'kullanicilar', jsonb_build_array(jsonb_build_object(
    'id', 'kullanici-ilk', 'ad', 'Ali', 'kullaniciAdi', 'ali', 'rol', 'Yönetici', 'yetkiler', '{}'::jsonb, 'eposta', 'ali@atolye.local', 'bulutHesabi', true))))
    on conflict (id) do nothing" >/dev/null
  sonuc "$f: A6 önkoşulu (ilk yönetici satırıyla)" "UYGULANMIŞ" "$(a6 t24_$f)"
  sonuc "$f: Yönetici yonetici_mi" "ok:t" "$(api t24_$f "$YON" "select public.yonetici_mi()")"
  sonuc "$f: Yönetici tanımları okur (kullanıcı sayısı)" "ok:1" "$(api t24_$f "$YON" "select jsonb_array_length(veri->'kullanicilar') from public.tanimlar")"
  sonuc "$f: listede olmayan hesap yonetici_mi" "ok:f" "$(api t24_$f "$YAB" "select public.yonetici_mi()")"
  sonuc "$f: anon cari okuyamaz" "ret:izin" "$(api t24_$f "$ANON" "select count(*) from public.cariler")"
  sonuc "$f: firma Yönetici'si platform yöneticisi değil" "ok:f" "$(api t24_$f "$YON" "select public.platform_yonetici_mi()")"
  sonuc "$f: ürün + cari (uygulama gibi REST ekleme)" "ok:" "$(api t24_$f "$YON" "insert into public.urunler (id, ad) values ('$URUN', '$UAD'); insert into public.cariler (id, unvan) values ('$CARI', '$CAD')")"
  sonuc "$f: kasa hesabı (kas_yaz)" "ok:t" "$(api t24_$f "$YON" "select public.kas_yaz('{\"hesaplar\": [{\"id\": \"K1\", \"tur\": \"kasa\", \"veri\": {\"ad\": \"Merkez Kasa\", \"paraBirimi\": \"TRY\"}}]}') is not null")"
  # fiş: uygulamanın fis_kes yolu (PostgREST gibi authenticator → authenticated + Yönetici JWT); t24/fis.sql
  r=$(psql -X -q -U authenticator -d t24_$f -v ON_ERROR_STOP=1 -At -v f=$f -v urun=$URUN -v cari=$CARI -v adet=$ADET -v fiyat=$FIYAT -v odeme=$ODEME \
       -c "begin" -c "set local role authenticated" -c "select set_config('request.jwt.claims', '$YON', true) is null" -f $T/fis.sql -c "commit" 2>&1 | sed -n '2p')
  r="ok:$r"
  sonuc "$f: alış faturası + bağlı ödeme (fis_kes) — numara sayacı sıfırdan" "ok:AF-${GUN}001" "$r"
  sonuc "$f: stok (stk_stok, Yönetici görür)" "ok:Siyah:$ADET" "$(api t24_$f "$YON" "select renk_ad || ':' || miktar::int from public.stk_stok where urun_id = '$URUN'")"
  sonuc "$f: kasa bakiyesi (kas_hareket)" "-$ODEME" "$(q t24_$f "select sum(case when veri->>'yon' = 'Giriş' then (veri->>'tutar')::numeric else -(veri->>'tutar')::numeric end)::int from public.kas_hareket where hesap_id = 'K1' and not iptal")"
  sonuc "$f: makbuz numarası da sıfırdan" "ÖD-${GUN}001" "$(q t24_$f "select bagli_fis from public.stk_fis where id = 'AF-${GUN}001'")"
  sonuc "$f: listede olmayan hesap fiş kesemez (yetki reddi, 42501)" "ret:yetki" "$(api t24_$f "$YAB" "select public.fis_kes(jsonb_build_object('istek', 'yab-$f', 'fis', jsonb_build_object('aile', 'stok', 'tur', 'Alış', 'onek', 'AF'), 'stok', jsonb_build_object('satirlar', jsonb_build_array(jsonb_build_object('id', 'yab-h', 'urunId', '$URUN', 'renk', 'Siyah', 'miktar', 1)))))")"
  sonuc "$f: reddedilen denemeden sonra fiş sayısı değişmedi" "2" "$(q t24_$f "select count(*) from public.stk_fis")"
done
echo "   — veri ayrımı"
sayim() { q "$1" "select (select count(*) from public.urunler where id like 'urun-$2%') || ' ' || (select count(*) from public.cariler where id like 'cari-$2%') || ' '
  || (select count(*) from public.stk_hareket where id like 'h-$2-%') || ' ' || (select count(*) from public.kas_hareket where id like 'k-$2-%') || ' '
  || (select count(*) from public.car_hareket where id like 'c-$2-%')"; }
sonuc "A'nın verisi A'da (ürün cari stok kasa cari-hareket)" "1 1 1 1 2" "$(sayim t24_a a)"
sonuc "A'nın verisi B'de yok" "0 0 0 0 0" "$(sayim t24_b a)"
sonuc "A'nın verisi anada yok" "0 0 0 0 0" "$(sayim t24_ana a)"
sonuc "B'nin verisi B'de" "1 1 1 1 2" "$(sayim t24_b b)"
sonuc "B'nin verisi A'da yok" "0 0 0 0 0" "$(sayim t24_a b)"
sonuc "B'nin verisi anada yok" "0 0 0 0 0" "$(sayim t24_ana b)"
sonuc "ananın işaretli verisi A ve B'de yok" "0 0" "$(pg_dump -d t24_a --data-only | grep -c 'SIZINTI-7Q') $(pg_dump -d t24_b --data-only | grep -c 'SIZINTI-7Q')"
sonuc "B'nin stoğu A'nın stoğundan bağımsız (A 5, B 7)" "5 7" "$(q t24_a "select miktar::int from public.stk_stok where urun_id = 'urun-a'") $(q t24_b "select miktar::int from public.stk_stok where urun_id = 'urun-b'")"

echo "== 8) A6 ve silme korumaları — davranış (her firmada; ana firmanın değil, KURULUM DOSYASININ kurduğu kod)"
PER='{"role":"authenticated","email":"personel@atolye.local"}'
SIL='{"role":"authenticated","email":"silici@atolye.local"}'
for f in a b; do
  # personel: hiçbir modül yetkisi yok; silici: 4 modülde yalnız "silme". Ayrıca ta6/yetki-sinama.sql'in kişileri (deneme = Yönetici).
  q t24_$f "update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri->'kullanicilar') || jsonb_build_array(
      jsonb_build_object('id','k-per','ad','Personel','kullaniciAdi','personel','rol','Personel','yetkiler','{}'::jsonb,'eposta','personel@atolye.local'),
      jsonb_build_object('id','k-sil','ad','Silici','kullaniciAdi','silici','rol','Personel','eposta','silici@atolye.local','yetkiler',
        '{\"stok\": {\"silme\": true}, \"cari\": {\"silme\": true}, \"siparis\": {\"silme\": true}, \"uretim\": {\"silme\": true}}'::jsonb),
      jsonb_build_object('id','k-den','ad','Deneme','kullaniciAdi','deneme','rol','Yönetici','yetkiler','{}'::jsonb,'eposta','deneme@atolye.local')))
    where id = 'tekil';
    insert into auth.users (email) select e from unnest(array['personel@atolye.local', 'deneme@atolye.local', 'listedeyok@atolye.local']) e
      where not exists (select 1 from auth.users u where u.email = e);
    -- D1 (günlük silme) satır düzeyi korumayı ölçer: boş günlükte tetikleyici hiç çalışmaz, '0 satır' sahte geçer → bir satır
    insert into public.gunluk (id) values ('t24-g') on conflict do nothing" >/dev/null
  # A6: kimlik değişikliği herkese kapalı (jetonlu); satır yoksa jetonlu hesaba yetki yok
  sonuc "$f: personel tanımlar kimliğini değiştiremez (A6)" "ret:yetki" "$(api t24_$f "$PER" "update public.tanimlar set id = 'ele-gecir' where id = 'tekil'")"
  sonuc "$f: Yönetici de değiştiremez (A6)" "ret:yetki" "$(api t24_$f "$YON" "update public.tanimlar set id = 'ele-gecir' where id = 'tekil'")"
  sonuc "$f: personel yetki_var_mi(muhasebe, kaydetme)" "ok:f" "$(api t24_$f "$PER" "select public.yetki_var_mi(array['muhasebe'], 'kaydetme')")"
  q t24_$f "update public.tanimlar set id = 'bakim' where id = 'tekil'" >/dev/null   # jetonsuz bakım (Editor) serbest
  sonuc "$f: satır yokken Yönetici'ye bile yetki yok (A6)" "ok:f" "$(api t24_$f "$YON" "select public.yetki_var_mi(array['muhasebe'], 'kaydetme')")"
  sonuc "$f: satır yokken personele yetki yok (A6)" "ok:f" "$(api t24_$f "$PER" "select public.yetki_var_mi(array['muhasebe'], 'kaydetme')")"
  q t24_$f "update public.tanimlar set id = 'tekil' where id = 'bakim'" >/dev/null
  sonuc "$f: satır geri gelince Yönetici yetkili" "ok:t" "$(api t24_$f "$YON" "select public.yetki_var_mi(array['muhasebe'], 'kaydetme')")"
  # silme_koruma: her tabloda bir satır; yetkisiz ve listede olmayan silemez, silici ve Yönetici siler
  for t in urunler:ad cariler:unvan siparisler:id uretim:id; do
    tb=${t%%:*}; sut=${t##*:}
    q t24_$f "insert into public.$tb (id$([ $sut = id ] || echo ", $sut")) values ('sil-per'$([ $sut = id ] || echo ", 'x'")), ('sil-yab'$([ $sut = id ] || echo ", 'x'")), ('sil-sil'$([ $sut = id ] || echo ", 'x'")), ('sil-yon'$([ $sut = id ] || echo ", 'x'"))" >/dev/null
    sonuc "$f: $tb — personel (silme yetkisi yok) silemez" "ret:yetki" "$(api t24_$f "$PER" "delete from public.$tb where id = 'sil-per'")"
    sonuc "$f: $tb — listede olmayan silemez" "ret:yetki" "$(api t24_$f "$YAB" "delete from public.$tb where id = 'sil-yab'")"
    sonuc "$f: $tb — silme yetkili personel siler" "ok:" "$(api t24_$f "$SIL" "delete from public.$tb where id = 'sil-sil'")"
    sonuc "$f: $tb — Yönetici siler" "ok:" "$(api t24_$f "$YON" "delete from public.$tb where id = 'sil-yon'")"
    sonuc "$f: $tb — kalan sınama satırları (yalnız reddedilenler)" "sil-per,sil-yab" "$(q t24_$f "select string_agg(id, ',' order by id) from public.$tb where id like 'sil-%'")"
    q t24_$f "alter table public.$tb disable trigger user; delete from public.$tb where id like 'sil-%'; alter table public.$tb enable trigger user" >/dev/null
  done
  # ta6/yetki-sinama.sql (canlı / deneme projesinde kullanılan sıkı sınama; her deneme geri alınır) — tek oturum (SQL Editor gibi)
  ys=$($PG -d t24_$f -At -F '|' < $A/stok-v2/test/guvenlik/ta6/yetki-sinama.sql 2>&1)
  sonuc "$f: yetki-sinama.sql özeti (AÇIK / BAŞARISIZ)" "AÇIK: 0 · BAŞARISIZ: 0" "$(echo "$ys" | awk -F'|' '$1=="ZZ"{print $3}' | sed 's/ · BİLİNEN.*//')"
  sonuc "$f: E4 / E5 / F3 (cari / ürün silme) artık RET — silme_koruma" "UYGUN UYGUN UYGUN" "$(for r in E4 E5 F3; do echo "$ys" | awk -F'|' -v r=$r '$1==r{print $6}'; done | tr '\n' ' ' | sed 's/ $//')"
  sonuc "$f: A6 / A6b / Y7 (kimlik değiştirme) RET" "UYGUN UYGUN UYGUN" "$(for r in A6 A6b Y7; do echo "$ys" | awk -F'|' -v r=$r '$1==r{print $6}'; done | tr '\n' ' ' | sed 's/ $//')"
  echo "$ys" > $IS/yetki-sinama-$f.txt
  [ -n "${T24_SINAMA_DOK:-}" ] && cp $IS/yetki-sinama-$f.txt "$T24_SINAMA_DOK-$f.txt"
  sonuc "$f: sınamadan sonra tanımlar satırı tekil ve 4 kullanıcı" "tekil 4" "$(q t24_$f "select string_agg(id, ',') || ' ' || max(jsonb_array_length(veri->'kullanicilar')) from public.tanimlar")"
done

[ -n "${T24_TUT:-}" ] || for d in t24_ana t24_a t24_b t24_c t24_d; do $PG -d postgres -c "drop database if exists $d" >/dev/null 2>&1; done
echo "── test24: $GECTI geçti, $KALDI kaldı ──"; [ $KALDI = 0 ]
