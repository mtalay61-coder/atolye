// BİRİM TESTİ — GÖRSEL DEPOSU
//
// Ürün görselleri ürün kaydının İÇİNDE duruyordu ve bütün ürünler TEK yerel anahtarda
// (`stok:items`). `guvenliYaz` 5 MB'ı aşan kaydı depoya sormadan reddediyor — sınır tarayıcının
// değil, uygulamanın kendi kuralı. Görsel başına ~50 KB ile yüz ürünün birkaç rengi sınırı
// doldurur ve STOK KAYDEDİLEMEZ hâle gelir.
//
// Çözüm: görseller yerelde ürün başına ayrı anahtarda. Buluta ürünün KENDİ satırından gitmeye
// devam ediyor (orada sıkışma yok), yani şema ve SQL değişmedi.
const { gorselleriAyir, gorselleriBirlestir, gorselFarki, urunGorselleri, veriBoyutu } = require("./erp.cjs");

let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "\u2713" : "\u2717"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\u00b7 \u00e7\u0131kan:", JSON.stringify(a)); }
};

const G = (n) => `data:image/jpeg;base64,${"A".repeat(n)}`;

const stok0 = [
  { id: "u1", ad: "Bot", kapakResmi: G(20), renkResimleri: { Siyah: G(20), Taba: G(20) }, variants: [] },
  { id: "u2", ad: "Deri", kapakResmi: "", renkResimleri: {}, variants: [] },
  { id: "u3", ad: "Toka", kapakResmi: G(10), renkResimleri: {}, variants: [] },
];

// ---- AYIRMA ------------------------------------------------------------------------------------
const ayrik = gorselleriAyir(stok0);
bekle("g\u00f6rselsiz \u00fcr\u00fcn i\u00e7in paket \u00fcretilmiyor", ayrik.gorseller.map((g) => g.urunId), ["u1", "u3"]);
bekle("kapak bo\u015falt\u0131ld\u0131", ayrik.stok[0].kapakResmi, "");
// Alan SİLİNMİYOR, boşaltılıyor: yok olursa bulut şeması `{}` yerine `null` sanabilir.
bekle("alan duruyor, sadece bo\u015f", ayrik.stok[0].renkResimleri, {});
bekle("di\u011fer alanlar korundu", ayrik.stok[0].ad, "Bot");

// ASIL KAZANÇ: yerele yazılacak hâl küçülüyor.
bekle("yerel kay\u0131t k\u00fc\u00e7\u00fcld\u00fc", veriBoyutu(ayrik.stok) < veriBoyutu(stok0), true);

// ---- BİRLEŞTİRME -------------------------------------------------------------------------------
const harita = {};
ayrik.gorseller.forEach((g) => { harita[g.urunId] = g.veri; });
bekle("g\u00f6rseller geri geldi", gorselleriBirlestir(ayrik.stok, harita), stok0);
bekle("haritas\u0131z birle\u015ftirme \u00e7\u00f6kmez", gorselleriBirlestir(ayrik.stok, null), ayrik.stok);

// ÜRÜNDE ZATEN GÖRSEL VARSA DOKUNULMUYOR: buluttan gelen kayıt daha günceldir.
const bulutHali = [{ id: "u1", ad: "Bot", kapakResmi: G(5), renkResimleri: {}, variants: [] }];
bekle("bulut hali ezilmiyor", gorselleriBirlestir(bulutHali, harita)[0].kapakResmi, G(5));

// ---- FARK --------------------------------------------------------------------------------------
// Her kayıtta bütün görselleri yeniden yazmak, tek bir miktar değişikliğinde onlarca megabaytı
// diske geri yazmak demekti.
const imzalar = {};
const ilk = gorselFarki(ayrik.gorseller, imzalar);
bekle("ilk seferde hepsi yaz\u0131l\u0131yor", ilk.yazilacak.length, 2);
bekle("silinecek yok", ilk.silinecek, []);

const ikinci = gorselFarki(ayrik.gorseller, ilk.yeniImzalar);
bekle("de\u011fi\u015fmeyen g\u00f6rsel yeniden yaz\u0131lm\u0131yor", ikinci.yazilacak.length, 0);

// Bir ürünün görseli değişirse YALNIZ o yazılıyor.
const degisti = gorselleriAyir([
  { ...stok0[0], renkResimleri: { Siyah: G(30), Taba: G(20) } },
  stok0[1], stok0[2],
]).gorseller;
bekle("yaln\u0131z de\u011fi\u015fen yaz\u0131l\u0131yor", gorselFarki(degisti, ilk.yeniImzalar).yazilacak.map((g) => g.urunId), ["u1"]);

// Ürün silinince ya da görseli kaldırılınca anahtar YETİM KALMAMALI.
const silinmis = gorselleriAyir([stok0[1], stok0[2]]).gorseller;
bekle("yetim anahtar siliniyor", gorselFarki(silinmis, ilk.yeniImzalar).silinecek, ["u1"]);

bekle("g\u00f6rselsiz \u00fcr\u00fcn null", urunGorselleri(stok0[1]), null);
bekle("bo\u015f renk g\u00f6rseli saklanm\u0131yor",
  urunGorselleri({ kapakResmi: G(5), renkResimleri: { Siyah: "", Taba: G(5) } }).renkResimleri,
  { Taba: G(5) });

console.log(hata ? "\n\u2500\u2500 G\u00d6RSEL DEPOSU BA\u015eARISIZ \u2500\u2500" : "\n\u2500\u2500 g\u00f6rsel deposu testi temiz \u2500\u2500");
process.exit(hata);
