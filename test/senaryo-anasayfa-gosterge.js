// SENARYO — ANASAYFA GÖSTERGE PANOSU (v1.645.13).
//
// Kullanıcı (anasayfa görüntüsüyle): "Modülleri kaldırabiliriz, oraya dashboard yaparız."
// Ölçülen: Modüller kartları yok; pano kartları (kasa & banka, bu ay tahsilat/ödeme, borç, çek) doğru sayılarla; yaklaşan
// teslimler ve üretim panelleri var; kasa kartı Ödeme & Tahsilat › Kasa & Banka'yı açar. Tarihler bugünden üretilir,
// çıktıda tarih yazılmaz (altın güne bağlı olmasın).
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

(async () => {
  const bugun = new Date().toISOString().slice(0, 10);
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [{ id: "x1", yon: "Giriş", tutar: 12500, tarih: bugun }, { id: "x2", yon: "Çıkış", tutar: 2500, tarih: bugun }] }],
    bankalar: [{ id: "b1", ad: "Ziraat", paraBirimi: "USD", hareketler: [{ id: "x3", yon: "Giriş", tutar: 300, tarih: bugun }] }],
    cekler: [{ id: "c1", cekNo: "77", tutar: 5000, paraBirimi: "TRY", durum: "Portföyde", vadeTarihi: "2099-01-01" }],
  });
  const cariler = JSON.parse(t["cari:data"]);
  cariler[0].hareketler = [...(cariler[0].hareketler || []), { id: "p1", tarih: bugun, yon: "Alacak", tutar: 750, paraBirimi: "TRY", fisNo: "THS-1", islemTipi: "Tahsilat", odemeSekli: "Nakit" }];
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(1500);
  const sonuc = await sayfa.evaluate(() => {
    const gor = (el) => el && el.getBoundingClientRect().width > 0;
    const pano = [...document.querySelectorAll("[data-anasayfa-gosterge]")].find(gor);
    const kart = (k) => { const e = pano && pano.querySelector(`[data-gosterge="${k}"]`); return e ? e.innerText.replace(/\s+/g, " ").replace(/\d{2}\.\d{2}\.\d{4}/g, "<tarih>").trim() : null; };
    return {
      modullerYok: !/MODÜLLER|Modüller/.test(document.body.innerText.replace("Modüller üst menüden", "")),
      pano: !!pano,
      nakit: kart("nakit"), buay: kart("buay"), borc: kart("borc"), cek: kart("cek"),
      teslimPaneli: !!(pano && pano.querySelector('[data-gosterge="teslimler"]')),
      uretimPaneli: !!(pano && pano.querySelector('[data-gosterge="uretim"]')),
    };
  });
  await sayfa.locator('[data-gosterge="nakit"]:visible').click();
  await sayfa.waitForTimeout(700);
  sonuc.nakitTiklaninca = await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll('[data-odeme-alani-sekme="muhasebe"]')].find((x) => x.getBoundingClientRect().width > 0);
    return s ? getComputedStyle(s).color === "rgb(255, 255, 255)" : false;
  });
  sonuc.hatalar = hatalar;
  console.log(JSON.stringify(sonuc, null, 1));
  await tarayici.close();
})();
