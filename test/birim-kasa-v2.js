// BİRİM TESTİ — KASA & BANKA v2 KÖPRÜSÜ (v1.729.0, src/038 `kasaV2Yuku` + 030 `tekilYaz` + 040 zarf)
// Olay: Kasa & Banka tek satırlık belgeydi; her kayıtta belgenin tamamı gidiyor, bayat / boş listeli cihaz (24 Ekim telefon:
// "0 hesap") başka cihazın kayıtlarını silebiliyordu. v2'de bu cihaz yalnız KENDİ FARKINI gönderir:
//   1. Saf fark: yeni / değişen / silinen (→ iptal) hesap, hareket, çek, ayar; başka cihazın kaydına dokunulmaz;
//      taban yoksa hiçbir şey silinmez; anahtar sırası fark değildir; kimliksiz eski kayıt kalıcı kimlik alır.
//   2. tekilYaz: belge POST'u yok, `rpc/kas_yaz`; başarıda taban ilerler, aynı hâl ikinci kez istek açmaz.
//   3. Düşen yazma: bekleyen defter, taban ilerlemez → sonraki yazma düşen farkı da taşır.
//   4. Zarf: kasa + cari tek `rpc/fis_yaz`; kasa v2 değilse zarf kasayı beklemez (cari hemen gider).
//   5. Büyük yük parça parça `kas_yaz`; iptaller ve hesaplar son parçada.
//   6. Toplu iptal kilidi: boşalmış ekranlı cihaz hareketlerin / hesapların hepsini birden iptal ettiremez.
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
  // fis_yaz gerçeği gibi gönderilen her parçanın sonucunu döner (v1.730.1: istemci eksik parçayı hata sayar).
  const rpcYanit = () => { try { const p = JSON.parse(sec.body || "{}").p || {}; return yol.startsWith("rpc/fis_yaz") ? Object.fromEntries(Object.keys(p).map((k) => [k, {}])) : {}; } catch (e) { return {}; } };
  if (yol.startsWith("rpc/")) return { ok: true, status: 200, headers: { get: () => null }, json: async () => rpcYanit(), text: async () => "" };
  const govde = yontem === "PATCH" ? [{ id: "x" }] : [];
  return { ok: true, status: 200, headers: { get: () => null }, json: async () => govde, text: async () => "" };
};
const { kasaV2Yuku, kasaV2Parcala, kasaV2YukBosMu, kasaV2AktifAyarla, kasaZarfiAc, v2KopruGonder, bekleyenYazmalariOku,
  tekilYaz, tekilTabanAyarla, tekilTabanOku, yazmaZarfi, supabaseTabloEsitle, tabloBaslangicTam, surumleriYukle,
  cariV2AktifAyarla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const derin = (x) => JSON.parse(JSON.stringify(x));
const sifirla = () => { istekler.length = 0; };
const rpc = (ad) => istekler.filter((r) => r.yol.startsWith(`rpc/${ad}`)).map((r) => JSON.parse(r.govde).p);
const ozet = (y) => ({
  hesaplar: y.hesaplar.map((h) => h.id), hesapSil: y.hesapSil, hareketler: y.hareketler.map((x) => `${x.hesap_id}/${x.id}`),
  hareketIptal: y.hareketIptal, cekler: y.cekler.map((c) => c.id), cekIptal: y.cekIptal, ayar: Object.keys(y.ayar), ayarSil: y.ayarSil,
});
const BOS = { hesaplar: [], hesapSil: [], hareketler: [], hareketIptal: [], cekler: [], cekIptal: [], ayar: [], ayarSil: [] };
const h = (id, tutar, ek = {}) => ({ id, tarih: "2026-10-29", yon: "Giriş", tutar, ...ek });
const belge0 = {
  kasalar: [{ id: "K1", ad: "Merkez Kasa", paraBirimi: "TRY", hareketler: [h("h2", 20), h("h1", 100)] }],
  bankalar: [{ id: "B1", ad: "Ziraat", paraBirimi: "TRY", iban: "TR00", hareketler: [] }],
  cekler: [{ id: "c1", cekNo: "001", tutar: 500, durum: "Portföyde" }],
  kurlar: { USD: 41.2, EUR: 48.1 }, kurGecmisi: [{ id: "kur1", USD: 41 }],
};

(async () => {
  console.log("1) Saf fark");
  bekle("taban = yeni → boş", ozet(kasaV2Yuku(belge0, derin(belge0))), BOS);
  bekle("boş fark boş sayılır", kasaV2YukBosMu(kasaV2Yuku(belge0, derin(belge0))), true);
  const yeniden = { kurGecmisi: belge0.kurGecmisi, kurlar: { EUR: 48.1, USD: 41.2 }, cekler: belge0.cekler,
    bankalar: [{ hareketler: [], iban: "TR00", paraBirimi: "TRY", ad: "Ziraat", id: "B1" }],
    kasalar: [{ paraBirimi: "TRY", ad: "Merkez Kasa", id: "K1", hareketler: [{ tutar: 20, yon: "Giriş", tarih: "2026-10-29", id: "h2" }, h("h1", 100)] }] };
  bekle("anahtar sırası farklı (jsonb geri okuması) → boş", ozet(kasaV2Yuku(belge0, yeniden)), BOS);
  let y = derin(belge0);
  y.kasalar[0].hareketler.unshift(h("h3", 30, { cariId: "c-2", muhasebeBagId: "bag3" }));
  bekle("yeni hareket → yalnız o", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hareketler: ["K1/h3"] });
  y = derin(belge0); y.kasalar[0].hareketler = [h("h1", 100)];
  bekle("silinen hareket → iptal (silme değil)", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hareketIptal: ["h2"] });
  y = derin(belge0); y.kasalar[0].hareketler[1].tutar = 90;
  bekle("değişen hareket → yalnız o", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hareketler: ["K1/h1"] });
  y = derin(belge0); y.bankalar[0].hareketler.push(y.kasalar[0].hareketler.pop());
  bekle("hesabı değişen hareket → yeni hesapla", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hareketler: ["B1/h1"] });
  y = derin(belge0); y.bankalar[0].ad = "Ziraat Bankası";
  bekle("hesap adı değişti → yalnız hesap (hareketleri gitmez)", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hesaplar: ["B1"] });
  bekle("hesap yükünde hareketler ve kimlik yok, sıra yok", Object.keys(kasaV2Yuku(belge0, y).hesaplar[0]).concat(Object.keys(kasaV2Yuku(belge0, y).hesaplar[0].veri)),
    ["id", "tur", "veri", "ad", "paraBirimi", "iban"]);
  y = derin(belge0); y.bankalar = [];
  bekle("hesap kaldırıldı → hesapSil", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hesapSil: ["B1"] });
  y = derin(belge0); y.bankalar.push({ id: "B2", ad: "İş", paraBirimi: "USD", hareketler: [] });
  bekle("yeni hesap → tür banka", kasaV2Yuku(belge0, y).hesaplar.map((x) => [x.id, x.tur]), [["B2", "banka"]]);
  y = derin(belge0); y.kurlar = { USD: 42, EUR: 49 }; y.kurGecmisi = [{ id: "kur2", USD: 42 }, ...y.kurGecmisi];
  const kurYuku = kasaV2Yuku(belge0, y);
  bekle("yalnız kur → yalnız ayar (herkese açık kur yazması)", ozet(kurYuku), { ...BOS, ayar: ["kurlar", "kurGecmisi"] });
  y = derin(belge0); y.cekler = [];
  bekle("çek silindi → çek iptal", ozet(kasaV2Yuku(belge0, y)), { ...BOS, cekIptal: ["c1"] });
  y = derin(belge0); delete y.kurGecmisi;
  bekle("ayar anahtarı kalktı → ayarSil", ozet(kasaV2Yuku(belge0, y)), { ...BOS, ayarSil: ["kurGecmisi"] });

  console.log("   bayat / boş cihaz");
  // Başka cihaz h9'u ekledi; bu cihaz görmedi (ne tabanında ne ekranında). Bu cihaz yalnız h4 ekliyor.
  y = derin(belge0); y.kasalar[0].hareketler.unshift(h("h4", 5));
  bekle("başka cihazın kaydına dokunulmaz", ozet(kasaV2Yuku(belge0, y)), { ...BOS, hareketler: ["K1/h4"] });
  const bos = { kasalar: [], bankalar: [], cekler: [], kurlar: { USD: 42, EUR: 49 } };
  bekle("taban yok + boş hâl (bulut okunamamış telefon) → hiçbir şey silinmez, yalnız kur",
    ozet(kasaV2Yuku(undefined, bos)), { ...BOS, ayar: ["kurlar"] });
  bekle("taban yok + dolu hâl → yalnız ekleme / güncelleme", ozet(kasaV2Yuku(null, belge0)),
    { ...BOS, hesaplar: ["K1", "B1"], hareketler: ["K1/h2", "K1/h1"], cekler: ["c1"], ayar: ["kurlar", "kurGecmisi"] });

  console.log("   kimliksiz eski kayıt");
  const eski = { kasalar: [{ id: "K1", ad: "Kasa", hareketler: [{ tarih: "2026-09-01", yon: "Giriş", tutar: 50 }, { tarih: "2026-09-01", yon: "Giriş", tutar: 50 }] }], bankalar: [], cekler: [{ cekNo: "9" }] };
  const ek = kasaV2Yuku(null, eski);
  bekle("iki aynı kimliksiz hareket → iki ayrı kalıcı kimlik", [ek.hareketler.length, new Set(ek.hareketler.map((x) => x.id)).size, ek.hareketler.every((x) => /^mh-[0-9a-f]{16}$/.test(x.id))], [2, 2, true]);
  bekle("aynı içerik her seferinde aynı kimlik", kasaV2Yuku(null, derin(eski)).hareketler.map((x) => x.id), ek.hareketler.map((x) => x.id));
  bekle("kimliksiz çek de kimlik alır", /^cek-[0-9a-f]{16}$/.test(ek.cekler[0].id), true);
  bekle("kimliksiz kayıt değişmedikçe fark yok", ozet(kasaV2Yuku(eski, derin(eski))), BOS);

  console.log("2) tekilYaz — kas_yaz, belge yazılmaz");
  kasaV2AktifAyarla(true);
  tekilTabanAyarla("muhasebe", belge0);
  sifirla();
  y = derin(belge0); y.kasalar[0].hareketler.unshift(h("h3", 30));
  await tekilYaz("muhasebe:data", "muhasebe", y);
  bekle("tek rpc/kas_yaz, muhasebe'ye GET/POST yok", [rpc("kas_yaz").length, istekler.filter((r) => r.yol.startsWith("muhasebe")).length], [1, 0]);
  bekle("yük yalnız yeni hareket", rpc("kas_yaz")[0].hareketler.map((x) => [x.id, x.hesap_id, x.veri.tutar]), [["h3", "K1", 30]]);
  bekle("taban ilerledi", tekilTabanOku("muhasebe").kasalar[0].hareketler.length, 3);
  sifirla();
  await tekilYaz("muhasebe:data", "muhasebe", derin(y));
  bekle("aynı hâl yeniden → istek yok", istekler.length, 0);

  console.log("3) Düşen yazma");
  const y2 = derin(y); y2.kasalar[0].hareketler.unshift(h("h5", 7));
  dussun = true; sifirla();
  await tekilYaz("muhasebe:data", "muhasebe", y2);
  bekle("bekleyen defterde", !!bekleyenYazmalariOku()["muhasebe:data"], true);
  bekle("taban ilerlemedi", tekilTabanOku("muhasebe").kasalar[0].hareketler.length, 3);
  dussun = false; sifirla();
  const y3 = derin(y2); y3.kasalar[0].hareketler.unshift(h("h6", 8));
  await tekilYaz("muhasebe:data", "muhasebe", y3);
  bekle("sonraki yazma düşen farkı da taşır", rpc("kas_yaz")[0].hareketler.map((x) => x.id).sort(), ["h5", "h6"]);
  bekle("defter temizlendi", !!bekleyenYazmalariOku()["muhasebe:data"], false);
  let kasa = y3;

  console.log("4) Zarf — kasa + cari tek fis_yaz");
  cariV2AktifAyarla(true);
  const cari0 = [{ id: "c-2", unvan: "Yıldız", hareketler: [{ id: "ch1", tarih: "2026-10-01", yon: "Alacak", tutar: 100, paraBirimi: "TRY", fisNo: "SF-0" }] }];
  tabloBaslangicTam("cariler", derin(cari0));
  surumleriYukle("cariler", [{ id: "c-2", surum: 1 }]);
  let cariler = derin(cari0);
  sifirla();
  let zarf = kasaZarfiAc(true);
  const k4 = derin(kasa); k4.kasalar[0].hareketler.unshift(h("h7", 300, { cariId: "c-2", muhasebeBagId: "bag7" }));
  cariler = derin(cariler); cariler[0].hareketler.unshift({ id: "ch7", tarih: "2026-10-29", yon: "Borç", tutar: 300, paraBirimi: "TRY", fisNo: "THS-1", muhasebeBagId: "bag7" });
  await Promise.all([tekilYaz("muhasebe:data", "muhasebe", k4, { zarf }), supabaseTabloEsitle("cariler", cariler, { zarf })]);
  bekle("tek rpc: fis_yaz (kas_yaz / car_yaz ayrı yok)", [rpc("fis_yaz").length, rpc("kas_yaz").length, rpc("car_yaz").length], [1, 0, 0]);
  const p4 = rpc("fis_yaz")[0];
  bekle("kasa ve cari parçası", [p4.kasa.hareketler.map((x) => x.id), p4.cari.satirlar.map((x) => x.id)], [["h7"], ["ch7"]]);
  bekle("zarftan sonra taban ilerledi", tekilTabanOku("muhasebe").kasalar[0].hareketler[0].id, "h7");
  kasa = k4;

  console.log("   zarf düşerse ikisi de bekleyende");
  dussun = true; sifirla();
  zarf = kasaZarfiAc(true);
  const k5 = derin(kasa); k5.kasalar[0].hareketler.unshift(h("h8", 40, { cariId: "c-2", muhasebeBagId: "bag8" }));
  const c5 = derin(cariler); c5[0].hareketler.unshift({ id: "ch8", tarih: "2026-10-29", yon: "Borç", tutar: 40, paraBirimi: "TRY", fisNo: "THS-2", muhasebeBagId: "bag8" });
  const sonuc5 = await Promise.allSettled([tekilYaz("muhasebe:data", "muhasebe", k5, { zarf }), supabaseTabloEsitle("cariler", c5, { zarf })]);
  bekle("cari reddedildi, kasa bekleyende, taban yerinde", [sonuc5[1].status, !!bekleyenYazmalariOku()["muhasebe:data"], tekilTabanOku("muhasebe").kasalar[0].hareketler[0].id], ["rejected", true, "h7"]);
  dussun = false; sifirla();
  zarf = kasaZarfiAc(true);
  await Promise.all([tekilYaz("muhasebe:data", "muhasebe", k5, { zarf }), supabaseTabloEsitle("cariler", c5, { zarf })]);
  bekle("yeniden gönderim ikisini birlikte taşır", [rpc("fis_yaz").length, rpc("fis_yaz")[0].kasa.hareketler.map((x) => x.id), rpc("fis_yaz")[0].cari.satirlar.map((x) => x.id)], [1, ["h8"], ["ch8"]]);
  kasa = k5; cariler = c5;

  console.log("   kasa v2 değilse zarf kasayı beklemez");
  kasaV2AktifAyarla(false);
  bekle("kasaZarfiAc → null", kasaZarfiAc(true), null);
  sifirla();
  zarf = yazmaZarfi(["muhasebe", "cariler"]);
  const c6 = derin(cariler); c6[0].hareketler.unshift({ id: "ch9", tarih: "2026-10-29", yon: "Borç", tutar: 1, paraBirimi: "TRY", fisNo: "THS-3" });
  const bas = Date.now();
  await supabaseTabloEsitle("cariler", c6, { zarf });
  bekle("cari hemen gitti (zarf beklemesi yok)", Date.now() - bas < 1500, true);
  kasaV2AktifAyarla(true);

  console.log("5) Büyük yük parça parça");
  const buyuk = { kasalar: [{ id: "K1", ad: "Kasa", hareketler: Array.from({ length: 1201 }, (_, i) => h(`b${i}`, i)) }], bankalar: [], cekler: [], kurlar: { USD: 1 } };
  const by = kasaV2Yuku(null, buyuk);
  const parcalar = kasaV2Parcala(by);
  bekle("3 parça, hareketler bölündü", parcalar.map((p) => p.hareketler.length), [500, 500, 201]);
  bekle("hesaplar ve ayar son parçada", parcalar.map((p) => [!!(p.hesaplar && p.hesaplar.length), !!p.ayar]), [[false, false], [false, false], [true, true]]);
  sifirla();
  await v2KopruGonder([{ tur: "kasa", yuk: by }]);
  bekle("üç kas_yaz isteği", rpc("kas_yaz").length, 3);

  console.log("6) Toplu iptal kilidi");
  const dolu = { kasalar: [{ id: "K1", ad: "Kasa", hareketler: Array.from({ length: 30 }, (_, i) => h(`t${i}`, i)) }, { id: "K2", ad: "Kasa 2", hareketler: [] }],
    bankalar: [], cekler: [], kurlar: { USD: 1 } };
  tekilTabanAyarla("muhasebe", dolu);
  delete bellek["bekleyen:yazma"];
  sifirla();
  const bosalmis = derin(dolu); bosalmis.kasalar[0].hareketler = [];
  await tekilYaz("muhasebe:data", "muhasebe", bosalmis);
  const rpcIstegi = () => istekler.filter((r) => r.yol.startsWith("rpc/")).length;
  bekle("30 hareketin hepsi iptal olacaktı → sunucuya istek yok, bekleyen defterde değil", [rpcIstegi(), !!bekleyenYazmalariOku()["muhasebe:data"]], [0, false]);
  bekle("günlüğe TOPLU SİLME ENGELLENDİ düştü", istekler.some((r) => r.yol.startsWith("gunluk") && r.govde.includes("TOPLU SİLME ENGELLENDİ")), true);
  await tekilYaz("muhasebe:data", "muhasebe", { kasalar: [], bankalar: [], cekler: [], kurlar: { USD: 1 } });
  bekle("bütün hesaplar birden kalkacaktı → sunucuya istek yok", rpcIstegi(), 0);
  const tek = derin(dolu); tek.kasalar[0].hareketler.shift();
  await tekilYaz("muhasebe:data", "muhasebe", tek);
  bekle("tek hareket silmek serbest", rpc("kas_yaz").map((p) => p.hareketIptal), [["t0"]]);
  sifirla();
  tekilTabanAyarla("muhasebe", dolu);
  await tekilYaz("muhasebe:data", "muhasebe", bosalmis, { topluSilmeIzni: true });
  bekle("yedekten geri yükleme (izinli) geçer", rpc("kas_yaz")[0].hareketIptal.length, 30);
  sifirla();
  tekilTabanAyarla("muhasebe", dolu);
  const zk = kasaZarfiAc(true);
  const rz = await Promise.allSettled([tekilYaz("muhasebe:data", "muhasebe", bosalmis, { zarf: zk }), supabaseTabloEsitle("cariler", derin(cariler), { zarf: zk })]);
  bekle("zarfta kilit → hiçbir istek, cari de reddedildi", [istekler.filter((r) => r.yol.startsWith("rpc/")).length, rz[1].status], [0, "rejected"]);

  console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
