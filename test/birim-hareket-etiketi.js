// BİRİM TESTİ — ÜRETİM HAREKETLERİNİN ETİKETİ.
//
// Kullanıcı (Astar hammadde kartı): "Üretimden giriş yazan aslında üretime çıkış yapılmış,
// yanlışlık var gibi başlıkta."
//
// Aynı kaynak ("Üretim") iki farklı anlama geliyor: mamulde mal stoğa GİRER, hammaddede malzeme
// üretime ÇIKAR. Etiket sabit "Üretimden Giriş" yazıyordu.
const { uretimKaynakEtiketi, kaynakEtiketi } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = a === b;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", b, "· çıkan:", a); }
};

const grup = (kaynak, ...miktarlar) => ({ kaynak, hareketler: miktarlar.map((m) => ({ miktar: m })) });

bekle("hammadde: hepsi çıkış → Üretime Çıkış", uretimKaynakEtiketi([grup("Üretim", -5, -3)]), "Üretime Çıkış");
bekle("mamul: hepsi giriş → Üretimden Giriş", uretimKaynakEtiketi([grup("Üretim", 5, 3)]), "Üretimden Giriş");
// Karışıksa yön İDDİA EDİLMEZ: yanlış bir cümle kurmaktansa sade yazmak yeğdir.
bekle("karışık → sade Üretim", uretimKaynakEtiketi([grup("Üretim", 5, -3)]), "Üretim");
bekle("üretim hareketi yoksa → sade Üretim", uretimKaynakEtiketi([grup("Satınalma", 5)]), "Üretim");
bekle("boş liste → sade Üretim", uretimKaynakEtiketi([]), "Üretim");
// Birden çok grup birlikte değerlendirilir.
bekle("çok gruplu çıkış", uretimKaynakEtiketi([grup("Üretim", -2), grup("Üretim", -4)]), "Üretime Çıkış");

// ---- SİPARİŞ / FİŞ AYRIMI ----
//
// Kullanıcı: "Satış siparişi sattığımız ürünler için, alış siparişi aldığımız ürünler için;
// satış fişi ve alış fişi de buna göre adlandırılmalı. Resimde görünen alış fişi ama SATINALMA
// yazıyor, sanki siparişte kalmış gibi kafa karıştırıyor."
//
// Kayıttaki `kaynak` değeri DEĞİŞMEDİ (süzgeçler ve geçmiş kayıtlar ona bağlı); yalnızca ekran
// adı eşleniyor.
{
  bekle("Satınalma → Alış Fişi", kaynakEtiketi("Satınalma", []), "Alış Fişi");
  bekle("Satış → Satış Fişi", kaynakEtiketi("Satış", []), "Satış Fişi");
  bekle("Üretim yöne göre", kaynakEtiketi("Üretim", [grup("Üretim", -5)]), "Üretime Çıkış");
  bekle("bilinmeyen kaynak olduğu gibi", kaynakEtiketi("Manuel", []), "Manuel");
}

console.log(hata ? "── HAREKET ETİKETİ TESTİ BAŞARISIZ ──" : "── hareket etiketi testi temiz ──");
process.exit(hata);
