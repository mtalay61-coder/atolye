// SENARYO — SİPARİŞ NOTU ÜRETİMDE KENDİ PROSESİNDE (26 Eylül, v1.476.0).
//
// Kullanıcı: "Not girdiğimizde üretime not varsa üretimin hangi prosesine ait onu da yazıp o proseste
// gösterecek. Örnek: kesim için 'deriyi iyi yerinden kes', temizleme için 'her tek poşete konacak'."
//
// Ölçülenler:
//   1. Sipariş PLANLANMIŞ (kalem kilitli): düzenleme formunda satıra "Kesim" notu eklenebiliyor ve
//      kaydedince kalemin miktarı/planlaması aynen kalırken not yazılıyor.
//   2. Üretim kartı: "Kesim" notu Kesim satırının altında, "Temizleme" notu Temizleme satırında;
//      genel not kartın başında. Notlar siparişten CANLI (üretim kaydına kopya yok).
//   3. Atölye ekranı: personelin iş kartında o prosesin notu.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.prosesler = [{ id: "p1", ad: "Kesim", sira: 1 }, { id: "p2", ad: "Temizleme", sira: 2 }];
  t["tanimlar:data"] = JSON.stringify(tanim);
  t["siparis:data"] = JSON.stringify([{
    id: "sp1", siparisNo: "SAT-N1", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-20", teslimTarihi: "2026-10-10", not: "",
    kalemler: [
      { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY",
        planlama: { tip: "Üretim", referansNo: "1001" }, notlar: [{ proses: "Temizleme", metin: "her tek poşete konacak" }, { proses: "", metin: "acil" }] },
      { id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 1, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY",
        planlama: { tip: "Üretim", referansNo: "1001" }, notlar: [{ proses: "Temizleme", metin: "her tek poşete konacak" }, { proses: "", metin: "acil" }] },
    ],
  }]);
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up1", siparisNo: "1001", takipKodu: "1001", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "40", miktar: 2 }, { beden: "41", miktar: 1 }], beden: "Siyah · 40:2, 41:1",
    rezervasyonSiparisId: "sp1", stogaEklendiMi: false, asama: "Kesim", not: "Kaynak: SAT-N1", olusturuldu: "2026-09-20T08:00:00.000Z",
    prosesIlerleme: [
      { proses: "Kesim", sira: 1, tamamlandiMi: false, personelId: null,
        atamalar: [{ id: "at1", personelId: "c3", miktar: 3, bedenMiktarlari: { 40: 2, 41: 1 }, verildiMi: true, tamamlandiMi: false, verilmeTarihi: "2026-09-21" }] },
      { proses: "Temizleme", sira: 2, tamamlandiMi: false, personelId: null, atamalar: [] },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // 1. Sipariş düzenle → kilitli satıra Kesim notu.
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const d = [...document.querySelectorAll("div")].filter((x) => x.textContent.includes("SAT-N1") && x.getBoundingClientRect().width > 0).pop(); if (d) d.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const satir = sayfa.locator('[data-siparis-duzenleme] [data-form-kalem-satiri="kilitli"]').first();
  const kilitliSatir = { var: (await satir.count()) > 0 };
  kilitliSatir.prosesSecenekleri = await satir.locator("[data-kalem-not-proses] option").allTextContents();
  await satir.locator("[data-kalem-not-proses]").selectOption("Kesim");
  await satir.locator("[data-kalem-not-metin]").fill("deriyi iyi yerinden kes");
  await satir.locator("[data-kalem-not-metin]").press("Enter");
  await sayfa.waitForTimeout(200);
  kilitliSatir.notlar = await satir.locator("[data-kalem-not]").evaluateAll((l) => l.map((x) => x.getAttribute("data-kalem-not")));
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "sp1") || {};
  const kayit = (sip.kalemler || []).map((k) => ({ beden: k.beden, miktar: k.miktar, planlama: k.planlama && k.planlama.referansNo,
    notlar: (k.notlar || []).map((n) => (n.proses ? `${n.proses}: ` : "") + n.metin) }));

  // 2. Üretim kartı.
  await modulAc(sayfa, "Üretim");
  await sayfa.waitForTimeout(700);
  // Sipariş kartındaki gizli "1001" bağlantısı da eşleşiyor: görünen son eleman tıklanıyor.
  await sayfa.evaluate(() => { const e = [...document.querySelectorAll("*")].filter((x) => x.children.length === 0 && x.textContent.trim() === "1001" && x.getBoundingClientRect().width > 0).pop(); if (e) e.click(); });
  await sayfa.waitForTimeout(900);
  const kart = await sayfa.evaluate(() => ({
    genel: [...document.querySelectorAll("[data-uretim-genel-notlar] [data-kalem-not]")].map((x) => x.getAttribute("data-kalem-not")),
    ozet: ((document.querySelector("[data-uretim-siparis-notlari]") || {}).textContent || "").replace(/\s+/g, " ").trim(),
    prosesNotlari: Object.fromEntries([...document.querySelectorAll("[data-uretim-proses-notu]")].map((d) => [d.getAttribute("data-uretim-proses-notu"), d.textContent.trim()])),
  }));
  const uretimKaydindaNotYok = !JSON.stringify((await depoOku(sayfa, "uretim:siparisler")) || []).includes("deriyi");

  // 3. Atölye ekranı: personelin elindeki Kesim işinde not.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Atölye Ekranı/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getBoundingClientRect().width > 0 && /Personel C/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const atolye = await sayfa.evaluate(() => [...document.querySelectorAll("[data-atolye-proses-notu]")].filter((d) => d.getBoundingClientRect().width > 0).map((d) => d.textContent.trim()));

  await tarayici.close();
  return { hatalar, kilitliSatir, kayit, kart, uretimKaydindaNotYok, atolye };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
