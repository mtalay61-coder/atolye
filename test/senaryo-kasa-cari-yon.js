// SENARYO — KASA/BANKA HAREKETİNİN CARİYE YÖNÜ (kullanıcı, 17 Eylül: "kasadan ödeme yapınca
// alacağa, cariden yapınca borca yazıyor").
//
// SORUN: muhasebe ekranından girilen hareket cariye SABİT "Tahsilat" yönüyle yazılıyordu. Kasadan
// ÇIKIŞ (ödeme) yapıldığında bile cariye alacak düşüyordu; aynı işlem cari kartından girilince borç
// düşüyordu — iki ekran aynı olayı ters kaydediyordu.
//
// KURAL (tek yerde, `hareketYonu`): kasa GİRİŞ = tahsilat → "Alacak"; kasa ÇIKIŞ = ödeme → "Borç".
const { uygulamaAc, depoOku, modulAc, cariSec, sagTikAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function kasaHareketi(yon, tutar) {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ hesaplar: [], kasalar: [{ id: "k1", ad: "Ana Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 } });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);
  // v1.674.0: kasa ekranında hareket girişi kalktı — aynı işlem Ödeme & Tahsilat'ın kısa formundan
  // (Tahsilat/Ödeme + Nakit + cari + tutar). Kural aynı çekirdekten (`kasaCariHareketiKur` → `hareketYonu`).
  await modulAc(sayfa, "Ödeme & Tahsilat");
  await sayfa.waitForTimeout(800);
  await sayfa.locator(`[data-odeme-tip="${yon === "Giriş" ? "Tahsilat" : "Ödeme"}"]:visible`).click();
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu.click(); await kutu.fill("Tedarikçi A"); await sayfa.waitForTimeout(300); await kutu.press("Enter");
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-odeme-satiri-tutar]:visible").fill(String(tutar));
  await sayfa.locator("[data-odeme-satiri-kaydet]:visible").click();
  await sayfa.waitForTimeout(1600);

  const cari = (await depoOku(sayfa, "cari:data")).find((c) => c.id === "c1");
  const hareket = (cari.hareketler || [])[0] || null;
  const kasa = ((await depoOku(sayfa, "muhasebe:data")).kasalar || [])[0];
  await tarayici.close();
  return {
    hatalar,
    cariYonu: hareket && hareket.yon,
    cariFisOnEki: hareket && String(hareket.fisNo || "").slice(0, 3),
    cariAciklama: hareket && /Ödeme|Tahsilat/.test(hareket.aciklama || "") ? (hareket.aciklama.match(/Ödeme|Tahsilat/) || [])[0] : null,
    kasaYonu: (kasa.hareketler || [])[0] && kasa.hareketler[0].yon,
  };
}

async function calistir() {
  const giris = await kasaHareketi("Giriş", 500);     // tahsilat
  const cikis = await kasaHareketi("Çıkış", 300);     // ödeme
  return { giris, cikis };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
