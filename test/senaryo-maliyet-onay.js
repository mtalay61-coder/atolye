// SENARYO — MALİYET OK + MALİYETTEN SATIŞ FİYATI (v1.551.0).
//
// Kullanıcı: "Maliyette maliyet ok düğmesi olsun, eksik bir şey yok anlamında ve son maliyet güncelleme
// tarihiyle. Ayrı bir grupta seçince reçete maliyeti gibi üzerine kâr koyup satış fiyatı belirleyelim;
// dışarıdan aldığımız ürünlerin alış fiyatından satış fiyatı yapalım."
//   1. Bot (reçeteli, 262 ₺) kartında Maliyet sekmesi: onay yok → "Maliyet OK" → onaylı.
//   2. Fiyat Listesi › Maliyet: "Yalnız Maliyet OK" açıkken yalnız Bot (262, ✓ OK). Kapatınca Terlik
//      (reçetesiz, alış 100 ₺) "onaylanmadı · alış".
//   3. Yalnız OK açıkken %25 kâr → Farklı kaydet → "Perakende" (yeni satış grubu): Bot 327,5; Terlik yazılmaz.
//   4. Yalnız OK kapalı, %40 → genel satış fiyatına: Terlik 140.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.aylikUretimHedefi = 3000;
  tan.genelGiderler = [{ id: "g1", ad: "Kira", grup: "yonetim", aylikTutar: 60000 }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  const deri = st.find((p) => p.id === "u1");
  deri.alisFiyati = 2; deri.alisParaBirimi = "$";
  bot.recete = [{ hammaddeUrunId: "u1", hammaddeAd: "Deri", mamulRenk: "Siyah", renk: "Siyah", beden: "", miktar: 2, birim: "desi", proses: "Kesim" }];
  bot.prosesUcretleri = { Kesim: 50 };
  st.push({ ...bot, id: "u9", ad: "Terlik", stokNo: "", recete: [], prosesUcretleri: {}, alisFiyati: 100, alisParaBirimi: "₺", hareketler: [],
    variants: bot.variants.map((v) => ({ ...v, miktar: 0 })) });
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  // ---- 1) Kart › Maliyet › Maliyet OK ----
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const kutu = () => sayfa.evaluate(() => {
    const k = document.querySelector("[data-maliyet-onay]");
    return k ? { durum: k.getAttribute("data-maliyet-onay"), tutar: (k.querySelector("[data-maliyet-onay-tutar]") || {}).textContent, eksik: k.querySelectorAll("li").length } : null;
  });
  const onayOnce = await kutu();
  const kartTam = await sayfa.evaluate(() => ((document.querySelector("[data-ozet-tam]") || {}).textContent || "").trim());
  await sayfa.locator("[data-maliyet-ok]:visible").first().click();
  await sayfa.waitForTimeout(700);
  const onaySonra = await kutu();
  const kayit = (await depoOku(sayfa, "stok:items")).find((u) => u.id === "u2").maliyetOnay;

  // ---- 2) Fiyat listesi › Maliyet ----
  await modulAc(sayfa, "Fiyat Listesi");
  await sayfa.waitForTimeout(500);
  const kok = "[data-fiyat-listesi]";
  await sayfa.locator(`${kok} [data-fl-kaynak]`).first().selectOption("__maliyet");
  await sayfa.waitForTimeout(300);
  const satirlar = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-fiyat-listesi] [data-fl-satir]")].map((tr) => ({
    ad: tr.getAttribute("data-fl-satir"),
    durum: ((tr.querySelector("[data-fl-maliyet-durum]") || {}).textContent || "").replace(/\d{1,2}\.\d{1,2}\.\d{4}/, "<tarih>").trim(),
    maliyet: (tr.querySelector("[data-fl-fiyat]") || {}).value,
  })));
  const yalnizOk = await satirlar();
  await sayfa.locator(`${kok} [data-fl-yalniz-ok]`).first().click();
  await sayfa.waitForTimeout(200);
  const hepsi = await satirlar();
  await sayfa.locator(`${kok} [data-fl-yalniz-ok]`).first().click();   // yeniden yalnız OK
  await sayfa.waitForTimeout(200);

  // ---- 3) %25 kâr → yeni satış grubu ----
  await sayfa.locator(`${kok} [data-fl-deger]`).first().fill("25");
  await sayfa.locator(`${kok} [data-fl-farkli-ac]`).first().click();
  const yeniTip = await sayfa.locator(`${kok} [data-fl-yeni-tip]`).first().inputValue();
  await sayfa.locator(`${kok} [data-fl-yeni-ad]`).first().fill("Perakende");
  await sayfa.locator(`${kok} [data-fl-farkli-kaydet]`).first().click();
  await sayfa.waitForTimeout(700);
  const tanSonra = await depoOku(sayfa, "tanimlar:data");
  const grup = (tanSonra.fiyatGruplari || []).find((g) => g.ad === "Perakende");
  const stokSonra = await depoOku(sayfa, "stok:items");
  const grupFiyati = (id) => { const k = (stokSonra.find((u) => u.id === id).fiyatKurallari || []).find((x) => x.deger === grup.id); return k ? `${k.fiyat} ${k.paraBirimi}` : "yok"; };
  const perakende = { grup: `${grup.ad}:${grup.tip}:${grup.paraBirimi}`, bot: grupFiyati("u2"), terlik: grupFiyati("u9") };

  // ---- 4) Terlik dahil %40 → genel satış ----
  await sayfa.locator(`${kok} [data-fl-kaynak]`).first().selectOption("__maliyet");
  await sayfa.waitForTimeout(200);
  await sayfa.locator(`${kok} [data-fl-yalniz-ok]`).first().click();
  await sayfa.locator(`${kok} [data-fl-deger]`).first().fill("40");
  await sayfa.locator(`${kok} [data-fl-farkli-ac]`).first().click();
  await sayfa.locator(`${kok} [data-fl-hedef]`).first().selectOption("__genelSatis");
  await sayfa.locator(`${kok} [data-fl-farkli-kaydet]`).first().click();
  await sayfa.waitForTimeout(700);
  const st2 = await depoOku(sayfa, "stok:items");
  const genelSatis = { bot: st2.find((u) => u.id === "u2").satisFiyati, terlik: st2.find((u) => u.id === "u9").satisFiyati };
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN });

  await tarayici.close();
  return { onayOnce, kartTam, onaySonra, kayit: kayit ? { kim: kayit.kim, tamTL: kayit.tamTL, tur: kayit.tur, tarihVar: !!kayit.tarih } : null,
    yalnizOk, hepsi, yeniTip, perakende, genelSatis, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
