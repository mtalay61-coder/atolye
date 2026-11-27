#!/usr/bin/env node
// EKRAN SINAMASI — YAYIN ÖNCESİ SÜRÜM GEÇİŞİ: 1.744.37 → 1.744.44 → 1.744.45 (geri dönüş istemcisi), SUNUCUDA DÖRT PAKET KURULUYKEN (27 Kasım).
//
// SORU: yayında `surum.json` 1.744.44'ü gösterince açık cihazlar ona geçiyor mu; bir sorun çıkarsa `surum.json` 1.744.45'e çevrilince
// (1.744.37 kodu, yalnız sürüm numarası yüksek) cihazlar ona da geçiyor mu; bu sırada oturum, giriş ve temel kayıt bozuluyor mu; sunucudaki
// dört paket (B4/B5, B3a, B3a-2, ret iletisi) baştan sona kurulu kalıyor mu. Uygulama düşük numaraya DÖNMEZ (`surumDahaYeniMi`) — geri
// dönüşün "daha yüksek numaralı eski kod" olmasının nedeni bu; son adım bunu da ölçer.
//
// DÜZEN: tek köken (https://yalitilmis-sinama.invalid/), üç yayın dosyası ve `surum.json` aynı klasörden sunulur — GitHub Pages'teki gibi.
// `surum.json`'un içeriği adım adım değiştirilir; geçişi UYGULAMA yapar (sınama yalnız sayfayı yeniler ve adresi izler).
//   • PostgreSQL kipi (varsayılan): canlıya hizalı ekran tabanının taze kopyası + dört kurulum dosyası CRLF satır sonuyla (canlıdaki
//     yapıştırma koşulu). Oturum köprünün sahte jetonu; "giriş" burada yalnız "oturum geçişte korunuyor mu" diye ölçülür.
//   • Gerçek API kipi (KOPRU_SUPABASE; yerel Supabase: Kong → PostgREST / GoTrue): giriş EKRANDAN, gerçek Auth hesabıyla yapılır.
// İki kip de bu makinede çalışır; buluttaki hiçbir projeye istek gitmez (yasak adres sayacı 0 olmalı).
//
// KAPSAM DIŞI (bilerek): bütün senaryo takımı (kosu.sh 275/275 iki istemcide ayrıca koştu), yetki matrisi, iki cihaz yarışı. Burada
// yalnız sürüm geçişi + giriş + temel kayıt (ürün adı ve satış fiyatı, Yönetici; ürün adı, yalnız stok yetkili personel).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const GERCEK = !!process.env.KOPRU_SUPABASE;
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const { kopruKur } = require("../gercek-pg-kopru.js");
const { Client } = require(process.env.KOPRU_PG || "pg");

const KOKDIZIN = path.join(__dirname, "..", "..");
const G = path.join(KOKDIZIN, "stok-v2", "guvenlik");
const KOK = "https://yalitilmis-sinama.invalid/";
const YASAK = /mqdgucoomgqcvhvgixbl|drtmnovafswzcmpacubl/;
const TABAN = "inc_ekran_taban";
const URUN = "ekr-bot";
// beklenen özetler: yayındaki, aday, geri dönüş — tutmazsa sınama başlamaz (yanlış dosyayı sınamış olmayalım)
const PAKETLER = { "1.744.37": "bc6912c22a062d1c7e0b012257839dac3e2b86aab0e9f5eb1b7ab5052fbe458a", "1.744.44": "b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8",
  "1.744.45": "37c20323e6ccc9bb2afac2428143b94a22ff1dc970169965f2f65570e872f299" };
const SQL = [["27-b4-uygula.sql", "f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d"], ["28-b3a-uygula.sql", "15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250"],
  ["29-b3a2-uygula.sql", "ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f"], ["31-yetki-ileti-uygula-satirsonu.sql", "98b4c1b4b3265984cafe627f777cf20119be08097e884f6b86954b8e0a046bad"]];
const SONUC = path.join(__dirname, GERCEK ? "sonuc-ekran-surum-gecis-supabase.txt" : "sonuc-ekran-surum-gecis.txt");

const satirlar = [];
const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const bulgular = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else { kalan += 1; bulgular.push(ad); }
  yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); return ok; };
const kisa = (s, n = 200) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const epostasi = (ad) => String(ad).toLowerCase().replace(/[çğıiöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" })[h]).replace(/[^a-z0-9._-]/g, "") + "@atolye.local";
const dosyaAdi = (s) => `atolye-erp-v${s}.html`;
const govdeler = {};
for (const [s, ozet] of Object.entries(PAKETLER)) { govdeler[s] = fs.readFileSync(path.join(KOKDIZIN, dosyaAdi(s))); if (sha(govdeler[s]) !== ozet) throw new Error(`${dosyaAdi(s)} özeti tutmuyor: ${sha(govdeler[s])}`); }
for (const [d, ozet] of SQL) if (sha(fs.readFileSync(path.join(G, d))) !== ozet) throw new Error(`${d} özeti tutmuyor`);

// yayın klasörü: surum.json'un o anki içeriği (bütün oturumlar aynı "yayını" görür)
let yayin = "1.744.37";
const dis = { yasak: [], kesilen: new Map() };

// ── VERİTABANI
const pgYonet = async (sql) => { const pg = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" });
  await pg.connect(); try { for (const s of sql) await pg.query(s); } finally { await pg.end(); } };
const acikKopyalar = [];
const tabanKur = async (db) => {
  if (GERCEK) { yaz("  " + execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim().replace(/\n/g, " · ")); return; }
  await pgYonet([`drop database if exists ${db}`, `create database ${db} template ${TABAN}`]); acikKopyalar.push(db);
  const gecici = fs.mkdtempSync(path.join(require("os").tmpdir(), "surum-gecis-"));
  for (const [d] of SQL) {   // CRLF: SQL Editor'e yapıştırmanın canlıda ürettiği satır sonu
    const crlf = path.join(gecici, d); fs.writeFileSync(crlf, fs.readFileSync(path.join(G, d), "utf8").replace(/\r?\n/g, "\r\n"));
    const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", crlf], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n");
    yaz(`  ${d} (CRLF) → ${c[c.length - 1].trim()}`);
  }
};
// dört paketin izi: tetikleyiciler, B4 işlevleri, ret iletisinin yeni metni; gövde özeti CR'den arındırılarak (LF / CRLF aynı sayılsın)
const paketIzi = async (q) => (await q(`select
  (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru' and not tgisinternal)::int b3a,
  (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru' and not tgisinternal)::int b3a2,
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'b4\\_%')::int b4,
  (select md5(string_agg(proname || ':' || md5(replace(prosrc, chr(13), '')), ',' order by proname, oid)) from pg_proc
     where pronamespace = 'public'::regnamespace and (proname like 'b4\\_%' or proname like 'b3a%' or proname in ('yetki_var_mi', 'yetki_iste', 'uretim_teslim_al', 'uretim_teslim_geri_al', 'uretim_isi_ver'))) govde`))[0];

async function hazirBekle(c) {
  let ust = 0, sifreUst = 0;
  for (let i = 0; i < 90; i++) {
    const d = await c.sayfa.evaluate(() => ({ menu: document.querySelectorAll("[data-nav]").length, yukleniyor: document.body.innerText.includes("Yükleniyor"),
      sifre: [...document.querySelectorAll('input[type="password"]')].some((x) => x.offsetParent !== null) })).catch(() => ({}));
    // giriş ekranı ancak art arda 3 bakışta (≈3 sn) duruyorsa "giriş istendi" sayılır — açılışta bir an çizilen ekran sayılmaz
    if (d.sifre && ++sifreUst < 3) { ust = 0; await c.sayfa.waitForTimeout(1000); continue; }
    if (!d.sifre) sifreUst = 0;
    if (d.sifre) { sifreUst = 0; c.girisSayisi += 1; c.girisEkranlari.push(await c.sayfa.title());
      try { await c.sayfa.locator('input:not([type="password"]):visible').first().fill(c.kullanici); await c.sayfa.locator('input[type="password"]:visible').first().fill("yerel-sinama");
        await c.sayfa.locator("button", { hasText: "Giriş Yap" }).first().click(); await c.sayfa.waitForTimeout(3000); } catch (e) { /* ekran değişti */ } ust = 0; continue; }
    if (d.menu && !d.yukleniyor) { ust += 1; if (ust >= 2) return true; } else ust = 0;
    await c.sayfa.waitForTimeout(1000);
  }
  return false;
}
const toplayiciKur = (sayfa) => sayfa.evaluate(() => { window.__gcBildirim = [];
  const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__gcBildirim.includes(t)) window.__gcBildirim.push(t); });
  new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
const bildirim = async (c) => kisa((await c.sayfa.evaluate(() => { const a = (window.__gcBildirim || []).slice(); if (window.__gcBildirim) window.__gcBildirim.length = 0; return a; }).catch(() => [])).join(" | ") || "(bildirim yok)", 400);

// oturum = bir tarayıcı (bir cihaz). `ilk` sürümün adresi açılır; surum.json daha yenisini söylüyorsa uygulama kendisi geçer.
async function ac(db, kullanici, ilk) {
  const eposta = epostasi(kullanici);
  const k = kopruKur({ veritabani: db });
  const tarayici = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    env: { ...process.env, LANG: process.env.LANG || "C.UTF-8", LC_ALL: process.env.LC_ALL || "C.UTF-8" } });
  const baglam = await tarayici.newContext({ viewport: { width: 1400, height: 950 } });
  const c = { tarayici, baglam, k, q: (s, p) => k.sorgu(s, p), hatalar: [], eposta, kullanici, yazmalar: [], girisSayisi: 0, girisEkranlari: [], surumIstekleri: 0, gezinmeler: [] };
  baglam.on("request", (r) => { if (YASAK.test(r.url())) dis.yasak.push(r.url().slice(0, 80)); });
  await baglam.route(/^https?:\/\//, (r) => {
    const u = r.request().url();
    if (/^https:\/\/(esm\.sh|fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(u)) return r.continue();
    const s = (u.match(/^https?:\/\/([^/]+)/) || [])[1]; dis.kesilen.set(s, (dis.kesilen.get(s) || 0) + 1); return r.abort("blockedbyclient");
  });
  // YAYIN KLASÖRÜ: surum.json + üç sürüm dosyası; başka her şey 404 (manifest, ikon, sw — sınamada yok)
  await baglam.route(KOK + "**", (r) => { const ad = r.request().url().slice(KOK.length).replace(/\?.*$/, "");
    if (ad === "surum.json") { c.surumIstekleri += 1; return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ surum: yayin, url: dosyaAdi(yayin), not: "sınama" }) }); }
    const s = Object.keys(PAKETLER).find((x) => dosyaAdi(x) === ad);
    return s ? r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: govdeler[s] }) : r.fulfill({ status: 404, body: "" }); });
  await baglam.addInitScript((e) => {
    localStorage.setItem("firma:secim", JSON.stringify({ kod: "yalitilmis", ad: "YALITILMIŞ SINAMA", url: "https://yalitilmissinama00.supabase.co", anahtar: "sb_publishable_yalitilmis_yerel_sinama" }));
    if (e && !localStorage.getItem("atolye:oturum")) localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e }));
  }, GERCEK ? null : eposta);
  await sekme(c);
  await c.sayfa.goto(KOK + dosyaAdi(ilk));
  return c;
}
// yeni sekme (aynı cihaz: yerel depo ortak, sessionStorage sekmeye özel — döngü koruması sekme başınadır)
async function sekme(c) {
  const sayfa = await c.baglam.newPage(); c.sayfa = sayfa;
  sayfa.on("pageerror", (e) => c.hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", async (d) => { try { await d.accept(); } catch (e) { /* kapanmış */ } });
  sayfa.on("framenavigated", (f) => { if (f === sayfa.mainFrame()) c.gezinmeler.push(f.url().slice(KOK.length)); });
  sayfa.on("response", async (y) => { const r = y.request(); const u = r.url(); if (!/\/rest\/v1\//.test(u) || ["GET", "HEAD", "OPTIONS"].includes(r.method())) return;
    const kayit = { m: r.method(), yol: decodeURIComponent(u.replace(/^.*\/rest\/v1\//, "")), durum: y.status(), surum: r.headers()["x-atolye-surum"] || "", kim: String(r.headers().authorization || "") };
    if (GERCEK && /sb_publishable/.test(kayit.kim)) return;   // giriş öncesi anon istek (site_kayit_listesi 401; paketlerle ilgisiz)
    c.yazmalar.push(kayit);
    if (y.status() >= 400) { try { const j = JSON.parse(await y.text()); kayit.kod = j.code; kayit.ileti = j.message; } catch (e) { /* gövde yok */ } } });
  await c.k.bagla(sayfa);
  return sayfa;
}
// sayfa `beklenen` sürümün adresine yerleşene ve uygulama hazır olana kadar bekle; döner: { adres, baslik, hazir }
async function yerles(c, beklenen, sn = 45) {
  for (let i = 0; i < sn * 2; i++) { if (c.sayfa.url() === KOK + dosyaAdi(beklenen)) break; await uyu(500); }
  const hazir = await hazirBekle(c);
  await c.sayfa.waitForTimeout(2500);   // açılıştaki sürüm bakışı (surum.json + bulut) bitsin: geçiş olacaksa şimdi olur
  if (c.sayfa.url() !== KOK + dosyaAdi(beklenen)) { await uyu(4000); await hazirBekle(c); }
  await toplayiciKur(c.sayfa).catch(() => {});
  return { adres: c.sayfa.url().slice(KOK.length), baslik: await c.sayfa.title(), hazir };
}
// aynı sürümde düz yenileme: yeni cihazın ilk yenilemesinde giriş bir kez daha istenir (mevcut davranış), ikincisinde istenmez
async function yerlestir(c, ad) {
  const surum = (c.sayfa.url().match(/v([\d.]+)\.html/) || [])[1];
  const n0 = c.girisSayisi; await c.sayfa.reload(); await yerles(c, surum); const ilk = c.girisSayisi - n0;
  const n1 = c.girisSayisi; await c.sayfa.reload(); await yerles(c, surum); const ikinci = c.girisSayisi - n1;
  yaz(`     (bilgi) sürüm değişmeden yenileme, ${surum}: ilk yenilemede giriş ${ilk} kez istendi · ikinci yenilemede ${ikinci} kez`);
  k_(`${ad} yerleşik cihaz: aynı sürümde yenilemede oturum korunuyor (giriş istenmedi)`, ikinci, 0);
}
const modulAc = async (c, ad) => { const ok = await c.sayfa.evaluate((a) => { const b = document.querySelector(`[data-nav="${a}"]`); if (b) b.click(); return !!b; }, ad); await c.sayfa.waitForTimeout(1200); return ok; };
const urunSatiri = async (c) => (await c.q(`select ad, satis_fiyati::float sf from public.urunler where id = $1`, [URUN]))[0];
const urunKartiAc = async (c) => {
  const s = c.sayfa;
  if (!(await modulAc(c, "Ürün Stok"))) return false;
  for (let tur = 0; tur < 3; tur++) {
    await s.evaluate(() => { const el = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && /^Ekran Bot/.test((x.textContent || "").trim()) && x.offsetParent);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } } if (el) el.click(); });
    await s.waitForTimeout(1500);
    if (await s.locator('[data-kart-eylem="duzenle"]:visible').count()) break;
  }
  const duzenle = s.locator('[data-kart-eylem="duzenle"]:visible');
  if (!(await duzenle.count())) return false;
  await duzenle.first().click(); await s.waitForTimeout(1200);
  return (await s.locator('[data-kart-eylem="kaydet"]:visible').count()) > 0;
};
const KUTU = { ad: ["^Ürün Adı", false], satis: ["^Satış", true] };
const kutu = (c, a) => c.sayfa.evaluate(({ a, desen, sayiMi }) => { const re = new RegExp(desen);
  const i = [...document.querySelectorAll("label input")].find((x) => x.offsetParent && (sayiMi ? x.type === "number" : x.type === "text") && re.test((x.closest("label").textContent || "").trim()));
  if (!i) return null; document.querySelectorAll(`[data-gecis-kutu="${a}"]`).forEach((x) => x.removeAttribute("data-gecis-kutu")); i.setAttribute("data-gecis-kutu", a);
  return { deger: i.value, kapali: i.disabled }; }, { a, desen: KUTU[a][0], sayiMi: KUTU[a][1] });
// TEMEL KAYIT: ürün kartında alan(lar)ı değiştir, Kaydet; döner { yazmalar (urunler), sonra (sunucudaki satır), bildirim, satisKutusu }
async function urunKaydet(c, degisiklik) {
  if (!(await urunKartiAc(c))) return { hata: "ürün kartı açılamadı" };
  const satisKutusu = await kutu(c, "satis");
  for (const [a, v] of Object.entries(degisiklik)) { if (!(await kutu(c, a))) return { hata: `"${a}" kutusu yok` }; await c.sayfa.locator(`[data-gecis-kutu="${a}"]`).fill(String(v)); await c.sayfa.waitForTimeout(250); }
  await bildirim(c);
  const sinir = c.yazmalar.length;
  await c.sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click();
  for (let i = 0; i < 24; i++) { if (c.yazmalar.slice(sinir).some((y) => /^urunler/.test(y.yol))) break; await uyu(500); }
  await c.sayfa.waitForTimeout(2000);
  return { yazmalar: c.yazmalar.slice(sinir).filter((y) => /^urunler/.test(y.yol)), sonra: await urunSatiri(c), bildirim: await bildirim(c), satisKutusu: satisKutusu ? (satisKutusu.kapali ? "KAPALI" : "AÇIK") : "YOK" };
}
const yazmaOzeti = (y) => `${y.m} ${kisa(y.yol, 70)} [istemci ${y.surum || "?"}] → HTTP ${y.durum}${y.kod ? ` · ${y.kod} · ${kisa(y.ileti, 160)}` : ""}`;
const redler = (c) => c.yazmalar.filter((y) => y.durum >= 400);

(async () => {
  yaz(`ekran-surum-gecis · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase: Kong → PostgREST / GoTrue; giriş ekrandan)" : "PostgreSQL kipi (köprü; dört paket CRLF kurulum)"}`);
  for (const s of Object.keys(PAKETLER)) yaz(`  ${dosyaAdi(s)} · sha256 ${PAKETLER[s]} · ${govdeler[s].length} bayt`);
  const db = "surum_gecis";
  yaz(`\n■ 0 SUNUCU · ${GERCEK ? "yerel Supabase, veri sıfırlandı" : `${db} (şablon ${TABAN})`} · dört paket kurulur`);
  await tabanKur(db);

  // ════════ A · YÖNETİCİ (Ali): 37 → 44 → 45, her sürümde kayıt
  yaz(`\n■ A YÖNETİCİ · Ali · surum.json = 1.744.37`);
  yayin = "1.744.37";
  const a = await ac(db, "Ali", "1.744.37");
  let y = await yerles(a, "1.744.37");
  const iz0 = await paketIzi(a.q);
  k_("A0 dört paket kurulu [b3a tetikleyici, b3a2 tetikleyici, b4 işlev > 0]", [iz0.b3a > 0, iz0.b3a2 > 0, iz0.b4 > 0], [true, true, true]);
  k_("A1 yayındaki sürüm açıldı: adres ve sekme başlığı 1.744.37", [y.adres, /1\.744\.37/.test(y.baslik), y.hazir], [dosyaAdi("1.744.37"), true, true]);
  if (GERCEK) k_("A1 giriş ekrandan, gerçek Auth hesabıyla yapıldı (1 kez)", a.girisSayisi, 1);
  // YERLEŞİK CİHAZ (yalnız gerçek API kipi): yeni cihazda ilk giriş "bulut ön giriş" ekranından yapılır ve uygulama kullanıcı oturumunu
  // (`oturum:aktif`) o yolda SAKLAMAZ — sonraki ilk yenilemede normal giriş ekranı bir kez daha gelir, ondan sonra oturum korunur.
  // Bu, yayındaki 1.744.37'nin davranışıdır (sürüm değişmeden ölçülür); geçiş ölçümüne karışmasın diye cihaz önce yerleştirilir.
  if (GERCEK) { await yerlestir(a, "A1"); }
  const giris0 = a.girisSayisi;

  yaz(`\n  → YAYIN: surum.json = 1.744.44 · sayfa yenilenir (cihazda uygulamanın yeniden açılması)`);
  yayin = "1.744.44"; a.gezinmeler.length = 0;
  await a.sayfa.reload(); y = await yerles(a, "1.744.44");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("A2 uygulama kendiliğinden 1.744.44'e geçti (adres + başlık)", [y.adres, /1\.744\.44/.test(y.baslik), y.hazir], [dosyaAdi("1.744.44"), true, true]);
  k_("A2 oturum korundu: geçişte yeniden giriş istenmedi", a.girisSayisi - giris0, 0);
  k_("A2 aday istemcinin kancaları var [window.__fiyatYetki, window.__fisIptalGizli]", await a.sayfa.evaluate(() => [typeof window.__fiyatYetki, typeof window.__fisIptalGizli].map((x) => x !== "undefined")), [true, true]);
  let r = await urunKaydet(a, { ad: "Ekran Bot s44", satis: "144.44" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")} · bildirim: ${r.bildirim || ""}`);
  k_("A3 1.744.44'te temel kayıt (ürün adı + satış fiyatı, Yönetici) sunucuya yazıldı", r.hata || [r.sonra.ad, r.sonra.sf], ["Ekran Bot s44", 144.44]);
  k_("A3 yazma 1.744.44 istemcisinden gitti, reddedilen yok", r.hata || [r.yazmalar.length > 0, r.yazmalar.every((x) => x.surum === "1.744.44"), r.yazmalar.filter((x) => x.durum >= 400).length], [true, true, 0]);
  const modul44 = []; for (const m of ["Üretim", "Siparişler", "Cariler", "Fişler", "Anasayfa"]) if (await modulAc(a, m)) modul44.push(m);
  yaz(`     gezilen modüller: ${modul44.join(" · ")}`);
  k_("A3 1.744.44'te modüller açılıyor, sayfa hatası yok", [modul44.length >= 3, a.hatalar], [true, []]);

  yaz(`\n  → GERİ DÖNÜŞ: surum.json = 1.744.45 · sayfa yenilenir`);
  yayin = "1.744.45"; a.gezinmeler.length = 0;
  await a.sayfa.reload(); y = await yerles(a, "1.744.45");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("A4 uygulama kendiliğinden 1.744.45'e geçti (adres + başlık)", [y.adres, /1\.744\.45/.test(y.baslik), y.hazir], [dosyaAdi("1.744.45"), true, true]);
  k_("A4 oturum korundu: geçişte yeniden giriş istenmedi", a.girisSayisi - giris0, 0);
  k_("A4 geri dönüş istemcisi eski kod: aday kancaları YOK", await a.sayfa.evaluate(() => [typeof window.__fiyatYetki, typeof window.__fisIptalGizli]), ["undefined", "undefined"]);
  r = await urunKaydet(a, { ad: "Ekran Bot s45", satis: "145.45" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")} · bildirim: ${r.bildirim || ""}`);
  k_("A5 1.744.45'te temel kayıt (ürün adı + satış fiyatı, Yönetici) sunucuya yazıldı", r.hata || [r.sonra.ad, r.sonra.sf], ["Ekran Bot s45", 145.45]);
  k_("A5 yazma 1.744.45 istemcisinden gitti, reddedilen yok", r.hata || [r.yazmalar.length > 0, r.yazmalar.every((x) => x.surum === "1.744.45"), r.yazmalar.filter((x) => x.durum >= 400).length], [true, true, 0]);
  const modul45 = []; for (const m of ["Üretim", "Siparişler", "Cariler", "Fişler", "Anasayfa"]) if (await modulAc(a, m)) modul45.push(m);
  k_("A5 1.744.45'te modüller açılıyor, sayfa hatası yok", [modul45.length >= 3, a.hatalar], [true, []]);

  // 1.744.44'ün adresi elle açılırsa (yer imi, eski kısayol): yeni sekmede yine 1.744.45'e gider
  yaz(`\n  → ESKİ ADRES: yeni sekmede ${dosyaAdi("1.744.44")} açılır (surum.json = 1.744.45)`);
  a.gezinmeler.length = 0; await a.sayfa.close(); await sekme(a); await a.sayfa.goto(KOK + dosyaAdi("1.744.44")); y = await yerles(a, "1.744.45");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")}`);
  k_("A6 1.744.44 adresi açılınca 1.744.45'e geçildi", [y.adres, /1\.744\.45/.test(y.baslik)], [dosyaAdi("1.744.45"), true]);
  a.gezinmeler.length = 0; await a.sayfa.close(); await sekme(a); await a.sayfa.goto(KOK + dosyaAdi("1.744.37")); y = await yerles(a, "1.744.45");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")}`);
  k_("A6 1.744.37 adresi açılınca 1.744.45'e geçildi (aradaki sürüm atlanır)", [y.adres, /1\.744\.45/.test(y.baslik)], [dosyaAdi("1.744.45"), true]);

  // DÜŞÜK NUMARAYA DÖNÜLMEZ: surum.json 1.744.44'e (ya da 37'ye) geri çevrilse bile 1.744.45 yerinde kalır
  yaz(`\n  → TERS YÖN: surum.json = 1.744.44, sonra 1.744.37 · 1.744.45 yenilenir`);
  const ters = [];
  for (const s of ["1.744.44", "1.744.37"]) { yayin = s; await a.sayfa.reload(); y = await yerles(a, "1.744.45", 8); ters.push(y.adres); }
  k_("A7 1.744.45 düşük numaralı sürüme DÖNMEDİ (geri dönüş yalnız daha yüksek numarayla olur)", ters, [dosyaAdi("1.744.45"), dosyaAdi("1.744.45")]);
  k_("A sayfa hatası yok · reddedilen yazma yok (bütün oturum)", [a.hatalar, redler(a).map(yazmaOzeti)], [[], []]);
  yaz(`     surum.json okuma sayısı: ${a.surumIstekleri} · toplam yazma: ${a.yazmalar.length}`);
  await a.tarayici.close();

  // ════════ B · PERSONEL (Ayşe, yalnız stok): 44'te açık cihaz → 45'e geri dönüş; fiyat dışı kayıt iki sürümde de geçer
  yaz(`\n■ B PERSONEL · Ayşe (yalnız stok) · surum.json = 1.744.44 → 1.744.45`);
  yayin = "1.744.44";
  const b = await ac(db, "Ayşe", "1.744.37");   // cihazda eski adres kayıtlı: açılışta 44'e geçmeli
  y = await yerles(b, "1.744.44");
  yaz(`     gezinme: ${b.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("B1 eski adresle açılan cihaz 1.744.44'e geçti", [y.adres, /1\.744\.44/.test(y.baslik), y.hazir], [dosyaAdi("1.744.44"), true, true]);
  if (GERCEK) { k_("B1 giriş ekrandan yapıldı (1 kez; geçiş girişten önce ya da sonra olabilir)", b.girisSayisi, 1); await yerlestir(b, "B1"); }
  const girisB = b.girisSayisi;
  r = await urunKaydet(b, { ad: "Ekran Bot p44" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")} · satış kutusu ${r.satisKutusu} · bildirim: ${r.bildirim || ""}`);
  k_("B2 1.744.44: personel ürün adını kaydetti; fiyat değişmedi; satış kutusu KAPALI; reddedilen yok", r.hata || [r.sonra.ad, r.sonra.sf, r.satisKutusu, r.yazmalar.filter((x) => x.durum >= 400).length], ["Ekran Bot p44", 145.45, "KAPALI", 0]);
  yayin = "1.744.45"; b.gezinmeler.length = 0;
  await b.sayfa.reload(); y = await yerles(b, "1.744.45");
  yaz(`     gezinme: ${b.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("B3 geri dönüş: 1.744.45'e geçti, yeniden giriş istenmedi", [y.adres, /1\.744\.45/.test(y.baslik), b.girisSayisi - girisB], [dosyaAdi("1.744.45"), true, 0]);
  r = await urunKaydet(b, { ad: "Ekran Bot p45" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")} · satış kutusu ${r.satisKutusu} · bildirim: ${r.bildirim || ""}`);
  k_("B4 1.744.45 (eski kod): personel ürün adını kaydetti; fiyat değişmedi; reddedilen yok", r.hata || [r.sonra.ad, r.sonra.sf, r.yazmalar.filter((x) => x.durum >= 400).length], ["Ekran Bot p45", 145.45, 0]);
  yaz(`     (bilgi) 1.744.45'te satış kutusu ${r.satisKutusu}: eski kodda kutu kapatılmaz; koruma sunucudadır (B3a-2) — bu sınamanın kapsamı değil`);
  k_("B sayfa hatası yok · reddedilen yazma yok (bütün oturum)", [b.hatalar, redler(b).map(yazmaOzeti)], [[], []]);

  // ════════ SUNUCU: dört paket baştan sona yerinde, gövdeler değişmedi
  const iz1 = await paketIzi(b.q);
  k_("S dört paket sınamanın sonunda da kurulu ve gövdeleri AYNI", [iz1.b3a, iz1.b3a2, iz1.b4, iz1.govde], [iz0.b3a, iz0.b3a2, iz0.b4, iz0.govde]);
  await b.tarayici.close(); await a.k.kapat().catch(() => {}); await b.k.kapat().catch(() => {});

  k_("buluttaki projelere (ana, G-25) giden istek yok", dis.yasak, []);
  yaz(`\nkesilen dış adresler: ${[...dis.kesilen].map(([s, n]) => `${s} ×${n}`).join(" · ") || "yok"}`);
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${bulgular.length ? "\nKALANLAR:\n  - " + bulgular.join("\n  - ") : ""}`);
  fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  if (!GERCEK && !process.env.GECIS_TUT) await pgYonet(acikKopyalar.map((d) => `drop database if exists ${d}`)).catch((e) => console.error("kopya silinemedi:", e.message));
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
