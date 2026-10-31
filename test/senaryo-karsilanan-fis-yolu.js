// SENARYO — R1b: FİŞ SİSTEMİ AÇIKKEN KARŞILANAN TÜRETME EFEKTİ YAZMAZ (v1.742.3).
// Tohum: SAT-K siparişinin kalemi (miktar 10) karşılanan 0, ama o kaleme bağlı 4 çiftlik satış hareketi var. Uygulamanın türetme
// efekti (100-app.jsx `siparisKarsilananlariHesapla`) karşılananı 4 yapıp saveSiparisler ile YAZAR — fiş sistemi açıkken karşılananın
// tek yazarı sunucu olmalı (kontrol raporu R1b: eski veriyle çalışan cihaz sunucunun değerini eziyordu).
// Üç durum: (a) fiş defteri kurulu sahte sunucu — yazmaz; (b) v2 / fiş defteri kurulmamış sunucu — bugünkü gibi yazar;
// (c) sunucu ayarı OKUNAMADI — yazmaz (ayar bilinmeden yazılan değer sonra eski yoldan gönderilirdi).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohum() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  const bot = stok.find((u) => u.id === "u2");
  bot.hareketler = [...(bot.hareketler || []), { id: "hk-karsi", tarih: "2026-10-31T09:00:00.000Z", renk: "Siyah", beden: "40", miktar: -4,
    kaynak: "Satış", cariId: "c2", fisNo: "SF-K", siparisId: "skt", siparisNo: "SAT-K", kalemId: "kk1" }];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{ id: "skt", siparisNo: "SAT-K", tip: "Satış", cariId: "c2", durum: "Bekliyor", tarih: "2026-10-31",
    kalemler: [{ id: "kk1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 10, karsilanan: 0, birim: "çift", birimFiyat: 100, paraBirimi: "TRY" }] }]);
  return t;
}

async function durum(ad, secenek) {
  const istekler = [];
  const onceRota = async (sayfa) => {
    sayfa.on("request", (r) => {
      const u = r.url();
      if (/rest\/v1\/(rpc\/(alt_yaz|fis_yaz)|siparis_kalemleri)/.test(u) && /karsilanan/.test(r.postData() || "")) istekler.push(u.replace(/^.*rest\/v1\//, "").split("?")[0]);
    });
  };
  const { tarayici, sayfa } = await uygulamaAc(tohum(), { hataYaz: false, onceRota, ...secenek });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3000);
  const s = await depoOku(sayfa, "siparis:data");
  const k = ((s || []).find((x) => x.id === "skt") || { kalemler: [] }).kalemler[0] || {};
  await tarayici.close();
  return { [ad]: { hatalar, karsilanan: k.karsilanan, karsilananYazanIstek: [...new Set(istekler)] } };
}

async function calistir() {
  const fisAyar = { id: "tekil", aktif: true, cari_aktif: true, alt_aktif: true, kasa_aktif: true, liste_aktif: true, liste_tablolari: ["fis_defteri"], fis_aktif: false };
  return {
    ...(await durum("a_fisSistemiAcik", { stkAyar: fisAyar })),
    ...(await durum("b_fisSistemiYok", {})),
    ...(await durum("c_ayarOkunamadi", { stkAyarHata: true })),
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}
module.exports = { calistir };
