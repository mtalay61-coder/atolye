// BİRİM TESTİ — YENİ RENK → REÇETE GEÇMİŞTEN + BEDEN/BOY EŞLEŞMESİ DEĞİŞTİR (v1.564.0)
// Kullanıcı: "Yeni renk eklenince eşleştirmeyi geçmişten otomatik doldursun, boyutlarda beden gibi olsun.
// Beden değiştikçe boyut da değişebilir."
const { yeniRenkReceteSatirlari, receteBedenDegistir, stoktanReceteKopyala } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const hm = (id, ad, renkler) => ({ id, ad, kategori: "Hammadde", variants: renkler.map((renk) => ({ renk, beden: "" })) });
const r = (id, mr, hid, ad, renk, ek = {}) => ({ id, mamulRenk: mr, mamulBeden: "Tüm Bedenler", hammaddeUrunId: hid, hammaddeAd: ad, renk, beden: "Standart", miktar: 1, proses: "Kesim", eklemeId: "e-" + hid, ...ek });
const tum = [
  hm("deri", "Deri", ["Kahve Süet", "Bej Süet"]), hm("bag", "Bağcık", ["Kahve", "Bej", "Siyah"]), hm("yap", "Yapıştırıcı", ["Beyaz", "Sarı"]),
  hm("taban", "Taban", ["Kahve", "Siyah"]), hm("silme", "Silme Suyu", ["Standart"]),
  // Geçmiş: başka modelde Bej Süet → Bağcık Bej.
  { id: "eski", ad: "Eski", variants: [], recete: [r("x", "Bej Süet", "bag", "Bağcık", "Bej", { eklemeTarihi: "2026-09-01" })] },
];
const urun = { id: "m", variants: [], recete: [
  r("1", "Kahve Süet", "deri", "Deri", "Kahve Süet", { aciklama: "16 Desi" }),
  r("2", "Kahve Süet", "bag", "Bağcık", "Kahve"),
  r("3", "Kahve Süet", "yap", "Yapıştırıcı", "Beyaz"), r("3b", "Siyah Süet", "yap", "Yapıştırıcı", "Beyaz"),
  r("4", "Kahve Süet", "taban", "Taban", "Kahve"),
  r("5", "Kahve Süet", "silme", "Silme Suyu", "Standart"),
  ...["40", "41"].map((b) => r("t" + b, "Kahve Süet", "taban2", "Taban2", "Kahve", { mamulBeden: b, beden: b })),
] };
const y = yeniRenkReceteSatirlari(urun, "Bej Süet", [...tum, hm("taban2", "Taban2", ["Kahve"]), urun]);
const renk = (ad) => y.satirlar.filter((x) => x.hammaddeAd === ad).map((x) => `${x.renk}${x.renkGecmisten ? "*" : ""}${x.mamulBeden !== "Tüm Bedenler" ? "@" + x.mamulBeden : ""}`).join(",");
bekle("aynı adlı renk (Deri Bej Süet), açıklama korunur", [renk("Deri"), y.satirlar.find((x) => x.hammaddeAd === "Deri").aciklama], ["Bej Süet", "16 Desi"]);
bekle("geçmişten (Bağcık Bej*)", renk("Bağcık"), "Bej*");
bekle("bütün renklerde aynı → sabit (Yapıştırıcı Beyaz)", renk("Yapıştırıcı"), "Beyaz");
bekle("tek renkli / Standart", renk("Silme Suyu"), "Standart");
bekle("bilinmeyen boş (Taban)", [renk("Taban"), y.bosGruplar.includes("Taban")], ["", true]);
bekle("bedenli satır bedenleriyle kopyalanır (tek renkli hammadde)", renk("Taban2"), "Kahve@40,Kahve@41");
bekle("id taşınmaz, yeni renk", y.satirlar.every((x) => !x.id && x.mamulRenk === "Bej Süet"), true);
bekle("zaten varsa hiçbir şey", yeniRenkReceteSatirlari(urun, "Kahve Süet", tum).satirlar.length, 0);

// receteBedenDegistir
const bag = [r("k", "Kahve Süet", "bag", "Bağcık", "Kahve", { beden: "120 cm" }), r("b", "Bej Süet", "bag", "Bağcık", "Bej", { beden: "120 cm" })];
const d1 = receteBedenDegistir(bag, ["41"], "140 cm", ["39", "40", "41"]);
bekle("tek bedende farklı boy → Tüm Bedenler satırı bedenlere açılır", [d1.silinecekIdler, d1.yeniSatirlar.map((x) => `${x.mamulRenk}:${x.mamulBeden}=${x.beden}`)],
  [["k", "b"], ["Kahve Süet:39=120 cm", "Kahve Süet:40=120 cm", "Kahve Süet:41=140 cm", "Bej Süet:39=120 cm", "Bej Süet:40=120 cm", "Bej Süet:41=140 cm"]]);
const d2 = receteBedenDegistir(bag, ["39", "40", "41"], "140 cm", ["39", "40", "41"]);
bekle("Hepsi → açılmaz, boy değişir", d2.yeniSatirlar.map((x) => `${x.mamulBeden}=${x.beden}`), ["Tüm Bedenler=140 cm", "Tüm Bedenler=140 cm"]);
const acik = d1.yeniSatirlar.map((x, i) => ({ ...x, id: "a" + i }));
const d3 = receteBedenDegistir(acik, ["39"], "100 cm", ["39", "40", "41"]);
bekle("açılmış satırda tek beden", d3.yeniSatirlar.map((x) => `${x.mamulRenk}:${x.mamulBeden}=${x.beden}`), ["Kahve Süet:39=100 cm", "Bej Süet:39=100 cm"]);
bekle("aynı değer → değişiklik yok", receteBedenDegistir(bag, ["Tüm Bedenler"], "120 cm", ["39"]).silinecekIdler.length, 0);

// stoktanReceteKopyala — "aynı şekilde kopyalayınca hiç değişmeyecek"
const kaynak = { id: "k", ad: "27080 D", prosesUcretleri: { Kesim: 35 }, araProsesEklentileri: {}, araProsesUcretleri: {}, recete: [
  r("1", "Kahve Süet", "deri", "Deri", "Kahve Süet", { aciklama: "16 Desi", miktar: 18 }),
  r("2", "Kahve Süet", "bag", "Bağcık", "Kahve", { beden: "120 cm" }),
  ...["40", "41"].map((b) => r("t" + b, "Kahve Süet", "taban", "Taban", "Kahve", { mamulBeden: b, beden: b, eklemeId: "e-tb" })),
  ...["40", "41"].map((b) => r("k" + b, "Kahve Süet", "kalip", "Kalıp", "Std", { mamulBeden: b, beden: b === "40" ? "K1" : "K2", eklemeId: "e-kl" })),
] };
const hedef = { id: "h", variants: ["Kahve Süet", "Bej Süet"].flatMap((renk) => ["40", "41", "42"].map((beden) => ({ renk, beden }))), recete: [], prosesUcretleri: {} };
const kp = stoktanReceteKopyala(kaynak, hedef, [...tum, hm("kalip", "Kalıp", ["Std"]), kaynak]);
const kr = (ad, mr) => kp.eklenecekler.filter((x) => x.hammaddeAd === ad && x.mamulRenk === mr).map((x) => `${x.renk}${x.renkGecmisten ? "*" : ""}/${x.mamulBeden}=${x.beden}×${x.miktar}`).join(",");
bekle("aynı renk AYNEN (Deri, açıklama, miktar)", [kr("Deri", "Kahve Süet"), kp.eklenecekler.find((x) => x.hammaddeAd === "Deri").aciklama], ["Kahve Süet/Tüm Bedenler=Standart×18", "16 Desi"]);
bekle("aynı renk: taban numaraları + hedefte olan 42 açılır (no = no)", kr("Taban", "Kahve Süet"), "Kahve/40=40×1,Kahve/41=41×1,Kahve/42=42×1");
bekle("haritalı bedende 42 karşılıksız → bildirilir", kp.bedenEksikler, ["Kalıp (42)"]);
bekle("yeni renk: aynı ad (Deri Bej Süet) ve geçmiş (Bağcık Bej*)", [kr("Deri", "Bej Süet"), kr("Bağcık", "Bej Süet")], ["Bej Süet/Tüm Bedenler=Standart×18", "Bej*/Tüm Bedenler=120 cm×1"]);
bekle("yeni renk: bilinmeyen boş (Taban · Bej Süet)", kp.bosGruplar.includes("Taban · Bej Süet"), true);
bekle("kopya- kimliği, kaynak eklemesi başına bir", [kp.eklenecekler.every((x) => /^kopya-/.test(x.eklemeId)), new Set(kp.eklenecekler.filter((x) => x.hammaddeAd === "Taban").map((x) => x.eklemeId)).size], [true, 1]);
bekle("işçilik boşsa gelir", kp.ekAlanlar.prosesUcretleri, { Kesim: 35 });
const kp2 = stoktanReceteKopyala(kaynak, { ...hedef, recete: kp.eklenecekler.map((x, i) => ({ ...x, id: "z" + i })), ...kp.ekAlanlar }, tum);
bekle("ikinci kez: hepsi zaten var", [kp2.eklenecekler.length, kp2.iscilikSayisi], [0, 0]);

console.log(hata ? "birim-yeni-renk-recete: HATA" : "birim-yeni-renk-recete: tamam");
process.exit(hata);
