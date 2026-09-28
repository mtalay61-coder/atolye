// SENARYO — SİPARİŞTEN SEÇ: SATIR BAZINDA EKLE (28 Eylül, v1.516.0).
//
// Kullanıcı (Cariden Alış Fişi, iki açık alış siparişi): "Bu siparişin kalemlerini ekle'yi satır bazlı ve adet
// yerlerini de girerek yapabilelim, satırın sağında Ekle butonu olsun. Ekle'ye basınca asorti, manuel giriş vs.
// ekleme standartlarımızda ekleyebilelim."
// Kurulum: Tedarikçi A'nın AS-S1 alış siparişi — Bot Siyah 40:2 41:3 ve Bot Kahve 40:4 41:4 (Kahve'de 41 iki
// kaleme bölünmüş: 1 + 3, planlamada bölünme gibi).
// Ölçülen:
//   1) Siyah satırının Ekle'si giriş alanını dolduruyor: ürün, renk, kalan adetler (40:2 41:3), siparişin fiyatı,
//      siparişe bağ şeridi.
//   2) 41 elle 1'e indirilip eklendi → fişte Siyah 40:2 41:1, ikisi de AS-S1 kalemine bağlı.
//   3) Kahve satırı yüklendi, 41 elle 6 yapıldı (kalan 1+3=4) → iki kaleme 1 ve 5 (son kalem 2 fazlası, "sipariş
//      fazlası" işaretli); 40:4 bağlı.
//   4) Kaydedince siparişte teslim alınan: Siyah 40:2/2 41:1/3; Kahve 40:4/4, 41 bölünmüş kalemler 1/1 ve 5/3.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  ["Siyah", "Kahve"].forEach((r) => ["40", "41"].forEach((b) => {
    if (!bot.variants.some((v) => v.renk === r && v.beden === b)) bot.variants.push({ renk: r, beden: b, miktar: 0 });
  }));
  t["stok:items"] = JSON.stringify(stok);
  const kalem = (id, renk, beden, miktar) => ({ id, urunId: "u2", urunAd: "Bot", renk, beden, miktar, karsilanan: 0, birim: "çift", birimFiyat: 80, paraBirimi: "TRY" });
  t["siparis:data"] = JSON.stringify([{
    id: "ss1", siparisNo: "AS-S1", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-28", teslimTarihi: "",
    kalemler: [kalem("y40", "Siyah", "40", 2), kalem("y41", "Siyah", "41", 3), kalem("k40", "Kahve", "40", 4), kalem("k41a", "Kahve", "41", 1), kalem("k41b", "Kahve", "41", 3)],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Tedarikçi A" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("AF-SATIR");
  await sayfa.locator("[data-siparisten-sec]").first().click();
  await sayfa.waitForTimeout(400);

  const girisDurumu = () => sayfa.evaluate(() => ({
    urun: (document.querySelector("[data-urun-arama]") || {}).value || "",
    renk: (document.querySelector("[data-renk-arama]") || {}).value || "",
    miktarlar: Object.fromEntries([...document.querySelectorAll("[data-kalem-miktar]")].filter((i) => i.getBoundingClientRect().width > 0).map((i) => [i.getAttribute("data-kalem-miktar"), i.value])),
    fiyat: (document.querySelector("[data-kalem-fiyat]") || {}).value || "",
    bag: (document.querySelector("[data-kalem-siparis-bagi]") || { getAttribute: () => null }).getAttribute("data-kalem-siparis-bagi"),
  }));

  // 1-2) Siyah satırı → 41'i 1'e indir → Ekle.
  await sayfa.locator('[data-siparis-satir-ekle="AS-S1|Bot|Siyah"]').first().click();
  await sayfa.waitForTimeout(500);
  const siyahYuklendi = await girisDurumu();
  await sayfa.locator('[data-kalem-miktar="41"]:visible').first().fill("1");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);

  // 3) Kahve satırı → 41'i 6 yap → Ekle.
  await sayfa.locator('[data-siparis-satir-ekle="AS-S1|Bot|Kahve"]').first().click();
  await sayfa.waitForTimeout(500);
  const kahveYuklendi = await girisDurumu();
  await sayfa.locator('[data-kalem-miktar="41"]:visible').first().fill("6");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const bagSonrasi = await girisDurumu();

  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1500);
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "ss1") || {};
  const b2 = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2") || {};
  await tarayici.close();
  return {
    hatalar,
    siyahYuklendi, kahveYuklendi,
    eklendiktenSonraGirisBos: !bagSonrasi.urun && !bagSonrasi.bag,
    fisHareketleri: (b2.hareketler || []).filter((h) => h.fisNo === "AF-SATIR")
      .map((h) => `${h.renk} ${h.beden} +${h.miktar} → ${h.kalemId || "bağsız"}${h.fazlaGonderim ? " (fazla)" : ""}`).sort(),
    karsilanan: (sip.kalemler || []).map((k) => `${k.id}: ${k.karsilanan || 0}/${k.miktar}`),
  };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
