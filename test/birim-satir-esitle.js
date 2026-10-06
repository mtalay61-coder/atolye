// BİRİM TESTİ — TOPLU YAZMADA ALAN KÜMESİ EŞİTLEME (v1.602.0)
// Kullanıcı (çoklu cihaz): "Yeniden dene tıklayınca sayı artıyor" — Supabase 400 PGRST102 "All object keys must match".
// Ölçülen: farklı anahtarlı satırlar aynı anahtar kümesine getirilir, eksikler null, anahtar sırası ilk görülen sıra,
// pakette olmayan anahtar eklenmez, değerler (0, "", false, {}) korunur, boş paket boş döner.
const { satirlariEsitle, TABLO_SEMA } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const e = satirlariEsitle([{ id: "a", miktar: 0, ek: { not: "x" } }, { id: "b", miktar: 2 }, { id: "c", miktar: "", renk: false }]);
bekle("her satır aynı anahtar kümesi", e.map((r) => Object.keys(r).join(",")), ["id,miktar,ek,renk", "id,miktar,ek,renk", "id,miktar,ek,renk"]);
bekle("eksikler null, değerler korunur", e, [
  { id: "a", miktar: 0, ek: { not: "x" }, renk: null },
  { id: "b", miktar: 2, ek: null, renk: null },
  { id: "c", miktar: "", ek: null, renk: false },
]);
bekle("boş paket", satirlariEsitle([]), []);
bekle("tek satır olduğu gibi", satirlariEsitle([{ id: "a", x: 1 }]), [{ id: "a", x: 1 }]);
// Gerçek şema: iki sipariş kaleminden biri şema dışı alan taşıyor → eşitlenmeden farklı, eşitlenince aynı.
const s = { id: "s1", siparisNo: "1", tip: "Satış", kalemler: [
  { id: "k1", urunId: "u1", miktar: 1, birimFiyat: 10, yeniAlan: "deneme" },
  { id: "k2", urunId: "u1", miktar: 2, birimFiyat: 10 },
] };
const ham = TABLO_SEMA.siparisler.cocuklar[0].cikar(s);
bekle("ham kalemlerin anahtar kümesi farklı (hatanın sebebi)", ham[0].ek !== undefined && ham[1].ek === undefined, true);
const esit = satirlariEsitle(ham);
bekle("eşitlenince aynı küme, ek null", [Object.keys(esit[0]).join(",") === Object.keys(esit[1]).join(","), esit[1].ek], [true, null]);
if (hata) { console.log("BİRİM TESTİ HATA: satır eşitleme"); process.exit(1); }
console.log("── satır eşitleme testi temiz ──");
