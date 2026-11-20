#!/bin/bash
# CANLI BENZERİ ANA (atolye_canli) — Faz 0.4 canlı envanteriyle hizalanmış yerel kopya. Yalnız yerel PostgreSQL; canlıya dokunmaz.
# Neden ayrı: hazirla.sh bilerek SIKILAŞTIRMA ÖNCESİ hâli kurar (kos-guvenlik.sh "önce / sonra" ölçer); canlı ise bugün
# sıkılaştırılmış (search_path'ler, istemci korumaları) ve birkaç noktada yerel taklitten farklı. Yeni firma kurulum dosyası anayı
# kopyaladığı için (t24) ana CANLININ AYNISI olmalı — aksi hâlde testler canlıda olmayan bir hâli sınar.
# Kaynak: kos-guvenlik.sh'ın bıraktığı atolye_guvenlik (0 + 0b + 2-sikilastir uygulanmış). Bu betik onu DEĞİŞTİRMEZ; kopyalar.
# Canlı envanteri: t24/sonuc-faz04-envanter-canli-2026-11-20.txt (24-faz04-koruma-envanteri-salt-okur.sql, 20 Kasım).
# Hizalama (her biri canlı envanterindeki bir farkı kapatır):
#  1) rls-yazma.sql'in TAMAMI: silme_koruma ×4 (urunler / cariler / siparisler / uretim; argüman ve etkinlik canlıyla birebir).
#     yazma_koruma KURULMAZ: muhasebe / faturalar görünüm (v2); rls-yazma.sql yalnız tabloysa kurar. Canlıda da yok, eski_* yok.
#  2) gorevler / modeller: canlıda liste geçişinde görünüme çevrildi (stk_ayar.liste_tablolari 7 liste); yerel taklitte bu iki
#     tablo hiç yoktu → lst_gecis'in aynı ifadeleri (eski_* bırakmadan; canlıda da yok).
#  3) gun_sonu_gonderim: canlıda gun-sonu.sql ile (RLS açık, okuma politikası, authenticated IUD, istemci koruması). Yerelde yalnız
#     bir test geçici açıyordu. Yalnız tablo kısmı (pg_cron / pg_net zamanlaması kurulum dosyasının kapsamında değil).
#  4) Görünüm yetkileri: canlıda stk_stok, stk_eski_hareketler_g, stk_eski_varyantlar_g için authenticated IUD (rls-kimlik.sql'in
#     "grant all on all tables" yeniden çalıştırılmasından). Etkisiz: görünüm yazılabilir değil ya da alttaki tablo kapalı (t24 § 8).
# KALAN BİLİNEN FARK (şeması depoda yok, UYDURULMADI): canlıdaki eski / site tabloları cekler, hesaplar, cop, icerik, medya, onaylar,
# profil, cek_gorselleri ve surum_arttir / guncelleme_yaz tetikleyicileri (*_surum, icerik_guncelleme: BEFORE UPDATE, koruma
# değil). Canlıdan üretilen dosyanın boş projede doğrulanması (Faz 4) bunları kapsar. Karşılaştırma bu kümeyi AYRI sayar;
# başka her fark kırmızıdır.
# Kullanım: ./canli-benzeri.sh   (önce stok-v2/test/guvenlik/kos-guvenlik.sh; PGHOST / PGPORT / PGUSER)
set -u
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd)
KAYNAK=${GUVENLIK_DB:-atolye_guvenlik}; DB=${T24_KAYNAK:-atolye_canli}
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
sik=$(psql -X -At -d "$KAYNAK" -c "select count(*) from pg_proc where proname = 'fis_satir_koru' and proconfig is not null" 2>/dev/null)
[ "$sik" = 1 ] || { echo "canli-benzeri: $KAYNAK sıkılaştırılmış değil (ya da yok) — önce stok-v2/test/guvenlik/kos-guvenlik.sh"; exit 2; }
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB template $KAYNAK" > /dev/null || exit 2
# önceki testlerin bıraktığı geçici tablo (t-servis-kapi.js gun_sonu_gonderim'i RLS'siz açar) — canlıdaki tanımla yeniden kurulur
q -c "drop table if exists public.gun_sonu_gonderim" > /dev/null
PGOPTIONS='-c client_min_messages=warning' q -f $A/rls-yazma.sql > /dev/null || { echo "canli-benzeri: rls-yazma.sql düştü"; exit 2; }
q -c "do \$d\$ declare t text; begin
  foreach t in array array['gorevler', 'modeller'] loop
    continue when to_regclass('public.' || t) is not null;
    execute format('create view public.%I with (security_invoker = true) as select %L::text as id, public.lst_belge(%L) as veri', t, 'tekil', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);   -- canlı: IUD (etkisiz, görünüm)
    -- lst_gecis'in sırası (canlı: teklifler,faturalar,koliler,gorevler,modeller,fis_defteri,mesajlar)
    update public.stk_ayar set liste_tablolari = array(select x from unnest(array['teklifler', 'faturalar', 'koliler', 'gorevler', 'modeller',
      'fis_defteri', 'mesajlar']) with ordinality u(x, n) where x = any(liste_tablolari || array[t]) order by n) where id = 'tekil';
  end loop; end \$d\$;" > /dev/null || { echo "canli-benzeri: gorevler / modeller düştü"; exit 2; }
awk '/create extension if not exists pg_cron/{exit} {print}' $A/gun-sonu.sql | PGOPTIONS='-c client_min_messages=warning' q > /dev/null \
  || { echo "canli-benzeri: gun-sonu.sql (tablo) düştü"; exit 2; }
q -c "grant select, insert, update, delete on public.gun_sonu_gonderim to authenticated; revoke truncate on public.gun_sonu_gonderim from authenticated;
      drop trigger if exists stk_istemci_koru on public.gun_sonu_gonderim;
      create trigger stk_istemci_koru before insert or update or delete on public.gun_sonu_gonderim for each row execute function public.stk_istemci_koru();
      grant select, insert, update, delete on public.stk_stok, public.stk_eski_hareketler_g, public.stk_eski_varyantlar_g to authenticated;" > /dev/null \
  || { echo "canli-benzeri: yetki hizalaması düştü"; exit 2; }

# KARŞILAŞTIRMA: aynı envanter sorgusu → canlı çıktıyla satır satır (Z özetleri hariç; bilinen fark kümesi ayrı)
IS=$(mktemp -d /tmp/canli-benzeri.XXXXXX); trap 'rm -rf "$IS"' EXIT
psql -X -At -F '|' -d "$DB" -f $A/stok-v2/guvenlik/24-faz04-koruma-envanteri-salt-okur.sql > $IS/yerel.txt || { echo "canli-benzeri: envanter düştü"; exit 2; }
python3 - "$T/sonuc-faz04-envanter-canli-2026-11-20.txt" "$IS/yerel.txt" <<'PY'
import sys, re
def oku(p):
    d = {}
    for l in open(p, encoding="utf-8"):
        if l.startswith("#") or l.startswith("Z|") or not l.strip(): continue
        b, n, v = l.rstrip("\n").split("|", 2); d[(b, n)] = v
    return d
c, y = oku(sys.argv[1]), oku(sys.argv[2])
ESKI = {"cek_gorselleri", "cekler", "cop", "hesaplar", "icerik", "medya", "onaylar", "profil"}
def bilinen(b, n):
    if b == "R": return n in ESKI
    if b == "T":
        t, ad = n.split(".", 1)
        return t in ESKI or re.fullmatch(r"[a-z_]+_surum", ad) is not None
    if b == "F": return n in ("guncelleme_yaz()", "surum_arttir()")
    return False
fark, bil = [], 0
for k in sorted(set(c) | set(y)):
    if c.get(k) == y.get(k): continue
    if k in c and k not in y and bilinen(*k): bil += 1; continue
    fark.append((k, c.get(k, "(canlıda yok)"), y.get(k, "(yerelde yok)")))
# İfade (20 Kasım kararı): "N satır eşleşti, M satır kapsam dışında" — TAM ŞEMA EŞİTLİĞİ DEĞİL (o Faz 4'te ölçülür)
print(f"canli-benzeri: {sum(1 for k in c if k in y and c[k] == y[k])} satır eşleşti, {bil} satır kapsam dışında (eski / site tabloları, *_surum; tam şema eşitliği değil) · beklenmeyen fark {len(fark)}")
for (b, n), cv, yv in fark: print(f"  [FARK] {b} {n}\n     canlı: {cv}\n     yerel: {yv}")
sys.exit(1 if fark else 0)
PY
