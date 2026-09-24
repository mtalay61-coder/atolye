#!/usr/bin/env node
// DENETİM 12 — FİŞSİZ HAREKET
//
// Kural: stok ya da cari, elle ya da sistem tarafından — her hareketin fiş numarası vardır.
// Fiş numarası bir hareketin NEREDEN GELDİĞİNİ anlatan tek alandır; fişsiz hareket, aylar sonra
// "bu miktar nereden çıktı" sorusunun cevapsız kalması demektir.
//
// Bu denetim `uid("hrk")` ile hareket üreten her noktayı bulur ve aynı nesne gövdesinde bir fiş
// numarası olup olmadığına bakar. Boş atama (`fisNo: ""`) de fişsiz sayılır — alanın var olması
// değil, DOLU olması gerekiyor.
const fs = require("fs");
const dosya = process.argv[2] || "atolye-erp.jsx";
const satirlar = fs.readFileSync(dosya, "utf8").split("\n");
const bulgular = [];
const PENCERE = 30; // hareket nesnesinin gövdesi bu aralıkta kapanıyor

satirlar.forEach((sat, i) => {
  if (!/uid\("hrk"\)/.test(sat)) return;
  if (/^\s*(\/\/|\*)/.test(sat)) return;
  const cevre = satirlar.slice(Math.max(0, i - PENCERE), i + PENCERE).join("\n");
  if (/fis-muaf/.test(cevre)) return;

  // Yayılan nesneler (`...ortak`, `...ortakHareket`) fişi taşıyor olabilir; o yüzden pencere
  // geniş tutuluyor ve yalnızca hiç fiş görünmeyen ya da boş atanan yerler işaretleniyor.
  const fisVar = /fisNo\s*[:,]/.test(cevre);
  const fisBos = /fisNo:\s*""/.test(cevre) && !/fisNo:\s*""\s*\|\|/.test(cevre);

  if (!fisVar) {
    bulgular.push(`${dosya}:${i + 1}  hareket üretiliyor ama fiş numarası yok — ` +
      `nereden geldiği izlenemez`);
  } else if (fisBos) {
    bulgular.push(`${dosya}:${i + 1}  fiş numarası BOŞ atanıyor (fisNo: "") — ` +
      `alanın var olması yetmez, dolu olmalı; fisNoUret() kullan`);
  }
});

// --- İŞÇİLİK FİŞİ EŞLEŞMESİ ---
// İşçilik ayrı fişe ("...-İşçilik") taşındı. Fiş numarasıyla cari hareketi arayan her yer bu
// eki tanımak zorunda; tanımazsa hammadde geri alınır ama personelin borcu durur — sessiz,
// çünkü hata vermez. Bir kez yaşandı. Eşleşme kuralı fiş AİLESİNDE toplandı: `uretimFisAdlari`
// (079-fisgerial) tabanı, "-İşçilik" ve "-Giriş" eklerini tek yerden üretir; geri alma aileyle
// çalışır. (Eski `fiseAitCariHareketiMi` yardımcısı kullanılmıyordu, 14 Eylül temizliğinde
// silindi.) Ham karşılaştırma yapan yeni bir yer çıkarsa burada görünür.
{
  const ek = "-\u0130\u015F\u00E7ilik";
  if (!/function uretimFisAdlari\(/.test(satirlar.join("\n"))) {
    bulgular.push("uretimFisAdlari() yok — işçilik fişi eşleşme kuralı dağınık kalır");
  }
  satirlar.forEach((sat, i) => {
    if (!/h\.fisNo\s*(===|!==)\s*fisNo\b/.test(sat)) return;
    // YALNIZCA CARİ hareketleri. Stok hareketleri işçilik ekini taşımıyor (işçilik stok
    // hareketi üretmiyor), orada ham karşılaştırma DOĞRU.
    if (!/c\.hareketler/.test(sat)) return;
    // Zaten iki biçimi de tanıyan satırlar (`|| h.fisNo === ...-İşçilik`) kapsam dışı.
    if (/\u0130\u015F\u00E7ilik/.test(sat)) return;
    if (/fis-muaf/.test(satirlar.slice(Math.max(0, i - 4), i + 1).join("\n"))) return;
    bulgular.push(`${dosya}:${i + 1}  fiş numarası ham karşılaştırılıyor — "${ek}" eki tanınmaz, ` +
      `fiseAitCariHareketiMi kullanılmalı: ${sat.trim().slice(0, 60)}`);
  });
}

// Üreteç duruyor mu? Silinirse kural uygulanamaz hâle gelir.
if (!/function fisNoUret\(/.test(satirlar.join("\n"))) {
  bulgular.push("fisNoUret() bulunamadı — otomatik fiş numarası üretilemez");
}

if (!bulgular.length) console.log("  12   fişsiz hareket .......... TEMİZ");
else {
  bulgular.forEach((b) => console.log("  ✗ [12 fişsiz hareket] " + b));
  console.log(`  12   fişsiz hareket .......... ${bulgular.length} BULGU`);
}
process.exit(bulgular.length ? 1 : 0);
