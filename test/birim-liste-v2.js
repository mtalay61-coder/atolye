// BİRİM TESTİ — TEK PARÇA LİSTELER v2 KÖPRÜSÜ (v1.730.0, src/038 `listeV2Yuku` + 030 `tekilYaz`)
//   1. Saf fark: yeni / değişen → kayitlar, silinen → iptal; başka cihazın kaydına dokunulmaz; taban yoksa silme ve sıra yok;
//      anahtar sırası fark değil; sıra yalnız yeni kayıtta (başa eklenen eksi, sona eklenen artı).
//   2. tekilYaz: geçiş yapılmış listede dizi POST'u yok, `rpc/lst_yaz`; taban ilerler; aynı hâl istek açmaz.
//   3. Geçiş yapılmamış liste bugünkü yoldan (belge yazılır).
//   4. Düşen yazma: bekleyen defter, taban ilerlemez. Toplu iptal kilidi: istek yok, defter yok; izinle geçer.
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
  const json = yontem === "GET" && /^koliler\?/.test(yol) ? [{ veri: [] }] : (yol.startsWith("rpc/") ? {} : []);
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => json, text: async () => "" };
};
const { listeV2Yuku, listeV2TablolariAyarla, listeV2Aktif, tekilYaz, tekilTabanAyarla, tekilTabanOku, bekleyenYazmalariOku } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const rpc = () => istekler.filter((r) => r.yol.startsWith("rpc/lst_yaz")).map((r) => JSON.parse(r.govde).p);
const T = (id, ek = {}) => ({ id, teklifNo: `TKL-${id}`, durum: "Hazırlanıyor", ...ek });
const ozet = (y) => ({ kayitlar: y.kayitlar.map((k) => (k.sira === undefined ? k.id : `${k.id}${k.sira < 0 ? "↑" : "↓"}`)), iptal: y.iptal });

(async () => {
  console.log("1) Saf fark");
  const taban = [T("B"), T("A")];
  bekle("aynı → boş", ozet(listeV2Yuku(taban, derin(taban), 1000)), { kayitlar: [], iptal: [] });
  bekle("anahtar sırası farklı → boş", ozet(listeV2Yuku(taban, [{ durum: "Hazırlanıyor", teklifNo: "TKL-B", id: "B" }, T("A")], 1000)), { kayitlar: [], iptal: [] });
  bekle("başa eklenen → eksi sıra", ozet(listeV2Yuku(taban, [T("C"), T("B"), T("A")], 1000)), { kayitlar: ["C↑"], iptal: [] });
  bekle("sona eklenen → artı sıra", ozet(listeV2Yuku(taban, [T("B"), T("A"), T("D")], 1000)), { kayitlar: ["D↓"], iptal: [] });
  const iki = listeV2Yuku(taban, [T("E"), T("F"), T("B"), T("A")], 1000).kayitlar;
  bekle("başa iki kayıt: ekrandaki sırayı korur", iki[0].sira < iki[1].sira && iki[1].sira < 0, true);
  bekle("değişen → sırasız, yalnız o", ozet(listeV2Yuku(taban, [T("B", { durum: "Gönderildi" }), T("A")], 1000)), { kayitlar: ["B"], iptal: [] });
  bekle("silinen → iptal", ozet(listeV2Yuku(taban, [T("A")], 1000)), { kayitlar: [], iptal: ["B"] });
  bekle("başka cihazın kaydı (ne tabanda ne ekranda) → dokunulmaz", ozet(listeV2Yuku(taban, [T("G"), T("B"), T("A")], 1000)), { kayitlar: ["G↑"], iptal: [] });
  bekle("taban yok + boş liste → hiçbir şey silinmez", ozet(listeV2Yuku(undefined, [], 1000)), { kayitlar: [], iptal: [] });
  bekle("taban yok + dolu → yalnız yazma, sıra yok", ozet(listeV2Yuku(null, taban, 1000)), { kayitlar: ["B", "A"], iptal: [] });
  bekle("boş taban → yeni kayıtlar sırayla sona", ozet(listeV2Yuku([], [T("X"), T("Y")], 1000)), { kayitlar: ["X↓", "Y↓"], iptal: [] });
  const ks = listeV2Yuku(null, [{ metin: "a" }, { metin: "a" }], 1000).kayitlar.map((k) => k.id);
  bekle("kimliksiz iki aynı kayıt → iki kalıcı kimlik", [ks.length, new Set(ks).size, ks.every((x) => /^lx-[0-9a-f]{16}$/.test(x))], [2, 2, true]);

  console.log("2) tekilYaz — lst_yaz, dizi yazılmaz");
  listeV2TablolariAyarla(["teklifler", "faturalar", "olmayan"]);
  bekle("yalnız bilinen listeler", [listeV2Aktif("teklifler"), listeV2Aktif("olmayan"), listeV2Aktif("koliler")], [true, false, false]);
  tekilTabanAyarla("teklifler", taban);
  istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("C"), T("B"), T("A")]);
  bekle("tek rpc/lst_yaz, teklifler'e GET/POST yok", [rpc().length, istekler.filter((r) => r.yol.startsWith("teklifler")).length], [1, 0]);
  bekle("yük: tablo + yalnız yeni kayıt", [rpc()[0].tablo, rpc()[0].kayitlar.map((k) => k.id), rpc()[0].iptal], ["teklifler", ["C"], []]);
  bekle("taban ilerledi", tekilTabanOku("teklifler").map((x) => x.id), ["C", "B", "A"]);
  istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("C"), T("B"), T("A")]);
  bekle("aynı hâl → istek yok", istekler.length, 0);

  console.log("3) Geçiş yapılmamış liste bugünkü yoldan");
  tekilTabanAyarla("koliler", []);
  istekler.length = 0;
  await tekilYaz("koli:data", "koliler", [{ id: "k1", kod: "K1" }]);
  bekle("koliler: belge POST'u, lst_yaz yok", [istekler.some((r) => r.yontem === "POST" && r.yol.startsWith("koliler")), rpc().length], [true, 0]);

  console.log("4) Düşen yazma ve toplu iptal kilidi");
  dussun = true; istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("D"), T("C"), T("B"), T("A")]);
  bekle("bekleyen defterde, taban yerinde", [!!bekleyenYazmalariOku()["teklif:data"], tekilTabanOku("teklifler").length], [true, 3]);
  dussun = false; istekler.length = 0;
  await tekilYaz("teklif:data", "teklifler", [T("E"), T("D"), T("C"), T("B"), T("A")]);
  bekle("sonraki yazma düşen farkı da taşır", rpc()[0].kayitlar.map((k) => k.id).sort(), ["D", "E"]);
  const otuz = Array.from({ length: 30 }, (_, i) => T(`m${i}`));
  tekilTabanAyarla("faturalar", otuz);
  delete bellek["bekleyen:yazma"];
  istekler.length = 0;
  await tekilYaz("fatura:data", "faturalar", []);
  bekle("30 kaydın hepsi iptal olacaktı → sunucuya istek yok, defter yok", [rpc().length, !!bekleyenYazmalariOku()["fatura:data"]], [0, false]);
  await tekilYaz("fatura:data", "faturalar", otuz.slice(1));
  bekle("tek kayıt silmek serbest", rpc().map((p) => p.iptal), [["m0"]]);
  tekilTabanAyarla("faturalar", otuz);
  istekler.length = 0;
  await tekilYaz("fatura:data", "faturalar", [], { topluSilmeIzni: true });
  bekle("yedekten geri yükleme (izinli) geçer", rpc()[0].iptal.length, 30);

  console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
