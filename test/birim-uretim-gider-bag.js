// BİRİM TESTİ — ÜRETİM FİŞLERİ → GİDER KARTI (v1.692, 246).
// Kullanıcı: "kesim için yapılan işçiliği kesim işçiliği giderine bağlayacağız… üretim hammadde çıkışı da bir
// gidere bağlanmalı, boşa giden hiçbir fiş olmamalı."
const { prosesGiderKartlariniTamamla, iscilikFisProsesi, kartUretimHareketleri, karsiliksizUretimFisleri, karZararHesapla } = require("./erp.cjs");
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
bekle("aynı adlı kart bağlanır, eksik açılır", [t1.prosesGiderKartlari.Kesim, t1.giderKartlari.map((k) => k.ad)], ["x", ["Kesim işçiliği", "Kalfa işçiliği", "Üretim hammadde gideri"]]);
bekle("ikinci çağrı değişiklik yapmaz", prosesGiderKartlariniTamamla(t1) === t1, true);
const t2 = prosesGiderKartlariniTamamla({ ...t1, prosesGiderKartlari: { ...t1.prosesGiderKartlari, Kalfa: "x" } });
bekle("elle kurulan bağa dokunulmaz", t2.prosesGiderKartlari.Kalfa, "x");
process.exit(hata);
