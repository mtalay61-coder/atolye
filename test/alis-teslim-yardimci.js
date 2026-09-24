// ORTAK ADIM — ALIŞ SİPARİŞİNDEN TESLİM (v1.431.0 tek ekran fişi).
//
// ⚠ YENİDEN YAZILDI (24 Eylül, Claude Code oturumu): asıl dosya gelen src zip'lerinde YOKTU.
// DEVAM-NOTU'daki tarife göre kuruldu (fiş aç → siparişten seç → miktarlar → kaydet → onayla) ve
// ona bağlı beş senaryonun (siparis, silme, fis-ozet, son-islemler, fis-defteri) altın çıktısıyla
// doğrulandı.
//
// Çağıran, alış siparişinin kartını TAM EKRAN açmış olmalı (fiş düğmesi yalnız tam kartta).
// `miktarlar`: fişteki miktar kutularına sırayla yazılacak değerler; verilmezse siparişin kalan
// miktarları olduğu gibi kalır. `bekle`: onaydan sonra yazmanın bitmesi için beklenen süre (ms).
async function alisSiparisindenTeslimEt(sayfa, { miktarlar = null, bekle = 1800 } = {}) {
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  // Tek ekranda fiş BOŞ açılıyor; siparişin kalemleri "Siparişten seç"ten geliyor.
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(400);
  const eklenecek = await sayfa.evaluate(() => document.querySelectorAll("[data-siparisten-ekle]").length);
  for (let i = 0; i < eklenecek; i++) {
    await sayfa.evaluate(() => { const b = document.querySelector("[data-siparisten-ekle]"); if (b) b.click(); });
    await sayfa.waitForTimeout(500);
  }
  if (miktarlar) {
    const kutular = sayfa.locator("[data-fis-miktar]:visible");
    for (let i = 0; i < miktarlar.length; i++) {
      await kutular.nth(i).fill(String(miktarlar[i]));
      await kutular.nth(i).blur();
      await sayfa.waitForTimeout(200);
    }
  }
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(bekle);
}

module.exports = { alisSiparisindenTeslimEt };
