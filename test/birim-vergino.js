// BİRİM TESTİ — VERGİ NO / TCKN KONTROLÜ (27 Eylül, v1.497.0)
//
// Kullanıcı: vergi no girince cari bilgileri otomatik gelsin. Otomatik sorgu eFinans bağlantısıyla gelecek;
// şimdilik dışarıya bir şey göndermeden: numara kontrol basamağıyla doğrulanır, aynı numaralı cari uyarılır.
// İddialar:
//   • VKN (10 hane) GİB algoritması; TCKN (11 hane) kendi kuralı; boşluk/nokta/tire yok sayılır.
//   • Vergi No alanı iki türü de kabul eder; boş alan sorun değil; hane sayısı yanlışsa açık mesaj.
//   • Mükerrer: vergiNo ya da tckn alanında aynı numara; düzenlenen carinin kendisi sayılmaz.
const { vergiNoNormal, vknGecerliMi, tcknGecerliMi, vergiNoKontrol, tcknKontrol, ayniVergiNoluCariler, vergiNoUyarilari, vergiNoKaydedilecek } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};

console.log("Algoritmalar");
bekle("normalleştirme", vergiNoNormal(" 323-051.23 84 "), "3230512384");
bekle("geçerli VKN", [vknGecerliMi("3230512384"), vknGecerliMi("1234567890")], [true, true]);
bekle("son hanesi bozuk VKN", [vknGecerliMi("3230512385"), vknGecerliMi("1234567891")], [false, false]);
bekle("VKN 10 hane değilse", [vknGecerliMi("323051238"), vknGecerliMi("32305123840"), vknGecerliMi("")], [false, false, false]);
bekle("geçerli TCKN", [tcknGecerliMi("10000000146"), tcknGecerliMi("11111111110"), tcknGecerliMi("12345678950")], [true, true, true]);
bekle("bozuk TCKN (10. / 11. hane, 0 ile başlayan)", [tcknGecerliMi("10000000156"), tcknGecerliMi("10000000147"), tcknGecerliMi("01234567890")], [false, false, false]);

console.log("Vergi No alanı");
bekle("boş", vergiNoKontrol("  ").gecerli, true);
bekle("VKN", [vergiNoKontrol("3230512384").tur, vergiNoKontrol("3230512384").gecerli], ["vkn", true]);
bekle("TCKN", [vergiNoKontrol("10000000146").tur, vergiNoKontrol("10000000146").gecerli], ["tckn", true]);
bekle("bozuk VKN mesajı", vergiNoKontrol("1234567891").mesaj, "Vergi no hatalı (kontrol basamağı tutmuyor)");
bekle("harf (eski kayıtta dairesiyle tek kutu)", vergiNoKontrol("3230512384 Kadıköy").mesaj, "Vergi no yalnız rakam olmalı");
bekle("hane sayısı", vergiNoKontrol("12345").mesaj, "Vergi no 10, TC kimlik no 11 hane olmalı (5 hane girildi)");
bekle("TCKN alanı", [tcknKontrol("").gecerli, tcknKontrol("10000000146").gecerli, tcknKontrol("3230512384").gecerli], [true, true, false]);

console.log("Mükerrer");
const cariler = [
  { id: "a", unvan: "Deniz Deri", tip: "Tedarikçi", vergiNo: "323 051 2384" },
  { id: "b", unvan: "Ali Veli", tip: "Müşteri", tckn: "10000000146" },
  { id: "c", unvan: "Boş", tip: "Müşteri", vergiNo: "" },
];
bekle("aynı VKN (boşluklu kayıt)", ayniVergiNoluCariler(cariler, "3230512384").map((c) => c.id), ["a"]);
bekle("TCKN alanındaki numara da", ayniVergiNoluCariler(cariler, "10000000146").map((c) => c.id), ["b"]);
bekle("kendisi sayılmaz", ayniVergiNoluCariler(cariler, "3230512384", "a"), []);
bekle("boş numara eşleşmez", ayniVergiNoluCariler(cariler, ""), []);
bekle("uyarılar: hatalı + mükerrer ayrı ayrı", vergiNoUyarilari(cariler, "3230512384"), ["Bu numarayla kayıtlı cari var: Deniz Deri (Tedarikçi)"]);
bekle("uyarılar: temiz", vergiNoUyarilari(cariler, "1234567890"), []);
bekle("uyarılar: hatalı", vergiNoUyarilari(cariler, "1234567891").length, 1);

console.log("Kaydedilen biçim");
bekle("geçerli numara yalın rakam", [vergiNoKaydedilecek(" 323 051 2384 "), vergiNoKaydedilecek("1000000014-6")], ["3230512384", "10000000146"]);
bekle("geçersiz olduğu gibi (kırpılmış)", [vergiNoKaydedilecek(" 123 45 "), vergiNoKaydedilecek("")], ["123 45", ""]);

process.exit(hata);
