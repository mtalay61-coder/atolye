// BİRİM TESTİ — GÖRSELLE ÜRÜN BULMA (saf hesap kısmı)
//
// Kullanıcı: "Ürünün resmini çekip eşleşen en yakın ürünlerden listelenir… üretimden gelmiş ise
// üretimi olan modeller içerisinde eleme yaparsa daha az arama yapar."
//
// Ve sınırı da kendisi çizdi: "Stoğumuzda olmayan bir şeyi istemiyoruz. İçine girmediğim bilgiyi
// istemiyorum." Bu yüzden burada ölçülen şey bir servisin cevabı değil, KENDİ görsellerimiz
// üzerinde çalışan bir benzerlik hesabı. Test tarayıcısız koşuyor: kanvas işi ayrı, hesap ayrı.
const { imzaHesapla, imzaBenzerligi, gorselEslestir } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, kosul, ek) => {
  console.log(`  ${kosul ? "✓" : "✗"} ${ad}`);
  if (!kosul) { hata = 1; if (ek !== undefined) console.log("    çıkan:", JSON.stringify(ek)); }
};

// Düz renkli bir kare üretir (RGBA dizisi).
function duzKare(r, g, b, en = 16) {
  const p = new Array(en * en * 4);
  for (let i = 0; i < en * en; i++) { p[i * 4] = r; p[i * 4 + 1] = g; p[i * 4 + 2] = b; p[i * 4 + 3] = 255; }
  return imzaHesapla(p, en, en);
}

// Yarısı bir renk, yarısı başka: biçim (aHash) deseninin ölçülmesi için.
function ikiyeBolunmus(r1, g1, b1, r2, g2, b2, en = 16) {
  const p = new Array(en * en * 4);
  for (let y = 0; y < en; y++) {
    for (let x = 0; x < en; x++) {
      const i = (y * en + x) * 4;
      const ust = y < en / 2;
      p[i] = ust ? r1 : r2; p[i + 1] = ust ? g1 : g2; p[i + 2] = ust ? b1 : b2; p[i + 3] = 255;
    }
  }
  return imzaHesapla(p, en, en);
}

const siyah = duzKare(20, 20, 20);
const siyahBenzeri = duzKare(35, 33, 30);     // aynı mal, farklı ışık
const bej = duzKare(214, 190, 150);
const kirmizi = duzKare(200, 30, 30);

bekle("imza histogramı normalize", Math.abs(siyah.hist.reduce((t, v) => t + v, 0) - 1) < 1e-9);
bekle("aHash 64 bit", siyah.ahash.length === 64, siyah.ahash.length);

// ---- AYNI MAL, FARKLI IŞIK: eşleşme yüksek kalmalı --------------------------------------------
const ayniMal = imzaBenzerligi(siyah, siyahBenzeri);
const farkliMal = imzaBenzerligi(siyah, bej);
bekle("kendine benzerlik tam", Math.abs(imzaBenzerligi(siyah, siyah) - 1) < 1e-9);
bekle("aynı mal farklı ışıkta hâlâ yakın", ayniMal > 0.6, ayniMal);
bekle("siyah ile bej ayrışıyor", farkliMal < ayniMal, { ayniMal, farkliMal });
bekle("doygun renk gri ekseninden ayrı", imzaBenzerligi(kirmizi, siyah) < 0.4, imzaBenzerligi(kirmizi, siyah));

// ---- BİÇİM: aynı renkler, farklı desen --------------------------------------------------------
// Aynı iki rengi taşıyan ama deseni farklı iki görsel: renk histogramı aynı, aHash farklı.
// Skor 1'in ALTINDA kalmalı — biçim katkısı ölçülüyor.
const desenA = ikiyeBolunmus(20, 20, 20, 214, 190, 150);
const desenB = ikiyeBolunmus(214, 190, 150, 20, 20, 20);
const desenSkoru = imzaBenzerligi(desenA, desenB);
bekle("renk aynı, desen farklı → tam eşleşme değil", desenSkoru < 0.95, desenSkoru);
bekle("renk aynı olduğu için yine de yüksek", desenSkoru > 0.5, desenSkoru);

// ---- SIRALAMA ---------------------------------------------------------------------------------
const havuz = [
  { urunId: "m1", urunAd: "125 Model", renk: "Bej", imza: bej },
  { urunId: "m2", urunAd: "SS Model", renk: "Siyah", imza: siyahBenzeri },
  { urunId: "m3", urunAd: "Kırmızı Model", renk: "Kırmızı", imza: kirmizi },
];
const sira = gorselEslestir(siyah, havuz);
bekle("en yakın aday başta", sira[0].urunId === "m2", sira.map((x) => x.urunId));
bekle("hepsi listeleniyor", sira.length === 3, sira.length);
bekle("skorlar azalan sırada", sira[0].skor >= sira[1].skor && sira[1].skor >= sira[2].skor,
  sira.map((x) => Math.round(x.skor * 100)));

// GÖRSELİ OLMAYAN ADAY ELENMİYOR, en sona düşüyor ve sebebi ayırt edilebiliyor (skor -1).
// Sessizce kaybolsaydı kullanıcı görselin eksik olduğunu hiç fark etmezdi.
const eksikli = gorselEslestir(siyah, [...havuz, { urunId: "m4", urunAd: "Görselsiz", renk: "Taba", imza: null }]);
bekle("görselsiz aday listede kalıyor", eksikli.length === 4, eksikli.length);
bekle("görselsiz aday en sonda", eksikli[3].urunId === "m4", eksikli[3].urunId);
bekle("görselsiz aday işaretli", eksikli[3].skor === -1, eksikli[3].skor);

// ---- SINIRLAR ---------------------------------------------------------------------------------
bekle("enFazla uygulanıyor", gorselEslestir(siyah, havuz, { enFazla: 2 }).length === 2);
bekle("boş havuz → boş liste", gorselEslestir(siyah, []).length === 0);
bekle("imzasız hedef → sıfır skor", imzaBenzerligi(null, siyah) === 0);

console.log(hata ? "\n── GÖRSEL EŞLEŞTİRME BAŞARISIZ ──" : "\n── görsel eşleştirme testi temiz ──");
process.exit(hata);
