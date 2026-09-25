// SENARYO — SİPARİŞ MATRİSİ PLANLAMAYLA DEĞİŞMEZ (kullanıcı, 19 Eylül: "üstte siparişin tamamı
// görünecek, sipariş planlandığında üstte değişiklik olmayacak, sekmeler gösterecek").
//
// Planlama yapılınca sipariş kalemi İKİYE BÖLÜNÜYOR: planlanan parça + kalan parça. Bu doğru bir
// kayıt tekniği (her parça kendi tedarik kaydını taşır) ama matris her bedene TEK kalem koyuyordu;
// son yazılan kazandığı için 12 çiftlik beden planlandıkça 4'e düşmüş görünüyordu.
//
// Ölçülen: aynı renk+beden için iki kalem (biri planlanmış) olduğunda matris hücresi İKİSİNİN
// TOPLAMINI gösteriyor ve ADET sütunuyla tutarlı kalıyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  // Bordo 41: 8 çift planlanmış + 4 çift kalan = sipariş 12 çift.
  t["siparis:data"] = JSON.stringify([{
    id: "s1", siparisNo: "SAT-9001", tip: "Satış", cariId: "c2", cariAd: "Müşteri B",
    tarih: "2026-09-19", durum: "Bekliyor",
    kalemler: [
      { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 8, birimFiyat: 900, paraBirimi: "TRY",
        karsilanan: 0, planlama: { tip: "Üretim", referansNo: "10001" } },
      { id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 4, birimFiyat: 900, paraBirimi: "TRY",
        karsilanan: 0 },
      // FAZLA SEVK: 6 istendi, 9 sevk edildi — durum bunu söylemeli.
      { id: "k3", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 6, birimFiyat: 900, paraBirimi: "TRY",
        karsilanan: 9 },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sipariş"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /SAT-9001/.test((e.textContent || "").trim()));
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);

  // FAZLA SEVK (19 Eylül): karşılanan miktar siparişi aşınca durum bunu söylemeli.
  const fazlaSevk = await sayfa.evaluate(() => /Fazla sevk/.test(document.body.innerText));

  // PLANLAMA BOŞ MESAJI (19 Eylül): bu siparişte planlanacak kalem VAR, o yüzden mesaj
  // çıkmamalı (null). Mesajın kendisi ancak tüm kalemler karşılandığında görünür.
  const planlamaBos = await sayfa.evaluate(() => {
    const p = document.querySelector("[data-planlama-bos]");
    return p ? p.innerText.replace(/\n/g, " ").slice(0, 90) : null;
  });

  const matris = await sayfa.evaluate(() => {
    const m = document.body.innerText.replace(/\n/g, " | ");
    const i = m.indexOf("Siyah");
    return { kesit: i < 0 ? "" : m.slice(i, i + 90) };
  });

  await tarayici.close();
  return { hatalar, fazlaSevk, planlamaBos, matris };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
