// BİRİM TESTİ — ÜRETİM RAPORU (v1.706, 276).
const { uretimRaporDonemi, uretimRaporuHesapla, prosesGunlukHedef } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const h = uretimRaporDonemi("hafta", "2026-10-21");   // çarşamba
bekle("hafta Pzt–Paz", [h.bas.getDate(), h.son.getDate(), h.gunler.length], [19, 25, 7]);
bekle("ay gün sayısı", uretimRaporDonemi("ay", "2026-02-10").gunler.length, 28);
const tanimlar = { prosesler: [{ ad: "Kesim", sira: 1 }, { ad: "Saya", sira: 2 }],
  kapasite: { makineler: [{ id: "m", prosesler: ["Saya"], saatlikAdet: 10, gunlukSaat: 9, adet: 2 }], prosesHedefleri: { Kesim: "300" } } };
bekle("elle hedef", prosesGunlukHedef(tanimlar, "Kesim"), { hedef: 300, kaynak: "elle" });
bekle("kapasiteden hedef", prosesGunlukHedef(tanimlar, "Saya"), { hedef: 180, kaynak: "kapasite" });
const at = (pid, tarih, saglam, hurda) => ({ personelId: pid, miktar: saglam + (hurda || 0), tamamlandiMi: true, tamamlanmaTarihi: tarih,
  sonuc: { saglam: { "37": saglam }, tamir: [], hurda: hurda ? [{ miktar: hurda }] : [] } });
const uretim = [
  { id: "u1", siparisNo: "1", model: "A", renk: "S", adet: 100, prosesIlerleme: [
    { proses: "Kesim", tamamlandiMi: true, atamalar: [at("p1", "2026-10-19T09:00:00", 60), at("p1", "2026-10-20T09:00:00", 38, 2)] },
    { proses: "Saya", tamamlandiMi: false, atamalar: [{ personelId: "p2", miktar: 50, tamamlandiMi: false }] }] },
  { id: "u2", siparisNo: "2", model: "B", renk: "T", adet: 40, prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: false, atamalar: [] }] },
  { id: "u3", siparisNo: "3", adet: 10, asama: "Tamamlandı", prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: true, atamalar: [at("p1", "2026-10-21T09:00:00", 10)] }] },
];
const cariler = [{ id: "p1", unvan: "Ali" }, { id: "p2", unvan: "Veli" }];
const r = uretimRaporuHesapla(uretim, cariler, tanimlar, h);
const kesim = r.prosesler.find((x) => x.proses === "Kesim");
bekle("Kesim haftalık: gerçekleşen/hurda/bekleyen/hedef(6 iş günü)/oran", [kesim.gerceklesen, kesim.hurda, kesim.bekleyen, kesim.hedef, kesim.oran], [108, 2, 40, 1800, 6]);
bekle("Saya personelde", r.prosesler.find((x) => x.proses === "Saya").uzerinde, 50);
bekle("personel gün gün", [r.personel[0].ad, r.personel[0].toplam, r.personel[0].gun["2026-10-20"]], ["Ali", 108, 38]);
bekle("açık üretimler (biten hariç) ve Kesim ✓", r.acik.map((s) => `${s.siparisNo}:${(s.prosesler.Kesim || {}).tamam}`), ["1:true", "2:false"]);
bekle("biten üretim = son proseste teslim (u1 Saya bitmedi, u3 Kesim son adım)", r.ozet.biten, 10);
const gun = uretimRaporuHesapla(uretim, cariler, tanimlar, uretimRaporDonemi("gun", "2026-10-20"));
bekle("günlük yalnız o gün", gun.prosesler.find((x) => x.proses === "Kesim").gerceklesen, 38);
console.log(hata ? "── üretim raporu testi HATALI ──" : "── üretim raporu testi temiz ──");
process.exit(hata);
