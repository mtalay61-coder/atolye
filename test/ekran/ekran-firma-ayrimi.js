#!/usr/bin/env node
// EKRAN SINAMASI — İKİ FİRMA, FİRMA DEĞİŞTİRİRKEN VERİ AYRIMI (17 Kasım). Uygulama EKRANDAN; iki ayrı GERÇEK yerel PostgreSQL veritabanı
// (gercek-pg-kopru), her biri yeni firma kurulum dosyasıyla BOŞ projeye kurulmuş (t24/test24.sh, T24_TUT=1 → t24_a, t24_b).
// Firma A'nın adresi (aaaaaaaaaa01.supabase.co) A veritabanına, B'ninki (bbbbbbbbbb02) B veritabanına gider; firma rehberi
// (firmalar.json) iki kodu tanır. İkisinde de AYNI ürün kimliği (ekr-bot) ve AYNI kasa (K1): ayrım kimlikle değil projeyle.
// Adımlar:
//   1) A ile açılış + giriş (Ali, Yönetici). Ekrandan stok girişi (Siyah 40:3) ve kasa tahsilatı (Ekran Gelir, 150). Sunucu: A'da
//      var, B'de yok. Ekran: "mevcut" 3.
//   2) Tanımlar › Yedek & Bulut › Firma: Değiştir → "firmab" → Bağlan → yeniden yükleme. Bundan sonra A'nın adresine TEK istek
//      gitmez. Ekran B'yi gösterir: "mevcut" 0 (A'nın 3'ü yok), ürün listesinde B'nin ürünü var, A'nınki yok. Ekrandan B'ye stok girişi
//      (Siyah 40:9): B'de 9, A hâlâ 3.
//   3) A'ya geri: "mevcut" 3 (B'nin 9'u yok), A'nın ürünü var, B'ninki yok; bu sırada B'ye istek gitmez.
// Gerekli: KOPRU_PG (node "pg" modülünün yolu); test/test.html (cd test && node derle.js && node paket-test.js).
const crypto = require("crypto");
const path = require("path");
const { kopruKur } = require("../gercek-pg-kopru.js");
const O = require("../ortak.js");
const FA = { kod: "firmaa", url: "https://aaaaaaaaaa01.supabase.co", anahtar: "sb_publishable_FIRMA_A_ANAHTARI_1" };
const FB = { kod: "firmab", url: "https://bbbbbbbbbb02.supabase.co", anahtar: "sb_publishable_FIRMA_B_ANAHTARI_2" };
const DB_A = process.env.FIRMA_A_DB || "t24_a"; const DB_B = process.env.FIRMA_B_DB || "t24_b";
const URUN = "ekr-bot"; const EPOSTA = "ali@atolye.local";
const ozet = (k) => crypto.createHash("sha256").update("atolye-firma:" + k).digest("hex");
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const kA = kopruKur({ veritabani: DB_A }); const kB = kopruKur({ veritabani: DB_B });
  const host = (u) => { try { return new URL(u).host; } catch (e) { return ""; } };
  const istekler = [];   // { host, yol, zaman }
  const ayar = (await kA.sorgu("select row_to_json(a) as r from public.stk_ayar a"))[0].r;
  process.env.TEST_HTML = process.env.TEST_HTML || path.join(__dirname, "../test.html");
  const hatalar = [];
  const { tarayici, sayfa } = await O.uygulamaAc({}, { hataYaz: false, stkAyar: ayar, onceRota: async (s) => {
    // ilk yüklemede firma A seçili (sonraki yüklemelerde uygulamanın kendi seçimi kalır); oturum her yüklemede (iki projede de Ali var)
    await s.addInitScript(({ fa, e }) => {
      if (!sessionStorage.getItem("__ilk_firma")) { localStorage.setItem("firma:secim", JSON.stringify(fa)); sessionStorage.setItem("__ilk_firma", "1"); }
      localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e }));
    }, { fa: FA, e: EPOSTA });
    await s.route(/\/(rest|auth|functions)\/v1\//, async (r) => {
      const h = host(r.request().url());
      istekler.push({ host: h, yol: r.request().url().replace(/^https?:\/\/[^/]+/, "").split("?")[0], zaman: Date.now() });
      if (h === host(FA.url)) return r.fulfill(await kA.__yanitla(r.request()));
      if (h === host(FB.url)) return r.fulfill(await kB.__yanitla(r.request()));
      return r.abort();
    });
    await s.route("**/firmalar.json**", (r) => r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ surum: 1, firmalar: { [ozet(FA.kod)]: { url: FA.url, anahtar: FA.anahtar }, [ozet(FB.kod)]: { url: FB.url, anahtar: FB.anahtar } } }) }));
  } });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const ciz = async () => {
    await sayfa.evaluate(() => window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App)));
    await sayfa.waitForFunction(() => document.body && !document.body.innerText.includes("Yükleniyor"), null, { timeout: 20000 }).catch(() => {});
    await sayfa.waitForTimeout(2500);
  };
  const giris = async () => {
    const sifre = sayfa.locator('input[type="password"]:visible');
    if (!(await sifre.count())) return false;
    await sayfa.locator('input:not([type="password"]):visible').first().fill("Ali"); await sifre.first().fill("yerel-sinama");
    await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click(); await sayfa.waitForTimeout(3000);
    return true;
  };
  // ── ekran yardımcıları (ekran-stok.js / ekran-kasa.js ile aynı yollar) ──
  const stokAc = async () => { await O.modulAc(sayfa, "Stok"); await sayfa.waitForTimeout(700); };
  const formAc = async () => {
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(400); }
    await sayfa.locator("[data-stok-giris-urun]").first().selectOption(URUN); await sayfa.waitForTimeout(250);
  };
  const mevcut = async (renk = "Siyah", beden = "40") => {
    await stokAc(); await formAc();
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption(renk); await sayfa.waitForTimeout(250);
    const t = await sayfa.locator(`[data-stok-giris-miktar="${beden}"]`).first().evaluate((i) => i.closest("label").innerText);
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(300);
    return Number((t.match(/mevcut:\s*(-?[\d.,]+)/) || [])[1]);
  };
  const stokGir = async (renk, miktarlar) => {
    await stokAc(); await formAc();
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption(renk); await sayfa.waitForTimeout(250);
    for (const [b, m] of Object.entries(miktarlar)) await sayfa.locator(`[data-stok-giris-miktar="${b}"]`).first().fill(String(m));
    await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click(); await sayfa.waitForTimeout(2500);
  };
  const tahsilat = async (kartAd, tutar) => {
    await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(500);
    await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(700);
    await sayfa.locator('[data-odeme-tip="Tahsilat"]:visible').first().click();
    await sayfa.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await sayfa.waitForTimeout(250);
    const hd = sayfa.locator("[data-odeme-hesap]:visible");
    if (await hd.count() > 1) await sayfa.locator("[data-odeme-hesap]:visible", { hasText: "Merkez" }).first().click();
    const kutu = sayfa.locator("[data-odeme-cari]:visible").first();
    await kutu.click(); await kutu.fill(kartAd); await sayfa.waitForTimeout(300); await kutu.press("Enter"); await sayfa.waitForTimeout(400);
    await sayfa.locator("[data-kart-odeme-tutar]:visible").first().fill(String(tutar));
    await sayfa.locator("[data-kart-odeme-kaydet]:visible").first().click(); await sayfa.waitForTimeout(2500);
  };
  // ürünler: stok giriş formunun ürün seçim kutusu (bütün ürünler; Stok sayfasının listesi kategoriye göre süzülü)
  const urunListesi = async () => {
    await stokAc();
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(400); }
    const t = await sayfa.locator("[data-stok-giris-urun] option").allInnerTexts();
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(300);
    return t.join(" | ");
  };
  const firmaDegistir = async (kod) => {
    await O.modulAc(sayfa, "Tanımlar / Ayarlar").catch(async () => { await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); });
    await sayfa.waitForTimeout(600);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yedek & Bulut" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(500);
    await sayfa.click("[data-firma-satiri] [data-firma-degistir]");
    await sayfa.fill("[data-firma-kodu]", kod);
    const once = istekler.length;
    for (let i = 0; i < 3; i++) {
      await sayfa.click("[data-firma-uygula]").catch(() => {});
      const ok = await sayfa.waitForFunction((k) => (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod || "") === k, kod, { timeout: 6000 }).then(() => true).catch(() => false);
      if (ok) break;
      await sayfa.waitForTimeout(800);
    }
    await sayfa.waitForLoadState("load").catch(() => {});
    await sayfa.waitForTimeout(800);
    const gecis = Date.now();
    await ciz(); await giris();
    return { gecis, oncekiIstekSayisi: once, secim: await sayfa.evaluate(() => JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) };
  };
  const sunucuStok = async (k) => Number(((await k.sorgu(`select coalesce(sum(miktar), 0)::float as m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' and olcu_ad = '40'`, [URUN]))[0] || {}).m);
  const sunucuKasa = async (k) => Number((await k.sorgu(`select coalesce(sum(case when h.veri->>'yon' = 'Giriş' then (h.veri->>'tutar')::numeric else -(h.veri->>'tutar')::numeric end), 0)::float as b
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = 'K1' and not h.iptal and (h.fis_id is null or not f.iptal)`))[0].b);

  await sayfa.waitForTimeout(1500); await giris();
  console.log(`ekran-firma-ayrimi · A=${DB_A} B=${DB_B} · istemci ${await sayfa.evaluate(() => window.__SURUM || document.title)}`);
  k_("açılış firması", await sayfa.evaluate(() => JSON.parse(localStorage.getItem("firma:secim") || "{}").kod), "firmaa");
  const kasaA0 = await sunucuKasa(kA); const kasaB0 = await sunucuKasa(kB);

  console.log("1) firma A: ekrandan stok girişi + kasa tahsilatı");
  k_("A · mevcut (başlangıç)", await mevcut(), 0);
  await stokGir("Siyah", { 40: 3 });
  k_("A · sunucu A stok", await sunucuStok(kA), 3);
  k_("A · sunucu B stok (dokunulmadı)", await sunucuStok(kB), 0);
  k_("A · ekran mevcut", await mevcut(), 3);
  await tahsilat("Ekran Gelir", 150);
  k_("A · sunucu A kasa +150", await sunucuKasa(kA) - kasaA0, 150);
  k_("A · sunucu B kasa (dokunulmadı)", await sunucuKasa(kB) - kasaB0, 0);
  k_("A · ekranda A'nın ürünü var, B'ninki yok", await urunListesi().then((t) => [t.includes("A Firması Botu"), t.includes("B Firması Çantası")]), [true, false]);

  console.log("2) firma B'ye geçiş");
  const g1 = await firmaDegistir("firmab");
  k_("geçiş · seçim", g1.secim, "firmab");
  k_("B · ekran mevcut (A'nın 3'ü görünmez)", await mevcut(), 0);
  k_("B · ekranda B'nin ürünü var, A'nınki yok", await urunListesi().then((t) => [t.includes("B Firması Çantası"), t.includes("A Firması Botu")]), [true, false]);
  await stokGir("Siyah", { 40: 9 });
  k_("B · sunucu B stok", await sunucuStok(kB), 9);
  k_("B · sunucu A stok (hâlâ 3)", await sunucuStok(kA), 3);
  k_("B · ekran mevcut", await mevcut(), 9);
  const sonraB = istekler.filter((x) => x.zaman > g1.gecis);
  k_("B'deyken A'nın adresine istek (adet)", sonraB.filter((x) => x.host === host(FA.url)).length, 0);
  k_("B'deyken B'nin adresine istek var", sonraB.some((x) => x.host === host(FB.url)), true);

  console.log("3) firma A'ya geri");
  const g2 = await firmaDegistir("firmaa");
  k_("geri dönüş · seçim", g2.secim, "firmaa");
  k_("A · ekran mevcut (B'nin 9'u görünmez)", await mevcut(), 3);
  k_("A · ekranda A'nın ürünü var, B'ninki yok", await urunListesi().then((t) => [t.includes("A Firması Botu"), t.includes("B Firması Çantası")]), [true, false]);
  const sonraA = istekler.filter((x) => x.zaman > g2.gecis);
  k_("A'dayken B'nin adresine istek (adet)", sonraA.filter((x) => x.host === host(FB.url)).length, 0);
  k_("son hâl · sunucu A / B stok", [await sunucuStok(kA), await sunucuStok(kB)], [3, 9]);
  k_("sayfa hatası yok", hatalar, []);

  await tarayici.close(); await kA.kapat(); await kB.kapat();
  console.log(`── ekran-firma-ayrimi: ${gecen} geçti, ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA:", e.message); process.exit(2); });
