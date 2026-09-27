// SENARYO — TABLOLARDA "STANDART" YAZILMIYOR (24 Eylül, v1.437.0).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı (alış siparişi kalem tablosu ekran görüntüsü): RENK sütunu "Standart" diye doluyor, beden
// sütun başlığı da "STANDART". "Standart yazısını kaldıracaktık, yazmasına gerek yok."
// "Standart" bir renk/beden DEĞİL, renksiz-ölçüsüz malzemenin yer tutucusu; `olcuGoster` (012) onu
// ekranda boş gösterir, kayıt değişmez.
//
// Ölçülenler (FİŞ ekranı üzerinden — sipariş ve fiş kalem tabloları aynı yardımcıyı kullanıyor):
//   1. Renksiz "Kalıp" (Standart/Standart) ve gerçek renkli "Deri" (Siyah) aynı alış fişinde:
//      Kalıp satırının renk hücresi BOŞ, Deri'nin rengi "Siyah" DURUYOR.
//   2. Ölçü sütununun başlığı "Miktar" (Standart değil); tabloda hiç "Standart" geçmiyor.
//   3. Fiş kaydedilince Kalıp'ın kayıttaki varyantı yine `Standart/Standart` — yalnız gösterim değişti.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({
    id: "kalip", ad: "Kalıp", kategori: "Hammadde", birim: "adet", alisFiyati: 50,
    variants: [{ renk: "Standart", beden: "Standart", miktar: 2, minStok: 0 }],
    hareketler: [{ id: "k0", tarih: "2026-09-01", renk: "Standart", beden: "Standart", miktar: 2 }],
  });
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
  // Fiş numarası elle: üretilen numara tarih taşır, karşılaştırılamazdı.
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("AF-STD");

  const etiketBul = (ad) => sayfa.evaluate((a) => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value.startsWith(a)) : null;
    return o ? o.value : a;
  }, ad);

  // Kalıp: renksiz — renk sorulmuyor, tek miktar kutusu.
  await sayfa.locator("[data-urun-arama]").first().fill(await etiketBul("Kalıp"));
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("50");
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("4");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(500);

  // Deri · Siyah: gerçek renk — tabloda yazmaya devam etmeli.
  await sayfa.locator("[data-urun-arama]").first().fill(await etiketBul("Deri"));
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("150");
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("3");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(500);

  // Kalem tablosu: renk sütunu işaretli (`data-fis-renk-sutunu`) tablonun başlıkları ve satırları.
  const tablo = await sayfa.evaluate(() => {
    const th = document.querySelector("[data-fis-renk-sutunu]");
    const tb = th && th.closest("table");
    if (!tb) return null;
    const basliklar = [...tb.querySelectorAll("thead th")].map((x) => x.textContent.trim());
    const satirlar = [...tb.querySelectorAll("tbody tr")].filter((tr) => tr.querySelectorAll("td").length > 2).map((tr) => {
      const td = [...tr.querySelectorAll("td")];
      const miktar = td[2] && td[2].querySelector("input");
      return { urun: td[0].textContent.trim(), renk: td[1].textContent.trim(), miktar: miktar ? miktar.value : td[2].textContent.trim() };
    });
    return { basliklar, satirlar, standartGeciyor: /standart/i.test(tb.innerText) };
  });

  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);

  const stokSon = (await depoOku(sayfa, "stok:items")) || [];
  const kalip = stokSon.find((x) => x.id === "kalip") || {};
  const kayit = {
    kalipVaryantlari: (kalip.variants || []).map((v) => `${v.renk || "(boş)"}/${v.beden || "(boş)"}: ${v.miktar}`),
    kalipHareketleri: (kalip.hareketler || []).filter((h) => h.fisNo === "AF-STD").map((h) => `${h.renk || "(boş)"}/${h.beden || "(boş)"}: ${h.miktar}`),
  };

  await tarayici.close();
  return { hatalar, tablo, kayit };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
