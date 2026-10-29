// BİRİM TESTİ — v1.730.1 DENETİM KORUMALARI (src/038, 030, 040, 045)
//   1. Taban yokken (bulut açılışta okunamamış) Kasa ve listeler YAZILMAZ — bekleyen deftere düşer (eski yerel kopya basılmaz).
//   2. Sunucu ayarı (v2 bayrakları) okunamadıysa v2'ye geçebilecek tabloların yazması bekletilir; ana satır bile gitmez.
//   3. fis_yaz yanıtında gönderilen parça yoksa (sunucudaki tanım eski) hata — sessiz kayıp yok.
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
global.window.__supabaseYenidenDenemeMs = [];
const istekler = [];
let fisYanit = null;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  istekler.push({ yontem: sec.method || "GET", yol });
  const json = yol.startsWith("rpc/fis_yaz") ? fisYanit : (sec.method === "PATCH" ? [{ id: "x" }] : (yol.startsWith("rpc/") ? {} : []));
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => "" };
};
const { tekilYaz, tekilTabanAyarla, bekleyenYazmalariOku, kasaV2AktifAyarla, listeV2TablolariAyarla, v2AyarDurumuAyarla,
  tabloYaz, tabloBaslangicTam, surumleriYukle, v2KopruGonder } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
(async () => {
  console.log("1) Taban yokken yazılmaz");
  kasaV2AktifAyarla(true); listeV2TablolariAyarla(["teklifler"]);
  tekilTabanAyarla("muhasebe", null); tekilTabanAyarla("teklifler", null);
  istekler.length = 0;
  await tekilYaz("muhasebe:data", "muhasebe", { kasalar: [{ id: "K1", ad: "Kasa", hareketler: [{ id: "h1", tutar: 5 }] }], bankalar: [], cekler: [], kurlar: { USD: 42 } });
  await tekilYaz("teklif:data", "teklifler", [{ id: "t1" }]);
  bekle("kasa / liste: sunucuya istek yok", istekler.filter((r) => r.yol.startsWith("rpc/") || r.yontem === "POST").length, 0);
  bekle("ikisi de bekleyende", [!!bekleyenYazmalariOku()["muhasebe:data"], !!bekleyenYazmalariOku()["teklif:data"]], [true, true]);

  console.log("2) Sunucu ayarı okunamadıysa bekletilir");
  v2AyarDurumuAyarla("bilinmiyor");
  tabloBaslangicTam("cariler", [{ id: "c1", unvan: "A", hareketler: [] }]);
  surumleriYukle("cariler", [{ id: "c1", surum: 1 }]);
  istekler.length = 0;
  const r = await tabloYaz("cari:data", "cariler", [{ id: "c1", unvan: "A2", hareketler: [] }]);
  bekle("cari yazması: istek yok, sonuç başarısız, bekleyende", [istekler.length, r.ok, !!bekleyenYazmalariOku()["cari:data"]], [0, false, true]);
  tekilTabanAyarla("muhasebe", { kasalar: [], bankalar: [], cekler: [] });
  istekler.length = 0;
  await tekilYaz("muhasebe:data", "muhasebe", { kasalar: [], bankalar: [], cekler: [], kurlar: { USD: 43 } });
  bekle("kasa yazması da bekletildi", istekler.length, 0);
  v2AyarDurumuAyarla("okundu");

  console.log("3) fis_yaz yanıtında eksik parça → hata");
  fisYanit = { stok: null, cari: { satir: 1 } };   // sunucudaki fis_yaz eski: kasa parçasını atladı
  let hataMesaji = "";
  try { await v2KopruGonder([{ tur: "cari", yuk: { satirlar: [{ id: "x" }], iptal: [] } }, { tur: "kasa", yuk: { hesaplar: [], hesapSil: [], hareketler: [{ id: "h", hesap_id: "K1", veri: {} }], hareketIptal: [], cekler: [], cekIptal: [], ayar: {}, ayarSil: [] } }]); }
  catch (e) { hataMesaji = String(e.message); }
  bekle("eksik kasa parçası hata verdi", /fis_yaz yanıtında kasa yok/.test(hataMesaji), true);
  fisYanit = { cari: { satir: 1 }, kasa: { hareket: 1 } };
  hataMesaji = "";
  try { await v2KopruGonder([{ tur: "cari", yuk: { satirlar: [{ id: "x" }], iptal: [] } }, { tur: "kasa", yuk: { hesaplar: [], hesapSil: [], hareketler: [{ id: "h", hesap_id: "K1", veri: {} }], hareketIptal: [], cekler: [], cekIptal: [], ayar: {}, ayarSil: [] } }]); }
  catch (e) { hataMesaji = String(e.message); }
  bekle("tam yanıt → hata yok", hataMesaji, "");
  console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
