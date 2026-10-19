// BİRİM TESTİ — ADIM ADIM KURALI ARA PROSESTE (v1.709.3, 075 oncekiAdimdanMevcutBedenler).
// Kullanıcı: "Kural bozuk, kesim bitmeden Saya bitti!" — Kesim → Kampre (ara) → Saya'da Saya'ya akan miktar Kesim'in
// teslim ettiği kadardır; ara proses sınırı kaldırmaz.
const { oncekiAdimdanMevcutBedenler } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const bm = [{ beden: "37", miktar: 10 }, { beden: "38", miktar: 6 }];
const kesimBos = { proses: "Kesim", atamalar: [] };
const kampre = { proses: "Kampre", araProsesMi: true, atamalar: [] };
const saya = { proses: "Saya", atamalar: [] };
bekle("Kesim verilmeden Saya'ya akış yok", oncekiAdimdanMevcutBedenler([kesimBos, kampre, saya], 2, bm), { "37": 0, "38": 0 });
const kesimKismi = { proses: "Kesim", atamalar: [{ tamamlandiMi: true, bedenMiktarlari: { "37": 4 }, sonuc: { saglam: { "37": 4 }, tamir: [], hurda: [] } }] };
bekle("Kesim kısmen teslim → Saya'ya o kadar", oncekiAdimdanMevcutBedenler([kesimKismi, kampre, saya], 2, bm), { "37": 4, "38": 0 });
bekle("iki ara proses art arda da şeffaf", oncekiAdimdanMevcutBedenler([kesimKismi, kampre, { ...kampre, proses: "Zigzag" }, saya], 3, bm), { "37": 4, "38": 0 });
bekle("ilk adım siparişin tamamı", oncekiAdimdanMevcutBedenler([kesimBos, saya], 0, bm), { "37": 10, "38": 6 });
console.log(hata ? "── adım kuralı testi HATALI ──" : "── adım kuralı testi temiz ──");
process.exit(hata);
