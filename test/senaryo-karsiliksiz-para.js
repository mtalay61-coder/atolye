// SENARYO — KARŞILIKSIZ PARA HAREKETİ (kullanıcı, 19 Eylül: "karşılığı olmayan para hareketi
// denetim kuralı").
//
// 2c kuralı CARİ tarafından bakıyordu ("ekstrede ödeme var, kasada yok"). Bu kural TERS yöne
// bakıyor: kasada hareket var ama karşılığı yok. Para kasadan çıkmış, kime gittiği yazılmamış —
// kasa bakiyesi doğru ama o tutar kâr-zarar raporuna da girmiyor (gider kartı olmadığı için).
//
// ÜÇ MEŞRU KARŞILIK: virman · gider/gelir kartı · cari bağı (karşı tarafı duruyorsa).
//
// Ölçülen: (1) karşılıksız hareket yakalanıyor; (2) gider kartlı hareket YAKALANMIYOR (meşru);
// (3) virmanın tek ayağı yakalanıyor; (4) bağı olup karşılığı silinmiş hareket yakalanıyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      // 1) Hiçbir karşılığı yok → bulgu
      { id: "m1", tarih: "2026-09-10", yon: "Çıkış", tutar: 5000, aciklama: "Elden ödeme" },
      // 2) Gider kartı var → MEŞRU, bulgu ÇIKMAMALI
      { id: "m2", tarih: "2026-09-11", yon: "Çıkış", tutar: 12000, giderKartId: "gk1", giderKartAd: "Kira", giderGrubu: "yonetim" },
      // 3) Virman ama tek ayak → bulgu
      { id: "m3", tarih: "2026-09-12", yon: "Çıkış", tutar: 3000, virmanMi: true, muhasebeBagId: "v1" },
      // 4) Cari bağı var ama o cari hareketi yok → bulgu
      { id: "m4", tarih: "2026-09-13", yon: "Giriş", tutar: 700, muhasebeBagId: "kopuk-1" },
    ] }],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Bakım" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-denetim-baslat]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1600);

  const bulgular = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      karsiliksiz: /Kasa\/banka hareketinin karşılığı yok/.test(m),
      virmanTekAyak: /Virmanın tek ayağı var/.test(m),
      bagiKopuk: /Para hareketinin cari karşılığı silinmiş/.test(m),
      // Gider kartlı hareket meşru: 12.000 tutarı bulgularda GEÇMEMELİ.
      giderKartliGecmiyor: !/12\.000/.test(m),
    };
  });

  await tarayici.close();
  return { hatalar, bulgular };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
