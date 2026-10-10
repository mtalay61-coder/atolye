// BİRİM TESTİ — DEPOLAMA DURUMU: KAYIT KİMİN? (v1.635.0)
// Kullanıcının ekran görüntüsünde `firma:gorunum`, `oturum:aktif`, `bekleyen:yazma`… "başka uygulama" görünüyordu.
// Ölçülen: "atolye:" önekli ve önek almadan doğrudan yazdığımız anahtarlar bize ait; tanımadığımız anahtar başkasının.
const veri = { "atolye:stok:items": "x".repeat(50), "firma:gorunum": "{}", "oturum:aktif": "1", "bekleyen:yazma": "[]",
  "tanimlar:acikBasliklar": "[]", "gorunum:boyut": "{}", "ustMenu:kademe": "2", "not-defteri:tasks": "y".repeat(30) };
const anahtarlar = Object.keys(veri);
global.localStorage = { get length() { return anahtarlar.length; }, key: (i) => anahtarlar[i], getItem: (k) => veri[k] };
global.Blob = class { constructor(p) { this.size = Buffer.byteLength(p.join("")); } };
const { depoKullanimi } = require("./erp.cjs");
const d = depoKullanimi();
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const yabancilar = d.kayitlar.filter((k) => !k.bizeAitMi).map((k) => k.anahtar);
bekle("yalnız tanımadığımız anahtar başka uygulamanın", yabancilar, ["not-defteri:tasks"]);
bekle("önekli anahtar önek atılarak listeleniyor", d.kayitlar.some((k) => k.anahtar === "stok:items" && k.bizeAitMi), true);
bekle("firma:gorunum bize ait", d.kayitlar.find((k) => k.anahtar === "firma:gorunum").bizeAitMi, true);
console.log(hata ? "── depo sahiplik testi BAŞARISIZ ──" : "── depo sahiplik testi temiz ──");
process.exit(hata);
