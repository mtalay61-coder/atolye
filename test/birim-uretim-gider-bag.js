// BİRİM TESTİ — ÜRETİM FİŞLERİ → GİDER KARTI (v1.692, 246).
// Kullanıcı: "kesim için yapılan işçiliği kesim işçiliği giderine bağlayacağız… üretim hammadde çıkışı da bir
// gidere bağlanmalı, boşa giden hiçbir fiş olmamalı."
const { satisAlisKartHareketleri, stokKartHareketleri, prosesGiderKartlariniTamamla, iscilikFisProsesi, kartUretimHareketleri, karsiliksizUretimFisleri, karZararHesapla } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };

const prosesler = [{ ad: "Kesim" }, { ad: "Üste ve Temizleme" }, { ad: "Temizleme" }];
bekle("proses fiş ekinden", iscilikFisProsesi("10028-Kesim-İşçilik", prosesler), "Kesim");
bekle("uzun ad önce", iscilikFisProsesi("AS-1-Üste ve Temizleme-İşçilik", prosesler), "Üste ve Temizleme");
bekle("işçilik değil", iscilikFisProsesi("10028-Kesim", prosesler), "");

const bugun = new Date().toISOString().slice(0, 10);
const cariler = [{ id: "p1", unvan: "Kesimci", hareketler: [
  { id: "i1", fisNo: "10028-Kesim-İşçilik", tutar: 500, yon: "Alacak", tarih: bugun, defter: "Genel" },
  { id: "i2", fisNo: "10028-Temizleme-İşçilik", tutar: 100, yon: "Alacak", tarih: bugun, defter: "Genel" },
] }];
const stok = [{ id: "h1", ad: "Deri", kategori: "Hammadde", alisFiyati: 10, variants: [{ renk: "Siyah", beden: "", miktar: 0 }], hareketler: [
  { id: "s1", kaynak: "Üretim", fisNo: "10028-Kesim", siparisNo: "10028", miktar: -3, renk: "Siyah", beden: "", tarih: bugun },
] }];
const kartlar = [{ id: "k1", ad: "Kesim işçiliği", grup: "uretim", tur: "gider" }, { id: "k2", ad: "Hammadde gideri", grup: "uretim", tur: "gider" }];
const bagsiz = { prosesler, giderKartlari: kartlar };
const k0 = karsiliksizUretimFisleri(bagsiz, cariler, stok, {});
bekle("bağsızken karşılıksız sayılır", [k0.iscilikSayisi, k0.hammaddeSayisi], [2, 1]);

const bagli = { ...bagsiz, prosesGiderKartlari: { Kesim: "k1" }, hammaddeCikisGiderKartId: "k2" };
const k1 = karsiliksizUretimFisleri(bagli, cariler, stok, {});
bekle("bağlanınca yalnız bağsız proses kalır", [k1.iscilikSayisi, k1.prosesler, k1.hammaddeSayisi], [1, ["Temizleme"], 0]);
bekle("kesim kartı ekstresi", kartUretimHareketleri(bagli, cariler, stok, {}, "k1").map((h) => [h.fisNo, h.tutar]), [["10028-Kesim-İşçilik", 500]]);
bekle("hammadde kartı ekstresi (3 × 10)", kartUretimHareketleri(bagli, cariler, stok, {}, "k2").map((h) => [h.fisNo, h.tutar]), [["10028-Kesim", 30]]);

const kz0 = karZararHesapla({ stok, cariler, muhasebe: {}, giderKartlari: kartlar, donem: "tumu", defter: "Tümü", uretim: [], tanimlar: bagsiz });
const kz1 = karZararHesapla({ stok, cariler, muhasebe: {}, giderKartlari: kartlar, donem: "tumu", defter: "Tümü", uretim: [], tanimlar: bagli });
bekle("Kâr/Zarar: bağlı işçilik karta geçer", [kz1.uretimIscilik, kz1.giderToplam, (kz1.gruplar.uretim || {}).kartlar], [100, 500, { "Kesim işçiliği": 500 }]);
bekle("Kâr/Zarar: net kâr değişmez (çift sayım yok)", kz1.netKar, kz0.netKar);

// OTOMATİK KART (v1.693)
const t0 = { prosesler: [{ ad: "Kesim" }, { ad: "Kalfa" }], giderKartlari: [{ id: "x", ad: "Kesim işçiliği", grup: "uretim", tur: "gider" }], prosesGiderKartlari: {} };
const t1 = prosesGiderKartlariniTamamla(t0);
bekle("aynı adlı kart bağlanır, eksik açılır", [t1.prosesGiderKartlari.Kesim, t1.giderKartlari.map((k) => k.ad)], ["x", ["Kesim işçiliği", "Kalfa işçiliği", "Üretim hammadde gideri", "Stok girişi (sayım fazlası)", "Stok çıkışı (fire / sayım eksiği)", "Satış gelirleri", "Alışlar (mal ve hammadde)"]]);
bekle("ikinci çağrı değişiklik yapmaz", prosesGiderKartlariniTamamla(t1) === t1, true);
const t2 = prosesGiderKartlariniTamamla({ ...t1, prosesGiderKartlari: { ...t1.prosesGiderKartlari, Kalfa: "x" } });
bekle("elle kurulan bağa dokunulmaz", t2.prosesGiderKartlari.Kalfa, "x");
bekle("stok giriş/çıkış kartları açılır", [!!t1.stokGirisGelirKartId, !!t1.stokCikisGiderKartId, t1.giderKartlari.find((k) => k.id === t1.stokGirisGelirKartId).tur], [true, true, "gelir"]);

// BAĞIMSIZ STOK (v1.694): iki farklı ürün tek fişte → tek satır, tek kart
const st2 = [
  { id: "a", ad: "Deri", alisFiyati: 10, variants: [], hareketler: [{ kaynak: "Manuel", fisNo: "MNL-1", miktar: 2, renk: "", beden: "", tarih: bugun }, { kaynak: "Manuel", fisNo: "MNL-2", miktar: -1, renk: "", beden: "", tarih: bugun }] },
  { id: "b", ad: "Taban", alisFiyati: 5, variants: [], hareketler: [{ kaynak: "Manuel", fisNo: "MNL-1", miktar: 4, renk: "", beden: "", tarih: bugun }, { kaynak: "Manuel", fisNo: "ACILIS-x", miktar: 9, renk: "", beden: "", tarih: bugun }] },
];
bekle("stok girişi gelir kartında (2×10 + 4×5)", stokKartHareketleri(t1, st2, {}, t1.stokGirisGelirKartId).map((h) => [h.fisNo, h.tutar, h.yon]), [["MNL-1", 40, "Giriş"]]);
bekle("stok çıkışı gider kartında, açılış sayılmaz", stokKartHareketleri(t1, st2, {}, t1.stokCikisGiderKartId).map((h) => [h.fisNo, h.tutar, h.yon]), [["MNL-2", 10, "Çıkış"]]);

// SATIŞ / ALIŞ (v1.695): iki satırlı satış fişi tek satır, USD kurla
const cs = [{ id: "m", unvan: "Müşteri", hareketler: [{ fisNo: "SF-1", tutar: 100, paraBirimi: "TRY", tarih: bugun }, { fisNo: "SF-1", tutar: 10, paraBirimi: "USD", tarih: bugun }, { fisNo: "AF-1", tutar: 50, tarih: bugun }, { fisNo: "THS-1", tutar: 5, tarih: bugun }] }];
bekle("satış gelir kartında", satisAlisKartHareketleri(t1, cs, { USD: 40 }, t1.satisGelirKartId).map((h) => [h.fisNo, h.tutar, h.yon]), [["SF-1", 500, "Giriş"]]);
bekle("alış gider kartında", satisAlisKartHareketleri(t1, cs, {}, t1.alisGiderKartId).map((h) => [h.fisNo, h.tutar, h.yon]), [["AF-1", 50, "Çıkış"]]);

// SATIŞLAR GRUBU (v1.696)
bekle("satış kartı Satışlar grubunda", [t1.giderKartlari.find((k) => k.id === t1.satisGelirKartId).grup, (t1.giderGruplari || []).some((g) => g.key === "satislar" && g.tur === "gelir")], ["satislar", true]);
const t3 = prosesGiderKartlariniTamamla({ ...t1, giderKartlari: t1.giderKartlari.map((k) => (k.id === t1.satisGelirKartId ? { ...k, grup: "gelir" } : k)) });
bekle("elle taşınan satış kartı geri çekilmez", t3.giderKartlari.find((k) => k.id === t1.satisGelirKartId).grup, "gelir");

// MAAŞ (v1.697): bölüm kartı olan maaş karşılıklı, bölümsüz maaş karşılıksız
const tm = { ...t1, bolumler: [{ id: "b1", ad: "Kesimhane", prosesler: [], personel: [] }], giderKartlari: [...t1.giderKartlari, { id: "bk", ad: "Kesimhane işçiliği", bolumId: "b1", grup: "uretim", tur: "gider" }] };
const cm = [{ id: "p", unvan: "P", hareketler: [{ fisNo: "MAAS-2026-10-0001", islemTipi: "Maaş", bolumId: "b1", tutar: 10 }, { fisNo: "MAAS-2026-10-0002", islemTipi: "Maaş", tutar: 10 }] }];
bekle("bölümsüz maaş karşılıksız sayılır", karsiliksizUretimFisleri(tm, cm, [], {}).maasSayisi, 1);
process.exit(hata);
