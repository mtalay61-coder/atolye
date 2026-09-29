// SENARYO — KASA DETAYINDA ÜST ŞERİT + EKRAN DÜZENİ (29 Eylül, v1.533.0).
//
// Kullanıcı: "Kasada da ekran düzenleme olsun ve altta sil, pasife al, düzenle daha ufalsın. Daha önce yaptıklarımızdan
// kontrol et." (cari/ürün kartındaki kalıp: mor üst şerit, küçük ikonlar, düzen ikonu şeritte.)
// Ölçülen:
//   1) şeritte düzenle · pasif · sil · düzen ikonları; altta yazılı Düzenle / Pasife Al düğmesi YOK;
//   2) düzen ikonu → kip; "Hareket listesi" gizlenemez (göz yok), "İşlem düğmeleri" gizlenebilir;
//      Hareket listesi yukarı → Kaydet → sıra hareketler, islem; kayıt tanimlar.ekranDuzenleri.kasaDetay;
//   3) (v1.535.0) liste uzunken (31 hareket) kipte önizleme ≤ 220 px; en üstteki liste sürüklenerek en alta iniyor;
//      Tahsilat / Ödeme düğmeleri kendi renginde;
//   4) (v1.536.0) Tümü/Genel/Resmi ayrı blok ("defter"), okla tablonun altına iniyor ve kayıtta kalıyor;
//   5) ✎ → alttaki düzenleme formu (ad kutusu + Kaydet/Vazgeç) açılıyor, şeritte ✎ ve 🗑 gizleniyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const t = { ...TOHUM };
  t["muhasebe:data"] = JSON.stringify({ hesaplar: [], bankalar: [], cekler: [], defter: [], kurlar: { USD: 48 },
    kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
      { id: "h1", tarih: "2026-09-28", yon: "Giriş", tutar: 500, cariId: "c2", aciklama: "Tahsilat · Müşteri B · Tahsilat (TL Kasa)", defter: "Genel" },
      // v1.535.0: uzun liste — "Hareket listesi alta inmiyor" hatası ancak liste ekranı taşırınca görünüyordu.
      ...Array.from({ length: 30 }, (_, i) => ({ id: `u${i}`, tarih: "2026-09-20", yon: "Giriş", tutar: 1, cariId: "c2", aciklama: "", defter: "Genel" })),
    ] }] });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1150, height: 700 });
  await sayfa.waitForTimeout(2300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Kasa & Banka"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.locator('[data-hesap-satir="k1"]').first().click();
  await sayfa.waitForTimeout(700);

  const serit = () => sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-hesap-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0);
    return s ? [...s.querySelectorAll("[data-kart-eylem], [data-duzen-ac]")].map((b) => b.getAttribute("data-kart-eylem") || `duzen:${b.getAttribute("data-duzen-ac")}`) : null;
  });
  const seritIkonlari = await serit();
  const altYaziliDugme = await sayfa.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0 && /^(Düzenle|Pasife Al)$/.test(b.textContent.trim())).length);
  const aciklama = await sayfa.evaluate(() => document.querySelectorAll("[data-kasa-aciklama]").length);
  const E = '[data-duzen-ekran="kasaDetay"]';
  const sira = () => sayfa.evaluate((E) => [...document.querySelectorAll(`${E} > .duzen-alani > [data-duzen-blok]`)].map((b) => b.getAttribute("data-duzen-blok")), E);
  const varsayilan = await sira();
  await sayfa.locator('[data-duzen-ac="kasaDetay"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  const gozler = await sayfa.evaluate((E) => [...document.querySelectorAll(`${E} [data-duzen-gizle]`)].map((b) => b.getAttribute("data-duzen-gizle")), E);
  await sayfa.locator(`${E} [data-duzen-yukari="hareketler"]`).click();
  await sayfa.waitForTimeout(150);
  if (ekranGoruntusu) await sayfa.locator("[data-hesap-ust-serit]").first().locator("xpath=..").screenshot({ path: ekranGoruntusu });
  await sayfa.locator(`${E} [data-duzen-kaydet]`).click();
  await sayfa.waitForTimeout(900);
  const kayittanSonra = await sira();

  // 4) (v1.535.0) Hareket listesi en üstteyken SÜRÜKLEYEREK aşağı: kipte bloklar kısa önizleme, kenarda kaydırma.
  await sayfa.locator('[data-duzen-ac="kasaDetay"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  const onizlemeYuksekligi = await sayfa.evaluate((E) => Math.round(document.querySelector(`${E} [data-duzen-blok="hareketler"] [data-duzen-onizleme]`).getBoundingClientRect().height), E);
  const ad = await sayfa.locator(`${E} [data-duzen-cubugu="hareketler"] b`).boundingBox();
  await sayfa.mouse.move(ad.x + 10, ad.y + ad.height / 2); await sayfa.mouse.down();
  await sayfa.mouse.move(ad.x + 10, 690, { steps: 10 });
  for (let i = 0; i < 20; i++) { await sayfa.mouse.move(ad.x + 10 + (i % 2), 695); await sayfa.waitForTimeout(40); }
  await sayfa.mouse.up();
  await sayfa.waitForTimeout(200);
  const asagiSurukleyince = await sira();
  // 5) (v1.536.0) "Defter seçimi" (Tümü/Genel/Resmi) ayrı blok: aşağı okla hareket tablosunun (ekstre) altına.
  await sayfa.locator(`${E} [data-duzen-asagi="defter"]`).click();
  await sayfa.waitForTimeout(150);
  await sayfa.locator(`${E} [data-duzen-kaydet]`).click();
  await sayfa.waitForTimeout(800);
  const defterAltta = await sira();
  const defterTablonunAltinda = await sayfa.evaluate(() => {
    const d = document.querySelector("[data-hesap-defter-secimi]"); const t = document.querySelector('[data-duzen-blok="hareketler"] table');
    return !!(d && t && d.getBoundingClientRect().top > t.getBoundingClientRect().bottom);
  });
  // Kasa işlem düğmelerinin rengi (v1.535.0): Tahsilat/Ödeme kendi renginde.
  const dugmeRenkleri = await sayfa.evaluate(() => Object.fromEntries(["tahsilat", "odeme"].map((k) => { const b = document.querySelector(`[data-islem="${k}"]`); return [k, b ? getComputedStyle(b).color : null]; })));
  await sayfa.locator("[data-hesap-duzenle-ac]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const duzenlemede = { serit: await serit(), form: await sayfa.locator("[data-hesap-duzenle-formu] [data-hesap-duzenle]:visible").count() };
  const tanim = await depoOku(sayfa, "tanimlar:data");
  await tarayici.close();
  return {
    hatalar, seritIkonlari, altYaziliDugme, sadeAciklamaSayisi: aciklama, varsayilan, gozler, kayittanSonra, duzenlemede,
    onizlemeKisa: onizlemeYuksekligi <= 220, asagiSurukleyince, dugmeRenkleri, defterAltta, defterTablonunAltinda,
    kayit: (((tanim && tanim.ekranDuzenleri) || {}).kasaDetay || []).map((x) => x.id),
  };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
