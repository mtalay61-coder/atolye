// SENARYO — ÇİFT YÖNLÜ KUR ÇEVİRİCİ.
//
// Kullanıcı (6 Eylül): "Cari için 42000 TL ödeme verdi ve 1000 USD tutuluyor. Kur ayarlamak yerine
// cariye işlenecek olan yere 1000 yazdığımızda kuru otomatik düzenlesin. Bu kural tüm para birimi
// çeviricilerde olsun."
//
// Hangi sayının bilindiği duruma göre değişiyor: bazen kur ("bugün dolar 42"), bazen karşı
// taraftaki tutar ("1000 dolara sayıyoruz"). Tek yönlü bir form, bilinmeyeni bilinenden ELLE
// hesaplatıyordu.
//
// Ölçülen üç şey:
//   1. Tutar girilince kur ÖN DOLUYOR ve hedef tutar hesaplanıyor.
//   2. HEDEF TUTAR yazılınca kur geri hesaplanıyor.
//   3. KUR yazılınca hedef tutar yeniden hesaplanıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }],
    bankalar: [], cekler: [], kurlar: { USD: 42, EUR: 56 },
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Muhasebe");
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("*")]
      .filter((x) => x.children.length === 0 && /^TL Kasa$/.test(x.textContent.trim()))[0];
    if (e) e.click();
  });
  await sayfa.waitForTimeout(900);
  // İŞLEM ÇUBUĞU (17 Eylül): kasa formu artık işlem seçilince açılıyor.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-islem="tahsilat"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);

  // Cari seç ve dönüştürülecek para birimini USD yap: TL kasa → USD cari, yani çevrim gerekiyor.
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")]
      .find((x) => [...x.options].some((o) => /Müşteri B/.test(o.textContent)));
    const o = [...s.options].find((x) => /Müşteri B/.test(x.textContent));
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")]
      .filter((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR")[0];
    s.value = "USD";
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(500);

  // ALANLAR ETİKETİNDEN BULUNUYOR, İNDEKSTEN DEĞİL.
  //
  // Önce görünür sayı kutularının sırasına dayanıyordu ([2]=tutar, [3]=kur…). Muhasebe ekranının
  // üstündeki USD/EUR kur kutuları kaldırılınca (7 Eylül) bütün indeksler kaydı ve senaryo
  // anlamsız yerlere yazmaya başladı. Etiket, ekran düzeni değişince de doğru alanı bulur.
  const alan = (etiketDeseni) => sayfa.evaluate((desen) => {
    const l = [...document.querySelectorAll("label")].find((x) => new RegExp(desen).test(x.textContent));
    const i = l ? l.querySelector("input") : null;
    return i ? i.value : null;
  }, etiketDeseni);

  const kutular = async () => ({
    tutar: await alan("^Tutar"),
    kur: await alan("^Kur \\(1"),
    hedef: await alan("Cariye İşlecek Tutar"),
  });

  const yaz = async (etiketDeseni, deger) => {
    await sayfa.evaluate(([desen, v]) => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      const l = [...document.querySelectorAll("label")].find((x) => new RegExp(desen).test(x.textContent));
      const el = l ? l.querySelector("input") : null;
      if (!el) throw new Error(`alan bulunamadı: ${desen}`);
      set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, [etiketDeseni, deger]);
    await sayfa.waitForTimeout(600);
  };

  await yaz("^Tutar", "42000");
  const tutarSonrasi = await kutular();

  // 2. HEDEF TUTARDAN KURA: 42000 / 800 = 52,5.
  await yaz("Cariye İşlecek Tutar", "800");
  const hedeftenKura = await kutular();

  // 3. KURDAN HEDEF TUTARA: 42000 / 40 = 1050.
  await yaz("^Kur \\(1", "40");
  const kurdanHedefe = await kutular();

  await tarayici.close();
  return {
    hatalar,
    // Tutar girilince kur güncel kurdan ön doluyor, hedef ondan hesaplanıyor.
    tutarSonrasi: { kur: tutarSonrasi.kur, hedef: tutarSonrasi.hedef },
    hedeftenKura: { kur: hedeftenKura.kur, hedef: hedeftenKura.hedef },
    kurdanHedefe: { kur: kurdanHedefe.kur, hedef: kurdanHedefe.hedef },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
