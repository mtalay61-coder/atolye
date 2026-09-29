// SENARYO — ÜRÜN KARTINDA DÜZEN (29 Eylül, v1.524.0).
//
// Kullanıcı: "Ürün kartına da düzen ekle." Ürün kartı sekmeli; iki katman:
//   • sekmeler (urunKartiSekmeleri): "Sekmeleri düzenle" ile sıra + gizleme, Stok Bilgileri gizlenemez;
//   • Stok Bilgileri sekmesi (urunKartiStok): Stok durumu / Renkler ve bedenler / Renk-beden ekle blokları.
// Ölçülen:
//   1) Bot (mamul) kartında varsayılan sekme sırası; Barkodlar sekmesi açıkken kip: Siparişler sola (ok), Barkodlar
//      gizlendi, Stok'ta göz yok → Kaydet: yeni sıra, Barkodlar görünmüyor ve açık sekme ilk görünen sekmeye düştü;
//   2) Stok sekmesinde "Renk / beden ekle" en üste, "Stok durumu" gizli → Kaydet → sıra uygulanmış;
//   3) Deri (hammadde — Reçete/Maliyet sekmesi yok) kartında sıra kaydedilince Bot'un Reçete/Maliyet kaydı korunuyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1100, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Mamul Stok");
  await sayfa.waitForTimeout(700);
  const ac = async (ad) => {
    await sayfa.evaluate((ad) => {
      const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === ad && e.children.length === 0);
      let p = el; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    }, ad);
    await sayfa.waitForTimeout(900);
  };
  const S = '[data-sekme-duzen-ekran="urunKartiSekmeleri"]';
  const sekmeler = () => sayfa.evaluate((S) => {
    const k = [...document.querySelectorAll(S)].find((x) => x.getBoundingClientRect().width > 0);
    if (!k) return null;
    const kip = k.getAttribute("data-duzen-kip") === "1";
    return kip
      ? { kip, sira: [...k.querySelectorAll("[data-sekme-duzen]")].map((b) => b.getAttribute("data-sekme-duzen") + (b.getAttribute("data-sekme-gizli") ? "(gizli)" : "")),
          gozler: [...k.querySelectorAll("[data-duzen-gizle]")].map((b) => b.getAttribute("data-duzen-gizle")) }
      : { kip, sira: [...k.querySelectorAll("[data-kart-sekme]")].map((b) => b.getAttribute("data-kart-sekme") + (b.style.borderColor.includes("orange") || /orange/.test(b.getAttribute("style")) ? "*" : "")) };
  }, S);

  await ac("Bot");
  const varsayilan = await sekmeler();
  await sayfa.locator('[data-kart-sekme="barkodlar"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  // v1.530.0: düzen ikonu kartın mor üst şeridinde.
  const ustSerit = await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("[data-urun-ust-serit]")].find((x) => x.getBoundingClientRect().width > 0);
    return s ? { duzenIkonu: !!s.querySelector('[data-duzen-ac="urunKarti"]'), sekmeSatirindaIkonYok: !document.querySelector('[data-duzen-ac="urunKartiSekmeleri"]') } : null;
  });
  await sayfa.locator('[data-duzen-ac="urunKarti"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  const kipte = await sekmeler();
  for (let i = 0; i < 3; i++) { await sayfa.locator(`${S} [data-duzen-yukari="siparisler"]`).first().click(); await sayfa.waitForTimeout(100); }
  await sayfa.locator(`${S} [data-duzen-gizle="barkodlar"]`).first().click();
  await sayfa.waitForTimeout(150);
  const kipteSonra = await sekmeler();
  if (ekranGoruntusu) await sayfa.locator(S).first().screenshot({ path: ekranGoruntusu.replace(/\.png$/, "-sekme.png") });
  await sayfa.locator(`${S} [data-duzen-kaydet]`).first().click();
  await sayfa.waitForTimeout(900);
  const sekmeKaydi = await sekmeler();

  // 2) Stok Bilgileri blokları.
  await sayfa.locator('[data-kart-sekme="stok"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  const E = '[data-duzen-ekran="urunKartiStok"]';
  const bloklar = () => sayfa.evaluate((E) => [...document.querySelector(E).querySelectorAll("[data-duzen-blok]")].map((b) => b.getAttribute("data-duzen-blok")), E);
  const stokVarsayilan = await bloklar();
  // Stok sekmesinde şeritteki ikon sekme düzenini VE blok düzenini birlikte açar; sekme kipi burada vazgeçilir.
  await sayfa.locator('[data-duzen-ac="urunKarti"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  const ikisiBirden = await sayfa.evaluate((S) => !!document.querySelector(`${S}[data-duzen-kip="1"]`), S);
  await sayfa.locator(`${S} [data-duzen-vazgec]`).first().click();
  await sayfa.waitForTimeout(150);
  const stokGozler = await sayfa.evaluate((E) => [...document.querySelectorAll(`${E} [data-duzen-gizle]`)].map((b) => b.getAttribute("data-duzen-gizle")), E);
  await sayfa.locator(`${E} [data-duzen-yukari="renkBedenEkle"]`).click();
  await sayfa.waitForTimeout(100);
  await sayfa.locator(`${E} [data-duzen-yukari="renkBedenEkle"]`).click();
  await sayfa.locator(`${E} [data-duzen-gizle="stokDurumu"]`).click();
  await sayfa.waitForTimeout(150);
  if (ekranGoruntusu) await sayfa.locator(E).screenshot({ path: ekranGoruntusu });
  await sayfa.locator(`${E} [data-duzen-kaydet]`).click();
  await sayfa.waitForTimeout(900);
  const stokKaydi = await bloklar();

  // 3) Hammadde kartında kaydet → Bot'a özgü sekmelerin kaydı korunur.
  await modulAc(sayfa, "Stok");
  await sayfa.waitForTimeout(700);
  await ac("Deri");
  const deri = await sekmeler();
  await sayfa.locator('[data-duzen-ac="urunKarti"]:visible').first().click();
  await sayfa.waitForTimeout(300);
  // Deri de Stok sekmesinde açılıyor: blok kipi de açıldı — vazgeç.
  await sayfa.locator('[data-duzen-ekran="urunKartiStok"] [data-duzen-vazgec]').first().click();
  await sayfa.locator(`${S} [data-duzen-asagi="stok"]:visible`).first().click();
  await sayfa.locator(`${S} [data-duzen-kaydet]:visible`).first().click();
  await sayfa.waitForTimeout(900);
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const kayit = (tanim && tanim.ekranDuzenleri) || {};
  await tarayici.close();
  const yaz = (l) => (l || []).map((x) => x.id + (x.gizli ? "(gizli)" : ""));
  return {
    hatalar,
    varsayilan, ustSerit, ikisiBirden, kipte, kipteSonra, sekmeKaydi,
    stokVarsayilan, stokGozler, stokKaydi,
    deri,
    kayitSekmeler: yaz(kayit.urunKartiSekmeleri),
    kayitStok: yaz(kayit.urunKartiStok),
  };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
