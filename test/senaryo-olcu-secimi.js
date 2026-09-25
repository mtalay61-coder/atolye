// SENARYO — ÖLÇÜ SEÇİMİ (kullanıcı, 18 Eylül: "boyut olan ürünlerde tüm boyutlar gelmesin, seçim
// ile girelim").
//
// Ayakkabı BEDENİ'nde bütün numaralara miktar girilir (asorti mantığı) — kutular açık kalmalı.
// BOYUT'ta (bağcık 120–160 cm) genelde tek boyut alınıyor; beş kutuyu birden açmak ekranı
// dolduruyor ve yanlış kutuya yazma riski getiriyor. Artık çip seçilince kutu açılıyor.
//
// Ölçülen: (1) boyut ürününde çipler var, miktar kutusu YOK; (2) çipe dokununca o ölçünün kutusu
// açılıyor; (3) beden ürününde eski davranış — bütün kutular açık.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohum() {
  const t = { ...TOHUM };
  const st = JSON.parse(TOHUM["stok:items"]);
  st.push({
    id: "u9", ad: "Bağcık", kategori: "Hammadde", birim: "çift", olcuTipi: "Boyut",
    variants: ["120 cm", "130 cm", "140 cm", "150 cm", "160 cm"].map((b) => ({ renk: "Haki", beden: b, miktar: 10 })),
    hareketler: [{ id: "hb1", tarih: "2026-09-10", renk: "Haki", beden: "120 cm", miktar: 10, kaynak: "Açılış", fisNo: "ACL-0910001" }],
  });
  t["stok:items"] = JSON.stringify(st);
  return t;
}

async function satisFisiAc(sayfa, urunAdi, renkAdi) {
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Cari"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^Müşteri B$/.test((e.textContent || "").trim()));
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Satış Fişi/.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  // ÜRÜN VE RENK YAZARAK (18 Eylül): açılır liste değil, datalist'li arama kutusu.
  const urunEtiketi = await sayfa.evaluate((ad) => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value.includes(ad)) : null;
    return o ? o.value : ad;
  }, urunAdi);
  await sayfa.locator("[data-urun-arama]").fill(urunEtiketi);
  await sayfa.waitForTimeout(800);
  await sayfa.locator("[data-renk-arama]").fill(renkAdi);
  await sayfa.waitForTimeout(800);
}

async function calistir() {
  const hatalar = [];

  // ---- BOYUT ürünü
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  await satisFisiAc(sayfa, "Bağcık", "Haki");
  // EYLEM ÇUBUĞU (18 Eylül): Kaydet/Vazgeç pencere başlığında, Kapat'ın solunda. Kalem yokken
  // Kaydet pasif — boş fiş kaydedilemesin.
  const eylemCubugu = await sayfa.evaluate(() => ({
    cubukVar: !!document.querySelector("[data-eylem-cubugu]"),
    eylemler: [...document.querySelectorAll("[data-eylem]")].map((e) => `${e.getAttribute("data-eylem")}${e.disabled ? ":pasif" : ""}`),
  }));

  // ERP STANDARDI (20 Eylül): eylemlerin title'ında kısayol yazıyor (Kaydet · Ctrl+S), pasif
  // olanınkinde sebep. Sıra tablodan geliyor: kaydet önce, vazgeç sonra.
  const kisayolBaslik = await sayfa.evaluate(() => [...document.querySelectorAll("[data-eylem]")].map((e) => e.title));

  const boyutOnce = await sayfa.evaluate(() => ({
    olcuSecenekleri: (() => {
      const sel = document.querySelector("[data-olcu-secici]");
      return sel ? [...sel.options].map((o) => o.value).filter(Boolean) : [];
    })(),
    miktarKutusuSayisi: document.querySelectorAll('input[type="number"]').length,
  }));
  // Ölçü SEÇİLİNCE kutu açılıyor (18 Eylül: çip yerine açılır liste).
  await sayfa.evaluate(() => {
    const sel = document.querySelector("[data-olcu-secici]");
    const o = [...sel.options].find((x) => x.value === "130 cm");
    sel.value = o.value; sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(600);
  const boyutSonra = await sayfa.evaluate(() => ({
    miktarKutusuSayisi: document.querySelectorAll('input[type="number"]').length,
  }));
  // FORM SIFIRLAMA (18 Eylül): "Kalemlere Ekle" sonrası ürün/renk/ölçü/fiyat temizlenmeli —
  // sıradaki kalem başka ürün olabilir.
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("45");
  await sayfa.locator('[data-kalem-miktar="130 cm"]:visible').first().fill("3");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const eklemeSonrasi = await sayfa.evaluate(() => ({
    urunKutusuBos: document.querySelector("[data-urun-arama]").value === "",
    renkKutusuGizli: !document.querySelector("[data-renk-arama]"),
    fiyatBos: !(document.querySelector("[data-kalem-fiyat]") || {}).value,
    kalemListede: /Bağcık/.test(document.body.innerText),
  }));
  // ESC = VAZGEÇ (ERP standardı): odak yazı alanında değilken Esc pencereyi kapatır.
  await sayfa.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await sayfa.keyboard.press("Escape");
  await sayfa.waitForTimeout(700);
  const escKapatti = await sayfa.evaluate(() => !document.querySelector("[data-eylem-cubugu]"));
  await tarayici.close();

  // ---- BEDEN ürünü: eski davranış korunuyor (tüm kutular açık)
  const ikinci = await uygulamaAc(tohum(), { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  await satisFisiAc(ikinci.sayfa, "Bot", "Siyah");
  const beden = await ikinci.sayfa.evaluate(() => ({
    olcuSeciciYok: document.querySelectorAll("[data-olcu-secici]").length === 0,
    miktarKutusuSayisi: document.querySelectorAll('input[type="number"]').length,
  }));
  await ikinci.tarayici.close();

  return { hatalar, eylemCubugu, kisayolBaslik, escKapatti, boyutOnce, boyutSonra, eklemeSonrasi, beden };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
