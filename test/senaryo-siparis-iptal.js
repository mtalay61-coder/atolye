// SENARYO — SİPARİŞ İPTALİ: FİŞLER BAĞIMSIZ KALIR (28 Eylül, v1.512.0; v1.509.0'daki "siparis-sil-yetim"in yerine).
//
// Kullanıcının kuralı: "Sipariş silindiğinde fişler silinmez, bağlı fişler bağımsız fiş olur. Müşteri siparişi
// iptal ettiğinde alım vs. varsa bunlar yok olmaz, sadece o siparişten bağlantısı kalmaz; oluşan stok serbest
// stoğa düşer." v1.509.0 bunun tersini güvenceye alıyordu (silme zinciri fişin stok ve cari hareketini siliyor,
// stok 6 → 10 dönüyordu).
// Kurulum: SAT-Y ve ona bağlı SF-Y fişi (stok −4, cari 400 ₺); SAT-Y için planlanmış ALS-Y alış siparişi
// (not "Kaynak: SAT-Y", zincir `rezervasyonSiparisId`); SAT-Y'ye ayrılmış hammadde rezervasyonu.
// Ölçülen:
//   1) kart → sil simgesi → onay "iptal" kipinde, fiş ve alış listeleniyor → "Evet, İptal Et";
//   2) sipariş "İptal" durumunda duruyor; SF-Y'nin stok ve cari hareketi DURUYOR (bağsız, "SAT-Y (iptal)"),
//      stok 6 kalıyor, cari 400; ALS-Y devam ediyor (zinciri boş, not işaretli); rezervasyon kalktı;
//   3) Stok ekranında "bağlantısız stok hareketi" uyarısı yok;
//   4) iptal edilmiş sipariş ikinci kez silinince listeden çıkıyor, fiş yine duruyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function kartiAcVeSil(sayfa, no = "SAT-Y", modul = "Sipariş") {
  await modulAc(sayfa, modul);
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator(`[data-siparis-tam-ekran="${no}"]`).first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.locator('button[title^="Siparişi"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  // Kart eylemi iki adımlı: "Sil" onayı, ardından kartın kendi onay kutusu.
  const sil = sayfa.getByRole("button", { name: "Sil", exact: true }).filter({ visible: true });
  if (await sil.count()) { await sil.first().click(); await sayfa.waitForTimeout(500); }
  const onay = await sayfa.evaluate(() => {
    const k = [...document.querySelectorAll("[data-siparis-kapat-onayi]")].find((x) => x.getBoundingClientRect().width > 0);
    return k ? { kip: k.getAttribute("data-siparis-kapat-onayi"), fisGorunuyor: /SF-Y/.test(k.innerText), alisGorunuyor: /ALS-Y/.test(k.innerText),
      satisPlanlamasiGorunuyor: /SAT-Z/.test(k.innerText) } : null;
  });
  if (process.env.EKRAN && no === "ALS-Z") await sayfa.screenshot({ path: process.env.EKRAN });
  const evet = sayfa.getByRole("button", { name: /^Evet, (İptal Et|Sil)$/ }).filter({ visible: true });
  if (await evet.count()) { await evet.first().click(); }
  await sayfa.waitForTimeout(1500);
  return onay;
}

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = bot.variants.map((v) => (v.renk === "Siyah" && v.beden === "40" ? { ...v, miktar: 6 } : v));
  bot.hareketler = [...(bot.hareketler || []), { id: "hy1", tarih: "2026-09-28T09:00:00.000Z", renk: "Siyah", beden: "40", miktar: -4,
    kaynak: "Satış", cariId: "c2", fisNo: "SF-Y", siparisId: "sy", siparisNo: "SAT-Y", kalemId: "ky1" }];
  t["stok:items"] = JSON.stringify(stok);
  t["cari:data"] = JSON.stringify(JSON.parse(TOHUM["cari:data"]).map((c) => c.id === "c2" ? { ...c, hareketler: [
    { id: "hy1", tarih: "2026-09-28", yon: "Borç", tutar: 400, paraBirimi: "TRY", fisNo: "SF-Y", siparisId: "sy", siparisNo: "SAT-Y",
      urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, birimFiyat: 100, defter: "Genel", odemeSekli: "Nakit" }] } : c));
  t["siparis:data"] = JSON.stringify([
    { id: "sy", siparisNo: "SAT-Y", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-28", teslimTarihi: "2026-10-05",
      kalemler: [
        { id: "ky1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" },
        { id: "ky2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY",
          planlama: { tip: "Satınalma", referansNo: "ALS-Y" } },
      ] },
    { id: "ay", siparisNo: "ALS-Y", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-28", not: "Kaynak: SAT-Y", rezervasyonSiparisId: "sy",
      kalemler: [{ id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 60, paraBirimi: "TRY" }] },
    // v1.544.0 — kullanıcının örneği: satışın planladığı, FİŞİ OLMAYAN alış. Silinir (iptal değil), satışın
    // planlaması boşalır.
    { id: "sz", siparisNo: "SAT-Z", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-28",
      kalemler: [{ id: "kz1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY",
        planlama: { tip: "Satınalma", referansNo: "ALS-Z" } }] },
    { id: "az", siparisNo: "ALS-Z", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-28", not: "Kaynak: SAT-Z",
      kalemler: [{ id: "akz", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 60, paraBirimi: "TRY" }] },
  ]);
  t["stokrez:data"] = JSON.stringify([{ id: "rz1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", birim: "m", siparisId: "sy", siparisNo: "SAT-Y", uretimNo: "", miktar: 3, tuketilen: 0, tarih: "2026-09-28" }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  const onay = await kartiAcVeSil(sayfa);
  const sip = (await depoOku(sayfa, "siparis:data")) || [];
  const sy = sip.find((s) => s.id === "sy") || {};
  const ay = sip.find((s) => s.id === "ay") || {};
  const b2 = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
  const c2 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const rez = (await depoOku(sayfa, "stokrez:data")) || [];
  const sh = (b2.hareketler || []).find((h) => h.id === "hy1") || null;
  const ch = (c2.hareketler || []).find((h) => h.id === "hy1") || null;
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  const yetimUyarisi = await sayfa.evaluate(() => /bağlantısız stok hareketi/.test(document.body.innerText));

  // İptal edilmiş siparişi ikinci kez sil: bu sefer listeden çıkar (bağı kalmadı), fiş yine durur.
  const onay2 = await kartiAcVeSil(sayfa);
  const sip2 = (await depoOku(sayfa, "siparis:data")) || [];
  const b3 = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
  // Fişsiz, satışa bağlı alış: onay "sil" kipinde, çözülecek bağ (SAT-Z planlaması) listede; silinince alış yok,
  // satışın kalemi yeniden planlanabilir.
  const onay3 = await kartiAcVeSil(sayfa, "ALS-Z", "Alış Siparişi");
  const sip3 = (await depoOku(sayfa, "siparis:data")) || [];
  const sz = sip3.find((s) => s.id === "sz") || {};
  await tarayici.close();
  return {
    fissizAlisSilme: {
      kip: onay3 && onay3.kip, bagGorunuyor: !!(onay3 && onay3.satisPlanlamasiGorunuyor),
      alisSilindi: !sip3.some((s) => s.id === "az"),
      satisPlanlamasiBos: ((sz.kalemler || [])[0] || {}).planlama || null,
    },
    hatalar,
    iptalOnayi: onay,
    siparisDurumu: sy.durum || null,
    fisStokHareketi: sh ? { miktar: sh.miktar, fisNo: sh.fisNo, siparisNo: sh.siparisNo, bagli: !!sh.siparisId } : null,
    stok4040: ((b2.variants || []).find((v) => v.renk === "Siyah" && v.beden === "40") || {}).miktar,
    fisCariHareketi: ch ? { tutar: ch.tutar, siparisNo: ch.siparisNo, bagli: !!ch.siparisId } : null,
    alisDevam: { durum: ay.durum || null, zincir: ay.rezervasyonSiparisId || null, not: ay.not || "" },
    rezervasyonKaldi: rez.some((r) => r.siparisId === "sy"),
    yetimUyarisi,
    ikinciOnayKipi: onay2 && onay2.kip,
    ikinciSilmedenSonraSiparisVar: sip2.some((s) => s.id === "sy"),
    ikinciSilmedenSonraFisVar: (b3.hareketler || []).some((h) => h.id === "hy1"),
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
