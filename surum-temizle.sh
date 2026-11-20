#!/usr/bin/env bash
# ESKİ SÜRÜM DOSYALARI TEMİZLİĞİ (yap.sh'tan çağrılır; ayrı dosya: birim testiyle sınanabilsin — test/birim-surum-temizle.js).
#
# Kural (26 Eylül, v1.468.0 — kullanıcı: "son 3 kayıt hariç diğerleri silinsin"): en yeni 3 sürüm (sort -V) kalır.
# YAYINDAKİ KORUNUR (17 Kasım, v1.744.25): yayınlanmamış sürümler birikince "son 3" yayındaki dosyayı da (surum.json'un `url`i)
# siliyordu — 1.744.25 derlemesi 1.744.22'yi sildi; o silme main'e girseydi başlatıcı (index.html) ve açık uygulamalar
# olmayan dosyaya yönlenirdi: uygulama AÇILMAZDI. Artık surum.json'un gösterdiği dosya sayıdan bağımsız hep kalır.
# GÜVENLİ TARAF: surum.json yoksa / okunamıyorsa / `url` boşsa HİÇBİR ŞEY silinmez (yayındakini bilmeden silmek yok).
# Sonda denetim: yayındaki dosya diskte yoksa çıkış 1 (yap.sh durur).
# Kullanım: surum-temizle.sh <bu derlemenin çıktısı> [klasör, varsayılan .] [saklanacak sayı, varsayılan 3]
set -u
CIKTI="${1:?çıktı dosyası adı gerekli}"
DIZIN="${2:-.}"
SAKLA="${3:-3}"
cd "$DIZIN" || exit 1
YAYINDAKI=$(node -e '
  try { const u = JSON.parse(require("fs").readFileSync("surum.json", "utf8")).url;
        if (typeof u === "string" && /^atolye-erp-v[0-9.]+\.html$/.test(u)) process.stdout.write(u); } catch (e) {}' 2>/dev/null)
if [ -z "$YAYINDAKI" ]; then
  echo "── eski sürüm temizliği ATLANDI: surum.json okunamadı ya da url geçersiz — yayındaki bilinmeden dosya silinmez ──"
  exit 0
fi
ESKILER=$(ls atolye-erp-v*.html 2>/dev/null | sort -V | head -n -"$SAKLA")
SILINEN=0
for f in $ESKILER; do
  [ "$f" = "$CIKTI" ] && continue
  [ "$f" = "$YAYINDAKI" ] && continue
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then git rm -q "$f"; else rm -f "$f"; fi
  SILINEN=$((SILINEN + 1))
done
[ "$SILINEN" -gt 0 ] && echo "── eski sürüm dosyaları silindi (son $SAKLA + yayındaki $YAYINDAKI kaldı): $SILINEN dosya ──"
if [ ! -f "$YAYINDAKI" ]; then
  echo "── DUR: yayındaki sürüm dosyası ($YAYINDAKI, surum.json) diskte YOK — geri alın: git checkout HEAD -- $YAYINDAKI ──"
  exit 1
fi
exit 0
