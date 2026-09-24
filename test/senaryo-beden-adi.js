// SENARYO — BEDEN ADI DÜZENLEME (kullanıcı, 14 Eylül: "Tanımlarda beden adı düzenleme olsun").
//
// Ölçülen: Tanımlar > Renk & Beden > Beden listesinde ad düzenlenebiliyor; değişiklik ürün
// varyantı, reçete, stok hareketi, sipariş kalemi, üretim beden dağılımı, koli kalemi ve asorti
// oranında da hizalanıyor (aksi halde "41" ile "41B" iki ayrı beden olur, eşleşme kopar).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const tanimlar = JSON.parse(TOHUM["tanimlar:data"]);
  tanimlar.bedenler = [{ id: "b41", ad: "41", tip: "Beden", barkodKodu: 41 }];
  tanimlar.asortiler = [{ id: "as1", ad: "Standart", oranlar: [{ beden: "41", oran: 2 }] }];
  t["tanimlar:data"] = JSON.stringify(tanimlar);
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  // "3840": geçmişte serbest yazılmış, tanımda olmayan bozuk beden (kullanıcının ekran görüntüsü).
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 5 }, { renk: "Siyah", beden: "3840", miktar: 2 }];
  bot.recete = [{ id: "r1", hammaddeId: "u1", hammaddeAd: "Deri", miktar: 2, birim: "desi", mamulBeden: "41", beden: "" }];
  bot.hareketler = [{ id: "h1", tarih: "2026-09-10", tip: "Giriş", kaynak: "Üretim", renk: "Siyah", beden: "41", miktar: 5, fisNo: "10001-Giriş" }];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{ id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-09-10",
    kalemler: [{ id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 20, paraBirimi: "USD" }] }]);
  t["uretim:siparisler"] = JSON.stringify([{ id: "up1", siparisNo: "10001", model: "Bot", urunId: "u2", renk: "Siyah", adet: 5,
    bedenMiktarlari: [{ beden: "41", miktar: 5 }],
    prosesIlerleme: [{ proses: "Kesim", sira: 1, verildiMi: true, atamalar: [{ id: "a1", personelId: "c3", miktar: 5, bedenMiktarlari: { 41: 5 }, tamamlandiMi: true }] }] }]);
  t["koli:data"] = JSON.stringify([{ id: "koli1", kod: "K-1", durum: "Hazır", kalemler: [{ urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", adet: 5 }] }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  // Bölümler kapalı geliyor: "N tanımlı öğe" düğmeleriyle açılıyor. Hepsini aç.
  await sayfa.evaluate(() => { [...document.querySelectorAll("button")].filter((x) => /tanımlı öğe/.test(x.textContent) && x.getBoundingClientRect().width > 0).forEach((b) => b.click()); });
  await sayfa.waitForTimeout(600);
  const duzenlenebilir = await sayfa.evaluate(() => [...document.querySelectorAll("input")].some((i) => i.value === "41" && i.getBoundingClientRect().width > 0));
  await sayfa.evaluate(() => {
    const i = [...document.querySelectorAll("input")].find((x) => x.value === "41" && x.getBoundingClientRect().width > 0);
    i.focus();
  });
  await sayfa.keyboard.press("Control+A");
  await sayfa.keyboard.type("41 numara");
  await sayfa.keyboard.press("Enter");
  await sayfa.waitForTimeout(1500);

  const son = {
    tanim: ((await depoOku(sayfa, "tanimlar:data")).bedenler || []).map((b) => b.ad),
    asorti: (((await depoOku(sayfa, "tanimlar:data")).asortiler || [])[0].oranlar || []).map((o) => o.beden),
    varyant: ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").variants || []).map((v) => v.beden),
    recete: ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").recete || []).map((r) => r.mamulBeden),
    hareket: ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").hareketler || []).map((h) => h.beden),
    siparis: ((await depoOku(sayfa, "siparis:data"))[0].kalemler || []).map((k) => k.beden),
    uretim: ((await depoOku(sayfa, "uretim:siparisler"))[0].bedenMiktarlari || []).map((b) => b.beden),
    uretimAtama: Object.keys((await depoOku(sayfa, "uretim:siparisler"))[0].prosesIlerleme[0].atamalar[0].bedenMiktarlari),
    koli: ((await depoOku(sayfa, "koli:data"))[0].kalemler || []).map((k) => k.beden),
  };

  // TANIMSIZ ÖLÇÜ (14 Eylül): kayıtlarda geçen ama tanımda olmayan "3840" bölümde görünüyor ve
  // tanımlı bir bedenle birleştirilebiliyor.
  const tanimsizGorundu = await sayfa.evaluate(() => [...document.querySelectorAll("[data-tanimsiz-olcu]")].map((e) => e.getAttribute("data-tanimsiz-olcu")));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.evaluate(() => { const sel = document.querySelector('[data-tanimsiz-cevir="3840"]'); if (sel) { sel.value = "41 numara"; sel.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sayfa.waitForTimeout(1500);
  const birlesmeSonrasi = {
    varyant: [...new Set(((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").variants || []).map((v) => v.beden))],
    kalanTanimsiz: await sayfa.evaluate(() => [...document.querySelectorAll("[data-tanimsiz-olcu]")].map((e) => e.getAttribute("data-tanimsiz-olcu"))),
  };

  await tarayici.close();
  return { hatalar, duzenlenebilir, son, tanimsizGorundu, birlesmeSonrasi };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
