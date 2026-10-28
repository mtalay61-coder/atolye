// BİRİM TESTİ — YAZMA DAYANIKLILIĞI (v1.724.1, 030/040): ağ hatasında yeniden deneme, parçalı POST, gruplu bileşik silme.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
const istekler = [];
let dusurulecek = 0;   // sıradaki kaç fetch "Failed to fetch" atsın
global.fetch = async (url, sec = {}) => {
  if (dusurulecek > 0) { dusurulecek--; throw new TypeError("Failed to fetch"); }
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  istekler.push({ yontem, yol: decodeURIComponent(yol), govde: sec.body ? JSON.parse(sec.body) : null });
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => (yontem === "PATCH" ? [{ id: "x" }] : []), text: async () => "" };
};
const { supabaseIstek, supabaseSilBilesik, supabasePostParcali, postParcalari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
(async () => {
  console.log("1) Ağ hatasında yeniden deneme");
  const t0 = Date.now();
  dusurulecek = 2;
  await supabaseIstek("urunler", { method: "DELETE" });
  bekle("2 kopuş sonrası 3. deneme geçti (tek kayıtlı istek)", istekler.length, 1);
  bekle("aralar beklendi (≥ 2,2 sn)", Date.now() - t0 >= 2100, true);
  dusurulecek = 4;
  let son = null;
  try { await supabaseIstek("urunler", { method: "POST", body: "[]" }); } catch (e) { son = e.message; }
  bekle("4 kopuş: 3 yeniden denemeden sonra hata yukarı, düşen istek yazılı", son, "Failed to fetch — POST urunler · gövde 0 KB · adres 7 karakter");
  dusurulecek = 1; son = null; const t1 = Date.now();
  try { await supabaseIstek("urunler?select=id"); } catch (e) { son = e.message; }
  bekle("okuma denenmez: ilk kopuşta hemen hata", [/^Failed to fetch — GET urunler/.test(son), Date.now() - t1 < 300], [true, true]);
  dusurulecek = 0;

  console.log("2) Parçalı POST");
  istekler.length = 0;
  await supabasePostParcali("varyantlar?on_conflict=urun_id,renk,beden", new Array(950).fill(0).map((_, i) => ({ urun_id: "u1", renk: "Siyah", beden: String(i), miktar: i % 3 ? 1 : undefined })));
  bekle("950 satır → 3 istek (400 · 400 · 150)", istekler.map((r) => r.govde.length), [400, 400, 150]);
  bekle("satır anahtarları eşitlendi (eksik alan null)", istekler[0].govde[0].miktar, null);
  bekle("merge-duplicates", istekler.every((r) => r.yontem === "POST"), true);

  console.log("2b) Boyuta göre parçalama");
  const buyuk = new Array(10).fill(0).map((_, i) => ({ id: `u${i}`, gorsel: "x".repeat(300 * 1024) }));
  bekle("10 × 300 KB satır → 900 KB sınırında 2'şerli parçalar", postParcalari(buyuk).map((p) => p.length), [2, 2, 2, 2, 2]);
  bekle("tek satır sınırdan büyükse tek başına", postParcalari([{ a: "x".repeat(2000 * 1024) }, { b: 1 }]).map((p) => p.length), [1, 1]);
  bekle("küçük satırlar 400'lük", postParcalari(new Array(900).fill({ a: 1 })).map((p) => p.length), [400, 400, 100]);

  console.log("3) Gruplu bileşik silme");
  istekler.length = 0;
  const kayitlar = [];
  ["Siyah", "Taba"].forEach((renk) => ["40", "41", "42"].forEach((beden) => kayitlar.push({ urun_id: "u1", renk, beden })));
  kayitlar.push({ urun_id: "u2", renk: "Siyah", beden: "38" });
  kayitlar.push({ urun_id: "u2", renk: "Siyah", beden: null });          // bedensiz malzeme: tek başına, is.null
  kayitlar.push({ urun_id: "u3", renk: 'A "b", c', beden: "S" });        // tırnak/virgül kaçışı
  await supabaseSilBilesik("varyantlar", ["urun_id", "renk", "beden"], kayitlar);
  bekle("9 satır → 5 istek (u1 Siyah, u1 Taba, u2 Siyah, u2 null, u3)", istekler.length, 5);
  bekle("ürün+renk grubu beden listesiyle", istekler[0].yol, 'varyantlar?urun_id=in.("u1")&renk=in.("Siyah")&beden=in.("40","41","42")');
  bekle("NULL beden tek başına is.null", istekler.find((r) => /is\.null/.test(r.yol)).yol, 'varyantlar?urun_id=in.("u2")&renk=in.("Siyah")&beden=is.null');
  bekle("tırnaklı renk kaçışlı", istekler.find((r) => /u3/.test(r.yol)).yol, 'varyantlar?urun_id=in.("u3")&renk=in.("A \\"b\\", c")&beden=in.("S")');
  bekle("hepsi DELETE", istekler.every((r) => r.yontem === "DELETE"), true);
  istekler.length = 0;
  await supabaseSilBilesik("varyantlar", ["urun_id", "renk", "beden"], new Array(250).fill(0).map((_, i) => ({ urun_id: "u1", renk: "Siyah", beden: String(i) })));
  bekle("250 beden → 100'erlik 3 istek", istekler.map((r) => (r.yol.match(/"/g) || []).length / 2 - 2), [100, 100, 50]);

  if (hata) { console.log("birim-yazma-dayaniklilik: HATA"); process.exit(1); }
  console.log("birim-yazma-dayaniklilik: tamam");
})().catch((e) => { console.error(e); process.exit(1); });
