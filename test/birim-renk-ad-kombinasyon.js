// BİRİM TESTİ — RENK ADI DEĞİŞİNCE KOMBİNASYON RENKLERİ ÇÖKMESİN (v1.744.37, 046 renkAdVaryantReceteUygula).
// Kullanıcı (26 Kasım, model 27162 D): "bu modelde 2 renk eklemiştik, hatta sipariş de girdik, sonradan renklerin büyük küçük
// harf değişikliği yaptık örn: VİZON YILAN : Vizon Yılan diye, şimdi sanki modelde tek renk eklemişiz gibi oldu diğer renkler kayboldu".
// 082 her eşleşmeyi sırayla uygular: önce kombinasyon etiketleri, en sonda rengin kendi adı. Eskiden ilk eşleşme varyantı renk
// kimliğiyle damgalıyor, sonrakiler kimlikle yakalayıp üzerine yazıyordu → iki kombinasyon da "Vizon Yılan"a dönüyordu.
const { renkAdVaryantReceteUygula } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const RID = "r-vizon";
const eslesmeler = [
  { eskiEtiket: "1054 - KAHVE SÜET/VİZON YILAN", yeniEtiket: "1054 - KAHVE SÜET/Vizon Yılan", duz: false },
  { eskiEtiket: "1055 - BEJ SÜET/VİZON YILAN", yeniEtiket: "1055 - BEJ SÜET/Vizon Yılan", duz: false },
  { eskiEtiket: "VİZON YILAN", yeniEtiket: "Vizon Yılan", duz: true },
];
const uygula = (variants, recete) => eslesmeler.reduce((acc, e) => {
  const r = renkAdVaryantReceteUygula(acc.variants, acc.recete, e, RID);
  return r.degisti ? { variants: r.variants, recete: r.recete } : acc;
}, { variants, recete });

// Mamul: iki kombinasyon rengi (kimliksiz, 152 renkKimligiBul kombinasyon etiketine kimlik vermez) × iki beden.
const mamul = ["1054 - KAHVE SÜET/VİZON YILAN", "1055 - BEJ SÜET/VİZON YILAN"].flatMap((renk) =>
  ["36", "37"].map((beden) => ({ renk, beden, miktar: 0, renkId: null })));
const sonuc = uygula(mamul, [{ mamulRenk: "1054 - KAHVE SÜET/VİZON YILAN", renk: "Siyah", malzeme: "x" },
  { mamulRenk: "1055 - BEJ SÜET/VİZON YILAN", renk: "Siyah", malzeme: "x" }]);
bekle("iki kombinasyon rengi ayrı kalır, yalnız yazım değişir", [...new Set(sonuc.variants.map((v) => v.renk))],
  ["1054 - KAHVE SÜET/Vizon Yılan", "1055 - BEJ SÜET/Vizon Yılan"]);
bekle("kombinasyon varyantına renk kimliği damgalanmaz", sonuc.variants.map((v) => v.renkId), [null, null, null, null]);
bekle("reçete mamul rengi de ayrı kalır", sonuc.recete.map((r) => [r.mamulRenk, r.mamulRenkId === undefined ? "yok" : r.mamulRenkId]),
  [["1054 - KAHVE SÜET/Vizon Yılan", "yok"], ["1055 - BEJ SÜET/Vizon Yılan", "yok"]]);

// Hammadde: rengin kendi adı kimlikle bulunur (yazımı bozuk olsa da) ve damgalanır; kimliksiz eski kayıt adla bulunur.
const ham = uygula([{ renk: "vizon  yılan", beden: "Standart", renkId: RID }, { renk: "VİZON YILAN", beden: "B", renkId: null },
  { renk: "Siyah", beden: "Standart", renkId: "r-siyah" }], [{ mamulRenk: "Tümü", renk: "VİZON YILAN" }]);
bekle("düz ad: kimlikle ve adla bulunur, kimlik damgalanır", ham.variants.map((v) => [v.renk, v.renkId]),
  [["Vizon Yılan", RID], ["Vizon Yılan", RID], ["Siyah", "r-siyah"]]);
bekle("reçete hammadde rengi damgalanır", ham.recete.map((r) => [r.renk, r.renkId]), [["Vizon Yılan", RID]]);

// Başka rengin kimliğini taşıyan varyant, adı tutsa bile düz eşleşmede değişmez (kimlik öncelikli kural korunur).
const baska = uygula([{ renk: "VİZON YILAN", beden: "S", renkId: "r-baska" }], []);
bekle("kimliği başka renk olan varyanta dokunulmaz", baska.variants.map((v) => v.renk), ["VİZON YILAN"]);
console.log(hata ? "── renk adı kombinasyon testi HATALI ──" : "── renk adı kombinasyon testi temiz ──");
process.exit(hata);
