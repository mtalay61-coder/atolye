// SENARYO — KASA İŞLEM ÇUBUĞU VE VİRMAN (kullanıcı, 17 Eylül: "kasa seçildiğinde ilk olarak
// hareketleri getirsin; hareketlerin üzerinde ödeme, tahsilat, kasalar arası virman yapabileceğimiz
// işlemler butonu olsun, oralardan işlem yapalım").
//
// v1.744.35 (kullanıcı 23 Kasım: "virmanı cari içerisinden yapalım, [Kasa & Banka'dan] kaldıralım"): kasalar arası Virman
// düğmesi ve formu GİZLİ → işlem çubuğu boş; virman kaydı / sebep önerileri bölümleri bu senaryodan çıktı (yeni virman:
// senaryo-cari-virman). KALAN ölçüler: (1) hesap açılınca form DEĞİL hareketler görünüyor, işlem düğmesi yok;
// (2) cariye bağlı ödeme düzeltilince cari karşılığı da güncelleniyor; (3) ESKİ virman kaydı (canlıda var olan VRM ayakları)
// düzenlenmez ama silinir, bir ayağı silmek ikisini de siler.
const { uygulamaAc, depoOku, modulAc, sagTikAc, sagTikSec } = require("./ortak.js");
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
  // v1.636.0: Düzenle ikonu satırdan kalktı — hareket satırına sağ tık → "Düzenle".
  const duzenleDugmesi = await sagTikSec(ikinci.sayfa, "[data-kasa-hareket-satir]", "duzenle");
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
  // v1.636.0: virman satırının sağ tık menüsünde "Düzenle" yok (yerine pasif "Virman düzenlenmez").
  await sagTikAc(dorduncu.sayfa, "[data-kasa-hareket-satir]"); await dorduncu.sayfa.waitForTimeout(300);
  const virmanDuzenlenemez = await dorduncu.sayfa.evaluate(() => !document.querySelector('[data-sag-tik-menusu] [data-sag-tik="duzenle"]') && !!document.querySelector('[data-sag-tik-menusu] [data-sag-tik="virman-not"]'));
  await dorduncu.sayfa.keyboard.press("Escape"); await dorduncu.sayfa.waitForTimeout(200);
  // Onay artık pencere (21 Eylül): ilk tık satırdaki ikon, ikinci adım penceredeki Sil.
  {
    // v1.636.0: sil satırdan kalktı — virman satırına sağ tık → "Sil" → standart onay penceresi.
    const vid = await dorduncu.sayfa.evaluate(() => {
      const tr = [...document.querySelectorAll("tr[data-kasa-hareket-satir]")].find((x) => x.getBoundingClientRect().width > 0 && /Virman/.test(x.textContent));
      return tr ? tr.getAttribute("data-kasa-hareket-satir") : null;
    });
    if (vid) await sagTikSec(dorduncu.sayfa, `[data-kasa-hareket-satir="${vid}"]`, "sil");
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
  return { hatalar, virmanSilme, acilis, duzenleme };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
