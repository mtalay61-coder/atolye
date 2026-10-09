// SENARYO — CARİ RAPORLARI (9 Ekim, v1.619.0).
// Kullanıcı: "Cari siparişleri, teslim edilen, kalan, alacak verecek, sağlık durumu rapor yapalım cari bölümüne. Raporlar
// başlığında carinin o anki bakiyesi…" Ölçülen: Cari ekranında Liste/Raporlar sekmesi; Raporlar tablosu riskliyi öne alır;
// Müşteri B'ye dokununca rapor kartı: bakiye (alacağımız 250 $), sayılar, nedenler, sipariş satırı (SAT-R1, gecikti);
// sipariş no'ya dokununca siparişe gider; Liste'ye dönülünce kartlar yerinde. Fişler ekranında tip çipleri işaretli.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([{ id: "r1", siparisNo: "SAT-R1", tip: "Satış", cariId: "c2", durum: "Kısmi Teslim", tarih: "2026-09-01", teslimTarihi: "2026-09-15",
    kalemler: [{ id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 16, karsilanan: 10, birim: "çift", birimFiyat: 25, paraBirimi: "USD" }] }]);
  const c = JSON.parse(t["cari:data"]);
  // Müşteri B: 400 $ borç (eski), 150 $ tahsilat 2026-07-01 → bugünden çok önce → riskli.
  c.find((x) => x.id === "c2").hareketler = [
    { id: "b1", tarih: "2026-06-01", yon: "Borç", tutar: 400, paraBirimi: "USD", fisNo: "SF-1", siparisId: "r1" },
    { id: "t1", tarih: "2026-07-01", yon: "Alacak", tutar: 150, paraBirimi: "USD", fisNo: "THS-1", siparisId: "r1" },
  ];
  t["cari:data"] = JSON.stringify(c);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(600);
  const sekmeler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-ust-sekme]")].map((b) => b.getAttribute("data-cari-ust-sekme")));
  await sayfa.locator('[data-cari-ust-sekme="raporlar"]').click(); await sayfa.waitForTimeout(500);
  const tablo = await sayfa.evaluate(() => [...document.querySelectorAll("[data-cari-rapor-satir]")].map((tr) => ({
    cari: tr.getAttribute("data-cari-rapor-satir"), durum: (tr.querySelector("[data-cari-saglik]") || {}).getAttribute ? tr.querySelector("[data-cari-saglik]").getAttribute("data-cari-saglik") : null })));
  await sayfa.locator('[data-cari-rapor-satir="Müşteri B"]').click(); await sayfa.waitForTimeout(400);
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, fullPage: false });
  const kart = await sayfa.evaluate(() => {
    const k = document.querySelector("[data-cari-rapor-karti]");
    if (!k) return null;
    return { cari: k.getAttribute("data-cari-rapor-karti"), bakiye: k.querySelector("[data-cari-rapor-bakiye]").innerText.replace(/\d\d\.\d\d\.\d{4}/, "GG.AA.YYYY").replace(/\s+/g, " ").trim(),
      saglik: k.querySelector("[data-cari-saglik]").getAttribute("data-cari-saglik"),
      nedenler: [...k.querySelectorAll("[data-cari-rapor-nedenler] div")].map((d) => d.textContent.trim()).filter((x) => !/gün önce/.test(x)),
      tahsilatNedeni: [...k.querySelectorAll("[data-cari-rapor-nedenler] div")].some((d) => /Alacağımız var — son tahsilat \d+ gün önce/.test(d.textContent)),
      siparis: [...k.querySelectorAll("[data-cari-rapor-siparis]")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
      paylas: !!k.querySelector("button") };
  });
  await sayfa.locator('[data-cari-rapor-siparis="SAT-R1"] button').click(); await sayfa.waitForTimeout(700);
  // Sipariş ekranına geçti: görünen bir sipariş satırı/kartı SAT-R1 (cari raporu görünmüyor).
  const siparisEkrani = await sayfa.evaluate(() => {
    const gorunur = (e) => e && e.getBoundingClientRect().width > 0;
    const sip = [...document.querySelectorAll('[data-siparis-satir="SAT-R1"], [data-siparis-tam-ekran="SAT-R1"]')].some(gorunur);
    const rapor = [...document.querySelectorAll("[data-cari-raporlari]")].some(gorunur);
    return { sip, raporGorunmuyor: !rapor };
  });
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cari-ust-sekme="liste"]').click(); await sayfa.waitForTimeout(300);
  const listeKartlari = await sayfa.evaluate(() => /Müşteri B/.test(document.body.innerText) && !document.querySelector("[data-cari-raporlari]"));
  await modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(500);
  const fisCipleri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-fis-tip-cipi]")].map((b) => b.getAttribute("data-fis-tip-cipi")));
  await tarayici.close();
  return { hatalar, sekmeler, tablo, kart, siparisEkrani, listeKartlari, fisCipleri };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 1)));
module.exports = { calistir };
