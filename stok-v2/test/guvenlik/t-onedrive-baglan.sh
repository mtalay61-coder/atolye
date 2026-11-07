#!/usr/bin/env bash
# ONEDRIVE BAĞLAMA SINAMASI (7 Kasım). Ağa çıkmaz: rclone / gh / curl sahtedir.
#   sahte rclone authorize — gerçeğindeki gibi 127.0.0.1:53682'de dinler, /auth → Microsoft'a yönlendirir, /?code&state gelince
#                            state'i denetler ve "--->{jeton}<---" basar. copy / cat yerel klasöre.
#   sahte gh               — variable get/delete, secret set → yerel klasör. "Kullanıcı" ONEDRIVE_KOD'u 3 sn sonra yazar.
#   sahte curl             — graph.microsoft.com/me/drive için hazır yanıt; öteki adresler gerçek curl'e (yalnız 127.0.0.1).
# Kahin: çıkış 0; ONEDRIVE_TOKEN = jeton JSON'u, ONEDRIVE_DRIVE_ID = sürücü kimliği; ONEDRIVE_KOD silindi; BENIOKU.txt yazıldı;
#        iş kaydında jeton, kod ve sürücü kimliği YOK (yalnız ::add-mask:: satırlarında); yanlış state → çıkış ≠ 0, secret yazılmaz;
#        iş hesabı (business) → DUR, secret'lar yazılmış olsa bile kullanılmaz değil — reddedilir ve ONEDRIVE_TOKEN yazılmaz.
set -uo pipefail
cd "$(dirname "$0")"; Y=$(cd ../../yedek && pwd)
IS=$(mktemp -d /tmp/od-sinama.XXXXXX); trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$IS"' EXIT
hata=0; k() { if [ "$2" = "$3" ]; then echo "  ✓ [$1] $2"; else echo "  ✗ [$1] $2 · beklenen $3"; hata=$((hata + 1)); fi; }
mkdir -p "$IS/bin"
GERCEK_CURL=$(command -v curl)
cat > "$IS/bin/rclone" <<'SH'
#!/usr/bin/env bash
case "$1" in
  authorize)
    exec python3 - <<'PY'
import http.server, sys, urllib.parse, threading
STATE = "durum123"
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/auth":
            self.send_response(302); self.send_header("Location", "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x&state=" + STATE); self.end_headers(); return
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
        if q.get("state", [""])[0] != STATE:
            print("Error: state mismatch", flush=True); threading.Thread(target=srv.shutdown).start(); return
        print("Paste the following into your remote machine --->", flush=True)
        print('{"access_token":"ERISIM-JETONU-SIR","token_type":"Bearer","refresh_token":"YENILEME-JETONU-SIR","expiry":"2026-11-07T20:00:00Z"}', flush=True)
        print("<---End paste", flush=True); threading.Thread(target=srv.shutdown).start()
srv = http.server.HTTPServer(("127.0.0.1", 53682), H)
print("NOTICE: If your browser doesn't open automatically go to the following link: http://127.0.0.1:53682/auth?state=durum123", flush=True)
srv.serve_forever()
PY
    ;;
  copy) mkdir -p "$SAHTE/od/AtolyeYedek"; cp "$2" "$SAHTE/od/AtolyeYedek/";;
  cat) cat "$SAHTE/od/AtolyeYedek/$(basename "$2")";;
  *) exit 2;;
esac
SH
cat > "$IS/bin/gh" <<'SH'
#!/usr/bin/env bash
mkdir -p "$SAHTE/var" "$SAHTE/sec"
case "$1 $2" in
  "variable get") [ -f "$SAHTE/var/$3" ] && cat "$SAHTE/var/$3" || exit 1;;
  "variable delete") rm -f "$SAHTE/var/$3"; echo "$3" >> "$SAHTE/silinen";;
  "secret set") cat > "$SAHTE/sec/$3";;
  *) exit 2;;
esac
SH
cat > "$IS/bin/curl" <<SH
#!/usr/bin/env bash
for a in "\$@"; do case "\$a" in https://graph.microsoft.com/*) cat "\$SAHTE/surucu.json"; exit 0;; https://*) echo "sahte curl: dış adres yasak" >&2; exit 7;; esac; done
exec "$GERCEK_CURL" "\$@"
SH
chmod +x "$IS/bin/"*

kos() {  # kos <ad> <ONEDRIVE_KOD değeri> <sürücü türü>
  local ad=$1 deger=$2 tur=$3; export SAHTE="$IS/$ad"; mkdir -p "$SAHTE"
  printf '{"id":"SURUCU-KIMLIGI-SIR","driveType":"%s"}' "$tur" > "$SAHTE/surucu.json"
  ( sleep 3; mkdir -p "$SAHTE/var"; printf '%s' "$deger" > "$SAHTE/var/ONEDRIVE_KOD" ) &
  env PATH="$IS/bin:$PATH" GITHUB_REPOSITORY=sahip/atolye GH_TOKEN=sahte GITHUB_STEP_SUMMARY="$SAHTE/ozet.md" \
    timeout 60 "$Y/onedrive-baglan.sh" > "$SAHTE/kayit.txt" 2>&1; echo $?
}
echo "t-onedrive-baglan · sahte rclone / gh / curl"
k "MUTLU.cikis" "$(kos mutlu 'http://localhost:53682/?code=M.KOD-SIR-1&state=durum123' personal)" 0
S="$IS/mutlu"
k "MUTLU.jeton-saklandi" "$(python3 -c 'import json,sys; j=json.load(open(sys.argv[1])); print(j["refresh_token"])' "$S/sec/ONEDRIVE_TOKEN" 2>/dev/null)" YENILEME-JETONU-SIR
k "MUTLU.surucu-saklandi" "$(cat "$S/sec/ONEDRIVE_DRIVE_ID" 2>/dev/null)" SURUCU-KIMLIGI-SIR
k "MUTLU.kod-degiskeni-silindi" "$([ -f "$S/var/ONEDRIVE_KOD" ] && echo duruyor || echo silindi)" silindi
k "MUTLU.benioku-yazildi" "$(grep -c 'Atölye ERP' "$S/od/AtolyeYedek/BENIOKU.txt" 2>/dev/null)" 1
k "MUTLU.ozet-giris-baglantisi" "$(grep -c 'https://login.microsoftonline.com/' "$S/ozet.md")" 1
k "MUTLU.kayit-BAGLANDI" "$(grep -c '^BAĞLANDI' "$S/kayit.txt")" 1
for sir in ERISIM-JETONU-SIR YENILEME-JETONU-SIR SURUCU-KIMLIGI-SIR KOD-SIR-1; do
  k "GIZLI.$sir yalnız maske satırında" "$(grep -F "$sir" "$S/kayit.txt" | grep -vc '^::add-mask::')" 0
  k "GIZLI.$sir maskelendi" "$([ "$(grep -F "$sir" "$S/kayit.txt" | grep -c '^::add-mask::')" -ge 1 ] && echo evet)" evet
done
k "YANLIS-STATE.cikis" "$([ "$(kos state 'http://localhost:53682/?code=M.KOD-SIR-2&state=baska' personal)" != 0 ] && echo hata)" hata
k "YANLIS-STATE.secret-yok" "$(ls "$IS/state/sec" 2>/dev/null | wc -l)" 0
k "EKSIK-ADRES.cikis" "$([ "$(kos eksik 'M.KOD-SIR-3' personal)" != 0 ] && echo hata)" hata
k "EKSIK-ADRES.mesaj" "$(grep -c 'code / state yok' "$IS/eksik/kayit.txt")" 1
k "IS-HESABI.cikis" "$([ "$(kos is 'http://localhost:53682/?code=M.KOD-SIR-4&state=durum123' business)" != 0 ] && echo hata)" hata
k "IS-HESABI.jeton-yazilmadi" "$([ -f "$IS/is/sec/ONEDRIVE_TOKEN" ] && echo yazildi || echo yok)" yok
echo "── t-onedrive-baglan.sh: $([ $hata = 0 ] && echo temiz || echo "$hata kırmızı") ──"; exit $([ $hata = 0 ] && echo 0 || echo 1)
