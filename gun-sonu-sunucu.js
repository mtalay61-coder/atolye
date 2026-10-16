// GÜN SONU RAPORU — SUNUCU FONKSİYONUNU ÜRETİR (v1.687.0)
//
// Kullanıcı: "Sunucudan otomatik gönderilsin, uygulama açık olmasa da." Rapor hesabı (264 `gunSonuVerisi`,
// `gunSonuHTML`) ve okuma dönüşümü (045 `kayitaCevir`, `ekiKokeAc`) UYGULAMADAKİ KODUN AYNISI olmalı: elle
// ikinci bir kopya yazmak, bakiye kuralı değiştiğinde e-postadaki raporun ekrandakinden ayrışması demekti
// (mutabakatta tam otomatik gönderimden bu yüzden kaçınılmıştı). Bu betik birleşik `atolye-erp.jsx`ten kök
// fonksiyonları ve onların KULLANDIĞI bütün üst düzey tanımları (kapanış) TypeScript ayrıştırıcısıyla çıkarır,
// `gun-sonu-sablon.ts`teki sunucu gövdesine gömer → `supabase-gun-sonu-fonksiyonu.ts` (kullanıcı Supabase'e
// yapıştırır). Üretilen dosyayı `test/birim-gun-sonu-sunucu.js` taklit Supabase/SMTP ile uçtan uca koşar.
//
// KORUMA: kapanışa tarayıcıya/React'e bağlı bir tanım girerse (JSX, window, document, useState…) üretim DURUR —
// sunucuda çalışmayacak bir dosya üretmektense derlemeyi kırmak.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const KOK = __dirname;
const KAYNAK = path.join(KOK, "atolye-erp.jsx");
const SABLON = path.join(KOK, "gun-sonu-sablon.ts");
const CIKTI = path.join(KOK, "supabase-gun-sonu-fonksiyonu.ts");
const KOKLER = ["gunSonuVerisi", "gunSonuHTML", "gunSonuAlicilari", "pdfCiktiBelgesi", "kayitaCevir", "ekiKokeAc"];
const YASAK = /\b(window|document|localStorage|navigator|useState|useEffect|useCallback|useMemo|useRef|React)\b/;

const kod = fs.readFileSync(KAYNAK, "utf8");
const kaynak = ts.createSourceFile("atolye-erp.jsx", kod, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JSX);

// Üst düzey tanımlar: ad → düğüm (fonksiyon ya da tek değişkenli const/let).
const tanimlar = new Map();
kaynak.statements.forEach((st, sira) => {
  if (ts.isFunctionDeclaration(st) && st.name) tanimlar.set(st.name.text, { st, sira });
  else if (ts.isVariableStatement(st)) {
    st.declarationList.declarations.forEach((d) => { if (ts.isIdentifier(d.name)) tanimlar.set(d.name.text, { st, sira }); });
  }
});

// Düğümde geçen serbest adlar (özellik adları ve nesne anahtarları hariç).
function kullanilanAdlar(dugum) {
  const adlar = new Set();
  const gez = (n) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const ozellik = p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n));
      if (!ozellik) adlar.add(n.text);
    }
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) adlar.add("__JSX__");
    ts.forEachChild(n, gez);
  };
  gez(dugum);
  return adlar;
}

const secilen = new Map();
const kuyruk = [...KOKLER];
while (kuyruk.length) {
  const ad = kuyruk.shift();
  if (!tanimlar.has(ad)) throw new Error(`Kök/bağımlılık bulunamadı: ${ad}`);
  const { st, sira } = tanimlar.get(ad);
  if (secilen.has(st)) continue;
  const metin = st.getText(kaynak);
  const adlar = kullanilanAdlar(st);
  if (adlar.has("__JSX__") || YASAK.test(metin.replace(/\/\/.*$/gm, ""))) {
    throw new Error(`Sunucu çekirdeğine tarayıcıya bağlı tanım girdi: ${ad} — 264'teki saf hesabı bundan ayırın`);
  }
  secilen.set(st, { ad, sira, metin });
  adlar.forEach((a) => { if (tanimlar.has(a) && !secilen.has(tanimlar.get(a).st)) kuyruk.push(a); });
}

const parcalar = [...secilen.values()].sort((a, b) => a.sira - b.sira);
const cekirdek = `// ---- ÇEKİRDEK: atolye-erp.jsx'ten OTOMATİK çıkarıldı (gun-sonu-sunucu.js) — ELLE DÜZENLEMEYİN ----\n` +
  `// Tanımlar: ${parcalar.map((p) => p.ad).join(", ")}\n\n` +
  parcalar.map((p) => p.metin).join("\n\n") + "\n// ---- ÇEKİRDEK SONU ----\n";

const sablon = fs.readFileSync(SABLON, "utf8");
if (!sablon.includes("/*__CEKIRDEK__*/")) throw new Error("Şablonda /*__CEKIRDEK__*/ işareti yok");
fs.writeFileSync(CIKTI, sablon.replace("/*__CEKIRDEK__*/", () => cekirdek));
console.log(`gün sonu sunucu fonksiyonu üretildi: ${parcalar.length} tanım → ${path.basename(CIKTI)}`);
