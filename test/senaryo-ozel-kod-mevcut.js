// SENARYO — ÖZEL KOD ALANI: MEVCUTLARDAN SEÇ (5 Ekim, v1.596.0).
// Kullanıcı: "özel kod eklerken eklenmişlerden göster, onlardan ekleyelim, yoksa yeni açalım." Ölçülen: Tanımlar'da yalnız
// "Taban" tipine açılmış "Kalıp No" alanı var; Deri (tipsiz) kartında Özel Kodlar › Alan Ekle'de "Mevcut alanlardan seç…"
// listesinde "Kalıp No" çıkıyor; seçilince GENEL kapsamda aynı adla açılıyor ve kartta görünüyor; liste artık boş (gizli).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.ozelKodAlanlari = [{ id: "oka-t", ad: "Kalıp No", kapsamTuru: "malzeme", kapsamAd: "Taban" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Deri" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1100);
  await sayfa.locator('button:has-text("Özel Kodlar"):visible').first().click();
  await sayfa.waitForTimeout(500);
  const alanBasliklari = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-ozel-kod-alan]")].map((x) => x.getAttribute("data-ozel-kod-alan")));
  const once = { alanlar: await alanBasliklari(), kalipGorunuyor: await sayfa.evaluate(() => /Kalıp No/.test(document.body.innerText)) };
  await sayfa.locator('button:has-text("Alan Ekle"):visible').first().click();
  await sayfa.waitForTimeout(300);
  const secenekler = await sayfa.evaluate(() => { const s = document.querySelector("[data-ozel-kod-mevcut]"); return s ? [...s.options].map((o) => o.value).filter(Boolean) : "yok"; });
  await sayfa.locator("[data-ozel-kod-mevcut]").selectOption("Kalıp No");
  await sayfa.waitForTimeout(900);
  const tanimSon = await depoOku(sayfa, "tanimlar:data");
  const alanlar = ((tanimSon || {}).ozelKodAlanlari || []).map((a) => `${a.ad} · ${a.kapsamTuru || "genel"}${a.kapsamAd ? " · " + a.kapsamAd : ""}`);
  const sonra = { kalipGorunuyor: await sayfa.evaluate(() => /Kalıp No/.test(document.body.innerText)), girisAcik: await sayfa.locator('input[placeholder="Örn. Taban"]:visible').count() };
  await sayfa.locator('button:has-text("Alan Ekle"):visible').first().click();
  await sayfa.waitForTimeout(300);
  const seciciKaldi = await sayfa.locator("[data-ozel-kod-mevcut]").count();
  await tarayici.close();
  return { hatalar, once, secenekler, alanlar, sonra, seciciKaldi };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
