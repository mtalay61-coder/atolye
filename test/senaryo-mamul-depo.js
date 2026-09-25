// SENARYO — MAMUL DEPOSU.
//
// Kullanıcı: "Depoyu mamul ve hammadde olarak ayıralım, hatta depo mantığını burada kurgulayalım."
//
// Depo iki ayrı soru soruyor ve ikisi karışmamalı:
//   Hammadde deposu → "üretebilmek için ne almalıyım?"
//   Mamul deposu    → "sevk edebilmek için ne üretmeliyim?"
//
// Bu senaryo mamul tarafının hesabını kilitliyor. En kritik iddia: HAZIR KOLİDEKİ mal serbest
// sayılmamalı — fiziken depoda ama sözü verilmiş. Serbest saymak aynı çifti iki müşteriye
// satmaya yol açardı (koli sınır denetiminde aynı hata yaşanmıştı, bkz. 3z).
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: [{ renk: "Bej", beden: "40", miktar: 10 }, { renk: "Bej", beden: "41", miktar: 4 }],
    hareketler: [], recete: [], birimFiyat: 465,
  });
  t["stok:items"] = JSON.stringify(stok);
  // Talep: 40'tan 6, 41'den 9 çift bekliyor.
  t["siparis:data"] = JSON.stringify([{
    id: "sp1", siparisNo: "SAT-D1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: [
      { id: "d1", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "40", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
      { id: "d2", urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "41", miktar: 9, karsilanan: 0, birim: "çift", birimFiyat: 465, paraBirimi: "TRY" },
    ],
  }]);
  // 40'tan 3 çift HAZIR bir koliye konmuş: serbest 10 değil 7 olmalı.
  t["koli:data"] = JSON.stringify([{
    id: "k1", kod: "K-20260901-001", durum: "Hazır", siparisId: "sp1", cariId: "c2",
    kalemler: [{ urunId: "m1", urunAd: "125 Model", renk: "Bej", beden: "40", adet: 3 }],
  }]);
  // 41'den 2 çift üretimde (stoğa girmemiş): açık = 9 - 4 - 2 = 3
  t["uretim:siparisler"] = JSON.stringify([{
    id: "u1", siparisNo: "10001", takipKodu: "10001", model: "125 Model", urunId: "m1", renk: "Bej",
    adet: 2, bedenMiktarlari: [{ beden: "41", miktar: 2 }], stogaEklendiMi: false,
    durum: "Devam", prosesIlerleme: [{ proses: "Kesim", tamamlandiMi: false, atamalar: [] }],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await sayfa.getByRole("button", { name: "Depo", exact: true }).click();
  await sayfa.waitForTimeout(700);
  const sekmeler = await sayfa.evaluate(() => {
    const t2 = document.body.innerText;
    return { hammadde: /Hammadde Deposu/.test(t2), mamul: /Mamul Deposu/.test(t2) };
  });

  await sayfa.locator('button:has-text("Mamul Deposu"):visible').click();
  await sayfa.waitForTimeout(700);

  // YALNIZCA "125 Model" kartının tablosu okunuyor: ekranda başka mamuller de var ve hepsini tek
  // sözlüğe toplamak son tablonun değerlerini yazdırıyordu.
  const tablo = await sayfa.evaluate(() => {
    // Ürün adı bir düğme; oradan YUKARI çıkıp tabloyu içeren EN YAKIN kutuyu buluyoruz.
    // Doğrudan "içinde 125 Model geçen ve tablosu olan div" aramak, bütün kartları kapsayan
    // dış kutuyu buluyordu ve başka ürünün tablosu okunuyordu.
    const dugme = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "125 Model");
    if (!dugme) return null;
    let kart = dugme.parentElement;
    while (kart && !kart.querySelector("table")) kart = kart.parentElement;
    if (!kart) return null;
    const satirlar = {};
    kart.querySelectorAll("tbody tr").forEach((tr) => {
      const hucreler = [...tr.querySelectorAll("td")].map((td) => td.textContent.trim());
      if (hucreler.length) satirlar[hucreler[0]] = hucreler.slice(1);
    });
    return satirlar;
  });

  await tarayici.close();
  return {
    hatalar,
    sekmeler,
    // Sütunlar: 40 · 41 · Toplam
    stokSatiri: tablo["Stok"],
    kolideSatiri: tablo["Kolide"],
    // 40: 10 − 3 = 7 · 41: 4 − 0 = 4
    serbestSatiri: tablo["Serbest"],
    uretimdeSatiri: tablo["Üretimde"],
    talepSatiri: tablo["Talep"],
    // 40: talep 6 − serbest 7 → 0 · 41: 9 − 4 − 2 = 3
    acikSatiri: tablo["Açık"],
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
