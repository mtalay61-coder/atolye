#!/usr/bin/env node
// G-25 DENEME — KORUMALI YEREL SUNUCU (25 Kasım). Kullanıcı: "Deneme istemcisini yalnız deneme projesine bağlantı izni veren korumalı
// yerel sunucuyla aç; ana projeye bağlantının engellendiğini doğrula."
// Ne yapar:
//   • yalnız 127.0.0.1'de dinler; YALNIZ sabitlenmiş tek HTML dosyasını verir — SHA-256'sı başlangıçta VE her istekte denetlenir,
//     tutmazsa 409 (dosya değişmişse deneme durur); başka her yol 404 (manifest / sw.js / ikon dahil — servis çalışanı kurulmaz)
//   • her yanıta İçerik Güvenlik Politikası (CSP): tarayıcı YALNIZ deneme projesine (https + wss) ve esm.sh'a (uygulamanın modülleri)
//     bağlanabilir; ana proje (mqdgucoomgqcvhvgixbl) ve başka her adres tarayıcıda ENGELLENİR (istek ağa hiç çıkmaz)
//   • "/" giriş sayfası cihazın bu kökendeki firma seçimini deneme projesine yazar (adres + AÇIK anahtar) ve uygulamaya geçer. Ayrı köken
//     (http://127.0.0.1:<port>) = ayrı yerel depo: canlı cihaz verisine (erp.newdiamond.com.tr) dokunmaz.
// Kullanım: DENEME_ANAHTAR=sb_publishable_… node korumali-sunucu.js <html> <beklenen-sha256> [port]
//   Gizli (secret / service_role) anahtar REDDEDİLİR. Ana projenin adresi ya da anahtarı verilirse başlamaz.
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const DENEME_REF = "drtmnovafswzcmpacubl";
const ANA_REF = "mqdgucoomgqcvhvgixbl";
const DENEME_URL = `https://${DENEME_REF}.supabase.co`;
const [, , htmlYolu, beklenenSha, portArg] = process.argv;
const ANAHTAR = String(process.env.DENEME_ANAHTAR || "").trim();
const dur = (m) => { console.error(`DURDU: ${m}`); process.exit(2); };
if (!htmlYolu || !/^[0-9a-f]{64}$/.test(beklenenSha || "")) dur("kullanım: node korumali-sunucu.js <html> <sha256> [port]");
if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(ANAHTAR)) dur("DENEME_ANAHTAR yalnız AÇIK (sb_publishable_…) anahtar olabilir — gizli anahtar kullanılmaz");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const oku = () => { const b = fs.readFileSync(htmlYolu); if (sha(b) !== beklenenSha) dur(`HTML özeti tutmuyor: ${sha(b)} ≠ ${beklenenSha}`); return b; };
oku();
const DOSYA = "/" + path.basename(htmlYolu);

// CSP — connect-src yalnız deneme projesi + esm.sh. 'unsafe-inline': uygulama tek HTML, betiği gömülü. img: veri / blob ve deneme
// projesinin depolaması. Yazı tipi Google'dan (isteğe bağlı görünüm; bağlantı değil). Çerçeve, servis çalışanı, form hedefi yok.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' https://esm.sh",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${DENEME_URL}`,
  `connect-src ${DENEME_URL} wss://${DENEME_REF}.supabase.co https://esm.sh`,
  "worker-src 'none'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "manifest-src 'none'",
].join("; ");
if (CSP.includes(ANA_REF)) dur("CSP ana projeyi içeriyor");

const giris = `<!doctype html><meta charset="utf-8"><title>G-25 deneme</title><body style="font-family:sans-serif">
<p>Deneme projesine bağlanılıyor (${DENEME_REF})…</p><script>
try {
  localStorage.setItem("firma:secim", JSON.stringify({ kod: "deneme", ad: "DENEME (${DENEME_REF})", url: ${JSON.stringify(DENEME_URL)}, anahtar: ${JSON.stringify(ANAHTAR)} }));
  location.replace(${JSON.stringify(DOSYA)});
} catch (e) { document.body.textContent = "Firma seçimi yazılamadı: " + e; }
</script>`;

const sunucu = http.createServer((q, y) => {
  const yol = (q.url || "/").split("?")[0];
  const basliklar = { "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
  if (q.method !== "GET") { y.writeHead(405, basliklar); return y.end(); }
  if (yol === "/") { y.writeHead(200, { ...basliklar, "Content-Type": "text/html; charset=utf-8" }); return y.end(giris); }
  if (yol === DOSYA) {
    let b; try { b = fs.readFileSync(htmlYolu); } catch (e) { y.writeHead(500, basliklar); return y.end(); }
    if (sha(b) !== beklenenSha) { y.writeHead(409, basliklar); return y.end("HTML özeti değişti — deneme durduruldu"); }
    y.writeHead(200, { ...basliklar, "Content-Type": "text/html; charset=utf-8" }); return y.end(b);
  }
  y.writeHead(404, basliklar); y.end();
});
const port = Number(portArg) || 8725;
sunucu.listen(port, "127.0.0.1", () => console.log(`hazır: http://127.0.0.1:${port}/ → ${DOSYA} (sha256 ${beklenenSha.slice(0, 12)}…) · connect-src: ${DENEME_URL}, esm.sh`));
