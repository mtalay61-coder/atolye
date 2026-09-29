// SENARYO — EKRAN DÜZENİ: DÜZENLEME KİPİ (29 Eylül, v1.522.0).
//
// Kullanıcı: "Sürükle gibi butonların yerini taşıyabileceğimiz, boyutlarını değiştirebileceğimiz" → 2. adım (blok düzeni).
// Kurulum: Yeni alış siparişi formu (4 blok: baslik, barkod, kalemEkle, kalemler).
// Ölçülen:
//   1) varsayılan sıra; "Düzen" ile kip açılıyor, her blokta çubuk; kipte içerik tıklanamaz;
//   2) oklarla "kalemEkle" barkodun üstüne; tutamakla SÜRÜKLEYEREK "barkod" en üste; başlık "Yarım";
//      barkod gizlendi; "Sipariş bilgileri" ve "Kalemler" gizlenemez (göz yok);
//   3) Kaydet → kip kapanır, sıra ve genişlik uygulanmış, gizli blok görünmüyor; tanimlar.ekranDuzenleri.siparisFormu yazıldı;
//   4) Vazgeç değişikliği atar; Varsayılana dön → kodun sırası;
//   5) fiş formunda da Düzen düğmesi var (fisFormu, 4 blok).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir(ekranGoruntusu) {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.setViewportSize({ width: 1100, height: 1000 });
  await sayfa.waitForTimeout(2300);
  await modulAc(sayfa, "Alış Siparişi");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Yeni Alış Siparişi/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(800);
  const E = '[data-duzen-ekran="siparisFormu"]';
  const durum = () => sayfa.evaluate((E) => {
    const k = document.querySelector(E);
    return {
      sira: [...k.querySelectorAll("[data-duzen-blok]")].map((b) => `${b.getAttribute("data-duzen-blok")}:${b.getAttribute("data-duzen-genislik-deger")}`),
      kip: k.getAttribute("data-duzen-kip") === "1",
      cubuk: k.querySelectorAll("[data-duzen-cubugu]").length,
      gozler: [...k.querySelectorAll("[data-duzen-gizle]")].map((b) => b.getAttribute("data-duzen-gizle")),
    };
  }, E);
  const varsayilan = await durum();
  await sayfa.locator(`${E} [data-duzen-ac]`).click();
  await sayfa.waitForTimeout(300);
  const kipte = await durum();
  const icerikTiklanamaz = await sayfa.evaluate((E) => getComputedStyle(document.querySelector(`${E} [data-duzen-blok="kalemEkle"] > div:last-child`)).pointerEvents, E);
  await sayfa.locator(`${E} [data-duzen-yukari="kalemEkle"]`).click();
  await sayfa.waitForTimeout(150);
  const oklaSonra = (await durum()).sira;
  // SÜRÜKLE: barkodun tutamağını başlık bloğunun üstüne götür.
  const tutamak = await sayfa.locator(`${E} [data-duzen-tutamak="barkod"]`).boundingBox();
  const hedef = await sayfa.locator(`${E} [data-duzen-blok="baslik"]`).boundingBox();
  await sayfa.mouse.move(tutamak.x + tutamak.width / 2, tutamak.y + tutamak.height / 2);
  await sayfa.mouse.down();
  await sayfa.mouse.move(hedef.x + 40, hedef.y + 30, { steps: 8 });
  await sayfa.mouse.up();
  await sayfa.waitForTimeout(200);
  const surukleyinceSonra = (await durum()).sira;
  await sayfa.locator(`${E} [data-duzen-genislik="baslik:yarim"]`).click();
  await sayfa.locator(`${E} [data-duzen-gizle="barkod"]`).click();
  await sayfa.waitForTimeout(150);
  if (ekranGoruntusu) await sayfa.locator("#siparis-yeni-form").screenshot({ path: ekranGoruntusu });
  await sayfa.locator(`${E} [data-duzen-kaydet]`).click();
  await sayfa.waitForTimeout(800);
  const kayittanSonra = await durum();
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const kayit = ((tanim && tanim.ekranDuzenleri) || {}).siparisFormu || null;
  // Vazgeç: değişiklik yapıp vazgeç → kayıtlı düzen aynen.
  await sayfa.locator(`${E} [data-duzen-ac]`).click();
  await sayfa.locator(`${E} [data-duzen-genislik="baslik:tam"]`).click();
  await sayfa.locator(`${E} [data-duzen-vazgec]`).click();
  await sayfa.waitForTimeout(200);
  const vazgecSonra = (await durum()).sira;
  // Varsayılana dön + kaydet.
  await sayfa.locator(`${E} [data-duzen-ac]`).click();
  await sayfa.locator(`${E} [data-duzen-varsayilan]`).click();
  await sayfa.locator(`${E} [data-duzen-kaydet]`).click();
  await sayfa.waitForTimeout(500);
  const varsayilanaDonus = (await durum()).sira;
  // Fiş formu.
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Tedarikçi A" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(800);
  const fis = await sayfa.evaluate(() => {
    const k = document.querySelector('[data-duzen-ekran="fisFormu"]');
    return k ? { bloklar: [...k.querySelectorAll("[data-duzen-blok]")].map((b) => b.getAttribute("data-duzen-blok")), duzenDugmesi: !!k.querySelector("[data-duzen-ac]") } : null;
  });
  await tarayici.close();
  return { hatalar, varsayilan, kipte, icerikTiklanamaz, oklaSonra, surukleyinceSonra, kayittanSonra, kayit, vazgecSonra, varsayilanaDonus, fis };
}

if (require.main === module) {
  calistir(process.argv[2]).then((s) => { if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | ")); console.log(normalles(s)); });
}
module.exports = { calistir };
