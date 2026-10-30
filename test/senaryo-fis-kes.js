// SENARYO — TEK FİŞ DEFTERİ: ALIŞ/SATIŞ FİŞİ SUNUCUDA KESİLİR (v1.732.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Kullanıcı (30 Ekim): "Fiş defterinden her işlem geçmesi lazım… Para hareketi de fiş oluştursun."
// Sahte sunucu: fiş defteri kurulu (`stk_ayar.fis_aktif` var, modüller v2'de); `rpc/fis_kes` yükü yakalanır, numara döner.
// Ölçülen: (1) sunucu reddederse ekranda HİÇBİR şey değişmez; (2) kabul edince tek istek: fiş + stok satırı + cari satırı + peşin
// kısım BAĞLI MAKBUZ (kasa + cari), numaralar sunucudan, açıklamalarda yer tutucu; (3) yerel stok / cari / kasa sunucu numarasıyla;
// (4) fiş defterinde fiş ve makbuz (sunucu kaydı), eski liste tablosuna yazılmaz; (5) "Geri al" → tek `fis_iptal`, yerel geri döner.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles, urunEtiketiBul } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [] }], bankalar: [], cekler: [] });
  const istekler = [];
  let reddet = true;
  const listeYazmalari = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_kes", p });
      if (reddet) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Hareket yalnız fiş kesilerek yazılır (test reddi)" }) });
      return r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ fisNo: "SF-261030001", bagliFisNo: p.bagli ? "TH-261030001" : null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      istekler.push({ ad: "fis_iptal", p: JSON.parse(r.request().postData() || "{}").p });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: "SF-261030001", zatenIptal: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/lst_yaz**", (r) => { listeYazmalari.push(JSON.parse(r.request().postData() || "{}").p); return r.abort(); });
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  const satisFisiKes = async () => {
    await modulAc(sayfa, "Cari");
    await sayfa.waitForTimeout(400);
    await sayfa.locator('button:has-text("Müşteri B")').last().click();
    await sayfa.waitForTimeout(400);
    await sayfa.locator('[data-cari-fis-ac="Satış"]').first().click();
    await sayfa.waitForTimeout(600);
    await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("TED-9");
    await sayfa.locator("[data-urun-arama]").first().fill(await urunEtiketiBul(sayfa, "Bot"));
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("1000");
    await sayfa.locator('[data-kalem-miktar="40"]:visible').first().fill("2");
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(400);
    await sayfa.locator('select:has(option:text-is("Peşin yok (açık hesap)")):visible').first().selectOption("kasa:k1");
    await sayfa.waitForTimeout(300);
    await sayfa.locator("[data-fis-kaydet]").first().click();
    await sayfa.waitForTimeout(600);
    await sayfa.locator("[data-fis-onay-evet]").first().click();
    await sayfa.waitForTimeout(1500);
  };
  const yerel = async () => {
    const stok = await depoOku(sayfa, "stok:items");
    const cariler = await depoOku(sayfa, "cari:data");
    const muh = await depoOku(sayfa, "muhasebe:data");
    const bot = (stok || []).find((u) => u.id === "u2") || {};
    const b = (cariler || []).find((c) => c.unvan === "Müşteri B") || {};
    return {
      botHareket: (bot.hareketler || []).filter((h) => h.kaynak === "Satış").map((h) => `${h.fisNo}:${h.miktar}`),
      musteri: (b.hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
      kasa: (((muh || {}).kasalar || [])[0] || { hareketler: [] }).hareketler.map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
    };
  };
  const toast = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));

  // 1) Sunucu reddediyor
  await satisFisiKes();
  const redSonrasi = { istek: istekler.length, formAcikKaldi: null, toast: (await toast()).includes("kaydedilemedi"), yerel: await yerel() };

  // 2) Sunucu kabul ediyor — form reddedilince açık kaldı (girilen kalemler kaybolmaz): yeniden Kaydet
  reddet = false;
  const formAcik = await sayfa.locator("[data-fis-kaydet]:visible").count();
  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1500);
  redSonrasi.formAcikKaldi = formAcik > 0;
  const p = (istekler.filter((x) => x.ad === "fis_kes").pop() || {}).p || {};
  const yuk = {
    istekVar: !!p.istek,
    fis: p.fis && { aile: p.fis.aile, tur: p.fis.tur, onek: p.fis.onek, tutar: p.fis.tutar, belgeNo: (p.fis.ek || {}).belgeNo, kalem: (p.fis.kalemler || []).length },
    stok: ((p.stok || {}).satirlar || []).map((x) => `${x.urunId}|${x.renk}|${x.olcu}|${x.miktar}|${x.fisId}|${x.aciklama}`),
    cari: ((p.cari || {}).satirlar || []).map((x) => `${x.cari_id}|${x.yon}|${x.tutar}|${x.fis_no}`),
    bagli: p.bagli && {
      fis: `${p.bagli.fis.aile}|${p.bagli.fis.tur}|${p.bagli.fis.onek}|${p.bagli.fis.kasaHesapId}|${p.bagli.fis.tutar}`,
      cari: (p.bagli.cari.satirlar || []).map((x) => `${x.yon}|${x.tutar}|${x.fis_no}|${x.aciklama}`),
      kasa: (p.bagli.kasa.hareketler || []).map((x) => `${x.hesap_id}|${x.veri.yon}|${x.veri.tutar}|${x.veri.fisNo}|${x.veri.aciklama}`),
    },
  };
  const kabulSonrasi = { yerel: await yerel(), toast: (await toast()).replace(/\d{1,3}(\.\d{3})*(,\d+)?/g, "N") };
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.aile}|${f.bagliFis}|${(f.stokHareketleri || []).length}/${(f.cariHareketleri || []).length}/${(f.kasaHareketleri || []).length}|${f.iptal ? "iptal" : "gecerli"}`));

  // 3) Geri al (toast)
  await sayfa.locator("[data-toast-geri-al]").first().click();
  await sayfa.waitForTimeout(1500);
  const iptal = istekler.filter((x) => x.ad === "fis_iptal").map((x) => x.p.no);
  const geriAlSonrasi = await yerel();
  const defterSonra = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : []).filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.iptal ? "iptal" : "gecerli"}`));
  await tarayici.close();
  return { hatalar, redSonrasi, yuk, kabulSonrasi, defter, iptal, geriAlSonrasi, defterSonra,
    eskiListeyeSunucuFisiGitti: listeYazmalari.some((x) => JSON.stringify(x).includes("SF-261030001")) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
