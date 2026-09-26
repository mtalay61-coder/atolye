// SENARYO — SİPARİŞ FORMU DÜZENİ VE RENK BAZLI AÇIKLAMA (26 Eylül, v1.470.0).
//
// Kullanıcı (sipariş düzenleme ekran görüntüsü): "Birim fiyatı, para tipini üst satıra al, gerekirse
// yazıları ufalt. Asorti ve asorti seçiciyi tek satıra topla, kalemlere ekle'nin adını Ekle yap ve
// rengi yeşil olsun. Barkod okutu da tıklayınca açılsın, kullanmayınca çok yer kaplıyor. Eklerken
// açıklama satırda olsun, renk bazlı açıklama girebilelim, tek tek."
//
// Ölçülenler:
//   1. Barkod paneli kapalı gelir (tek ince düğme), tıklayınca açılır, kapatılabilir.
//   2. Birim fiyat ürün ve renkle AYNI satırda.
//   3. Asorti, açıklama ve "Ekle" (yeşil, adı yalnız "Ekle") tek satırda, matrisin üstünde.
//   4. Eklerken yazılan açıklama o rengin bütün ölçülerine gidiyor; satırda düzeltilebiliyor;
//      ikinci "Ekle" (açıklamasız) önceki açıklamayı silmiyor.
//   5. Kaydedince açıklamalar siparişte ve sipariş kartında.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // Bot'a ikinci renk (tohumda yalnız Siyah var).
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [...bot.variants, ...["40", "41", "42"].map((b) => ({ renk: "Taba", beden: b, miktar: 0, minStok: 0 }))];
  t["stok:items"] = JSON.stringify(stok);
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.asortiler = [{ id: "as1", ad: "3'lü", oranlar: [{ beden: "40", oran: 1 }, { beden: "41", oran: 1 }, { beden: "42", oran: 1 }] }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  t["siparis:data"] = JSON.stringify([
    {
      id: "sf1", siparisNo: "SAT-F1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
      tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "", musteriKodu: "",
      kalemler: [
        { id: "kf1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" },
      ],
    },
  ]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")].filter((x) => x.textContent.includes("SAT-F1") && x.getBoundingClientRect().width > 0).pop();
    if (d) d.click();
  });
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);

  const FORM = "[data-siparis-duzenleme]";
  // 1. Barkod paneli.
  const barkod = {};
  const barkodKutusuVar = () => sayfa.evaluate((F) => !!document.querySelector(`${F} input[placeholder="Okutun ya da kodu yazıp Enter"]`), FORM);
  barkod.acilista = { dugme: await sayfa.locator(`${FORM} [data-barkod-paneli-ac]`).count() > 0, kutu: await barkodKutusuVar() };
  await sayfa.locator(`${FORM} [data-barkod-paneli-ac]`).click();
  await sayfa.waitForTimeout(200);
  barkod.tiklayinca = { kutu: await barkodKutusuVar() };
  await sayfa.locator(`${FORM} [data-barkod-paneli-kapat]`).click();
  await sayfa.waitForTimeout(200);
  barkod.kapatinca = { kutu: await barkodKutusuVar() };

  // Kalem formu: Bot · Taba (siparişte yalnız Siyah var → yeni satır).
  const urunSec = async () => {
    await sayfa.locator(`${FORM} input[placeholder="Model ara…"]`).first().click();
    await sayfa.waitForTimeout(300);
    await sayfa.locator(`${FORM} button`, { hasText: "Bot" }).first().dispatchEvent("mousedown");
    await sayfa.waitForTimeout(400);
  };
  const renkSec = async (renk) => {
    const k = sayfa.locator(`${FORM} [data-siparis-renk-arama]`).first();
    await k.click();
    await k.fill(renk.slice(0, 3).toLocaleLowerCase("tr-TR"));
    await sayfa.waitForTimeout(200);
    await sayfa.locator(`${FORM} [data-aramali-oneri="${renk}"]`).first().dispatchEvent("mousedown");
    await sayfa.waitForTimeout(300);
  };
  await urunSec();
  await renkSec("Taba");

  // 2 + 3. Yerleşim.
  const duzen = await sayfa.evaluate((F) => {
    const form = document.querySelector(F);
    // Alanların ETİKETLERİ karşılaştırılıyor: arama kutusunun iç çerçevesi birkaç piksel farklı.
    const ust = (el) => (el ? Math.round((el.closest("label") || el).getBoundingClientRect().top) : null);
    const urun = form.querySelector('input[placeholder="Model ara…"]');
    const renk = form.querySelector("[data-siparis-renk-arama]");
    const fiyat = form.querySelector("[data-siparis-birim-fiyat]");
    const ekle = form.querySelector("[data-kalemlere-ekle]");
    // v1.476.0: açıklama kutusu proses bazlı not düzenleyicisi oldu (metin kutusu ölçülüyor).
    const aciklama = form.querySelector("[data-siparis-kalem-notlari] [data-kalem-not-metin]");
    const uygula = [...form.querySelectorAll("button")].find((b) => b.textContent.trim() === "Uygula");
    const matris = form.querySelector("[data-olcu-miktar]");
    return {
      fiyatUrunleAyniSatirda: Math.abs(ust(fiyat) - ust(urun)) <= 6 && Math.abs(ust(fiyat) - ust(renk)) <= 6,
      ekleAdi: ekle && ekle.textContent.trim(),
      ekleYesil: ekle && getComputedStyle(ekle).backgroundColor,
      asortiAciklamaEkleAyniSatirda: !!(uygula && aciklama && ekle)
        && Math.abs(uygula.getBoundingClientRect().top + uygula.getBoundingClientRect().height / 2 - (ekle.getBoundingClientRect().top + ekle.getBoundingClientRect().height / 2)) <= 6
        && Math.abs(aciklama.getBoundingClientRect().top + aciklama.getBoundingClientRect().height / 2 - (ekle.getBoundingClientRect().top + ekle.getBoundingClientRect().height / 2)) <= 6,
      ekleMatrisinUstunde: !!(ekle && matris) && ekle.getBoundingClientRect().bottom <= matris.getBoundingClientRect().top,
      kalemlereEkleYazisiYok: !/Kalemlere Ekle/.test(form.textContent),
    };
  }, FORM);

  // 4. Notlu ekleme: Taba 40 × 2, 41 × 1. v1.476.0: önce "Kesim" prosesine not "+" ile, sonra genel
  // not yazılıp "+"lanmadan Ekle — yazılı kalan taslak da kaleme gitmeli.
  await sayfa.locator(`${FORM} [data-olcu-miktar="40"]`).fill("2");
  await sayfa.locator(`${FORM} [data-olcu-miktar="41"]`).fill("1");
  const formNot = sayfa.locator(`${FORM} [data-siparis-kalem-notlari]`);
  await formNot.locator("[data-kalem-not-proses]").selectOption("Kesim");
  await formNot.locator("[data-kalem-not-metin]").fill("deriyi iyi yerinden kes");
  await formNot.locator("[data-kalem-not-ekle]").click();
  await formNot.locator("[data-kalem-not-proses]").selectOption("");
  await formNot.locator("[data-kalem-not-metin]").fill("sert taban");
  await sayfa.locator(`${FORM} [data-kalemlere-ekle]`).click();
  await sayfa.waitForTimeout(400);
  // Açıklamasız ikinci ekleme aynı renge: miktar artar, açıklama kalır.
  await urunSec();
  await renkSec("Taba");
  await sayfa.locator(`${FORM} [data-olcu-miktar="40"]`).fill("1");
  await sayfa.locator(`${FORM} [data-kalemlere-ekle]`).click();
  await sayfa.waitForTimeout(400);
  const satirAciklamalari = () => sayfa.evaluate((F) => [...document.querySelectorAll(`${F} [data-form-kalem-satiri]`)].map((tr) => {
    const renk = (tr.querySelector("[data-form-kalem-renk]") || {}).value;
    const notlar = [...tr.querySelectorAll("[data-form-kalem-notlari] [data-kalem-not]")].map((n) => n.getAttribute("data-kalem-not"));
    return `${renk}: ${notlar.join(" | ") || "(boş)"}`;
  }), FORM);
  const eklemeSonrasi = await satirAciklamalari();
  const formSifirlandi = await sayfa.evaluate((F) => {
    const d = document.querySelector(`${F} [data-siparis-kalem-notlari]`);
    if (!d) return "kutu gizli";
    return d.querySelectorAll("[data-kalem-not]").length === 0 && d.querySelector("[data-kalem-not-metin]").value === "";
  }, FORM);

  // Siyah satırın açıklamasını satırda yaz.
  const siyahAciklama = sayfa.locator(`${FORM} [data-form-kalem-satiri="serbest"]`).first().locator("[data-form-kalem-notlari] [data-kalem-not-metin]");
  await siyahAciklama.fill("fermuarlı");
  await siyahAciklama.press("Enter");
  await sayfa.waitForTimeout(300);
  const satirdaDuzeltince = await satirAciklamalari();

  // 5. Kaydet.
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sf1") || {};
  const kayit = (sip.kalemler || []).map((k) => `${k.renk} ${k.beden} × ${k.miktar}: ${(k.notlar || []).map((n) => (n.proses ? `${n.proses}: ` : "") + n.metin).join(" | ") || k.aciklama || "—"}`).sort();
  const kartta = await sayfa.evaluate(() => [...document.querySelectorAll("[data-kart-kalem-aciklama]")]
    .filter((d) => d.getBoundingClientRect().width > 0).map((d) => d.textContent.trim()));

  await tarayici.close();
  return { hatalar, barkod, duzen, eklemeSonrasi, formSifirlandi, satirdaDuzeltince, kayit, kartta: [...new Set(kartta)].sort() };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
