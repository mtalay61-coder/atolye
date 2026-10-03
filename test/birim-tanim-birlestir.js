// BİRİM TESTİ — TANIMLAR BİRLEŞTİRME + KAYIP MODEL RENKLERİ (v1.552.0)
//
// Kullanıcı (Paketleme): "1017 - Beyaz Deri/Gümüş … Tanımlar'da yok". Tanımlar tek satır; başka cihazın eski
// listesi yeni model renklerini siliyordu. Ölçülen: birleştirme başkasının eklediğini korur, bu cihazda
// silineni geri getirmez, aynı kimlikte yerel kazanır; kayıp model renkleri etiketten AYNI kodla kurulur.
const { tanimlariBirlestir, kayipModelRenkleri, renkTanimiBul } = require("./erp.cjs");

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

console.log(hata ? "birim-tanim-birlestir: HATA" : "birim-tanim-birlestir: tamam");
process.exit(hata);
