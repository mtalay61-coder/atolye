// SENARYO — DEPODAN ÜRÜNE GİDİP GERİ DÖNME.
//
// Kullanıcı: "Depoda iken stok üzerine tıklayınca stok açılıyor, kapatınca Stok Yönetimi ekranına
// atıyor; kapatınca Depo'da kaldığımız yerden devam etmesi gerekir."
//
// Dönüş mekanizması (`donusHedefi`) zaten vardı ama Depo ekranı onu GEÇMİYORDU: `uruneGit(id)`
// çağrısı dönüş hedefi olmadan yapılıyordu. Sekmeler `display:none` ile duruyor, yani dönünce
// Depo'nun kaydırma konumu ve açık satırları yerinde kalıyor — tek eksik hedefi vermekti.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await sayfa.getByRole("button", { name: "Depo", exact: true }).click();
  await sayfa.waitForTimeout(900);
  // Açıklama cümlesi v1.251.0'da kaldırıldı (Depo başlığı sıkılaştırıldı); Depo, üst şeritteki
  // başlıktan ve görünür "Hammadde Deposu" sekmesinden tanınıyor.
  const depodaMi = async () => sayfa.evaluate(() => {
    const h = document.querySelector("h1");
    const sekme = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Hammadde Deposu" && b.getBoundingClientRect().height > 0);
    return !!(h && h.textContent.trim() === "Depo" && sekme);
  });
  const baslangicDepo = await depodaMi();

  // Depodaki bir ürün adına tıkla — ürün kartı açılmalı.
  // Ürün adı bir ikonla aynı kutuda duruyor; metin düğümü değil o kutu tıklanabilir.
  await sayfa.locator('span:text-is("Bot"):visible').first().click();
  await sayfa.waitForTimeout(900);
  const kartAcik = await sayfa.evaluate(() => /STOK KARTI/.test(document.body.innerText));
  const geriDugmesi = await sayfa.locator('button:has-text("Depoya dön"):visible').count();

  // Kapat → Depo'ya dönmeli, Stok Yönetimi'nde kalmamalı.
  await sayfa.locator('button:has-text("Kapat"):visible').first().click();
  await sayfa.waitForTimeout(900);
  const kapattiktanSonraDepo = await depodaMi();

  await tarayici.close();
  return {
    hatalar,
    baslangicDepo,
    kartAcik,
    geriDonDugmesiVar: geriDugmesi > 0,
    kapattiktanSonraDepodaMi: kapattiktanSonraDepo,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
