// BİRİM TESTİ — CODE128 VE ÇİFT BARKODU.
//
// Barkod yanlış üretilirse okuyucu ya hiç okumaz (fark edilir) ya da BAŞKA bir kod okur
// (fark edilmez, yanlış ürün sayılır). Bu yüzden kodlama satır satır sınanıyor.
const { code128Cubuklar, barkodSvg } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// ---- CODE128-B ----
// Bilinen doğrulama: "A" için başlangıç(104) + 'A'(33) + kontrol + bitiş.
// kontrol = (104 + 33*1) % 103 = 137 % 103 = 34
{
  const c = code128Cubuklar("A");
  // 4 desen × 6 hane + 1 bitiş çubuğu = 25
  bekle("tek karakterde 25 öğe (bitiş çubuğu dahil)", c.length, 25);
  // Start B deseni 211214'tür (211412 Start A'dır — ilk yazımda karıştırılmıştı).
  bekle("Start B deseni doğru", c.slice(0, 6).join(""), "211214");
  // Bitiş karakteri 7 elemanlıdır: 233111 + kapanış çubuğu 2.
  bekle("bitiş deseni ve kapanış çubuğu", c.slice(-7).join(""), "2331112");
}
{
  // Kontrol hanesi hesabı: "AB" için (104 + 33*1 + 34*2) % 103 = 205 % 103 = 102
  const c = code128Cubuklar("AB");
  bekle("iki karakterde 31 öğe", c.length, 31);
  bekle("kontrol deseni doğru (102)", c.slice(18, 24).join(""), "411131");
}
bekle("boş metin → null", code128Cubuklar(""), null);
bekle("Türkçe karakter → null (Code128-B dışı)", code128Cubuklar("Ç"), null);

// ---- SVG ----
{
  const svg = barkodSvg("80000001");
  bekle("svg üretiliyor", svg.startsWith("<svg"), true);
  bekle("kod yazısı svg içinde", svg.includes("80000001"), true);
  bekle("geçersiz kodda boş svg", barkodSvg("Ç"), "");
}

// ÇİFT BARKODU ATAMA testi buradan taşındı: kodlar artık varyantın üstünde saklanmıyor,
// kalıcı stok/renk/ölçü kodlarından kuruluyor. Bkz. test/birim-barkod-semasi.js.

console.log(hata ? "── BARKOD TESTİ BAŞARISIZ ──" : "── barkod testi temiz ──");
process.exit(hata);
