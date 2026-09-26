// SENARYO — SİPARİŞTE RENK YAZARAK VE RESİMLİ (26 Eylül, v1.469.0).
//
// Kullanıcı (sipariş formu ekran görüntüsü, telefonun kendi açılır listesi): "Stok renk resimleri
// tanımlı ise renk içinde resim göstersin, renk eklerken de filtre olsun, yazdıkça daralan liste."
//
// Ölçülenler:
//   1. Ürün seçilince renk kutusu: dokununca bütün renkler, resmi olanda resim.
//   2. Yazdıkça daralıyor; seçilen rengin resmi kutunun içinde; ölçü matrisi açılıyor.
//   3. Yarım yazım seçimi boşaltıyor (matris kapanıyor), kutudan çıkınca ilk eşleşene oturuyor.
//   4. "+ Renk" paneli: pozisyon yazarak seçiliyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const RESIM = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#222"/></svg>');

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [...bot.variants, ...["40", "41", "42"].map((b) => ({ renk: "Kahve Süet", beden: b, miktar: 0, minStok: 0 }))];
  bot.renkResimleri = { Siyah: RESIM };
  t["stok:items"] = JSON.stringify(stok);
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.renkler = [...(tanim.renkler || []), { id: "mr1", ad: "Taba Süet", tip: "Mamul", kod: "71" }, { id: "mr2", ad: "Taba Deri", tip: "Mamul", kod: "72" }];
  t["tanimlar:data"] = JSON.stringify(tanim);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Yeni Sipariş/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.locator('input[placeholder="Model ara…"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("button:visible", { hasText: "Bot" }).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(400);

  const kutu = sayfa.locator("[data-siparis-renk-arama]:visible").first();
  const oneriler = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-aramali-oneri]")].filter((b) => b.offsetParent)
    .map((b) => `${b.getAttribute("data-aramali-oneri")}${b.querySelector("[data-aramali-oneri-resim]") ? " (resim)" : ""}`));
  const matrisVar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-olcu-miktar]")].some((x) => x.offsetParent));
  const sonuc = {};
  await kutu.click();
  await sayfa.waitForTimeout(200);
  sonuc.hepsi = await oneriler();
  await kutu.fill("süe");
  await sayfa.waitForTimeout(200);
  sonuc.sueYazinca = await oneriler();
  await sayfa.locator('[data-aramali-oneri="Kahve Süet"]').dispatchEvent("mousedown");
  await sayfa.waitForTimeout(300);
  sonuc.kahveSecilince = { kutu: await kutu.inputValue(), kutuResmi: await sayfa.evaluate(() => !!document.querySelector("[data-aramali-kutu-resim]")), matris: await matrisVar() };
  await kutu.fill("si");
  await sayfa.waitForTimeout(200);
  sonuc.yarimYazimda = { matris: await matrisVar() };
  await sayfa.locator('input[placeholder="Model ara…"]:visible').first().focus();
  await sayfa.keyboard.press("Escape");
  await sayfa.waitForTimeout(300);
  sonuc.cikinca = { kutu: await kutu.inputValue(), kutuResmi: await sayfa.evaluate(() => !!document.querySelector("[data-aramali-kutu-resim]")), matris: await matrisVar() };

  // + Renk paneli: 1 renkli, pozisyon yazarak.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && x.textContent.trim() === "Renk" && x.title && /yeni renk/.test(x.title)); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const poz = sayfa.locator("[data-siparis-yeni-renk-poz]:visible").first();
  sonuc.pozKutusu = (await poz.count()) > 0;
  if (sonuc.pozKutusu) {
    await poz.click();
    await poz.fill("tab");   // "taba" tohumdaki "Taba" ile tam eşleşir, liste bilerek süzülmez
    await sayfa.waitForTimeout(200);
    // Yalnız pozisyon kutusunun kendi listesi (renk kutusunun listesi karışmasın).
    sonuc.pozTaba = await poz.evaluate((i) => [...i.parentElement.querySelectorAll("[data-aramali-oneri]")].map((b) => b.getAttribute("data-aramali-oneri")));
    await sayfa.locator('[data-aramali-oneri="Taba Deri (72)"]').dispatchEvent("mousedown");
    await sayfa.waitForTimeout(200);
    sonuc.pozSecilen = await poz.inputValue();
  }

  await tarayici.close();
  return { hatalar, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
