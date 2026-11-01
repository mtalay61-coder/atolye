// F2 / BEKLEYEN DEFTER — TARAYICIDA ZAMANLAYICI (gerçek uygulama, test/test.html; sahte sunucu). Sunucu bir yazmayı KALICI olarak
// reddeder (400, KR003 — sunucunun kural reddi kodu; RED_KODU=42501 ile 1.744.0 öncesi sunucunun kodu). Saat (Playwright clock)
// 10 dakika ileri sarılır: 100-app bekleyenleriYenidenGonder her 60 sn aynı yazmayı yeniden gönderir mi, sayaç büyür mü, şerit ve
// hata metni görünür mü, yerel kayıt kalır mı. Tablodan bağımsız mekanizma; burada Tanımlar (tekilYaz) kullanılır — arayüzden en
// kısa yazma yolu. Kullanım: cd test && node derle.js && node paket-test.js && node ../stok-v2/test/f2/senaryo-kalici-red.js
const path = require("path");
const { uygulamaAc, depoOku } = require(path.join(__dirname, "../../../test/ortak.js"));
const { TOHUM } = require(path.join(__dirname, "../../../test/tohum.js"));

(async () => {
  let post = 0;
  const zamanlar = [];
  const onceRota = async (sayfa) => {
    await sayfa.clock.install({ time: new Date("2026-11-02T09:00:00Z") });
    await sayfa.route("**/rest/v1/tanimlar**", (r) => {
      if (r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      post += 1; zamanlar.push(Date.now());
      return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: process.env.RED_KODU || "KR003", message: "kalıcı ret (test): bu kayıt sunucu kuralına aykırı" }) });
    });
  };
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false, onceRota });
  await sayfa.clock.runFor(3000);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.clock.runFor(800);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Ürün" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.clock.runFor(500);
  await sayfa.locator('input[placeholder="Örn. Ham Bej"]').first().fill("KaliciRedRengi");
  await sayfa.keyboard.press("Enter");
  await sayfa.clock.runFor(3000);
  const ilk = post;
  const olc = async () => {
    const d = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}"));
    const serit = await sayfa.evaluate(() => { const e = document.querySelector("[data-bekleyen-yazma]"); return e ? { sayi: Number(e.getAttribute("data-bekleyen-yazma")), metin: e.innerText.replace(/\s+/g, " ").trim().slice(0, 160) } : null; });
    return { post, deneme: d["tanimlar:data"] && d["tanimlar:data"].deneme, hata: d["tanimlar:data"] && String(d["tanimlar:data"].hata).slice(0, 80), serit };
  };
  const once = await olc();
  const seyir = [];
  for (let dk = 1; dk <= 10; dk++) { await sayfa.clock.runFor(60000); await sayfa.waitForTimeout(150); seyir.push((await olc()).post); }
  const sonra = await olc();
  const yerel = await depoOku(sayfa, "tanimlar:data");
  const yerelde = JSON.stringify(yerel || {}).includes("KaliciRedRengi");
  await tarayici.close();
  const sonuc = (kimlik, ad, gercek, beklenen, ek) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); console.log(`  ${ok ? "✓" : "✗"} [${kimlik}] ${ad}`); console.log(`      sonra:    ${JSON.stringify(ek)}`); if (!ok) console.log(`      beklenen: ${JSON.stringify(beklenen)}\n      çıkan:    ${JSON.stringify(gercek)}`); };
  console.log(`F2 kalıcı ret — tarayıcı (saat 10 dk ileri) · ilk yazma POST: ${ilk}`);
  console.log(`  • [BRT.seyir] (gözlem) dakika başına toplam POST: ${JSON.stringify(seyir)}`);
  sonuc("BRT.serit", "şerit ve hata metni görünür (ret kullanıcıya gösterilir)", !!(sonra.serit && sonra.serit.sayi > 0 && sonra.hata), true, { once, sonra });
  sonuc("BRT.yerel-korunur", "yerel kayıt silinmez", yerelde, true, { yerelde });
  sonuc("BRT.otomatik-tekrar-yok", "kalıcı ret 10 dakikada otomatik yeniden gönderilmez", sonra.post - once.post, 0, { onceki: once.post, sonraki: sonra.post, deneme: sonra.deneme });
  sonuc("BRT.inceleme", "şerit kaydı 'inceleme gerekiyor' olarak ayırır (geçici ağ hatasından farklı)", /incele/i.test((sonra.serit && sonra.serit.metin) || ""), true, { serit: sonra.serit });
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
