// BİRİM TESTİ — IBAN'DAN BANKA VE ŞUBE ÖĞRENME.
//
// Kullanıcı: "Çek için banka ve şubeleri otomatik çekelim, tek tek girmeyelim."
// Çevrimdışı çalışan bir uygulamada dışarıdan liste çekmek güvenilir değil; bunun yerine
// banka IBAN'ın içindeki koddan bulunuyor, şubeler kullanıcının kendi girdiklerinden öğreniliyor.
const { ibandanBanka, bilinenSubeler, BANKALAR } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

bekle("Ziraat IBAN'ı tanınır", ibandanBanka("TR33 0001 0000 0000 0000 0000 01"), "Ziraat Bankası");
bekle("Garanti IBAN'ı tanınır", ibandanBanka("TR520006200000000000000001"), "Garanti BBVA");
bekle("İş Bankası tanınır", ibandanBanka("TR100006400000100000000001"), "İş Bankası");
bekle("boşluklar ve küçük harf sorun değil", ibandanBanka("tr33 0001 0000 0000 0000 0000 01"), "Ziraat Bankası");

// BULAMAZSA BOŞ: yanlış tahmin yazmaktansa alanı boş bırakmak yeğdir.
bekle("bilinmeyen banka kodu → boş", ibandanBanka("TR330099900000000000000001"), "");
bekle("IBAN değilse → boş", ibandanBanka("12345"), "");
bekle("boş girdi → boş", ibandanBanka(""), "");
bekle("yabancı IBAN → boş", ibandanBanka("DE89370400440532013000"), "");

// ŞUBE ÖĞRENME
const gecmis = [
  { banka: "Ziraat Bankası", sube: "Merkez" },
  { banka: "Ziraat Bankası", sube: "Anadolu" },
  { banka: "Ziraat Bankası", sube: "Merkez" },
  { banka: "Garanti BBVA", sube: "Kadıköy" },
  { banka: "Ziraat Bankası" },
];
bekle("yalnızca o bankanın şubeleri, tekrarsız ve sıralı",
  bilinenSubeler(gecmis, "Ziraat Bankası"), ["Anadolu", "Merkez"]);
bekle("banka verilmezse hepsi", bilinenSubeler(gecmis, ""), ["Anadolu", "Kadıköy", "Merkez"]);
bekle("geçmiş yoksa boş liste", bilinenSubeler([], "Ziraat Bankası"), []);

bekle("banka listesi dolu", BANKALAR.length > 15, true);

console.log(hata ? "── BANKA TESTİ BAŞARISIZ ──" : "── banka testi temiz ──");
process.exit(hata);
