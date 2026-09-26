// BİRİM TESTİ — FİNANS: DÖNEM KARŞILAŞTIRMA, NAKİT AKIŞI, MALİYET FARKI (26 Eylül, v1.475.0)
//
// İddialar:
//   • Dönem: iki tarihin grup toplamları ve farkı (kasa 800 → 500 = −300, net aynı fark).
//   • Nakit: başlangıç kasa; vadesi geçen borç "Vadesi geçmiş"te; vadesiz alacak tarih + varsayılan
//     vade ile doğru haftada; alınan/verilen çek vadesinde; kapsam dışı vade "Sonrası"nda; USD kurla;
//     birikimli nakit ve en düşük dönem; "vadesi geçenleri katma" birikimliyi değiştiriyor.
//   • Maliyet: devam eden işte kart = planlanan adet; tamamlanan işte kart = stoğa giren çift;
//     reçetede olmayan malzeme ayrı kalem ve farka giriyor; işçilik kartı proses ücretlerinden.
const { finansDonemKarsilastir, finansNakitAkisi, finansMaliyetFarki } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

// ---- DÖNEM ----
const muhasebeD = { kurlar: {}, kasalar: [{ id: "k", ad: "Kasa", paraBirimi: "TRY", hareketler: [
  { tarih: "2026-09-01", yon: "Giriş", tutar: 800, defter: "Genel" },
  { tarih: "2026-09-20", yon: "Çıkış", tutar: 300, defter: "Genel" }] }], bankalar: [], cekler: [] };
const d = finansDonemKarsilastir({ cariler: [], muhasebe: muhasebeD, stok: [], uretim: [], kurlar: {}, defter: "Tümü", tarihA: "2026-09-10", tarihB: "2026-09-25" });
bekle("dönem: hazır değerler 800 → 500", d.gruplar.map((g) => [g.grup, g.a, g.b, g.fark, g.yuzde]), [["Hazır Değerler", 800, 500, -300, -37.5]]);
bekle("dönem: net varlık farkı", d.toplamlar.find((t) => t.anahtar === "net").fark, -300);

// ---- NAKİT ----
const cariler = [
  { id: "m", unvan: "Müşteri", tip: "Müşteri", hareketler: [
    { id: "a1", tarih: "2026-09-01", yon: "Borç", tutar: 3000, paraBirimi: "TRY", defter: "Genel", fisNo: "SAT-1" },
    { id: "a2", tarih: "2026-09-20", yon: "Borç", tutar: 100, paraBirimi: "USD", defter: "Genel", fisNo: "SAT-2", vade: "2026-12-20" }] },
  { id: "t", unvan: "Tedarikçi", tip: "Tedarikçi", hareketler: [
    { id: "b1", tarih: "2026-08-01", yon: "Alacak", tutar: 1500, paraBirimi: "TRY", defter: "Genel", fisNo: "ALS-1" }] },
];
const muhasebe = { kurlar: { USD: 40 }, kasalar: [{ id: "k", ad: "Kasa", paraBirimi: "TRY", hareketler: [{ tarih: "2026-09-01", yon: "Giriş", tutar: 1000, defter: "Genel" }] }], bankalar: [],
  cekler: [
    { id: "c1", tip: "Alınan", durum: "Portföyde", cekNo: "A1", cariId: "m", tutar: 5000, paraBirimi: "TRY", vadeTarihi: "2026-10-05" },
    { id: "c2", tip: "Verilen", durum: "Portföyde", cekNo: "S1", cariId: "t", tutar: 2000, paraBirimi: "TRY", vadeTarihi: "2026-10-01" },
    { id: "c3", tip: "Alınan", durum: "Ciro Edildi", cekNo: "A2", cariId: "m", tutar: 9999, paraBirimi: "TRY", vadeTarihi: "2026-10-01" }] };
const n = finansNakitAkisi({ cariler, muhasebe, kurlar: muhasebe.kurlar, tarih: "2026-09-26", varsayilanVade: 30, aralik: "hafta", donemSayisi: 8 });
const ozetle = (x) => [x.anahtar, x.cekGiris, x.alacak, x.cekCikis, x.borc, x.net, x.kumulatif];
bekle("nakit: başlangıç kasa", n.baslangic, 1000);
bekle("nakit: vadesi geçmiş borç", ozetle(n.gecikmis), ["gecikmis", 0, 0, 0, 1500, -1500, -500]);
bekle("nakit: 1. hafta (vadesiz alacak +30 gün, verilen çek)", ozetle(n.donemler[0]), ["h1", 0, 3000, 2000, 0, 1000, 500]);
bekle("nakit: 2. hafta alınan çek (ciro edilen girmez)", ozetle(n.donemler[1]), ["h2", 5000, 0, 0, 0, 5000, 5500]);
bekle("nakit: sonrası USD alacak kurla", ozetle(n.sonrasi), ["sonrasi", 0, 4000, 0, 0, 4000, 9500]);
bekle("nakit: en düşük nokta vadesi geçmiş satırı (bugün beklenen borç)", [n.enDusuk.anahtar, n.enDusuk.kumulatif], ["gecikmis", -500]);
const n2 = finansNakitAkisi({ cariler, muhasebe, kurlar: muhasebe.kurlar, tarih: "2026-09-26", varsayilanVade: 30, gecikmisDahil: false });
bekle("nakit: vadesi geçenler katılmayınca 1. hafta birikimli ve en düşük", [n2.donemler[0].kumulatif, n2.enDusuk.anahtar], [2000, "h1"]);
const n3 = finansNakitAkisi({ cariler, muhasebe, kurlar: muhasebe.kurlar, tarih: "2026-09-26", varsayilanVade: 30, aralik: "ay", donemSayisi: 3 });
bekle("nakit: aylık dönemler", n3.donemler.map((x) => [x.anahtar, x.bas, x.son, x.net]), [["2026-09", "2026-09-26", "2026-09-30", 0], ["2026-10", "2026-10-01", "2026-10-31", 6000], ["2026-11", "2026-11-01", "2026-11-30", 0]]);

// ---- MALİYET FARKI ----
const stok = [
  { id: "deri", ad: "Deri", kategori: "Hammadde", birim: "metre", alisFiyati: 50, variants: [], hareketler: [
    { tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -20, uretimId: "u1" },
    { tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -12, uretimId: "u2" }] },
  { id: "taban", ad: "Taban", kategori: "Hammadde", birim: "adet", alisFiyati: 20, variants: [], hareketler: [
    { tarih: "2026-09-20", renk: "", beden: "", miktar: -4, uretimId: "u1" },
    { tarih: "2026-09-20", renk: "", beden: "", miktar: -4, uretimId: "u2" }] },
  { id: "tutkal", ad: "Tutkal", kategori: "Hammadde", birim: "adet", alisFiyati: 30, variants: [], hareketler: [
    { tarih: "2026-09-20", renk: "", beden: "", miktar: -1, uretimId: "u2" }] },
  { id: "bot", ad: "Bot", kategori: "Mamul", birim: "çift", prosesUcretleri: { Kesim: 10, Saya: 15, Montaj: 25 },
    recete: [
      { hammaddeUrunId: "deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2 },
      { hammaddeUrunId: "taban", renk: "", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 1 }],
    variants: [], hareketler: [
      { tarih: "2026-09-20", renk: "Siyah", beden: "40", miktar: 4, uretimId: "u1" },
      { tarih: "2026-09-22", renk: "Siyah", beden: "40", miktar: 4, uretimId: "u2" }] },
];
const uretim = [
  { id: "u1", siparisNo: "10001", urunId: "bot", renk: "Siyah", adet: 10, asama: "Montaj", bedenMiktarlari: [{ beden: "40", miktar: 10 }] },
  { id: "u2", siparisNo: "10002", urunId: "bot", renk: "Siyah", adet: 5, asama: "Tamamlandı", bedenMiktarlari: [{ beden: "40", miktar: 5 }] },
];
const carilerM = [{ id: "p", unvan: "Usta", tip: "Personel", hareketler: [
  { id: "i1", tarih: "2026-09-10", yon: "Alacak", tutar: 350, fisNo: "10001-Kesim-İşçilik", uretimId: "u1" },
  { id: "i2", tarih: "2026-09-10", yon: "Alacak", tutar: 200, fisNo: "10002-Kesim-İşçilik", uretimId: "u2" }] }];
const m = finansMaliyetFarki({ uretim, stok, cariler: carilerM, kurlar: {}, tarih: "2026-09-26", yalnizTamamlanan: false });
const mo = (x) => [x.uretim.siparisNo, x.esasAdet, x.kartHammadde, x.gercekHammadde, x.kartIscilik, x.gercekIscilik, x.fark, x.farkYuzde];
bekle("maliyet: devam eden — plan adedi (10) üzerinden", mo(m.find((x) => x.uretim.id === "u1")), ["10001", 10, 1200, 1080, 500, 350, -270, -15.9]);
bekle("maliyet: tamamlanan — stoğa giren 4 çift, fire + reçete dışı tutkal", mo(m.find((x) => x.uretim.id === "u2")), ["10002", 4, 480, 710, 200, 200, 230, 33.8]);
bekle("maliyet: kalem ayrıntısı (farka göre)", m.find((x) => x.uretim.id === "u2").kalemler.map((k) => [k.ad, k.kartMiktar, k.gercekMiktar, k.farkTL, k.receteDisi]),
  [["Deri", 8, 12, 200, false], ["Tutkal", 0, 1, 30, true], ["Taban", 4, 4, 0, false]]);
bekle("maliyet: yalnız tamamlananlar", finansMaliyetFarki({ uretim, stok, cariler: carilerM, kurlar: {}, tarih: "2026-09-26" }).map((x) => x.uretim.id), ["u2"]);

if (hata) { console.log("── finans ek testi BAŞARISIZ ──"); process.exit(1); }
console.log("── finans ek testi temiz ──");
