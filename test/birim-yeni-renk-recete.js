// BİRİM TESTİ — YENİ RENK → REÇETE GEÇMİŞTEN + BEDEN/BOY EŞLEŞMESİ DEĞİŞTİR (v1.564.0)
// Kullanıcı: "Yeni renk eklenince eşleştirmeyi geçmişten otomatik doldursun, boyutlarda beden gibi olsun.
// Beden değiştikçe boyut da değişebilir."
const { yeniRenkReceteSatirlari, receteBedenDegistir, stoktanReceteKopyala, eksikRenkEslesmeleri, hammaddeRenkSecenekleri, receteGrupEksikBedenleri, enYakinBeden, hammaddeBedenSecenekleri, sablonuUruneUygula } = require("./erp.cjs");
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
// v1.605.0: yeni renk BAZI gruplarda zaten varsa (model rengi ekleme kaynak renkten kopyaladı) kalan gruplar yine dolar;
// dolu grup için çift satır açılmaz.
const kismi = { ...urun, recete: [...urun.recete, r("k1", "Bej Süet", "deri", "Deri", "Bej Süet", { aciklama: "16 Desi" })] };
const yk = yeniRenkReceteSatirlari(kismi, "Bej Süet", [...tum, hm("taban2", "Taban2", ["Kahve"]), kismi]);
bekle("kısmen dolu renkte kalan gruplar dolar, Deri tekrar açılmaz", [yk.satirlar.some((x) => x.hammaddeAd === "Deri"), yk.satirlar.filter((x) => x.hammaddeAd === "Silme Suyu").map((x) => x.renk)], [false, ["Standart"]]);

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

// v1.566.0 — eksik eşleşmeleri doldur + boş açılmayan liste
const eski = { id: "e2", variants: ["Kahve Süet", "Bej Süet"].map((renk) => ({ renk, beden: "40" })), recete: [
  r("1", "Kahve Süet", "deri", "Deri", "Kahve Süet"), r("2", "Kahve Süet", "tak", "Takviye Bezi", "Standart"),
  r("3", "Kahve Süet", "fort", "Fort Bombe", "Atom Fort"), r("4", "Kahve Süet", "bag", "Bağcık", "Kahve"),
] };
const tum2 = [...tum, hm("tak", "Takviye Bezi", ["Standart", "Beyaz"]), hm("fort", "Fort Bombe", ["Atom Fort", "Pinpon 2 mm"]), eski];
const ek = eksikRenkEslesmeleri(eski, tum2);
bekle("aynı ad + Standart kullanım + geçmiş dolar, bilinmeyen boş", [ek.satirlar.map((x) => `${x.hammaddeAd}:${x.renk}${x.renkGecmisten ? "*" : ""}`), ek.gecmisSayisi, ek.bosSayisi],
  [["Deri:Bej Süet", "Takviye Bezi:Standart", "Bağcık:Bej*"], 1, 1]);
bekle("tamamsa boş", eksikRenkEslesmeleri({ ...eski, recete: [...eski.recete, ...ek.satirlar.map((x, i) => ({ ...x, id: "q" + i }))] }, tum2).satirlar.length, 0);
bekle("kartı olmayan hammaddede seçenekler reçetelerden", hammaddeRenkSecenekleri("yok", [{ recete: [{ hammaddeUrunId: "yok", renk: "Atom Fort" }, { hammaddeUrunId: "yok", renk: "Pinpon" }] }]), ["Atom Fort", "Pinpon"]);
bekle("kart renkleri önce, reçetedeki fazlalar sonra", hammaddeRenkSecenekleri("fort", [...tum2, { recete: [{ hammaddeUrunId: "fort", renk: "Eski Fort" }] }]), ["Atom Fort", "Pinpon 2 mm", "Eski Fort"]);

// v1.568.0 denetim
const ayri = { id: "ay", variants: ["Kahve", "Siyah"].map((renk) => ({ renk, beden: "40" })), recete: [
  r("d1", "Kahve", "deri", "Deri", "Kahve Süet", { eklemeId: "e1" }), r("d2", "Siyah", "deri", "Deri", "Bej Süet", { eklemeId: "e2" }),
] };
bekle("renk renk ayrı eklenmiş hammadde: çift satır yok", eksikRenkEslesmeleri(ayri, tum).satirlar.length, 0);
bekle("yeni renk: ayrı eklemelerden tek satır", yeniRenkReceteSatirlari(ayri, "Bej Süet", tum).satirlar.filter((x) => x.hammaddeAd === "Deri").length, 1);
const kombi = { id: "kb", variants: ["1004 - Kahve Süet/Bej Süet", "Siyah"].map((renk) => ({ renk, beden: "40" })), recete: [
  r("p1", "1004 - Kahve Süet/Bej Süet", "deri", "Deri", "Kahve Süet", { aciklama: "1. Renk" }), r("p2", "1004 - Kahve Süet/Bej Süet", "deri", "Deri", "Bej Süet", { aciklama: "2. Renk" }),
  r("p3", "Siyah", "deri", "Deri", "Kahve Süet", { aciklama: "1. Renk" }),
] };
bekle("tekli renge '2. Renk' açılmaz", eksikRenkEslesmeleri(kombi, tum).satirlar.length, 0);
const toka = { id: "tk", variants: ["Kahve", "Taba"].map((renk) => ({ renk, beden: "40" })), recete: [
  r("t1", "Kahve", "toka", "Toka", "Nikel"), r("t2", "Taba", "toka", "Toka", "Nikel"),
] };
bekle("sabit malzeme aynı-ad kuralından önce (Toka Nikel kalır)", yeniRenkReceteSatirlari(toka, "Siyah", [...tum, hm("toka", "Toka", ["Nikel", "Siyah"])]).satirlar.map((x) => x.renk), ["Nikel"]);
const kaynak3 = { id: "k3", recete: [r("y", "Kahve Süet", "deri", "Deri", "Kahve Süet", { aciklama: "Yüz" }), r("a", "Kahve Süet", "deri", "Deri", "Kahve Süet", { aciklama: "Astar" })] };
const hedef3 = { id: "h3", variants: [{ renk: "Kahve Süet", beden: "40" }], recete: [r("hy", "Kahve Süet", "deri", "Deri", "Kahve Süet", { aciklama: "Yüz" })] };
bekle("kopyada aynı hammaddenin ikinci kullanımı gelir", stoktanReceteKopyala(kaynak3, hedef3, tum).eklenecekler.map((x) => x.aciklama), ["Astar"]);

// KARŞILIKSIZ BEDEN (v1.570.0) — "bilmediğini boş getir, renkli belirt"; boy da geçmişten hatırlanır.
bekle("en yakın beden (sayısal)", [enYakinBeden(["38", "40", "42"], "43"), enYakinBeden(["38", "40", "42"], "39"), enYakinBeden(["S", "M"], "L")], ["42", "38", "M"]);
const bagB = (mb, boy, ek = {}) => r("bg" + mb, "Kahve Süet", "bag", "Bağcık", "Kahve", { mamulBeden: mb, beden: boy, miktar: Number(mb) / 10, ...ek });
const grup = [bagB("40", "120 cm"), bagB("41", "140 cm")];
const vary = ["40", "41", "42"].map((beden) => ({ renk: "Kahve Süet", beden }));
bekle("eksik beden bulunur (42)", receteGrupEksikBedenleri(grup, vary), ["42"]);
bekle("Tüm Bedenler satırı varsa eksik yok", receteGrupEksikBedenleri(bag, vary), []);
const ekB = receteBedenDegistir(grup, ["42"], "140 cm", ["40", "41", "42"], vary);
bekle("eşleştir… seçilince satır en yakın bedenden açılır", ekB.yeniSatirlar.map((x) => `${x.mamulBeden}:${x.beden}:${x.miktar}:${x.id || ""}`), ["42:140 cm:4.1:"]);
bekle("varyantlar verilmezse eski davranış (satır açılmaz)", receteBedenDegistir(grup, ["42"], "140 cm", ["40", "41", "42"]).yeniSatirlar.length, 0);
const hepsi = receteBedenDegistir(grup, ["40", "41", "42"], "150 cm", ["40", "41", "42"], vary);
bekle("Hepsi → eksikleri de doldurur", hepsi.yeniSatirlar.map((x) => `${x.mamulBeden}:${x.beden}`).sort(), ["40:150 cm", "41:150 cm", "42:150 cm"]);
const isaretli = [bagB("40", "120 cm", { bedenGecmisten: true })];
bekle("hatırlanan boy aynı değerle seçilince işaret düşer", receteBedenDegistir(isaretli, ["40"], "120 cm", ["40"]).yeniSatirlar.map((x) => !!x.bedenGecmisten), [false]);
bekle("boy seçenekleri: kart yoksa reçetelerden", hammaddeBedenSecenekleri("bag", [{ id: "u", recete: grup }]), ["120 cm", "140 cm"]);
// Geçmiş: başka modelde Bağcık 42 → 160 cm.
const gecmisUrun = { id: "g", variants: [], recete: [r("g42", "Siyah", "bag", "Bağcık", "Siyah", { mamulBeden: "42", beden: "160 cm", eklemeTarihi: "2026-09-01" })] };
const kaynakB = { id: "kb", variants: [], recete: grup };
const hedefB = { id: "hb", variants: [...vary, { renk: "Kahve Süet", beden: "43" }], recete: [] };
const kb = stoktanReceteKopyala(kaynakB, hedefB, [...tum, gecmisUrun, kaynakB]);
bekle("stoktan çek: 42 geçmişten (kırmızı), 43 bilinmiyor → boş + adı", [kb.eklenecekler.map((x) => `${x.mamulBeden}:${x.beden}${x.bedenGecmisten ? "*" : ""}`), kb.bedenGecmisSayisi, kb.bedenEksikler],
  [["40:120 cm", "41:140 cm", "42:160 cm*"], 1, ["Bağcık (43)"]]);
const sab = { id: "s", ad: "S", satirlar: [{ hammaddeUrunId: "bag", hammaddeAd: "Bağcık", renk: "Kahve", beden: "bedene göre", miktar: null, proses: "Kesim",
  bedenler: { "40": { beden: "120 cm", miktar: 4 }, "41": { beden: "140 cm", miktar: 4.1 } } }] };
const sb = sablonuUruneUygula(sab, hedefB, { tumUrunler: [hm("bag", "Bağcık", ["Kahve"]), gecmisUrun] });
bekle("şablon: 42 geçmişten (miktar en yakın bedenden), 43 boş + adı", [sb.eklenecekler.map((x) => `${x.mamulBeden}:${x.beden}:${x.miktar}${x.bedenGecmisten ? "*" : ""}`), sb.bedenGecmisSayisi, sb.bedenEksikler],
  [["40:120 cm:4", "41:140 cm:4.1", "42:160 cm:4.1*"], 1, ["Bağcık (43)"]]);
const tabanSab = { id: "t", ad: "T", satirlar: [{ hammaddeUrunId: "taban", hammaddeAd: "Taban", renk: "Kahve", beden: "mamul bedeni", miktar: null, proses: "Kesim", bedenAyni: true,
  bedenler: { "40": { beden: "40", miktar: 1 }, "41": { beden: "41", miktar: 2 } } }] };
bekle("şablon: boy = numara, miktar bedene göre → eksik numara düşmez", sablonuUruneUygula(tabanSab, hedefB, { tumUrunler: [hm("taban", "Taban", ["Kahve"])] }).eklenecekler.map((x) => `${x.mamulBeden}:${x.beden}:${x.miktar}`),
  ["40:40:1", "41:41:2", "42:42:2", "43:43:2"]);

console.log(hata ? "birim-yeni-renk-recete: HATA" : "birim-yeni-renk-recete: tamam");
process.exit(hata);
