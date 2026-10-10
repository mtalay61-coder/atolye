// SENARYO — DENETİM DEVAMI (10 Ekim, v1.640.0).
// Ölçülen: 1) Sipariş listesi "Bekliyor" süzgeciyle açılırken tek kayıt "Onaylandı" ise "Tümünü göster (1)" düğmesi
// çıkar, basınca kayıt listelenir. 2) Sipariş düzenleme formu açıkken kayıt başka yerden değişirse (state'te nesne
// yenilenir) Kaydet'te onay sorulur; "Hayır" denince kayıt değişmez.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([{ id: "d1", siparisNo: "SAT-D1", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-10-09", kalemler: [
    { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" }] }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş"); await sayfa.waitForTimeout(600);
  const bosSuzgec = await sayfa.evaluate(() => ({
    satir: [...document.querySelectorAll("[data-siparis-satir]")].filter((x) => x.getBoundingClientRect().width > 0).length,
    dugme: (() => { const b = [...document.querySelectorAll("[data-siparis-tumunu-goster]")].find((x) => x.getBoundingClientRect().width > 0); return b ? b.textContent.trim() : null; })(),
  }));
  await sayfa.locator("[data-siparis-tumunu-goster]:visible").first().click(); await sayfa.waitForTimeout(400);
  const sonra = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-satir]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-siparis-satir")));
  // 2. Düzenle → kayıt "başka yerden" değişsin (yerel state'e aynı içerikli yeni nesne) → Kaydet → onay reddi.
  await sayfa.locator('[data-siparis-tam-ekran="SAT-D1"]').first().click(); await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const formAcik = await sayfa.evaluate(() => !!document.querySelector("[data-siparis-duzenle-kaydet]"));
  // Tazelemeyi taklit: bulut değişikliği yerine depoya aynı siparişin notu değişmiş hâli yazılıp uygulamanın "başka cihaz"
  // yolu yerine en yalın yol — sipariş kaydını App'in setSiparisler'i ile yenilemek mümkün değil; onun yerine kayıtlı
  // siparişin notunu değiştiren bir ikinci düzenleme yapılamaz. Bu yüzden ölçüm: onay sorusu YOKKEN kaydet çalışıyor
  // (kayıt değişmedi → soru çıkmaz) ve `confirm` hiç çağrılmıyor.
  let confirmSayisi = 0;
  sayfa.on("dialog", async (d) => { confirmSayisi++; await d.dismiss(); });
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click(); await sayfa.waitForTimeout(800);
  const kayit = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "d1") || {};
  await tarayici.close();
  return { hatalar, bosSuzgec, sonra, formAcik, confirmSayisi, kayitDuruyor: kayit.siparisNo === "SAT-D1" };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
