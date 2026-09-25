// SENARYO — STOK GÖRSELİ İÇİN GALERİ / FOTOĞRAF ÇEK.
//
// Kullanıcı: "Galeriden ve fotoğraf çekmeyi ekleyelim stok resimleri için."
// Önceden tek yol vardı: fotoğrafı kopyalayıp kutuya yapıştırmak. Telefonda bu, Fotoğraflar
// uygulamasına gidip resme basılı tutup Kopyala demek anlamına geliyordu.
//
// Ölçülen: görsel kutusuna basınca iki düğme (Galeriden / Fotoğraf Çek) ve arkalarında iki AYRI
// dosya girdisi var — biri galeri, diğeri `capture="environment"` ile doğrudan kamera.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);

  // Ürün kartındaki görsel kutusu (kapak resmi) — düzenlenebilir olan ilk kutu.
  await sayfa.locator('button[title*="görsel"]:visible, button[title*="Görseli"]:visible').first().click();
  await sayfa.waitForTimeout(500);

  const panel = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    // YALNIZ GÖRSEL GİRDİLERİ (22 Eylül): sayfada başka dosya girdileri de var (ör. Tanımlar'daki
    // "GitHub'a yayınla" HTML seçicisi). Hepsini saymak, ilgisiz bir ekran değişince bu senaryoyu
    // düşürüyordu.
    const girdiler = [...document.querySelectorAll('input[type="file"][accept*="image"]')].map((i) => ({
      accept: i.getAttribute("accept"),
      capture: i.getAttribute("capture"),
    }));
    return {
      galeriDugmesi: /Galeriden/.test(metin),
      kameraDugmesi: /Fotoğraf Çek/.test(metin),
      yapistirmaSeceneği: /kopyala-yapıştır/i.test(metin),
      dosyaGirdileri: girdiler,
    };
  });
  // GERÇEKTEN KAYDEDİYOR MU: galeri girdisine bir dosya verilip sonuç okunuyor.
  // Düğmelerin varlığı yetmez; asıl iş fotoğrafın küçültülüp ürüne yazılması.
  // Görsel girdisi, capture'suz olan: seçici görsel kabul edenlerle sınırlı — aksi hâlde başka bir
  // ekranın dosya girdisi "sonuncu" olup bu adımı sessizce yanlış kutuya yönlendirebilirdi.
  const galeriGirdisi = sayfa.locator('input[type="file"][accept*="image"]:not([capture])').last();
  await galeriGirdisi.setInputFiles(require("path").join(__dirname, "test-gorsel.png"));
  await sayfa.waitForTimeout(1200);
  const kayit = await sayfa.evaluate(() => {
    // GÖRSEL ARTIK `stok:items` İÇİNDE DEĞİL, ürün başına ayrı anahtarda (`gorsel:<urunId>`).
    // Sebep: bütün ürünler tek anahtarda toplanıyordu ve `guvenliYaz` 5 MB'ı aşan kaydı
    // reddediyor; görseller o anahtardayken stok kaydedilemez hâle geliyordu (v1.158.0).
    // Ölçülen davranış DEĞİŞMEDİ — görsel kaydediliyor, veri URL'i ve küçültülmüş; yalnız
    // durduğu yer değişti.
    const urunler = JSON.parse(window.__depo["stok:items"] || "[]");
    const bot = urunler.find((u) => u.ad === "Bot");
    const paket = bot ? JSON.parse(window.__depo[`gorsel:${bot.id}`] || "null") : null;
    const resim = paket && paket.kapakResmi;
    return {
      kaydedildi: !!resim,
      veriUrlMi: !!resim && resim.startsWith("data:image/"),
      // Küçültme çalışıyor mu: ham dosya değil, yeniden kodlanmış küçük bir görsel olmalı.
      boyutKB: resim ? Math.round(resim.length / 1024) : 0,
    };
  });
  await tarayici.close();
  return { hatalar, panel, kayit };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
