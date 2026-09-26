// BİRİM TESTİ — REÇETEDE GEÇMİŞ RENK EŞLEŞTİRMELERİ (26 Eylül, v1.480.0)
//
// Kullanıcı: "Reçete renk eşleştirmede geçmişte yapılan eşleştirmeleri hatırlama olsun… otomatik
// eşleştirsin ama kırmızı uyarı versin kontrol için."
//
// İddialar:
//   • Aynı hammaddede verilmiş EN SON karar önerilir (eskisi değil).
//   • Aynı hammaddede karar yoksa başka hammaddenin kararı — yalnız bu hammaddede o renk varsa.
//   • Kombinasyon satırı ("2. Renk") o POZİSYONUN rengiyle hatırlanır.
//   • Değişken ambalaj satırı hafızaya girmez (rengi yer tutucu).
//   • Büyük/küçük harf ayrımı yok; hiç kayıt yoksa boş.
const { gecmisRenkEslesmeleri, gecmisRenkOnerisi, receteSatirPozisyonRengi } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

const urunler = [
  { id: "m1", recete: [
    { hammaddeUrunId: "deri", mamulRenk: "Kahve Süet", renk: "Kahve", eklemeTarihi: "2026-09-01" },
    { hammaddeUrunId: "deri", mamulRenk: "Kahve Süet", renk: "Taba", eklemeTarihi: "2026-09-20" },   // sonra değişmiş
    { hammaddeUrunId: "astar", mamulRenk: "Bej Deri", renk: "Krem", eklemeTarihi: "2026-09-05" },
    { hammaddeUrunId: "kutu", mamulRenk: "Bej Deri", renk: "Standart", ambalajDegisken: true, eklemeTarihi: "2026-09-06" },
  ] },
  { id: "m2", recete: [
    { hammaddeUrunId: "deri", mamulRenk: "1004 - Kırmızı/Bej", renk: "Bordo", aciklama: "1. Renk", eklemeTarihi: "2026-09-10" },
    { hammaddeUrunId: "deri", mamulRenk: "1004 - Kırmızı/Bej", renk: "Krem", aciklama: "2. Renk", eklemeTarihi: "2026-09-10" },
  ] },
];
const h = gecmisRenkEslesmeleri(urunler);
bekle("aynı hammadde, en son karar", gecmisRenkOnerisi(h, "Kahve Süet", "deri", ["Kahve", "Taba", "Siyah"]), "Taba");
bekle("başka hammadde: bu hammaddede bulunan en son karar (Taba yok → Kahve)", gecmisRenkOnerisi(h, "Kahve Süet", "deri2", ["Kahve", "Siyah"]), "Kahve");
bekle("başka hammaddenin kararı (renk bu hammaddede var)", gecmisRenkOnerisi(h, "Bej Deri", "deri", ["Krem", "Siyah"]), "Krem");
bekle("kombinasyon pozisyonu: 'Kırmızı' → Bordo, 'Bej' → Krem", [gecmisRenkOnerisi(h, "Kırmızı", "deri", ["Bordo", "Krem"]), gecmisRenkOnerisi(h, "bej", "deri", ["Bordo", "Krem"])], ["Bordo", "Krem"]);
bekle("değişken ambalaj hafızada yok", gecmisRenkOnerisi(h, "Bej Deri", "kutu", ["Standart", "Kahve"]), "");
bekle("kayıt yoksa boş", gecmisRenkOnerisi(h, "Mor", "deri", ["Mor"]), "");
bekle("satır pozisyon rengi", [receteSatirPozisyonRengi(urunler[1].recete[1]), receteSatirPozisyonRengi(urunler[0].recete[0])], ["Bej", "Kahve Süet"]);

if (hata) { console.log("── geçmiş renk testi BAŞARISIZ ──"); process.exit(1); }
console.log("── geçmiş renk testi temiz ──");
