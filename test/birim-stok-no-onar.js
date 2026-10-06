// BİRİM TESTİ — STOK NO ÇAKIŞMASI ONARIMI (v1.606.0)
// Kullanıcı (çoklu cihaz): Supabase 409 "duplicate key value violates unique constraint urunler_stok_no_tekil".
// Ölçülen: yerel çift → en eski (kimlik zamanı) korur, yenisi sıradaki boş numara; sayaç en büyük numaranın gerisinde
// kalmaz; bulutta aynı numara başka üründeyse yerel ürün yeni numara alır; kendi numarası bulutta kendi kimliğindeyse
// dokunulmaz; çakışma yoksa aynı nesneler döner.
const { stokNoCakismalariniOnar } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
// Kimlik: "stok-<base36 zaman>-x" — eski kayıt küçük zaman.
const u = (id, ad, stokNo) => ({ id, ad, stokNo });
const stok = [u("stok-20-a", "Yeni", 7), u("stok-10-b", "Eski", 7), u("stok-11-c", "Başka", 9)];
const t = { kodSayaclari: { stok: 7 } };
const o = stokNoCakismalariniOnar(stok, t);
bekle("yerel çift: eski 7'de kalır, yeni 10 (9 dolu), sayaç 10", [o.stok.map((x) => `${x.ad}:${x.stokNo}`), o.tanimlar.kodSayaclari.stok, o.degisenler.map((d) => `${d.ad}:${d.eski}→${d.yeni}`)],
  [["Yeni:10", "Eski:7", "Başka:9"], 10, ["Yeni:7→10"]]);
const yok = stokNoCakismalariniOnar([u("a", "A", 1), u("b", "B", 2)], t);
bekle("çakışma yoksa aynı nesneler, değişen yok", [yok.degisenler.length, yok.tanimlar === t], [0, true]);
const bulut = { 7: "stok-99-uzak", 9: "stok-11-c", 12: "stok-98-uzak2" };
const ob = stokNoCakismalariniOnar([u("stok-10-b", "Eski", 7), u("stok-11-c", "Başka", 9)], { kodSayaclari: { stok: 9 } }, bulut);
bekle("bulutta 7 başka üründe → Eski 13 (12 bulutta dolu); Başka 9 kendi kimliğinde kalır", [ob.stok.map((x) => `${x.ad}:${x.stokNo}`), ob.tanimlar.kodSayaclari.stok], [["Eski:13", "Başka:9"], 13]);
bekle("stok no'suz ürüne dokunulmaz", stokNoCakismalariniOnar([u("a", "A", 0), u("b", "B", null)], t).degisenler.length, 0);
if (hata) { console.log("BİRİM TESTİ HATA: stok no onarımı"); process.exit(1); }
console.log("── stok no onarımı testi temiz ──");
