// SENARYO — ÜRÜN KARTINDA RENKİ YAZARAK EKLEME (25 Eylül, v1.452.0).
//
// Kullanıcı: "Renk ekleme yazma ile seçici olsun, yazdıkça elensin liste."
//
// Ölçülenler:
//   1. Kutuya yazınca liste süzülüyor; kelime başı eşleşenler önce ("siy" → Siyah Süet, Siyah Deri).
//   2. Enter ilk sonucu ekliyor; kutu boşalıyor, eklenen renk listeden düşüyor.
//   3. Dokunarak (mousedown) seçim de ekliyor; eşleşme yoksa "eşleşen yok" yazıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.renkler = ["Siyah Süet", "Kahve Süet", "Taba Süet", "Siyah Deri", "Nohut Deri", "Kırık Siyah"]
    .map((ad, i) => ({ id: `r${i}`, ad, tip: "Mamul", kod: String(10 + i) }));
  // Hammadde formu yalnız HAMMADDE tipli renkleri gösteriyor (malzeme tipi süzgeci).
  tanim.renkler.push(...["Siyah Deri H", "Taba Deri H", "Krem Astar"].map((ad, i) => ({ id: `h${i}`, ad, tip: "Hammadde", kod: String(50 + i) })));
  // ÖZEL KOD ÖNERİSİ (v1.454.0): genel "Taban" alanı; iki üründe değer var.
  tanim.ozelKodAlanlari = [{ id: "okTaban", ad: "Taban", kapsamTuru: "genel" }];
  const stokT = JSON.parse(TOHUM["stok:items"]);
  stokT[0].ozelKodlar = { okTaban: "147" };
  stokT[1].ozelKodlar = { okTaban: "152" };
  t["stok:items"] = JSON.stringify(stokT);
  t["tanimlar:data"] = JSON.stringify(tanim);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(600);
  // Yeni ürünün kategorisi seçili liste sekmesinden geliyor; renk arama kutusu MAMUL formunda
  // (hammaddede renkler düğme olarak çiziliyor).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Mamul\s*\d*$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);

  // Özel kod: "14" yaz → yalnız "147" önerilir; dokununca kutuya yazılır.
  const okKutu = sayfa.locator("[data-ozel-kod-arama]").first();
  const ozelKod = { kutuVar: (await okKutu.count()) > 0 };
  if (ozelKod.kutuVar) {
    await okKutu.click();
    await okKutu.type("14");
    await sayfa.waitForTimeout(200);
    ozelKod.oneriler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].map((b) => b.getAttribute("data-aramali-oneri")));
    await sayfa.locator('[data-aramali-oneri="147"]').dispatchEvent("mousedown");
    await sayfa.waitForTimeout(200);
    ozelKod.deger = await okKutu.inputValue();
    // Serbest değer: listede olmayan yazılabiliyor.
    await okKutu.fill("999X");
    ozelKod.serbest = await okKutu.inputValue();
  }

  const kutu = sayfa.locator("[data-renk-ekle-arama]").first();
  const kutuVar = (await kutu.count()) > 0;
  const liste = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-secenek]")].map((b) => b.getAttribute("data-aramali-secenek")));

  await kutu.click();
  await sayfa.waitForTimeout(200);
  const tumu = await liste();
  await kutu.type("siy");
  await sayfa.waitForTimeout(200);
  const siy = await liste();
  await kutu.press("Enter");
  await sayfa.waitForTimeout(400);
  const enterSonrasi = {
    kutuBos: (await kutu.inputValue()) === "",
    liste: await liste(),
  };
  await kutu.type("nohut");
  await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-aramali-secenek="Nohut Deri"]').dispatchEvent("mousedown");
  await sayfa.waitForTimeout(400);
  await kutu.type("mor");
  await sayfa.waitForTimeout(200);
  const eslesmeYok = await sayfa.evaluate(() => /"mor" ile eşleşen yok/.test(document.body.innerText));
  // Eklenen renkler (form çipleri): seçili renk adları sayfada çip olarak duruyor.
  const cipler = await sayfa.evaluate(() => ["Siyah Süet", "Nohut Deri", "Kahve Süet"]
    .filter((ad) => [...document.querySelectorAll("span, button, div")].some((e) => e.children.length <= 1 && e.textContent.trim() === ad && !e.hasAttribute("data-aramali-secenek") && e.getBoundingClientRect().width > 0)));

  // HAMMADDE FORMU (v1.453.0, kullanıcı: "bu tek liste olsun, kutu boş gelsin, yazdıkça liste
  // daralsın"): renkler artık düğme dizisi değil, aynı arama kutusu + seçilenler etiket olarak.
  await tarayici.close();
  const ikinci = await uygulamaAc(t, { hataYaz: false });
  const s2 = ikinci.sayfa;
  s2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await s2.waitForTimeout(2300);
  await modulAc(s2, "Stok");
  await s2.waitForTimeout(600);
  await s2.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Hammadde\s*\d*$/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await s2.waitForTimeout(400);
  await s2.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Ürün Ekle/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await s2.waitForTimeout(700);
  const hKutu = s2.locator("[data-hammadde-renk-arama]").first();
  const hammadde = { kutuVar: (await hKutu.count()) > 0 };
  if (hammadde.kutuVar) {
    hammadde.bosBasliyor = (await hKutu.inputValue()) === "";
    await hKutu.click();
    await hKutu.type("der");
    await s2.waitForTimeout(200);
    hammadde.der = await s2.evaluate(() => [...document.querySelectorAll("[data-aramali-secenek]")].map((b) => b.getAttribute("data-aramali-secenek")));
    await hKutu.press("Enter");
    await s2.waitForTimeout(400);
    hammadde.etiketler = await s2.evaluate(() => [...document.querySelectorAll("[data-secili-renkler] > span")].map((e) => e.textContent.trim()));
    await s2.evaluate(() => { const b = document.querySelector('[data-secili-renkler] button'); if (b) b.click(); });
    await s2.waitForTimeout(300);
    hammadde.cikarildi = await s2.evaluate(() => !document.querySelector("[data-secili-renkler]"));
  }

  await ikinci.tarayici.close();
  return { hatalar, kutuVar, tumu, siy, enterSonrasi, eslesmeYok, cipler, hammadde, ozelKod };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
