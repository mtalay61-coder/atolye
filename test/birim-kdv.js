// BİRİM TESTİ — KDV (27 Eylül, v1.496.0 — e-fatura yol haritası, Aşama 1)
//
// Karar: KDV açıkken yeni fişlerde cariye KDV DAHİL tutar; matrah ve birim fiyat KDV hariç kalır.
// İddialar:
//   • Oran önceliği: satırda seçilen → ürün kartı → Tanımlar varsayılanı (mamul / diğer), yoksa %20.
//   • KDV satır bazında kuruşa yuvarlanır; dip döküm oran bazında, toplam = matrah + KDV.
//   • `fisYaz`: oran taşıyan kalemde tutar KDV dahil, matrah/oran/KDV ayrı; birim fiyat KDV hariç
//     (sipariş yolunda birim fiyat tutar/miktar'dan bulunuyor — KDV'den ÖNCE); döviz satırda matrah
//     kayıt birimine çevrilmiş tutardır, KDV onun üstüne. Oran taşımayan kalem eskisi gibi.
const { fisYaz, kdvOzeti, kdvHesapla, kalemKdvOrani, urunKdvOrani, varsayilanKdvOrani, kdvAktifMi, kuruslaYuvarla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const fb = { kdvAktif: true, kdvMamul: 10, kdvDiger: 20 };
const mamul = { id: "m", kategori: "Mamul" };
const deri = { id: "d", kategori: "Hammadde" };
const ozelOranli = { id: "o", kategori: "Hammadde", kdvOrani: 1 };
const stok = [mamul, deri, ozelOranli];

console.log("Oran önceliği");
bekle("açma anahtarı", [kdvAktifMi(fb), kdvAktifMi({}), kdvAktifMi(null)], [true, false, false]);
bekle("varsayılan mamul / diğer", [varsayilanKdvOrani(mamul, fb), varsayilanKdvOrani(deri, fb)], [10, 20]);
bekle("Tanımlarda yoksa %20", [varsayilanKdvOrani(mamul, {}), varsayilanKdvOrani(deri, null)], [20, 20]);
bekle("ürün kartındaki oran varsayılanı ezer", urunKdvOrani(ozelOranli, fb), 1);
bekle("satırda seçilen her şeyi ezer (0 dahil)", kalemKdvOrani({ urunId: "m", kdvOrani: 0 }, stok, fb), 0);
bekle("satırda yoksa ürünün", [kalemKdvOrani({ urunId: "m" }, stok, fb), kalemKdvOrani({ urunId: "o" }, stok, fb)], [10, 1]);

console.log("Hesap ve döküm");
bekle("kuruş yuvarlama", [kdvHesapla(33.33, 20), kdvHesapla(0.125, 20), kuruslaYuvarla(1.005)], [6.67, 0.03, 1.01]);
bekle("oran bazında döküm", kdvOzeti([{ matrah: 200, kdvOrani: 10 }, { matrah: 150, kdvOrani: 20 }, { matrah: 50, kdvOrani: 20 }]),
  { matrah: 400, kdv: 60, genelToplam: 460, oranlar: [{ oran: 10, matrah: 200, kdv: 20 }, { oran: 20, matrah: 200, kdv: 40 }] });

console.log("fisYaz");
const fis = (kalemler, ek = {}) => ({
  fisNo: "SF-1", tip: "Satış", cariId: "c", kaynak: "Satış", stokTarihi: "2026-09-27T09:00:00.000Z", cariTarihi: "2026-09-27",
  kayitParaBirimi: "TRY", kurlar: { USD: 40 }, kurZorunlu: true, tutarYuvarla: true, birimFiyatBolerek: false,
  yon: "Borç", defter: "Genel", odemeSekli: "Nakit", vade: "", siparis: null, kalemler, ...ek,
});
const stokFis = [{ id: "m", ad: "Bot", variants: [{ renk: "Siyah", beden: "40", miktar: 10 }], hareketler: [] },
  { id: "d", ad: "Deri", variants: [{ renk: "Siyah", beden: "", miktar: 10 }], hareketler: [] }];
const cariler = [{ id: "c", unvan: "Müşteri", hareketler: [] }];
const k1 = { urunId: "m", urunAd: "Bot", renk: "Siyah", beden: "40", birim: "çift", miktar: 2, birimFiyat: 100, paraBirimi: "TRY" };
const k2 = { urunId: "d", urunAd: "Deri", renk: "Siyah", beden: "", birim: "metre", miktar: 3, birimFiyat: 1.5, paraBirimi: "USD" };
const ozet = (r) => r.cariHareketleri.map((h) => [h.urunAd, h.birimFiyat, h.matrah ?? null, h.kdvOrani ?? null, h.kdvTutari ?? null, h.tutar, h.paraBirimi]);

const kdvli = fisYaz(JSON.parse(JSON.stringify(stokFis)), JSON.parse(JSON.stringify(cariler)), fis([{ ...k1, kdvOrani: 10 }, { ...k2, kdvOrani: 20 }]));
bekle("KDV'li: tutar dahil, matrah/oran/KDV ayrı, birim fiyat hariç; USD satır TL matrah üstüne",
  ozet(kdvli), [["Bot", 100, 200, 10, 20, 220, "TRY"], ["Deri", 60, 180, 20, 36, 216, "TRY"]]);
const kdvsiz = fisYaz(JSON.parse(JSON.stringify(stokFis)), JSON.parse(JSON.stringify(cariler)), fis([k1, k2]));
bekle("oran taşımayan kalem eskisi gibi", ozet(kdvsiz), [["Bot", 100, null, null, null, 200, "TRY"], ["Deri", 60, null, null, null, 180, "TRY"]]);
const siparisYolu = fisYaz(JSON.parse(JSON.stringify(stokFis)), JSON.parse(JSON.stringify(cariler)),
  fis([{ ...k1, kdvOrani: 20 }], { birimFiyatBolerek: true, tutarYuvarla: false, kurZorunlu: false }));
bekle("sipariş yolu: birim fiyat KDV'den önce (tutar/miktar)", ozet(siparisYolu), [["Bot", 100, 200, 20, 40, 240, "TRY"]]);

process.exit(hata);
