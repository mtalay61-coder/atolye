// BİRİM TESTİ — SUNUCUNUN KARŞILANANI YEREL SİPARİŞE İŞLENİR (v1.743.0, F1 — VERI-TUTARLILIGI-F0.md § 8)
//
// Karşılananın tek yazarı sunucu: fis_kes / fis_iptal yanıtı etkilenen kalemlerin güncel değerini döndürür (`kalemler`).
// İstemci yerel hesabını (081 Math.min, 079 fisGeriAl) bununla değiştirir — eşzamanlı başka teslim ve miktarı aşan teslim
// (24 / 20) yenilemeden görünür. Eski sunucu (yanıtta `kalemler` yok) → liste AYNEN döner (geriye uyum).
const { fisKesKalemleriUygula } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const sip = [
  { id: "s1", durum: "Kısmi Teslim", kalemler: [{ id: "k1", miktar: 20, karsilanan: 20 }, { id: "k2", miktar: 5, karsilanan: 1 }] },
  { id: "s2", durum: "Bekliyor", kalemler: [{ id: "k3", miktar: 3, karsilanan: 0 }] },
];

const r1 = fisKesKalemleriUygula(sip, [{ id: "k1", karsilanan: 24 }]);
bekle("miktarı aşan teslim: sunucunun 24'ü yerelde (Math.min'in 20'si değil)", r1[0].kalemler[0].karsilanan, 24);
bekle("öteki kalem ve sipariş aynı nesne", [r1[0].kalemler[1] === sip[0].kalemler[1], r1[1] === sip[1]], [true, true]);
bekle("durum DEĞİŞMEZ (F1 kapsamı dışı — F4)", r1[0].durum, "Kısmi Teslim");
bekle("girdi değişmedi (saf)", sip[0].kalemler[0].karsilanan, 20);

bekle("eski sunucu (kalemler yok): aynı dizi", fisKesKalemleriUygula(sip, undefined) === sip, true);
bekle("boş liste: aynı dizi", fisKesKalemleriUygula(sip, []) === sip, true);
bekle("değer zaten aynı: aynı dizi", fisKesKalemleriUygula(sip, [{ id: "k2", karsilanan: 1 }]) === sip, true);
bekle("listede olmayan kalem kimliği yok sayılır", fisKesKalemleriUygula(sip, [{ id: "yok", karsilanan: 9 }]) === sip, true);

const r2 = fisKesKalemleriUygula(sip, [{ id: "k2", karsilanan: 0 }, { id: "k3", karsilanan: "2" }]);
bekle("iptal sonrası 0 ve metin sayı", [r2[0].kalemler[1].karsilanan, r2[1].kalemler[0].karsilanan], [0, 2]);
bekle("sayı kimlikli kalem (metin eşleşir)", fisKesKalemleriUygula([{ id: "s", kalemler: [{ id: 7, karsilanan: 1 }] }], [{ id: "7", karsilanan: 3 }])[0].kalemler[0].karsilanan, 3);
bekle("bozuk girdi atlanır", fisKesKalemleriUygula([null, { id: "x" }], [{ id: "k", karsilanan: 1 }]).length, 2);

console.log(hata ? "\n── SUNUCU KARŞILANANI BAŞARISIZ ──" : "\n── sunucu karşılananı testi temiz ──");
process.exit(hata);
