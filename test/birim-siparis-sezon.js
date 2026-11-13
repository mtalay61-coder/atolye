// BİRİM TESTİ — SİPARİŞ SEZONLARI (v1.744.19, 131 `siparisSezonSecenekleri`).
// Kullanıcı: sezon tanımlardan seçilsin; pasif sezon yeni siparişte çıkmasın.
const { siparisSezonSecenekleri, siparisSezonlari } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const L = [{ id: "a", ad: "2027 Yaz", pasif: true }, { id: "b", ad: "2028 Yaz", pasif: false }, { id: "c", ad: "2028 Kış" }, { id: "d", ad: "  " }];
const et = (l) => l.map((o) => o.etiket);
bekle("boş adlı tanım atlanır", siparisSezonlari(L).map((s) => s.ad), ["2027 Yaz", "2028 Yaz", "2028 Kış"]);
bekle("yeni sipariş: yalnız aktif sezonlar (2027 Yaz pasif → yok)", et(siparisSezonSecenekleri(L, "")), ["2028 Yaz", "2028 Kış"]);
bekle("aktif sezonlu sipariş: değer listede, ek seçenek yok", et(siparisSezonSecenekleri(L, "2028 Yaz")), ["2028 Yaz", "2028 Kış"]);
bekle("pasif sezonlu eski sipariş: değeri korunur, (pasif) etiketiyle", siparisSezonSecenekleri(L, "2027 Yaz")[0], { deger: "2027 Yaz", etiket: "2027 Yaz (pasif)" });
bekle("tanımda olmayan eski serbest sezon: korunur, (listede yok)", siparisSezonSecenekleri(L, "Yaz 2026")[0], { deger: "Yaz 2026", etiket: "Yaz 2026 (listede yok)" });
bekle("tanım yoksa seçenek yok (form serbest yazıya döner)", siparisSezonSecenekleri(undefined, ""), []);
if (hata) { console.log("BİRİM TESTİ HATA: sipariş sezonu"); process.exit(1); }
console.log("── sipariş sezonu testi temiz ──");
