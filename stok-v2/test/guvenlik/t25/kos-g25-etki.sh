#!/usr/bin/env bash
# G-25'İN 1.744.36'YA ETKİSİ — EKRANDAN (24 Kasım). Yalnız yerel; Supabase'e bağlanmaz. Önkoşul: test25.sh'ın kurduğu atolye_t25_taban.
# Her kullanıcı × {G-25'siz, G-25'li} için tabanın TAZE kopyası → test/ekran/ekran-g25-etki.js (A maaş şeridi, B mesai, C maaş
# değişikliği). Beklenti YAZILMAZ: iki kopyadaki sonuç yan yana yazılır, "DURUR" = bugün yapabildiği işi G-25'le yapamıyor.
# Kullanıcılar (t25/tohum.sql + bu dosyanın eklediği Sefci):
#   Ali (Yönetici) · Muhasip (cari + muhasebe k/s) · Sefci (cari GÖRÜNTÜLEME + üretim / stok / fisler KAYDETME — cari kartını açabilen,
#   PARA kaydetmesi olmayan atölye şefi) · Uretimci (Üretim rolü: üretim + stok k; cari görüntülemesi YOK) · Deniz (cari / muhasebe
#   yalnız görüntüleme)
set -uo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1) ;; *) echo "PGHOST=localhost gerekli"; exit 2;; esac
cd "$(dirname "$0")/../../../.."
KOK=$(pwd); G=stok-v2/guvenlik
CIK=${T25_ETKI_CIKTI:-/tmp/t25-etki}; rm -rf "$CIK"; mkdir -p "$CIK"
psql -X -At -d atolye_t25_taban -c "select 1" > /dev/null 2>&1 || { echo "atolye_t25_taban yok — önce t25/test25.sh"; exit 2; }
ed() {
  python3 stok-v2/editor-icin.py --bol "$2" | node -e '
    const { spawnSync } = require("child_process");
    const ps = require("fs").readFileSync(0, "utf8").split("\0").filter(Boolean);
    for (const p of ps) { const r = spawnSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", process.argv[1], "-c", p], { encoding: "utf8" });
      if (r.status !== 0) { process.stderr.write(r.stderr); process.exit(1); } }' "$1"
}
SEFCI='{"kullaniciAdi": "Sefci", "rol": "Kullanıcı", "yetkiler": {"cari": {"goruntuleme": true}, "uretim": {"goruntuleme": true, "kaydetme": true}, "stok": {"goruntuleme": true, "kaydetme": true}, "fisler": {"goruntuleme": true, "kaydetme": true}, "siparis": {"goruntuleme": true}}}'
for kip in once sonra; do for u in Ali Muhasip Sefci Uretimci Deniz; do
  db=atolye_t25_etki_${kip}_$(echo "$u" | tr 'A-Z' 'a-z')
  psql -X -q -d postgres -c "drop database if exists $db" -c "create database $db template atolye_t25_taban" || exit 2
  psql -X -q -d "$db" -c "update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || '[$SEFCI]'::jsonb) where id = 'tekil'" || exit 2
  if [ $kip = sonra ]; then ed "$db" $G/25-cari-yetki-uygula.sql > /dev/null || { echo "uygulama düştü ($db)"; exit 2; }; fi
  EKRAN_DB=$db EKRAN_KULLANICI=$u ISTEMCI_DIZIN="$KOK" timeout 240 node test/ekran/ekran-g25-etki.js > "$CIK/$kip-$u.json" 2> "$CIK/$kip-$u.err"
  echo "$kip $u: $(cut -c1-400 "$CIK/$kip-$u.json")"
done; done
node - "$CIK" <<'JS'
const fs = require("fs"), d = process.argv[2];
const oku = (k, u) => { try { return JSON.parse(fs.readFileSync(`${d}/${k}-${u}.json`, "utf8")); } catch { return { olumcul: "çıktı yok" }; } };
const kisa = (s) => (s || "").replace(/\s+/g, " ").slice(0, 110);
console.log("\n══ ETKİ TABLOSU (G-25'siz → G-25'li) ══");
for (const u of ["Ali", "Muhasip", "Sefci", "Uretimci", "Deniz"]) {
  const a = oku("once", u), b = oku("sonra", u);
  const durum = (x, y) => (x && !y ? "DURUR" : x === y ? (x ? "aynı (yapabiliyor)" : "aynı (zaten yapamıyor)") : "AÇILIR?");
  console.log(`\n${u}${a.olumcul || b.olumcul ? `  ölümcül: ${a.olumcul || ""} ${b.olumcul || ""}` : ""}`);
  console.log(`  A maaş şeridi: görünür ${a.A_serit_gorunur}/${b.A_serit_gorunur} · MAŞ yazıldı ${a.A_mas_yazildi}/${b.A_mas_yazildi} → ${durum(a.A_mas_yazildi > 0, b.A_mas_yazildi > 0)}`);
  console.log(`      G-25'li ekran: şerit sonra ${b.A_serit_sonra} · bildirim "${kisa(b.A_bildirim)}"`);
  console.log(`  B mesai: menüde Cari ${a.B_menude_cari}/${b.B_menude_cari} · kart ${a.B_kart_bulundu}/${b.B_kart_bulundu} · panel ${a.B_panel}/${b.B_panel} · MS yazıldı ${a.B_ms_yazildi}/${b.B_ms_yazildi} → ${durum(a.B_ms_yazildi > 0, b.B_ms_yazildi > 0)}`);
  console.log(`      G-25'li ekran: saat kutusu "${b.B_saat_kutusu_sonra}" · bildirim "${kisa(b.B_bildirim)}"`);
  console.log(`  C maaş değişikliği: sunucu ${a.C_sunucu_once}→${a.C_sunucu_sonra} / ${b.C_sunucu_once}→${b.C_sunucu_sonra} → ${durum(a.C_sunucu_sonra === 31000, b.C_sunucu_sonra === 31000)}`);
  console.log(`      G-25'li ekran: kutu "${b.C_ekran_sonra}" · bildirim "${kisa(b.C_bildirim)}" · inceleme "${kisa(b.C_inceleme_seridi)}" · yenileme sonrası ekran "${b.C_yenileme_sonrasi_ekran}" sunucu ${b.C_yenileme_sonrasi_sunucu}`);
  for (const [k, x] of [["G-25'siz", a], ["G-25'li", b]]) { const h = ["A_hata", "B_hata", "C_hata"].filter((f) => x[f]).map((f) => `${f}: ${x[f]}`);
    if (h.length || (x.sayfa_hatalari || []).length) console.log(`      ${k} hata: ${h.join(" · ")} ${(x.sayfa_hatalari || []).join(" | ")}`); }
}
JS
