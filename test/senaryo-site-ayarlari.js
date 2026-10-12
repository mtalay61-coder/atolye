// SENARYO — WEB SİTESİ AYARLARI UYGULAMADAN (v1.647.0).
//
// Kullanıcı: "İletişim bilgilerini … uygulama içerisinden yapalım, site tasarımı v.s tüm hepsini."
// Ölçülen: Tanımlar › Firma › Web Sitesi varsayılan yazılarla dolu açılır; yazmak buluta/depoya GİTMEZ (taslak),
// "Siteye kaydet" `tanimlar.siteAyarlari`na tek yazım yapar (WhatsApp ülke koduyla, boş kart atılır); Vazgeç taslağı
// geri alır.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(700);
  const panel = sayfa.locator("[data-web-sitesi-ayarlari]");
  const acilis = {
    var: await panel.count(),
    baslik: await panel.locator('[data-site-ayar="baslik"]').inputValue(),
    kartSayisi: await panel.locator("[data-site-kart-satiri]").count(),
  };
  await panel.locator('[data-site-ayar="telefon"]').fill("0212 555 11 22");
  await panel.locator('[data-site-ayar="whatsapp"]').fill("0532 111 22 33");
  await panel.locator('[data-site-ayar="baslik"]').fill("Yeni başlık");
  await sayfa.waitForTimeout(300);
  const taslakta = ((await depoOku(sayfa, "tanimlar:data")) || {}).siteAyarlari || null;
  // Boş kart eklenir (kaydette atılmalı), ilk kart silinir.
  await panel.locator('button:has-text("+ Kart ekle")').click();
  await panel.locator('[data-site-kart-satiri="0"] button[title="Kartı sil"]').click();
  await panel.locator("[data-site-ayar-kaydet]").click();
  await sayfa.waitForTimeout(500);
  const kayit = ((await depoOku(sayfa, "tanimlar:data")) || {}).siteAyarlari || {};
  const kaydedilen = {
    telefon: kayit.telefon, whatsapp: kayit.whatsapp, baslik: kayit.baslik,
    kartlar: (kayit.uretimKartlari || []).map((k) => k.baslik),
    seritKalkti: (await panel.locator("[data-site-ayar-kaydet]").count()) === 0,
  };
  await panel.locator('[data-site-ayar="eposta"]').fill("yanlis@x");
  await panel.locator('button:has-text("Vazgeç")').click();
  await sayfa.waitForTimeout(300);
  const vazgec = { eposta: await panel.locator('[data-site-ayar="eposta"]').inputValue(), depoda: (((await depoOku(sayfa, "tanimlar:data")) || {}).siteAyarlari || {}).eposta };
  // ÇOKLU DİL (v1.650.0): EN sekmesi — değişmeyen Türkçe alanda hazır çeviri, değişen başlıkta boş (Türkçesi görünür);
  // yazılan çeviri + hazır çeviriler kayda girer, Türkçesi sonradan değişince uyarı.
  await panel.locator('[data-site-dil="en"]').click();
  await sayfa.waitForTimeout(200);
  const enAcilis = {
    ustEtiketHazir: await panel.locator('[data-site-ayar="en-ustEtiket"]').inputValue(),
    baslikBos: await panel.locator('[data-site-ayar="en-baslik"]').inputValue(),
    iletisimGizli: (await panel.locator('[data-site-ayar="telefon"]').count()) === 0,
  };
  await panel.locator('[data-site-ayar="en-baslik"]').fill("New headline");
  await panel.locator("[data-site-ayar-kaydet]").click();
  await sayfa.waitForTimeout(500);
  const en = ((((await depoOku(sayfa, "tanimlar:data")) || {}).siteAyarlari || {}).diller || {}).en || {};
  await panel.locator('[data-site-dil="tr"]').click();
  await panel.locator('[data-site-ayar="baslik"]').fill("Başka başlık");
  await panel.locator('[data-site-dil="en"]').click();
  await sayfa.waitForTimeout(200);
  const dil = { enAcilis, kaydedilen: { baslik: en.baslik, ustEtiket: en.ustEtiket, kartSayisi: (en.uretimKartlari || []).length, ilkKart: (en.uretimKartlari || [])[0] && en.uretimKartlari[0].baslik },
    turkceDegisinceUyari: /Türkçesi değişti/.test(await panel.textContent()) };
  await tarayici.close();
  return { hatalar, acilis, yazarkenDepoyaGitmedi: taslakta === null, kaydedilen, vazgec, dil };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
