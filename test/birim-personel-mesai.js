// BİRİM TESTİ — PERSONEL / FASONCU / MESAİ (v1.700, 015 + 272).
const { mesaiHesapla, iscilikBolumu, maasHareketiMi, personelKaydiniYaz } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
// 22.500 maaş / 225 saat = 100 ₺/saat; 10 s hafta içi ×1,5 + 4 s Cmt ×1,5 + 2 s Pzr ×2 = 1500 + 600 + 400
bekle("mesai tutarı", mesaiHesapla(22500, 225, { haftaIci: 10, cumartesi: 4, pazar: 2 }), { saatUcreti: 100, tutar: 2500 });
bekle("kişiye özel aylık saat", mesaiHesapla(18000, 180, { haftaIci: 1 }).saatUcreti, 100);
const tanimlar = { bolumler: [{ id: "b1", ad: "Kesimhane", prosesler: ["Kesim"], personel: [{ cariId: "ic", maas: 20000 }] }] };
const cariler = [{ id: "ic", tip: "Personel" }, { id: "fs", tip: "Personel", altTip: "Fasoncu" }, { id: "ds", tip: "Personel" }];
bekle("Fasoncu bölüme bağlı proseste bile cariye", iscilikBolumu(tanimlar, cariler, "Kesim", "fs"), null);
bekle("bölüm personeli bölüme bağlı olmayan proseste de bölüme", (iscilikBolumu(tanimlar, cariler, "Kalfa", "ic") || {}).id, "b1");
bekle("ikisi de değil → prosesin bölümü", (iscilikBolumu(tanimlar, cariler, "Kesim", "ds") || {}).id, "b1");
bekle("ikisi de değil, bölümsüz proses → cariye", iscilikBolumu(tanimlar, cariler, "Kalfa", "ds"), null);
bekle("mesai fişi maaş sayılır", [maasHareketiMi({ fisNo: "MESAI-2026-10-0001" }), maasHareketiMi({ fisNo: "SF-1" })], [true, false]);
const t2 = personelKaydiniYaz({ bolumler: [...tanimlar.bolumler, { id: "b2", ad: "Saya", personel: [] }] }, "ic", "b2", { iseBaslangic: "2026-01-05" });
bekle("bölüm değişince kayıt taşınır, bilgiler korunur", t2.bolumler.map((b) => (b.personel || []).map((p) => `${p.cariId}:${p.maas}:${p.iseBaslangic || ""}`)), [[], ["ic:20000:2026-01-05"]]);
process.exit(hata);
