// SENARYO — ÜRÜN KARTINDAKİ FİŞ SATIRINDA BİRİM FİYAT / ADET / TUTAR.
//
// Kullanıcı: "Satış fişinde sağda birim fiyat ve toplam adet, toplam tutar yazması gerekiyor."
//
// Stok hareketi fiyat TAŞIMAZ; fiyat aynı fiş numarasına yazılmış CARİ hareketinden okunuyor.
// Cari karşılığı olmayan fişlerde (üretim çıkışı/girişi) fiyat sütunları hiç çıkmamalı — o fişin
// bir tutarı yok, "0 ₺" yazmak yanlış olurdu.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { alisSiparisindenTeslimEt } = require("./alis-teslim-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  // Alış fişi kes (fiyatlı cari hareketi oluşsun)
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.getByText("AS-1", { exact: true }).last().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await alisSiparisindenTeslimEt(sayfa);
  // Ürün kartı → Stok Hareketleri
  await sayfa.getByRole("button", { name: "Stok", exact: true }).click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Deri" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(800);
  const h = sayfa.locator('button:has-text("Stok Hareketleri"):visible');
  if (await h.count()) { await h.first().click(); await sayfa.waitForTimeout(700); }
  const m = await sayfa.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  // FİŞ NO ARTIK CARİ FİŞİ BİÇİMİNDE (23 Eylül, v1.431.0): alış teslimi de ortak fiş ekranından
  // geçiyor, numara "AS-1-F1" değil "AF-…". Satışta bu zaten böyleydi.
  const i = m.search(/AF-\d+/);
  // Saat her koşuda değişir; normalles yalnızca ISO damgalarını sabitliyor, ekrandaki
  // "01.09.2026 12:30" biçimini değil. Karşılaştırılabilir olması için burada sabitleniyor.
  const alisSatiri = (i >= 0 ? m.slice(i, i + 90).trim() : "fiş bulunamadı")
    .replace(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/g, "<tarih saat>");
  const u = m.indexOf("1001-Kesim ");
  const uretimSatiri = (u >= 0 ? m.slice(u, u + 70).trim() : "üretim fişi bulunamadı")
    .replace(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/g, "<tarih saat>");
  await tarayici.close();

  return {
    hatalar,
    // Alış fişi: birim fiyat + adet + tutar var.
    alisSatiri,
    // Üretim çıkışı: cari karşılığı yok, fiyat/tutar yazılmıyor.
    uretimSatiri,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
