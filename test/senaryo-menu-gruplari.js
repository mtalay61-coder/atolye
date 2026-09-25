// SENARYO — MENÜ GRUPLARI (kullanıcı, 17 Eylül: "soldaki bar çok uzayacak, birleştirelim; mesela
// Depo ana başlık olsun, altına Stok eklensin").
//
// 14 modül tek düzlemdeydi. Artık dört grup: Depo · Üretim · Siparişler · Finans. Anasayfa,
// Planlama, Sohbet ve Günlük grupsuz.
//
// ÜST MENÜ (v1.449.0): yan menü kalktı, gruplar üstte açılır liste. "daraltilmis" ölçümü artık
// menünün İLK hâli: 4 grup düğmesi + 4 grupsuz öğe görünür, grup içerikleri kapalı. "Genişlet"
// düğmesi yok (tıklama boşa düşüyor); grup açılınca içindekiler görünür.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);

  // Daraltılmışken: grup başlığı yok, bütün modüller görünür.
  const daraltilmis = await sayfa.evaluate(() => ({
    grupSayisi: document.querySelectorAll("[data-nav-grup]").length,
    navSayisi: [...document.querySelectorAll("[data-nav]")].filter((e) => e.offsetParent).length,
  }));

  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /genişlet/i.test(x.getAttribute("title") || ""));
    if (b) b.click();
  });
  await sayfa.waitForTimeout(700);

  const genis = await sayfa.evaluate(() => ({
    gruplar: [...document.querySelectorAll("[data-nav-grup]")].map((e) => e.getAttribute("data-nav-grup")),
    grupsuzlar: [...document.querySelectorAll("[data-nav]")].filter((e) => e.offsetParent).map((e) => e.getAttribute("data-nav")),
  }));

  // FİŞLER İKİYE AYRILDI (17 Eylül): "Stok Fişleri" Depo altında, "Muhasebe Fişleri" Finans
  // altında. Aynı modül `kapsam` ile açılıyor.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Finans"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const finansAltinda = await sayfa.evaluate(() =>
    [...document.querySelectorAll("[data-nav]")].filter((e) => e.offsetParent).map((e) => e.getAttribute("data-nav")));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Fişler"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const paraFisleri = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return { basligi: /Muhasebe Fişleri/.test(m), uretimFisiYok: !/Üretim Çıkışı/.test(m) };
  });
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Finans"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  // Grup açılıyor mu: Depo başlığına dokun.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Depo"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const depoAcik = await sayfa.evaluate(() =>
    [...document.querySelectorAll("[data-nav]")].filter((e) => e.offsetParent).map((e) => e.getAttribute("data-nav")));

  // Aktif modülün grubu kendiliğinden açık: Muhasebe'ye gidince Finans açılmalı.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Finans"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Muhasebe"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  // Finans grubunu elle kapat; aktif modül içinde olduğu için açık kalmalı.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav-grup="Finans"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const aktifGrupAcikKaldi = await sayfa.evaluate(() =>
    [...document.querySelectorAll("[data-nav]")].some((e) => e.offsetParent && e.getAttribute("data-nav") === "Muhasebe"));

  // FİŞ KARTI İŞLEMLER MENÜSÜ (18 Eylül): bağlantı düğmeleri açıkta duruyordu, artık tek
  // düğmenin arkasında; cari adı başlıkta tıklanabilir ve alttaki ikinci "carisine git" kalktı.
  await modulAc(sayfa, "Fişler");
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /1001-Kesim/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const fisKarti = await sayfa.evaluate(() => ({
    islemlerDugmesi: !!document.querySelector("[data-fis-islemler]"),
    menuKapaliBasliyor: !(document.querySelector("[data-islem-cari]") || {}).offsetParent,
    cariAdiTiklanabilir: !!document.querySelector("[data-fis-cari]"),
    ikinciCariDugmesiYok: !/carisine git/.test(
      [...document.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.textContent).join(" ")),
  }));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-fis-islemler]"); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const menuAcik = await sayfa.evaluate(() => /İlgili üretime git|İlgili siparişe git/.test(document.body.innerText));

  await tarayici.close();
  return { hatalar, daraltilmis, genis, finansAltinda, paraFisleri, depoAcik, aktifGrupAcikKaldi, fisKarti, menuAcik };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
