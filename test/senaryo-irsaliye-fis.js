// SENARYO — TEK FİŞ DEFTERİ: İRSALİYE BİLGİSİ SUNUCU FİŞİNİN BAŞLIĞINA (v1.739.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Sahte sunucu: fiş defteri kurulu; fis_listesi'nde Müşteri B'ye kesilmiş bir satış fişi (SF-261031009) var, cari ve stok satırları da
// o numarayla. Sevkiyat › İrsaliye › fişi seç › plaka / şoför › Kaydet.
// Ölçülen: (1) TEK `fis_bilgi` isteği (no + ek.irsaliye) — satır yerinde değişmez, car_yaz gitmez (kurallar açılınca reddedilirdi);
// (2) ekranda fiş "irsaliyeli" (🚚) görünür; (3) fiş defterindeki kaydın ek bilgisinde irsaliye var.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const NO = "SF-261031009";
  const t = { ...TOHUM };
  const cariler = JSON.parse(t["cari:data"]);
  const b = cariler.find((c) => c.id === "c2");
  b.hareketler = [{ id: "ch-sf9", tarih: "2026-10-31", yon: "Borç", tutar: 1000, paraBirimi: "TRY", fisNo: NO, tip: "Satış", islemTipi: "Satış", urunAd: "Bot", miktar: 2, aciklama: "Satış fişi" }, ...(b.hareketler || [])];
  t["cari:data"] = JSON.stringify(cariler);
  const stok = JSON.parse(t["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.hareketler = [{ id: "sh-sf9", tarih: "2026-10-31T10:00:00.000Z", renk: "Siyah", beden: "41", miktar: -2, kaynak: "Satış", cariId: "c2", fisNo: NO }, ...(bot.hareketler || [])];
  t["stok:items"] = JSON.stringify(stok);
  const fisVeri = { id: NO, fisNo: NO, aile: "stok", tip: "Satış", kaynak: "Satış", cariId: "c2", zaman: "2026-10-31T10:00:00.000Z", defter: "Genel",
    kalemler: [], ek: {}, bagliFis: null, iptal: false, stokHareketleri: [{ id: "sh-sf9", urunId: "u2", miktar: -2 }], cariHareketleri: [{ id: "ch-sf9" }], kasaHareketleri: [] };
  // Bu sahte ortamda bulut okumaları düşer, uygulama yerel kopyayla açılır: sunucu fişi yerel defter kopyasında (sunucu: true).
  t["fisdefter:data"] = JSON.stringify([{ ...fisVeri, sunucu: true }]);
  const istekler = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/fis_listesi**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ veri: fisVeri }]) }));
    await sayfa.route("**/rest/v1/rpc/fis_bilgi**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push(`fis_bilgi:${p.no}:${p.ek && p.ek.irsaliye ? `${p.ek.irsaliye.plaka}/${p.ek.irsaliye.sofor}` : "-"}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: p.no }) });
    });
    for (const ad of ["car_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => {
        const p = JSON.parse(r.request().postData() || "{}").p || {};
        const metin = JSON.stringify(p);
        if (metin.includes("irsaliye")) istekler.push(`${ad}:irsaliye`);
        return r.abort();
      });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Sevkiyat");
  await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-sevk-sekme="irsaliye"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  const listede = await sayfa.locator(`[data-irsaliye-fis="${NO}"]`).count();
  await sayfa.locator(`[data-irsaliye-fis="${NO}"]`).first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-irsaliye-plaka]").fill("34 abc 12");
  await sayfa.locator("[data-irsaliye-sofor]").fill("Ali Usta");
  await sayfa.locator("[data-irsaliye-kaydet]").click();
  await sayfa.waitForTimeout(1500);
  const irsaliyeli = await sayfa.locator(`[data-irsaliye-fis="${NO}"]`).first().innerText();
  const defterEk = await sayfa.evaluate((no) => {
    const f = (window.__fisDefteriOku ? window.__fisDefteriOku() : []).find((x) => x && x.fisNo === no);
    return f && f.ek && f.ek.irsaliye ? `${f.ek.irsaliye.plaka}/${f.ek.irsaliye.sofor}` : null;
  }, NO);
  const toast = await sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));
  await tarayici.close();
  return { hatalar, listede, istekler, irsaliyeIsareti: irsaliyeli.includes("🚚"), defterEk, toast };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
