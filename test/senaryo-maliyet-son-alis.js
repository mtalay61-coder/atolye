// SENARYO — MALİYETTE SON ALIŞ (27 Eylül, v1.499.0).
//
// Kullanıcı: "Maliyet ilk olarak son hammadde rengin alış fiyatlarının ortalamasından çeksin… son alışlar
// 3 aydan eski ise TL fiyatı o günün USD kuruyla çevirip bugüne taşısın." Kapsam: her yerde.
// Kurulum (maliyet-dokumu ile aynı reçete, kur $48,70): Süet Deri'nin son 3 ayda iki USD alışı (10 × 2 $,
// 30 × 3 $ → 2,75 $); Yapıştırıcı'nın yalnız 6 ay önce 64 ₺ alışı, o gün USD 32 → 2 $ → bugün 97,40 ₺.
// Takviye Bezi'nin alışı yok → kart fiyatı (1,2 €) ve düzenlenebilir kutu.
// Ölçülen: ürün kartı Maliyet dökümü (fiyat, kaynak yazısı, alıştan gelen satırda kutu yok) ve çıktı toplamı.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const gunOnce = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

async function calistir() {
  const t = { ...TOHUM };
  const muh = JSON.parse(TOHUM["muhasebe:data"]);
  muh.kurlar = { USD: 48.70, EUR: 55.90 };
  muh.kurGecmisi = [{ id: "k1", tarih: gunOnce(190) + "T12:00:00Z", USD: 32, EUR: 35 }];
  t["muhasebe:data"] = JSON.stringify(muh);
  const st = JSON.parse(TOHUM["stok:items"]);
  const yeni = (id, ad, fiyat, pb, birim) => ({ id, ad, kategori: "Hammadde", birim, alisFiyati: fiyat, alisParaBirimi: pb, variants: [{ renk: "", beden: "", miktar: 100 }], hareketler: [], recete: [], prosesUcretleri: {} });
  st.push(yeni("h1", "Süet Deri", 2.5, "$", "desi"), yeni("h2", "Takviye Bezi", 1.2, "€", "m"), yeni("h5", "Yapıştırıcı", 25, "₺", "adet"));
  const bot = st.find((p) => p.id === "u2");
  bot.maliyetBirimi = "TRY"; bot.prosesUcretleri = {};
  const r = (h, ad, m, b) => ({ hammaddeUrunId: h, hammaddeAd: ad, mamulRenk: "Siyah", renk: "", beden: "", miktar: m, birim: b, proses: "Kesim" });
  bot.recete = [r("h1", "Süet Deri", 2, "desi"), r("h2", "Takviye Bezi", 1, "m"), r("h5", "Yapıştırıcı", 1, "adet")];
  t["stok:items"] = JSON.stringify(st);
  const alis = (id, fisNo, tarih, urunAd, miktar, birimFiyat, ek = {}) => ({ id, fisNo, tarih, yon: "Alacak", urunAd, renk: "", beden: "", miktar, birimFiyat, tutar: miktar * birimFiyat, paraBirimi: "TRY", defter: "Genel", ...ek });
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => c.id === "c1" ? { ...c, hareketler: [
    alis("a1", "AF-0001", gunOnce(20), "Süet Deri", 10, 97.4, { hamBirimFiyat: 2, kalemParaBirimi: "USD" }),
    alis("a2", "AF-0002", gunOnce(10), "Süet Deri", 30, 146.1, { hamBirimFiyat: 3, kalemParaBirimi: "USD" }),
    alis("a3", "AF-0003", gunOnce(180), "Yapıştırıcı", 5, 64),
  ] } : c));

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.slice(0, 150)));
  await sayfa.setViewportSize({ width: 1100, height: 900 });
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-nav=\"Mamul Stok\"]"); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0); let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } } });
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const satirlar = await sayfa.evaluate(() => {
    const t = document.querySelector("[data-maliyet-dokumu]");
    if (!t) return null;
    return [...t.querySelectorAll("tbody tr")].map((r) => {
      const h = [...r.children];
      // v1.595.0: ilk sütun proses; hammadde h[1], birim fiyat h[3], TL h[5].
      const kutu = h[3] && h[3].querySelector("input");
      const kaynak = h[3] && h[3].querySelector("[data-fiyat-kaynagi]");
      const toplamSatiri = !!r.querySelector("td[colspan]");
      const fiyat = kutu ? kutu.value : (h[3] ? h[3].textContent.replace(kaynak ? kaynak.textContent : "", "").trim() : "");
      return { ad: toplamSatiri ? h[0].textContent.trim() : (h[1] ? h[1].textContent.trim() : ""), fiyat, kutu: !!kutu, kaynak: kaynak ? kaynak.textContent.replace(/\d{2}\.\d{2}\.\d{4}/, "GG.AA.YYYY").trim() : null, tl: h[5] ? h[5].textContent.trim() : "" };
    });
  });
  if (process.env.FOTO) await sayfa.locator("[data-maliyet-dokumu]").first().screenshot({ path: process.env.FOTO });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-maliyet-yazdir-ac]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  const yazdirToplam = await sayfa.evaluate(() => { const e = document.querySelector("[data-maliyet-yazdir-toplam]"); return e ? e.textContent.trim() : null; });
  await tarayici.close();
  return { hatalar, satirlar, yazdirToplam };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
