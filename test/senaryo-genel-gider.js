// SENARYO — GENEL GİDER VE ÇİFT BAŞI MALİYET (kullanıcı, 20 Eylül: "elektrik, kira, SSK, vergi,
// araç, amortisman ve diğer işçilik maliyetleri gibi veri yok... aylık üretim hedefi koyalım ve
// aylık giderleri buna bölelim. Hem hedefler tutuyor mu görürüz hem maliyetin gerçekleşmesini").
//
// Ölçülen: (1) toplam aylık sabit gider; (2) hedefe göre çift başı; (3) kalem başına çift başı
// katkı (şoför 0,20 · muhasebeci 0,50 gibi); (4) gerçekleşen üretime göre çift başı — hedefin
// altında üretilirse maliyet ARTAR.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  // 3000 çift hedef · 60.000 kira + 600 şoför + 1.500 muhasebeci = 62.100 → çift başı 20,70
  // Şoför tek başına: 600 / 3000 = 0,20 ₺/çift.
  tan.aylikUretimHedefi = 3000;
  tan.genelGiderler = [
    { id: "g1", ad: "Kira", grup: "yonetim", aylikTutar: 60000 },
    { id: "g2", ad: "Şoför", grup: "yonetim", aylikTutar: 600 },
    { id: "g3", ad: "Muhasebeci", grup: "yonetim", aylikTutar: 1500 },
  ];
  // GERÇEKLEŞEN (20 Eylül): kalem bir gider kartına bağlanınca o kartın bu ayki ödemeleri
  // toplanıyor; plan 60.000, gerçek 66.000 → %10 sapma.
  tan.giderKartlari = [{ id: "gk-kira", ad: "Kira kartı", grup: "yonetim", tur: "gider" }];
  tan.genelGiderler[0].giderKartId = "gk-kira";
  t["tanimlar:data"] = JSON.stringify(tan);
  const bugun = new Date().toISOString().slice(0, 10);
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      { id: "m1", tarih: bugun, yon: "Çıkış", tutar: 66000, giderKartId: "gk-kira", giderKartAd: "Kira kartı", giderGrubu: "yonetim" },
    ] }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Gelir / Gider"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-gg-sekme="genel"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(700);

  const ozet = await sayfa.evaluate(() => {
    const m = document.body.innerText.replace(/\n/g, " | ");
    const al = (etiket) => { const i = m.indexOf(etiket); return i < 0 ? null : m.slice(i + etiket.length, i + etiket.length + 20).split("|")[1].trim(); };
    return {
      toplam: al("Aylık toplam sabit gider"),
      hedefeGore: al("Hedefe göre çift başı"),
      // Şoför satırındaki çift başı katkı: 600/3000 = 0,20 ₺
      soforCiftBasi: /0,2 ₺\/çift/.test(m),
      // Gruplar artık gelir/gider kartlarının grupları (20 Eylül).
      grupBasligi: /Genel yönetim/.test(m),
      // Kira: plan 60.000, gerçek 66.000 → +%10
      sapma: /gerçek 66\.000 ₺ · \+%10/.test(m),
      // Kalem eklerken kart seçiliyor (elle ad yazılmıyor).
      kartSecici: document.querySelectorAll("[data-gg-kart-sec]").length > 0,
    };
  });

  await tarayici.close();
  return { hatalar, ozet };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
