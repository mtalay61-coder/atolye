// SENARYO — TEK FİŞ DEFTERİ: SİLME FİŞ İPTALİDİR (v1.737.0, stok-v2/FIS-DEFTERI-PLAN.md "Geri alma ve iptal").
// v1.744.35: iki ayaklı fiş artık CARİ VİRMANI (Ödeme & Tahsilat › Ödeme › Virman; kasalar arası virman düğmesi kullanıcı isteğiyle
// gizli — eski VRM ayaklarının silinmesi senaryo-kasa-islemler'de). Sahte sunucu: fiş defteri kurulu. Müşteri B → karşı Tedarikçi
// A, 300 ₺ → CVR fişi; ardından bildirimdeki "Geri al".
// Ölçülen: (1) virman tek istek, iki cari satırı aynı fişte, kasa satırı yok; (2) geri alma TEK `fis_iptal` (o fişin numarasıyla)
// — satır satır car_yaz silmesi gitmez; (3) iki carinin satırı birlikte kalkar; (4) yerel defterde fiş iptal.
const { uygulamaAc, depoOku, cariSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const istekler = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_kes", ozet: `${p.fis.tur}:${((p.cari || {}).satirlar || []).map((x) => `${x.id || x.cari_id || "?"}`).length} cari satırı:${((p.kasa || {}).hareketler || []).length} kasa satırı` });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261031001`, bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_iptal", ozet: p.no });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: p.no, zatenIptal: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => {
        const g = r.request().postData() || "";
        const p = (JSON.parse(g || "{}").p) || {};
        // Satır taşımayan yazmalar (cari kartının kendisi) sayılmaz; hareket satırı / iptali taşıyan eski yol sayılır.
        if ((p.hareketIptal || []).length || /"(satirlar|hareketler)":\[(\{|")/.test(g)) istekler.push({ ad, ozet: (p.hareketIptal || []).length ? "hareketIptal" : "satir" });
        return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-odeme-tip="Ödeme"]:visible').first().click(); await sayfa.waitForTimeout(150);
  await sayfa.locator('[data-odeme-sekli="Virman"]:visible').first().click(); await sayfa.waitForTimeout(200);
  await cariSec(sayfa, "Müşteri B", "", "data-odeme-cari");
  await cariSec(sayfa, "Tedarikçi A", '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await sayfa.locator("[data-cari-virman-tutar]:visible").fill("300");
  await sayfa.locator("[data-cari-virman-kaydet]:visible").click();
  await sayfa.waitForTimeout(1500);
  const cariSatirlari = async () => {
    const cr = await depoOku(sayfa, "cari:data");
    return ["Müşteri B", "Tedarikçi A"].map((ad) => `${ad}:${((cr.find((c) => c.unvan === ad) || {}).hareketler || []).map((h) => `${h.fisNo}/${h.yon}/${h.tutar}`).join(",")}`);
  };
  const virmanSonrasi = await cariSatirlari();
  // Geri al: kesilen fişin bildirimindeki düğme (100 paraFisiKesBildir → fisGeriAlRef → sunucuFisiniIptalEt)
  await sayfa.locator("[data-toast-geri-al]").first().click();
  await sayfa.waitForTimeout(500);
  const onay = sayfa.locator("[data-sil-onayla]");
  if (await onay.count()) { await onay.first().click(); }
  await sayfa.waitForTimeout(1800);
  const silmeSonrasi = await cariSatirlari();
  const toast = await sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : [])
    .filter((f) => f && f.sunucu).map((f) => `${f.fisNo}|${f.tip}|${(f.cariHareketleri || []).length} cari|${(f.kasaHareketleri || []).length} kasa|${f.iptal ? "iptal" : "gecerli"}`));
  await tarayici.close();
  return { hatalar, virmanSonrasi, silmeSonrasi, toast: toast.replace(/\d{1,3}(\.\d{3})*(,\d+)?/g, "N"), defter, istekler: istekler.map((x) => `${x.ad}${x.ozet ? `:${x.ozet}` : ""}`) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
