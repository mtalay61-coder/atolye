// SENARYO — SATIŞ FİŞİNDE HAZIR ÜRÜNLER (kullanıcı, 12 Eylül).
//
//   "Bu ekrana siparişin hazır ürünlerini getirecek bir bölüm olsun; üretilmiş veya tedarik edilmiş
//    ürünler listelensin, oradan satış yapılsın."
//
// Sipariş: 41 bedenden 10 çift üretime planlı (Kesim bitti, Montaj'dan 6 sağlam çıktı → hazır 6),
// 42 bedenden 5 çift satın almaya planlı (alışta 3'ü teslim alındı → hazır 3), 43 bedenden 4 çift
// planlanmamış (hazır değil). Ölçülen: hazır listesi bu iki satır; "Fişe koy" fişe HAZIR miktarı
// yazıyor (kalanın tamamını değil); kaydedince karsilanan hazır kadar artıyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 6 }, { renk: "Siyah", beden: "42", miktar: 3 }, { renk: "Siyah", beden: "43", miktar: 0 }];
  t["stok:items"] = JSON.stringify(stok);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up9", siparisNo: "2001", takipKodu: "2001", model: "Bot", urunId: "u2", renk: "Siyah", adet: 10,
    bedenMiktarlari: [{ beden: "41", miktar: 10 }], beden: "Siyah · 41:10", stogaEklendiMi: false, asama: "Montaj", durum: "Devam",
    olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [
      { proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: true, atamalar: [{ id: "x1", personelId: "c3", miktar: 10, bedenMiktarlari: { 41: 10 }, tamamlandiMi: true }] },
      { proses: "Montaj", sira: 2, verildiMi: true, tamamlandiMi: false, atamalar: [
        { id: "x2", personelId: "c3", miktar: 6, bedenMiktarlari: { 41: 6 }, tamamlandiMi: true },
        { id: "x3", personelId: "c3", miktar: 4, bedenMiktarlari: { 41: 4 }, tamamlandiMi: false },
      ] },
    ],
  }]);
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-1001", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0, kalemler: [
      { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Üretim", referansNo: "2001" } },
      { id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Satınalma", referansNo: "AS-77" } },
      { id: "k3", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "43", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD", planlama: null },
    ] },
    { id: "a1", siparisNo: "AS-77", tip: "Alış", cariId: "c1", durum: "Kısmi Teslim", tarih: "2026-09-02", teslimSayaci: 1, kalemler: [
      { id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 5, karsilanan: 3, birim: "çift", birimFiyat: 15, paraBirimi: "USD" },
    ] },
  ]);
  t["stokrez:data"] = JSON.stringify([]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1001" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(700);

  // MATRİS: satır = model+renk, sütunlar = bedenler; hücrede "hazır / stokta" (kullanıcı, 12 Eylül).
  const hazirSatirlari = await sayfa.evaluate(() => {
    const baslik = [...document.querySelectorAll("[data-hazir-urunler] thead th")].map((th) => th.textContent.trim());
    return {
      baslik,
      satirlar: [...document.querySelectorAll("[data-hazir-satir]")]
        .map((tr) => [...tr.children].slice(0, -1).map((td) => td.textContent.replace(/\s+/g, " ").trim()).join(" · ")),
    };
  });

  // SADECE FİŞİ AÇAR (23 Eylül, v1.425.0 — kullanıcı: "siparişten satış fişi oluştururken satış
  // fişini açsın sadece, geri davranış standart olacak zaten"). "Hazır olanların tümünü fişe koy"
  // otomatiği KALDIRILDI: hazır ürünler matrisi bilgi amaçlı kalıyor (yukarıda ölçüldü), fişe
  // geçmek için STANDART "Siparişten seç" kullanılıyor — o da HAZIR/olmayan ayrımı yapmadan TÜM
  // kalanı ekler; kullanıcının bilinçli tercihi budur ("geri kalanı standart olacak zaten").
  const bosAcildi = await sayfa.evaluate(() => (document.querySelector("[data-fis-koliler]") ? false : true)
    && [...document.querySelectorAll("[data-fis-miktar]")].filter((i) => i.getBoundingClientRect().width > 0).length === 0);
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-ekle]").click());
  await sayfa.waitForTimeout(500);
  const fisMiktarlari = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-miktar]")]
    .filter((i) => i.getBoundingClientRect().width > 0)
    .map((i) => `${i.getAttribute("data-fis-miktar").split("|")[1]}=${i.value}${i.title ? ` (${i.title})` : ""}`));

  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1800);   // cari satış fişinde ayrı onay penceresi yok
  const sip = (await depoOku(sayfa, "siparis:data")).find((s) => s.id === "s1");
  const karsilananlar = sip.kalemler.map((k) => `${k.beden}:${k.karsilanan || 0}`);

  await tarayici.close();
  return { hatalar, bosAcildi, hazirSatirlari, fisMiktarlari, karsilananlar };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
