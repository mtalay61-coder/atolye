// SENARYO — AÇILIŞTA FİŞ DEFTERİ YENİDEN KURULMAZ (30 Ekim, v1.731.3).
// Kullanıcı: veri sıfırlamadan sonra denetim "Fiş defterinde var, stokta yok" diye ESKİ fişler gösterdi; "fişsiz kayıt olamaz
// kuralımız var, veriyi nereden çekiyor onu bulursan sorunu çözeriz". Bulutta o fişler sıfırlamadan 38 sn sonra yazılmıştı; hepsinin
// `zaman`ı aynı milisaniye, `kullanici`sı boş — açılışta "otomatik" kayıt olarak yeniden kurulmuşlardı.
// Kök neden: açılışta stok fiş defterinden ÖNCE yükleniyor; hareket toplayıcı (100 setStok) boş başlangıç hâlini "önceki" sayıp
// bütün hareketleri topluyor, defter effect'i de henüz boş defterle karşılaştırıp her fişi yeniden kuruyordu.
// Ölçülen (bulut açılışı, sahte sunucu): fişi defterde olan hareket için defter YAZILMAZ ve kayıt bozulmaz (zaman, kullanıcı,
// kalemler aynı kalır); fişi defterde OLMAYAN hareket yine deftere düşer (kural değişmedi, yalnız gerçek defterle süzülür).
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const asilFis = { id: "AF-1", fisNo: "AF-1", tip: "Giriş", kaynak: "Satınalma", zaman: "2026-10-28T09:00:00.000Z", kullanici: "Ali",
    defter: "Genel", cariId: "c1", kalemler: [{ urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 8, birimFiyat: 500, hareketId: "h-af" }],
    stokHareketleri: [{ id: "h-af", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 8, fisNo: "AF-1" }],
    cariHareketleri: [], iptal: false, iptalZamani: null };
  const bulut = {
    urunler: [{ id: "u2", ad: "Bot", kategori: "Mamul", birim: "çift" }],
    varyantlar: [{ id: "v1", urun_id: "u2", renk: "Siyah", beden: "41", miktar: 9 }],
    stok_hareketleri: [
      { id: "h-af", urun_id: "u2", tarih: "2026-10-28", tip: "Giriş", kaynak: "Satınalma", renk: "Siyah", beden: "41", miktar: 8, fis_no: "AF-1" },
      // Defterde fişi OLMAYAN hareket (kural: deftere "otomatik" düşer).
      { id: "h-sayim", urun_id: "u2", tarih: "2026-10-29", tip: "Giriş", kaynak: "Sayım", renk: "Siyah", beden: "41", miktar: 1, fis_no: "SY-1" },
    ],
    fis_defteri: [{ id: "tekil", veri: [asilFis] }],
  };
  const yazilanDefter = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/**", (r) => {
      const url = r.request().url();
      const tablo = (url.match(/rest\/v1\/([a-z_]+)/) || [])[1] || "";
      const yontem = r.request().method();
      if (yontem === "GET") {
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bulut[tablo] || []) });
      }
      if (tablo === "fis_defteri") {
        try { yazilanDefter.push(JSON.parse(r.request().postData() || "[]")); } catch (e) { /* */ }
      }
      return r.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    });
  };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(3500);
  const ekran = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("fisdefter:data") || "null")
    || (window.__depo && window.__depo["fisdefter:data"] ? JSON.parse(window.__depo["fisdefter:data"]) : null));
  const ozet = (liste) => (liste || []).map((f) => `${f.fisNo}|${f.kullanici || "-"}|${f.otomatik ? "otomatik" : "asil"}|kalem ${(f.kalemler || []).length}|${f.zaman === asilFis.zaman ? "zaman aynı" : "zaman DEĞİŞTİ"}`);
  // Buluta giden her defter yazmasında AF-1 bozulmuş mu?
  const gidenAf = yazilanDefter.flat().map((s) => (s && s.veri) || s).flat()
    .filter((f) => f && f.fisNo === "AF-1").map((f) => `${f.kullanici || "-"}|${f.otomatik ? "otomatik" : "asil"}|${f.zaman === asilFis.zaman ? "zaman aynı" : "zaman DEĞİŞTİ"}`);
  await tarayici.close();
  return { hatalar, yerelDefter: ozet(ekran), gidenAf };
}

if (require.main === module) {
  calistir().then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
