// SENARYO — MAMUL RENKLERİ HER YERDE KODLU (v1.717.0, 083).
//
// Kullanıcı (teklif ekranında fark etti): "yeni renk ekleyince model renginden renk ekliyor ve renk kodunu da aynı satıra
// yazıyor; siparişte ve başka renk eklerken böyle değil, mantık hatası var — teklifteki doğru aslında" → "İKİSİNİ DE YAP".
//   1. Bot (Mamul) kartına tanımlı "Taba" eklenir → varyant "1001 - Taba"; Tanımlar'da 1 renkli model rengi açılır.
//   2. Tanımsız "Light" → "renk aç" sorusu → Evet: Tanımlar'da TEK Light rengi (görünüm rengi sorudan) + model rengi;
//      varyant "1002 - Light".
//   3. Tanımlar › Bakım › Kodsuz Mamul Renkleri: Bot'un eski "Siyah"ı listelenir, "1003 - Siyah" olacağı gösterilir;
//      iki adımlı onayla varyant, sipariş kalemi (yalnız Bot'unki) ve üretim kaydı yeniden adlandırılır; bölüm kaybolur.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Ürün Stok");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "Bot" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(900);
  const renkEkleAc = () => sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /^(Renk|Model Rengi) Ekle$/.test(x.textContent.trim())); if (b) b.click(); });
  const kutu = () => sayfa.locator("[data-kart-renk-arama]:visible").first();
  const botRenkleri = async () => [...new Set(((await depoOku(sayfa, "stok:items")).find((u) => u.id === "u2").variants || []).map((v) => v.renk))];
  const tanimOzeti = async () => {
    const tan = await depoOku(sayfa, "tanimlar:data");
    const renkAdi = (id) => ((tan.renkler || []).find((r) => r.id === id) || {}).ad;
    return {
      renkler: (tan.renkler || []).map((r) => r.ad),
      kombiler: (tan.renkKombinasyonlari || []).map((k) => `${k.kod} - ${(k.renkIdler || []).map(renkAdi).join("/")}`),
    };
  };

  // 1) tanımlı renk → model rengi
  await renkEkleAc(); await sayfa.waitForTimeout(300);
  await kutu().fill("Taba");
  await sayfa.locator("[data-kart-renk-ekle]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const tabaSonra = { renkler: await botRenkleri(), tanim: await tanimOzeti(),
    toast: await sayfa.evaluate(() => (document.querySelector("[data-toast]") || {}).textContent || null) };

  // 2) tanımsız renk → soru → evet
  await renkEkleAc(); await sayfa.waitForTimeout(300);
  await kutu().fill("Light");
  await sayfa.waitForTimeout(150);
  await sayfa.locator("[data-kart-renk-ekle]:visible").first().click();
  await sayfa.waitForTimeout(300);
  const soru = await sayfa.locator("[data-renk-ac-sorusu]").first().getAttribute("data-renk-ac-sorusu");
  await sayfa.locator("[data-renk-ac-hex]").first().evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "#e8d9b0"); el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.locator("[data-renk-ac-evet]").first().click();
  await sayfa.waitForTimeout(900);
  const tanimLight = await depoOku(sayfa, "tanimlar:data");
  const lightler = (tanimLight.renkler || []).filter((r) => r.ad === "Light");
  const lightSonra = { renkler: await botRenkleri(), tanim: await tanimOzeti(),
    light: { sayi: lightler.length, kodVar: lightler.length === 1 && /^\d+$/.test(String(lightler[0].kod)), renkKodu: lightler[0] && lightler[0].renkKodu },
    toast: await sayfa.evaluate(() => /Model rengi 1002 - Light eklendi/.test(document.body.innerText)) };

  // 3) Bakım: eski kodsuz "Siyah"
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-tanim-sekme="bakim"]').first().click();
  await sayfa.waitForTimeout(600);
  const bolum = sayfa.locator("[data-mamul-renk-kodlama]").first();
  const bakimOnce = {
    sayi: await bolum.getAttribute("data-mamul-renk-kodlama"),
    satirlar: await sayfa.evaluate(() => [...document.querySelectorAll("[data-mamul-renk-kodsuz]")].map((e) => e.textContent.replace(/\s+/g, " ").trim())),
    onayYok: await sayfa.locator("[data-mamul-renk-kodla-onay]").count(),
  };
  if (process.env.EKRAN) await sayfa.screenshot({ path: process.env.EKRAN, fullPage: true });
  await sayfa.locator("[data-mamul-renk-kodla]").first().click();
  await sayfa.waitForTimeout(200);
  const onayGoruldu = await sayfa.locator("[data-mamul-renk-kodla-onay]").count();
  await sayfa.locator("[data-mamul-renk-kodla-onay]").first().click();
  await sayfa.waitForTimeout(1200);
  const sip = await depoOku(sayfa, "siparis:data");
  const ur = await depoOku(sayfa, "uretim:siparisler");
  const bakimSonra = {
    bolumKaldi: await sayfa.locator("[data-mamul-renk-kodlama]").count(),
    botRenkleri: await botRenkleri(),
    deriRenkleri: [...new Set(((await depoOku(sayfa, "stok:items")).find((u) => u.id === "u1").variants || []).map((v) => v.renk))],
    siparisKalemleri: sip.flatMap((s) => s.kalemler.map((k) => `${k.urunId}:${k.renk}`)),
    uretim: ur.map((u) => `${u.urunId}:${u.renk}`),
    tanim: await tanimOzeti(),
    toast: await sayfa.evaluate(() => /1 mamul rengi kodlandı · 1 ürün, 1 sipariş kalemi, 1 üretim/.test(document.body.innerText)),
  };
  await tarayici.close();
  return { tabaSonra, soru, lightSonra, bakimOnce, onayGoruldu, bakimSonra, hatalar };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
