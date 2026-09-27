// SENARYO — RENK ALANININ BAŞLIĞI STOĞA GÖRE (27 Eylül, v1.494.0).
//
// Kullanıcı: "Renk alanını bazen tip, bazen marka adı, bazen cins olarak kullanıyoruz. Renk adı stoğa
// göre değiştirilebilir de olsun. Stok hareketlerinde ortak isim olduğunda üst başlık ortak olsun,
// değişince ayrı satır eklesin. Örnek: ambalaj üzerindeki baskı değişikliği; takviye bezi kalınlığı."
// Seçim: başlık kartta (Baskı, Kalınlık…), karışık listede ortaksa tek başlık, değilse ara satır.
//
// Ölçülenler:
//   1. Kartta "Renk alanının başlığı" Kalınlık yapılıp kaydedilince ürüne yazılıyor.
//   2. Fiş formunda o ürün seçilince alan etiketi "Kalınlık".
//   3. Fişte yalnız Kalınlık'lı ürün: renk sütunu "KALINLIK", ara başlık yok.
//   4. Renk başlıklı bir ürün de eklenince: sütun "KALINLIK / RENK", başlık değiştiği yerde ara satırlar.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({ id: "tb", ad: "Takviye Bezi", kategori: "Hammadde", birim: "metre", alisFiyati: 5, hareketler: [],
    variants: ["1 mm", "2 mm"].map((r) => ({ renk: r, beden: "Standart", miktar: 0, minStok: 0 })) });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // 1. Kartta başlığı değiştir.
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Takviye Bezi" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('[data-kart-eylem="duzenle"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-renk-basligi-duzenle]:visible").first().fill("Kalınlık");
  await sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click();
  await sayfa.waitForTimeout(700);
  const kayit = (((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "tb") || {}).renkBasligi;
  // Kartta: bölüm başlığı, sayım, ekleme düğmesi ve (açınca) matris köşesi başlığı izliyor.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^Kalınlık ve Bedenler$/.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(300);
  const kartMatrisi = await sayfa.evaluate(() => {
    const gorunur = (e) => e.getBoundingClientRect().width > 0;
    const bolum = [...document.querySelectorAll("span")].find((e) => gorunur(e) && / ve Bedenler$/.test(e.textContent.trim()));
    const kose = [...document.querySelectorAll("th")].find((x) => gorunur(x) && /Kalınlık/.test(x.textContent));
    const dugme = [...document.querySelectorAll("button")].find((x) => gorunur(x) && / Ekle$/.test(x.textContent.trim()) && /Kalınlık/.test(x.textContent));
    return { bolum: bolum ? bolum.parentElement.innerText.replace(/\s+/g, " ").trim().slice(0, 60) : null, kose: kose ? kose.textContent.trim() : null, dugme: dugme ? dugme.textContent.trim() : null };
  });

  // 2-4. Alış fişi.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(400);
  await sayfa.locator('button:has-text("Tedarikçi A")').nth(1).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(600);
  const urunSec = async (ad) => {
    const etiket = await sayfa.evaluate((a) => {
      const dl = document.getElementById("fis-urun-listesi");
      const o = dl ? [...dl.options].find((x) => x.value.startsWith(a)) : null;
      return o ? o.value : a;
    }, ad);
    await sayfa.locator("[data-urun-arama]").first().fill(etiket);
    await sayfa.waitForTimeout(400);
  };
  const tablo = () => sayfa.evaluate(() => ({
    sutun: (document.querySelector("[data-fis-renk-sutunu]") || {}).textContent || null,
    araBasliklar: [...document.querySelectorAll("[data-fis-renk-ara-baslik]")].map((x) => x.textContent.trim()),
  }));
  await urunSec("Takviye Bezi");
  const alanEtiketi = await sayfa.evaluate(() => { const i = document.querySelector("[data-renk-arama]"); return i ? i.closest("label").firstChild.textContent.trim() : null; });
  await sayfa.locator("[data-renk-arama]").first().fill("2 mm");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("3");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(500);
  const tekBaslik = await tablo();
  await urunSec("Deri");
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("4");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(500);
  const karisik = await tablo();

  await tarayici.close();
  return { hatalar, kayit, kartMatrisi, alanEtiketi, tekBaslik, karisik };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
