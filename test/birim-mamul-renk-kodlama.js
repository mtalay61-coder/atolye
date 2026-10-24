// BİRİM TESTİ — MAMUL RENK KODLAMA (v1.717.0, 083): plan (renk + 1 renkli model rengi), kodsuz liste, bütün kayıtlarda
// yeniden adlandırma.
const { mamulRenkKodlamaPlani, kodsuzMamulRenkleri, mamulRenkleriniYenidenAdlandir } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
let sayac = 0;
const uidUret = (o) => `${o}-${++sayac}`;

console.log("1) Plan");
const tanimlar = {
  renkler: [
    { id: "r1", ad: "Siyah", kod: "101", renkKodu: "#000" },
    { id: "r2", ad: "Taba", kod: "102" },
    { id: "r3", ad: "Beyaz", kod: "103" },
  ],
  renkKombinasyonlari: [
    { id: "k1", kod: "1001", renkIdler: ["r1"] },          // Siyah'ın 1 renklisi zaten var
    { id: "k2", kod: "1002", renkIdler: ["r1", "r2"] },    // iki renkli — tek renkli sayılmaz
    { id: "k3", kod: "1003", renkIdler: ["r3", "r2"] },
  ],
};
const plan = mamulRenkKodlamaPlani(tanimlar, ["Siyah", "Taba", "Kırmızı", "1002 - Siyah/Taba", "", "Standart", "  taba  ", "Siyah"], { uidUret, renkKodlari: { Kırmızı: "#f00" } });
bekle("var olan 1 renkli kombinasyon yeniden kullanılır", plan.etiketler["Siyah"], "1001 - Siyah");
bekle("tanımlı renge yeni kombinasyon: sonraki kod 1004", plan.etiketler["Taba"], "1004 - Taba");
bekle("bilinmeyen renk: renk 104 açılır, kombinasyon 1005", plan.etiketler["Kırmızı"], "1005 - Kırmızı");
bekle("kodlu ad olduğu gibi döner", plan.etiketler["1002 - Siyah/Taba"], "1002 - Siyah/Taba");
bekle("boş ve Standart atlanır", [plan.etiketler[""], plan.etiketler["Standart"]], [undefined, undefined]);
bekle("boşluklu yazım kırpılır, aynı renge gider", plan.etiketler["taba"], "1004 - Taba");
bekle("açılan renk: kod 104, görünüm rengi sorudan", plan.acilanRenkler.map((r) => [r.ad, r.kod, r.renkKodu]), [["Kırmızı", "104", "#f00"]]);
bekle("açılan kombinasyonlar: Taba ve Kırmızı", plan.acilanKombinasyonlar.map((k) => k.kod), ["1004", "1005"]);
bekle("tanımlar yeni nesne, girdi değişmedi", [plan.degisti, tanimlar.renkler.length, tanimlar.renkKombinasyonlari.length, plan.tanimlar.renkler.length, plan.tanimlar.renkKombinasyonlari.length], [true, 3, 3, 4, 5]);
const plan2 = mamulRenkKodlamaPlani(tanimlar, ["Siyah", "1002 - Siyah/Taba"], { uidUret });
bekle("değişiklik yoksa aynı tanımlar referansı", [plan2.degisti, plan2.tanimlar === tanimlar], [false, true]);
const plan3 = mamulRenkKodlamaPlani({ renkler: [], renkKombinasyonlari: [] }, ["Mavi"], { uidUret });
bekle("boş tanımlarda ilk kodlar 101 / 1001", [plan3.acilanRenkler[0].kod, plan3.etiketler["Mavi"]], ["101", "1001 - Mavi"]);

console.log("2) Kodsuz liste");
const stok = [
  { id: "u1", ad: "Bot", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "40" }, { renk: "Siyah", beden: "41" }, { renk: "1002 - Siyah/Taba", beden: "40" }, { renk: "Taba", beden: "40" }],
    renkResimleri: { Siyah: "img1" }, hareketler: [{ renk: "Siyah", beden: "40", miktar: 2 }, { renk: "Taba", beden: "40", miktar: 1 }],
    hariciBarkodlar: [{ renk: "Taba", beden: "40", kod: "X" }], recete: [{ id: "rc1", mamulRenk: "Siyah", renk: "Siyah" }, { id: "rc2", mamulRenk: "1002 - Siyah/Taba", renk: "Taba" }] },
  { id: "h1", ad: "Deri", kategori: "Hammadde", variants: [{ renk: "Siyah", beden: "Standart" }] },
  { id: "u2", ad: "Sandalet", kategori: "Mamul", variants: [{ renk: "Standart", beden: "Standart" }, { renk: "", beden: "38" }] },
  { id: "u3", ad: "Çizme", kategori: "Mamul", variants: [{ renk: "Siyah", beden: "42" }] },
];
bekle("yalnız mamul, kodsuz, ürün başına tekil", kodsuzMamulRenkleri(stok), [
  { urunId: "u1", urunAd: "Bot", renk: "Siyah" }, { urunId: "u1", urunAd: "Bot", renk: "Taba" }, { urunId: "u3", urunAd: "Çizme", renk: "Siyah" },
]);

console.log("3) Yeniden adlandırma");
const siparisler = [
  { id: "s1", kalemler: [{ id: "a", urunId: "u1", renk: "Siyah", beden: "40" }, { id: "b", urunId: "u3", renk: "Siyah", beden: "42" }, { id: "c", urunId: "h1", renk: "Siyah" }] },
  { id: "s2", kalemler: [{ id: "d", urunId: "u1", renk: "1002 - Siyah/Taba" }] },
];
const uretim = [{ id: "p1", urunId: "u1", renk: "siyah" }, { id: "p2", urunId: "u2", renk: "Siyah" }, { id: "p3", urunId: "u1", renk: "Taba" }];
const koliler = [{ id: "ko1", kalemler: [{ urunId: "u1", renk: "Taba", beden: "40", adet: 2 }] }, { id: "ko2", kalemler: [{ urunId: "u3", renk: "Kahve" }] }];
const teklifler = [{ id: "t1", kalemler: [{ id: "x", urunId: "u3", renk: "Siyah" }] }];
const eslesmeler = [
  { urunId: "u1", eski: "Siyah", yeni: "1001 - Siyah" }, { urunId: "u1", eski: "Taba", yeni: "1004 - Taba" },
  { urunId: "u3", eski: "Siyah", yeni: "1001 - Siyah" }, { urunId: "u9", eski: "Yok", yeni: "1009 - Yok" },
];
const r = mamulRenkleriniYenidenAdlandir({ stok, siparisler, uretim, koliler, teklifler }, eslesmeler);
bekle("sayılar", r.sayilar, { urun: 2, kalem: 2, uretim: 2, koli: 1, teklif: 1 });
const u1 = r.stok.find((p) => p.id === "u1");
bekle("varyantlar", u1.variants.map((v) => v.renk), ["1001 - Siyah", "1001 - Siyah", "1002 - Siyah/Taba", "1004 - Taba"]);
bekle("renk resmi anahtarı", Object.keys(u1.renkResimleri), ["1001 - Siyah"]);
bekle("hareketler", u1.hareketler.map((h) => h.renk), ["1001 - Siyah", "1004 - Taba"]);
bekle("harici barkod", u1.hariciBarkodlar.map((h) => h.renk), ["1004 - Taba"]);
bekle("reçete mamulRenk değişir, hammadde rengi kalır", u1.recete.map((x) => [x.mamulRenk, x.renk]), [["1001 - Siyah", "Siyah"], ["1002 - Siyah/Taba", "Taba"]]);
bekle("hammadde ürünü dokunulmaz (aynı referans)", r.stok.find((p) => p.id === "h1") === stok[1], true);
bekle("sipariş kalemleri: yalnız o ürünün; hammadde kalemi kalır", r.siparisler[0].kalemler.map((k) => k.renk), ["1001 - Siyah", "1001 - Siyah", "Siyah"]);
bekle("değişmeyen sipariş aynı referans", r.siparisler[1] === siparisler[1], true);
bekle("üretim: büyük/küçük harf farkı eşleşir, başka ürün kalır", r.uretim.map((u) => u.renk), ["1001 - Siyah", "Siyah", "1004 - Taba"]);
bekle("koli kalemleri", [r.koliler[0].kalemler[0].renk, r.koliler[1] === koliler[1]], ["1004 - Taba", true]);
bekle("teklif kalemleri", r.teklifler[0].kalemler[0].renk, "1001 - Siyah");
const r2 = mamulRenkleriniYenidenAdlandir({ stok, siparisler, uretim, koliler, teklifler }, []);
bekle("boş eşleşme: her liste aynı referans", [r2.stok === stok, r2.siparisler === siparisler, r2.uretim === uretim, r2.koliler === koliler, r2.teklifler === teklifler], [true, true, true, true, true]);

if (hata) { console.log("birim-mamul-renk-kodlama: HATA"); process.exit(1); }
console.log("birim-mamul-renk-kodlama: tamam");
