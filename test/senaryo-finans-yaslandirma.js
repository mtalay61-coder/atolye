// SENARYO — ALACAK / BORÇ YAŞLANDIRMA (26 Eylül, v1.464.0).
//
// Kullanıcı: "Alacak yaşlandırma yapalım."
//
// Ölçülenler:
//   1. Finans Raporu ▸ Yaşlandırma: dilim toplamları, vadesi geçen yüzdesi, cari satırı dilimleri.
//   2. Cariye dokununca açık kalemler (FIFO: tahsilat en eski fişi kapattı, kısmen kapanan yazılı).
//   3. Varsayılan vade 30 gün: dilimler kayıyor.
//   4. Borçlar: tedarikçi borcu yaşlandırılıyor.
//   5. Genel · Resmi yan yana: iki tablo.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const gunOnce = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  const hareket = (id, gun, yon, tutar, fisNo, defter = "Genel") => ({ id, tarih: gunOnce(gun), yon, tutar, paraBirimi: "TRY", fisNo, defter, aciklama: fisNo });
  cariler0.find((c) => c.id === "c2").hareketler = [
    hareket("s1", 200, "Borç", 1000, "SAT-1"),
    hareket("s2", 75, "Borç", 800, "SAT-2"),
    hareket("s3", 10, "Borç", 500, "SAT-3", "Resmi"),
    hareket("t1", 20, "Alacak", 1300, "THS-1"),
  ];
  cariler0.find((c) => c.id === "c1").hareketler = [hareket("a1", 40, "Alacak", 600, "ALS-1"), hareket("o1", 5, "Borç", 100, "ODM-1")];
  cariler0.find((c) => c.id === "c3").hareketler = [];
  t["cari:data"] = JSON.stringify(cariler0);
  t["muhasebe:data"] = JSON.stringify({ kurlar: { USD: 40 }, kasalar: [], bankalar: [], cekler: [] });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Finans Raporu");
  await sayfa.waitForTimeout(700);
  await sayfa.locator('[data-finans-secim="yas"]').click();
  await sayfa.waitForTimeout(500);

  const oku = () => sayfa.evaluate(() => [...document.querySelectorAll("[data-finans-yas]")].map((k) => ({
    tablo: k.getAttribute("data-finans-yas"),
    toplam: (k.querySelector("[data-finans-yas-toplam]") || {}).textContent || null,
    dilimler: [...k.querySelectorAll("[data-finans-yas-dilim]")].map((d) => d.textContent.replace(/\s+/g, " ").trim()).filter((x) => !/: 0,00 ₺/.test(x)),
    satirlar: [...k.querySelectorAll("[data-finans-yas-satir]")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).filter(Boolean).join(" | ")),
  })));

  const alacak = await oku();
  await sayfa.locator('[data-finans-yas-satir="Müşteri B"]').click();
  await sayfa.waitForTimeout(300);
  const kalemler = await sayfa.evaluate(() => [...document.querySelectorAll('[data-finans-yas-kalemler="Müşteri B"] .mono')].map((d) => [...d.children].map((e) => e.textContent.trim()).join(" | ")
    .replace(/\d{2}\.\d{2}\.\d{4}/g, "T")));   // tarihler bugüne göreli — altında gün sayısı yeter

  await sayfa.locator("[data-finans-vade]").fill("30");
  await sayfa.waitForTimeout(400);
  const vade30 = (await oku())[0].dilimler;
  await sayfa.locator("[data-finans-vade]").fill("0");

  await sayfa.locator('[data-finans-secim="borc"]').click();
  await sayfa.waitForTimeout(400);
  const borc = await oku();

  await sayfa.locator('[data-finans-secim="alacak"]').click();
  await sayfa.locator('[data-finans-secim="YanYana"]').click();
  await sayfa.waitForTimeout(500);
  const yanYana = (await oku()).map((x) => [x.tablo, x.toplam]);

  await tarayici.close();
  return { hatalar, alacak, kalemler, vade30, borc, yanYana };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
