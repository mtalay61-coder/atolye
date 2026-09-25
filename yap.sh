#!/usr/bin/env bash
# TEK KOMUT — src/ değiştikten sonra çalıştırılacak tam akış.
#
# Neden tek betik: bölünmeden sonra "birleştirmeyi unutup eski atolye-erp.jsx'i paketlemek"
# yeni bir sessiz hata sınıfı. Adımları ayrı ayrı yazmak o riski açık bırakıyordu.
# Derleme kontrolü de burada: "denetimler temiz" deyip açılmayan dosya göndermek bir kez oldu (v1.17.1).
set -e
KOK="$(cd "$(dirname "$0")" && pwd)"
cd "$KOK"

node tema-gom.js
node birlestir.js src atolye-erp.jsx
./kontrol.sh atolye-erp.jsx
./oludenetim.sh atolye-erp.jsx

SURUM="$(node -e 'console.log(require("fs").readFileSync("atolye-erp.jsx","utf8").match(/const SURUM = "([^"]+)"/)[1])')"
CIKTI="atolye-erp-v${SURUM}.html"
node paketle.js atolye-erp.jsx "$CIKTI"

# Paketlenen dosya GERÇEKTEN derleniyor mu — import satırları çıkarılıp gövde Function'a veriliyor.
node -e '
const fs = require("fs");
const kod = fs.readFileSync(process.argv[1], "utf8")
  .match(/<script type="module">([\s\S]*?)<\/script>/)[1]
  .replace(/^import[\s\S]*?from "[^"]+";\s*$/gm, "");
try { new Function(kod); console.log("── derleme OK ──"); }
catch (e) { console.log("── DERLEME HATASI: " + e.message + " ──"); process.exit(1); }
' "$CIKTI"

echo "── hazır: $CIKTI ──"
