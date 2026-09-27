// SENARYO — DEPO > SEVKİYAT'TA SİPARİŞİN KDV ORANI (27 Eylül, v1.504.0).
//
// Siparişte KDV oranı satır eklenirken seçiliyor (v1.502.0). Sevkiyat ekranı koliyi okutup satış fişini
// BAŞLANGIÇ SATIRLARIYLA açıyor; bu satırlar 237'den (derlenmiş dosya) oransız geliyordu → fiş ürünün
// oranını (%10) yazıyordu, siparişte seçilen %20 kayboluyordu. Artık 255 sipariş kaleminden alıyor.
// Kurulum: KDV açık (mamul %10). SAT-9'da 37 bedeni %20 ile, 38 bedeni oransız (eski) kayıtlı; ikisini
// içeren hazır koli. Ölçülen: fiş penceresindeki oranlar ve cariye yazılan satırlar (37 → %20, 38 → %10).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push({ id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [{ renk: "Bej", beden: "37", miktar: 20, barkod: "80000101" }, { renk: "Bej", beden: "38", miktar: 20, barkod: "80000102" }],
    hareketler: [], recete: [] });
  t["stok:items"] = JSON.stringify(stok);
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.firmaBilgileri = { ...(tan.firmaBilgileri || {}), kdvAktif: true, kdvMamul: 10, kdvDiger: 20 };
  t["tanimlar:data"] = JSON.stringify(tan);
  t["siparis:data"] = JSON.stringify([{ id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0, kalemler: [
      { id: "k1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY", kdvOrani: 20 },
      { id: "k2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" },
    ] }]);
  t["koli:data"] = JSON.stringify([{ id: "koli-1", kod: "K-20260901-001", durum: "Hazır", olusturma: "2026-09-01T08:00:00.000Z",
    siparisId: "s9", cariId: "c2", uretimId: "", not: "",
    kalemler: [{ urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "37", adet: 3 }, { urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "38", adet: 5 }] }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Depo");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button[title="Kolileri okutup depodan sevk et"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-sevk-girdi]:visible").first().fill("K-20260901-001");
  await sayfa.locator("[data-sevk-girdi]:visible").first().press("Enter");
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-sevk-et]:visible").first().click();
  await sayfa.waitForTimeout(1200);
  const dokum = await sayfa.evaluate(() => ((document.querySelector("[data-fis-kdv-dokumu]") || {}).innerText || "").replace(/\s+/g, " ").trim());
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1200);
  const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const hareketler = (cari.hareketler || []).filter((h) => h.miktar)
    .map((h) => `${h.beden} ${h.miktar} × ${h.birimFiyat} → tutar ${h.tutar}` + (h.kdvTutari != null ? ` (%${h.kdvOrani}, KDV ${h.kdvTutari})` : " (KDV YOK)")).sort();
  const koli = ((await depoOku(sayfa, "koli:data")) || [])[0] || {};
  await tarayici.close();
  return { hatalar, dokum, hareketler, koliDurumu: koli.durum };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
