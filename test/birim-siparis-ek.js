// BİRİM TESTİ — SİPARİŞTE ŞEMA DIŞI ALANLAR BULUTA GİDİP GERİ GELİYOR (v1.545.0)
//
// Sipariş kaleminin KDV oranı ve notları, siparişin iptal zamanı/eden buluta hiç gitmiyordu (şema
// sütunları açıkça sayıyor, sayılmayan düşüyordu). Artık `ek` jsonb'ye yazılıp okumada köke açılıyor.
// Ölçülen: yaz (TABLO_SEMA) → bulut satırı → oku (kayitaCevir + ekiKokeAc) = aynı alanlar.
const { TABLO_SEMA, ekiKokeAc, kayitaCevir } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const sema = TABLO_SEMA.siparisler;
const s = { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c", tarih: "2026-10-01", durum: "İptal",
  iptalZamani: "2026-10-01T10:00:00Z", iptalEden: "Ali", rezervasyonSiparisIdleri: ["x"],
  kalemler: [{ id: "k1", urunId: "u", miktar: 2, birimFiyat: 5, paraBirimi: "TRY", kdvOrani: 10, notlar: ["Kesim: dikkat"] },
    { id: "k2", urunId: "u", miktar: 1, birimFiyat: 5, paraBirimi: "TRY" }] };

const satir = sema.satir(s);
const kalemSatirlari = sema.cocuklar[0].cikar(s);
bekle("sipariş: şema dışı alanlar ek'te", satir.ek, { iptalZamani: "2026-10-01T10:00:00Z", iptalEden: "Ali", rezervasyonSiparisIdleri: ["x"] });
bekle("kalem: KDV ve notlar ek'te", kalemSatirlari[0].ek, { kdvOrani: 10, notlar: ["Kesim: dikkat"] });
bekle("şema dışı alanı olmayan kalemde ek hiç yok (SQL'siz kayıt etkilenmesin)", "ek" in kalemSatirlari[1], false);

const geriS = ekiKokeAc(kayitaCevir(satir));
const geriK = ekiKokeAc(kayitaCevir(kalemSatirlari[0]));
bekle("okuma: sipariş alanları kökte", [geriS.iptalZamani, geriS.iptalEden, geriS.siparisNo, "ek" in geriS], ["2026-10-01T10:00:00Z", "Ali", "SAT-1", false]);
bekle("okuma: kalemin KDV oranı ve notları kökte", [geriK.kdvOrani, geriK.notlar, geriK.birimFiyat], [10, ["Kesim: dikkat"], 5]);
bekle("sütun değeri ek'tekini ezer", ekiKokeAc({ durum: "Bekliyor", ek: { durum: "eski", x: 1 } }), { durum: "Bekliyor", x: 1 });
bekle("ek yoksa / null ise kayıt aynen", [ekiKokeAc({ a: 1 }), ekiKokeAc({ a: 1, ek: null })], [{ a: 1 }, { a: 1 }]);

console.log(hata ? "\n── sipariş ek testinde HATA ──" : "\n── sipariş ek testi temiz ──");
process.exit(hata);
