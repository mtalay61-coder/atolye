// SENARYO — CARİDE ÇEK GİRİŞİ (ayrıntılı).
//
// Kullanıcı: "Cari çek girişinde ödeme tipi çek olduğunda banka bilgileri, çek no, çek sahibi mi
// cirolu mu, IBAN bilgileri vs. detaylı giriş yapalım."
//
// Eskiden çek seçilince yalnızca VADE TARİHİ soruluyordu; çekin kimden geldiği, hangi banka,
// hangi numara — hepsi açıklama satırına elle yazılıyordu. Çek bir söz değil BELGE: karşılıksız
// çıktığında ya da ciro edildiğinde bunlar olmadan takip edilemiyor.
//
// Ölçülen: ödeme şekli "Çek" seçilince alanlar çıkıyor, girilen bilgiler kayda `cek` nesnesi
// olarak yazılıyor ve ekstre satırında görünüyor. Nakit seçiliyken alanlar YOK.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Tahsilat"):visible').first().click();
  await sayfa.waitForTimeout(600);

  const nakitken = await sayfa.evaluate(() => /Çek bilgileri|Senet bilgileri/.test(document.body.innerText));

  await sayfa.locator('select:has(option:text-is("Çek")):visible').first().selectOption("Çek");
  await sayfa.waitForTimeout(400);
  const cekSecilince = await sayfa.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, " ");
    return {
      bolumVar: /Çek bilgileri/.test(t),
      alanlar: ["Çek No", "Banka", "Şube", "IBAN / Hesap No", "Çekin sahibi", "Keşideci"].filter((a) => t.includes(a)),
      sahiplikSecenekleri: /Kendi[\s\S]{0,20}Cirolu/.test(t),
    };
  });

  await sayfa.locator('input[placeholder="Belge üzerindeki numara"]').fill("0012345");
  // IBAN YAZILINCA BANKA OTOMATİK DOLMALI — banka alanına elle dokunulmuyor.
  await sayfa.locator('input[placeholder="TR.. — banka otomatik bulunur"]').fill("TR330001000000000000000001");
  await sayfa.waitForTimeout(300);
  const ibandanGelenBanka = await sayfa.locator('input[list="banka-listesi"]').inputValue();
  await sayfa.locator('button:has-text("Cirolu"):visible').first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('input[placeholder="Çeki asıl yazan firma/kişi"]').fill("Kadir Tekstil");
  await sayfa.locator('input[type="number"]:visible').first().fill("2500");
  await sayfa.locator('button:has-text("Kaydet"):visible').first().click();
  await sayfa.waitForTimeout(1200);

  // ÇEKLER LİSTESİNE DE DÜŞTÜ MÜ: aynı çekin iki yerde ayrı ayrı tutulması bu projede
  // tekrar eden hata kalıbıydı; caride girilen çek Muhasebe > Çekler'de görünmeli.
  const muhasebe = await depoOku(sayfa, "muhasebe:data");
  const cekKaydi = ((muhasebe && muhasebe.cekler) || [])[0] || null;

  const cariler = await depoOku(sayfa, "cari:data");
  const musteri = (cariler || []).find((c) => c.id === "c2");
  const hareket = ((musteri && musteri.hareketler) || [])[0] || {};
  const ekstre = await sayfa.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

  // HAREKET SİLİNİNCE ÇEK DE GİTMELİ. Ödemesi silinmiş bir çekin vadesi gelince hatırlatılması,
  // kullanıcıyı olmayan bir alacağın peşine düşürürdü.
  await sayfa.locator('button[title="Sil"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): ikinci adım penceredeki Sil.
  const onay = sayfa.locator("[data-sil-onayla]:visible");
  if (await onay.count()) { await onay.first().click(); await sayfa.waitForTimeout(1500); }
  const silmeSonrasi = await depoOku(sayfa, "muhasebe:data");
  const kalanCek = ((silmeSonrasi && silmeSonrasi.cekler) || []).length;

  await tarayici.close();
  return {
    cekSilindiMi: kalanCek === 0,
    hatalar,
    nakitkenCekAlanlariVar: nakitken,
    ibandanGelenBanka,
    cekSecilince,
    kayit: hareket.cek || null,
    ceklerListesi: cekKaydi && {
      tip: cekKaydi.tip, cekNo: cekKaydi.cekNo, banka: cekKaydi.banka,
      kesideci: cekKaydi.kesideci, sahiplik: cekKaydi.sahiplik, durum: cekKaydi.durum,
      tutar: cekKaydi.tutar, cariBagi: cekKaydi.cariId === "c2", hareketBagiVar: !!cekKaydi.hareketId,
    },
    ekstredeGorunuyor: /No 0012345/.test(ekstre) && /cirolu/.test(ekstre),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
