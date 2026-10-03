// BİRİM TESTİ — ÜRÜN MALİYETİ TEK HESAP + MALİYET OK (v1.551.0)
//
// `urunMaliyetHesabi` ürün kartının Maliyet sekmesiyle AYNI sonucu vermeli (senaryo-urun-maliyeti'nin
// verisi: deri 2 $ × 48 = 96 ₺/desi × 2 = 192 + işçilik 50 + genel gider 60.000 / 3.000 = 20 → 262).
// Reçetesiz ürün alış fiyatından; eksikler listesi; onay eskimesi.
const { urunMaliyetHesabi, maliyetOnayDurumu, maliyetOnayKaydi, urunKaynakFiyati, fiyatListesiKaynaklari, fiyatDonustur } = require("./erp.cjs");
const { TOHUM } = require("./tohum.js");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const st = JSON.parse(TOHUM["stok:items"]);
const bot = st.find((p) => p.id === "u2");
const deri = st.find((p) => p.id === "u1");
deri.alisFiyati = 2; deri.alisParaBirimi = "$";
bot.recete = [{ hammaddeUrunId: "u1", hammaddeAd: "Deri", mamulRenk: "Siyah", renk: "Siyah", beden: "", miktar: 2, birim: "desi", proses: "Kesim" }];
bot.prosesUcretleri = { Kesim: 50 };
const tan = JSON.parse(TOHUM["tanimlar:data"]);
const ctx = { tumUrunler: st, tanimlarProsesler: tan.prosesler, tanimlarAraProsesler: [], kurlar: { USD: 48 }, cariler: [], kurGecmisi: [],
  aylikUretimHedefi: 3000, genelGiderler: [{ id: "g1", aylikTutar: 60000 }] };

const h = urunMaliyetHesabi(bot, ctx);
bekle("reçete: 192 + 50 + 20 = 262 (kartla aynı)", [h.tur, Math.round(h.hammadde * 100) / 100, h.iscilik, h.genel, h.tamTL], ["recete", 192, 50, 20, 262]);
bekle("eksik yok", h.eksikler, []);
bekle("kur yoksa eksik", urunMaliyetHesabi(bot, { ...ctx, kurlar: {} }).eksikler, ["USD kuru girilmemiş (Deri)"]);
bekle("işçiliksiz reçete eksik", urunMaliyetHesabi({ ...bot, prosesUcretleri: {} }, ctx).eksikler, ["işçilik ücreti girilmemiş"]);
const fiyatsizDeri = st.map((p) => (p.id === "u1" ? { ...p, alisFiyati: 0 } : p));
bekle("fiyatı olmayan hammadde eksik", urunMaliyetHesabi(bot, { ...ctx, tumUrunler: fiyatsizDeri }).eksikler, ["Deri · Siyah: fiyatı yok"]);
bekle("hedef yokken genel gider eksik", urunMaliyetHesabi(bot, { ...ctx, aylikUretimHedefi: 0 }).eksikler, ["genel gider var ama aylık üretim hedefi girilmemiş"]);

// Dışarıdan alınan (reçetesiz): alış fiyatı, kurla TL.
const alinan = { id: "x", ad: "Terlik", alisFiyati: 3, alisParaBirimi: "$", recete: [] };
bekle("reçetesiz: alış 3 $ × 48", [urunMaliyetHesabi(alinan, ctx).tur, urunMaliyetHesabi(alinan, ctx).tamTL], ["alis", 144]);
bekle("reçete de alış da yok", urunMaliyetHesabi({ id: "y", recete: [] }, ctx).tamTL, null);

// Onay
bekle("onay yok", maliyetOnayDurumu(bot, h).durum, "yok");
const onayli = { ...bot, maliyetOnay: maliyetOnayKaydi(h, "Ali", "2026-10-03T09:00:00.000Z") };
bekle("onay kaydı", onayli.maliyetOnay, { tarih: "2026-10-03T09:00:00.000Z", kim: "Ali", tamTL: 262, tur: "recete", eksikSayisi: 0 });
bekle("onaylı ve değişmemiş → ok", maliyetOnayDurumu(onayli, h).durum, "ok");
bekle("kur biraz oynadı (%0,5 altı) → hâlâ ok", maliyetOnayDurumu(onayli, urunMaliyetHesabi(onayli, { ...ctx, kurlar: { USD: 48.1 } })).durum, "ok");
bekle("işçilik arttı → eskidi", maliyetOnayDurumu(onayli, urunMaliyetHesabi({ ...onayli, prosesUcretleri: { Kesim: 60 } }, ctx)).durum, "eskidi");

// Fiyat listesi maliyet kaynağı + kâr
const K = fiyatListesiKaynaklari([]).find((k) => k.maliyet);
const kf = urunKaynakFiyati(bot, K, ctx);
bekle("fiyat listesi maliyet kaynağı = 262 TL", [kf.fiyat, kf.paraBirimi], [262, "TRY"]);
bekle("%25 kâr → 327,5", fiyatDonustur(kf.fiyat, { tur: "yuzde", yon: 1, deger: 25 }), 327.5);

console.log(hata ? "birim-maliyet-onay: HATA" : "birim-maliyet-onay: tamam");
process.exit(hata);
