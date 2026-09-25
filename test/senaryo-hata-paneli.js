// SENARYO — KAYDETME HATASI OKUNABİLİR VE KOPYALANABİLİR.
//
// Kullanıcı: "Hata veriyor ama resmi yüklüyor, hatayı kopyalayamıyorum, kısa gösteriyor ekranda."
// Hatalar 2,2 saniyelik toast olarak çıkıyordu: telefonda kırpılıyor, kaybolup gidiyor ve
// kopyalanamıyor. Bildirilemeyen hata, yok sayılmış hatadır.
//
// Ölçülen: depo sınırı aşıldığında panel AÇIK KALIYOR, sebebi ve ne yapılacağını yazıyor,
// "Kopyala" düğmesi var; ayrıca değişikliğin buluta YAZILAMADIĞI açıkça söyleniyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // Depoyu sınırın üstüne çıkaran bir yazma: window.storage.set'i boyut sınırını taklit edecek
  // şekilde değiştirmek yerine, uygulamanın KENDİ sınır kontrolünü tetikliyoruz — gerçek yol bu.
  await sayfa.evaluate(() => {
    const orijinal = window.storage.set;
    window.storage.set = async (a, d, p) => {
      if (a === "tanimlar:data") {
        // Tarayıcının kota hatasının aynısı: adı ve mesajı gerçek Chrome hatasından alındı.
        const e = new Error("Failed to execute 'setItem' on 'Storage': Setting the value of 'atolye:tanimlar:data' exceeded the quota.");
        e.name = "QuotaExceededError";
        throw e;
      }
      return orijinal(a, d, p);
    };
    // Depo kullanımı raporu localStorage'dan okunuyor; testte birkaç kayıt kondu ki liste dolsun.
    localStorage.setItem("atolye:cop:data", "x".repeat(3000));
    localStorage.setItem("atolye:stok:items", "y".repeat(1000));
    // BAŞKA BİR UYGULAMANIN kaydı: aynı tarayıcı deposunu paylaşıyor. Gerçek olayda deponun
    // %70'ini bu tür bir kayıt doldurmuştu.
    localStorage.setItem("not-defteri:tasks", "z".repeat(9000));
  });

  // Tanımlar > yeni renk ekleyerek bir yazma tetikle
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button:has-text("Ürün"):visible').first().click();
  await sayfa.waitForTimeout(700);
  const kutu = sayfa.locator('input[placeholder="Örn. Ham Bej"]:visible').first();
  await kutu.fill("Test Rengi");
  await kutu.press("Enter");
  await sayfa.waitForTimeout(1600);

  const panel = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    return {
      panelAcik: /kaydedilemedi/i.test(metin),
      kopyalaDugmesi: [...document.querySelectorAll("button")]
        .some((b) => (b.textContent || "").trim() === "Kopyala" && b.getBoundingClientRect().width > 0),
      // Kota hatası, kaydın kendi boyutuyla DEĞİL depo doluluğuyla açıklanmalı.
      kotaTeshisi: /tarayıcı deposu dolu/i.test(metin),
      toplamKullanimYazili: /Toplam kullanım/.test(metin),
      enBuyukKayitListelendi: /cop:data/.test(metin),
      yabanciKayitListelendi: /not-defteri:tasks/.test(metin),
      kaydedilmediUyarisi: /KAYDEDİLMEDİ/.test(metin),
    };
  });
  // Toast kaybolur; panel KALMALI.
  await sayfa.waitForTimeout(2600);
  const panelHalaAcik = await sayfa.evaluate(() => /kaydedilemedi/i.test(document.body.innerText));

  await tarayici.close();
  return { hatalar, panel, panelHalaAcik };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
