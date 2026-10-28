// BİRİM TESTİ — YAZMA ZARFI ve CARİ v2 KÖPRÜSÜ (v1.727.0, src/040 + src/038)
// Bir fişin stok ve cari farkı aynı zarfla yazılınca:
//   1. Stok ve cari v2'deyse TEK `rpc/fis_yaz` isteği gider (stok + cari aynı veritabanı işlemi); alt tablolara REST yok.
//   2. Yalnız stok v2'deyse: stok `rpc/stk_yaz`, cari bugünkü REST yolundan (cari_hareketleri POST) — geçiş dönemi.
//   3. İstek düşerse İKİ tablonun da sözü reddedilir, ikisi de bekleyen deftere yazılır, bellekleri geri alınır: sonraki
//      yazma aynı satırları yeniden gönderir (tekrara dayanıklı).
//   4. Zarfın bir tablosu gelmezse (akış cariye hiç yazmadı) zarf beklemesi dolunca gelen tablo tek başına yazılır.
//   5. Cari silme → iptal; değişmeyen satır gönderilmez.
//   6. birlikteYaz: sıralı akışlar için iki yazmayı birlikte başlatır, tek sonuç döner.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
global.window.__supabaseYenidenDenemeMs = [];
const istekler = [];
let dussun = false;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  istekler.push({ yontem, yol, govde: sec.body ? String(sec.body) : "" });
  if (yol.startsWith("rpc/") && dussun) throw new TypeError("Failed to fetch");
  if (yol.startsWith("rpc/")) return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  const govde = yontem === "PATCH" ? [{ id: "x" }] : [];
  return { ok: true, status: 200, json: async () => govde, text: async () => "" };
};
const { supabaseTabloEsitle, tabloBaslangicTam, bekleyenKayitlariOku, surumleriYukle, yazmaZarfi, birlikteYaz, cariV2Yuku,
  stokV2AktifAyarla, stokV2TanimlarAyarla, cariV2AktifAyarla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const sifirla = () => { istekler.length = 0; };
const rpc = (ad) => istekler.filter((r) => r.yol.startsWith(`rpc/${ad}`)).map((r) => JSON.parse(r.govde).p);
const rest = (tablo) => istekler.filter((r) => r.yol.startsWith(tablo)).length;

const tanimlar = { renkler: [{ id: "r-siyah", ad: "Siyah" }], renkKombinasyonlari: [], bedenler: [] };
const stok0 = [{ id: "u-kosele", ad: "Kösele", variants: [{ renk: "Siyah", renkId: "r-siyah", beden: "Standart", miktar: 10, minStok: 0 }],
  hareketler: [{ id: "h1", renk: "Siyah", beden: "Standart", miktar: 10, kaynak: "Satınalma", tarih: "2026-10-01T09:00:00.000Z", fisNo: "AF-1" }] }];
const cari0 = [{ id: "c-2", unvan: "Yıldız", hareketler: [{ id: "ch1", tarih: "2026-10-01", yon: "Alacak", tutar: 100, paraBirimi: "TRY", fisNo: "SF-0" }] }];

function satisFisi(stok, cariler, no, miktar, tutar) {
  const s = derin(stok); const c = derin(cariler);
  s[0].hareketler.unshift({ id: `sh-${no}`, renk: "Siyah", beden: "Standart", miktar: -miktar, kaynak: "Satış", tarih: "2026-10-28T10:00:00.000Z", fisNo: `SF-${no}` });
  s[0].variants[0].miktar -= miktar;
  c[0].hareketler.unshift({ id: `ch-${no}`, tarih: "2026-10-28", yon: "Alacak", tutar, paraBirimi: "TRY", fisNo: `SF-${no}` });
  return [s, c];
}

(async () => {
  stokV2TanimlarAyarla(tanimlar);
  tabloBaslangicTam("urunler", derin(stok0));
  tabloBaslangicTam("cariler", derin(cari0));
  surumleriYukle("urunler", [{ id: "u-kosele", surum: 1 }]);
  surumleriYukle("cariler", [{ id: "c-2", surum: 1 }]);
  let stok = derin(stok0); let cariler = derin(cari0);

  console.log("1) Stok + cari v2: tek fis_yaz");
  stokV2AktifAyarla(true); cariV2AktifAyarla(true);
  sifirla();
  [stok, cariler] = satisFisi(stok, cariler, 1, 2, 500);
  let zarf = yazmaZarfi(["urunler", "cariler"]);
  const [a, b] = await Promise.all([supabaseTabloEsitle("urunler", stok, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  bekle("tek rpc: fis_yaz", [rpc("fis_yaz").length, rpc("stk_yaz").length, rpc("car_yaz").length], [1, 0, 0]);
  const p1 = rpc("fis_yaz")[0];
  bekle("stok kısmı", p1.stok.satirlar.map((x) => [x.id, x.miktar, x.fisId]), [["sh-1", -2, "SF-1"]]);
  bekle("cari kısmı (bugünkü sütun adlarıyla)", p1.cari.satirlar.map((x) => [x.id, x.cari_id, x.tutar, x.fis_no, "__k" in x]), [["ch-1", "c-2", 500, "SF-1", false]]);
  bekle("alt tablolara REST yok", [rest("stok_hareketleri"), rest("varyantlar"), rest("cari_hareketleri")], [0, 0, 0]);
  bekle("iki söz de çözüldü", [!!a, !!b], [true, true]);

  console.log("2) Yalnız stok v2: stk_yaz + cari REST");
  cariV2AktifAyarla(false);
  sifirla();
  [stok, cariler] = satisFisi(stok, cariler, 2, 1, 250);
  zarf = yazmaZarfi(["urunler", "cariler"]);
  await Promise.all([supabaseTabloEsitle("urunler", stok, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  bekle("stk_yaz + REST cari_hareketleri POST", [rpc("stk_yaz").length, rpc("fis_yaz").length, istekler.some((r) => r.yontem === "POST" && r.yol.startsWith("cari_hareketleri"))], [1, 0, true]);
  cariV2AktifAyarla(true);

  console.log("3) İstek düşerse: ikisi de reddedilir, ikisi de bekleyen defterde, yeniden gönderim aynı satırlar");
  sifirla();
  dussun = true;
  [stok, cariler] = satisFisi(stok, cariler, 3, 1, 125);
  zarf = yazmaZarfi(["urunler", "cariler"]);
  const sonuclar = await Promise.allSettled([supabaseTabloEsitle("urunler", stok, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  bekle("iki söz de reddedildi", sonuclar.map((x) => x.status), ["rejected", "rejected"]);
  const defter = JSON.stringify(bekleyenKayitlariOku());
  bekle("bekleyen defterde iki taraf", [defter.includes("sh-3"), defter.includes("ch-3")], [true, true]);
  dussun = false;
  sifirla();
  zarf = yazmaZarfi(["urunler", "cariler"]);
  await Promise.all([supabaseTabloEsitle("urunler", stok, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  const p3 = rpc("fis_yaz")[0];
  bekle("yeniden gönderim: ikisi birlikte, aynı satırlar", p3 && [p3.stok.satirlar.map((x) => x.id), p3.cari.satirlar.map((x) => x.id)], [["sh-3"], ["ch-3"]]);

  console.log("4) Zarfın öteki tablosu gelmezse bekleme dolunca tek başına yazılır");
  sifirla();
  const s4 = derin(stok); s4[0].hareketler.unshift({ id: "sh-4", renk: "Siyah", beden: "Standart", miktar: 3, kaynak: "Manuel", tarih: "2026-10-28T11:00:00.000Z", fisNo: "MNL-4" });
  zarf = yazmaZarfi(["urunler", "cariler"], 50);
  await supabaseTabloEsitle("urunler", s4, { zarf });
  stok = s4;
  bekle("yalnız stok: stk_yaz", [rpc("stk_yaz").length, rpc("fis_yaz").length], [1, 0]);

  console.log("5) Cari silme → iptal; değişmeyen satır gitmez");
  bekle("cariV2Yuku", cariV2Yuku({ eklenen: [{ id: "a", __k: "a", cari_id: "c", tutar: 1 }], guncellenen: [], silinen: ["x", "y"] }),
    { satirlar: [{ id: "a", cari_id: "c", tutar: 1 }], iptal: ["x", "y"] });
  sifirla();
  const c5 = derin(cariler); c5[0].hareketler = c5[0].hareketler.filter((h) => h.id !== "ch-1");
  await supabaseTabloEsitle("cariler", c5);
  cariler = c5;
  bekle("tek car_yaz, yalnız iptal", rpc("car_yaz").map((p) => [p.satirlar.length, p.iptal]), [[0, ["ch-1"]]]);

  console.log("6) birlikteYaz: iki yazma birlikte, tek sonuç");
  sifirla();
  [stok, cariler] = satisFisi(stok, cariler, 6, 1, 60);
  const r6 = await birlikteYaz([
    { anahtar: "stok:items", tablo: "urunler", kayitlar: stok },
    { anahtar: "cari:data", tablo: "cariler", kayitlar: cariler },
  ]);
  bekle("ok + tek fis_yaz", [r6.ok, rpc("fis_yaz").length], [true, 1]);

  console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
  process.exit(hata);
})();
