// SENARYO — TEK FİŞ DEFTERİ: BANKA EXCEL AKTARIMI SATIR SATIR SUNUCU FİŞİ (v1.736.0, stok-v2/FIS-DEFTERI-PLAN.md).
// İki satırlı ekstre: carili tahsilat (TH makbuzu) + kartlı masraf (GD fişi). Sahte sunucu ilk denemede TAHSİLATI reddeder.
// Ölçülen: (1) yalnız masraf yazılır, özet "1 satır aktarıldı … 1 satır YAZILAMADI"; tahsilat satırı SEÇİLİ kalır, cariye bir şey
// yazılmaz; (2) ikinci aktarımda yalnız tahsilat gider (masraf kilitli — parmak izi), TH numarası cari + bankada;
// (3) eski yoldan cari / kasa yazması (car_yaz, kas_yaz, fis_yaz) gitmez.
const fs = require("fs"); const os = require("os"); const path = require("path");
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const EKSTRE = path.join(os.tmpdir(), "banka-ekstre-fis-kes.csv");

async function calistir() {
  fs.writeFileSync(EKSTRE, 'Hesap: Test Bankasi\n\nTarih,Açıklama,Tutar,Bakiye\n15.10.2026,EFT MÜŞTERİ B SİPARİŞ ÖDEMESİ,"1.500,00","1.500,00"\n16.10.2026,HAVALE MASRAFI,"-12,50","1.487,50"\n');
  const tan = JSON.parse(TOHUM["tanimlar:data"]); tan.giderKartlari = [{ id: "g1", ad: "Banka masrafı", grup: "finansman", tur: "gider" }];
  const m = JSON.parse(TOHUM["muhasebe:data"]); m.bankalar = [{ id: "b1", ad: "Test Bankası", paraBirimi: "TRY", hareketler: [] }];
  const istekler = [];
  let tahsilatiReddet = true;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      istekler.push({ ad: "fis_kes", tur: p.fis.tur });
      if (p.fis.tur === "Tahsilat" && tahsilatiReddet) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "test reddi" }) });
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261031001`, bagliFisNo: null, zatenVar: false }) });
    });
    for (const ad of ["car_yaz", "kas_yaz", "fis_yaz"]) {
      await sayfa.route(`**/rest/v1/rpc/${ad}**`, (r) => { istekler.push({ ad }); return r.abort(); });
    }
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM, "tanimlar:data": JSON.stringify(tan), "muhasebe:data": JSON.stringify(m) }, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.locator('button:has-text("Finans"):visible').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('button:has-text("Ödeme & Tahsilat"):visible').first().click(); await sayfa.waitForTimeout(800);
  await sayfa.locator('[data-odeme-alani-sekme="bankaexcel"]:visible').first().click(); await sayfa.waitForTimeout(600);
  const ekran = sayfa.locator("[data-banka-excel]:visible");
  await ekran.locator("[data-banka-excel-dosya]").setInputFiles(EKSTRE); await sayfa.waitForTimeout(800);
  await ekran.locator('[data-banka-excel-oneri="0"]').click(); await sayfa.waitForTimeout(200);
  { const kk = ekran.locator('[data-banka-excel-satir="1"] input').nth(1); await kk.click(); await kk.fill("Banka masr"); await sayfa.waitForTimeout(300); await kk.press("Enter"); }
  await sayfa.waitForTimeout(200);
  const toast = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-toast]")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).join(" | "));
  const durum = async () => {
    const mh = await depoOku(sayfa, "muhasebe:data"); const cr = await depoOku(sayfa, "cari:data");
    return {
      banka: ((mh.bankalar[0] || {}).hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
      cari: ((cr.find((c) => c.unvan === "Müşteri B") || {}).hareketler || []).map((h) => `${h.fisNo}:${h.yon}:${h.tutar}`),
      seciliSatirlar: await ekran.locator('[data-banka-excel-satir] input[type="checkbox"]').evaluateAll((x) => x.map((c) => c.checked)),
    };
  };
  // 1) Tahsilat reddedilir, masraf yazılır
  await ekran.locator("[data-banka-excel-kaydet]").click(); await sayfa.waitForTimeout(2000);
  const ilk = { ...(await durum()), ozet: (await toast()).split(" | ").filter((x) => /satır aktarıldı/.test(x)) };
  // 2) Yeniden aktar — yalnız tahsilat gider
  tahsilatiReddet = false;
  await ekran.locator("[data-banka-excel-kaydet]").click(); await sayfa.waitForTimeout(2000);
  const ikinci = { ...(await durum()), ozet: (await toast()).split(" | ").filter((x) => /satır aktarıldı/.test(x)) };
  await tarayici.close();
  return { hatalar, ilk, ikinci, istekler: istekler.map((x) => (x.tur ? `${x.ad}:${x.tur}` : x.ad)) };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
