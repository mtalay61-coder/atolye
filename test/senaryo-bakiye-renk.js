// SENARYO — BAKİYE RENGİ HER YERDE AYNI.
//
// Kullanıcı: "Cari içine girmeden görünen bakiyeleri alacak durumuna göre aynı renkte olsun."
//
// Aynı bakiye kart başlığında YEŞİL (cari bize borçlu), ekstrenin toplam satırında KIRMIZI
// görünüyordu: toplam satırı kuralı ters kurmuştu. Üstelik `Math.abs` işareti siliyordu, yani
// yön yalnızca renge kalmıştı — renk de yanlış olunca bakiyenin yönü ekranda hiç görünmüyordu.
//
// Ölçülen: listedeki (kapalı kart) bakiye ile ekstredeki koşan bakiye ve toplam AYNI renkte.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const YESIL = "rgb(78, 107, 78)";
const KIRMIZI = "rgb(184, 92, 46)";

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  // Müşteri B bize borçlu (pozitif), Tedarikçi A'ya biz borçluyuz (negatif).
  cariler[1].hareketler = [
    { id: "b1", tarih: "2026-08-30", zaman: "2026-08-30T09:00:00.000Z", yon: "Borç", tutar: 1500, paraBirimi: "TRY", defter: "Genel", fisNo: "SF-1", aciklama: "satış" },
  ];
  cariler[0].hareketler = [
    { id: "b2", tarih: "2026-08-30", zaman: "2026-08-30T09:00:00.000Z", yon: "Alacak", tutar: 900, paraBirimi: "TRY", defter: "Genel", fisNo: "AF-1", aciklama: "alış" },
  ];
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(800);

  // Kapalı kartlardaki bakiye renkleri
  const listeRenkleri = await sayfa.evaluate(() => {
    const cikan = {};
    [...document.querySelectorAll("span")].forEach((e) => {
      const t = (e.textContent || "").trim();
      if (/^[+-]?[\d.,]+ ₺$/.test(t) && e.getBoundingClientRect().width > 0 && parseInt(getComputedStyle(e).fontSize) >= 14) {
        cikan[t] = getComputedStyle(e).color;
      }
    });
    return cikan;
  });

  // Müşteri B kartını aç, ekstredeki koşan bakiye ve toplam renkleri
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(900);
  const ekstreRenkleri = await sayfa.evaluate(() => {
    const hucreler = [...document.querySelectorAll("td")].filter((e) => e.getBoundingClientRect().width > 0);
    // BORÇ sütunu da "1.500" yazıyor; koşan bakiye onun SAĞINDA, o yüzden SON eşleşme alınıyor.
    const bul = (kalip, sonuncu) => {
      const esler = hucreler.filter((e) => kalip.test((e.textContent || "").trim()));
      const h = sonuncu ? esler[esler.length - 1] : esler[0];
      return h ? getComputedStyle(h).color : null;
    };
    return { kosanBakiye: bul(/^1\.500(,00)? ₺?$/, true), toplamNet: bul(/^\+1\.500(,00)? ₺$/) };
  });

  await tarayici.close();
  return { hatalar, listeRenkleri, ekstreRenkleri, beklenen: { YESIL, KIRMIZI } };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
