#!/usr/bin/env bash
# YEDEĞİ YALITILMIŞ AÇ — KORUMA KOPYASI VE İNDİRME (26 Kasım). yedek-ac.yml her klasör için bunu, sonra yedek-ac-dogrula.sh'ı
# çağırır. Yerelde test/… değil onarim/is-akisi/sina.sh ile rclone'un YEREL arka ucuyla sınanır (aynı komutlar).
#
# Kullanım: yedek-ac-onedrive.sh <kaynak-kök> <koruma-kök> <klasör> <yerel-dizin>
#   ör. onedrive:AtolyeYedek  onedrive:AtolyeYedek-KORUNAN/renk-hatasi  2026-11-25-1137  $RUNNER_TEMP/ac-2026-11-25-1137
#
# 1. Kaynak klasörde public.dump, ozet.txt, envanter-kaynak.csv, auth-storage.sql VAR ve BASARISIZ.txt YOK olmalı.
# 2. Klasör koruma köküne KOPYALANIR (kaynağa dokunulmaz; saklama temizliği koruma köküne bakmaz).
# 3. KOPYA DOĞRULAMASI ÖZETLE: iki tarafta her dosyanın quickxor (QuickXorHash) (OneDrive'ın kendi özeti; yerel arka uç da hesaplar)
#    alınır. Dosya listeleri aynı, her dosyanın özeti DOLU ve iki tarafta EŞİT olmalı. Özet alınamayan dosya varsa yalnız boyuta
#    DÜŞÜLMEZ → DUR. (rclone check'in "ortak özet yok → yalnız boyut" geri düşüşü bilerek kullanılmaz.)
# 4. Dört dosya KORUMA KOPYASINDAN (kaynaktan değil) yerel dizine indirilir; bayt boyutu + sha256 denetimini yedek-ac-dogrula.sh
#    ozet.txt'ye karşı yapar → korunan kopyanın kendisi bayt düzeyinde doğrulanmış olur.
# Kayda yalnız dosya adı, özetlerin ilk 12 hanesi ve sonuç yazılır; rclone hata metinleri dosyada kalır.
set -euo pipefail
umask 077
[ $# -eq 4 ] || { echo "kullanım: $0 <kaynak-kök> <koruma-kök> <klasör> <yerel-dizin>" >&2; exit 2; }
KAYNAK=$1; KORUMA=$2; KL=$3; YEREL=$4
[[ "$KL" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}$ ]] || { echo "DUR: klasör adı geçersiz: $KL"; exit 1; }
IS=$(mktemp -d); trap 'rm -rf "$IS"' EXIT
dur() { echo "DUR: $*"; exit 1; }
DOSYALAR="public.dump ozet.txt envanter-kaynak.csv auth-storage.sql"

rclone lsf "$KAYNAK/$KL" --files-only > "$IS/liste.txt" 2>> "$IS/hata.txt" || dur "$KL bulunamadı"
! grep -qx 'BASARISIZ.txt' "$IS/liste.txt" || dur "$KL SINANMAMIŞ (BASARISIZ.txt var)"
for f in $DOSYALAR; do grep -qx "$f" "$IS/liste.txt" || dur "$KL: $f yok"; done
echo "  kaynak: $(grep -c . "$IS/liste.txt") dosya, gerekli 4 dosya var, BASARISIZ.txt yok"

rclone copy "$KAYNAK/$KL" "$KORUMA/$KL" --retries 5 2>> "$IS/hata.txt" || dur "koruma kopyası alınamadı"

ozetler() { rclone hashsum quickxor "$1" 2>> "$IS/hata.txt" | sort -k2; }
ozetler "$KAYNAK/$KL" > "$IS/k.txt" || dur "kaynak özetleri alınamadı"
ozetler "$KORUMA/$KL" > "$IS/c.txt" || dur "kopya özetleri alınamadı"
cut -d' ' -f3- "$IS/k.txt" > "$IS/k-ad.txt"; cut -d' ' -f3- "$IS/c.txt" > "$IS/c-ad.txt"
[ -s "$IS/k-ad.txt" ] || dur "kaynakta özet listesi boş"
diff -q "$IS/k-ad.txt" "$IS/c-ad.txt" >/dev/null || dur "kopyadaki dosya listesi kaynakla aynı değil"
[ "$(grep -c . "$IS/k-ad.txt")" = "$(grep -c . "$IS/liste.txt")" ] || dur "her dosyanın özeti alınamadı"
bos=$(awk '$1 == "" || length($1) < 20 {n++} END {print n+0}' "$IS/k.txt" "$IS/c.txt")
[ "$bos" = 0 ] || dur "$bos dosyanın özeti boş — yalnız boyutla doğrulanmaz"
farkli=$(join -1 2 -2 2 <(sort -k2 "$IS/k.txt") <(sort -k2 "$IS/c.txt") | awk '$2 != $3 {print $1}')
if [ -n "$farkli" ]; then echo "  özeti FARKLI: $(tr '\n' ' ' <<<"$farkli")"; dur "koruma kopyası kaynakla bayt bayt aynı değil"; fi
while read -r oz ad; do echo "  $ad: quickxor ${oz:0:12}… kaynak = kopya"; done < "$IS/k.txt"
echo "  koruma kopyası: $(grep -c . "$IS/k.txt") dosyanın hepsi özetle doğrulandı"

mkdir -p -m 700 "$YEREL"
for f in $DOSYALAR; do rclone copyto "$KORUMA/$KL/$f" "$YEREL/$f" 2>> "$IS/hata.txt" || dur "$f koruma kopyasından indirilemedi"; done
echo "  indirildi (koruma kopyasından): $DOSYALAR"
echo "TAMAM"
