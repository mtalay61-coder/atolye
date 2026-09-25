// BİRİM TESTİ — TUTAR YAZIYLA (25 Eylül, v1.460.0)
//
// Çek bordrosunda tutar yazıyla da basılıyor. Türkçe'nin iki tuzağı: "bir yüz" / "bir bin" denmez
// (yalnız "yüz", "bin"), ama binler basamağında 1 başka rakamla birlikteyse söylenir ("yüzbirbin").
const { sayiYaziyla, tutarYaziyla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

bekle("0", sayiYaziyla(0), "sıfır");
bekle("7", sayiYaziyla(7), "yedi");
bekle("100 — 'bir yüz' değil", sayiYaziyla(100), "yüz");
bekle("1000 — 'bir bin' değil", sayiYaziyla(1000), "bin");
bekle("1001", sayiYaziyla(1001), "binbir");
bekle("42000", sayiYaziyla(42000), "kırkikibin");
bekle("101000 — binlerde 1 başka rakamla söylenir", sayiYaziyla(101000), "yüzbirbin");
bekle("250375", sayiYaziyla(250375), "ikiyüzellibinüçyüzyetmişbeş");
bekle("1000000", sayiYaziyla(1000000), "birmilyon");
bekle("2001010", sayiYaziyla(2001010), "ikimilyonbinon");
bekle("TL kuruşlu", tutarYaziyla(1250.5, "TRY"), "binikiyüzelli TL elli kuruş");
bekle("USD", tutarYaziyla(1000, "USD"), "bin ABD Doları");
bekle("EUR sentli, yuvarlama", tutarYaziyla(19.999, "EUR"), "yirmi Avro");
bekle("kuruş tek hane", tutarYaziyla(3.07, "TRY"), "üç TL yedi kuruş");

process.exit(hata);
