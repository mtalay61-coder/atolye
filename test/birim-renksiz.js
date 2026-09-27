// BİRİM TESTİ — RENKSİZ / BEDENSİZ ÜRÜN TEK KURAL (27 Eylül, v1.493.0)
//
// Kullanıcı: "Uygulama renksiz bedensiz stoğu standart renk ve bedenli olarak mı görüyor?" Renksiz
// malzeme kayıtta üç biçimde durur: "Standart", "" ya da hiç varyant. Üçü aynı anlam (012).
//
// İddialar:
//   • Üç biçim de renksiz/bedensiz; gerçek bir renk/beden varsa değil.
//   • Tek eksen: renksiz ama bedenli (ve tersi) doğru ayrılıyor.
//   • Stok eşleşmesi: reçetenin "Standart" satırı, "" kayıtlı varyantın stoğunu buluyor (020).
const { urunRenksizMi, urunBedensizMi, rezervasyonKarsilama } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const std = { variants: [{ renk: "Standart", beden: "Standart", miktar: 3 }] };
const bos = { variants: [{ renk: "", beden: "", miktar: 3 }] };
const yok = { variants: [] };
const bedenli = { variants: [{ renk: "", beden: "40" }, { renk: "", beden: "41" }] };
const renkli = { variants: [{ renk: "Siyah", beden: "Standart" }] };
const karma = { variants: [{ renk: "Standart", beden: "Standart" }, { renk: "Siyah", beden: "40" }] };

console.log("Renksiz / bedensiz kuralı");
bekle("Standart/Standart renksiz ve bedensiz", [urunRenksizMi(std), urunBedensizMi(std)], [true, true]);
bekle("boş/boş renksiz ve bedensiz", [urunRenksizMi(bos), urunBedensizMi(bos)], [true, true]);
bekle("hiç varyant yok: renksiz ve bedensiz", [urunRenksizMi(yok), urunBedensizMi(yok)], [true, true]);
bekle("renksiz ama bedenli", [urunRenksizMi(bedenli), urunBedensizMi(bedenli)], [true, false]);
bekle("renkli ama bedensiz", [urunRenksizMi(renkli), urunBedensizMi(renkli)], [false, true]);
bekle("gerçek renk varsa renksiz değil (yer tutucu satır olsa da)", [urunRenksizMi(karma), urunBedensizMi(karma)], [false, false]);
bekle("ürün yoksa false", [urunRenksizMi(null), urunBedensizMi(undefined)], [false, false]);

console.log("Stok eşleşmesi (\"Standart\" ↔ \"\")");
const stok = [{ id: "c", variants: [{ renk: "", beden: "", miktar: 7 }] }];
bekle("reçetenin Standart satırı boş kayıtlı stoğu buluyor", rezervasyonKarsilama("c", "Standart", "Standart", [], [], stok).stok, 7);

process.exit(hata);
