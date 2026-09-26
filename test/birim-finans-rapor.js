// BİRİM TESTİ — FİNANS RAPORU SATIRLARI (25 Eylül, v1.463.0)
//
// Varlık raporunun iddiaları: defter ayrımı ("Muhasebe" ikisine de), tarih itibarıyla bakiye,
// çek durumunun geçmişten oynatılması, alınan/verilen çek tarafları, stok değeri (hammadde alış
// fiyatı, mamul reçete maliyeti), kuru olmayan birimin toplam dışı kalması, net varlık.
const { finansRaporSatirlari, finansOzet, cariYaslandirma, finansUretimDegerleri } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const cariler = [
  { id: "m", unvan: "Müşteri", tip: "Müşteri", hareketler: [
    { id: "h1", tarih: "2026-09-01", yon: "Borç", tutar: 1000, paraBirimi: "TRY", defter: "Genel" },
    { id: "h2", tarih: "2026-09-10", yon: "Borç", tutar: 500, paraBirimi: "TRY", defter: "Resmi" },
    { id: "h3", tarih: "2026-09-05", yon: "Borç", tutar: 200, paraBirimi: "TRY", defter: "Muhasebe" },
    { id: "h4", tarih: "2026-09-02", yon: "Alacak", tutar: 42000, paraBirimi: "TRY", defter: "Genel", odemeSekli: "Çek" },
    { id: "h5", tarih: "2026-09-03", yon: "Borç", tutar: 100, paraBirimi: "USD", defter: "Genel" },
  ] },
  { id: "t", unvan: "Tedarikçi", tip: "Tedarikçi", hareketler: [
    { id: "h6", tarih: "2026-09-04", yon: "Alacak", tutar: 300, paraBirimi: "TRY", defter: "Genel" },
    { id: "h7", tarih: "2026-09-04", yon: "Alacak", tutar: 10, paraBirimi: "GBP", defter: "Genel" },
  ] },
];
const muhasebe = {
  kurlar: { USD: 40, EUR: 50 },
  kasalar: [{ id: "k", ad: "Merkez Kasa", paraBirimi: "TRY", hareketler: [
    { tarih: "2026-09-01", yon: "Giriş", tutar: 800, defter: "Genel" },
    { tarih: "2026-09-20", yon: "Çıkış", tutar: 300, defter: "Genel" },
  ] }],
  bankalar: [],
  cekler: [
    { id: "c1", tip: "Alınan", durum: "Ciro Edildi", cekNo: "A1", cariId: "m", tutar: 42000, paraBirimi: "TRY", vadeTarihi: "2026-12-01", hareketId: "h4",
      gecmis: [{ id: "g1", islem: "Ciro Et", oncekiDurum: "Portföyde", yeniDurum: "Ciro Edildi", tarih: "2026-09-15", cariAd: "Tedarikçi" }] },
    { id: "c2", tip: "Verilen", durum: "Portföyde", cekNo: "S1", cariId: "t", tutar: 5000, paraBirimi: "TRY", vadeTarihi: "2026-10-15" },
  ],
};
const stok = [
  { id: "hm", ad: "Deri", kategori: "Hammadde", alisFiyati: 2, alisParaBirimi: "$", hareketler: [
    { tarih: "2026-09-01", renk: "Siyah", beden: "", miktar: 10 }, { tarih: "2026-09-12", renk: "Siyah", beden: "", miktar: -4 }] },
  { id: "mm", ad: "Bot", kategori: "Mamul", satisFiyati: 1000, satisParaBirimi: "₺",
    recete: [{ hammaddeUrunId: "hm", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 3 }],
    hareketler: [{ tarih: "2026-09-02", renk: "Siyah", beden: "40", miktar: 2 }] },
  { id: "hz", ad: "Fason", kategori: "Hizmet", hareketler: [{ tarih: "2026-09-02", miktar: 5 }] },
];

const bul = (satirlar, f) => satirlar.filter(f).map((s) => [s.kalem, s.ad, s.paraBirimi, s.tutar, s.tlKarsiligi, s.netEtki]);
const tum = finansRaporSatirlari({ cariler, muhasebe, stok, defter: "Tümü", tarih: "2026-09-30" });

bekle("kasa bakiyesi", bul(tum, (s) => s.kalem === "Kasa"), [["Kasa", "Merkez Kasa", "TRY", 500, 500, 500]]);
// Muhasebe defterli 200 Tümü görünümünde BİR kez: 1000 + 500 + 200 − 42000 = −40300 → müşteri bizden alacaklı (çek fazlası): borç tarafı.
bekle("TRY'de çek fazlası borç tarafına düşer", bul(tum, (s) => s.grup === "Ticari Borçlar" && s.ad === "Müşteri"), [["Müşteri borcu", "Müşteri", "TRY", 40300, 40300, -40300]]);
bekle("USD alacak kurla", bul(tum, (s) => s.ad === "Müşteri" && s.paraBirimi === "USD"), [["Müşteri alacağı", "Müşteri", "USD", 100, 4000, 4000]]);
const gbp = tum.find((s) => s.paraBirimi === "GBP");
bekle("kuru olmayan birim: TL yok, net 0, not var", [gbp.tlKarsiligi, gbp.netEtki, /GBP kuru yok/.test(gbp.not)], [null, 0, true]);
bekle("ciro edilen vadesi gelmemiş çek bilgi satırı", bul(tum, (s) => s.taraf === "Bilgi"), [["Ciro edilen, vadesi gelmemiş", "A1", "TRY", 42000, 42000, 0]]);
bekle("şahsi çek yükümlülük", bul(tum, (s) => s.grup === "Verilen Çekler"), [["Ödenecek şahsi çek", "S1", "TRY", 5000, 5000, -5000]]);
// Deri 6 m × 2 $ × 40 = 480; Bot 2 × (3 × 80) = 480; hizmet yok.
bekle("stok değerleri", bul(tum, (s) => s.grup === "Stoklar"), [["Hammadde", "Deri", "TRY", 480, 480, 480], ["Mamul", "Bot", "TRY", 480, 480, 480]]);

const genel = finansRaporSatirlari({ cariler, muhasebe, stok, defter: "Genel", tarih: "2026-09-30" });
const resmi = finansRaporSatirlari({ cariler, muhasebe, stok, defter: "Resmi", tarih: "2026-09-30" });
bekle("Resmi: 500 + Muhasebe 200", bul(resmi, (s) => s.ad === "Müşteri"), [["Müşteri alacağı", "Müşteri", "TRY", 700, 700, 700]]);
bekle("Resmi'de Genel defterli çek yok", resmi.filter((s) => /Çek/.test(s.grup)).length, 0);
bekle("Genel'de kasa var", genel.some((s) => s.kalem === "Kasa"), true);

// Tarih itibarıyla: 10 Eylül — kasa 800, deri 10 m, çek henüz portföyde (ciro 15'inde).
const once = finansRaporSatirlari({ cariler, muhasebe, stok, defter: "Tümü", tarih: "2026-09-10" });
bekle("10 Eylül kasa", bul(once, (s) => s.kalem === "Kasa").map((x) => x[3]), [800]);
bekle("10 Eylül çek portföyde", bul(once, (s) => s.ad === "A1").map((x) => x[0]), ["Portföydeki çek"]);
bekle("10 Eylül deri miktarı", once.filter((s) => s.ad === "Deri").map((s) => s.miktar), [10]);

// Mamul satış fiyatıyla.
const satis = finansRaporSatirlari({ cariler, muhasebe, stok, defter: "Tümü", tarih: "2026-09-30", mamulDegerleme: "satis" });
bekle("mamul satış fiyatıyla", satis.filter((s) => s.ad === "Bot").map((s) => s.tlKarsiligi), [2000]);

const oz = finansOzet(tum);
// Varlık: 500 + 4000 + 480 + 480 = 5460 · Yükümlülük: 40300 + 300 + 5000 = 45600 (GBP dışarıda).
bekle("özet", [oz.varlik, oz.yukumluluk, oz.net, oz.kurYok], [5460, 45600, -40140, 1]);

// ---- YAŞLANDIRMA (v1.464.0) — FIFO: ödeme en eski kalemi kapatır ----
const yc = { id: "y", unvan: "Y", hareketler: [
  { id: "s1", tarih: "2026-05-01", yon: "Borç", tutar: 1000, paraBirimi: "TRY", fisNo: "S1" },   // 152 gün
  { id: "s2", tarih: "2026-08-01", yon: "Borç", tutar: 500, paraBirimi: "TRY", fisNo: "S2" },    // 60 gün
  { id: "s3", tarih: "2026-09-20", yon: "Borç", tutar: 300, paraBirimi: "TRY", fisNo: "S3", vade: "2026-10-20" }, // vadesi gelmemiş
  { id: "t1", tarih: "2026-09-10", yon: "Alacak", tutar: 1200, paraBirimi: "TRY" },              // S1'in tamamı + S2'den 200
  { id: "u1", tarih: "2026-09-01", yon: "Borç", tutar: 50, paraBirimi: "USD", fisNo: "U1" },
  { id: "r1", tarih: "2026-09-05", yon: "Borç", tutar: 999, paraBirimi: "TRY", defter: "Resmi" },
] };
const [try_, usd] = cariYaslandirma(yc, { defter: "Genel", tarih: "2026-09-30" });
bekle("FIFO bakiye", [try_.pb, try_.bakiye, try_.yon], ["TRY", 600, "alacak"]);
bekle("FIFO açık kalemler: S1 kapandı, S2'nin 300'ü, S3", try_.acikKalemler.map((k) => [k.fisNo, k.kalan, k.gun, k.kismen]), [["S2", 300, 60, true], ["S3", 300, -20, false]]);
bekle("dilimler", [try_.kovalar.yasVadesiGelmemis, try_.kovalar.yas31_60, try_.kovalar.yas180], [300, 300, 0]);
bekle("ortalama gecikme / en eski", [try_.ortalamaGecikme, try_.enEskiGun, try_.vadesiGecen], [60, 60, 300]);
bekle("USD ayrı", [usd.pb, usd.bakiye, usd.kovalar.yas0_30], ["USD", 50, 50]);
const vadeli = cariYaslandirma(yc, { defter: "Genel", tarih: "2026-09-30", varsayilanVade: 30 })[0];
bekle("varsayılan vade 30: S2 30 gün gecikmiş", vadeli.acikKalemler.map((k) => k.gun), [30, -20]);
// Borç yönü: alışlar açık kalem, ödeme en eskisini kapatır.
const tedarikci = { hareketler: [
  { id: "a1", tarih: "2026-06-01", yon: "Alacak", tutar: 400 }, { id: "a2", tarih: "2026-09-01", yon: "Alacak", tutar: 400 },
  { id: "o1", tarih: "2026-09-15", yon: "Borç", tutar: 500 },
] };
const b = cariYaslandirma(tedarikci, { tarih: "2026-09-30" })[0];
bekle("borç yaşlandırma", [b.yon, b.bakiye, b.acikKalemler.map((k) => [k.kalan, k.gun])], ["borc", -300, [[300, 29]]]);
// Rapor satırına dilimler giriyor.
const ySatir = finansRaporSatirlari({ cariler: [yc], muhasebe: { kurlar: { USD: 40 } }, stok: [], defter: "Genel", tarih: "2026-09-30" })
  .find((s) => s.paraBirimi === "TRY");
bekle("rapor satırında dilimler", [ySatir.tutar, ySatir.yas31_60, ySatir.yasVadesiGelmemis, ySatir.ortalamaGecikme], [600, 300, 300, 60]);

// ---- ÜRETİMDEKİ MAL — GERÇEKLEŞEN MALİYET (v1.465.0) ----
// Bot: Kesim'de 2 m deri (50 ₺/m), Montaj'da 1 taban (20 ₺); proses ücretleri Kesim 10, Saya 15,
// Montaj 25 → standart çift maliyeti 120 hammadde + 50 işçilik = 170 ₺. 10 çiftlik üretim:
// Kesim ve Saya bitti, Montaj'dan 4 çift çıkıp stoğa girdi. Personele 60 ₺ ödendi.
const uStok = [
  { id: "deri", ad: "Deri", kategori: "Hammadde", alisFiyati: 50, hareketler: [
    { tarih: "2026-09-01", renk: "Siyah", beden: "", miktar: 100 },
    { tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -20, kaynak: "Üretim", uretimId: "u1" }] },
  { id: "taban", ad: "Taban", kategori: "Hammadde", alisFiyati: 20, hareketler: [
    { tarih: "2026-09-01", renk: "", beden: "", miktar: 50 },
    { tarih: "2026-09-20", renk: "", beden: "", miktar: -4, kaynak: "Üretim", uretimId: "u1" }] },
  { id: "bot", ad: "Bot", kategori: "Mamul", prosesUcretleri: { Kesim: 10, Saya: 15, Montaj: 25 },
    recete: [
      { proses: "Kesim", hammaddeUrunId: "deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2 },
      { proses: "Montaj", hammaddeUrunId: "taban", renk: "", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 1 }],
    hareketler: [{ tarih: "2026-09-20", renk: "Siyah", beden: "40", miktar: 4, kaynak: "Üretim", uretimId: "u1" }] },
];
const uCariler = [{ id: "p", unvan: "Usta", tip: "Personel", hareketler: [
  { id: "i1", tarih: "2026-09-10", yon: "Alacak", tutar: 100, fisNo: "10001-Kesim-İşçilik", uretimId: "u1" },
  { id: "i2", tarih: "2026-09-15", yon: "Alacak", tutar: 150, fisNo: "10001-Saya-İşçilik", uretimId: "u1" },
  { id: "i3", tarih: "2026-09-20", yon: "Alacak", tutar: 100, fisNo: "10001-Montaj-İşçilik", uretimId: "u1" },
  { id: "o1", tarih: "2026-09-21", yon: "Borç", tutar: 60, fisNo: "ODM-1" }] }];
const uUretim = [{ id: "u1", siparisNo: "10001", urunId: "bot", renk: "Siyah", asama: "Montaj", bedenMiktarlari: [{ beden: "40", miktar: 10 }] }];
const [w] = finansUretimDegerleri({ uretim: uUretim, stok: uStok, cariler: uCariler, tarih: "2026-09-30" });
// Harcanan: deri 1000 + taban 80 + işçilik 350 = 1430; aktarılan 4 × 170 = 680 → 750.
// Kalan 6 çiftin standart payı: 6 × (100 deri + 10 + 15) = 750 — gerçekleşen ile tutuyor.
bekle("üretimdeki mal gerçekleşen değer", [w.hammadde, w.iscilik, w.aktarilan, w.deger, w.girenCift], [1080, 350, 680, 750, 4]);
bekle("işçilik ödenen / ödenmemiş (FIFO)", [w.iscilikOdenen, w.iscilikOdenmemis], [60, 290]);
// Yalnız Kesim bitmişken (15 Eylül öncesi): 1000 deri + 100 işçilik — 1.500 değil gerçekleşen.
const [w0] = finansUretimDegerleri({ uretim: uUretim, stok: uStok, cariler: uCariler, tarih: "2026-09-12" });
bekle("yalnız kesim bitmişken", [w0.hammadde, w0.iscilik, w0.deger, w0.iscilikOdenmemis], [1000, 100, 1100, 100]);
const uSatir = finansRaporSatirlari({ cariler: uCariler, muhasebe: {}, stok: uStok, uretim: uUretim, tarih: "2026-09-30" });
const mamulSatir = uSatir.find((x) => x.ad === "Bot");
bekle("mamul stok: hammadde + işçilik payı", [mamulSatir.tlKarsiligi, mamulSatir.hammaddeDegeri, mamulSatir.iscilikDegeri], [680, 480, 200]);
bekle("üretim satırı raporda", uSatir.filter((x) => x.kalem === "Üretimdeki mal (yarı mamul)").map((x) => [x.ad, x.tlKarsiligi, x.miktar, x.iscilikOdenmemis]), [["Üretim 10001 · Bot", 750, 6, 290]]);
bekle("yalnız hammadde yöntemi", finansRaporSatirlari({ cariler: uCariler, muhasebe: {}, stok: uStok, uretim: uUretim, tarih: "2026-09-30", mamulDegerleme: "hammadde" })
  .find((x) => x.ad === "Bot").tlKarsiligi, 480);
bekle("tamamlanan üretim listede yok", finansUretimDegerleri({ uretim: [{ ...uUretim[0], asama: "Tamamlandı" }], stok: uStok, cariler: uCariler }).length, 0);

process.exit(hata);
