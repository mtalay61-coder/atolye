// SENARYO — ANA SAYFADAKİ "SON İŞLEMLER" AKIŞI.
//
// Kullanıcı: "Tanımlara yaptığımız hareketleri detaylı şekilde ana sayfada olsun — kullanıcı ödeme
// girdi, kullanıcı bu kadar fatura kesti vs."
//
// Akış AYRI BİR GÜNLÜK TABLOSUNDAN değil, mevcut veriden türetiliyor (cari hareketleri, stok
// hareketleri, siparişler). Ayrı günlük tutmak her yeni işlem yolunda "oraya da yaz"ı hatırlamayı
// gerektirirdi; bu projede tam olarak o tür ikili yazımlardan hata çıktı.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { alisSiparisindenTeslimEt } = require("./alis-teslim-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  // ÇOK KALEMLİ FİŞ — akışta TEK satır görünmeli (kullanıcı, 9 Eylül: "fişleri satır olarak gir,
  // tek fiş görünsün").
  //
  // Cari hareketleri KALEM kalem tutuluyor: beş kalemli bir satış fişi akışta beş satır üretiyor
  // ve hepsi aynı fiş numarasını taşıdığı için liste kendini tekrar ediyor gibi görünüyordu.
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(t["cari:data"]);
  cariler0[1].hareketler = [
    { id: "hf1", tarih: "2026-09-09", zaman: "2026-09-09T09:08:00.000Z", yon: "Borç", tutar: 5928, paraBirimi: "TRY", fisNo: "SF-TEST-1", urunAd: "Bot", renk: "Lacivert", kullanici: "Test Kullanıcısı" },
    { id: "hf2", tarih: "2026-09-09", zaman: "2026-09-09T09:08:00.000Z", yon: "Borç", tutar: 11856, paraBirimi: "TRY", fisNo: "SF-TEST-1", urunAd: "Bot", renk: "Lacivert", kullanici: "Test Kullanıcısı" },
    { id: "hf3", tarih: "2026-09-09", zaman: "2026-09-09T09:08:00.000Z", yon: "Borç", tutar: 11856, paraBirimi: "TRY", fisNo: "SF-TEST-1", urunAd: "Bot", renk: "Lacivert", kullanici: "Test Kullanıcısı" },
  ];
  t["cari:data"] = JSON.stringify(cariler0);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // Bir alış fişi kes ki akışta "kim ne yaptı" görünsün.
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.getByText("AS-1", { exact: true }).last().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await alisSiparisindenTeslimEt(sayfa);

  await sayfa.getByRole("button", { name: "Anasayfa", exact: true }).click();
  await sayfa.waitForTimeout(900);

  // KAPALI AÇILMALI: ana sayfa bir özet ekranı, akış onu aşağı itmemeli.
  const kapaliyken = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    return {
      basliktaSayi: /Son İşlemler \d+ kayıt/.test(metin),
      // Kapalıyken son işlem başlıkta özetleniyor ama liste ve kişi özeti görünmüyor.
      sonIslemOzeti: /Son İşlemler[\s\S]{0,80}Alış/.test(metin),
      listeGizli: !/Test Kullanıcısı — /.test(metin),
    };
  });

  await sayfa.locator('button:has-text("Son İşlemler")').first().click();
  await sayfa.waitForTimeout(700);
  // FİŞ TEK SATIR: numara bir kez geçiyor, tutar toplanmış, kalem sayısı yazılı.
  const cokKalemliFis = await sayfa.evaluate(() => {
    const m = document.body.innerText;
    return {
      tekrarSayisi: (m.match(/SF-TEST-1/g) || []).length,
      satir: (m.match(/SF-TEST-1[^\n]{0,50}/) || ["(yok)"])[0],
      toplamDogru: /29\.640/.test(m),
    };
  });

  await sayfa.waitForTimeout(500);

  // TÜR SEKMELERİ — Alış, Satış, Tahsilat, Üretim…
  // Akış karışık geliyordu; sekmeler olay türlerinden türetiliyor, sabit liste yok.
  const sekmeler = await sayfa.evaluate(() => {
    const dugmeler = [...document.querySelectorAll("button")]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => (b.textContent || "").trim())
      .filter((t) => /^(Tümü|Alış|Satış|Ödeme|Tahsilat|Üretim|Alış siparişi|Satış siparişi) \(\d+\)$/.test(t));
    return dugmeler;
  });

  // Bir türe basınca YALNIZCA o tür kalmalı.
  const alisSekmesi = sayfa.locator('button:has-text("Alış ("):visible').first();
  const alisFiltresi = await (async () => {
    if (!(await alisSekmesi.count())) return null;
    await alisSekmesi.click();
    await sayfa.waitForTimeout(400);
    return sayfa.evaluate(() => {
      // Satır türü rozetleri: filtreden sonra hepsi aynı tür olmalı.
      const rozetler = [...document.querySelectorAll("span")]
        .filter((e) => e.getBoundingClientRect().width > 0 && /^(Alış|Satış|Ödeme|Tahsilat|Üretim)$/.test((e.textContent || "").trim()))
        .map((e) => e.textContent.trim());
      return Array.from(new Set(rozetler));
    });
  })();

  const panel = await sayfa.evaluate(() => {
    const metin = document.body.innerText.replace(/\s+/g, " ");
    const i = metin.indexOf("Son İşlemler");
    return {
      panelVar: i >= 0,
      // Kesilen alış fişi akışta görünmeli, kullanıcı adıyla birlikte.
      alisGorunuyor: /Son İşlemler[\s\S]{0,600}Alış/.test(metin),
      kullaniciGorunuyor: /Test Kullanıcısı/.test(metin),
      // Kişi özeti: "kullanıcı bu kadar ... yaptı"
      ozetVar: /Test Kullanıcısı — /.test(metin),
      // Ekrandaki saat her koşuda değişir; karşılaştırılabilmesi için sabitleniyor.
      kesit: (i >= 0 ? metin.slice(i, i + 260) : "").replace(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/g, "<tarih saat>"),
    };
  });
  const satirSayisi = await sayfa.evaluate(() => {
    const m = document.body.innerText.replace(/\s+/g, " ");
    const d = m.match(/Devamı \((\d+) kayıt daha\)/);
    return d ? Number(d[1]) : 0;
  });

  await tarayici.close();
  return {
    cokKalemliFis, hatalar, kapaliyken, sekmeler, alisFiltresi, panel, devamiKalan: satirSayisi };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
