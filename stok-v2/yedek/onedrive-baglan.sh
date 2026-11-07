#!/usr/bin/env bash
# ONEDRIVE'I BAĞLA — BİR KEZ (7 Kasım; GECE-YEDEK-KURULUM.md § 3). .github/workflows/onedrive-baglan.yml çalıştırır; bilgisayar
# gerekmez, her şey telefondan yapılır:
#   1. Bu iş GitHub makinesinde "rclone authorize onedrive"u başlatır ve Microsoft giriş bağlantısını iş kaydına yazar.
#   2. Kullanıcı bağlantıyı telefonda açar, kişisel Microsoft hesabıyla girer, izin verir. Tarayıcı "localhost" adresine döner ve
#      "bağlanılamıyor" der — BEKLENEN bu. Kullanıcı adres çubuğundaki adresin TAMAMINI kopyalar.
#   3. Kullanıcı deponun Settings › Secrets and variables › Actions › Variables sekmesinde ONEDRIVE_KOD adlı değişken açar,
#      değer olarak o adresi yapıştırır.
#   4. Bu iş değişkeni görür (5 sn'de bir bakar, en çok 15 dk), adresi rclone'a iletir, erişim jetonunu alır, değişkeni HEMEN siler.
#      Jeton ve OneDrive sürücü kimliği GitHub secret olarak saklanır (ONEDRIVE_TOKEN, ONEDRIVE_DRIVE_ID); "AtolyeYedek" klasörü
#      açılıp okunarak bağlantı sınanır.
# GÜVENLİK: depo herkese açık. Giriş bağlantısı tek başına bir şey vermez (izin kodu yalnız bu makinedeki rclone'a döner, o da
# yalnız ONEDRIVE_KOD değişkeninden — değişkeni yalnız depo yöneticisi yazabilir). Kod, jeton ve sürücü kimliği iş kaydına
# YAZILMAZ ("::add-mask::" ile de gizlenir). Değişken kullanıldığı an silinir; kod zaten tek kullanımlıktır ve dakikalar içinde
# geçersizleşir. GH_TOKEN = YEDEK_PAT (yalnız bu depo; Secrets + Variables okuma/yazma).
set -euo pipefail
R=${GITHUB_REPOSITORY:?GITHUB_REPOSITORY gerekli}; : "${GH_TOKEN:?YEDEK_PAT tanımlı değil (kurulum § 2)}"
IS=$(mktemp -d); umask 077; trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$IS"' EXIT
OZET=${GITHUB_STEP_SUMMARY:-/dev/null}
gh variable delete ONEDRIVE_KOD --repo "$R" > /dev/null 2>&1 || true   # önceki denemeden kalan kod kullanılmasın

rclone authorize onedrive --auth-no-open-browser > "$IS/yetki.txt" 2>&1 & RC=$!
yerel=""
for _ in $(seq 1 60); do yerel=$(grep -oE 'http://127\.0\.0\.1:53682/auth\?state=[A-Za-z0-9_-]+' "$IS/yetki.txt" | head -1 || true); [ -n "$yerel" ] && break; sleep 1; done
[ -n "$yerel" ] || { echo "DUR: rclone giriş bağlantısı üretmedi."; exit 1; }
giris=$(curl -s -o /dev/null -w '%{redirect_url}' "$yerel")
case "$giris" in https://login.microsoftonline.com/*|https://login.live.com/*) ;; *) echo "DUR: beklenmeyen giriş adresi."; exit 1;; esac
{
  echo "## OneDrive'ı bağla"
  echo "1. Bu bağlantıyı telefonda açın ve kişisel Microsoft hesabınızla girip **izin verin** (Accept / Kabul et):"
  echo "   $giris"
  echo "2. Sayfa \"bağlanılamıyor / localhost\" diyecek — bu beklenen. Adres çubuğundaki adresin **tamamını** kopyalayın"
  echo "   (http://localhost:53682/?code=… ile başlar)."
  echo "3. Deponun Settings › Secrets and variables › Actions › **Variables** sekmesinde **New repository variable**:"
  echo "   Name: ONEDRIVE_KOD · Value: kopyaladığınız adres → Add variable."
  echo "4. Bu iş kodu birkaç saniye içinde alır ve değişkeni kendisi siler. 15 dakika içinde yapılmalı."
} | tee -a "$OZET"

kod=""
for _ in $(seq 1 180); do
  kod=$(gh variable get ONEDRIVE_KOD --repo "$R" 2>/dev/null || true)
  [ -n "$kod" ] && break; sleep 5
done
[ -n "$kod" ] || { echo "DUR: 15 dakika içinde ONEDRIVE_KOD değişkeni açılmadı. İşi yeniden çalıştırın."; exit 1; }
echo "::add-mask::$kod"
gh variable delete ONEDRIVE_KOD --repo "$R" > /dev/null 2>&1 || echo "UYARI: ONEDRIVE_KOD silinemedi — Variables sekmesinden elle silin."
sorgu=${kod#*\?}
case "$sorgu" in *code=*state=*|*state=*code=*) ;; *) echo "DUR: yapıştırılan adreste code / state yok (adresin tamamı kopyalanmalı)."; exit 1;; esac
echo "Kod alındı, değişken silindi. Erişim jetonu alınıyor…"
curl -s -o /dev/null "http://127.0.0.1:53682/?$sorgu" || true
for _ in $(seq 1 60); do kill -0 "$RC" 2>/dev/null || break; sleep 1; done
wait "$RC" 2>/dev/null || true
python3 - "$IS/yetki.txt" "$IS/jeton.json" <<'PY'
import json, re, sys
m = re.search(r"--->\s*(\{.*?\})\s*<---", open(sys.argv[1], encoding="utf-8").read(), re.S)
if not m: sys.exit("DUR: jeton alınamadı (kod süresi geçmiş ya da başka bir denemenin adresi olabilir) — işi yeniden çalıştırın.")
j = json.loads(m.group(1)); assert j.get("access_token") and j.get("refresh_token"), "DUR: jetonda yenileme anahtarı yok"
open(sys.argv[2], "w").write(json.dumps(j, separators=(",", ":")))
PY
python3 -c 'import json,sys; j=json.load(open(sys.argv[1])); print("::add-mask::"+j["access_token"]); print("::add-mask::"+j["refresh_token"])' "$IS/jeton.json"
erisim=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["access_token"])' "$IS/jeton.json")
curl -s -H "Authorization: Bearer $erisim" https://graph.microsoft.com/v1.0/me/drive > "$IS/surucu.json"
python3 - "$IS/surucu.json" "$IS/surucu-id" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
if "id" not in d: sys.exit("DUR: OneDrive sürücüsü okunamadı: " + str(d.get("error", {}).get("code", "bilinmiyor")))
if d.get("driveType") != "personal": sys.exit("DUR: bu hesap kişisel OneDrive değil (" + str(d.get("driveType")) + ") — kurulum kişisel hesap için.")
open(sys.argv[2], "w").write(d["id"])
PY
echo "::add-mask::$(cat "$IS/surucu-id")"
gh secret set ONEDRIVE_TOKEN --repo "$R" < "$IS/jeton.json"
gh secret set ONEDRIVE_DRIVE_ID --repo "$R" < "$IS/surucu-id"
# bağlantı sınaması: klasörü aç, içine küçük bir not yaz, geri oku
printf '[onedrive]\ntype = onedrive\ntoken = %s\ndrive_id = %s\ndrive_type = personal\n' "$(cat "$IS/jeton.json")" "$(cat "$IS/surucu-id")" > "$IS/rclone.conf"
export RCLONE_CONFIG="$IS/rclone.conf"
echo "Bu klasöre her gece Atölye ERP yedeği yazılır (GitHub: $R, iş: Gece yedeği). Bağlandı: $(date -u +%FT%TZ)" > "$IS/BENIOKU.txt"
rclone copy "$IS/BENIOKU.txt" onedrive:AtolyeYedek > "$IS/sinama.txt" 2>&1 && rclone cat onedrive:AtolyeYedek/BENIOKU.txt 2>/dev/null | grep -q 'Atölye ERP' \
  || { echo "DUR: jeton saklandı ama OneDrive'a yazılamadı: $(grep -m1 -oiE '(error|failed)[^"]{0,100}' "$IS/sinama.txt" || true)"; exit 1; }
echo "BAĞLANDI: kişisel OneDrive · AtolyeYedek klasörü yazılabilir. Erişim GitHub secret'larında saklandı (ONEDRIVE_TOKEN, ONEDRIVE_DRIVE_ID)." | tee -a "$OZET"
echo "Sonraki adım: Actions › Gece yedeği › Run workflow (ilk yedeği hemen almak için)." | tee -a "$OZET"
