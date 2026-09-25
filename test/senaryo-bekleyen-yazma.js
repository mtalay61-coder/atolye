// SENARYO — BEKLEYEN YAZMA DEFTERİ + EKSİK HAREKET ONARIMI (kullanıcı, 15 Eylül: "stok
// tutarsızlığı var; giriş-çıkış fişleri var ama stokta sıkıntı var; bu sorun kesinlikle olmamalı").
//
// KÖK NEDEN: buluta yazma yarım kalınca (ör. cariler tablosu hata veriyor) yerel kopya güncel,
// bulut eski kalıyordu; sonraki açılışta bulut yereli EZİYORDU → stok hareketi yok, sipariş
// karşılanmış görünüyor.
//
// Ölçülen:
//  1) Buluta yazamayan tablo `bekleyen:yazma` defterine düşüyor; ekranda şerit çıkıyor.
//  2) Açılışta defterde kayıtlı tablo için BULUT DEĞİL YEREL kopya esas alınıyor (bulut sahte
//     yanıtla ESKİ veri döndürse bile ürün listesi yerelden geliyor).
//  3) Veri Denetimi'nin "siparişte var, stokta yok" bulgusu "Fişten yeniden yaz" ile onarılıyor:
//     eksik çıkış hareketi fiş numarasıyla yazılıyor, varyant miktarı düşüyor, bulgu kapanıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  // ---- 1) Yazma başarısız → defter + şerit. (Test ortamında bulut zaten yok; her yazma düşer.)
  let { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  // Bir tanım değişikliği yaz (bulut yok → deftere düşer).
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.locator('input[placeholder="Örn. Ham Bej"]').first().fill("Bordo");
  await sayfa.keyboard.press("Enter");
  await sayfa.waitForTimeout(1200);
  const defter = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"));
  const serit = await sayfa.evaluate(() => { const e = document.querySelector("[data-bekleyen-yazma]"); return e ? Number(e.getAttribute("data-bekleyen-yazma")) : 0; });
  const yerelTanimlar = await depoOku(sayfa, "tanimlar:data");
  

  // ---- 2) Açılışta yerel kazanır: bulut sahte yanıtla ESKİ ürün listesi (tek ürün) döndürüyor,
  // yerelde iki ürün var ve `stok:items` defterde → ekranda yerelin ürünleri görünmeli.
  const t2 = { ...TOHUM };
  t2["bekleyen:yazma"] = JSON.stringify({ "stok:items": { tablo: "urunler", zaman: "2026-09-15T10:00:00.000Z", deneme: 2, hata: "test" } });
  const onceRota = async (s2) => {
    await s2.route("**/rest/v1/urunler**", (route) => route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: "u-eski", ad: "ESKİ BULUT ÜRÜNÜ", kategori: "Mamul", birim: "çift" }]) }));
  };
  // İlk tarayıcı kapatılmadan üstüne yazılıyordu: açık kalan Chromium Node'u çıkmaktan alıkoyuyor,
  // kosu.sh bu senaryoda sonsuza kadar bekliyordu.
  await tarayici.close();
  const ikinci = await uygulamaAc(t2, { hataYaz: false, onceRota });
  sayfa = ikinci.sayfa; tarayici = ikinci.tarayici;
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2600);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const yerelKazandi = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return { eskiBulutGorunuyor: /ESKİ BULUT ÜRÜNÜ/.test(m), yerelUrunGorunuyor: /\bBot\b/.test(m) };
  });
  await tarayici.close();

  // ---- 3) Onarım: sipariş karşılanmış, cari fişi var, stok çıkışı YOK.
  const t3 = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 8 }];
  bot.hareketler = [{ id: "h-giris", tarih: "2026-09-14", tip: "Giriş", kaynak: "Satınalma", renk: "Siyah", beden: "41", miktar: 8, fisNo: "ALS-1-F1", siparisNo: "ALS-1", cariId: "c1" }];
  t3["stok:items"] = JSON.stringify(stok);
  t3["siparis:data"] = JSON.stringify([{ id: "s7", siparisNo: "SAT-7", tip: "Satış", cariId: "c2", durum: "Tamamlandı", tarih: "2026-09-15", teslimSayaci: 1,
    kalemler: [{ id: "k7", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 8, karsilanan: 8, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" }] }]);
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => (c.id === "c2"
    ? { ...c, hareketler: [{ id: "ch7", tarih: "2026-09-15", yon: "Borç", tutar: 7200, paraBirimi: "TRY", fisNo: "SAT-7-F1", siparisId: "s7", siparisNo: "SAT-7", aciklama: "Satış" }] }
    : c));
  t3["cari:data"] = JSON.stringify(cariler);
  const ucuncu = await uygulamaAc(t3, { hataYaz: false });
  sayfa = ucuncu.sayfa; tarayici = ucuncu.tarayici;
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Bakım" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Denetimi Başlat/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const bulguOnce = await sayfa.evaluate(() => (document.body.innerText.match(/Sipariş karşılananı hareketlerle uyuşmuyor\s*(\d+) kayıt/) || [])[1] || "0");
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Sipariş karşılananı hareketlerle uyuşmuyor/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  // OTOMATİK ONARIM KALDIRILDI (20 Eylül): "Fişten yeniden yaz" düğmesi artık yok.
  const onarDugmesi = await sayfa.evaluate(() => (document.querySelector("[data-onar-eksik-hareket]") || {}).textContent || null);
  const onarim = { kaldirildi: onarDugmesi === null };

  await tarayici.close();
  return { hatalar, defter, serit, yerelTanimlar, yerelKazandi, bulguOnce, onarim };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
