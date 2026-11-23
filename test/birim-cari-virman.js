// BİRİM — CARİ VİRMANI KURALI (v1.744.35–36, kullanıcı 23 Kasım: "aynı cari, geçersiz tutar ve farklı para birimlerini de sına;
// kur dönüşümü yoksa farklı para birimlerini reddet").
// Ölçülen (337 cariVirmanDogrula, cariVirmanHareketleri; 200 cariBakiyeleri):
//   - aynı cari, karşı cari yok, boş / sıfır / eksi / sayı olmayan tutar → ret
//   - farklı para birimi (TRY ↔ USD) → ret, neden "kur dönüşümü yok"; aynı para birimi (USD ↔ USD) → geçer
//   - Ödeme virmanı: ilk cari Borç, karşı Alacak; Tahsilat virmanı tersi; iki satır aynı tutar ve para birimi
//   - bakiyeler: tutar kadar zıt yönde kayar, toplam değişmez
const { cariVirmanDogrula, cariVirmanHareketleri, cariBakiyeleri } = require("./erp.cjs");

let gecti = 0, kaldi = 0;
const ok = (ad, kosul) => { if (kosul) { gecti++; console.log("  ✓ " + ad); } else { kaldi++; console.log("  ✗ " + ad); } };

const A = { id: "a", unvan: "Müşteri B", paraBirimi: "TRY", hareketler: [] };
const B = { id: "b", unvan: "Tedarikçi A", paraBirimi: "TRY", hareketler: [] };
const U = { id: "u", unvan: "Döviz Tedarikçi", paraBirimi: "USD", hareketler: [] };
const U2 = { id: "u2", unvan: "Döviz Müşteri", paraBirimi: "USD", hareketler: [] };
const V = { id: "v", unvan: "Eski Cari", hareketler: [] };   // para birimi yazılmamış = TRY

console.log("── doğrulama");
ok("geçerli (TRY ↔ TRY, 1000)", cariVirmanDogrula({ ilkCari: A, karsiCari: B, tutar: 1000 }) === null);
ok("geçerli metin tutar '250,5'", cariVirmanDogrula({ ilkCari: A, karsiCari: B, tutar: "250,5" }) === null);
ok("karşı cari yok → ret", /Karşı cariyi seçin/.test(cariVirmanDogrula({ ilkCari: A, karsiCari: null, tutar: 10 })));
ok("ilk cari yok → ret", /İlk cariyi seçin/.test(cariVirmanDogrula({ ilkCari: null, karsiCari: B, tutar: 10 })));
ok("aynı cari → ret", /aynı olamaz/.test(cariVirmanDogrula({ ilkCari: A, karsiCari: { ...A }, tutar: 10 })));
["", "0", 0, -5, "-5", "abc", NaN, Infinity, null, undefined].forEach((t) =>
  ok(`geçersiz tutar ${JSON.stringify(t)} → ret`, /Geçerli bir tutar/.test(cariVirmanDogrula({ ilkCari: A, karsiCari: B, tutar: t }) || "")));
const pbHata = cariVirmanDogrula({ ilkCari: A, karsiCari: U, tutar: 100 });
ok("TRY → USD farklı para birimi → ret, kur dönüşümü yok", /Para birimleri farklı/.test(pbHata || "") && /kur dönüşümü yok/.test(pbHata || "") && /TRY/.test(pbHata) && /USD/.test(pbHata));
ok("USD → TRY de ret", /Para birimleri farklı/.test(cariVirmanDogrula({ ilkCari: U, karsiCari: A, tutar: 100 }) || ""));
ok("USD ↔ USD geçer", cariVirmanDogrula({ ilkCari: U, karsiCari: U2, tutar: 100 }) === null);
ok("para birimi yazılmamış cari TRY sayılır (TRY ile geçer, USD ile ret)",
  cariVirmanDogrula({ ilkCari: V, karsiCari: A, tutar: 5 }) === null && !!cariVirmanDogrula({ ilkCari: V, karsiCari: U, tutar: 5 }));

console.log("── satırlar ve bakiye");
const ode = cariVirmanHareketleri({ tip: "Ödeme", ilkCari: A, karsiCari: B, tarih: "2026-11-23", tutar: 1000, paraBirimi: "TRY", defter: "Genel", aciklama: "mahsup" });
ok("Ödeme: ilk cari Ödeme/Borç, karşı Tahsilat/Alacak", ode.ilk.islemTipi === "Ödeme" && ode.ilk.yon === "Borç" && ode.karsi.islemTipi === "Tahsilat" && ode.karsi.yon === "Alacak");
ok("iki satır aynı tutar, para birimi, şekil Virman", ode.ilk.tutar === 1000 && ode.karsi.tutar === 1000 && ode.ilk.paraBirimi === "TRY" && ode.karsi.paraBirimi === "TRY" && ode.ilk.odemeSekli === "Virman" && ode.karsi.odemeSekli === "Virman");
ok("karşılıklı bağ (virmanKarsiCariId)", ode.ilk.virmanKarsiCariId === "b" && ode.karsi.virmanKarsiCariId === "a");
const tah = cariVirmanHareketleri({ tip: "Tahsilat", ilkCari: A, karsiCari: B, tarih: "2026-11-23", tutar: 250, paraBirimi: "TRY" });
ok("Tahsilat: ilk cari Tahsilat/Alacak, karşı Ödeme/Borç", tah.ilk.yon === "Alacak" && tah.karsi.yon === "Borç");
const bA = cariBakiyeleri({ hareketler: [ode.ilk, tah.ilk] }).TRY, bB = cariBakiyeleri({ hareketler: [ode.karsi, tah.karsi] }).TRY;
ok("bakiye: A +1000 − 250 = 750, B −750 (toplam 0)", bA === 750 && bB === -750 && bA + bB === 0);

console.log(`── cari-virman: ${gecti} geçti, ${kaldi} kaldı ──`);
process.exit(kaldi ? 1 : 0);
