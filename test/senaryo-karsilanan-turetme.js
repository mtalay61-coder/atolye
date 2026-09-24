// SENARYO — KARŞILANAN HAREKETLERDEN TÜRETİLİYOR (kullanıcı, 20 Eylül: "karşılanan miktarı da
// stok hareketlerinden türetmek; stok miktarında yaptığımızın aynısı").
//
// ÖNCE: `karsilanan` ayrı bir sayaçtı; sevkiyat silinince geri alınmayınca HAYALET kalıyordu —
// 136 çiftlik siparişte 16 çift "karşılanmış" görünüyor ama stok hareketi yok, o 16 çift
// planlanamıyordu.
//
// Ölçülen: (1) hareketi olan siparişte hayalet sayaç GERÇEK sevke çekiliyor; (2) hiç hareketi
// olmayan sipariş DOKUNULMADAN kalıyor (eski kayıtlar sıfırlanmasın).
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };

  // s1: 36 adetlik kalem, sayaçta 16 yazılı ama stokta yalnız 4 adetlik sevk hareketi var.
  // s2: sayaçta 5 yazılı, hiç hareket yok → DOKUNULMAMALI.
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-7001", tip: "Satış", cariId: "c2", cariAd: "Müşteri B",
      tarih: "2026-09-19", durum: "Kısmi Teslim",
      kalemler: [{ id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 36,
        birimFiyat: 900, paraBirimi: "TRY", karsilanan: 16 }] },
    { id: "s2", siparisNo: "SAT-7002", tip: "Satış", cariId: "c2", cariAd: "Müşteri B",
      tarih: "2026-09-19", durum: "Kısmi Teslim",
      kalemler: [{ id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 10,
        birimFiyat: 900, paraBirimi: "TRY", karsilanan: 5 }] },
  ]);
  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  bot.hareketler = [
    { id: "hv1", tarih: "2026-09-19T09:00:00.000Z", renk: "Siyah", beden: "41", miktar: -4,
      kaynak: "Satış", fisNo: "SAT-7001-F1", siparisId: "s1", kalemId: "k1", birimFiyat: 900, paraBirimi: "TRY" },
  ];
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  // Stoğa dokunan herhangi bir yazma türetmeyi tetikliyor; açılış göçü zaten setStok çağırıyor.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);

  const sip = await depoOku(sayfa, "siparis:data");
  const bul = (id) => (sip || []).find((x) => x.id === id) || { kalemler: [] };
  const sonuc = {
    hareketliSiparis: (bul("s1").kalemler[0] || {}).karsilanan,
    hareketsizSiparis: (bul("s2").kalemler[0] || {}).karsilanan,
  };

  await tarayici.close();
  return { hatalar, sonuc };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
