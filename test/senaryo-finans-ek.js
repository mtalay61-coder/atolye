// SENARYO — FİNANS RAPORU: DÖNEM KARŞILAŞTIRMA, NAKİT AKIŞI, MALİYET FARKI (26 Eylül, v1.475.0).
//
// Kullanıcı (önerilerden seçti): "2 de olsun" — dönem karşılaştırması, nakit akış projeksiyonu,
// kart maliyeti ile gerçekleşen maliyet farkı. Sayılar birim testindekiyle aynı veri
// (birim-finans-ek.js); burada ekranın onları doğru gösterdiği ölçülüyor.
//
// "Tarih itibarıyla" 26.09.2026'ya sabitleniyor: nakit dönemleri bugünden sayıldığı için altın
// her gün değişmesin.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  t["cari:data"] = JSON.stringify([
    { id: "m", unvan: "Müşteri", tip: "Müşteri", paraBirimi: "TRY", hareketler: [
      { id: "a1", tarih: "2026-09-01", yon: "Borç", tutar: 3000, paraBirimi: "TRY", defter: "Genel", fisNo: "SAT-1" },
      { id: "a2", tarih: "2026-09-20", yon: "Borç", tutar: 100, paraBirimi: "USD", defter: "Genel", fisNo: "SAT-2", vade: "2026-12-20" }] },
    { id: "t", unvan: "Tedarikçi", tip: "Tedarikçi", paraBirimi: "TRY", hareketler: [
      { id: "b1", tarih: "2026-08-01", yon: "Alacak", tutar: 1500, paraBirimi: "TRY", defter: "Genel", fisNo: "ALS-1" }] },
    { id: "p", unvan: "Usta", tip: "Personel", paraBirimi: "TRY", hareketler: [
      { id: "i1", tarih: "2026-09-10", yon: "Alacak", tutar: 350, paraBirimi: "TRY", fisNo: "10001-Kesim-İşçilik", uretimId: "u1", defter: "Genel" },
      { id: "i2", tarih: "2026-09-10", yon: "Alacak", tutar: 200, paraBirimi: "TRY", fisNo: "10002-Kesim-İşçilik", uretimId: "u2", defter: "Genel" }] },
  ]);
  t["muhasebe:data"] = JSON.stringify({ kurlar: { USD: 40 }, bankalar: [],
    kasalar: [{ id: "k", ad: "Kasa", paraBirimi: "TRY", hareketler: [
      { tarih: "2026-08-15", yon: "Giriş", tutar: 1500, defter: "Genel" },
      { tarih: "2026-09-05", yon: "Çıkış", tutar: 500, defter: "Genel" }] }],
    cekler: [
      { id: "c1", tip: "Alınan", durum: "Portföyde", cekNo: "A1", cariId: "m", tutar: 5000, paraBirimi: "TRY", vadeTarihi: "2026-10-05" },
      { id: "c2", tip: "Verilen", durum: "Portföyde", cekNo: "S1", cariId: "t", tutar: 2000, paraBirimi: "TRY", vadeTarihi: "2026-10-01" }] });
  t["stok:items"] = JSON.stringify([
    { id: "deri", ad: "Deri", kategori: "Hammadde", birim: "metre", alisFiyati: 50, variants: [{ renk: "Siyah", beden: "", miktar: 68 }], hareketler: [
      { id: "d0", tarih: "2026-09-01", renk: "Siyah", beden: "", miktar: 100 },
      { id: "d1", tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -20, uretimId: "u1" },
      { id: "d2", tarih: "2026-09-10", renk: "Siyah", beden: "", miktar: -12, uretimId: "u2" }] },
    { id: "taban", ad: "Taban", kategori: "Hammadde", birim: "adet", alisFiyati: 20, variants: [{ renk: "", beden: "", miktar: 42 }], hareketler: [
      { id: "t0", tarih: "2026-09-01", renk: "", beden: "", miktar: 50 },
      { id: "t1", tarih: "2026-09-20", renk: "", beden: "", miktar: -4, uretimId: "u1" },
      { id: "t2", tarih: "2026-09-20", renk: "", beden: "", miktar: -4, uretimId: "u2" }] },
    { id: "tutkal", ad: "Tutkal", kategori: "Hammadde", birim: "adet", alisFiyati: 30, variants: [{ renk: "", beden: "", miktar: 9 }], hareketler: [
      { id: "k0", tarih: "2026-09-01", renk: "", beden: "", miktar: 10 },
      { id: "k1", tarih: "2026-09-20", renk: "", beden: "", miktar: -1, uretimId: "u2" }] },
    { id: "bot", ad: "Bot", kategori: "Mamul", birim: "çift", olcuTipi: "Beden", prosesUcretleri: { Kesim: 10, Saya: 15, Montaj: 25 },
      recete: [
        { proses: "Kesim", hammaddeUrunId: "deri", hammaddeAd: "Deri", renk: "Siyah", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 2, birim: "metre" },
        { proses: "Montaj", hammaddeUrunId: "taban", hammaddeAd: "Taban", renk: "", beden: "", mamulRenk: "Siyah", mamulBeden: "Tüm Bedenler", miktar: 1, birim: "adet" }],
      variants: [{ renk: "Siyah", beden: "40", miktar: 8 }], hareketler: [
        { id: "g1", tarih: "2026-09-20", renk: "Siyah", beden: "40", miktar: 4, uretimId: "u1" },
        { id: "g2", tarih: "2026-09-22", renk: "Siyah", beden: "40", miktar: 4, uretimId: "u2" }] },
  ]);
  t["uretim:siparisler"] = JSON.stringify([
    { id: "u1", siparisNo: "10001", urunId: "bot", model: "Bot", renk: "Siyah", adet: 10, asama: "Montaj", bedenMiktarlari: [{ beden: "40", miktar: 10 }], prosesIlerleme: [] },
    { id: "u2", siparisNo: "10002", urunId: "bot", model: "Bot", renk: "Siyah", adet: 5, asama: "Tamamlandı", bedenMiktarlari: [{ beden: "40", miktar: 5 }], prosesIlerleme: [] }]);
  t["siparis:data"] = "[]";
  t["stokrez:data"] = "[]";

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Finans Raporu");
  await sayfa.waitForTimeout(800);
  await sayfa.locator("[data-finans-tarih]").fill("2026-09-26");
  await sayfa.locator("[data-finans-vade]").fill("30");
  await sayfa.waitForTimeout(300);
  const satirlar = (secici) => sayfa.evaluate((s) => [...document.querySelectorAll(s)]
    .map((tr) => [...tr.querySelectorAll(":scope > td")].map((td) => td.textContent.replace(/\s+/g, " ").trim()).join(" | ")), secici);

  // 1. Dönem karşılaştırma (varsayılan: geçen ay sonu 31.08 ↔ 26.09).
  await sayfa.locator('[data-finans-secim="donem"]').click();
  await sayfa.waitForTimeout(400);
  const donem = {
    baslik: await sayfa.evaluate(() => [...document.querySelectorAll("[data-finans-donem] thead th")].map((th) => th.textContent.trim())),
    gruplar: await satirlar("[data-finans-donem-grup]"),
    toplamlar: await satirlar("[data-finans-donem-toplam]"),
  };

  // 2. Nakit akışı (haftalık), 1. haftanın kalemleri; aylık.
  await sayfa.locator('[data-finans-secim="nakit"]').click();
  await sayfa.waitForTimeout(400);
  const nakit = {
    baslangic: await sayfa.evaluate(() => document.querySelector("[data-finans-nakit-baslangic]").textContent.trim()),
    enDusuk: await sayfa.evaluate(() => document.querySelector("[data-finans-nakit-en-dusuk]").textContent.trim()),
    haftalik: await satirlar("[data-finans-nakit-donem]"),
  };
  await sayfa.locator('[data-finans-nakit-donem="h1"]').click();
  await sayfa.waitForTimeout(200);
  nakit.h1Kalemler = await sayfa.evaluate(() => [...document.querySelectorAll('[data-finans-nakit-kalemler="h1"] .mono')].map((d) => d.textContent.replace(/\s+/g, " ").trim()));
  await sayfa.locator('[data-finans-nakit-aralik="ay"]').click();
  await sayfa.waitForTimeout(300);
  nakit.aylik = await satirlar("[data-finans-nakit-donem]");

  // 3. Maliyet farkı: önce tamamlananlar, sonra devam edenler dahil; 10002'nin kalemleri.
  await sayfa.locator('[data-finans-secim="maliyet"]').click();
  await sayfa.waitForTimeout(400);
  const maliyet = { tamamlanan: await satirlar("[data-finans-maliyet-satir]") };
  await sayfa.locator('[data-finans-maliyet-kapsam="tumu"]').click();
  await sayfa.waitForTimeout(300);
  maliyet.tumu = await satirlar("[data-finans-maliyet-satir]");
  maliyet.ozet = await sayfa.evaluate(() => document.querySelector("[data-finans-maliyet-ozet]").textContent.replace(/\s+/g, " ").trim());
  await sayfa.locator('[data-finans-maliyet-satir="10002"]').click();
  await sayfa.waitForTimeout(200);
  maliyet.kalemler10002 = await satirlar('[data-finans-maliyet-kalemler="10002"] [data-finans-maliyet-kalem]');

  await tarayici.close();
  return { hatalar, donem, nakit, maliyet };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
