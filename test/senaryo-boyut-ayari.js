// SENARYO — GÖRÜNÜM: BOYUT AYARLARI (29 Eylül, v1.521.0).
//
// Kullanıcı: "butonların yerini taşıyabileceğimiz, boyutlarını değiştirebileceğimiz, tüm uygulama için" → 1. adım
// (kullanıcı: "Evet başla 1"): Tanımlar > Görünüm > Boyut — genel ölçek, düğme ve giriş kutusu boyutu.
// Ölçülen:
//   1) varsayılan: kök değişkenler 1, "Kaydet" örnek düğmesinin yüksekliği;
//   2) Düğmeler "Çok büyük" → düğme yüksekliği ~1.3 kat, kutu değişmez; Genel "Büyük" → --olcek-genel 1.1;
//   3) ayar bu cihaza kaydediliyor (localStorage `gorunum:boyut`);
//   4) "Varsayılana dön" → hepsi 1.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  const tanimlaraGit = async () => {
    await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
    await sayfa.waitForTimeout(500);
    await sayfa.locator('[data-tanim-sekme="gorunum"]').first().click();
    await sayfa.waitForTimeout(400);
  };
  const olc = () => sayfa.evaluate(() => {
    const st = getComputedStyle(document.documentElement);
    const k = document.querySelector("[data-boyut-ayarlari] .btn-save");
    const i = document.querySelector("[data-boyut-ayarlari] input");
    return {
      genel: st.getPropertyValue("--olcek-genel").trim(), dugme: st.getPropertyValue("--olcek-dugme").trim(), kutu: st.getPropertyValue("--olcek-kutu").trim(),
      dugmeYuksekligi: k ? Math.round(k.getBoundingClientRect().height) : null,
      kutuYuksekligi: i ? Math.round(i.getBoundingClientRect().height) : null,
      secili: [...document.querySelectorAll("[data-boyut-sec]")].filter((b) => /6B4E8A/i.test(b.style.borderColor) || b.style.borderColor.includes("--erp-purple") || b.style.border.includes("purple")).map((b) => b.getAttribute("data-boyut-sec")),
    };
  });
  await tanimlaraGit();
  const once = await olc();
  await sayfa.locator('[data-boyut-sec="dugme:cokBuyuk"]').click();
  await sayfa.waitForTimeout(200);
  const dugmeBuyuk = await olc();
  await sayfa.locator('[data-boyut-sec="genel:buyuk"]').click();
  await sayfa.waitForTimeout(200);
  const genelBuyuk = await olc();
  // Kalıcılık: bu cihaza yazılan kayıt (test ortamı sayfa yenilemeyi taşımıyor — kurulum sayfaya enjekte).
  const kayit = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("gorunum:boyut") || "null"));
  await sayfa.locator("[data-boyut-varsayilan]").click();
  await sayfa.waitForTimeout(200);
  const varsayilan = await olc();
  await tarayici.close();
  const oran = (a, b) => (a && b ? Math.round((a / b) * 10) / 10 : null);
  return {
    hatalar,
    once: { genel: once.genel, dugme: once.dugme, kutu: once.kutu, secili: once.secili },
    dugmeCokBuyuk: { dugme: dugmeBuyuk.dugme, dugmeOrani: oran(dugmeBuyuk.dugmeYuksekligi, once.dugmeYuksekligi), kutuDegismedi: dugmeBuyuk.kutuYuksekligi === once.kutuYuksekligi },
    genelBuyuk: { genel: genelBuyuk.genel },
    cihazaKaydedildi: kayit,
    varsayilan: { genel: varsayilan.genel, dugme: varsayilan.dugme, kutu: varsayilan.kutu },
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
