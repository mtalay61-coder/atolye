// SENARYO — RENK BAŞLIĞI ÜRETİM VE PLANLAMADA (27 Eylül, v1.495.0).
//
// Kullanıcı: "Üretim ve planlamada da başlık görünsün." (v1.494.0'da başlık kart/fiş/sipariş formunda.)
// Kurulum: Bot'un başlığı "Baskı"; reçetesinde Deri ("Renk") ve Takviye Bezi ("Kalınlık"). Satış siparişi.
// Ölçülenler (sipariş kartı):
//   0. Kart özetindeki kalem tablosunda Bot'un sütunu "Baskı".
//   1. Planlama bölümünde Bot'un satırı "Baskı" başlığıyla.
//   2. Hammadde ihtiyaç tablosunda (IhtiyacMatrisi) başlıklar karışık (beden bazlı Deri "Renk", Takviye
//      "Kalınlık"): sütunda ikisi, başlık değiştiği yerde ara satırlar; bedensiz Deri tekil satırda.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.renkBasligi = "Baskı";
  stok.push({ id: "tb", ad: "Takviye Bezi", kategori: "Hammadde", birim: "metre", renkBasligi: "Kalınlık", hareketler: [],
    variants: ["40", "41"].map((b) => ({ renk: "2 mm", beden: b, miktar: 0, minStok: 0 })) });
  // Beden bazlı satırlar: ihtiyaç tablosu MATRİS olarak çizilsin (ara başlık yolu). Deri bedensiz
  // kalır → tekil satır ("Siyah"); Takviye beden beden → matris.
  bot.recete = [
    { id: "r1", hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "desi", proses: "Kesim" },
    ...["40", "41"].map((b) => ({ id: `r2${b}`, hammaddeUrunId: "tb", hammaddeAd: "Takviye Bezi", renk: "2 mm", beden: b, mamulRenk: "Siyah", mamulBeden: b, miktar: 1, birim: "metre", proses: "Kesim" })),
    ...["40", "41"].map((b) => ({ id: `r3${b}`, hammaddeUrunId: "u1", hammaddeAd: "Deri", renk: "Taba", beden: b, mamulRenk: "Siyah", mamulBeden: b, miktar: 3, birim: "desi", proses: "Kesim" })),
  ];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{
    id: "s1", siparisNo: "SAT-9101", tip: "Satış", cariId: "c2", cariAd: "Müşteri B", tarih: "2026-09-19", durum: "Bekliyor",
    kalemler: ["40", "41"].map((b, i) => ({ id: `k${i}`, urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: b, miktar: 5, birimFiyat: 900, paraBirimi: "TRY", karsilanan: 0 })),
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Sipariş"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(1000);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /SAT-9101/.test((e.textContent || "").trim()));
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);
  const kartOzeti = await sayfa.evaluate(() => [...document.querySelectorAll("[data-siparis-kart-renk-basligi]")].filter((e) => e.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()));
  // Planlama ve hammadde ihtiyacı tam ekranda.
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => {
    // "Hammadde İhtiyacı" sekmesi (düğme: simge + metin).
    const el = [...document.querySelectorAll("button")].find((e) => /^Hammadde İhtiyacı/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    if (el) el.click();
  });
  await sayfa.waitForTimeout(600);

  const sonuc = await sayfa.evaluate(() => {
    const gorunur = (e) => e.getBoundingClientRect().width > 0;
    return {
      planlamaBasligi: [...document.querySelectorAll("th")].filter(gorunur).map((x) => x.textContent.trim()).filter((x) => x === "Baskı" || x === "Renk"),
      ihtiyacSutunu: [...document.querySelectorAll("[data-ihtiyac-renk-sutunu]")].filter(gorunur).map((x) => x.textContent.trim()),
      ihtiyacAraBasliklar: [...document.querySelectorAll("[data-ihtiyac-renk-ara-baslik]")].filter(gorunur).map((x) => x.textContent.trim()),
      // Bedensiz malzemeler tekil satırda: başlık "Renk" değilse değerin önünde yazar ("Kalınlık: 2 mm").
      tekilSatirlar: [...document.querySelectorAll("td.mono")].filter(gorunur).map((x) => x.textContent.trim()).filter((x) => /2 mm|^Siyah$|Taba/.test(x)),
    };
  });

  await tarayici.close();
  return { hatalar, kartOzeti, ...sonuc };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
