// SENARYO — SİPARİŞTE KDV SATIR EKLENİRKEN (27 Eylül, v1.502.0).
//
// Kullanıcı: "Siparişte de satır eklerken KDV girilsin" (fişle aynı kural, v1.501.0). Önceden siparişten
// kesilen satış fişi KDV'yi hiç sormuyor, cariye KDV'siz yazıyordu.
// Kurulum: KDV açık (mamul %10). SAT-F1'de oranı kayıtlı olmayan eski satır (Bot Siyah 40 × 5 @ 400).
// Ölçülenler:
//   1. Düzenlemede Bot · Taba seçilince giriş satırındaki KDV kutusu %10 gelir; %20 seçilip eklenir.
//   2. Kalem tablosunda KDV sütunu yalnız yazı: Taba %20; eski satır ürünün oranıyla soluk (%10, "kayıtlı değil").
//   3. Döküm: KDV %10 = 200, %20 = 160, KDV dahil 3.160 (matrah 2.000 + 800).
//   4. Kaydedince Taba kaleminde kdvOrani 20, eski kalemde yok.
//   5. Kartta "Satış Fişi Oluştur" → Siparişten seç → "Kolisiz kalanı ekle" → kaydet: cariye Siyah %10,
//      Taba %20 ile KDV dahil yazılır.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [...bot.variants.map((v) => ({ ...v, miktar: 50 })), ...["40", "41"].map((b) => ({ renk: "Taba", beden: b, miktar: 50, minStok: 0 }))];
  t["stok:items"] = JSON.stringify(stok);
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.firmaBilgileri = { ...(tanim.firmaBilgileri || {}), kdvAktif: true, kdvMamul: 10, kdvDiger: 20 };
  t["tanimlar:data"] = JSON.stringify(tanim);
  t["siparis:data"] = JSON.stringify([{
    id: "sf1", siparisNo: "SAT-F1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "", musteriKodu: "",
    kalemler: [{ id: "kf1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" }],
  }]);

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
  await sayfa.locator(`${FORM} input[placeholder="Model ara…"]`).first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator(`${FORM} button`, { hasText: "Bot" }).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(400);
  const k = sayfa.locator(`${FORM} [data-siparis-renk-arama]`).first();
  await k.click(); await k.fill("tab"); await sayfa.waitForTimeout(200);
  await sayfa.locator(`${FORM} [data-aramali-oneri="Taba"]`).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(300);
  await sayfa.locator(`${FORM} [data-olcu-miktar="40"]`).fill("2");
  await sayfa.locator(`${FORM} [data-siparis-birim-fiyat]`).fill("400");
  const kutu = sayfa.locator(`${FORM} [data-siparis-kalem-kdv]`);
  const girisVarsayilan = await kutu.inputValue();
  await kutu.selectOption("20");
  await sayfa.locator(`${FORM} [data-kalemlere-ekle]`).click();
  await sayfa.waitForTimeout(400);
  const tablo = await sayfa.evaluate((F) => ({
    sutun: !!document.querySelector(`${F} [data-siparis-kdv-sutunu]`),
    hucreler: [...document.querySelectorAll(`${F} [data-siparis-satir-kdv]`)].map((e) => `${e.tagName === "TD" && !e.querySelector("select") ? "yazı" : "seçici"} ${e.innerText.trim()}${e.title ? " (kayıtlı değil)" : ""}`),
    dokum: ((document.querySelector(`${F} [data-siparis-kdv-dokumu]`) || {}).innerText || "").replace(/\s+/g, " ").trim(),
  }), FORM);
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sf1") || {};
  const kayit = (sip.kalemler || []).map((x) => `${x.renk} ${x.beden} × ${x.miktar}: ${typeof x.kdvOrani === "number" ? `%${x.kdvOrani}` : "oran yok"}`).sort();

  // Siparişten satış fişi
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-siparisten-sec]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-siparisten-ekle="SAT-F1"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  const fisOranlari = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-satir-kdv]")].map((e) => e.innerText.trim()));
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);
  const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const hareketler = (cari.hareketler || []).filter((h) => h.miktar)
    .map((h) => `${h.renk} ${h.beden} ${h.miktar} × ${h.birimFiyat} → tutar ${h.tutar}` + (h.kdvTutari != null ? ` (matrah ${h.matrah}, %${h.kdvOrani}, KDV ${h.kdvTutari})` : " (KDV YOK)")).sort();

  await tarayici.close();
  return { hatalar, girisVarsayilan, tablo, kayit, fisOranlari, hareketler };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
