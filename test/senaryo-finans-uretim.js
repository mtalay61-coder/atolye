// SENARYO — FİNANS RAPORUNDA ÜRETİMDEKİ MAL VE İŞÇİLİK (26 Eylül, v1.465.0).
//
// Kullanıcı: "Ödenen ve ödenmeyen işçilik olarak ayırmak lazım… mamulün yarısı üretildiyse o kadar
// hammadde ve işçilik harcandı; gerçekleşen o anki durumu göstermesi gerekir."
//
// Birim testindeki örnek (birim-finans-rapor.js): 10 çiftlik Bot üretimi, Kesim ve Saya bitti,
// Montaj'dan 4 çift stoğa girdi, personele 60 ₺ ödendi. Ekranda:
//   1. Özetin altında üretimdeki mal: 750 ₺ = hammadde 1.080 + işçilik 350 (ödenen 60 · ödenmemiş 290)
//      − bitmiş mala aktarılan 680.
//   2. "Stok Değeri" raporunda Bot (4 çift, hammadde 480 + işçilik 200) ve üretim satırı.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["stok:items"] = JSON.stringify([
    { id: "deri", ad: "Deri", kategori: "Hammadde", birim: "metre", alisFiyati: 50, variants: [{ renk: "Siyah", beden: "", miktar: 80 }], hareketler: [
      { id: "d1", tarih: "2026-09-01", renk: "Siyah", beden: "", miktar: 100 },
      { id: "d2", tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -20, kaynak: "Üretim", uretimId: "u1", fisNo: "10001-Kesim" }] },
    { id: "taban", ad: "Taban", kategori: "Hammadde", birim: "adet", alisFiyati: 20, variants: [{ renk: "", beden: "", miktar: 46 }], hareketler: [
      { id: "t1", tarih: "2026-09-01", renk: "", beden: "", miktar: 50 },
      { id: "t2", tarih: "2026-09-20", renk: "", beden: "", miktar: -4, kaynak: "Üretim", uretimId: "u1", fisNo: "10001-Montaj" }] },
    { id: "bot", ad: "Bot", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", prosesUcretleri: { Kesim: 10, Saya: 15, Montaj: 25 },
      recete: [
        { proses: "Kesim", hammaddeUrunId: "deri", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
        { proses: "Montaj", hammaddeUrunId: "taban", hammaddeAd: "Taban", renk: "", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 1, birim: "adet" }],
      variants: [{ renk: "Siyah", beden: "40", miktar: 4 }],
      hareketler: [{ id: "b1", tarih: "2026-09-20", renk: "Siyah", beden: "40", miktar: 4, kaynak: "Üretim", uretimId: "u1", fisNo: "10001-Montaj-Giriş" }] },
  ]);
  t["cari:data"] = JSON.stringify([{ id: "p", unvan: "Usta", tip: "Personel", paraBirimi: "TRY", hareketler: [
    { id: "i1", tarih: "2026-09-10", yon: "Alacak", tutar: 100, paraBirimi: "TRY", fisNo: "10001-Kesim-İşçilik", uretimId: "u1", islemTipi: "İşçilik", defter: "Genel" },
    { id: "i2", tarih: "2026-09-15", yon: "Alacak", tutar: 150, paraBirimi: "TRY", fisNo: "10001-Saya-İşçilik", uretimId: "u1", islemTipi: "İşçilik", defter: "Genel" },
    { id: "i3", tarih: "2026-09-20", yon: "Alacak", tutar: 100, paraBirimi: "TRY", fisNo: "10001-Montaj-İşçilik", uretimId: "u1", islemTipi: "İşçilik", defter: "Genel" },
    { id: "o1", tarih: "2026-09-21", yon: "Borç", tutar: 60, paraBirimi: "TRY", fisNo: "ODM-1", islemTipi: "Ödeme", defter: "Genel" }] }]);
  t["uretim:siparisler"] = JSON.stringify([{ id: "u1", siparisNo: "10001", urunId: "bot", model: "Bot", renk: "Siyah", adet: 10, asama: "Montaj",
    bedenMiktarlari: [{ beden: "40", miktar: 10 }], prosesIlerleme: [] }]);
  t["siparis:data"] = "[]";
  t["stokrez:data"] = "[]";
  t["muhasebe:data"] = JSON.stringify({ kurlar: { USD: 40 }, kasalar: [], bankalar: [], cekler: [] });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Finans Raporu");
  await sayfa.waitForTimeout(800);

  const ozetSatiri = await sayfa.evaluate(() => ((document.querySelector("[data-finans-uretim-ozet]") || {}).textContent || "").replace(/\s+/g, " ").trim());
  const stoklar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-finans-ozet-grup='Stoklar'] td")].map((td) => td.textContent.trim()));
  await sayfa.locator('[data-kayitli-rapor="Stok Değeri"]').click();
  await sayfa.waitForTimeout(500);
  const stokRaporu = await sayfa.evaluate(() => [...document.querySelectorAll("[data-rapor-tablo] tbody tr")]
    .map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).join(" | ")));

  await tarayici.close();
  return { hatalar, ozetSatiri, stoklar, stokRaporu };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
