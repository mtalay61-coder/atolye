// BİRİM TESTİ — GEÇERLİ REZERVASYONLAR (v1.713.0, 020 gecerliRezervasyonlar)
// Kullanıcı: "üretimi ben sildim bilerek, sorunum hatanın çıkması" — silinmiş üretimin rezervasyonu talebe girmemeli.
const { gecerliRezervasyonlar } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const rez = [
  { id: "r1", uretimNo: "10033", miktar: 136 },
  { id: "r2", uretimNo: 10034, miktar: 5 },
  { id: "r3", miktar: 2 },
  { id: "r4", uretimNo: "10035", miktar: 1 },
];
const uretim = [{ id: "u1", siparisNo: "10034" }, { id: "u2", siparisNo: 10035 }];
bekle("silinmiş üretimin (10033) rezervasyonu düşer; sayı/dize karışık numaralar eşleşir; üretimsiz satır kalır",
  gecerliRezervasyonlar(rez, uretim).map((r) => r.id), ["r2", "r3", "r4"]);
bekle("hepsi geçerliyse AYNI dizi döner (gereksiz çizim yok)", gecerliRezervasyonlar(rez.slice(1), uretim) === rez.slice(1) ? "kopya" : "aynı", "aynı");
const ayni = rez.slice(1); bekle("aynı dizi kimliği", gecerliRezervasyonlar(ayni, uretim) === ayni, true);
bekle("boş girdiler", gecerliRezervasyonlar(null, null), []);
bekle("üretim listesi boşsa üretimli rezervasyonların hepsi düşer", gecerliRezervasyonlar(rez, []).map((r) => r.id), ["r3"]);
if (hata) { console.log("BİRİM TESTİ HATA: geçerli rezervasyon"); process.exit(1); }
console.log("birim-gecerli-rezervasyon: tamam");
