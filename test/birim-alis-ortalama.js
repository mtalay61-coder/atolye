// BİRİM TESTİ — MALİYETTE SON ALIŞ ORTALAMASI (27 Eylül, v1.499.0)
//
// Kullanıcı: "Maliyet ilk olarak son hammadde rengin alış fiyatlarının ortalamasından çeksin… son alış eski
// ise dikkate almasın; TL ise o gün USD'ye çevirip USD olarak ortalama bu değer olurdu desin. Son alışlar
// 3 aydan eski ise bu şekilde davransın." Kapsam: her yerde (hammaddeBirimFiyati üzerinden).
// İddialar:
//   • Son 3 ay: o rengin alışları, miktar ağırlıklı; başka renk ve 3 aydan eski alış karışmaz.
//   • Boy verilmişse o boyun alışları.
//   • Hepsi USD ise ortalama USD'de (TL = × bugünkü kur); karışıksa TL'de.
//   • Yalnız eski alış: TL fiyat o günün USD kuruyla dolara, bugünkü kurla TL'ye; kur geçmişi yoksa olduğu gibi.
//   • Alış yoksa kural/kart (eski davranış); bağlam verilmezse de eski davranış.
//   • Kâr/zarar: mamulün maliyeti reçetedeki hammaddelerden (işçilik hariç), reçetesizse kart fiyatı.
const { hammaddeBirimFiyati, sonAlisMaliyeti, aylarOnce, gunKuru, karZararHesapla } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const yuv = (x) => Math.round(x * 100) / 100;

const bugun = "2026-09-27";
const kurlar = { USD: 40, EUR: 45 };
const kurGecmisi = [{ tarih: "2026-09-01T12:00:00Z", USD: 40 }, { tarih: "2026-03-02T12:00:00Z", USD: 32 }];
const deri = { id: "d", ad: "Deri", kategori: "Hammadde", alisFiyati: 70, variants: [] };
const fermuar = { id: "f", ad: "Fermuar", kategori: "Hammadde", alisFiyati: 3, variants: [] };
const hr = (fisNo, tarih, urunAd, renk, beden, miktar, birimFiyat, ek = {}) => ({ id: fisNo + urunAd + renk + beden, fisNo, tarih, urunAd, renk, beden, miktar, birimFiyat, paraBirimi: "TRY", ...ek });
const cariler = [{ id: "t", unvan: "Tedarikçi", hareketler: [
  hr("AF-1", "2026-09-10", "Deri", "Siyah", "", 10, 100),
  hr("AF-2", "2026-08-01", "Deri", "Siyah", "", 30, 80),
  hr("AF-3", "2026-05-01", "Deri", "Siyah", "", 100, 10),          // 3 aydan eski: ortalamaya girmez
  hr("AF-4", "2026-09-05", "Deri", "Kahve", "", 5, 500),           // başka renk
  hr("SF-9", "2026-09-06", "Deri", "Siyah", "", 5, 999),           // satış: alış değil
  hr("AF-5", "2026-09-01", "Fermuar", "Siyah", "20 cm", 100, 2),
  hr("AF-5", "2026-09-01", "Fermuar", "Siyah", "40 cm", 100, 4),
  // Eski TL alış (Mart): 64 ₺ / 32 = 2 $ → bugün 80 ₺
  hr("AF-6", "2026-03-10", "Deri", "Bej", "", 10, 64),
  // USD alışlar (cariye TL çevrilmiş yazılmış; ham fiyat USD)
  hr("AF-7", "2026-09-02", "Deri", "Beyaz", "", 10, 80, { hamBirimFiyat: 2, kalemParaBirimi: "USD" }),
  hr("AF-8", "2026-09-03", "Deri", "Beyaz", "", 30, 120, { hamBirimFiyat: 3, kalemParaBirimi: "USD" }),
  // Hiç kur geçmişi olmayan tarihte eski TL alış
  hr("AF-9", "2025-01-10", "Deri", "Gri", "", 10, 50),
] }];
const b = { cariler, kurGecmisi, bugun };

console.log("Yardımcılar");
bekle("3 ay önce (ay sonu taşması)", [aylarOnce("2026-09-27", 3), aylarOnce("2026-05-31", 3)], ["2026-06-27", "2026-02-28"]);
bekle("gün kuru: o gün ya da öncesi en yakın", [gunKuru(kurGecmisi, "2026-03-10", "USD"), gunKuru(kurGecmisi, "2026-09-27", "USD"), gunKuru(kurGecmisi, "2025-01-01", "USD")], [32, 40, null]);

console.log("Son 3 ay ortalaması");
const siyah = hammaddeBirimFiyati(deri, "Siyah", "", kurlar, b);
bekle("miktar ağırlıklı (10×100 + 30×80)/40 = 85; eski ve başka renk yok", [siyah.kendiFiyat, siyah.pb, siyah.tl, siyah.alisSayisi], [85, "TRY", 85, 2]);
bekle("kaynak yazısı", siyah.kaynak, "Son 3 ay 2 alış ortalaması");
bekle("boy ayrı", [hammaddeBirimFiyati(fermuar, "Siyah", "20 cm", kurlar, b).tl, hammaddeBirimFiyati(fermuar, "Siyah", "40 cm", kurlar, b).tl], [2, 4]);
bekle("reçetede 'Tüm Bedenler' boy sayılmaz", hammaddeBirimFiyati(fermuar, "Siyah", "Tüm Bedenler", kurlar, b).tl, 3);
const beyaz = hammaddeBirimFiyati(deri, "Beyaz", "", kurlar, b);
bekle("hepsi USD → USD ortalama (10×2 + 30×3)/40 = 2,75 $, TL = 110", [beyaz.kendiFiyat, beyaz.pb, yuv(beyaz.tl)], [2.75, "USD", 110]);

console.log("3 aydan eski son alış");
const bej = hammaddeBirimFiyati(deri, "Bej", "", kurlar, b);
bekle("64 ₺ / 32 = 2 $ → bugün 80 ₺", [bej.kendiFiyat, bej.pb, bej.tl, bej.eskiAlis], [2, "USD", 80, true]);
const gri = hammaddeBirimFiyati(deri, "Gri", "", kurlar, b);
bekle("o günün kuru yoksa olduğu gibi, kaynakta yazar", [gri.tl, gri.pb, /güncellenemedi/.test(gri.kaynak)], [50, "TRY", true]);
bekle("rapor tarihinden sonraki alış sayılmaz", hammaddeBirimFiyati(deri, "Siyah", "", kurlar, { ...b, bugun: "2026-08-15" }).tl, 80);

console.log("Alış yoksa eski davranış");
bekle("alışı olmayan renk → kart", hammaddeBirimFiyati(deri, "Mavi", "", kurlar, b).tl, 70);
bekle("bağlam yok → kart (eski çağrılar)", hammaddeBirimFiyati(deri, "Siyah", "", kurlar).tl, 70);
bekle("sonAlisMaliyeti alış yoksa null", sonAlisMaliyeti(deri, "Mavi", "", kurlar, b), null);

console.log("Kâr/zarar maliyeti");
const bot = { id: "m", ad: "Bot", kategori: "Mamul", alisFiyati: 0, variants: [],
  recete: [{ hammaddeUrunId: "d", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", renk: "Siyah", beden: "", miktar: 0.5 }],
  prosesUcretleri: { kesim: 30 } };
const alinanMamul = { id: "a", ad: "Terlik", kategori: "Mamul", alisFiyati: 60, variants: [] };
const satis = (id) => ({ id, tarih: new Date().toISOString(), renk: "Siyah", beden: "40", miktar: -2, kaynak: "Satış" });
bot.hareketler = [satis("s1")]; alinanMamul.hareketler = [satis("s2")];
const kz = karZararHesapla({ stok: [bot, alinanMamul, deri], cariler, muhasebe: { kurlar, kurGecmisi }, giderKartlari: [], donem: "tumu" });
bekle("reçeteli mamul: 2 × 0,5 × 85 = 85 (işçilik hariç); reçetesiz: 2 × 60 = 120",
  kz.satisKalemleri.map((k) => [k.urun, yuv(k.maliyet)]), [["Bot", 85], ["Terlik", 120]]);

process.exit(hata);
