#!/usr/bin/env node
// EKRAN SINAMASI — İKİ FİRMA, NORMAL AÇILIŞ + OTURUM + FİRMA DEĞİŞTİRİRKEN VERİ AYRIMI (17 Kasım; ikinci tur). Uygulama EKRANDAN; iki
// ayrı GERÇEK yerel PostgreSQL veritabanı (gercek-pg-kopru), her biri yeni firma kurulum dosyasıyla BOŞ projeye kurulmuş
// (t24/test24.sh, T24_TUT=1 → t24_a, t24_b). A'nın adresi (aaaaaaaaaa01.supabase.co) A'ya, B'ninki (bbbbbbbbbb02) B'ye gider; firma
// rehberi (firmalar.json) iki kodu tanır. İkisinde AYNI ürün kimliği (ekr-bot) ve AYNI kasa (K1): ayrım kimlikle değil projeyle.
// İnceleme sonrası kurallar (17 Kasım):
//   · TEK "Bağlan" tıklaması — yeniden deneme YOK; geçiş olmazsa test kırmızı.
//   · Oturum test tarafından EKLENMEZ: A'ya ekrandan giriş; B'de oturum yokken giriş istenmeli; A'ya dönünce A'nın saklanan oturumu
//     geri gelmeli (giriş istenmeden açılmalı).
//   · Uygulama elle yeniden ÇİZİLMEZ: ilk yükleme dışındaki her belgede uygulama kendiliğinden başlar (gerçek uygulamadaki gibi;
//     test kabuğu test.html ilk yüklemede ortak.js'le çizilir).
//   · Ağ kaydı AÇILIŞTAN başlar (CDP, istek başına belge kimliği = loaderId). Geçişin TAMAMI ölçülür: tıklamayla yeni belge
//     arasında eski belgeden yeni firmaya yalnız bağlantı denemesi (/auth/v1/settings) gidebilir; eski belgeden eski firmaya yazma
//     gitmez; yeni belgelerden (yeniden denemeler dahil) eski firmaya HİÇBİR istek gitmez. Yeniden yüklemeyi başlatan çağrı yığını
//     kaydedilir.
// Adımlar: 1) A: açılış, ekrandan giriş, stok girişi (Siyah 40:3) + kasa tahsilatı (150). 2) B'ye geçiş (tek tık): giriş istenir,
// giriş, A'nın verisi görünmez, B'ye stok girişi (9). 3) A'ya dönüş (tek tık): giriş istenmez (oturum geri gelir), B'nin verisi
// görünmez.
// Gerekli: KOPRU_PG (node "pg" modülünün yolu); test/test.html (cd test && node derle.js && node paket-test.js).
const crypto = require("crypto");
const path = require("path");
const { kopruKur } = require("../gercek-pg-kopru.js");
const O = require("../ortak.js");
const FA = { kod: "firmaa", url: "https://aaaaaaaaaa01.supabase.co", anahtar: "sb_publishable_FIRMA_A_ANAHTARI_1" };
const FB = { kod: "firmab", url: "https://bbbbbbbbbb02.supabase.co", anahtar: "sb_publishable_FIRMA_B_ANAHTARI_2" };
const DB_A = process.env.FIRMA_A_DB || "t24_a"; const DB_B = process.env.FIRMA_B_DB || "t24_b";
const URUN = "ekr-bot";
const ozet = (k) => crypto.createHash("sha256").update("atolye-firma:" + k).digest("hex");
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const host = (u) => { try { return new URL(u).host; } catch (e) { return ""; } };
const HA = host(FA.url), HB = host(FB.url);
// YAZMA: tabloya POST / PATCH / PUT / DELETE ya da yazan RPC. Salt okur RPC'ler (POST ile çağrılır) yazma sayılmaz.
const RPC_OKUMA = new Set(["site_kayit_listesi", "site_hesap_bilgi", "site_raporu", "kurulum_betigi", "fis_bilgi", "yonetici_mi", "platform_yonetici_mi"]);
const yazmaMi = (x) => !["GET", "HEAD"].includes(x.m) && /^\/(rest|functions)\/v1\//.test(x.yol) && !(/^\/rest\/v1\/rpc\//.test(x.yol) && RPC_OKUMA.has(x.yol.split("/").pop()));

(async () => {
  const kA = kopruKur({ veritabani: DB_A }); const kB = kopruKur({ veritabani: DB_B });
  const ayar = (await kA.sorgu("select row_to_json(a) as r from public.stk_ayar a"))[0].r;
  process.env.TEST_HTML = process.env.TEST_HTML || path.join(__dirname, "../test.html");
  const hatalar = [];
  const ag = [];          // { t, loader, host, yol, m, belge }
  const belgeler = [];    // { t, loader, url, baslatan }
  let cdp = null;
  const { tarayici, sayfa } = await O.uygulamaAc({}, { hataYaz: false, stkAyar: ayar, onceRota: async (s) => {
    // ağ kaydı: ilk yüklemeden ÖNCE
    cdp = await s.context().newCDPSession(s);
    await cdp.send("Network.enable");
    cdp.on("Network.requestWillBeSent", (e) => {
      if (e.type === "Document") {
        belgeler.push({ t: Date.now(), loader: e.loaderId, url: e.request.url.replace(/^.*\//, ""),
          baslatan: e.initiator.type + (e.initiator.stack ? " " + (e.initiator.stack.callFrames || []).slice(0, 4).map((f) => f.functionName || "?").join("←") : "") });
        return;
      }
      const h = host(e.request.url);
      if ((h === HA || h === HB) && e.request.method !== "OPTIONS") ag.push({ t: Date.now(), loader: e.loaderId, host: h, yol: e.request.url.replace(/^https?:\/\/[^/]+/, "").split("?")[0], m: e.request.method });
    });
    // ilk yüklemede firma A seçili (yalnız bir kez); oturum EKLENMEZ. İlk yükleme dışındaki belgelerde uygulama kendiliğinden başlar.
    if (process.env.TESHIS) await s.addInitScript(() => {
      const yaz = Storage.prototype.setItem, sil = Storage.prototype.removeItem;
      const iz = (ad, k) => { if (/oturum:aktif/.test(k)) console.log("IZ " + ad + " " + k + " " + (new Error().stack || "").split("\n").slice(2, 7).map((x) => x.trim().split(" ")[1]).join("<")); };
      Storage.prototype.setItem = function (k, v) { iz("set", k); return yaz.call(this, k, v); };
      Storage.prototype.removeItem = function (k) { iz("sil", k); return sil.call(this, k); };
    });
    await s.addInitScript((fa) => {
      if (!sessionStorage.getItem("__ilk_belge")) { sessionStorage.setItem("__ilk_belge", "1"); localStorage.setItem("firma:secim", JSON.stringify(fa)); return; }
      window.addEventListener("load", () => {
        if (window.__App && window.__ReactDOMClient) window.__ReactDOMClient.createRoot(document.getElementById("kok")).render(window.__React.createElement(window.__App));
      });
    }, FA);
    await s.route(/\/(rest|auth|functions)\/v1\//, async (r) => {
      const h = host(r.request().url());
      if (h === HA) return r.fulfill(await kA.__yanitla(r.request()));
      if (h === HB) return r.fulfill(await kB.__yanitla(r.request()));
      return r.abort();
    });
    await s.route("**/firmalar.json**", (r) => r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ surum: 1, firmalar: { [ozet(FA.kod)]: { url: FA.url, anahtar: FA.anahtar }, [ozet(FB.kod)]: { url: FB.url, anahtar: FB.anahtar } } }) }));
  } });
  if (process.env.TESHIS) sayfa.on("console", (m) => { if (m.text().startsWith("IZ ")) console.log(m.text()); });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  const hazir = () => sayfa.waitForFunction(() => document.body && document.querySelector("#kok") && document.querySelector("#kok").children.length > 0
    && !document.body.innerText.includes("Yükleniyor") && !document.querySelector("[data-firma-gecis]"), null, { timeout: 30000 }).then(() => true).catch(() => false);
  // giriş ekranı: Supabase oturumu yoksa uygulama giriş ister (kullanıcı adı + şifre → /auth/v1/token, köprü yerel jeton verir)
  const girisIstendi = async () => (await sayfa.locator('input[type="password"]:visible').count()) > 0;
  const girisYap = async () => {
    await sayfa.locator('input:not([type="password"]):visible').first().fill("Ali"); await sayfa.locator('input[type="password"]:visible').first().fill("yerel-sinama");
    await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click();
    await sayfa.waitForFunction(() => !document.querySelector('input[type="password"]'), null, { timeout: 15000 }).catch(() => {});
    await hazir(); await sayfa.waitForTimeout(1500);
  };
  // ── ekran yardımcıları (ekran-stok.js / ekran-kasa.js ile aynı yollar) ──
  const stokAc = async () => { await O.modulAc(sayfa, "Stok"); await sayfa.waitForTimeout(700); };
  const formAc = async () => {
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(400); }
    const var_ = await sayfa.waitForFunction((u) => !!document.querySelector(`[data-stok-giris-urun] option[value="${u}"]`), URUN, { timeout: 20000 }).then(() => true).catch(() => false);
    if (!var_) {   // teşhis: ürün listesi gelmediyse ne görünüyor (sonra selectOption hatayla durur)
      console.log("TESHIS ürün yok · seçenekler:", JSON.stringify(await sayfa.locator("[data-stok-giris-urun] option").allInnerTexts()),
        "· yükleme:", await sayfa.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, " | ")),
        "· son istekler:", JSON.stringify(ag.slice(-15).map((x) => `${x.m} ${x.yol}`)));
    }
    await sayfa.locator("[data-stok-giris-urun]").first().selectOption(URUN); await sayfa.waitForTimeout(250);
  };
  const mevcut = async () => {
    await stokAc(); await formAc();
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await sayfa.waitForTimeout(250);
    const t = await sayfa.locator('[data-stok-giris-miktar="40"]').first().evaluate((i) => i.closest("label").innerText);
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(300);
    return Number((t.match(/mevcut:\s*(-?[\d.,]+)/) || [])[1]);
  };
  const stokGir = async (miktar) => {
    await stokAc(); await formAc();
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await sayfa.waitForTimeout(250);
    await sayfa.locator('[data-stok-giris-miktar="40"]').first().fill(String(miktar));
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
  const urunler = async () => {
    await stokAc();
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(400); }
    const t = await sayfa.locator("[data-stok-giris-urun] option").allInnerTexts();
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(300);
    return t.join(" | ");
  };
  const secimKodu = () => sayfa.evaluate(() => (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod) || "");
  // TEK TIKLA geçiş + geçişin tamamında ağ denetimi
  const firmaDegistir = async (kod, eskiHost, yeniHost) => {
    await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await sayfa.waitForTimeout(600);
    await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yedek & Bulut" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    await sayfa.waitForTimeout(500);
    await sayfa.click("[data-firma-satiri] [data-firma-degistir]");
    await sayfa.fill("[data-firma-kodu]", kod);
    const eskiLoader = belgeler.length ? belgeler[belgeler.length - 1].loader : null;   // tıklama anındaki belge
    const belgeOnce = belgeler.length;
    const tik = Date.now();
    await sayfa.click("[data-firma-uygula]");                                          // TEK tıklama — yeniden deneme yok
    const gecti = await sayfa.waitForFunction((k) => (JSON.parse(localStorage.getItem("firma:secim") || "{}").kod || "") === k
      && document.querySelector("#kok") && document.querySelector("#kok").children.length > 0 && !document.querySelector("[data-firma-gecis]"), kod, { timeout: 30000 })
      .then(() => true).catch(() => false);
    await hazir(); await sayfa.waitForTimeout(1500);
    const yeniBelgeler = belgeler.slice(belgeOnce);
    const eskiBelgeIstekleri = ag.filter((x) => x.t >= tik && x.loader === eskiLoader);
    const yeniBelgeIstekleri = ag.filter((x) => x.t >= tik && yeniBelgeler.some((b) => b.loader === x.loader));
    return {
      gecti, secim: await secimKodu(), yeniLoaderlar: yeniBelgeler.map((b) => b.loader),
      belgeSayisi: yeniBelgeler.length,
      yenidenDeneme: yeniBelgeler.filter((b) => /firma_deneme=/.test(b.url)).length,
      baslatan: yeniBelgeler.map((b) => b.baslatan),
      eskiBelgedenYeniFirmaya: [...new Set(eskiBelgeIstekleri.filter((x) => x.host === yeniHost).map((x) => `${x.m} ${x.yol}`))],
      eskiBelgedenEskiFirmayaYazma: eskiBelgeIstekleri.filter((x) => x.host === eskiHost && yazmaMi(x)).map((x) => `${x.m} ${x.yol}`),
      eskiBelgedenEskiFirmayaOkuma: eskiBelgeIstekleri.filter((x) => x.host === eskiHost && (x.m === "GET" || x.m === "HEAD")).length,
      yeniBelgedenEskiFirmaya: yeniBelgeIstekleri.filter((x) => x.host === eskiHost).map((x) => `${x.m} ${x.yol}`),
      yeniBelgedenYeniFirmaya: yeniBelgeIstekleri.filter((x) => x.host === yeniHost).length,
      sahipsizIstek: ag.filter((x) => x.t >= tik && x.loader !== eskiLoader && !yeniBelgeler.some((b) => b.loader === x.loader)).length,
    };
  };
  const rapor = (ad, g) => {
    if (process.env.TESHIS) console.log("TESHIS sahipsiz:", JSON.stringify([...new Set(ag.filter((x) => !belgeler.some((b) => b.loader === x.loader)).map((x) => `${x.m} ${x.yol} loader=${String(x.loader).slice(0, 8)}`))].slice(0, 12)));
    console.log(`    ${ad}: yeni belge ${g.belgeSayisi} (yeniden deneme ${g.yenidenDeneme}) · başlatan ${JSON.stringify(g.baslatan)} · eski belgeden eski firmaya okuma ${g.eskiBelgedenEskiFirmayaOkuma} · yeni belgeden yeni firmaya ${g.yeniBelgedenYeniFirmaya} istek`);
  };
  const sunucuStok = async (k) => Number(((await k.sorgu(`select coalesce(sum(miktar), 0)::float as m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' and olcu_ad = '40'`, [URUN]))[0] || {}).m);
  const sunucuKasa = async (k) => Number((await k.sorgu(`select coalesce(sum(case when h.veri->>'yon' = 'Giriş' then (h.veri->>'tutar')::numeric else -(h.veri->>'tutar')::numeric end), 0)::float as b
    from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = 'K1' and not h.iptal and (h.fis_id is null or not f.iptal)`))[0].b);

  console.log(`ekran-firma-ayrimi · A=${DB_A} B=${DB_B} · istemci ${await sayfa.evaluate(() => window.__SURUM || document.title)}`);
  console.log("1) normal açılış: firma A, oturum yok");
  await sayfa.waitForTimeout(1500);
  k_("açılış firması", await secimKodu(), "firmaa");
  k_("A · oturum yokken giriş istenir", await girisIstendi(), true);
  if (process.env.TESHIS) console.log("TESHIS girişten önce A yazmaları:", JSON.stringify([...new Set(ag.filter((x) => x.host === HA && x.m !== "GET" && x.m !== "HEAD").map((x) => `${x.m} ${x.yol} loader=${String(x.loader).slice(0, 6)}`))]));
  if (process.env.TESHIS) console.log("TESHIS belgeler:", JSON.stringify(belgeler.map((b) => `${String(b.loader).slice(0, 6)} ${b.url}`)));
  k_("A · girişten önce A'ya veri yazması yok", ag.filter((x) => x.host === HA && yazmaMi(x)).map((x) => `${x.m} ${x.yol}`), []);
  await girisYap();
  k_("A · giriş sonrası uygulama açık (giriş ekranı yok)", await girisIstendi(), false);
  k_("A · oturum A'nın jetonuyla", await sayfa.evaluate(() => !!localStorage.getItem("atolye:oturum")), true);
  const kasaA0 = await sunucuKasa(kA); const kasaB0 = await sunucuKasa(kB);
  k_("A · mevcut (başlangıç)", await mevcut(), 0);
  await stokGir(3);
  k_("A · sunucu A stok", await sunucuStok(kA), 3);
  k_("A · sunucu B stok (dokunulmadı)", await sunucuStok(kB), 0);
  k_("A · ekran mevcut", await mevcut(), 3);
  await tahsilat("Ekran Gelir", 150);
  k_("A · sunucu A kasa +150", await sunucuKasa(kA) - kasaA0, 150);
  k_("A · sunucu B kasa (dokunulmadı)", await sunucuKasa(kB) - kasaB0, 0);
  k_("A · ürünlerde A'nınki var, B'ninki yok", await urunler().then((t) => [t.includes("A Firması Botu"), t.includes("B Firması Çantası")]), [true, false]);
  k_("A · B'nin adresine hiç istek gitmedi (açılıştan beri)", ag.filter((x) => x.host === HB).length, 0);
  console.log("1b) A'da sıradan sayfa yenileme: oturum sürer");
  const anahtarlar = () => sayfa.evaluate(() => Object.keys(localStorage).filter((k) => /oturum|firma/.test(k)).map((k) => k + "=" + String(localStorage.getItem(k)).slice(0, 80)));
  if (process.env.TESHIS) console.log("TESHIS yenileme öncesi:", JSON.stringify(await anahtarlar()));
  await sayfa.reload(); await hazir(); await sayfa.waitForTimeout(1500);
  if (process.env.TESHIS) console.log("TESHIS yenileme sonrası anahtarlar:", JSON.stringify(await anahtarlar()));
  if (process.env.TESHIS) { console.log("TESHIS yenileme sonrası:", JSON.stringify((await sayfa.evaluate(() => document.body.innerText)).slice(0, 600)));
    await sayfa.screenshot({ path: process.env.TESHIS + "/yenileme.png" }); }
  k_("A · yenilemeden sonra giriş istenmez", await girisIstendi(), false);
  if (await girisIstendi()) await girisYap();
  k_("A · yenilemeden sonra ekran mevcut", await mevcut(), 3);

  console.log("2) firma B'ye geçiş (tek tık)");
  const g1 = await firmaDegistir("firmab", HA, HB);
  rapor("geçiş A→B", g1);
  k_("A→B · tek tıkla geçti", g1.gecti, true);
  k_("A→B · seçim", g1.secim, "firmab");
  k_("A→B · yeniden açılışı başlatan firmaDegistirVeYenile ← uygula", g1.baslatan[0] && /firmaDegistirVeYenile←uygula/.test(g1.baslatan[0]), true);
  k_("A→B · eski belgeden yeni firmaya yalnız bağlantı denemesi", g1.eskiBelgedenYeniFirmaya, ["GET /auth/v1/settings"]);
  k_("A→B · eski belgeden eski firmaya yazma yok", g1.eskiBelgedenEskiFirmayaYazma, []);
  k_("A→B · yeni belgelerden eski firmaya istek yok", g1.yeniBelgedenEskiFirmaya, []);
  k_("A→B · belgesi belirsiz istek yok", g1.sahipsizIstek, 0);
  k_("B · oturum yok: giriş istenir (A'nın oturumu B'ye taşınmadı)", await girisIstendi(), true);
  await girisYap();
  k_("B · giriş sonrası uygulama açık", await girisIstendi(), false);
  k_("B · ekran mevcut (A'nın 3'ü görünmez)", await mevcut(), 0);
  k_("B · ürünlerde B'ninki var, A'nınki yok", await urunler().then((t) => [t.includes("B Firması Çantası"), t.includes("A Firması Botu")]), [true, false]);
  await stokGir(9);
  k_("B · sunucu B stok", await sunucuStok(kB), 9);
  k_("B · sunucu A stok (hâlâ 3)", await sunucuStok(kA), 3);
  k_("B · ekran mevcut", await mevcut(), 9);
  k_("B oturumu boyunca (giriş + stok girişi dahil) A'nın adresine istek yok", ag.filter((x) => x.host === HA && g1.yeniLoaderlar.includes(x.loader)).length, 0);

  console.log("3) firma A'ya dönüş (tek tık)");
  const g2 = await firmaDegistir("firmaa", HB, HA);
  rapor("geçiş B→A", g2);
  k_("B→A · tek tıkla geçti", g2.gecti, true);
  k_("B→A · seçim", g2.secim, "firmaa");
  k_("B→A · eski belgeden yeni firmaya yalnız bağlantı denemesi", g2.eskiBelgedenYeniFirmaya, ["GET /auth/v1/settings"]);
  k_("B→A · eski belgeden eski firmaya yazma yok", g2.eskiBelgedenEskiFirmayaYazma, []);
  k_("B→A · yeni belgelerden eski firmaya istek yok", g2.yeniBelgedenEskiFirmaya, []);
  k_("B→A · belgesi belirsiz istek yok", g2.sahipsizIstek, 0);
  k_("A · saklanan oturum geri geldi: giriş istenmez", await girisIstendi(), false);
  if (await girisIstendi()) { console.log("    (giriş istendi — sonraki denetimler için giriş yapılıyor)"); await girisYap(); }
  k_("A · ekran mevcut (B'nin 9'u görünmez)", await mevcut(), 3);
  k_("A · ürünlerde A'nınki var, B'ninki yok", await urunler().then((t) => [t.includes("A Firması Botu"), t.includes("B Firması Çantası")]), [true, false]);
  k_("A oturumu (dönüşten sonra) boyunca B'nin adresine istek yok", ag.filter((x) => x.host === HB && g2.yeniLoaderlar.includes(x.loader)).length, 0);
  k_("son hâl · sunucu A / B stok", [await sunucuStok(kA), await sunucuStok(kB)], [3, 9]);
  k_("sayfa hatası yok", hatalar, []);

  await tarayici.close(); await kA.kapat(); await kB.kapat();
  console.log(`── ekran-firma-ayrimi: ${gecen} geçti, ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA:", e.message); process.exit(2); });
