// SENARYO — TEK FİŞ DEFTERİ: TAHSİLAT MAKBUZU SUNUCUDA KESİLİR (v1.735.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Ödeme & Tahsilat › Tahsilat › Nakit › cari › tutar → Kaydet (338 OdemeSatiri → 100 siparisOdemesiKaydet → paraFisiKes).
// Sahte sunucu: fiş defteri kurulu, modüller v2'de; `rpc/fis_kes` yükü yakalanır, numara döner.
// Ölçülen: (1) sunucu reddederse cari ve kasa DEĞİŞMEZ, tutar kutusu dolu kalır, "kaydedilemedi" uyarısı (eskiden "kaydedildi"
// diyordu); (2) kabul edince TEK istek: TH fişi, cari satırı + kasa satırı aynı yükte; yerelde ikisi de sunucu numarasıyla;
// (3) eski yoldan cari / kasa yazması (car_yaz, kas_yaz, fis_yaz) gitmez; (4) "Geri al" → tek fis_iptal, yerel geri döner.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "Ana Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [], kurlar: { USD: 48, EUR: 56 } });
  const istekler = [];
  let reddet = true;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      istekler.push({ ad: "fis_kes", p: JSON.parse(r.request().postData() || "{}").p });
      if (reddet) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "test reddi" }) });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: "TH-261031001", bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      istekler.push({ ad: "fis_iptal", p: JSON.parse(r.request().postData() || "{}").p });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: "TH-261031001", zatenIptal: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => { istekler.push({ ad, p: JSON.parse(r.request().postData() || "{}").p }); return r.abort(); });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2400);

  await modulAc(sayfa, "Ödeme & Tahsilat");
  await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').click();
  await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').click();
  const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
  await kutu.click(); await kutu.fill("Müşteri B"); await sayfa.waitForTimeout(300); await kutu.press("Enter");
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-odeme-satiri-tutar]:visible").fill("750");
  const kaydet = async () => { await sayfa.locator("[data-odeme-satiri-kaydet]:visible").click(); await sayfa.waitForTimeout(1500); };
  const toast = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));
  const yerel = async () => {
    const b = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.unvan === "Müşteri B") || {};
    const kasa = (((await depoOku(sayfa, "muhasebe:data")) || {}).kasalar || [])[0] || { hareketler: [] };
    return {
      cari: (b.hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
      kasa: (kasa.hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
    };
  };

  // 1) Sunucu reddediyor
  await kaydet();
  const red = { yerel: await yerel(), tutarKutusu: await sayfa.locator("[data-odeme-satiri-tutar]:visible").inputValue(),
    uyari: (await toast()).includes("kaydedilemedi"), kaydedildiDemedi: !(await toast()).includes("kaydedildi —") };
  // 2) Sunucu kabul ediyor — aynı satır yeniden Kaydet
  reddet = false;
  await kaydet();
  const p = (istekler.filter((x) => x.ad === "fis_kes").pop() || {}).p || {};
  const yuk = {
    fis: p.fis && { aile: p.fis.aile, tur: p.fis.tur, onek: p.fis.onek, kasaHesapId: p.fis.kasaHesapId, tutar: p.fis.tutar },
    cari: ((p.cari || {}).satirlar || []).map((x) => `${x.yon}|${x.tutar}|${x.fis_no}`),
    kasa: ((p.kasa || {}).hareketler || []).map((x) => `${x.hesap_id}|${x.veri.yon}|${x.veri.tutar}|${x.veri.fisNo}`),
  };
  const kabul = { yerel: await yerel(), toast: (await toast()).replace(/\d{1,3}(\.\d{3})*(,\d+)?/g, "N"),
    tutarKutusu: await sayfa.locator("[data-odeme-satiri-tutar]:visible").inputValue() };
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.aile}|${f.tip}|${(f.cariHareketleri || []).length}/${(f.kasaHareketleri || []).length}`));
  // 3) Geri al
  await sayfa.locator("[data-toast-geri-al]").first().click();
  await sayfa.waitForTimeout(1500);
  const geriAl = { yerel: await yerel(), iptal: istekler.filter((x) => x.ad === "fis_iptal").map((x) => x.p.no) };
  await tarayici.close();
  return { hatalar, red, yuk, kabul, defter, geriAl, istekler: istekler.map((x) => x.ad) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
