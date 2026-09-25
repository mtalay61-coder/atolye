// BİRİM TESTİ — FİNANS RAPORU SATIRLARI (25 Eylül, v1.463.0)
//
// Varlık raporunun iddiaları: defter ayrımı ("Muhasebe" ikisine de), tarih itibarıyla bakiye,
// çek durumunun geçmişten oynatılması, alınan/verilen çek tarafları, stok değeri (hammadde alış
// fiyatı, mamul reçete maliyeti), kuru olmayan birimin toplam dışı kalması, net varlık.
const { finansRaporSatirlari, finansOzet } = require("./erp.cjs");

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

process.exit(hata);
