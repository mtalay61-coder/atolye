// SENARYO — TEK FİŞ DEFTERİ: KENDİLİĞİNDEN YAZMA YOK, MAAŞ TAHAKKUKU ONAYLI (v1.740.0, stok-v2/FIS-DEFTERI-PLAN.md
// "Kendiliğinden yazanlar"). Sahte sunucu: fiş defteri kurulu. Tohumda fişsiz bir stok hareketi ve maaşlı bir bölüm personeli var.
// Ölçülen: (1) açılışta fişsiz harekete numara VERİLMEZ, fiş defterine "otomatik" kayıt kurulmaz, fis_defteri listesine yazma
// gitmez (30 Ekim hatasının kaynağı); (2) maaş kendiliğinden YAZILMAZ — "Maaş tahakkuku bekliyor" şeridi çıkar; (3) Onayla →
// tek fis_kes (Maaş, MAŞ), cari satırında ay anahtarı; şerit kalkar; eski yoldan cari yazması (car_yaz) gitmez.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.hareketler = [{ id: "h-fissiz", tarih: "2026-10-30T09:00:00.000Z", renk: "Siyah", beden: "41", miktar: 1, kaynak: "Sayım" }, ...(bot.hareketler || [])];
  t["stok:items"] = JSON.stringify(stok);
  const tan = JSON.parse(t["tanimlar:data"]);
  tan.bolumler = [{ id: "b-kes", ad: "Kesimhane", personel: [{ cariId: "c1", maas: 30000 }] }];
  t["tanimlar:data"] = JSON.stringify(tan);
  const istekler = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/rpc/fis_kes**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p;
      const c = ((p.cari || {}).satirlar || [])[0] || {};
      istekler.push(`fis_kes:${p.fis.tur}:${p.fis.onek}:${c.tutar}:${(c.ek || {}).maasAnahtari ? "anahtarli" : "anahtarsiz"}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: `${p.fis.onek}-261101001`, bagliFisNo: null, zatenVar: false }) });
    });
    await sayfa.route("**/rest/v1/rpc/lst_yaz**", (r) => {
      const p = JSON.parse(r.request().postData() || "{}").p || {};
      if (p.tablo === "fis_defteri") istekler.push(`lst_yaz:fis_defteri:${(p.kayitlar || []).length}`);
      return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await sayfa.route("**/rest/v1/rpc/car_yaz**", (r) => { istekler.push("car_yaz"); return r.abort(); });
  };
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true,
    liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3500);
  const yerelStok = await depoOku(sayfa, "stok:items");
  const fissiz = ((yerelStok.find((u) => u.id === "u2") || {}).hareketler || []).find((h) => h.id === "h-fissiz") || {};
  const defter = await sayfa.evaluate(() => (window.__fisDefteriOku ? window.__fisDefteriOku() : []).filter((f) => f && f.otomatik).map((f) => f.fisNo));
  const acilis = {
    fissizNumarasi: fissiz.fisNo || null,
    otomatikDefterKaydi: defter,
    seritMaas: await sayfa.locator("[data-maas-bekliyor]").count() ? (await sayfa.locator("[data-maas-bekliyor]").innerText()).replace(/\s+/g, " ").trim() : null,
    cariMaasYazildi: ((await depoOku(sayfa, "cari:data")).find((c) => c.id === "c1").hareketler || []).some((h) => /MAAS|Maaş/.test(`${h.fisNo} ${h.aciklama}`)),
  };
  await sayfa.locator("[data-maas-onayla]").click();
  await sayfa.waitForTimeout(1500);
  const c1 = (await depoOku(sayfa, "cari:data")).find((c) => c.id === "c1");
  const maasSatiri = (c1.hareketler || []).find((h) => h.maasAnahtari) || {};
  const sonra = {
    serit: await sayfa.locator("[data-maas-bekliyor]").count(),
    maasSatiri: `${maasSatiri.fisNo}:${maasSatiri.tutar}:${String(maasSatiri.maasAnahtari || "").replace(/\d{4}-\d{2}/, "AY")}`,
  };
  await tarayici.close();
  return { hatalar, acilis: { ...acilis, seritMaas: acilis.seritMaas && acilis.seritMaas.replace(/— [^:]+:/, "— AY:") }, sonra, istekler };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
