// BİRİM TESTİ — TANIMLAR BİRLEŞTİRME + KAYIP MODEL RENKLERİ (v1.552.0)
//
// Kullanıcı (Paketleme): "1017 - Beyaz Deri/Gümüş … Tanımlar'da yok". Tanımlar tek satır; başka cihazın eski
// listesi yeni model renklerini siliyordu. Ölçülen: birleştirme başkasının eklediğini korur, bu cihazda
// silineni geri getirmez, aynı kimlikte yerel kazanır; kayıp model renkleri etiketten AYNI kodla kurulur.
const { tanimlariBirlestir, kayipModelRenkleri, renkTanimiBul, tanimKodlariniOnar } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const yerel = {
  renkler: [{ id: "r1", ad: "Siyah" }, { id: "r2", ad: "Taba (yerel ad)" }],
  renkKombinasyonlari: [{ id: "k1", kod: "1001", renkIdler: ["r1"] }],
  hammaddeTipleri: [{ id: "h1", ad: "Deri" }],
  ozelKodEtiketleri: ["Özel Kod 1"],
  firmaBilgileri: { unvan: "Yerel" },
};
const bulut = {
  renkler: [{ id: "r1", ad: "Siyah" }, { id: "r2", ad: "Taba" }, { id: "r3", ad: "Gri" }, { id: "r4", ad: "Lacivert" }],
  renkKombinasyonlari: [{ id: "k1", kod: "1001", renkIdler: ["r1"] }, { id: "k2", kod: "1002", renkIdler: ["r1", "r4"] }],
  hammaddeTipleri: [{ id: "h1", ad: "Deri" }],
  ozelKodEtiketleri: ["Bulut kodu"],
  firmaBilgileri: { unvan: "Bulut" },
};
const b = tanimlariBirlestir(yerel, bulut, { r3: Date.now() });   // Gri bu cihazda silindi
bekle("başkasının eklediği renk ve model rengi korunur", b.eklenen.map((x) => `${x.alan}:${x.id}`), ["renkler:r4", "renkKombinasyonlari:k2"]);
bekle("bu cihazda silinen (Gri) geri gelmez", b.tanimlar.renkler.map((r) => r.ad), ["Siyah", "Taba (yerel ad)", "Lacivert"]);
bekle("aynı kimlikte yerel kazanır", b.tanimlar.renkler[1].ad, "Taba (yerel ad)");
bekle("düz liste ve nesneler yerelden", [b.tanimlar.ozelKodEtiketleri, b.tanimlar.firmaBilgileri.unvan], [["Özel Kod 1"], "Yerel"]);
bekle("bulut yoksa yerel aynen", tanimlariBirlestir(yerel, null, {}).eklenen.length, 0);
bekle("yerelde hiç olmayan liste buluttan gelir", tanimlariBirlestir({ renkler: [] }, { asortiler: [{ id: "a1", ad: "6'lı" }] }, {}).tanimlar.asortiler.length, 1);

// Kayıp model renkleri
let n = 0;
const yeniId = (on) => `${on}-${++n}`;
const tanimlar = {
  renkler: [{ id: "r1", ad: "Beyaz Deri" }, { id: "r2", ad: "Gümüş" }, { id: "r3", ad: "Kahve Süet" }, { id: "r5", ad: "A/B" }],
  renkKombinasyonlari: [{ id: "k1", kod: "1001", renkIdler: ["r1"] }],
};
const stok = [
  { id: "u1", variants: [{ renk: "1017 - Beyaz Deri/Gümüş", beden: "40" }, { renk: "1017 - Beyaz Deri/Gümüş", beden: "41" }, { renk: "1001 - Beyaz Deri", beden: "40" }] },
  { id: "u2", variants: [{ renk: "1018 - Kahve Süet/Yılan Deri" }, { renk: "1019 - A/B/Gümüş" }, { renk: "Siyah" }] },
];
const k = kayipModelRenkleri(stok, tanimlar, yeniId);
bekle("yalnız kombinasyonu olmayan etiketler (1001 var, düz renk sayılmaz)", k.etiketler, ["1017 - Beyaz Deri/Gümüş", "1018 - Kahve Süet/Yılan Deri", "1019 - A/B/Gümüş"]);
bekle("kod aynı, renkler eşleşti", k.kombinasyonlar[0], { id: "kombi-1", kod: "1017", renkIdler: ["r1", "r2"], onarim: true });
bekle("tanımda olmayan renk (Yılan Deri) yeni renk olarak", k.renkler.map((r) => r.ad), ["Yılan Deri"]);
bekle("'/' içeren renk adı en uzun eşleşmeyle", k.kombinasyonlar[2].renkIdler, ["r5", "r2"]);
const onarilmis = { ...tanimlar, renkler: [...tanimlar.renkler, ...k.renkler], renkKombinasyonlari: [...tanimlar.renkKombinasyonlari, ...k.kombinasyonlar] };
bekle("barkod renk tanımı artık bulunuyor, kodu 1017", (renkTanimiBul(onarilmis, null, "1017 - Beyaz Deri/Gümüş") || {}).barkodKodu, 1017);
bekle("onarım sonrası kayıp yok", kayipModelRenkleri(stok, onarilmis, yeniId).kombinasyonlar.length, 0);

// Kod çakışması onarımı (v1.556.0 — "Renk kodları çakışıyor"): iki cihaz aynı anda 44 verdi, birleştirme ikisini tuttu.
const cakisan = {
  renkler: [
    { id: "renk-lz000001-aaaa", ad: "Light", barkodKodu: 44, kod: "144" },          // yeni (sonra açılmış)
    { id: "renk-ka000001-bbbb", ad: "Yılan Deri", barkodKodu: 44 },                 // eski — kodunu korur
    { id: "renk-ka000002-cccc", ad: "Bej", barkodKodu: 1017 },                      // model rengi koduyla çakışıyor
    { id: "r1", ad: "Siyah", barkodKodu: 1 },
  ],
  renkKombinasyonlari: [{ id: "k1", kod: "1017", renkIdler: ["r1"] }],
  bedenler: [{ id: "b1", ad: "40", barkodKodu: 5 }, { id: "b2", ad: "41", barkodKodu: 5 }],
  kodSayaclari: { renk: 44 },
};
const on = tanimKodlariniOnar(cakisan);
const kodlar = Object.fromEntries(on.tanimlar.renkler.map((r) => [r.ad, r.barkodKodu]));
bekle("eski renk 44'ü korur, Siyah değişmez", [kodlar["Yılan Deri"], kodlar.Siyah], [44, 1]);
bekle("yeni renk ve model rengiyle çakışan renk yeni kod alır, hepsi tekil", new Set(on.tanimlar.renkler.map((r) => r.barkodKodu).concat([1017])).size, 5);
bekle("değişenler raporlanır", on.degisenler.map((d) => `${d.aile}:${d.ad}:${d.eski}`).sort(), ["renk:Bej:1017", "renk:Light:44", "ölçü:41:5"]);
bekle("ton kodu (kod) dokunulmaz", on.tanimlar.renkler.find((r) => r.ad === "Light").kod, "144");
bekle("çakışma yoksa aynı nesne", tanimKodlariniOnar(on.tanimlar).degisenler.length, 0);

// v1.569.0 — ortak silinenler: B'de silinen renk A'nın kaydıyla geri gelmez
const aYerel = { renkler: [{ id: "k1", ad: "Kırmızı" }, { id: "s1", ad: "Siyah" }] };
const bulutB = { renkler: [{ id: "s1", ad: "Siyah" }], __silinenler: { k1: Date.now() } };
const ab = tanimlariBirlestir(aYerel, bulutB, {});
bekle("başka cihazda silinen çıkarılır, silinenler taşınır", [ab.tanimlar.renkler.map((r) => r.id), ab.cikarilan.map((c) => c.id), !!ab.tanimlar.__silinenler.k1], [["s1"], ["k1"], true]);
const eskiTas = tanimlariBirlestir({ renkler: [] }, { renkler: [{ id: "z", ad: "Z" }], __silinenler: { z: Date.now() - 200 * 864e5 } }, {});
bekle("120 günü geçen silinen budanır, öğe geri gelir", [eskiTas.tanimlar.renkler.map((r) => r.id), eskiTas.tanimlar.__silinenler], [["z"], undefined]);

console.log(hata ? "birim-tanim-birlestir: HATA" : "birim-tanim-birlestir: tamam");
process.exit(hata);
