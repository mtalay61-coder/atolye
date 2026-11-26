// BİRİM TESTİ — TANIM ÇAKIŞMASI (v1.744.38, inceleme 25 B2, 089 tanimCakismalari). İki cihaz Tanımlar'ı aynı anda değiştirdiğinde:
// farklı öğeler / aynı öğenin farklı alanları sessizce birleşir; AYNI alana iki farklı değer, ya da bir tarafın sildiğini öbürünün
// değiştirmesi ÇAKIŞMA olarak listelenir (eskiden yerel değer sessizce seçiliyordu). Sayaçlar çakışma değildir (büyüğü).
const { tanimCakismalari, tanimOtomatikBirlestir, tanimlarUzlastir, tanimYeniKodlariAyir } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const taban = { renkler: [{ id: "r1", ad: "Siyah", kod: "11" }, { id: "r2", ad: "Vizon Yılan", kod: "12" }], bedenler: [{ id: "b1", ad: "40" }], kodSayaclari: { renk: 12 } };
const kopya = (x) => JSON.parse(JSON.stringify(x));

// 1. farklı öğe eklendi (A renk, B beden) → çakışma yok, birleşimde ikisi de var
{ const y = kopya(taban); y.renkler.push({ id: "r3", ad: "Kırmızı" }); y.kodSayaclari.renk = 13;
  const b = kopya(taban); b.renkler.push({ id: "r4", ad: "Lacivert" }); b.kodSayaclari.renk = 14;
  bekle("1 farklı yeni öğeler: çakışma yok", tanimCakismalari(y, b, taban), []);
  const u = tanimOtomatikBirlestir(tanimlarUzlastir(y, b, taban, {}).tanimlar, y, b);
  bekle("1 birleşimde ikisi de var", u.renkler.map((r) => r.ad).sort(), ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
  bekle("1 sayaç = büyüğü (çakışma sayılmaz)", u.kodSayaclari.renk, 14); }
// 2. aynı öğenin FARKLI alanları → çakışma yok, ikisi de korunur
{ const y = kopya(taban); y.renkler[1].ad = "Vizon Deri";
  const b = kopya(taban); b.renkler[1].kod = "99";
  bekle("2 aynı öğe farklı alan: çakışma yok", tanimCakismalari(y, b, taban), []);
  const u = tanimlarUzlastir(y, b, taban, {}).tanimlar;
  bekle("2 iki alan da korunur", [u.renkler[1].ad, u.renkler[1].kod], ["Vizon Deri", "99"]); }
// 3. aynı alana iki farklı değer → ÇAKIŞMA (sessizce yerel seçilmez)
{ const y = kopya(taban); y.renkler[1].ad = "Vizon Rugan";
  const b = kopya(taban); b.renkler[1].ad = "Vizon Deri";
  bekle("3 aynı alan: çakışma", tanimCakismalari(y, b, taban).map((c) => [c.yol, c.yerel, c.bulut, c.tur]), [["renkler › Vizon Rugan › ad", "Vizon Rugan", "Vizon Deri", "deger"]]); }
// 4. aynı alana AYNI değer → çakışma yok
{ const y = kopya(taban); y.renkler[1].ad = "Vizon Deri"; const b = kopya(y);
  bekle("4 aynı değer: çakışma yok", tanimCakismalari(y, b, taban), []); }
// 5. bu cihaz sildi, başka cihaz değiştirdi → çakışma; tersi de
{ const y = kopya(taban); y.renkler = y.renkler.filter((r) => r.id !== "r2");
  const b = kopya(taban); b.renkler[1].ad = "Vizon Deri";
  bekle("5a sildim / değişti: çakışma", tanimCakismalari(y, b, taban).map((c) => [c.yol, c.tur]), [["renkler › Vizon Deri", "silindi-yerel"]]);
  bekle("5b değiştirdim / silindi: çakışma", tanimCakismalari(b, y, taban).map((c) => [c.yol, c.tur]), [["renkler › Vizon Deri", "silindi-bulut"]]); }
// 6. taban bilinmiyor → çakışma bilinemez (eski birleşim)
bekle("6 taban yok: liste boş", tanimCakismalari({ a: 1 }, { a: 2 }, undefined), []);
// 7. yalnız bir taraf değişti → çakışma yok
{ const y = kopya(taban); y.bedenler[0].ad = "40 Geniş";
  bekle("7 tek taraflı değişiklik: çakışma yok", tanimCakismalari(y, kopya(taban), taban), []); }
// 8. düz alan (girisAktifMi gibi) iki farklı değer → çakışma
bekle("8 düz alan", tanimCakismalari({ ...taban, x: 1 }, { ...taban, x: 2 }, { ...taban, x: 0 }).map((c) => c.yol), ["x"]);
// 8b. alan TABANDA YOK, iki taraf farklı değerle ekledi (renk ton kodu) → çakışma; aynı değerle → yok; yalnız biri ekledi → yok
{ const y = kopya(taban); y.renkler[1].tonKodu = "202"; const b = kopya(taban); b.renkler[1].tonKodu = "201";
  bekle("8b tabanda olmayan alana iki farklı değer: çakışma", tanimCakismalari(y, b, taban).map((c) => [c.yol, c.yerel, c.bulut]), [["renkler › Vizon Yılan › tonKodu", "202", "201"]]);
  const y2 = kopya(taban); y2.renkler[1].tonKodu = "201";
  bekle("8b aynı değer: çakışma yok", tanimCakismalari(y2, b, taban), []);
  bekle("8b yalnız bir taraf ekledi: çakışma yok", tanimCakismalari(y, kopya(taban), taban), []); }
// 9. KOD AYRIMI: iki cihaz aynı sayaçtan aynı kodu verdi (ton kodu 101, barkod kodu 13). Sunucudaki öğe kodunu KORUR, bu cihazın
//    yeni öğesi sıradaki boş koda geçer; ikisi de kalır.
{ const bulut = { renkler: [{ id: "r1", ad: "Siyah", kod: "100", barkodKodu: 11 }, { id: "r4", ad: "Lacivert", kod: "101", barkodKodu: 13 }], renkKombinasyonlari: [{ id: "k1", kod: "1001", renkIdler: ["r1"] }], kodSayaclari: { renk: 13 } };
  const birlesik = { ...kopya(bulut), renkler: [...kopya(bulut).renkler, { id: "r3", ad: "Kırmızı", kod: "101", barkodKodu: 13 }] };
  const a = tanimYeniKodlariAyir(birlesik, bulut);
  bekle("9 sunucudaki Lacivert kodlarını korur", a.tanimlar.renkler.find((r) => r.id === "r4"), { id: "r4", ad: "Lacivert", kod: "101", barkodKodu: 13 });
  const k = a.tanimlar.renkler.find((r) => r.id === "r3");
  bekle("9 yeni Kırmızı sıradaki kodlara geçer", [k.kod, k.barkodKodu], ["102", 14]);
  bekle("9 değişiklik bildirilir", a.degisenler.map((d) => `${d.ad}:${d.alan}:${d.eski}>${d.yeni}`), ["Kırmızı:kod:101>102", "Kırmızı:barkodKodu:13>14"]);
  bekle("9 girdi değişmedi (saf)", birlesik.renkler[2].kod, "101");
  const tum = a.tanimlar.renkler.map((r) => r.kod); bekle("9 ton kodları tekil", tum.length, new Set(tum).size); }
// 10. çakışma yoksa dokunulmaz (aynı nesne döner)
{ const b = { renkler: [{ id: "r1", ad: "Siyah", kod: "100", barkodKodu: 11 }] };
  const y = { renkler: [...b.renkler, { id: "r2", ad: "Mavi", kod: "103", barkodKodu: 12 }] };
  bekle("10 çakışma yok → aynı nesne", tanimYeniKodlariAyir(y, b).tanimlar === y, true); }
// 11. kombinasyon kodu çakışması sessizce değiştirilmez → açık çakışma
{ const b = { renkler: [], renkKombinasyonlari: [{ id: "k1", kod: "1003", renkIdler: ["r1"] }] };
  const y = { renkler: [], renkKombinasyonlari: [...b.renkKombinasyonlari, { id: "k2", kod: "1003", renkIdler: ["r2"] }] };
  const a = tanimYeniKodlariAyir(y, b);
  bekle("11 kombinasyon kodu: açık çakışma", a.kombiCakismalari.map((c) => [c.yol, c.tur]), [["kombinasyonlar › kod 1003", "kod"]]);
  bekle("11 kombinasyon kodu değişmedi", a.tanimlar.renkKombinasyonlari.map((k) => k.kod), ["1003", "1003"]); }
console.log(hata ? "── tanım çakışması testi HATALI ──" : "── tanım çakışması testi temiz ──");
process.exit(hata);
