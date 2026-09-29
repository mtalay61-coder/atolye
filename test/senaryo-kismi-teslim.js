// SENARYO — PROSESTE KISMİ TESLİM: KALAN USTADA AÇIK İŞ OLARAK KALIR (29 Eylül, v1.537.0 — son denetim).
//
// Hata: teslim formu "X çift ustada kalıyor — sonra teslim edilebilir" diyordu ama atama tüm miktarıyla
// "tamamlandı" işaretleniyor, kalan için iş kalmıyordu; tek proseste üretim eksik miktarla bitmiş sayılıyordu.
// Kurulum: 1002 — Bot Siyah 41:3, tek proses (Kesim), Personel C'ye verilmiş.
// Ölçülen:
//   1) 3'ün 2'si sağlam teslim → ilk atama 2 çift tamamlandı; aynı ustada 1 çiftlik AÇIK atama; adım/üretim bitmedi;
//      stoğa 2 girdi;
//   2) kalan 1 çift teslim → adım ve üretim tamamlandı, stoğa toplam 3 girdi.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up2", siparisNo: "1002", takipKodu: "1002", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
    stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "c3",
      atamalar: [{ id: "at2", personelId: "c3", miktar: 3, bedenMiktarlari: { "41": 3 }, barkod: "1002",
        verildiMi: true, tamamlandiMi: false, verilmeTarihi: "2026-09-02" }] }],
  }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2500);
  const stok41 = async () => {
    const u = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
    return ((u.variants || []).find((v) => v.renk === "Siyah" && v.beden === "41") || {}).miktar;
  };
  const once = await stok41();
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("1002", { exact: true }).last().click();
  await sayfa.waitForTimeout(900);
  // Teslim formundaki ilk sayı kutusu = 41 bedeninin SAĞLAM miktarı.
  const saglam = sayfa.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//input[@type='number']][1]").locator("input[type=number]").first();
  await saglam.fill("2");
  await sayfa.waitForTimeout(200);
  const bilgi = await sayfa.evaluate(() => /1 çift ustada kalıyor/.test(document.body.innerText));
  await sayfa.locator("[data-teslim-al]:visible").first().click();
  await sayfa.waitForTimeout(1500);
  const u1 = ((await depoOku(sayfa, "uretim:siparisler")) || []).find((u) => u.id === "up2");
  const adim1 = u1.prosesIlerleme[0];
  const sonra1 = await stok41();

  // Kalan 1 çift: açık atamanın formu (varsayılan: kalanın tamamı sağlam).
  await sayfa.locator("[data-teslim-al]:visible").first().click();
  await sayfa.waitForTimeout(1500);
  const u2 = ((await depoOku(sayfa, "uretim:siparisler")) || []).find((u) => u.id === "up2");
  const sonra2 = await stok41();
  await tarayici.close();
  const atamaOzeti = (a) => `${a.miktar} çift · ${a.tamamlandiMi ? "tamamlandı" : "açık"} · usta ${a.personelId} · ${JSON.stringify(a.bedenMiktarlari)}`;
  return {
    hatalar, ustadaKaliyorBilgisi: bilgi,
    ilkTeslimSonrasi: { atamalar: adim1.atamalar.map(atamaOzeti), adimTamam: !!adim1.tamamlandiMi, stogaEklendi: !!u1.stogaEklendiMi, stokArtisi: sonra1 - once },
    kalanTeslimSonrasi: { atamalar: u2.prosesIlerleme[0].atamalar.map(atamaOzeti), adimTamam: !!u2.prosesIlerleme[0].tamamlandiMi, stogaEklendi: !!u2.stogaEklendiMi, stokArtisi: sonra2 - once },
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
