// BİRİM TESTİ — CARİ RAPORU (v1.619.0)
// Kullanıcı: "Cari siparişleri, teslim edilen, kalan, alacak verecek, sağlık durumu … rapor yapalım."
// Ölçülen: bakiye alacak/verecek ayrımı; sipariş adet/teslim/kalan ve kalan tutar; siparişe bağlı tahsilat ve kalan;
// iptal sipariş sayılmaz; geciken teslim; sağlık: son tahsilat 10 gün → iyi, 45 gün → takip, 90 gün → riskli, hiç tahsilat
// yok + 70 günlük borç → riskli, alacak yok → iyi; tedarikçi borcumuz 90 gün ödenmemiş → takip. HTML çıktısı başlığı.
const { cariRaporu, cariRaporuHTML } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const bugun = "2026-10-09";
const sip = [
  { id: "s1", cariId: "c1", siparisNo: "SAT-1", tip: "Satış", durum: "Kısmi Teslim", tarih: "2026-09-01", teslimTarihi: "2026-10-01",
    kalemler: [{ miktar: 10, karsilanan: 4, birimFiyat: 25, paraBirimi: "USD" }, { miktar: 6, karsilanan: 6, birimFiyat: 25, paraBirimi: "USD" }] },
  { id: "s2", cariId: "c1", siparisNo: "SAT-2", tip: "Satış", durum: "İptal", tarih: "2026-09-05", kalemler: [{ miktar: 99, karsilanan: 0, birimFiyat: 1, paraBirimi: "USD" }] },
  { id: "s3", cariId: "c9", siparisNo: "SAT-3", tip: "Satış", durum: "Bekliyor", tarih: "2026-09-05", kalemler: [{ miktar: 5, birimFiyat: 1, paraBirimi: "USD" }] },
];
const cari = (tahsilatTarihi, ek = {}) => ({ id: "c1", unvan: "İgii Tirana", tip: "Müşteri", ulke: "Arnavutluk", ...ek, hareketler: [
  { id: "b1", tarih: "2026-07-01", yon: "Borç", tutar: 400, paraBirimi: "USD", fisNo: "SF-1" },
  ...(tahsilatTarihi ? [{ id: "t1", tarih: tahsilatTarihi, yon: "Alacak", tutar: 150, paraBirimi: "USD", fisNo: "THS-1", siparisId: "s1" }] : []),
] });
const r = cariRaporu(cari("2026-09-29"), sip, { bugun });
bekle("bakiye: alacak 250 $", [r.bakiye, r.alacak, r.verecek], [{ USD: 250 }, { USD: 250 }, {}]);
bekle("sipariş: iptal sayılmaz, başka cari sayılmaz", r.siparisler.map((x) => x.siparisNo), ["SAT-1"]);
const s1 = r.siparisler[0];
bekle("adet/teslim/kalan + tutar/kalan tutar", [s1.adet, s1.teslim, s1.kalanAdet, s1.tutar, s1.kalanTutar], [16, 10, 6, { USD: 400 }, { USD: 150 }]);
bekle("siparişe bağlı tahsilat ve kalan", [s1.odenen, s1.odemeKalan], [{ USD: 150 }, 250]);
bekle("gecikme ve toplamlar", [s1.gecikti, r.toplam.geciken, r.toplam.acikSiparis, r.toplam.kalanAdet], [true, 1, 1, 6]);
bekle("son tahsilat 10 gün → iyi", [r.sonParaGun, r.saglik.seviye], [10, "iyi"]);
bekle("45 gün → takip", cariRaporu(cari("2026-08-25"), sip, { bugun }).saglik.seviye, "takip");
bekle("90 gün → riskli", cariRaporu(cari("2026-07-11"), sip, { bugun }).saglik.seviye, "riskli");
const hic = cariRaporu(cari(null), sip, { bugun });
bekle("hiç tahsilat yok, borç 100 gün → riskli + neden", [hic.saglik.seviye, /hiç tahsilat yok/.test(hic.saglik.nedenler[0])], ["riskli", true]);
const sifir = cariRaporu({ id: "c1", unvan: "X", tip: "Müşteri", hareketler: [] }, [], { bugun });
bekle("alacak yok → iyi", [sifir.saglik.seviye, sifir.saglik.nedenler], ["iyi", ["Alacağımız yok"]]);
const ted = cariRaporu({ id: "c5", unvan: "Ted", tip: "Tedarikçi", hareketler: [{ tarih: "2026-07-01", yon: "Alacak", tutar: 500, paraBirimi: "TRY", fisNo: "AF-1" }] }, [], { bugun });
bekle("tedarikçi borcumuz, ödeme yok → takip", [ted.verecek, ted.saglik.seviye], [{ TRY: 500 }, "takip"]);
const html = cariRaporuHTML(r, { unvan: "New Diamond" });
bekle("HTML: başlık, bakiye, durum, sipariş", [/CARİ RAPORU/.test(html), /Alacağımız/.test(html), /Durum: İyi/.test(html), /SAT-1/.test(html)], [true, true, true, true]);
process.exit(hata);
