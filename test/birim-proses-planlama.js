// BİRİM TESTİ — PROSES PLANLAMA (v1.704, 274).
const { prosesKuyrugu, prosesPlanTakvimi, prosesPlaniniDegistir, isGunuEkle } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const adim = (proses, ek) => ({ proses, tamamlandiMi: false, atamalar: [], ...ek });
let uretim = [
  { id: "u1", urunId: "p", adet: 160, bedenMiktarlari: [{ beden: "37", miktar: 160 }], prosesIlerleme: [adim("Kesim"), adim("Saya")] },
  { id: "u2", urunId: "p", adet: 80, bedenMiktarlari: [{ beden: "37", miktar: 80 }], prosesIlerleme: [adim("Kesim", { tamamlandiMi: true }), adim("Saya")] },
  { id: "u3", urunId: "p", adet: 10, bedenMiktarlari: [], prosesIlerleme: [adim("Kesim", { atamalar: [{ personelId: "x" }] })] },
  { id: "u4", urunId: "p", adet: 10, asama: "Tamamlandı", bedenMiktarlari: [], prosesIlerleme: [adim("Kesim")] },
];
bekle("Kesim kuyruğu: verilen ve biten üretim hariç", prosesKuyrugu(uretim, "Kesim").map((x) => x.o.id), ["u1"]);
bekle("Saya: hazır olan/olmayan", prosesKuyrugu(uretim, "Saya").map((x) => `${x.o.id}:${x.hazir}`), ["u1:false", "u2:true"]);
uretim = prosesPlaniniDegistir(uretim, "Saya", "ekle", ["u2", "u1"]);
bekle("ekle sırası dizi sırasıyla", prosesKuyrugu(uretim, "Saya").map((x) => `${x.o.id}:${x.plan.sira}`), ["u1:1", "u2:2"]);
uretim = prosesPlaniniDegistir(uretim, "Saya", "kaydir", ["u2"], -1);
const stok = [{ id: "p", kapasite: { Saya: { makineId: "m" } } }];
const tanimlar = { kapasite: { makineler: [{ id: "m", adet: 1, gunlukSaat: 8, saatlikAdet: 10 }] } };
// u2: 80 çift / 10 = 8 saat = 1 gün; u1: 160 → 2 gün; birikim 1, 3
const pzt = new Date(2026, 9, 19);
const t = prosesPlanTakvimi(uretim, stok, tanimlar, "Saya", pzt);
bekle("kaydırınca sıra + birikimli gün", t.map((x) => `${x.o.id}:${x.yuk.gun}:${x.birikimGun}`), ["u2:1:1", "u1:2:3"]);
bekle("bitiş: 1 gün bugün, 3 gün çarşamba", t.map((x) => x.bitis.getDate()), [19, 21]);
bekle("cumartesiden 2 gün → pazartesi", isGunuEkle(new Date(2026, 9, 24), 2).getDate(), 26);
uretim = prosesPlaniniDegistir(uretim, "Saya", "cikar", ["u1"]);
bekle("çıkar", prosesKuyrugu(uretim, "Saya").filter((x) => x.plan).map((x) => x.o.id), ["u2"]);
console.log(hata ? "── proses planlama testi HATALI ──" : "── proses planlama testi temiz ──");
process.exit(hata);
