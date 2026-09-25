// BİRİM TESTİ — CARİ HAREKET YÖNÜ.
//
// Kural üç kez kuruldu, ikisi yanlıştı; sebebi hep aynıydı: yön birden çok yerde ayrı ayrı
// yazılıyordu. Artık tek fonksiyon var ve bu test onu kilitliyor.
//
// Bakiye `Borç − diğer` toplanıyor: pozitif = cari BİZE borçlu, negatif = biz cariye borçluyuz.
const { hareketYonu } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = a === b;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", b, "· çıkan:", a); }
};

bekle("Satış → Borç (müşteri bize borçlanır)", hareketYonu("Satış"), "Borç");
bekle("Alış → Alacak (biz tedarikçiye borçlanırız)", hareketYonu("Alış"), "Alacak");
bekle("Ödeme → Borç (borcumuzu kapatır)", hareketYonu("Ödeme"), "Borç");
bekle("Tahsilat → Alacak (alacağımızı kapatır)", hareketYonu("Tahsilat"), "Alacak");

bekle("İşçilik → Alacak (biz personele borçlanırız)", hareketYonu("İşçilik"), "Alacak");
bekle("işçilik ile alış aynı yönde (ikisi de alım)", hareketYonu("İşçilik"), hareketYonu("Alış"));
bekle("işçilik ile ödeme ters yönde (ödeme işçilik borcunu kapatır)", hareketYonu("İşçilik") === hareketYonu("Ödeme"), false);

// EN ÖNEMLİ İDDİA: alış ile satış TERS yönde olmalı. İki hatanın da ortak belirtisi buydu.
bekle("alış ve satış ters yönde", hareketYonu("Alış") === hareketYonu("Satış"), false);
bekle("satış ile ödeme aynı yönde (ikisi de bakiyeyi artırır)", hareketYonu("Satış"), hareketYonu("Ödeme"));
bekle("alış ile tahsilat aynı yönde (ikisi de bakiyeyi azaltır)", hareketYonu("Alış"), hareketYonu("Tahsilat"));

console.log(hata ? "── CARİ YÖN TESTİ BAŞARISIZ ──" : "── cari yön testi temiz ──");
process.exit(hata);
