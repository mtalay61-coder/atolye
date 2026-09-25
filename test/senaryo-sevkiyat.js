// SENARYO — KOLİ BARKODUYLA SEVKİYAT (barkod işinin 3. adımı).
//
// Kullanıcı: "Sevkiyatta o barkodu okuttuğumuzda koli içi kalemleri ekleyecek."
//
// Ölçülenler:
//   1. Koli barkodu okutulunca içindekiler miktar kutularına dağılıyor.
//   2. Fiş kaydedilince koli "Sevk edildi"ye geçiyor ve hangi fişle çıktığını saklıyor.
//   3. FİŞ GERİ ALININCA koli yeniden "Hazır" oluyor — değişmez kuralın gereği. Aksi halde mal
//      depoya döner ama koli sevk edilmiş görünür ve bir daha okutulamazdı.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [
      { renk: "Bej", beden: "37", miktar: 20, barkod: "80000101" },
      { renk: "Bej", beden: "38", miktar: 20, barkod: "80000102" },
    ],
    hareketler: [], recete: [], birimFiyat: 465,
  });
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: [
      { id: "k1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "k2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
    ],
  }]);
  // Hazır bir koli: 37'den 3, 38'den 5 çift.
  t["koli:data"] = JSON.stringify([{
    id: "koli-1", kod: "K-20260901-001", durum: "Hazır", olusturma: "2026-09-01T08:00:00.000Z",
    siparisId: "s9", cariId: "c2", uretimId: "", not: "",
    kalemler: [
      { urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", adet: 3 },
      { urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", adet: 5 },
    ],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-9" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  // SADECE FİŞİ AÇ (23 Eylül, v1.425.0 — kullanıcı: "siparişten satış fişi oluştururken satış
  // fişini açsın sadece, geri davranış standart olacak zaten"). v1.423/424'teki otomatik koli
  // yükleme KALDIRILDI: "Satış Fişi Oluştur" artık BOŞ fişi açar; koli barkodu ELLE okutulur —
  // standart "Koli okut" kutusu, cari fişinden açılanla birebir aynı.
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const acilanPencere = await sayfa.evaluate(() => !!document.querySelector("[data-koli-okut]"));
  const bosAcildi = await sayfa.evaluate(() => !document.querySelector("[data-fis-koliler]"));

  // 1) BARKODU OKUT
  await sayfa.locator("[data-koli-okut]:visible").first().fill("K-20260901-001");
  await sayfa.locator("[data-barkod-ekle]:visible").first().click();
  await sayfa.waitForTimeout(700);
  const okutmaSonrasi = await sayfa.evaluate(() => ({
    koliOzeti: (document.querySelector("[data-fis-koliler] b") || {}).textContent || null,
    koliVar: !!document.querySelector('[data-fis-koli="K-20260901-001"]'),
    mesaj: (document.body.innerText.match(/K-20260901-001 eklendi[^\n]*/) || [null])[0],
  }));

  // 2) KAYDET (tek satış ekranının düğmesi)
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1600);
  const sevkSonrasi = ((await depoOku(sayfa, "koli:data")) || [])[0] || {};
  const karsilanan = ((await depoOku(sayfa, "siparis:data")) || [])[0].kalemler.map((k) => `${k.beden}=${k.karsilanan || 0}`).join(",");

  // 3) FİŞİ GERİ AL — koli "Hazır"a dönmeli
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title="Sil"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül).
  await sayfa.locator('[data-sil-onayla]').first().click();
  await sayfa.waitForTimeout(1600);
  const geriAlmaSonrasi = ((await depoOku(sayfa, "koli:data")) || [])[0] || {};

  await tarayici.close();
  return {
    hatalar,
    acilanPencere, bosAcildi,
    okutmaSonrasi,
    sevkSonrasi: { durum: sevkSonrasi.durum, fisNoVar: !!sevkSonrasi.sevkFisNo, karsilanan },
    geriAlmaSonrasi: { durum: geriAlmaSonrasi.durum, fisNoTemizlendi: !geriAlmaSonrasi.sevkFisNo },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
