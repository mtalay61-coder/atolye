// BİRİM TESTİ — HARİCİ BARKOD (v1.542.0)
//
// Kullanıcı (sipariş formunda kutunun etiketi "999000016232" okutulunca eklenmedi): "harici barkod ekle".
// Kutunun/tedarikçinin etiketi ürün kartında bir renk+bedene bağlanır; okutulunca o beden olarak çözülür.
//   1. Harici kod "beden" seviyesinde çözülür (boşluk/harf büyüklüğü farkı eşleşmeyi bozmaz).
//   2. Kendi şemamız önce gelir; harici kod yalnız şemaya uymayan kodda aranır.
//   3. Bağlı renk/beden üründen silinmişse eşleşme yok.
//   4. Çakışma: bizim barkodumuzla ya da başka bedenin harici koduyla aynı kod girilemez; kendi kodunu
//      yeniden yazmak çakışma sayılmaz.
//   5. Ayarla: aynı renk+bedenin kodu değişir (tek kayıt), boş kod siler.
const {
  urunBarkoduCoz, hariciBarkodCoz, hariciBarkodCakismasi, hariciBarkodAyarla, barkodTaninmamaSebebi,
} = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const tanimlar = {
  renkler: [{ id: "r1", ad: "Siyah", barkodKodu: 1 }],
  bedenler: [{ id: "b38", ad: "38", barkodKodu: 38 }, { id: "b39", ad: "39", barkodKodu: 39 }],
  asortiler: [],
};
const stok = [
  { id: "m1", ad: "125 Model", stokNo: 7, olcuTipi: "Beden",
    variants: [{ renk: "Siyah", renkId: "r1", beden: "38" }, { renk: "Siyah", renkId: "r1", beden: "39" }],
    hariciBarkodlar: [{ kod: "999000016232", renk: "Siyah", beden: "38" }, { kod: "ABC-9", renk: "Siyah", beden: "40" }] },
  { id: "m2", ad: "Başka", stokNo: 8, variants: [{ renk: "Siyah", beden: "39" }] },
];

console.log("1. çözme");
const c = urunBarkoduCoz("999000016232", stok, tanimlar);
bekle("harici kod beden seviyesinde", c && [c.seviye, c.urun.id, c.renk, c.beden, c.harici, c.renkTanim && c.renkTanim.id],
  ["beden", "m1", "Siyah", "38", true, "r1"]);
bekle("boşluk ve baştaki/sondaki fark önemsiz", !!hariciBarkodCoz(" 9990 00016232 ", stok, tanimlar), true);

console.log("2. kendi şemamız önce");
const kendi = urunBarkoduCoz("900007000139", stok, tanimlar);
bekle("90'lı kod şemadan çözülüyor", kendi && [kendi.seviye, kendi.beden, !!kendi.harici], ["beden", "39", false]);

console.log("3. silinmiş beden");
bekle("bağlı beden üründe yoksa eşleşme yok", urunBarkoduCoz("abc-9", stok, tanimlar), null);
bekle("tanınmayan kodun sebebi harici barkodu anıyor", /harici barkod/.test(barkodTaninmamaSebebi("123456")), true);

console.log("4. çakışma");
bekle("başka bedenin harici kodu", /zaten kullanılıyor/.test(hariciBarkodCakismasi("999000016232", stok, tanimlar, { urunId: "m1", renk: "Siyah", beden: "39" }) || ""), true);
bekle("kendi kodunu yeniden yazmak serbest", hariciBarkodCakismasi("999000016232", stok, tanimlar, { urunId: "m1", renk: "Siyah", beden: "38" }), null);
bekle("bizim barkodumuzla çakışma", /bizim barkodumuz/.test(hariciBarkodCakismasi("900007000138", stok, tanimlar, { urunId: "m2", renk: "Siyah", beden: "39" }) || ""), true);
bekle("yeni kod serbest", hariciBarkodCakismasi("5551112223334", stok, tanimlar, { urunId: "m2", renk: "Siyah", beden: "39" }), null);

console.log("5. ayarla");
const l1 = hariciBarkodAyarla(stok[0].hariciBarkodlar, "Siyah", "38", "111 222");
bekle("aynı bedenin kodu değişti, tek kayıt", l1.filter((x) => x.beden === "38"), [{ kod: "111222", renk: "Siyah", beden: "38" }]);
bekle("boş kod siliyor", hariciBarkodAyarla(l1, "Siyah", "38", "").some((x) => x.beden === "38"), false);
bekle("liste yoksa da çalışır", hariciBarkodAyarla(undefined, "Siyah", "39", "X1"), [{ kod: "X1", renk: "Siyah", beden: "39" }]);

console.log(hata ? "\n── harici barkod testinde HATA ──" : "\n── harici barkod testi temiz ──");
process.exit(hata);
