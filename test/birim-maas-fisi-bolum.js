// BİRİM — TEK FİŞ DEFTERİ MAAŞ FİŞİ BÖLÜME SAYILIR (v1.744.31, kullanıcı 20 Kasım: "fişlerde maaş işledi fakat kesimhane
// tarafında görünüp maliyet çıkarmıyor"). Ekran görüntüsü: Fişler'de MAŞ-261120001 (KESİCİ KEMAL 80.000) ve MAŞ-261120002
// (KESİCİ GAFFAR 60.000); Kâr-Zarar › Kesimhane "maaş 0 ₺", aylık verim "Henüz kayıt yok".
// 1.740'tan beri onaylı maaş tahakkuku sunucu fişiyle kesiliyor: numara MAŞ- (mesai MS-), işlem tipi YOK, anahtar maasAnahtari.
// 015 maasHareketiMi yalnız MAAS- / MESAI- ve işlem tipini tanıyordu → bölüm maaşı, çift başı gerçek maliyet, gider kartı 0.
const { maasHareketiMi, bolumKarZarar, bolumAylikDokum, bolumMaasHareketleri } = require("./erp.cjs");

let gecti = 0, kaldi = 0;
const ok = (ad, kosul) => { if (kosul) { gecti++; console.log("  ✓ " + ad); } else { kaldi++; console.log("  ✗ " + ad); } };

// Sunucu fişinden okunan cari hareketi biçimi (islemTipi yok)
const maas = (fisNo, tutar, ek = {}) => ({ id: fisNo, fisNo, tarih: "2026-11-01", tutar, yon: "Alacak", maasAnahtari: `MAAS-2026-11-${fisNo.slice(-4)}`, ...ek });
const bolum = { id: "b1", ad: "KESİMHANE", personel: [{ cariId: "kemal", maas: 80000 }, { cariId: "gaffar", maas: 60000 }] };
const tanimlar = { bolumler: [bolum], giderKartlari: [{ id: "gk1", ad: "KESİMHANE işçiliği", bolumId: "b1" }] };
const cariler = [
  // biri bolumId taşıyor (fişin ekinden), öbürü taşımıyor (yalnız personel üyeliğiyle)
  { id: "kemal", unvan: "KESİCİ KEMAL", hareketler: [maas("MAŞ-261120001", 80000, { bolumId: "b1", giderKartId: "gk1" }),
    { id: "o1", fisNo: "ÖD-261120001", tarih: "2026-11-05", tutar: 80000, yon: "Borç" }] },   // maaş ödemesi maaş sayılmaz
  { id: "gaffar", unvan: "KESİCİ GAFFAR", hareketler: [maas("MAŞ-261120002", 60000)] },
];
// O ay bölüm 5000 çift teslim etmiş (reçetedeki kesim ücreti 30 ₺ → tahakkuk 150.000)
const uretim = [{ id: "u1", siparisNo: "1001", bolumTahakkuklari: [{ id: "t1", bolumId: "b1", proses: "Kesim", tarih: "2026-11-10", adet: 5000, ucret: 30, tutar: 150000 }] }];

console.log("── maasHareketiMi");
ok("MAŞ- sunucu maaş fişi (işlem tipi yok) → maaş", maasHareketiMi(maas("MAŞ-261120001", 1)) === true);
ok("MS- sunucu mesai fişi → maaş", maasHareketiMi({ fisNo: "MS-261120001" }) === true);
ok("yalnız maasAnahtari taşıyan hareket → maaş", maasHareketiMi({ fisNo: "CH-1", maasAnahtari: "MAAS-2026-11-0007" }) === true);
ok("eski MAAS- / işlem tipi Maaş hâlâ maaş", maasHareketiMi({ fisNo: "MAAS-2026-11-0007" }) && maasHareketiMi({ islemTipi: "Maaş" }));
ok("ödeme (ÖD-) maaş değil", maasHareketiMi({ fisNo: "ÖD-261120001" }) === false);
ok("tahsilat / satış / işçilik maaş değil", !maasHareketiMi({ fisNo: "TH-1" }) && !maasHareketiMi({ fisNo: "SF-1" }) && !maasHareketiMi({ fisNo: "İŞ-1" }));

console.log("── Kâr-Zarar › bölüm");
const kz = bolumKarZarar(bolum, uretim, cariler, () => true);
ok("bölüm maaşı 140.000 (80.000 + 60.000)", kz.maas === 140000);
ok("tahakkuk 150.000, 5000 adet", kz.tahakkuk === 150000 && kz.adet === 5000);
ok("bölüm kârı 10.000", kz.kar === 10000);

console.log("── aylık verim / çift başı gerçek");
const ay = bolumAylikDokum(bolum, uretim, cariler).find((x) => x.ay === "2026-11");
ok("Kasım satırı var", !!ay);
ok("çift başı gerçek = 140.000 ÷ 5000 = 28 ₺", ay && ay.ciftMaliyeti === 28);
ok("verim = 150.000 ÷ 140.000 ≈ %107", ay && Math.round(ay.verim) === 107);

console.log("── bölüm gider kartı (Kâr-Zarar Giderler)");
const kart = bolumMaasHareketleri(tanimlar, cariler, "gk1");
ok("bolumId / giderKartId taşıyan maaş fişi kartta", kart.some((h) => h.fisNo === "MAŞ-261120001"));

console.log(`── maas-fisi-bolum: ${gecti} geçti, ${kaldi} kaldı ──`);
process.exit(kaldi ? 1 : 0);
