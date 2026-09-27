// SENARYO — İŞÇİLİK EKSTREDE ALIŞ GİBİ GÖRÜNMÜYOR (23 Eylül, v1.433.0 + v1.434.0).
//
// Kullanıcı (personel kartı, ekran görüntüsü): "İşçilik olan sanki alım yapmışız gibi gösteriyor;
// fiş no çok dolu, işçilik olduğunu açıklama satırına yazalım." Ardından (v1.434): "gerek yok,
// fişte var zaten detaylar" — tablo VARSA açıklama yazılmıyor.
//
// Tip fiş no önekinden okunuyordu (AF-, SF-, THS-, ODM-); işçilik hiçbirine uymuyor, ürün alanları
// taşıdığı için alış fişi gibi tablolanıyordu. Artık `islemTipi: "İşçilik"`; ESKİ kayıtta alan yok,
// tip "-İşçilik" ekinden tanınıyor (göç yok).
//
// Kurulum (Personel C, hepsi Genel defter):
//   A. ESKİ, ÜRÜNLÜ işçilik — `islemTipi` ALANI YOK, fiş no "10003-Üste-İşçilik" (102 Bayan Bot ·
//      Siyah Süet · 152 adet × 120),
//   B. tohumdaki ÜRÜNSÜZ işçilik "1001-Kesim-İşçilik" (açıklama "Kesim işçiliği · 3 çift"),
//   C. bir ALIŞ fişi "AF-0923003" (Deri · Siyah 5 × 100).
// Ölçülenler:
//   1. İŞÇİLİK rozeti 2 adet (A ve B), alışta rozet yok.
//   2. Fiş no sade gösteriliyor: "-İşçilik" eki ekranda YOK ("10003-Üste", "1001-Kesim").
//   3. Tablolu kayıtta (A) açıklama YOK; ürünsüz kayıtta (B) açıklama VAR.
//   4. Alış satırı etkilenmemiş (rozetsiz, tablolu, tür açıklaması "Cariden Alış fişi").
//   5. KAYITTAKİ fiş no değişmemiş ("10003-Üste-İşçilik"), `islemTipi` eklenmemiş.
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]);
  const personel = cariler.find((c) => c.id === "c3");
  personel.hareketler.push(
    { id: "h-eski-iscilik", tarih: "2026-09-10", zaman: "2026-09-10T09:00:00.000Z", yon: "Alacak",
      tutar: 18240, paraBirimi: "TRY", odemeSekli: "Nakit", vade: "", defter: "Genel",
      fisNo: "10003-Üste-İşçilik", siparisNo: "10003", uretimId: "up-yok",
      urunAd: "102 Bayan Bot", renk: "Siyah Süet", miktar: 152, birimFiyat: 120, birim: "adet",
      aciklama: "Üste işçilik ücreti — 102 Bayan Bot · 152 adet × 120 ₺" },
    { id: "h-alis", tarih: "2026-09-12", zaman: "2026-09-12T09:00:00.000Z", yon: "Alacak",
      tutar: 500, paraBirimi: "TRY", odemeSekli: "Nakit", vade: "", defter: "Genel",
      fisNo: "AF-0923003", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 5, birimFiyat: 100, birim: "metre",
      aciklama: "Cariden Alış fişi: Deri Siyah 5 metre" },
  );
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Personel C"):visible').last().click();
  await sayfa.waitForTimeout(800);

  const ekran = await sayfa.evaluate(() => {
    const tablo = [...document.querySelectorAll("table")].find((tb) =>
      [...tb.querySelectorAll("thead th")].some((th) => th.textContent.trim() === "Bakiye"));
    if (!tablo) return null;
    const satirlar = [...tablo.tBodies[0].rows].map((tr) => {
      const [kimlikTd, aciklamaTd] = tr.children;
      const kimlik = kimlikTd.firstElementChild;
      // Kimlik satırının parçaları: tarih, rozet, fiş no, sipariş no, açıklama, defter etiketi.
      const parcalar = [...kimlik.children].map((c) => c.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
      return {
        rozet: !!kimlikTd.querySelector("[data-hareket-rozet]"),
        kimlik: parcalar.slice(1).join(" ‖ "),
        // Tablonun yalnız satırları (başlık hep aynı). Ürünsüz kayıtta açıklama sütunu ÖLÇÜLMÜYOR:
        // orada açıklama hem kimlik satırında hem sütunda yazılıyor (çift gösterim — 27 Eylül
        // raporunda soru olarak iletildi, altına gömülmedi).
        tablo: aciklamaTd.querySelector("table")
          ? [...aciklamaTd.querySelectorAll("table tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim()).join(" | "))
          : null,
      };
    });
    return {
      rozetSayisi: document.querySelectorAll("[data-hareket-rozet]").length,
      iscilikEkiGorunuyor: tablo.innerText.includes("-İşçilik"),
      satirlar,
    };
  });

  const kayit = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c3").hareketler
    .map((h) => `${h.fisNo} · islemTipi ${h.islemTipi || "(yok)"}`).sort();

  await tarayici.close();
  return { hatalar, ekran, kayit };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
