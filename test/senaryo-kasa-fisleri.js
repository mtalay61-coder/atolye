// SENARYO — TEK FİŞ DEFTERİ: YALNIZ KASA SATIRLI SUNUCU FİŞLERİ FİŞLER EKRANINDA (v1.741.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Fişler ekranı fişleri cari ve stok satırlarından türetiyordu; cari ayağı olmayan sunucu fişi (virman, gider, gelir, çek tahsili)
// hiç görünmüyordu. Sahte sunucu: fiş defteri kurulu; yerel defterde VRM ve GD sunucu fişleri (bir de İPTAL edilmiş GL),
// kasalarda satırları; ayrıca fişi olmayan eski bir kasa hareketi.
// Ölçülen: (1) VRM ve GD listede, tip çipleriyle (Virman / Gider); (2) iptal fiş ve fişsiz eski satır listede YOK; (3) virman
// tutarı tek ayak (iki katı değil); (4) fiş açılınca iki kasa satırı (çıkış / giriş) görünür.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const VRM = "VRM-261031001", GD = "GD-261031002", GL = "GL-261031003";
  const z = "2026-10-31T09:00:00.000Z";
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48, EUR: 56 },
    kasalar: [
      { id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
        { id: "m1", tarih: "2026-10-31", zaman: z, yon: "Çıkış", tutar: 300, paraBirimi: "TRY", fisNo: VRM, tip: "Virman", aciklama: "Şubeye nakit" },
        { id: "m3", tarih: "2026-10-31", zaman: z, yon: "Çıkış", tutar: 150, paraBirimi: "TRY", fisNo: GD, tip: "Ödeme", aciklama: "Kira" },
        { id: "m4", tarih: "2026-10-30", zaman: z, yon: "Giriş", tutar: 75, paraBirimi: "TRY", fisNo: "KSA-ESKI-1", aciklama: "Eski hareket" },
      ] },
      { id: "k3", ad: "Şube Kasa", paraBirimi: "TRY", hareketler: [
        { id: "m2", tarih: "2026-10-31", zaman: z, yon: "Giriş", tutar: 300, paraBirimi: "TRY", fisNo: VRM, tip: "Virman", aciklama: "Şubeye nakit" },
        { id: "m5", tarih: "2026-10-31", zaman: z, yon: "Giriş", tutar: 40, paraBirimi: "TRY", fisNo: GL, tip: "Tahsilat", aciklama: "İptal edilmiş gelir" },
      ] },
    ],
  });
  const kayit = (no, tip, kh, iptal) => ({ id: no, fisNo: no, aile: "para", tip, zaman: z, defter: "Genel", kalemler: [], ek: {}, bagliFis: null,
    iptal: !!iptal, stokHareketleri: [], cariHareketleri: [], kasaHareketleri: kh.map((id) => ({ id })), sunucu: true });
  t["fisdefter:data"] = JSON.stringify([kayit(VRM, "Virman", ["m1", "m2"]), kayit(GD, "Gider", ["m3"]), kayit(GL, "Gelir", ["m5"], true)]);
  const onceRota = async (sayfa) => {
    for (const ad of ["fis_kes", "fis_iptal", "car_yaz", "kas_yaz", "fis_yaz"]) await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => r.abort());
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Fişler");
  await sayfa.waitForTimeout(800);
  const kartlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-kart]")].filter((x) => x.offsetParent)
    .map((x) => x.getAttribute("data-fis-kart")).filter((n) => /^(VRM|GD|GL|KSA)-/.test(n)));
  const cipler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-tip-cipi]")].filter((x) => x.offsetParent)
    .map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((m) => /Virman|Gider|Gelir|Çek/.test(m)));
  const baslik = await sayfa.locator(`[data-fis-kart="${VRM}"] button`).first().innerText();
  await sayfa.locator(`[data-fis-kart="${VRM}"] button`).first().click();
  await sayfa.waitForTimeout(400);
  const kasaSatirlari = await sayfa.evaluate((no) => [...document.querySelectorAll(`[data-fis-kart="${no}"] [data-fis-kasa-satir]`)]
    .map((x) => x.innerText.replace(/\s+/g, " ").trim()), VRM);
  await sayfa.locator('[data-fis-tip-cipi="Gider"]').first().click();
  await sayfa.waitForTimeout(300);
  const giderSuzgeci = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-kart]")].filter((x) => x.offsetParent).map((x) => x.getAttribute("data-fis-kart")));
  await tarayici.close();
  return { hatalar, kartlar, cipler, virmanBasligi: baslik.replace(/\s+/g, " ").replace(/\d{2}\.\d{2}\.\d{4}( \d{2}:\d{2})?/g, "T"), kasaSatirlari, giderSuzgeci };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
