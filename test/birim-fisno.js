// BİRİM TESTİ — SIRA NUMARALI FİŞ NO.
//
// Kullanıcı: "Fişlerin sonuna 02ZQYK gibi girecekğine, tahsilat için THS-20260902-001,
// THS-20260902-002 gibi devam etsin."
const { fisNoSiradaki, fisOnEki, tumFisNumaralari } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// 17 Eylül: numara biçimi kısaldı — yıl atıldı ve tire kalktı: `THS-20260918-001` → `THS-0918001`.
// Test artık aynı kuralı kullanıyor (ay+gün) ve beklenen değerler `THS-${gun}001` biçiminde.
const gun = new Date().toLocaleDateString("sv-SE").replace(/-/g, "").slice(4);

bekle("Tahsilat → THS", fisOnEki("Tahsilat"), "THS");
bekle("Ödeme → ODM", fisOnEki("Ödeme"), "ODM");
bekle("Alış → AF", fisOnEki("Alış"), "AF");
bekle("Satış → SF", fisOnEki("Satış"), "SF");
bekle("bilinmeyen tip → EL", fisOnEki(null), "EL");

bekle("ilk numara 001", fisNoSiradaki("THS", []), `THS-${gun}001`);
bekle("ikinci numara 002", fisNoSiradaki("THS", [`THS-${gun}001`]), `THS-${gun}002`);
bekle("boşluk atlanmaz, en büyükten devam", fisNoSiradaki("THS", [`THS-${gun}001`, `THS-${gun}007`]), `THS-${gun}008`);

// Farklı ön ekler ve farklı günler birbirinin sayacını ETKİLEMEZ.
bekle("ödeme kendi sayacını tutar", fisNoSiradaki("ODM", [`THS-${gun}005`]), `ODM-${gun}001`);
bekle("dünkü numara bugünü etkilemez", fisNoSiradaki("THS", ["THS-0101009"]), `THS-${gun}001`);

// Eski RASTGELE numaralar ("THS-…-02ZQYK") sayı değil; sayaç onları yok sayar ama çakışmaz.
bekle("eski rastgele numara sayaca karışmaz", fisNoSiradaki("THS", [`THS-${gun}02ZQYK`]), `THS-${gun}001`);

// Aynı numara zaten varsa bir sonrakine geçilir — aynı cihazda çakışma imkânsız.
bekle("çakışma varsa atlanır", fisNoSiradaki("THS", [`THS-${gun}001`, `THS-${gun}002`]), `THS-${gun}003`);

bekle("cari hareketlerinden numara toplama",
  tumFisNumaralari([{ hareketler: [{ fisNo: "A" }, { fisNo: null }] }, { hareketler: [{ fisNo: "B" }] }]),
  ["A", "B"]);

console.log(hata ? "── FİŞ NO TESTİ BAŞARISIZ ──" : "── fiş no testi temiz ──");
process.exit(hata);
