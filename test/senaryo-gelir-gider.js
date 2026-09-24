// SENARYO — GELİR / GİDER EKRANI (kullanıcı, 20 Eylül: "gelir gider kartlarını tanımlardan
// çıkaralım, finansın altına sekme açalım... gider kartlarını da cari gibi görmesi lazım,
// giderlerin raporları olacak").
//
// Kartlar Tanımlar'daydı — bir KURULUM ekranı, bir kez doldurulup unutulan yer. Oysa gelir/gider
// her gün kullanılan bir defter. Finans altına taşındı ve kart artık yalnız etiket değil: kendi
// hareketleri ve toplamı var, tıpkı cari gibi.
//
// Ölçülen: (1) ekran menüden açılıyor ve kart listeleniyor; (2) kart toplamı hareketlerden
// hesaplanıyor; (3) "Hareketler" ekstreyi açıyor ve hareketler tarih sırasında.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  tan.giderKartlari = [{ id: "gk1", ad: "İşyeri kirası", grup: "yonetim", tur: "gider", tdhp: "770.03" }];
  t["tanimlar:data"] = JSON.stringify(tan);
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      { id: "m1", tarih: "2026-09-10", yon: "Çıkış", tutar: 12000, giderKartId: "gk1", giderKartAd: "İşyeri kirası", aciklama: "Eylül kirası" },
      { id: "m2", tarih: "2026-08-10", yon: "Çıkış", tutar: 12000, giderKartId: "gk1", giderKartAd: "İşyeri kirası", aciklama: "Ağustos kirası" },
    ] }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const g = document.querySelector('[data-nav-grup="Finans"]'); if (g) g.click(); });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Gelir / Gider"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);

  const ekran = await sayfa.evaluate(() => ({
    kartSayisi: document.querySelectorAll("[data-gider-kart]").length,
    // İki hareketin toplamı: 24.000
    toplamGorunuyor: /24\.000/.test(document.body.innerText),
  }));

  await sayfa.evaluate(() => { const b = document.querySelector("[data-kart-ekstre]"); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const ekstre = await sayfa.evaluate(() => {
    const e = document.querySelector("[data-kart-hareketleri]");
    return e ? e.innerText.replace(/\n/g, " | ").slice(0, 120) : null;
  });

  await tarayici.close();
  return { hatalar, ekran, ekstre };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
