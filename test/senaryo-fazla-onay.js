// SENARYO — SATIŞ SİPARİŞİ FAZLASI, YÖNETİCİ ONAYI (v1.744.4, F3; kullanıcı kararı 2 Kasım: "önce onay düğmesi").
// 1.744.3 sunucusu satış siparişini aşan teslimi yalnız `fazlaTeslimOnayi: { onay: true, gerekce }` ile ve Yönetici kullanıcıdan
// kabul eder. Tek ekran fişinde (sipariş kartı › Fiş oluştur › Siparişten seç) 2 çiftlik kaleme 3 çift yazılır:
//   a) Yönetici → gerekçe sorulur; fis_kes yükünde üst düzey fazlaTeslimOnayi (gerekçeyle) gider; fiş kesilir.
//   b) Yönetici değil → soru sorulmaz, fis_kes'e HİÇ gidilmez, uyarı fazlayı ve kuralı söyler.
// Sunucu (sahte) fis_kes'i kabul eder; yetki doğrulaması gerçek sunucuda (stok-v2/test/f3/t-satis-sinir.js).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohum(rol) {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.variants = bot.variants.map((v) => (v.renk === "Siyah" && v.beden === "40" ? { ...v, miktar: 10 } : v));
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{ id: "sf", siparisNo: "SAT-F", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-11-02", teslimTarihi: "",
    kalemler: [{ id: "kf1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" }] }]);
  const tanimlar = JSON.parse(t["tanimlar:data"]);
  t["tanimlar:data"] = JSON.stringify({ ...tanimlar, girisAktifMi: true,
    kullanicilar: [{ id: "ky", ad: "Mahmut", kullaniciAdi: "Mahmut", sifre: "x", rol,
      // Yönetici dışı kullanıcıya fiş kesme yetkisi açıkça verilir: durdurmanın sebebi yetki değil, fazla teslim kuralı olsun.
      yetkiler: rol === "Yönetici" ? {} : Object.fromEntries(["siparis", "stok", "cari", "fisler"].map((m) => [m, ["goruntuleme", "duzenleme", "kaydetme", "silme"]])) },
      // Listede başka bir Yönetici: yoksa uygulama giren kişiyi Yönetici yapar (100-app "yöneticisiz liste kilidi").
      { id: "ka", ad: "Ayşe", kullaniciAdi: "Ayse", sifre: "y", rol: "Yönetici", yetkiler: {} }] });
  return t;
}

async function durum(rol) {
  const fisKes = []; const sorular = [];
  const onceRota = async (s) => {
    // Oturum sürdürme (100-app `oturum:aktif`): kullanıcı giriş yapmış açılır.
    await s.addInitScript(() => { try { localStorage.setItem("oturum:aktif", JSON.stringify({ kullaniciId: "ky", zaman: Date.now(), bulut: false })); } catch (e) { /* */ } });
    await s.route("**/rest/v1/rpc/fis_kes**", (r) => {
      fisKes.push((JSON.parse(r.request().postData() || "{}").p) || {});
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fisNo: "SF-261102001", bagliFisNo: null, zatenVar: false,
        kalemler: [{ id: "kf1", karsilanan: 3 }] }) });
    });
  };
  // Fiş defteri kurulu sahte sunucu (senaryo-stok-fis-kes ile aynı ayar satırı): teslim fis_kes yolundan gider.
  const stkAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true, liste_tablolari: ["fis_defteri"], fis_aktif: false };
  const { tarayici, sayfa } = await uygulamaAc(tohum(rol), { hataYaz: false, onceRota, stkAyar });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", async (d) => {
    sorular.push({ tur: d.type(), fazlaYaziyor: /Bot Siyah 40: 1 fazla/.test(d.message()) });
    if (d.type() === "prompt") await d.accept("Müşteri telefonla 1 çift ek istedi"); else await d.accept();
  });
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-siparis-tam-ekran="SAT-F"]').first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => document.querySelector("[data-siparisten-sec]").click());
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-siparisten-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const kutu = sayfa.locator("[data-fis-miktar]:visible").first();
  await kutu.fill("3"); await kutu.blur(); await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click().catch(() => {});
  await sayfa.waitForTimeout(2000);
  const metin = await sayfa.evaluate(() => document.body.innerText);
  const s = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sf") || { kalemler: [{}] };
  await tarayici.close();
  const yuk = fisKes[0] || null;
  return {
    hatalar, sorular,
    fisKesIstegi: fisKes.length,
    onay: yuk ? (yuk.fazlaTeslimOnayi || null) : null,
    stokSatiri: yuk ? ((yuk.stok && yuk.stok.satirlar) || []).map((x) => ({ miktar: x.miktar, kalemId: x.kalem_id || x.kalemId || null })) : null,
    yoneticiUyarisi: /Sipariş fazlası yalnız yönetici onayıyla teslim edilir/.test(metin),
    karsilanan: s.kalemler[0].karsilanan,
  };
}

async function calistir() {
  return { a_yonetici: await durum("Yönetici"), b_yonetici_degil: await durum("Üretim + Muhasebe") };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}
module.exports = { calistir };
