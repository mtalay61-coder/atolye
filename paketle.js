#!/usr/bin/env node
// PAKETLEYİCİ — atolye-erp.jsx -> çift tıklayınca açılan tek HTML dosyası
//
// Yapı sistemi yok, node_modules yok. Sebep: atölyedeki bilgisayarlarda derleme ortamı kurmak
// yerine tek dosya kopyalamak, hem kurulumu hem de "bende çalışıyordu" sorununu ortadan kaldırıyor.
// React, lucide ve xlsx CDN'den (esm.sh) geliyor; sürümleri BURAYA SABİTLENDİ ki CDN'de yeni sürüm
// çıktığında uygulama bir sabah kendiliğinden bozulmasın.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const girdi = process.argv[2] || "atolye-erp.jsx";
const cikti = process.argv[3] || girdi.replace(/\.jsx$/, ".html");
let kaynak = fs.readFileSync(girdi, "utf8");

const surumEsl = kaynak.match(/const SURUM = "([^"]+)"/);
const SURUM = surumEsl ? surumEsl[1] : "?";

// ---- 1) JSX -> React.createElement -----------------------------------------------------------
// module: ESNext — import satırları KORUNUR, tarayıcı import map ile karşılar.
const cevrildi = ts.transpileModule(kaynak, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    removeComments: false,
  },
  fileName: girdi,
});
let kod = cevrildi.outputText;

// ---- 2) export default -> yerel isim ----------------------------------------------------------
// Tek dosyalık modülde dışa aktarmanın alıcısı yok; kökü doğrudan buradan bağlıyoruz.
kod = kod.replace(/export default function AtolyeERP/, "function AtolyeERP");
if (/export default/.test(kod)) {
  console.warn("UYARI: beklenmeyen bir `export default` kaldı — kontrol et.");
}

// ---- 3) window.storage köprüsü ------------------------------------------------------------------
// Uygulama Claude artifact ortamının eşzamansız anahtar-değer deposunu kullanıyor. Tarayıcıda
// böyle bir şey yok; aynı arayüzü IndexedDB üzerine kuruyoruz. Eşzamansız kalması ŞART:
// çağrı yerleri `await` ediyor, senkron dönerse akış bozulur.
//
// Köprü AYRI BİR DOSYADA (depo-koprusu.js): paketleyicinin içine gömülü bir metin olarak durduğunda
// ne okunabiliyor ne test edilebiliyordu. Artık tarayıcı testi onu doğrudan yükleyip sınıyor.
const DEPO_KOPRUSU = "\n" + fs.readFileSync(path.join(__dirname, "depo-koprusu.js"), "utf8") + "\n";

// ---- 4) Hata kalkanı ---------------------------------------------------------------------------
// Beyaz ekran, hata mesajından beterdir: kullanıcı ne olduğunu göremez, ekran görüntüsü de
// göndremez. Kalkan hatayı yakalayıp metni ekrana basar.
const KALKAN = `
class HataKalkani extends React.Component {
  constructor(p) { super(p); this.state = { hata: null }; }
  static getDerivedStateFromError(h) { return { hata: h }; }
  componentDidCatch(h, bilgi) { console.error("Yakalanan hata:", h, bilgi); }
  render() {
    if (!this.state.hata) return this.props.children;
    const h = this.state.hata;
    return React.createElement("div", {
      style: { padding: 24, fontFamily: "ui-monospace, monospace", background: "#FCE7DA",
               color: "#7A3B22", minHeight: "100vh", whiteSpace: "pre-wrap", lineHeight: 1.6 }
    },
      React.createElement("h2", { style: { marginTop: 0, color: "#B85C2E" } }, "Uygulama durdu (s\\u00FCr\\u00FCm ${SURUM})"),
      React.createElement("p", null, "Bu ekran\\u0131n g\\u00F6r\\u00FCnt\\u00FCs\\u00FCn\\u00FC g\\u00F6nderin. Verileriniz diskte duruyor, silinmedi."),
      React.createElement("pre", { style: { background: "#fff", padding: 12, borderRadius: 6, overflow: "auto" } },
        String(h && h.message || h) + "\\n\\n" + String(h && h.stack || "")),
      React.createElement("button", {
        onClick: () => window.location.reload(),
        style: { marginTop: 12, padding: "8px 16px", fontSize: 14, cursor: "pointer",
                 background: "#E1611F", color: "#fff", border: 0, borderRadius: 6 }
      }, "Sayfay\\u0131 yenile")
    );
  }
}
`;

const BAGLAMA = `
const __kok = ReactDOM.createRoot(document.getElementById("kok"));
__kok.render(React.createElement(HataKalkani, null, React.createElement(AtolyeERP)));
`;

// ---- 5) HTML ------------------------------------------------------------------------------------
const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atölye ERP ${SURUM}</title>
<!-- KURULABİLİR UYGULAMA (24 Eylül, v1.440.0 — kullanıcı: "uygulamayı kısayol olarak nasıl
     yapacağım masaüstüne / nerede var yükleme"). Tarayıcı bir sayfayı ancak şu üçü varsa
     "kurulabilir" sayıyor: manifest + ikonlar + fetch dinleyen bir servis çalışanı. Üçü de yoktu,
     o yüzden "Uygulamayı yükle" hiç çıkmıyordu.
     start_url "./" : kısayol SÜRÜMLÜ dosyayı değil KÖK adresi açsın — başlatıcı her zaman
     yayındaki son sürüme gider, kısayol eskimez. -->
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#4B3625">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Atölye ERP">
<!-- UYGULAMA SİMGESİ (25 Eylül, v1.456.0 — kullanıcının "ND" logosu). Sekme simgesi (favicon)
     yoktu, tarayıcı sekmesi boş/varsayılan görünüyordu; iOS ana ekranı 180 px bekliyor. -->
<link rel="icon" type="image/png" sizes="64x64" href="ikon-64.png">
<link rel="icon" type="image/png" sizes="192x192" href="ikon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="ikon-apple-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #F2E8D8; }
  body { font-family: Inter, system-ui, sans-serif; color: #4B3625; }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px; background: #E1611F; color: #fff;
    border: 0; border-radius: 6px; padding: 8px 14px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .btn-primary:hover { background: #C9531A; }
  #yukleniyor { padding: 40px; text-align: center; color: #9B8B72; font-size: 14px; }
</style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1?deps=react@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1",
    "lucide-react": "https://esm.sh/lucide-react@0.383.0?deps=react@18.3.1",
    "xlsx": "https://esm.sh/xlsx@0.18.5"
  }
}
</script>
</head>
<body>
<div id="kok"><div id="yukleniyor">Yükleniyor…</div></div>
<script type="module">
import ReactDOM from "react-dom/client";
${DEPO_KOPRUSU}
${kod}
${KALKAN}
${BAGLAMA}
</script>
<noscript>Bu uygulama JavaScript gerektirir.</noscript>
<script>
  // SERVİS ÇALIŞANI — yalnız KURULABİLİRLİK için (24 Eylül, v1.440.0). Önbelleğe ALMIYOR:
  // uygulama tek dosya ve sürüm güncellemesi başlatıcıdan geliyor; araya önbellek girseydi
  // "yeni sürüm yayınladım ama açılmıyor" sorunları başlardı. Dosya adresinden açıldığında
  // (file://) servis çalışanı zaten çalışmaz, sessizce atlanıyor.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* kurulabilirlik yoksa uygulama yine çalışır */ });
    });
  }
</script>
</body>
</html>
`;

fs.writeFileSync(cikti, html, "utf8");
const kb = (fs.statSync(cikti).size / 1024).toFixed(0);
console.log(`Paketlendi: ${cikti}  (sürüm ${SURUM}, ${kb} KB)`);
