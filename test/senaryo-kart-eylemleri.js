// SENARYO — KART EYLEMLERİ TEK TİPE (kullanıcı, 20 Eylül: "butonların yerleri çok karışık,
// Kaydet bazen aşağıda bazen yukarıda... tek tipe almamız lazım").
//
// KURAL: eylemler kartın BAŞLIĞINDA, sabit sırada. Düzenlemede Kaydet · Vazgeç; değilken
// Düzenle · (özel) · Sil. Gövdede eylem düğmesi yok. Cari kartı (v1.383) ve ürün kartı (v1.387)
// bu kurala alındı; senaryo ikisini de aynı işaretle ölçüyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function kartEylemleri(sayfa) {
  return sayfa.evaluate(() => [...document.querySelectorAll("[data-kart-eylem]")]
    .filter((b) => b.getBoundingClientRect().height > 0).map((b) => b.getAttribute("data-kart-eylem")));
}

async function calistir() {
  const hatalar = [];
  // Sipariş kartı için tohuma bir satış siparişi.
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([{ id: "sk1", siparisNo: "SAT-5001", tip: "Satış", cariId: "c2", cariAd: "Müşteri B",
    tarih: "2026-09-20", durum: "Bekliyor",
    kalemler: [{ id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 4, birimFiyat: 900, paraBirimi: "TRY", karsilanan: 0 }] }]);
  // Kasa kartı için tohuma bir kasa.
  t["muhasebe:data"] = JSON.stringify({ hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  // ÜRÜN KARTI: aç → başlıkta düzenle/pasif/sil; düzenleye bas → başlıkta kaydet/vazgeç.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  // Stok listesi hücre gösterir; kartı açmak için ürüne tıklanır.
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1000);
  const urunOnce = await kartEylemleri(sayfa);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll('[data-kart-eylem="duzenle"]')].find((x) => x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const urunDuzenlemede = await kartEylemleri(sayfa);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll('[data-kart-eylem="vazgec"]')].find((x) => x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  // CARİ KARTI: aynı ölçüm.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Cari"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const cariOnce = await kartEylemleri(sayfa);

  // SİPARİŞ KARTI: KayitEylemleri bileşeni aynı işaretle; listeden açılan kartta Düzenle · Sil.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sipariş"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  // Satır role="button" bir div (React onClick, DOM onclick değil): işaretle tıklanıyor.
  // Listeden açılan kart SALT OKUNUR (eylem yok); düzenleme tam ekran pencerede.
  await sayfa.locator('[data-siparis-tam-ekran="SAT-5001"]').first().click();
  await sayfa.waitForTimeout(1200);
  const siparisAcik = await kartEylemleri(sayfa);

  // KASA/BANKA KARTI: hesap kartı başlığında Düzenle · Sil; düzenlemede Kaydet · Vazgeç.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Muhasebe"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  // Kart, listeden hesap seçilince açılıyor ("Soldan bir kasa seçin").
  await sayfa.locator('[data-hesap-satir="k1"]').first().click();
  await sayfa.waitForTimeout(700);
  const kasaKapali = await kartEylemleri(sayfa);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("[data-hesap-duzenle-ac]")].find((x) => x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kasaDuzenlemede = await kartEylemleri(sayfa);

  await tarayici.close();
  return {
    kasa: { kapali: [...new Set(kasaKapali)], duzenlemede: [...new Set(kasaDuzenlemede)] },
    siparis: { acik: [...new Set(siparisAcik)] },
    hatalar,
    urun: { kapali: [...new Set(urunOnce)], duzenlemede: [...new Set(urunDuzenlemede)] },
    cari: { kapali: [...new Set(cariOnce)] },
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
