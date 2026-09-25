// SENARYO — FİŞİ KAYIP ÇEKTE "SON İŞLEMİ GERİ AL" (25 Eylül, v1.462.0).
//
// Kullanıcı (ekran görüntüsüyle): ciro edilmiş çekte "Son İşlemi Geri Al" → "Bu işlemin cari
// hareketi bulunamadı — geri alınamadı"; çek silinemiyor da ("portföyden çıkmış çek silinemez").
// Çekin geçmişindeki ciro fişi carilerde yoktu — çek kilitli kalmıştı.
//
// Ölçülenler:
//   1. Fişi hiç olmayan ciro: çek yeniden Portföyde, cari hesaba dokunulmuyor, mesaj bunu söylüyor.
//   2. Kimliği farklı kalmış kopya fiş (aynı cari, çek no, tutar): o fiş siliniyor, çek Portföyde.
//   3. Birden fazla benzer fiş: hiçbir şey yapılmıyor, fiş numaraları söyleniyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  const a = cariler0.find((c) => c.id === "c1");
  const ciroH = (id, no, fis) => ({ id, tarih: "2026-09-06", yon: "Borç", tutar: 3555, paraBirimi: "TRY", odemeSekli: "Çek", islemTipi: "Ödeme", fisNo: fis, aciklama: `Çek cirosu · No ${no}`, defter: "Genel" });
  a.hareketler = [...(a.hareketler || []), ciroH("kopya-1", "K2", "ODM-0906002"), ciroH("b-1", "K3", "ODM-0906003"), ciroH("b-2", "K3", "ODM-0906004")];
  t["cari:data"] = JSON.stringify(cariler0);
  const ciroEdilmis = (id, no) => ({
    id, durum: "Ciro Edildi", tip: "Alınan", cekNo: no, cariId: "c2", tutar: 3555, paraBirimi: "TRY", vadeTarihi: "2026-09-26",
    gecmis: [{ id: `${id}-g`, islem: "Ciro Et", oncekiDurum: "Portföyde", yeniDurum: "Ciro Edildi", tarih: "2026-09-06",
      cariId: "c1", cariAd: "Tedarikçi A", tutar: 3555, paraBirimi: "TRY", hareketId: `kayip-${id}` }],
  });
  t["muhasebe:data"] = JSON.stringify({ kasalar: [], bankalar: [], kurlar: { USD: 42 }, cekler: [ciroEdilmis("ck1", "K1"), ciroEdilmis("ck2", "K2"), ciroEdilmis("ck3", "K3")] });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(800);

  const geriAl = async (id) => {
    await sayfa.locator(`[data-cek-geri-al="${id}"]`).click();
    await sayfa.waitForTimeout(150);
    await sayfa.locator(`[data-cek-geri-al="${id}"]`).click();
    await sayfa.waitForTimeout(1200);
    // Bildirim metni: sayfadaki satırlar arasında geri almanın sonucunu söyleyen satır.
    const mesaj = await sayfa.evaluate(() => document.body.innerText.split("\n")
      .find((x) => /(yeniden "|tahmin edilmedi)/.test(x)) || null);
    const m = await depoOku(sayfa, "muhasebe:data");
    const c1 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1") || {};
    return {
      durum: ((m.cekler || []).find((c) => c.id === id) || {}).durum,
      mesaj: mesaj && mesaj.replace(/\s+/g, " "),
      tedarikciCiroFisleri: (c1.hareketler || []).filter((h) => /Çek cirosu/.test(h.aciklama || "")).map((h) => h.fisNo),
    };
  };

  const kayip = await geriAl("ck1");
  const kopya = await geriAl("ck2");
  const belirsiz = await geriAl("ck3");

  await tarayici.close();
  return { hatalar, kayip, kopya, belirsiz };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
