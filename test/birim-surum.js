// BİRİM TESTİ — SÜRÜM KARŞILAŞTIRMA (14 Eylül). Metin karşılaştırması "1.9" ile "1.10"u ters
// sıralar; sürüm numaraları sayı sayı karşılaştırılmalı.
const { surumDahaYeniMi } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};
console.log("sürüm karşılaştırma");
bekle("yeni yama", surumDahaYeniMi("1.278.1", "1.278.0"), true);
bekle("aynı sürüm", surumDahaYeniMi("1.278.0", "1.278.0"), false);
bekle("eski sürüm", surumDahaYeniMi("1.277.9", "1.278.0"), false);
bekle("iki haneli ara sürüm (metin karşılaştırması burada yanılırdı)", surumDahaYeniMi("1.10.0", "1.9.0"), true);
bekle("ters yön", surumDahaYeniMi("1.9.0", "1.10.0"), false);
bekle("eksik hane", surumDahaYeniMi("2", "1.278.0"), true);
bekle("boş değer", surumDahaYeniMi("", "1.278.0"), false);
console.log(hata ? "\n\u2500\u2500 S\u00dcR\u00dcM TEST\u0130 BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 s\u00fcr\u00fcm testi temiz \u2500\u2500");
process.exit(hata);
