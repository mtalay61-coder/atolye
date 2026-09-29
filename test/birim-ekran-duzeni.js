// BİRİM TESTİ — EKRAN DÜZENİ ÇÖZÜMÜ (v1.522.0) ve BOYUT AYARI NORMALLEME.
const { ekranDuzeniCoz, duzenTasi, boyutAyariNormalle, duzenSutunu, duzenGenislikDegeri } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const bloklar = [{ id: "a" }, { id: "b", genislik: "yarim" }, { id: "c", gizlenemez: true }];
bekle("kayıt yoksa kodun sırası ve varsayılan genişlik", ekranDuzeniCoz(bloklar, null),
  [{ id: "a", genislik: "tam", gizli: false }, { id: "b", genislik: "yarim", gizli: false }, { id: "c", genislik: "tam", gizli: false }]);
bekle("kayıtlı sıra, genişlik, gizli; kodda olmayan blok yok sayılır; yeni blok sona",
  ekranDuzeniCoz(bloklar, [{ id: "c", genislik: "dar" }, { id: "eski", genislik: "tam" }, { id: "a", genislik: "yarim", gizli: true }]),
  [{ id: "c", genislik: "dar", gizli: false }, { id: "a", genislik: "yarim", gizli: true }, { id: "b", genislik: "yarim", gizli: false }]);
bekle("gizlenemez blok gizlenmez, geçersiz genişlik varsayılana döner",
  ekranDuzeniCoz(bloklar, [{ id: "c", gizli: true, genislik: "kocaman" }]).find((x) => x.id === "c"), { id: "c", genislik: "tam", gizli: false });
bekle("aynı blok iki kez kayıtlıysa bir kez", ekranDuzeniCoz(bloklar, [{ id: "a" }, { id: "a" }]).map((x) => x.id), ["a", "b", "c"]);
console.log("serbest genişlik (v1.528.0)");
bekle("1–12 arası sayı geçerli; 0, 13, kesirli ve yazıyla sayı varsayılana döner",
  ekranDuzeniCoz(bloklar, [{ id: "a", genislik: 3 }, { id: "b", genislik: 13 }, { id: "c", genislik: 2.5 }]).map((x) => x.genislik), [3, "yarim", "tam"]);
bekle("sütun: ad → sayı, sayı → sayı, geçersiz → 12", ["dar", "yarim", "tam", 5, "x", 0].map(duzenSutunu), [4, 6, 12, 5, 12, 12]);
bekle("çekerken 4/6/12 adıyla yazılır", [4, 6, 12, 7].map(duzenGenislikDegeri), ["dar", "yarim", "tam", 7]);
const liste = ekranDuzeniCoz(bloklar, null);
bekle("taşı: c → a'nın yerine", duzenTasi(liste, "c", "a").map((x) => x.id), ["c", "a", "b"]);
bekle("taşı: a → c'nin yerine", duzenTasi(liste, "a", "c").map((x) => x.id), ["b", "c", "a"]);
bekle("taşı: bilinmeyen hedef → değişmez", duzenTasi(liste, "a", "yok"), liste);
console.log("boyut ayarı");
bekle("geçerli değerler korunur, geçersiz → normal", boyutAyariNormalle({ genel: "cokKucuk", dugme: "dev", kutu: "buyuk" }), { genel: "cokKucuk", dugme: "normal", kutu: "buyuk" });
bekle("boş → hepsi normal", boyutAyariNormalle(null), { genel: "normal", dugme: "normal", kutu: "normal" });
console.log(hata ? "\n── EKRAN DÜZENİ TESTİ BAŞARISIZ ──" : "\n── ekran düzeni testi temiz ──");
process.exit(hata);
