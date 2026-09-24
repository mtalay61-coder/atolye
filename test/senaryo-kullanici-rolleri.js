// SENARYO — KULLANICI ROLLERİ (kullanıcı, 17 Eylül: "admin her şeye yetkili, üretim kullanıcısı
// üretim işleriyle alakalı yerleri görüp işlem yapabilecek, muhasebe kullanıcısı muhasebe ile
// alakalı, üretim + muhasebe kullanıcısı, bir de panel kullanıcısı — sadece tek ekrandan işlem
// yapabilecek, örnek üretimde barkod ekranı").
//
// Ölçülen: (1) rol şablonu seçilince yetki kutuları doluyor (28 kutuyu elle işaretlemeye gerek
// yok); (2) ÜRETİM rolü muhasebeyi görmüyor; (3) PANEL kullanıcısında MENÜ HİÇ ÇİZİLMİYOR ve
// seçilen ekran açılmış geliyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { bulutGirisRotasi } = require("./giris-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

function girisliTohum(kullanicilar) {
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.girisAktifMi = true;
  tan.kullanicilar = kullanicilar;
  t["tanimlar:data"] = JSON.stringify(tan);
  return t;
}
async function girisYap(sayfa, ka, sifre) {
  await sayfa.locator("input").first().fill(ka);
  await sayfa.locator('input[type="password"]').first().fill(sifre);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Giriş/.test(x.textContent)); if (b) b.click(); });
  await sayfa.waitForTimeout(1600);
}

async function calistir() {
  const hatalar = [];

  // ---- 1) ŞABLON UYGULAMA (yönetici olarak)
  const t1 = girisliTohum([{ id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true },
    { id: "k2", ad: "Usta", kullaniciAdi: "usta", rol: "", yetkiler: {}, eposta: "usta@atolye.local", bulutHesabi: true }]);
  const { tarayici, sayfa } = await uygulamaAc(t1, { hataYaz: false, onceRota: (s) => bulutGirisRotasi(s) });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await girisYap(sayfa, "mahmut", "123456");
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Kullanıcılar" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Yetkiler/.test(x.textContent) && x.offsetParent);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const sablonSecici = await sayfa.evaluate(() => {
    const s = document.querySelector("[data-rol-sablonu]");
    return s ? [...s.options].map((o) => o.value).filter(Boolean) : [];
  });
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-rol-sablonu]");
    const o = [...s.options].find((x) => x.value === "Üretim");
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(1000);
  const uretimRolu = (() => {
    return depoOku(sayfa, "tanimlar:data").then((d) => {
      const u = (d.kullanicilar || []).find((k) => k.id === "k2") || {};
      const y = u.yetkiler || {};
      return {
        rol: u.rol,
        uretimGorur: !!(y.uretim && y.uretim.goruntuleme),
        muhasebeGormez: !(y.muhasebe && y.muhasebe.goruntuleme),
        cariGormez: !(y.cari && y.cari.goruntuleme),
      };
    });
  })();
  const uretim = await uretimRolu;
  await tarayici.close();

  // ---- 2) PANEL KULLANICISI: menü yok, barkod ekranı açık
  const t2 = girisliTohum([
    { id: "k1", ad: "Mahmut", kullaniciAdi: "mahmut", rol: "Yönetici", yetkiler: {}, eposta: "mahmut@atolye.local", bulutHesabi: true },
    { id: "k2", ad: "Kalfa", kullaniciAdi: "kalfa", sifre: "123456", rol: "Panel", panelEkrani: "barkod",
      yetkiler: { uretim: { goruntuleme: true, duzenleme: true, kaydetme: true, silme: false } } },
  ]);
  const ikinci = await uygulamaAc(t2, { hataYaz: false, onceRota: (s) => bulutGirisRotasi(s) });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2500);
  await girisYap(ikinci.sayfa, "kalfa", "123456");
  const panel = await ikinci.sayfa.evaluate(() => ({
    menuCizilmedi: !document.querySelector(".sidebar"),
    barkodEkraniAcik: /Barkod|Personel barkodu/i.test(document.body.innerText),
    fisMenusuYok: !document.querySelector('[data-nav="Fişler"]'),
  }));
  await ikinci.tarayici.close();

  return { hatalar, sablonSecici, uretim, panel };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
