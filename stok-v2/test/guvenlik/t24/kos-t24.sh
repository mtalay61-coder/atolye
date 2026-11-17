#!/bin/bash
# t24 KOŞUCUSU — yeni firma kurulumu (v2) kabul testleri, tek komut. Yalnız yerel PostgreSQL ve Chromium; canlıya dokunmaz.
#   1) test24.sh (T24_TUT=1): ana → kurulum dosyası → iki boş proje (t24_a, t24_b) kurulumu, giriş, stok + kasa, veri ayrımı;
#      veritabanları ekran testi için TUTULUR.
#   2) iki firmaya ekran testinin başlangıç verisi (test/ekran/kurulum.sql: ürün "Ekran Bot" Siyah / Taba × 40 / 41, gelir / gider
#      kartı) — kurulumun parçası değil, sınanan akışın başlangıcı.
#   3) test/test.html derlenir (çalışma ağacındaki istemci), test/ekran/ekran-firma-ayrimi.js: EKRANDAN stok + kasa, firma
#      değiştirirken veri ayrımı (iki adres → iki gerçek veritabanı).
# Gerekli: KOPRU_PG (node "pg" modülünün yolu; depoda bağımlılık yok — ör. geçici klasöre npm install pg); Chromium Playwright
# sürümüyle eşleşmiyorsa PW_CHROMIUM (ör. /opt/pw-browsers/chromium).
T=$(cd "$(dirname "$0")" && pwd); A=$(cd "$T/../../../.." && pwd)
export PGHOST=${PGHOST:-localhost} PGUSER=${PGUSER:-postgres}
[ -n "${KOPRU_PG:-}" ] || { echo "KOPRU_PG gerekli (node pg modülü)"; exit 2; }
hata=0
T24_TUT=1 bash $T/test24.sh || hata=$((hata + 1))
for d in t24_a t24_b; do
  psql -X -q -v ON_ERROR_STOP=1 -d $d -c "update public.tanimlar set veri = veri || '{\"giderKartlari\": []}'::jsonb" -f $A/test/ekran/kurulum.sql > /dev/null \
    || { echo "ekran başlangıç verisi kurulamadı ($d)"; exit 2; }
done
(cd $A/test && node derle.js > /dev/null && node paket-test.js > /dev/null) || { echo "test.html derlenemedi"; exit 2; }
node $A/test/ekran/ekran-firma-ayrimi.js || hata=$((hata + 1))
for d in t24_ana t24_a t24_b t24_c t24_d; do psql -X -q -d postgres -c "drop database if exists $d" > /dev/null 2>&1; done
echo "── kos-t24: $([ $hata = 0 ] && echo TEMİZ || echo "$hata test kırmızı") ──"
exit $([ $hata = 0 ] && echo 0 || echo 1)
