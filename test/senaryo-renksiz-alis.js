// SENARYO — RENKSİZ ÜRÜNE ALIŞ FİŞİ (26 Eylül, v1.478.0).
//
// Kullanıcı (Cariden Alış Fişi, ürün "Deri", Renk kutusu boş): "Renk olmadığı için alış giremiyorum.
// Renksiz stoklarda renk seçici açılmayacak."
//
// Yalnız tek rengi tam "Standart" olan ürün renksiz sayılıyordu. Üç renksiz biçim ölçülüyor:
//   A. rengi BOŞ kayıtlı varyant ("" / ""),
//   B. HİÇ varyantı olmayan ürün (renk ve beden seçmeden açılan),
//   C. klasik "Standart"/"Standart".
// Her birinde: renk kutusu yok, miktar kutusu var, kalem ekleniyor; fiş kaydedilince stok artıyor
// (B'de fiş yazımı "Standart" varyantını kendisi açıyor; A'da boş varyanta ekleniyor, çift satır yok).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push(
    { id: "ra", ad: "Astar Boş", kategori: "Hammadde", birim: "metre", alisFiyati: 10, variants: [{ renk: "", beden: "", miktar: 5, minStok: 0 }],
      hareketler: [{ id: "a0", tarih: "2026-09-01", renk: "", beden: "", miktar: 5 }] },
    { id: "rb", ad: "Silme Suyu", kategori: "Hammadde", birim: "litre", alisFiyati: 20, variants: [], hareketler: [] },
    { id: "rc", ad: "Tutkal", kategori: "Hammadde", birim: "kg", alisFiyati: 30, variants: [{ renk: "Standart", beden: "Standart", miktar: 2, minStok: 0 }],
      hareketler: [{ id: "c0", tarih: "2026-09-01", renk: "Standart", beden: "Standart", miktar: 2 }] },
  );
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(400);
  await sayfa.locator('button:has-text("Tedarikçi A")').nth(1).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("AF-RENKSIZ");

  const urunler = { "Astar Boş": "4", "Silme Suyu": "6", "Tutkal": "1" };
  const form = {};
  for (const [ad, miktar] of Object.entries(urunler)) {
    const etiket = await sayfa.evaluate((a) => {
      const dl = document.getElementById("fis-urun-listesi");
      const o = dl ? [...dl.options].find((x) => x.value.startsWith(a)) : null;
      return o ? o.value : a;
    }, ad);
    await sayfa.locator("[data-urun-arama]").first().fill(etiket);
    await sayfa.waitForTimeout(500);
    form[ad] = await sayfa.evaluate(() => ({
      renkKutusu: [...document.querySelectorAll("[data-renk-arama]")].some((x) => x.offsetParent),
      miktarKutulari: [...document.querySelectorAll("[data-kalem-miktar]")].filter((x) => x.offsetParent).map((x) => x.getAttribute("data-kalem-miktar")),
      // v1.479.0: kutunun üstünde "Standart" etiketi yazmıyor.
      kutuEtiketi: [...document.querySelectorAll("[data-kalem-miktar]")].filter((x) => x.offsetParent).map((x) => (x.parentElement.innerText || "").trim()).join(" | ") || "(yok)",
    }));
    await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("10");
    await sayfa.locator("[data-kalem-miktar]:visible").first().fill(miktar);
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(500);
  }
  const kalemSayisi = await sayfa.evaluate(() => (document.body.innerText.match(/(\d+) kalem/) || [])[1] || null);
  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);

  const stokSon = (await depoOku(sayfa, "stok:items")) || [];
  const varyantlar = Object.fromEntries(["ra", "rb", "rc"].map((id) => {
    const p = stokSon.find((x) => x.id === id) || {};
    return [p.ad, (p.variants || []).map((v) => `${v.renk || "(boş)"}/${v.beden || "(boş)"}: ${v.miktar}`)];
  }));

  await tarayici.close();
  return { hatalar, form, kalemSayisi, varyantlar };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
