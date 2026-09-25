// SENARYO — KASA İŞLEM ÇUBUĞU VE VİRMAN (kullanıcı, 17 Eylül: "kasa seçildiğinde ilk olarak
// hareketleri getirsin; hareketlerin üzerinde ödeme, tahsilat, kasalar arası virman yapabileceğimiz
// işlemler butonu olsun, oralardan işlem yapalım").
//
// Ölçülen: (1) hesap açılınca form DEĞİL hareketler görünüyor, üstte dört işlem düğmesi var;
// (2) virman kaynaktan çıkış, hedefe giriş yazıyor, VRM fişiyle; (3) farklı para biriminde hedefe
// geçen tutar ayrıca soruluyor (kur tahmin edilmiyor).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [
      { id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [{ id: "m0", tarih: "2026-09-10", yon: "Giriş", tutar: 1000, aciklama: "açılış", defter: "Genel" }] },
      { id: "k2", ad: "USD Kasa", paraBirimi: "USD", hareketler: [] },
    ],
  });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Kasa & Banka");
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  const acilis = await sayfa.evaluate(() => ({
    islemDugmeleri: [...document.querySelectorAll("[data-islem]")].map((e) => e.getAttribute("data-islem")),
    formKapali: !document.querySelector("[data-virman-formu]"),
    hareketGorunur: /açılış/.test(document.body.innerText),
  }));

  await sayfa.evaluate(() => { const b = document.querySelector('[data-islem="virman"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-virman-hedef]");
    const o = [...s.options].find((x) => /USD Kasa/.test(x.textContent));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-virman-tutar]").fill("480");
  await sayfa.waitForTimeout(300);
  const hedefTutarSoruldu = await sayfa.evaluate(() => !!document.querySelector("[data-virman-hedef-tutar]"));
  await sayfa.locator("[data-virman-hedef-tutar]").fill("10");
  // SEBEP ZORUNLU (17 Eylül): seçilmeden kaydedilmiyor.
  // ÖĞRENEN LİSTE (17 Eylül): alan serbest yazılıyor, öneriler datalist'te.
  const sebepSecenekleri = await sayfa.evaluate(() => {
    const dl = document.getElementById("virman-sebep-onerileri");
    return dl ? [...dl.options].map((o) => o.value).slice(0, 3) : [];
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-virman-kaydet]"); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const sebepsizKaydedilmedi = await sayfa.evaluate(() => !!document.querySelector("[data-virman-formu]"));
  // Listede olmayan YENİ bir sebep yazılıyor: bir dahaki sefere önerilere girmeli.
  await sayfa.locator("[data-virman-sebep]").fill("Kira için nakit");
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-virman-kaydet]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1500);

  const m = await depoOku(sayfa, "muhasebe:data");
  const sonuc = {
    tlKasa: (m.kasalar[0].hareketler || []).map((x) => `${x.yon}:${x.tutar}:${(x.fisNo || "").slice(0, 3)}`),
    usdKasa: (m.kasalar[1].hareketler || []).map((x) => `${x.yon}:${x.tutar}:${(x.fisNo || "").slice(0, 3)}`),
    sebep: (() => {
      const a2 = (m.kasalar[0].hareketler || []).find((x) => x.virmanMi);
      return a2 && a2.virmanSebebi;
    })(),
    aciklama: (() => {
      const a2 = (m.kasalar[0].hareketler || []).find((x) => x.virmanMi);
      return a2 && a2.aciklama;
    })(),
    ayniBag: (() => {
      const a = (m.kasalar[0].hareketler || []).find((x) => x.virmanMi);
      const b = (m.kasalar[1].hareketler || []).find((x) => x.virmanMi);
      return !!(a && b && a.muhasebeBagId === b.muhasebeBagId);
    })(),
  };

  // ---- DÜZENLEME + ONAYLI SİLME (17 Eylül) ----
  // Cariye bağlı bir ödeme: tutarı düzeltilince cari karşılığı da güncellenmeli.
  const t2 = { ...TOHUM };
  t2["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      { id: "m1", tarih: "2026-09-10", yon: "Çıkış", tutar: 500, aciklama: "Ödeme (TL Kasa)", defter: "Genel", muhasebeBagId: "bag1", cariId: "c1" }] }],
  });
  t2["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((x) => (x.id === "c1"
    ? { ...x, hareketler: [{ id: "h1", tarih: "2026-09-10", yon: "Borç", tutar: 500, paraBirimi: "TRY", muhasebeBagId: "bag1", fisNo: "ODM-1", aciklama: "Ödeme" }] }
    : x)));
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  await modulAc(ikinci.sayfa, "Kasa & Banka");
  await ikinci.sayfa.waitForTimeout(900);
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(800);
  const duzenleDugmesi = await ikinci.sayfa.evaluate(() => !!document.querySelector("[data-hareket-duzenle]"));
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector("[data-hareket-duzenle]"); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(500);
  await ikinci.sayfa.locator("[data-duzenle-tutar]").fill("650");
  await ikinci.sayfa.locator("[data-duzenle-aciklama]").fill("Ödeme düzeltildi");
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector("[data-duzenle-kaydet]"); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(1500);
  const duzenleme = {
    duzenleDugmesi,
    kasa: (((await depoOku(ikinci.sayfa, "muhasebe:data")).kasalar[0].hareketler) || []).map((x) => `${x.yon}:${x.tutar}:${x.aciklama}`),
    cariKarsiligi: ((await depoOku(ikinci.sayfa, "cari:data")).find((x) => x.id === "c1").hareketler || []).map((x) => `${x.yon}:${x.tutar}`),
  };
  await ikinci.tarayici.close();

  // ---- ÖĞRENEN LİSTE: yazılan sebep bir sonraki virmanda öneriliyor ----
  const t3 = { ...TOHUM };
  t3["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [
      { id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [{ id: "v1", tarih: "2026-09-16", yon: "Çıkış", tutar: 100, virmanMi: true, virmanSebebi: "Kira için nakit", aciklama: "Virman → USD Kasa · Kira için nakit", defter: "Genel" }] },
      { id: "k2", ad: "USD Kasa", paraBirimi: "USD", hareketler: [] },
    ],
  });
  const ucuncu = await uygulamaAc(t3, { hataYaz: false });
  ucuncu.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ucuncu.sayfa.waitForTimeout(2400);
  await modulAc(ucuncu.sayfa, "Kasa & Banka");
  await ucuncu.sayfa.waitForTimeout(900);
  await ucuncu.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await ucuncu.sayfa.waitForTimeout(700);
  await ucuncu.sayfa.evaluate(() => { const b = document.querySelector('[data-islem="virman"]'); if (b) b.click(); });
  await ucuncu.sayfa.waitForTimeout(500);
  const ogrenenListe = await ucuncu.sayfa.evaluate(() => {
    const dl = document.getElementById("virman-sebep-onerileri");
    return dl ? [...dl.options].map((o) => o.value) : [];
  });
  await ucuncu.tarayici.close();

  // ---- VİRMAN TEK İŞLEM: bir ayağı silmek ikisini de siler (17 Eylül) ----
  const t4 = { ...TOHUM };
  t4["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [
      { id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
        { id: "v-cikis", tarih: "2026-09-17", yon: "Çıkış", tutar: 480, virmanMi: true, muhasebeBagId: "vbag", fisNo: "VRM-1", virmanSebebi: "Döviz bozdurma", aciklama: "Virman → USD Kasa · Döviz bozdurma", defter: "Genel", kullanici: "Mahmut" }] },
      { id: "k2", ad: "USD Kasa", paraBirimi: "USD", hareketler: [
        { id: "v-giris", tarih: "2026-09-17", yon: "Giriş", tutar: 10, virmanMi: true, muhasebeBagId: "vbag", fisNo: "VRM-1", virmanSebebi: "Döviz bozdurma", aciklama: "Virman ← TL Kasa · Döviz bozdurma", defter: "Genel", kullanici: "Mahmut" }] },
    ],
  });
  const dorduncu = await uygulamaAc(t4, { hataYaz: false });
  dorduncu.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  dorduncu.sayfa.on("dialog", (d) => d.accept());
  await dorduncu.sayfa.waitForTimeout(2400);
  await modulAc(dorduncu.sayfa, "Kasa & Banka");
  await dorduncu.sayfa.waitForTimeout(900);
  await dorduncu.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /TL Kasa/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await dorduncu.sayfa.waitForTimeout(800);
  // Virman satırı düzenlenemez, ama silinebilir (onaylı: iki dokunuş).
  const virmanDuzenlenemez = await dorduncu.sayfa.evaluate(() => !document.querySelector("[data-hareket-duzenle]"));
  // Onay artık pencere (21 Eylül): ilk tık satırdaki ikon, ikinci adım penceredeki Sil.
  {
    await dorduncu.sayfa.evaluate(() => {
      const tr = [...document.querySelectorAll("tr")].find((x) => x.getBoundingClientRect().width > 0 && /Virman/.test(x.textContent));
      const b = tr && tr.querySelector("button[title*='sil'], button[title*='Sil'], button[title*='Emin']");
      if (b) b.click();
    });
    await dorduncu.sayfa.waitForTimeout(500);
  }
  await dorduncu.sayfa.locator("[data-sil-onayla]").first().click();
  await dorduncu.sayfa.waitForTimeout(500);
  await dorduncu.sayfa.waitForTimeout(1200);
  const virmanSilme = await (async () => {
    const m2 = await depoOku(dorduncu.sayfa, "muhasebe:data");
    return {
      tlKalan: (m2.kasalar[0].hareketler || []).length,
      usdKalan: (m2.kasalar[1].hareketler || []).length,
      virmanDuzenlenemez,
    };
  })();
  await dorduncu.tarayici.close();

  await tarayici.close();
  return { hatalar, virmanSilme, acilis, hedefTutarSoruldu, sebepSecenekleri, sebepsizKaydedilmedi, sonuc, duzenleme, ogrenenListe };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
