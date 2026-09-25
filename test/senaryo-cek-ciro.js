// SENARYO — ÇEK CİROSU.
//
// Kullanıcı (6 Eylül): "Elimizdeki çekleri ciro edebilmek için ya cariden ya da çek ekranından
// işlem yapabileyim. Çek içine girip 'ciro et' dediğimizde başka cariye çıkış yapsın. Kur
// çevirici mantığını unutma."
//
// Ciro, elimizdeki bir çeki BAŞKA BİR CARİYE vermektir: o cariye olan borcumuz azalır, yani
// muhasebe olarak bir ÖDEMEDİR. KASA HAREKETİ YOK — çek nakit değil, para vadesinde el değiştirir.
//
// Ölçülen dört şey:
//   1. Ciro yalnız PORTFÖYDEKİ çekte açılıyor.
//   2. Kur çevirici çalışıyor: 42.000 ₺'lik çek USD seçilince 1000 $ oluyor.
//   3. Çek "Ciro Edildi" oluyor ve kime verildiği kaydediliyor.
//   4. Cariye ÖDEME yönünde hareket yazılıyor ve ekstrede çekin kendi tutarı görünüyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], bankalar: [], kurlar: { USD: 42, EUR: 56 },
    cekler: [
      { id: "c1", durum: "Portföyde", tip: "Alınan", cekNo: "12345", cariId: "c2", tutar: 42000, paraBirimi: "TRY", vadeTarihi: "2026-12-01", banka: "Ziraat" },
      // Ciro edilmiş çek yeniden ciro EDİLEMEMELİ: aynı çeki iki kez vermek olurdu.
      { id: "cek-eski", durum: "Ciro Edildi", tip: "Alınan", cekNo: "99999", cariId: "c2", tutar: 5000, paraBirimi: "TRY", vadeTarihi: "2026-11-01", banka: "Ziraat" },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  await sayfa.getByRole("button", { name: "Muhasebe", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => x.textContent.trim() === "Çek" && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(700);

  // İki çek var ama YALNIZ biri portföyde: bir tane "Ciro Et" düğmesi olmalı.
  // İki çek var ama ciro edilmiş olanda YAPILACAK İŞLEM YOK — düğme hiç çıkmıyor.
  // GÖRÜNÜRLÜK SÜZGECİ ŞART: gizli kaplarda duran düğmeler de sayılıyordu. Bu oturumda dördüncü
  // kez aynı tuzak (bkz. "Özel Kodlar" adında iki düğme, sipariş satırı seçimi).
  const ciroDugmeSayisi = await sayfa.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => /İşlemler/.test(b.textContent) && b.getBoundingClientRect().width > 0).length);

  await sayfa.locator('button:has-text("İşlemler"):visible').first().click();
  await sayfa.waitForTimeout(600);
  // BEŞ İŞLEM MENÜDE. Hangilerinin çıkacağına `cekIzinliIslemler` karar veriyor.
  const menuIslemleri = await sayfa.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => (b.querySelector("b") ? b.querySelector("b").textContent.trim() : ""))
      .filter(Boolean));
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Çeki başka bir cariye ver/.test(x.textContent));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(500);
  const panelAcildi = await sayfa.evaluate(() => /Kime ciro ediliyor/.test(document.body.innerText));

  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")]
      .find((x) => [...x.options].some((o) => /Tedarikçi A/.test(o.textContent)));
    const o = [...s.options].find((x) => /Tedarikçi A/.test(x.textContent));
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  // Cariye USD işlensin: çek TRY, yani kur çevirici devreye giriyor.
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")]
      .filter((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR").pop();
    s.value = "USD";
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(600);

  const panelDegerleri = await sayfa.evaluate(() =>
    [...document.querySelectorAll('input[type="number"]')]
      .filter((x) => x.getBoundingClientRect().width > 0)
      .map((x) => x.value));

  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .filter((x) => x.getBoundingClientRect().width > 0)
      .find((x) => x.textContent.trim() === "Ciro Et");
    if (b) b.click();
  });
  await sayfa.waitForTimeout(1500);

  const m = await depoOku(sayfa, "muhasebe:data");
  const cek = ((m || {}).cekler || []).find((c) => c.id === "c1") || {};
  const cariler = await depoOku(sayfa, "cari:data");
  const alici = (cariler || []).find((c) => c.unvan === "Tedarikçi A") || {};
  const hareket = (alici.hareketler || [])[0] || {};

  await tarayici.close();
  return {
    hatalar,
    ciroDugmeSayisi,
    menuIslemleri,
    panelAcildi,
    // Son iki kutu: cariye işlenecek tutar (1000) ve kur (42).
    ciroTutariVeKur: panelDegerleri.slice(-2),
    cek: { durum: cek.durum, ciroTutar: cek.ciroTutar, ciroPB: cek.ciroPB },
    // GEÇMİŞ: aşama aşama ilerlediği için kayıt tutuluyor (kullanıcı, 6 Eylül).
    gecmis: (cek.gecmis || []).map((g) => [g.islem, g.oncekiDurum, g.yeniDurum, g.cariAd]),
    // ÖDEME yönü "Borç" (bkz. hareketYonu). Karşı taraf çekin KENDİ tutarı.
    cariHareketi: {
      yon: hareket.yon, tutar: hareket.tutar, paraBirimi: hareket.paraBirimi,
      hesapAd: hareket.hesapAd, hesapTutar: hareket.hesapTutar, hesapPB: hareket.hesapPB,
      fisiVar: !!hareket.fisNo,
    },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
