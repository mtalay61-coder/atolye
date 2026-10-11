// BİRİM TESTİ — KİMİN YAPTIĞI DAMGASI (v1.645.9, 048)
// Kullanıcı: "İşlemi yapan kullanıcı yazmıyor" (Son işlemler: üretim, işçilik, sipariş satırlarında "—").
// Ölçülen: yalnız YENİ hareket / sipariş damgalanır; adı olana dokunulmaz; eski kayıt boş kalır; kullanıcı yoksa ve
// değişiklik yoksa aynı dizi döner; zaman eksikse eklenir.
const { yeniHareketleriDamgala, yeniSiparisleriDamgala } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata++; console.log("    beklenen:", JSON.stringify(b), "\n    gelen:   ", JSON.stringify(a)); }
};
const eskiCari = { id: "c1", hareketler: [{ id: "h1", tutar: 5 }] };
const onceki = [eskiCari, { id: "c2", hareketler: [] }];
const yeni = [{ ...eskiCari, hareketler: [{ id: "h2", tutar: 9 }, ...eskiCari.hareketler, { id: "h3", kullanici: "sistem" }] }, onceki[1]];
const d = yeniHareketleriDamgala(onceki, yeni, "Mahmut", "2026-10-11T15:00:00.000Z");
bekle("yeni hareket damgalı, eski boş, sistem korunur", d[0].hareketler.map((h) => [h.id, h.kullanici || null, h.zaman || null]),
  [["h2", "Mahmut", "2026-10-11T15:00:00.000Z"], ["h1", null, null], ["h3", "sistem", null]]);
bekle("değişmeyen kayıt aynı nesne", d[1] === onceki[1], true);
bekle("kullanıcı yoksa aynı dizi", yeniHareketleriDamgala(onceki, yeni, null, "x") === yeni, true);
bekle("yeni hareket yoksa aynı dizi", yeniHareketleriDamgala(onceki, onceki, "Mahmut", "x") === onceki, true);
const s = yeniSiparisleriDamgala([{ id: "s1" }], [{ id: "s1" }, { id: "s2", olusturuldu: "2026-10-01T08:00:00.000Z" }], "Mahmut", "2026-10-11T15:00:00.000Z");
bekle("yeni sipariş olusturan alır, eski almaz, olusturuldu korunur", s.map((x) => [x.id, x.olusturan || null, x.olusturuldu || null]),
  [["s1", null, null], ["s2", "Mahmut", "2026-10-01T08:00:00.000Z"]]);
if (hata) { console.log("BİRİM TESTİ HATA: kullanıcı damgası"); process.exit(1); }
console.log("── kullanıcı damgası testi temiz ──");
