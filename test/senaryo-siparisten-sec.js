// SENARYO — ALIŞ FİŞİNE BAŞKA SİPARİŞTEN SATIR: "SİPARİŞTEN SEÇ" (9b, 13 Eylül).
//
//   "Alış fişini siparişten oluşturuyoruz, tek satır ekleyebiliyor. 'Siparişten seç' butonu olsun,
//    aynı carinin eklenebilir alımlarını getirsin."
//
// Aynı tedarikçinin iki açık alış siparişi (AS-1: Bot Siyah 41×10; AS-2: Bot Siyah 42×5). AS-1'in
// kartından Alış Fişi Oluştur → "Siparişten seç" → AS-2'nin kalemleri fişe → tek fiş kaydedilir.
// Ölçülen: tek fiş (AS-1-F1) iki kalem; AS-1 ve AS-2 ikisi de Tamamlandı (karşılanan kendi
// kaydında); 42 bedenin stok hareketi AS-2'yi taşıyor; fiş silinince iki sipariş de geri dönüyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 0 }, { renk: "Siyah", beden: "42", miktar: 0 }];
  bot.hareketler = [];
  t["stok:items"] = JSON.stringify(stok);
  // SAT-9: kaynak bağlantısının gideceği satış siparişi.
  t["siparis:data"] = JSON.stringify([
    { id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-10", kalemler: [
      { id: "sk9", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD" } ] },
    { id: "a1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-11", not: "Kaynak: SAT-9", kalemler: [
      { id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 15, paraBirimi: "USD" } ] },
    { id: "a2", siparisNo: "AS-2", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-12", kalemler: [
      { id: "ak2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 15, paraBirimi: "USD" } ] },
    // Başka cariye ait açık alış: listeye GİRMEMELİ.
    { id: "a3", siparisNo: "AS-3", tip: "Alış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-12", kalemler: [
      { id: "ak3", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 7, karsilanan: 0, birim: "çift", birimFiyat: 15, paraBirimi: "USD" } ] },
  ]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Alış Siparişi");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Tümü (3)"):visible').first().click().catch(() => {});
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "AS-1" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  // TEK EKRAN (23 Eylül, v1.431.0): fiş BOŞ açılıyor; AS-1'in kalemleri de "Siparişten seç"ten
  // geliyor. Eski formdaki "kendi kalemini ekle" adımı kalktı.
  // Siparişten seç → yalnız AS-2 listelenmeli (AS-3 başka cari).
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(400);
  const listelenen = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparisten-sec-siparis]")].map((e) => e.getAttribute("data-siparisten-sec-siparis")));
  // Bu carinin AÇIK siparişlerinin HEPSİ eklenir (AS-1 ve AS-2; AS-3 başka cari — listelenmez).
  // Eskiden AS-1 formdan, AS-2 buradan geliyordu; tek ekranda ikisi de aynı yoldan.
  const eklenecek = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparisten-ekle]")].length);
  for (let i = 0; i < eklenecek; i++) {
    await sayfa.evaluate(() => { const b = document.querySelector("[data-siparisten-ekle]"); if (b) b.click(); });
    await sayfa.waitForTimeout(500);
  }
  // FİŞTE FİYAT (14 Eylül): alış fişinde birim fiyat ve P.B. değiştirilebiliyor; fişe girilen
  // fiyat yazılıyor, sipariş kaydının fiyatı DEĞİŞMİYOR.
  // FİŞTE FİYAT (14 Eylül kuralı, v1.431.0'de ortak ekrana taşındı): fiş satırında birim fiyat
  // değiştirilebiliyor; fişe girilen fiyat yazılıyor, siparişin kendi fiyatı DEĞİŞMİYOR.
  const fiyatKutusuVar = await sayfa.evaluate(() => !!document.querySelector("[data-fis-satir-fiyat]") && !!document.querySelector("[data-fis-pb]"));
  const fiyatKutusu = sayfa.locator("[data-fis-satir-fiyat]").first();
  await fiyatKutusu.fill("17.5");
  await fiyatKutusu.blur();
  await sayfa.waitForTimeout(300);
  const kutular = await sayfa.locator("[data-fis-miktar]:visible").count();
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);

  const fiyatSonuc = {
    fiyatKutusuVar,
    fisFiyatlari: ((await depoOku(sayfa, "cari:data")).find((c) => c.id === "c1").hareketler || [])
      .filter((h) => h.birimFiyat).map((h) => `${h.beden}:${h.birimFiyat}`),
    siparisFiyati: (await depoOku(sayfa, "siparis:data")).filter((s2) => s2.cariId === "c1").flatMap((s2) => s2.kalemler.map((k) => k.birimFiyat)),
  };
  const siparislerSonra = (await depoOku(sayfa, "siparis:data")).filter((s) => s.cariId === "c1").map((s) => `${s.siparisNo}:${s.durum}:${s.kalemler.map((k) => k.karsilanan).join(",")}`);
  const stokSonra = (await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2");
  const hareketler = (stokSonra.hareketler || []).filter((h) => h.kaynak === "Satınalma").map((h) => `${h.beden}:${h.miktar}:${h.fisNo}:${h.siparisNo}`);
  const fisNolar = [...new Set((stokSonra.hareketler || []).map((h) => h.fisNo))];
  const digerCariyeAitListelendi = listelenen.includes("AS-3");

  // GERİ ALMA: Fişler'de fişi sil → iki siparişin karşılananı da geri dönmeli.
  // Cari ekstresinden fiş grubunu sil (iki aşamalı) — senaryo-silme ile aynı yol.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title="Sil"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): ikinci adım penceredeki Sil.
  await sayfa.locator('[data-sil-onayla]').first().click();
  await sayfa.waitForTimeout(1500);
  const geriAlSonrasi = (await depoOku(sayfa, "siparis:data")).filter((s) => s.cariId === "c1").map((s) => `${s.siparisNo}:${s.durum}:${s.kalemler.map((k) => k.karsilanan).join(",")}`);

  // KAYNAK BAĞLANTISI (15 Eylül): alış siparişinin "Kaynak: SAT-…" notundaki numara tıklanınca
  // satış siparişine (başka modül) gidiyor.
  const kaynakBaglantisi = await sayfa.evaluate(() => {
    const b = document.querySelector("[data-kaynak-siparis]");
    return b ? b.getAttribute("data-kaynak-siparis") : null;
  });

  // ---- (b) DEPO'DAN AÇILAN CARİ › ALIŞ FİŞİ: "Siparişten seç" → satır siparişe bağlı, teslim alınan artar.
  // Kart silme adımında zaten açık; kapalıysa aç (tıklama aç/kapa).
  if (!(await sayfa.evaluate(() => [...document.querySelectorAll("button")].some((x) => /Alış Fişi$/.test(x.textContent.trim()) && x.offsetParent)))) {
    await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click();
    await sayfa.waitForTimeout(700);
  }
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Alış Fişi$/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const formdaSec = await sayfa.evaluate(() => !!document.querySelector("[data-siparisten-sec]"));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-siparisten-sec]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const formdaListelenen = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparisten-sec-siparis]")].map((e) => e.getAttribute("data-siparisten-sec-siparis")));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-siparisten-ekle="AS-1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const rozet = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-satir-siparis]")].map((e) => e.getAttribute("data-fis-satir-siparis")));
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1800);
  const depoYoluSonrasi = (await depoOku(sayfa, "siparis:data")).filter((s) => s.cariId === "c1").map((s) => `${s.siparisNo}:${s.durum}:${s.kalemler.map((k) => k.karsilanan).join(",")}`);
  const depoHareket = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").hareketler || []).filter((h) => h.kaynak === "Satınalma").map((h) => `${h.beden}:${h.miktar}:${h.siparisNo}`);

  await tarayici.close();
  return { hatalar, kaynakBaglantisi, listelenen, digerCariyeAitListelendi, kutular, fiyatSonuc, siparislerSonra, hareketler, fisNolar, geriAlSonrasi, depoYolu: { formdaSec, formdaListelenen, rozet, sonrasi: depoYoluSonrasi, hareket: depoHareket } };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
