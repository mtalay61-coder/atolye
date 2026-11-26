#!/usr/bin/env bash
# YEDEĞİ YALITILMIŞ AÇ — KORUMA KOPYASI VE İNDİRME (26 Kasım, 2. sürüm). yedek-ac.yml her klasör için bunu, sonra
# yedek-ac-dogrula.sh'ı çağırır. Yerelde onarim/is-akisi/sina.sh ile rclone'un yerel / şifreli (özetsiz) arka uçlarıyla sınanır.
#
# Kullanım: yedek-ac-onedrive.sh <kaynak-kök> <koruma-kök> <klasör> <yerel-dizin>
#   ör. onedrive:AtolyeYedek  onedrive:AtolyeYedek-KORUNAN/renk-hatasi  2026-11-25-1137  $RUNNER_TEMP/ac-2026-11-25-1137
#
# 2. SÜRÜM NEDENİ (ilk gerçek koşu, run 45801582756): kopya doğrulaması OneDrive'ın quickxor özetine dayanıyordu; runner'daki
# rclone 1.60 kişisel OneDrive'da bu özeti vermedi → "kaynak özetleri alınamadı" ile DURDU (doğru davranış, ama iş yapılamadı).
# Artık uzak özete HİÇ dayanılmaz (kullanıcı: "kaynak ve koruma kopyasındaki her dosyayı indirip tam SHA-256 ile karşılaştır"):
#   1. Kaynak klasörde public.dump, ozet.txt, envanter-kaynak.csv, auth-storage.sql VAR ve BASARISIZ.txt YOK olmalı.
#   2. Klasör koruma köküne KOPYALANIR (kaynak yalnız okunur). Koruma kökünde önceki koşudan kalmış DOĞRULANMAMIŞ bir kopya
#      varsa ona güvenilmez: rclone boyut + zamanı tutan dosyayı yeniden yüklemeyebilir, ama 3. adım her dosyayı baytına kadar
#      yeniden denetler; tutmayan dosya varsa DURUR (kopya silinmez, el ile bakılır).
#   3. KAYNAKTAKİ ve KOPYADAKİ HER DOSYA ayrı yerel dizinlere İNDİRİLİR; iki taraftaki dosya ADLARI birebir aynı olmalı (eksik ya
#      da fazla dosya → DUR); her dosyanın BAYT boyutu ve TAM sha256'sı (64 hane) iki tarafta eşit olmalı → DUR.
#   4. Kopyadan indirilen dosyalar yerel dizinde kalır (yedek-ac-dogrula.sh bunları ozet.txt'ye karşı yeniden denetler);
#      kaynaktan indirilen geçici kopya silinir.
# Kayda yalnız dosya adı, bayt boyutu, sha256'nın ilk 16 hanesi ve sonuç yazılır; rclone hata metinleri dosyada kalır.
set -euo pipefail
umask 077
[ $# -eq 4 ] || { echo "kullanım: $0 <kaynak-kök> <koruma-kök> <klasör> <yerel-dizin>" >&2; exit 2; }
KAYNAK=$1; KORUMA=$2; KL=$3; YEREL=$4
[[ "$KL" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}$ ]] || { echo "DUR: klasör adı geçersiz: $KL"; exit 1; }
IS=$(mktemp -d); trap 'rm -rf "$IS"' EXIT
dur() { echo "DUR: $*"; exit 1; }
GEREKLI="public.dump ozet.txt envanter-kaynak.csv auth-storage.sql"

# ── 1. Kaynak ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
rclone lsf "$KAYNAK/$KL" --files-only 2>> "$IS/hata.txt" | sort > "$IS/k-liste.txt" || dur "$KL bulunamadı"
[ -s "$IS/k-liste.txt" ] || dur "$KL bulunamadı ya da boş"
! grep -qx 'BASARISIZ.txt' "$IS/k-liste.txt" || dur "$KL SINANMAMIŞ (BASARISIZ.txt var)"
for f in $GEREKLI; do grep -qx "$f" "$IS/k-liste.txt" || dur "$KL: $f yok"; done
echo "  kaynak: $(grep -c . "$IS/k-liste.txt") dosya, gerekli 4 dosya var, BASARISIZ.txt yok"

# ── 2. Koruma kopyası ─────────────────────────────────────────────────────────────────────────────────────────────────────
rclone copy "$KAYNAK/$KL" "$KORUMA/$KL" --retries 5 2>> "$IS/hata.txt" || dur "koruma kopyası alınamadı"

# ── 3. İki tarafı indir, dosya dosya tam sha256 ───────────────────────────────────────────────────────────────────────────
rclone lsf "$KORUMA/$KL" --files-only 2>> "$IS/hata.txt" | sort > "$IS/c-liste.txt" || dur "koruma kopyası listelenemedi"
if ! diff -q "$IS/k-liste.txt" "$IS/c-liste.txt" >/dev/null; then
  echo "  kopyada eksik: $(comm -23 "$IS/k-liste.txt" "$IS/c-liste.txt" | tr '\n' ' ')"
  echo "  kopyada fazla: $(comm -13 "$IS/k-liste.txt" "$IS/c-liste.txt" | tr '\n' ' ')"
  dur "koruma kopyasının dosya listesi kaynakla aynı değil"
fi
mkdir -p -m 700 "$IS/kaynak" "$YEREL"
[ -z "$(ls -A "$YEREL")" ] || dur "yerel dizin boş değil: $YEREL"
rclone copy "$KAYNAK/$KL" "$IS/kaynak" 2>> "$IS/hata.txt" || dur "kaynak indirilemedi"
rclone copy "$KORUMA/$KL" "$YEREL" 2>> "$IS/hata.txt" || dur "koruma kopyası indirilemedi"
( cd "$IS/kaynak" && find . -type f | sed 's:^\./::' | sort ) > "$IS/k-inen.txt"
( cd "$YEREL" && find . -type f | sed 's:^\./::' | sort ) > "$IS/c-inen.txt"
diff -q "$IS/k-liste.txt" "$IS/k-inen.txt" >/dev/null || dur "kaynaktan inen dosyalar listeyle aynı değil"
diff -q "$IS/c-liste.txt" "$IS/c-inen.txt" >/dev/null || dur "kopyadan inen dosyalar listeyle aynı değil"
farkli=0
while read -r f; do
  kb=$(wc -c < "$IS/kaynak/$f"); cb=$(wc -c < "$YEREL/$f")
  ks=$(sha256sum "$IS/kaynak/$f" | cut -d' ' -f1); cs=$(sha256sum "$YEREL/$f" | cut -d' ' -f1)
  [ ${#ks} = 64 ] && [ ${#cs} = 64 ] || dur "$f: sha256 hesaplanamadı"
  if [ "$kb" = "$cb" ] && [ "$ks" = "$cs" ]; then echo "  $f: $kb bayt, sha256 ${ks:0:16}… kaynak = kopya"
  else echo "  $f: FARKLI (kaynak $kb bayt ${ks:0:16}…, kopya $cb bayt ${cs:0:16}…)"; farkli=$((farkli + 1)); fi
done < "$IS/k-liste.txt"
[ "$farkli" = 0 ] || dur "$farkli dosya koruma kopyasında kaynakla bayt bayt aynı değil"
echo "  koruma kopyası: $(grep -c . "$IS/k-liste.txt") dosyanın hepsi indirilip tam sha256 ile doğrulandı"
echo "  yerel dizinde: koruma kopyasından inen dosyalar"
echo "TAMAM"
