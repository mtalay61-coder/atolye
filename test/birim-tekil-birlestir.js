// BİRİM TESTİ — TEK PARÇA TABLO ÜÇ YÖNLÜ BİRLEŞTİRME (v1.725.0, 089 `ucYonluBirlestir` + 030 `tekilYaz`).
// Olaylar: "Girilen teklif başka cihazdan kayboldu" (eski listeyi tutan cihaz bütün listeyi bastı) ve telefonda Kasa & Banka
// "0 hesap" (bulutu okuyamamış cihazın boş hâli kur güncellemesiyle buluta gidebilirdi).
const bellek = {};
global.window = global.window || {};
global.window.localStorage = { getItem: (k) => (k in bellek ? bellek[k] : null), setItem: (k, v) => { bellek[k] = String(v); }, removeItem: (k) => { delete bellek[k]; } };
global.window.__supabaseYenidenDenemeMs = [1, 1, 1];
const istekler = [];
let bulutSatiri = null;     // GET'in döndüreceği `veri`
let getDussun = false;
global.fetch = async (url, sec = {}) => {
  const yol = String(url).replace(/^.*\/rest\/v1\//, "");
  const yontem = sec.method || "GET";
  if (yontem === "GET" && getDussun && /^teklifler\?/.test(yol)) throw new TypeError("Failed to fetch");
  istekler.push({ yontem, yol, govde: sec.body ? JSON.parse(sec.body) : null });
  const json = yontem === "GET" && /^teklifler\?/.test(yol) ? (bulutSatiri ? [{ veri: bulutSatiri }] : []) : [];
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => "" };
};
const { ucYonluBirlestir, tekilYaz, tekilTabanAyarla, tekilTabanOku } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const T = (id, ek = {}) => ({ id, teklifNo: `TKL-${id}`, durum: "Hazırlanıyor", ...ek });
const idler = (l) => l.map((x) => x.id);

(async () => {
  console.log("1) Saf kural — kimlikli liste (teklifler)");
  bekle("başka cihazın yenisi korunur, bu cihazın yenisi eklenir", idler(ucYonluBirlestir([T("A"), T("C")], [T("A"), T("B")], [T("A")])), ["A", "C", "B"]);
  bekle("bu cihazın silmesi gider", idler(ucYonluBirlestir([T("A")], [T("A"), T("B")], [T("A"), T("B")])), ["A"]);
  bekle("başka cihazın silmesi gider (bu cihaz dokunmamış)", idler(ucYonluBirlestir([T("A"), T("B")], [T("A")], [T("A"), T("B")])), ["A"]);
  bekle("başka cihazın değişikliği korunur (bu cihaz dokunmamış)", ucYonluBirlestir([T("A")], [T("A", { durum: "Gönderildi" })], [T("A")])[0].durum, "Gönderildi");
  bekle("iki taraf farklı alanı değiştirdi → ikisi de", ucYonluBirlestir([T("A", { not: "yerel" })], [T("A", { durum: "Gönderildi" })], [T("A")])[0], T("A", { not: "yerel", durum: "Gönderildi" }));
  bekle("aynı alan → bu cihaz kazanır", ucYonluBirlestir([T("A", { durum: "Reddedildi" })], [T("A", { durum: "Gönderildi" })], [T("A")])[0].durum, "Reddedildi");
  bekle("bu cihaz sildi ama başka cihaz değiştirdi → kalır (bulut hâli)", ucYonluBirlestir([], [T("A", { durum: "Gönderildi" })], [T("A")]), [T("A", { durum: "Gönderildi" })]);
  bekle("başka cihaz sildi ama bu cihaz değiştirdi → kalır (yerel hâl)", ucYonluBirlestir([T("A", { not: "x" })], [], [T("A")]), [T("A", { not: "x" })]);

  console.log("2) Saf kural — iç içe nesne (Kasa & Banka)");
  const kasa = (hareketler) => ({ id: "K1", ad: "Kasa", hareketler });
  const h = (id, tutar) => ({ id, tutar });
  const taban = { kasalar: [kasa([h("h1", 100)])], bankalar: [], cekler: [], kurlar: { USD: 49.65 } };
  const bulut = { kasalar: [kasa([h("h1", 100), h("h3", 30)])], bankalar: [], cekler: [], kurlar: { USD: 49.65 } };
  const yerel = { kasalar: [kasa([h("h1", 100), h("h2", 20)])], bankalar: [], cekler: [], kurlar: { USD: 49.79 } };
  const b = ucYonluBirlestir(yerel, bulut, taban);
  bekle("aynı kasaya iki cihazdan iki hareket → ikisi de", idler(b.kasalar[0].hareketler), ["h1", "h2", "h3"]);
  bekle("kur bu cihazdan", b.kurlar.USD, 49.79);
  const bos = { kasalar: [], bankalar: [], cekler: [], kurlar: { USD: 49.79 } };
  const dolu = { kasalar: [kasa([h("h1", 100)]), { id: "K2", ad: "Banka", hareketler: [] }], bankalar: [{ id: "B1", hareketler: [] }], cekler: [{ id: "c1" }], kurlar: { USD: 49.65 } };
  const kurtarilan = ucYonluBirlestir(bos, dolu, undefined);
  bekle("taban yok (bulut okunamamıştı) + boş hâl → buluttaki kasalar/bankalar/çekler korunur", [kurtarilan.kasalar.length, kurtarilan.bankalar.length, kurtarilan.cekler.length, kurtarilan.kurlar.USD], [2, 1, 1, 49.79]);
  bekle("taban var, bu cihaz bilerek boşalttı → boşalır", ucYonluBirlestir(bos, dolu, dolu).kasalar.length, 0);

  console.log("3) tekilYaz akışı");
  const birlesenler = [];
  global.window.__tekilBirlesti = (tablo, birlesik, gonderilen) => birlesenler.push({ tablo, birlesik: idler(birlesik), gonderilen: idler(gonderilen) });
  tekilTabanAyarla("teklifler", [T("A")]);
  bulutSatiri = [T("A"), T("B")];
  istekler.length = 0;
  const yerelListe = [T("A"), T("C")];
  await tekilYaz("teklif:data", "teklifler", yerelListe);
  const post = istekler.find((r) => r.yontem === "POST" && r.yol.startsWith("teklifler"));
  bekle("önce bulut okundu, sonra yazıldı", istekler.filter((r) => r.yol.startsWith("teklifler")).map((r) => r.yontem), ["GET", "POST"]);
  bekle("buluta birleşik liste gitti (B korunuyor)", idler(post.govde[0].veri), ["A", "C", "B"]);
  bekle("ekrana birleşik bildirildi", birlesenler, [{ tablo: "teklifler", birlesik: ["A", "C", "B"], gonderilen: ["A", "C"] }]);
  // Yerel kopyanın birleşik yazılması tarayıcı senaryosunda ölçülür (Node'da yerel depo yok).
  bekle("taban = bu cihazın gönderdiği hâl", idler(tekilTabanOku("teklifler")), ["A", "C"]);
  // Ekran henüz birleşiği göstermiyorken (A, C) bir sonraki yazma B'yi silmemeli.
  bulutSatiri = [T("A"), T("C"), T("B")];
  istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("A"), T("C"), T("D")]);
  bekle("ikinci yazma: ekranda olmayan B yine korunur", idler(istekler.find((r) => r.yontem === "POST").govde[0].veri), ["A", "C", "D", "B"]);
  // Bulut okunamazsa yazma GİTMEZ (birleştirmesiz basmak yok) → bekleyen deftere düşer.
  getDussun = true;
  istekler.length = 0;
  delete bellek["bekleyen:yazma"];
  await tekilYaz("teklif:data", "teklifler", [T("A")]);
  bekle("bulut okunamadı → POST yok", istekler.filter((r) => r.yontem === "POST" && r.yol.startsWith("teklifler")).length, 0);
  bekle("bekleyen deftere düştü", Object.keys(JSON.parse(bellek["bekleyen:yazma"] || "{}")), ["teklif:data"]);
  getDussun = false;
  // `{ birlestirme: false }` bütününü yazar (bulut okunmaz).
  istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("Z")], { birlestirme: false });
  bekle("birleştirmesiz: GET yok, yalnız Z", [istekler.filter((r) => r.yontem === "GET" && r.yol.startsWith("teklifler")).length, idler(istekler.find((r) => r.yontem === "POST").govde[0].veri)], [0, ["Z"]]);
  // Bulutta satır yoksa (ilk yazma) yerel olduğu gibi.
  bulutSatiri = null; tekilTabanAyarla("teklifler", null);
  istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("İlk")]);
  bekle("bulutta satır yok → yerel aynen", idler(istekler.find((r) => r.yontem === "POST").govde[0].veri), ["İlk"]);

  if (hata) { console.log("birim-tekil-birlestir: HATA"); process.exit(1); }
  console.log("birim-tekil-birlestir: tamam");
})().catch((e) => { console.error(e); process.exit(1); });
