// SENARYO — TEK FİŞ DEFTERİ: STOK KARTINDAN BAĞIMSIZ GİRİŞ SUNUCUDA KESİLİR (v1.734.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Sahte sunucu: fiş defteri kurulu, modüller v2'de; `rpc/fis_kes` yükü yakalanır, numara döner.
// Ölçülen: (1) sunucu reddederse stok DEĞİŞMEZ, form açık ve dolu kalır (yeniden denenebilir), "kaydedilemedi" uyarısı;
// (2) kabul edince tek istek: MNL fişi, yer tutuculu stok satırı; yerel harekette sunucu numarası; form kapanır;
// (3) fiş defterinde sunucu kaydı; eski yoldan stok yazması (stk_yaz / fis_yaz) gitmez.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const istekler = [];
  let reddet = true;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      istekler.push({ ad: "fis_kes", p: JSON.parse(r.request().postData() || "{}").p });
      if (reddet) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "test reddi" }) });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: "MNL-261031001", bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/stk_yaz**", (r) => { istekler.push({ ad: "stk_yaz" }); return r.abort(); });
    await sayfa.route("**/rest/v1/rpc/fis_yaz**", (r) => { istekler.push({ ad: "fis_yaz" }); return r.abort(); });
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  // TOHUM FİŞ DEFTERİNE UYGUN (v1.741.0): tohumda Bot Siyah/41 varyantı 9 ama hareketleri 3 (6'sı fişsiz); eskiden açılış göçü farkı
  // fişsiz bir açılış hareketiyle kapatıyordu. Sunucu fiş defterinde (v1.740.0) o göç çalışmaz — gerçek veride varyant miktarı
  // zaten hareket toplamıdır (stok v2 görünümü). Tohum öyle kurulur: 6'lık açılış fişli hareket.
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.hareketler = [...(bot.hareketler || []), { id: "h-acilis-41", tarih: "2026-08-01T09:00:00.000Z", renk: "Siyah", beden: "41", miktar: 6, kaynak: "Açılış", fisNo: "ACL-260801001" }];
  t["stok:items"] = JSON.stringify(stok);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-stok-giris-urun]").first().selectOption("u2");
  await sayfa.waitForTimeout(200);
  await sayfa.locator("[data-stok-giris-renk]").first().selectOption("Siyah");
  await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-stok-giris-miktar="41"]').first().fill("5");
  const kaydet = async () => {
    await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click();
    await sayfa.waitForTimeout(1200);
  };
  const durum = async () => {
    const stok = await depoOku(sayfa, "stok:items");
    const bot = (stok || []).find((u) => u.id === "u2") || {};
    return {
      v41: ((bot.variants || []).find((v) => v.renk === "Siyah" && v.beden === "41") || {}).miktar,
      manuel: (bot.hareketler || []).filter((h) => h.kaynak === "Manuel").map((h) => `${h.fisNo}:${h.miktar}`),
      formAcik: await sayfa.locator("[data-stok-giris-seridi]").count() > 0,
      miktarKutusu: await sayfa.locator('[data-stok-giris-miktar="41"]').count() ? await sayfa.locator('[data-stok-giris-miktar="41"]').first().inputValue() : null,
      toast: await sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | ")),
    };
  };
  const once = await durum();
  // 1) Sunucu reddediyor
  await kaydet();
  const red = await durum();
  red.toast = red.toast.includes("kaydedilemedi");
  // 2) Sunucu kabul ediyor — aynı form yeniden Kaydet
  reddet = false;
  await kaydet();
  const kabul = await durum();
  const p = (istekler.filter((x) => x.ad === "fis_kes").pop() || {}).p || {};
  const yuk = {
    istekVar: !!p.istek,
    fis: p.fis && { aile: p.fis.aile, tur: p.fis.tur, onek: p.fis.onek, kaynak: p.fis.kaynak, kalem: (p.fis.kalemler || []).length },
    stok: ((p.stok || {}).satirlar || []).map((x) => `${x.urunId}|${x.renk}|${x.olcu}|${x.miktar}|${x.kaynak}`),
  };
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.aile}|${f.tip}|${(f.stokHareketleri || []).length}`));
  await tarayici.close();
  return { hatalar, once: once.v41, red, kabul, yuk, defter, istekler: istekler.map((x) => x.ad) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
