// SENARYO — TESLİM ALINAN FİŞİN SİLİNMESİ (`yetimFisTemizle` yolu).
//
// Önce senaryo-siparis.js'teki teslim yapılır (fiş oluşur, stok girer, borç yazılır, siparişin
// `karsilanan`ı artar), sonra o fiş cari ekstresinden silinir. Bu, geri alma yolunun ÜÇ tarafını
// birden kapsıyor: stok miktarı geri düşmeli, cari borcu silinmeli, siparişin `karsilanan`ı ve
// durumu geri dönmeli. v1.40.0'ın kök sebebi tam olarak buydu (fiş silinince sipariş "Tamamlandı"
// kalıyor, kalem bir daha teslim alınamıyordu).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { alisSiparisindenTeslimEt } = require("./alis-teslim-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);

  // ---- 1) Teslim al (fiş oluşsun) ----
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('div:has-text("AS-1")').last().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await alisSiparisindenTeslimEt(sayfa, { miktarlar: [4, 3] });

  const teslimSonrasi = {
    stok: await depoOku(sayfa, "stok:items"),
    cariler: await depoOku(sayfa, "cari:data"),
    siparisler: await depoOku(sayfa, "siparis:data"),
  };

  // ---- 2) Fişi cari ekstresinden sil ----
  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator(`button:has-text("Tedarikçi A"):visible`).last().click();
  await sayfa.waitForTimeout(700);
  // Fiş grubunun silme düğmesi iki aşamalı (bir kez tıkla → "Emin misiniz?" → tekrar tıkla).
  const sil = sayfa.locator('button[title="Sil"]:visible').last();
  await sil.click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): ikinci adım penceredeki Sil.
  await sayfa.locator('[data-sil-onayla]').first().click();
  await sayfa.waitForTimeout(1500);

  const stok = await depoOku(sayfa, "stok:items");
  const cariler = await depoOku(sayfa, "cari:data");
  const siparisler = await depoOku(sayfa, "siparis:data");
  const cop = await depoOku(sayfa, "cop:data");
  await tarayici.close();

  const ozet = (s, c, sip) => ({
    stok: (s || []).map((p) => ({ ad: p.ad, variants: p.variants, hareketSayisi: (p.hareketler || []).length })),
    cariler: (c || []).map((x) => ({ unvan: x.unvan, hareketSayisi: (x.hareketler || []).length })),
    siparisler: (sip || []).map((x) => ({
      no: x.siparisNo, durum: x.durum,
      kalemler: (x.kalemler || []).map((k) => ({ urunAd: k.urunAd, miktar: k.miktar, karsilanan: k.karsilanan })),
    })),
  });

  return {
    hatalar,
    teslimSonrasi: ozet(teslimSonrasi.stok, teslimSonrasi.cariler, teslimSonrasi.siparisler),
    silmeSonrasi: ozet(stok, cariler, siparisler),
    // Çöpe ne düştüğü de karşılaştırmaya giriyor: iki silme yolu farklı şey çöpe atıyordu.
    cop: (cop || []).map((k) => ({ tur: k.tur, ad: k.ad, ozet: k.ozet })),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    const sirasiz = require("crypto").createHash("sha256")
      .update(normalles(s, false)).digest("hex").slice(0, 12);
    console.log(normalles(s));
    console.log("sırasız özet: " + sirasiz);
  });
}

module.exports = { calistir };
