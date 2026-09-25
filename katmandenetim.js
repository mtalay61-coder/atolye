#!/usr/bin/env node
// DENETİM 9 — KATMANI ATLAYAN YAZMA
//
// Veri buluta yalnızca tabloYaz/tekilYaz üzerinden gidiyor. Doğrudan guvenliYaz çağıran bir yer,
// veriyi SADECE bu bilgisayara yazar; diğer dört bilgisayar o değişikliği hiç görmez. Hata da
// vermez — bu yüzden fark edilmesi haftalar alır.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const satirlar = fs.readFileSync(dosya, "utf8").split("\n");
const bulgular = [];

// tabloYaz/tekilYaz kendi içinde guvenliYaz çağırır; katmanın kendisi muaf.
// Yedek dosyaları BİLEREK yerelde kalıyor: bulut zaten asıl kopya, yedeğin amacı bulut
// bozulduğunda elde bir şey olması. Buluta yazılsaydı yedek olmazdı.
const MUAF_ANAHTAR = /["`](?:oturum|ayar|tercih|pencere|sonYedek|gocDurumu|kilit|yedek)[:.$]/;

satirlar.forEach((sat, i) => {
  if (!/\bguvenliYaz\s*\(/.test(sat)) return;
  if (/^\s*(\/\/|\*)/.test(sat)) return;
  if (/function\s+guvenliYaz\b/.test(sat)) return; // tanımın kendisi
  const no = i + 1;
  // Katman gövdesi: tabloYaz ve tekilYaz tanımlarının içi.
  const cevre = satirlar.slice(Math.max(0, i - 6), i + 1).join("\n");
  if (/function (tabloYaz|tekilYaz)\b/.test(cevre)) return;
  if (MUAF_ANAHTAR.test(sat)) return; // yalnızca bu bilgisayara ait yerel tercih
  // GEREKÇELİ MUAFİYET. Projenin kuralı: bir denetim konulduğunda muafiyet sessizce geçilemez,
  // gerekçesiyle etiketlenir (bkz. matris-muaf, fis-muaf, kirpma-muaf). Anahtar adına dayalı
  // MUAF_ANAHTAR listesi, anahtarı şablon dizesiyle kuran çağrıları göremiyor; ayrıca "neden
  // muaf" bilgisi denetleyicinin içinde kalıyordu. Etiket, gerekçeyi çağrı yerinde tutuyor.
  const oncekiSatir = satirlar[i - 1] || "";
  if (/katman-muaf:/.test(sat) || /katman-muaf:/.test(oncekiSatir)) return;
  bulgular.push(`${dosya}:${no}  guvenliYaz doğrudan çağrılıyor — tabloYaz/tekilYaz kullanılmalı, ` +
    `yoksa değişiklik buluta gitmez: ${sat.trim().slice(0, 80)}`);
});

if (!bulgular.length) console.log("  9    katman atlama ........... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [9 katman atlama] " + b));
  console.log(`  9    katman atlama ........... ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
