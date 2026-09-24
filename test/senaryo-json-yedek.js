// SENARYO — JSON YEDEĞİ TAM VE DOSYADAN GERİ YÜKLENİYOR (kullanıcı, 13 Eylül: "JSON yedeğinin içeriği
// nedir, veriler gittiğinde JSON ile geri gelir mi?").
//
// Eskiden yedekte muhasebe (kasa/banka/çek) ve koliler yoktu, dosyadan geri yükleme de yoktu.
// Ölçülen: indirilen JSON'da bütün bölümler var; veriler silindikten sonra dosya geri yüklenince
// stok, cari, sipariş, muhasebe (çek) ve koliler yerine geliyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");
const fs = require("fs");

async function calistir() {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "Kasa", hareketler: [] }], bankalar: [], cekler: [{ id: "cek1", cekNo: "12345", durum: "Portföyde", tip: "Alınan", tutar: 1000, paraBirimi: "TRY", cariId: "c2" }] });
  t["koli:data"] = JSON.stringify([{ id: "koli1", kod: "K-1", durum: "Hazır", kalemler: [{ urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", adet: 3 }] }]);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  // Yedekleme bölümü "Yedek & Bulut" sekmesinde (23 Eylül düzeni).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yedek & Bulut" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  // 1. Yedek indir ve içeriğini oku.
  const [indirme] = await Promise.all([
    sayfa.waitForEvent("download", { timeout: 10000 }),
    sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /JSON Yedek İndir/.test(x.textContent)); if (b) b.click(); }),
  ]);
  const yol = "/tmp/atolye-yedek-test.json";
  await indirme.saveAs(yol);
  const yedek = JSON.parse(fs.readFileSync(yol, "utf8"));
  const icerik = {
    surum: yedek.surum,
    bolumler: ["stok", "siparisler", "uretim", "cariler", "tanimlar", "muhasebe", "koliler", "cekGorselleri"].filter((k) => k in yedek),
    cekSayisi: ((yedek.muhasebe || {}).cekler || []).length,
    koliSayisi: (yedek.koliler || []).length,
    gorselDahil: yedek.gorsellerHaric === false,
  };

  // 2. Verileri boşalt (depoyu sıfırla) ve dosyadan geri yükle.
  await sayfa.evaluate(() => { ["stok:items", "cari:data", "siparis:data", "muhasebe:data", "koli:data"].forEach((k) => { window.__depo[k] = k === "muhasebe:data" ? "{}" : "[]"; }); });
  await sayfa.locator('[data-json-geri-yukle] input[type="file"]').setInputFiles(yol);
  await sayfa.waitForTimeout(2500);
  const sonra = {
    stok: ((await depoOku(sayfa, "stok:items")) || []).length,
    cari: ((await depoOku(sayfa, "cari:data")) || []).length,
    cek: (((await depoOku(sayfa, "muhasebe:data")) || {}).cekler || []).length,
    koli: ((await depoOku(sayfa, "koli:data")) || []).length,
    oncesiSaklandi: !!(await depoOku(sayfa, "yedek:geri-yukleme-oncesi")),
  };

  await tarayici.close();
  return { hatalar, icerik, sonra };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
