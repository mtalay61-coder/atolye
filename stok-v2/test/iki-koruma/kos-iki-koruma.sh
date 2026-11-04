#!/usr/bin/env bash
# İKİ KORUMA BİRLİKTE AÇIK — GERÇEK POSTGRESQL (4 Kasım). Yalnız yerel test veritabanı (atolye_stok_v2_sinama); Supabase'e bağlanmaz.
# Canlıda henüz kapalı olan iki korumayı (fiş kuralları: fis_aktif; sürüm kapısı: min_istemci_surum) AÇIP sunucu yollarını sınar:
# stok / satın alma / satış fişi, teslim, iptal, sipariş bağ çözme, üretim, kasa, banka, cari, çek/senet, muhasebe (kas_yaz), renk.
#   1. kos.sh veritabanını kurar; IKI_KORUMA=1 kipinde uçtan uca testlerden (uctan-uca-fis, gece denetimi, R1, R1b) ÖNCE iki
#      korumayı açar — o testler taze veri bekler, bu yüzden kos.sh'ın içinde koşarlar.
#   2. stk_ayar: fis_aktif = true, min_istemci_surum = src/015-sabitler.jsx SURUM.
#   3. Varsayılan oturum başlığı x-atolye-surum = SURUM (testin elle kurduğu çağrılar için; uygulamanın kendi isteklerinde
#      IKI_KORUMA=1 kipi uygulamanın GÖNDERDİĞİ başlığı oturuma yazar — f0/ortak.js, uctan-uca-fis.js). Uygulamanın her yazmada
#      başlık gönderdiği tarayıcı senaryolarının ağ denetiminde ayrıca kanıtlanır (test/kural-provasi.js).
#   4. Her testten ÖNCE iki koruma yeniden açılır, SONRA açık kaldığı denetlenir (kapıyı kendisi deneyen test kapatırsa raporlanır).
# Kapıyı / kuralları bilerek KAPALI durumda sınayan testler (t-surum-kapi, t-kapi-moduller, t-servis-kapi) bu koşuda YOK:
# onlar kapının kendisini sınar ve kos-butunluk.sh'ta koşar.
set -uo pipefail
cd "$(dirname "$0")/../../.."
case "${PGHOST:-}" in localhost|127.0.0.1|::1) ;; *) echo 'PGHOST=localhost gerekli'; exit 2;; esac
export STOK_V2_DB=atolye_stok_v2_sinama IKI_KORUMA=1
DB=$STOK_V2_DB
SURUM=$(sed -n 's/^const SURUM = "\(.*\)";$/\1/p' src/015-sabitler.jsx)
[ -n "$SURUM" ] || { echo "SURUM okunamadı"; exit 2; }
CIKTI=${IKI_KORUMA_CIKTI:-$(mktemp -d)}
mkdir -p "$CIKTI"
echo "İKİ KORUMA · sürüm $SURUM · çıktılar $CIKTI"
node test/derle.js > /dev/null || exit 2
if ! bash stok-v2/test/kos.sh > "$CIKTI/0-kurulum.txt" 2>&1; then echo "✗ kurulum (kos.sh) düştü — $CIKTI/0-kurulum.txt"; tail -5 "$CIKTI/0-kurulum.txt"; exit 2; fi
grep -q "İKİ KORUMA AÇIK: fiş kuralları + sürüm kapısı ($SURUM) — true/$SURUM" "$CIKTI/0-kurulum.txt" || { echo "✗ kos.sh iki korumayı açmadı"; exit 2; }
echo "✓ kurulum + uctan-uca-fis + gece denetimi + R1 + R1b iki koruma açıkken (kos.sh)"
psql -X -q -d postgres -c "alter database $DB set request.headers = '{\"x-atolye-surum\":\"$SURUM\"}'"
ac() { psql -X -q -At -d "$DB" -c "update public.stk_ayar set fis_aktif = true, min_istemci_surum = '$SURUM' where id = 'tekil'"; }
durum() { psql -X -q -At -d "$DB" -c "select public.fis_kural_aktif()::text || '/' || coalesce(min_istemci_surum, '-') from public.stk_ayar where id = 'tekil'"; }

TESTLER=(
  stok-v2/test/iki-koruma/t-dayaniklilik.js
  stok-v2/test/finans/t-cek-iptal.js
  stok-v2/test/finans/t-cek-yaris.js
  stok-v2/test/finans/t-hesap-koru.js
  stok-v2/test/finans/t-seyrek-alt.js
  stok-v2/test/finans/t-sonlu-tutar.js
  stok-v2/test/finans/t-toplu-iptal.js
  stok-v2/test/finans/t-yetki-tekrar.js
  stok-v2/test/f4/t-atomik-bag.js
  stok-v2/test/f4/t-canli-bag.js
  stok-v2/test/f4/t-rezervasyon-yaris.js
  stok-v2/test/f4/t-yaris.js
  stok-v2/test/f3/t-satis-sinir.js
  stok-v2/test/f3/t-satis-yaris.js
  stok-v2/test/f8/t-renk-kilit.js
  stok-v2/test/f8/t-renk-dogal.js
  stok-v2/test/f8/t-eski-fis.js
  stok-v2/test/f8/t-eski-fis-yaris.js
  stok-v2/test/duzeltme/t-bag-kilit.js
  stok-v2/test/duzeltme/t-eski-bag.js
  stok-v2/test/duzeltme/t-siparis-sil.js
  stok-v2/test/f2/t-f2.js
  stok-v2/test/f2/t-f2-kilit.js
)
kirmizi=0; kapatan=()
for t in "${TESTLER[@]}"; do
  [ -f "$t" ] || { echo "  ? $t yok"; continue; }
  ac
  ad=$(basename "$t" .js)
  if timeout 1200 node "$t" > "$CIKTI/$ad.txt" 2>&1; then sonuc="✓"; else sonuc="✗"; kirmizi=$((kirmizi + 1)); fi
  d=$(durum)
  [ "$d" = "true/$SURUM" ] || kapatan+=("$ad → $d")
  echo "  $sonuc $t · korumalar sonra: $d"
  [ "$sonuc" = "✗" ] && grep -E "✗|Error|ERROR|AssertionError|AT001|KR0" "$CIKTI/$ad.txt" | head -6 | sed 's/^/      /'
done
psql -X -q -d postgres -c "alter database $DB reset request.headers"
echo "korumayı kapatan test: ${#kapatan[@]} ${kapatan[*]:-}"
echo "── İKİ KORUMA: $([ $kirmizi = 0 ] && echo TEMİZ || echo "$kirmizi kırmızı") ──"
exit $([ $kirmizi = 0 ] && echo 0 || echo 1)
