// SENARYO — TEK FİŞ DEFTERİ: CARİ KARTINDAN ÇEKLİ TAHSİLAT (v1.738.0, stok-v2/FIS-DEFTERI-PLAN.md).
// Müşteri B › Tahsilat › Çek (no, IBAN, keşideci, tutar) → Kaydet. Sahte sunucu: fiş defteri kurulu.
// Ölçülen: (1) TEK fis_kes: cari satırı + çek kaydı aynı yükte (kasa satırı yok — çek nakit değil); (2) yerelde cari hareketi ve
// Çekler listesindeki çek sunucu numarasını taşıyor, çek hareketine bağlı; (3) ekstreden silince TEK fis_iptal, hareket ve çek
// birlikte kalkar (çek kaydının kalkması fiş satırı değil — kas_yaz çek iptali olarak gider).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const istekler = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push(`fis_kes:${p.fis.tur}:${p.fis.onek}:cari ${((p.cari || {}).satirlar || []).length}:kasa ${(((p.kasa || {}).hareketler) || []).length}:cek ${(((p.kasa || {}).cekler) || []).map((c) => `${c.veri.cekNo}/${c.veri.durum}/${c.veri.fisNo}`).join(",")}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261031001`, bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/fis_iptal**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push(`fis_iptal:${p.no}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: p.no, zatenIptal: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/kas_yaz**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p || {};
      istekler.push(`kas_yaz:hareket ${(p.hareketler || []).length}/${(p.hareketIptal || []).length}:cek ${(p.cekler || []).length}/${(p.cekIptal || []).length}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hesap: 0, hareket: 0, cek: 0 }) });
    });
    for (const ad of ["car_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => { istekler.push(ad); return r.abort(); });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Tahsilat"):visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-odeme-sekli-cip="Çek"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('input[placeholder="Belge üzerindeki numara"]').fill("0012345");
  await sayfa.locator('button:has-text("Cirolu"):visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('input[placeholder="Çeki asıl yazan firma/kişi"]').fill("Kadir Tekstil");
  await sayfa.locator('input[type="number"]:visible').first().fill("2500");
  await sayfa.locator('button:has-text("Kaydet"):visible').first().click();
  await sayfa.waitForTimeout(1500);
  const durum = async () => {
    const m = await depoOku(sayfa, "muhasebe:data");
    const b = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
    return {
      cari: (b.hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}:${h.odemeSekli}`),
      cekler: ((m && m.cekler) || []).map((c) => `${c.cekNo}:${c.durum}:${c.fisNo}:${c.hareketId && (b.hareketler || []).some((h) => h.id === c.hareketId) ? "bagli" : "bagsiz"}`),
    };
  };
  const kayit = await durum();
  await sayfa.locator('button[title="Sil"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  const onay = sayfa.locator("[data-sil-onayla]:visible");
  if (await onay.count()) { await onay.first().click(); await sayfa.waitForTimeout(1800); }
  const silme = await durum();
  // Çek kaydının kalkması fiş satırı değil, Kasa & Banka yazması (kas_yaz çek iptali). Bu sahte sunucuda Kasa & Banka'nın bulut hâli
  // açılışta okunmadığı için yazma BEKLEYENE düşer (kaybolmaz; gerçek ortamda taban okunmuştur, doğrudan gider).
  silme.cekSilmesiGittiYaDaBekliyor = istekler.some((x) => /^kas_yaz:.*cek \d+\/1/.test(x))
    || await sayfa.evaluate(() => { try { return !!JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")["muhasebe:data"]; } catch (e) { return false; } });
  await tarayici.close();
  return { hatalar, kayit, silme, istekler };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
