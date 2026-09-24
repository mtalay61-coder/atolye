// SENARYO — ÜÇ MODELLİ SİPARİŞTE İKİSİNİ TEK FİŞTE SATMA.
//
// Kullanıcının sorusu: "1 siparişimiz var, içinde 3 ayrı model satır var. 3 modelin 2'si için tek
// fişte satış yapmak istiyorum: SAT-1001-F1 içinde 2 model."
//
// Ölçülen: iki model "Kalem Ekle" ile ayrı satır olarak ekleniyor, kaydedince İKİSİ DE AYNI fiş
// numarasına yazılıyor ve üçüncü model fişin dışında kalıp siparişte bekliyor.
// ORTAK FİŞ EKRANINA TAŞINDI (23 Eylül, v1.431.0): alış da tek ekranda. Yeni yolda "Siparişten seç"
// siparişin TAMAMINI getiriyor; fişte kalmasını istemediğin modelin satırları tek tek çıkarılıyor.
// Ölçülen davranış aynı: iki model tek fiş numarasında, üçüncüsü siparişte bekliyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  // Üç ayrı MAMUL model, hepsinde stok var (satış yapılabilsin)
  stok.push(
    { id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Bej", beden: "40", miktar: 50 }, { renk: "Bej", beden: "41", miktar: 50 }],
      hareketler: [], recete: [], birimFiyat: 465 },
    { id: "m2", ad: "SS Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Beyaz", beden: "40", miktar: 50 }, { renk: "Beyaz", beden: "41", miktar: 50 }],
      hareketler: [], recete: [], birimFiyat: 520 },
    { id: "m3", ad: "300 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
      variants: [{ renk: "Siyah", beden: "40", miktar: 50 }], hareketler: [], recete: [], birimFiyat: 600 },
  );
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-1001", tip: "Alış", cariId: "c1", durum: "Onaylandı",
    tarih: "2026-08-25", teslimTarihi: "2026-09-10", teslimSayaci: 0,
    kalemler: [
      { id: "k1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "40", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "k2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "41", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "k3", urunId: "m2", urunAd: "SS Model", renk: "Beyaz", beden: "40", miktar: 8, karsilanan: 0, birim: "çift", birimFiyat: 520, paraBirimi: "TRY" },
      { id: "k4", urunId: "m2", urunAd: "SS Model", renk: "Beyaz", beden: "41", miktar: 8, karsilanan: 0, birim: "çift", birimFiyat: 520, paraBirimi: "TRY" },
      { id: "k5", urunId: "m3", urunAd: "300 Model", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 600, paraBirimi: "TRY" },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
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
  await sayfa.waitForTimeout(900);

  // Siparişin üç modeli de fişe gelir…
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-ekle]").click());
  await sayfa.waitForTimeout(600);
  const eklenenSatir = await sayfa.locator("[data-fis-miktar]:visible").count();

  // …üçüncü model (300 Model) fişten ÇIKARILIR: bu fişte yalnız iki model kalsın.
  // 300 Model'in satırını ürün adından bul; o satırın miktar kutularının YANINDAKİ çıkar düğmelerine bas.
  // (Çıkar düğmesi miktar kutusuyla aynı hücrede duruyor — satır eşlemesi ürün adı hücresinden.)
  await sayfa.evaluate(() => {
    const satir = [...document.querySelectorAll("tr")].find((tr) => {
      const ilk = tr.querySelector("td");
      return ilk && /300 Model/.test(ilk.textContent) && tr.querySelector("[data-fis-miktar]");
    });
    if (!satir) return;
    [...satir.querySelectorAll('button[title="Bu bedeni fişten çıkar"]')].forEach((b) => b.click());
  });
  await sayfa.waitForTimeout(500);
  const satirSayisi = await sayfa.locator("[data-fis-miktar]:visible").count();
  const ucuncuModelKaldiMi = await sayfa.evaluate(() => [...document.querySelectorAll("tr")]
    .some((tr) => { const ilk = tr.querySelector("td"); return ilk && /300 Model/.test(ilk.textContent) && tr.querySelector("[data-fis-miktar]"); }));

  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);

  const cariler = await depoOku(sayfa, "cari:data");
  const musteri = cariler.find((c) => c.id === "c1");   // alışa çevrildi: tedarikçi
  const gruplar = {};
  (musteri.hareketler || []).forEach((h) => {
    gruplar[h.fisNo] = gruplar[h.fisNo] || [];
    gruplar[h.fisNo].push(`${h.urunAd} ${h.renk} ${h.beden} ×${h.miktar}`);
  });
  const sip = await depoOku(sayfa, "siparis:data");
  await tarayici.close();

  return {
    hatalar,
    satirSayisi,
    ucuncuModelKaldiMi,
    fisler: gruplar,
    karsilanan: sip[0].kalemler.map((k) => `${k.urunAd} ${k.beden}: ${k.karsilanan}/${k.miktar}`),
    // "Siparişten seç" tümünü getiriyor; çıkarma sonrası kaç satır kaldığı yukarıda.
    eklenenSatir,
    durum: sip[0].durum,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
