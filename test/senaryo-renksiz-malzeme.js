// SENARYO — RENKSİZ MALZEMEDE RENK SORULMUYOR (23 Eylül, v1.432.0; kural v1.478/v1.493'te genişledi).
//
// Kullanıcı: "Renksiz hammaddeler de standart seçtiriyoruz. Nasıl mantık yapmamız lazım?"
// Kural — TEK SEÇENEK SORULMAZ: renksiz üründe (bütün renk değerleri yer tutucu; ortak karar
// `urunRenksizMi`, 012) renk alanı HİÇ çizilmez; tek GERÇEK rengi olan üründe alan durur ama renk
// kendiliğinden seçilir; çok renkli üründe eskisi gibi seçtirilir.
//
// Cari ALIŞ fişinde üç ürün:
//   A. Yapıştırıcı — tek varyant "Standart"/"Standart" (renksiz),
//   B. Astar — tek varyant "Bej" (tek ama GERÇEK renk),
//   C. Deri — Siyah + Taba (çok renkli, tohumdaki ürün).
// Ölçülenler:
//   1. A: renk alanı YOK, tek miktar kutusu (üstünde "Standart" etiketi yok); miktar + Ekle ile kalem
//      tek adımda ekleniyor.
//   2. B: alan VAR (etiket "Renk"), "Bej" hazır dolu, miktar kutusu açık — tıklamadan eklenebiliyor.
//   3. C: alan VAR, BOŞ, miktar kutusu yok (seçim isteniyor); "Siyah" yazılınca kutu açılıyor.
//   4. Fiş kaydedilince her ürün kendi varyantına ekleniyor (A "Standart"a, çift satır açılmadan).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push(
    { id: "ya", ad: "Yapıştırıcı", kategori: "Hammadde", birim: "kg", alisFiyati: 30,
      variants: [{ renk: "Standart", beden: "Standart", miktar: 2, minStok: 0 }],
      hareketler: [{ id: "y0", tarih: "2026-09-01", renk: "Standart", beden: "Standart", miktar: 2 }] },
    { id: "as", ad: "Astar", kategori: "Hammadde", birim: "metre", alisFiyati: 15,
      variants: [{ renk: "Bej", beden: "", miktar: 4, minStok: 0 }],
      hareketler: [{ id: "as0", tarih: "2026-09-01", renk: "Bej", beden: "", miktar: 4 }] },
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

  const urunSec = async (ad) => {
    const etiket = await sayfa.evaluate((a) => {
      const dl = document.getElementById("fis-urun-listesi");
      const o = dl ? [...dl.options].find((x) => x.value.startsWith(a)) : null;
      return o ? o.value : a;
    }, ad);
    await sayfa.locator("[data-urun-arama]").first().fill(etiket);
    await sayfa.waitForTimeout(500);
  };
  // Formun o anki hâli: renk alanı (etiketi, değeri), görünen miktar kutuları ve etiketleri.
  const formOku = () => sayfa.evaluate(() => {
    const renk = [...document.querySelectorAll("[data-renk-arama]")].find((x) => x.offsetParent);
    const kutular = [...document.querySelectorAll("[data-kalem-miktar]")].filter((x) => x.offsetParent);
    const alan = renk ? renk.closest("label") : null;
    return {
      renkAlani: !!renk,
      ...(renk ? {
        renkEtiketi: alan ? (alan.innerText.split("\n")[0] || "").trim() : null,
        renkDegeri: renk.value || "(boş)",
      } : {}),
      miktarKutulari: kutular.map((x) => x.getAttribute("data-kalem-miktar")),
      kutuEtiketi: kutular.map((x) => (x.parentElement.innerText || "").split("\n").filter((s) => !/^stok:/.test(s.trim())).join(" ").trim()).join(" | ") || "(yok)",
    };
  });
  const kalemSayisi = () => sayfa.evaluate(() => Number((document.body.innerText.match(/(\d+) kalem/) || [])[1] || 0));
  const ekle = async (miktar) => {
    await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("10");
    await sayfa.locator("[data-kalem-miktar]:visible").first().fill(miktar);
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(500);
  };

  // A. Renksiz
  await urunSec("Yapıştırıcı");
  const yapistirici = await formOku();
  await ekle("3");
  yapistirici.eklendiKalem = await kalemSayisi();

  // B. Tek gerçek renk
  await urunSec("Astar");
  const astar = await formOku();
  await ekle("5");
  astar.eklendiKalem = await kalemSayisi();

  // C. Çok renkli
  await urunSec("Deri");
  const deri = await formOku();
  const renkKutusu = sayfa.locator("[data-renk-arama]:visible").first();
  await renkKutusu.fill("Siyah");
  await sayfa.waitForTimeout(300);
  deri.siyahYazilinca = await formOku();
  await ekle("2");
  deri.eklendiKalem = await kalemSayisi();

  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);

  const stokSon = (await depoOku(sayfa, "stok:items")) || [];
  const varyantlar = Object.fromEntries(["ya", "as", "u1"].map((id) => {
    const p = stokSon.find((x) => x.id === id) || {};
    return [p.ad, (p.variants || []).map((v) => `${v.renk || "(boş)"}/${v.beden || "(boş)"}: ${v.miktar}`)];
  }));

  await tarayici.close();
  return { hatalar, yapistirici, astar, deri, varyantlar };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
