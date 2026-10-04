// SENARYO — TANIMLAR'DA AÇILIR BAŞLIKLAR (4 Ekim, v1.588.0).
// Kullanıcı: "Tanımlarda tüm başlıkları açılır yap, çok fazla yer kaplıyor büyüdükçe."
// Ölçülen: Ürün sekmesinde başlıklar KAPALI başlar (içerik gizli), başlığa dokununca açılır, sayfa yenilenince
// açık bırakılan başlık açık kalır (cihazda hatırlanır), öbürleri kapalı. Diğer senaryolar `__tanimBasliklariAcik`
// ile hepsi açık koşuyor; bu senaryo kilidi kaldırıyor (`tanimBasliklariKapali: true`).
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, tanimBasliklariKapali: true });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);
  const tanimlarAc = async (sekme) => {
    await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar" }).click();
    await sayfa.waitForTimeout(700);
    await sayfa.evaluate((k) => { const b = document.querySelector(`[data-tanim-sekme="${k}"]`); if (b) b.click(); }, sekme);
    await sayfa.waitForTimeout(500);
  };
  const durum = () => sayfa.evaluate(() => {
    const g = (el) => !!(el && el.getBoundingClientRect().height > 0);
    return {
      basliklar: [...document.querySelectorAll("[data-tanim-baslik]")].map((h) => `${h.getAttribute("data-tanim-baslik")}:${h.getAttribute("data-kapali") === "1" ? "kapalı" : "açık"}`),
      bolumEkleKutusuGorunur: g(document.querySelector("[data-bolum-ekle]")),
      fiyatGrubuGorunur: g([...document.querySelectorAll("input")].find((i) => /fiyat grubu/i.test(i.placeholder || ""))),
    };
  });
  await tanimlarAc("urun");
  const kapaliBaslangic = await durum();
  await sayfa.locator('[data-tanim-baslik="Atölye İçi Bölümler"]').click();
  await sayfa.waitForTimeout(300);
  const birAcik = await durum();
  // Sayfa yenilenince seçim kalıyor (localStorage).
  await sayfa.reload();
  await sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
  await sayfa.waitForFunction(() => document.body && !document.body.innerText.includes("Yükleniyor"), null, { timeout: 20000 }).catch(() => {});
  await sayfa.waitForTimeout(1500);
  await tanimlarAc("urun");
  const yenilemeSonrasi = await durum();
  await sayfa.locator('[data-tanim-baslik="Atölye İçi Bölümler"]').click();
  await sayfa.waitForTimeout(300);
  const tekrarKapali = (await durum()).bolumEkleKutusuGorunur;
  await tanimlarAc("kullanicilar");
  const kullanicilar = await sayfa.evaluate(() => ({
    baslik: !!document.querySelector('[data-tanim-baslik="Kullanıcılar ve Yetkiler"]'),
    girisAnahtariGorunur: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Pasif" && b.getBoundingClientRect().height > 0),
  }));
  await sayfa.locator('[data-tanim-baslik="Kullanıcılar ve Yetkiler"]').click();
  await sayfa.waitForTimeout(300);
  const kullanicilarAcik = await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Pasif" && b.getBoundingClientRect().height > 0));
  await tarayici.close();
  return { hatalar, kapaliBaslangic, birAcik, yenilemeSonrasi, tekrarKapali, kullanicilar, kullanicilarAcik };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
