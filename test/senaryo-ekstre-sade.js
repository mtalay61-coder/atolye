// SENARYO — CARİ EKSTRESİ SADE GÖRÜNÜM (23 Eylül, v1.435.0 + v1.436.0 sol sütun tek satır).
//
// Kullanıcı: "Cari hareketleri detaysız da göstersin. Şu anki hâli kalsın. Tek satıra sığacak
// bilgiler yeterli. Örnek göster birkaç farklı tip için, öyle yap." Kural (`hareketSadeOzet`, 200):
// bilgiyi ATMA, SIKIŞTIR. Varsayılan DETAYLI; tercih `localStorage`ta (`cari:ekstre-sade`).
//
// Kurulum (Tedarikçi A, hepsi Genel defter, dört tip):
//   A. tek kalemli alış — Deri · Siyah · 11 metre × 12,21,
//   B. üç satırlı, iki renkli satış — Bot Siyah 40:2 41:3 + Taba 40:4 (9 çift),
//   C. işçilik — 102 Bayan Bot · Siyah Süet · 152 adet × 120,
//   D. nakit ödeme (açıklama yalnız "Ödeme").
// Ölçülenler:
//   1. Açılışta DETAYLI: düğme "Sade görünüm", sade özet satırı 0 adet.
//   2. Sade kipte her fişin tek satırlık özeti: A "Deri · Siyah · 11 metre × 12,21",
//      B "Bot · 2 renk · 9 çift", C "102 Bayan Bot · Siyah Süet · 152 adet × 120", D "—"
//      (ödeme şekli sol sütunda rozet olarak duruyor, tekrarlanmıyor).
//   3. Sade kipte ürün tablosu yok; ürünlü satırlar (A, B, C) tek satır yüksekliğinde, aynı boyda ve
//      detaylı kipteki tablolu satırlardan kısa. (D, ödeme satırı, boy ölçümünden hariç — aşağıya bkz.)
//   4. Tercih localStorage'ta "1"; başka modüle gidip dönünce sade kip korunuyor.
//   5. "Detaylı görünüm" → özet 0, tablolar geri, localStorage "0".
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]);
  const ortak = { paraBirimi: "TRY", vade: "", defter: "Genel" };
  const satis = [["Siyah", "40", 2], ["Siyah", "41", 3], ["Taba", "40", 4]];
  cariler.find((c) => c.id === "c1").hareketler = [
    { ...ortak, id: "h-a", tarih: "2026-09-10", zaman: "2026-09-10T09:00:00.000Z", yon: "Alacak", tutar: 134.31, odemeSekli: "Nakit",
      fisNo: "AF-0910001", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 11, birimFiyat: 12.21, birim: "metre",
      aciklama: "Cariden Alış fişi: Deri Siyah 11 metre" },
    ...satis.map(([renk, beden, miktar], i) => ({ ...ortak, id: "h-b" + i, tarih: "2026-09-11", zaman: "2026-09-11T09:00:00.000Z",
      yon: "Borç", tutar: miktar * 900, odemeSekli: "Nakit", fisNo: "SF-0911001", urunAd: "Bot", renk, beden, miktar,
      birimFiyat: 900, birim: "çift", aciklama: `Cariye Satış fişi: Bot ${renk} ${beden}` })),
    { ...ortak, id: "h-c", tarih: "2026-09-12", zaman: "2026-09-12T09:00:00.000Z", yon: "Alacak", tutar: 18240, odemeSekli: "Nakit",
      islemTipi: "İşçilik", fisNo: "10003-Üste-İşçilik", siparisNo: "10003", uretimId: "up-yok",
      urunAd: "102 Bayan Bot", renk: "Siyah Süet", miktar: 152, birimFiyat: 120, birim: "adet",
      aciklama: "Üste işçilik ücreti — 102 Bayan Bot · 152 adet × 120 ₺" },
    { ...ortak, id: "h-d", tarih: "2026-09-13", zaman: "2026-09-13T09:00:00.000Z", yon: "Borç", tutar: 1000, odemeSekli: "Nakit",
      fisNo: "ODM-TEST", aciklama: "Ödeme" },
  ];
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  const kartAc = async () => {
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(500);
    // Kart düğmesi aç/kapa: modüle dönüldüğünde kart zaten açık kalmış olabilir.
    const acik = await sayfa.evaluate(() => !!document.querySelector("[data-ekstre-gorunum]"));
    if (!acik) {
      await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click();
      await sayfa.waitForTimeout(800);
    }
  };
  await kartAc();

  // Ekstrenin o anki hâli: fiş başına sol sütun (tarih hariç), sade özet, tablo var mı, satır boyu.
  const ekstre = () => sayfa.evaluate(() => {
    const tablo = [...document.querySelectorAll("table")].find((tb) =>
      [...tb.querySelectorAll("thead th")].some((th) => th.textContent.trim() === "Bakiye"));
    const satirlar = [...tablo.tBodies[0].rows].map((tr) => {
      const [kimlikTd, aciklamaTd] = tr.children;
      const parcalar = [...kimlikTd.firstElementChild.children].map((c) => c.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
      const ozet = aciklamaTd.querySelector("[data-ekstre-sade-ozet]");
      return {
        kimlik: parcalar.slice(1).join(" ‖ "),
        ozet: ozet ? ozet.textContent : null,
        tablolu: !!aciklamaTd.querySelector("table"),
        boy: Math.round(tr.getBoundingClientRect().height),
      };
    });
    const d = document.querySelector("[data-ekstre-gorunum]");
    let tercih = null;
    try { tercih = window.localStorage.getItem("cari:ekstre-sade"); } catch (e) { tercih = "(okunamadı)"; }
    return {
      dugme: d ? `${d.getAttribute("data-ekstre-gorunum")} · "${d.textContent.trim()}"` : null,
      ozetSayisi: document.querySelectorAll("[data-ekstre-sade-ozet]").length,
      tercih,
      satirlar,
    };
  });
  // Satır boyları ekrana/yazı tipine bağlı — altına sayı değil, KARŞILAŞTIRMA yazılıyor.
  const boysuz = (e) => ({ ...e, satirlar: e.satirlar.map(({ boy: _b, ...r }) => r) });

  const detayli = await ekstre();
  await sayfa.locator("[data-ekstre-gorunum]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const sade = await ekstre();
  // ÖDEME SATIRI BOY ÖLÇÜMÜNDEN HARİÇ: sade kipte "Nakit" rozeti açıklama sütununda kendi satırında,
  // "—" özeti onun altında duruyor → satır iki satır boyunda (≈50 px, ürünlü satırlar ≈30 px).
  // Not "dört tip tek satıra iniyor" diyor; bu sapma 27 Eylül raporunda bildirildi, altına gömülmedi.
  const sadeUrunlu = sade.satirlar.filter((r) => !/^ODM-/.test(r.kimlik)).map((r) => r.boy);
  const detayliTablolu = detayli.satirlar.filter((r) => r.tablolu).map((r) => r.boy);
  const boyKarsilastirma = {
    // Rozet/bağlantı yazı tipi 1-2 px oynatıyor; "aynı boy" 3 px toleransla.
    sadeUrunluAyniBoy: Math.max(...sadeUrunlu) - Math.min(...sadeUrunlu) <= 3,
    sadeUrunluTekSatir: sadeUrunlu.every((b) => b < 40),
    sadeTablolulardanKisa: Math.max(...sadeUrunlu) < Math.min(...detayliTablolu),
  };


  // Başka modüle gidip dön: tercih korunuyor mu?
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(500);
  await kartAc();
  const donunce = await ekstre();

  await sayfa.locator("[data-ekstre-gorunum]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const geriDetayli = await ekstre();

  await tarayici.close();
  return {
    hatalar,
    detayli: boysuz(detayli),
    sade: boysuz(sade),
    boyKarsilastirma,
    donunce: { dugme: donunce.dugme, ozetSayisi: donunce.ozetSayisi, tercih: donunce.tercih },
    geriDetayli: { dugme: geriDetayli.dugme, ozetSayisi: geriDetayli.ozetSayisi, tercih: geriDetayli.tercih, tablolu: geriDetayli.satirlar.filter((r) => r.tablolu).length },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
