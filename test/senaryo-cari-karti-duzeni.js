// SENARYO — CARİ KARTINDA DÜZEN (29 Eylül, v1.525.0).
//
// Kullanıcı: "Cari kartına da düzen ekle." İki düzen:
//   • cariKarti: Bakiye özeti / Sekmeler (gizlenemez) / Ekstre ve pasife al;
//   • cariHareketler (Hareketler sekmesi): Fiş ve işlem düğmeleri / Defter-para birimi seçimi / Hareket listesi (gizlenemez).
// Ölçülen:
//   1) Tedarikçi A kartında varsayılan sıralar; kipte gizlenebilen bloklar;
//   2) kart: Ekstre en üste, Bakiye gizli → Kaydet → sıra uygulanmış, bakiye yok;
//   3) Hareketler: liste filtrelerin üstüne, işlem düğmeleri "Yarım" → Kaydet;
//   4) düzenden sonra fiş düğmeleri hâlâ çalışıyor (Alış Fişi formu açılıyor); kayıt tanimlar'da.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1100, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Tedarikçi A" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(600);
  const K = '[data-duzen-ekran="cariKarti"]';
  const H = '[data-duzen-ekran="cariHareketler"]';
  const durum = (E) => sayfa.evaluate((E) => {
    const k = document.querySelector(E);
    if (!k) return null;
    return [...k.querySelectorAll(":scope > .duzen-alani > [data-duzen-blok]")].map((b) => `${b.getAttribute("data-duzen-blok")}:${b.getAttribute("data-duzen-genislik-deger")}`);
  }, E);
  const gozler = (E) => sayfa.evaluate((E) => [...document.querySelectorAll(`${E} > .duzen-alani > [data-duzen-blok] > [data-duzen-cubugu] [data-duzen-gizle]`)].map((b) => b.getAttribute("data-duzen-gizle")), E);
  const kartVarsayilan = await durum(K);
  const hareketVarsayilan = await durum(H);

  // 2) Kart düzeni.
  await sayfa.locator(`${K} [data-duzen-ac="cariKarti"]`).click();
  await sayfa.waitForTimeout(300);
  const kartGozler = await gozler(K);
  await sayfa.locator(`${K} [data-duzen-yukari="ekstre"]`).click();
  await sayfa.waitForTimeout(100);
  await sayfa.locator(`${K} [data-duzen-yukari="ekstre"]`).click();
  await sayfa.locator(`${K} [data-duzen-gizle="bakiye"]`).click();
  await sayfa.waitForTimeout(150);
  await sayfa.locator(`${K} [data-duzen-kaydet="cariKarti"]`).click();
  await sayfa.waitForTimeout(900);
  const kartKaydi = await durum(K);
  const bakiyeGorunur = await sayfa.evaluate((K) => !!document.querySelector(`${K} [data-duzen-blok="bakiye"]`), K);

  // 3) Hareketler düzeni.
  await sayfa.locator(`${H} [data-duzen-ac="cariHareketler"]`).click();
  await sayfa.waitForTimeout(300);
  const hareketGozler = await gozler(H);
  await sayfa.locator(`${H} [data-duzen-yukari="liste"]`).click();
  await sayfa.locator(`${H} [data-duzen-genislik="islem:yarim"]`).click();
  await sayfa.waitForTimeout(150);
  if (ekranGoruntusu) await sayfa.locator(K).screenshot({ path: ekranGoruntusu });
  await sayfa.locator(`${H} [data-duzen-kaydet="cariHareketler"]`).click();
  await sayfa.waitForTimeout(900);
  const hareketKaydi = await durum(H);

  // 4) Fiş düğmesi hâlâ çalışıyor.
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(700);
  const fisFormuAcildi = (await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').count()) > 0;
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const kayit = (tanim && tanim.ekranDuzenleri) || {};
  await tarayici.close();
  const yaz = (l) => (l || []).map((x) => `${x.id}:${x.genislik}${x.gizli ? "(gizli)" : ""}`);
  return {
    hatalar,
    kartVarsayilan, hareketVarsayilan, kartGozler, hareketGozler,
    kartKaydi, bakiyeGorunur, hareketKaydi, fisFormuAcildi,
    kayitKart: yaz(kayit.cariKarti), kayitHareket: yaz(kayit.cariHareketler),
  };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
