#!/usr/bin/env node
// EKRAN SINAMASI — B1/B2 YAYINI ÖNCESİ SÜRÜM GEÇİŞİ: 1.744.44 → 1.744.46 (B1 + B2) → 1.744.47 (geri dönüş: 1.744.44 kodu), SUNUCUDA BEŞ
// PAKET (B4/B5, B3a, B3a-2, ret iletisi, B1) KURULUYKEN (27 Kasım). ekran-surum-gecis.js'in (37 → 44 → 45) aynı düzeni; ek ölçümler:
//   • BEKLEYEN KAYIT: sunucuya gidemeyen yazma (ürün yazmaları geçici olarak 503 alır) bekleyen deftere düşer; sürüm geçişinden SONRA
//     defterde durur ve yeni sürümden gönderilir (44'te bekleyen 46'dan, 46'da bekleyen 47'den).
//   • B1 ad değişikliği 1.744.46'da yapılır; 1.744.47'ye (eski kod) dönüldükten sonra adlar ve bağlar yerinde, sunucu koruması
//     (eski adla gelen bayat yazmanın güncel ada çevrilmesi) eski istemciyle de çalışır — GERİ DÖNÜŞ İÇİN B1 SQL'İ KALDIRILMAZ.
//   • SUNUCU KORUMALARI: beş paketin izi (tetikleyiciler + fonksiyon gövdeleri, CR'siz) ve 41 numaralı durum sorgusunun çıktısı baştan
//     sona AYNI; yetkisiz hesapla fiyat / ad değişikliği başta ve sonda aynı kodla reddedilir.
// İki kip: yerel PostgreSQL (beş dosya CRLF kurulu) ve gerçek API kipi (KOPRU_SUPABASE: yerel Supabase, giriş ekrandan). Bulut yok.
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
const SORGU41 = path.join(G, "41-canli-paket-durum-salt-okur.sql"), ONKOSUL26 = path.join(G, "26-b1-onkosul-salt-okur.sql");
const URUN = "ekr-bot";
// beklenen özetler: yayındaki, aday, geri dönüş — tutmazsa sınama başlamaz (yanlış dosyayı sınamış olmayalım)
const PAKETLER = { "1.744.44": "b87afc137406202b5e6180c3b97f31139581d3e79238eda51b0cb4252418a7e8", "1.744.46": "29fa13c5de845a14ef263653d8c080518d52943c22a9d5d1bf07232dab549d9e",
  "1.744.47": "6fe659e97a3d07c5fc913082821bd8d300c34a9462223fbff10c1977a2c3b045" };
const SQL = [["27-b4-uygula.sql", "f49078f2361e8546d59e6a0b9c5d52e0ace6474c47663ef2615478e2b327645d"], ["28-b3a-uygula.sql", "15f1051d5c9f652ac99d091fb329aea67ef35ef10adb82fee1cbe31ba3d38250"],
  ["29-b3a2-uygula.sql", "ec3df68d922ba5d49e1f5b95bd795c4ff1982bd89472681a8c75df816a12986f"], ["31-yetki-ileti-uygula-satirsonu.sql", "98b4c1b4b3265984cafe627f777cf20119be08097e884f6b86954b8e0a046bad"],
  ["26-b1-uygula.sql", "ab9661824335b39d8a1cfc1bc3b1aa9ff79bcf04ea4ad85b2628c77a1d176108"]];
const SONUC = path.join(__dirname, GERCEK ? "sonuc-ekran-surum-gecis-46-supabase.txt" : "sonuc-ekran-surum-gecis-46.txt");

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
let yayin = "1.744.44";
const dis = { yasak: [], kesilen: new Map() };

// ── VERİTABANI
const pgYonet = async (sql) => { const pg = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" });
  await pg.connect(); try { for (const s of sql) await pg.query(s); } finally { await pg.end(); } };
const acikKopyalar = [];
const tabanKur = async (db) => {
  if (GERCEK) { yaz("  " + execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim().replace(/\n/g, " · "));
    const c = execFileSync("psql", ["-X", "-q", "-A", "-t", SB_PG, "-v", "ON_ERROR_STOP=1", "-f", path.join(G, "26-b1-uygula.sql"), "-c", "notify pgrst, 'reload schema'"], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n");
    yaz(`  26-b1-uygula → ${c[c.length - 1].trim()}`); await uyu(2000); return; }
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
  (select count(*) from pg_trigger where tgname in ('tanim_ad_guncelle', 'tanim_ad_gecmisi_koru') and not tgisinternal and tgenabled = 'O')::int b1,
  (select md5(string_agg(proname || ':' || md5(replace(prosrc, chr(13), '')), ',' order by proname, oid)) from pg_proc
     where pronamespace = 'public'::regnamespace and (proname like 'b4\\_%' or proname like 'b3a%' or proname like 'tanim\\_%' or proname in ('yetki_var_mi', 'yetki_iste', 'uretim_teslim_al', 'uretim_teslim_geri_al', 'uretim_isi_ver'))) govde`))[0];

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

// 41 (dört paket) + 26 önkoşul (B1) durum sorgularının çıktısı — sınamanın başında ve sonunda birebir aynı olmalı
const durumSorgulari = (db) => [SORGU41, ONKOSUL26].map((f) => execFileSync("psql", GERCEK ? ["-X", "-q", "-A", "-t", SB_PG, "-f", f] : ["-X", "-q", "-A", "-t", "-U", "postgres", "-d", db, "-f", f],
  { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim()).join("\n");
// sayfanın kendi oturumuyla doğrudan sunucu çağrısı (koruma yoklaması)
const cagri = (c, yol, yontem, govde) => c.sayfa.evaluate(async ({ yol, yontem, govde }) => {
  const f = JSON.parse(localStorage.getItem("firma:secim") || "null"); const o = JSON.parse(localStorage.getItem("atolye:oturum") || "{}");
  const y = await fetch(`${f.url}/rest/v1/${yol}`, { method: yontem, headers: { "content-type": "application/json", apikey: f.anahtar, authorization: `Bearer ${o.erisim}` }, body: JSON.stringify(govde) });
  let j = null; try { j = await y.json(); } catch (e) { /* gövde yok */ } return [y.status >= 400, j && j.code]; }, { yol, yontem, govde });
const korumaYokla = async (c) => ({
  fiyat: await cagri(c, "urunler?id=eq.ekr-bot", "PATCH", { satis_fiyati: 999 }),
  adDegistir: await cagri(c, "rpc/tanim_renk_ad_degistir", "POST", { p: { renk_id: "r-siyah", yeni_ad: "Siyah X", eski_ad: "Siyah" } }),
  cariYaz: await cagri(c, "cariler?id=eq.inc-musteri", "PATCH", { unvan: "Değişti" }) });
const bekleyenler = (c) => c.sayfa.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")); } catch (e) { return ["(okunamadı)"]; } });
const kalemRenkleri = async (c) => (await c.q(`select array(select distinct renk from public.siparis_kalemleri order by 1) a`))[0].a;
const kopukKalem = async (c) => (await c.q(`select count(*)::int n from public.siparis_kalemleri kl where not exists (
  select 1 from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = kl.urun_id and r.aktif and r.ad = kl.renk)`))[0].n;
const renkAdlari = async (c) => (await c.q(`select array(select r ->> 'ad' from jsonb_array_elements(veri -> 'renkler') r order by 1) a from public.tanimlar where id = 'tekil'`))[0].a;
// BEKLEYEN KAYIT: ürün yazmaları 503 alırken ad değiştirilir → bekleyen deftere düşer. Döner: { defter, sunucudaAd }
async function bekleyenUret(c, ad) {
  c.engel = true;
  const r = await urunKaydet(c, { ad });
  await c.sayfa.waitForTimeout(3000);
  return { defter: await bekleyenler(c), sunucudaAd: (await urunSatiri(c)).ad, hata: r.hata, serit: await c.sayfa.locator("[data-bekleyen-yazma]").count() };
}
// engel kalkar; uygulama kendiliğinden göndermediyse şeritteki "Yeniden dene"ye basılır. Döner: { defter, sunucudaAd, elle }
async function bekleyenGonder(c) {
  c.engel = false; let elle = false;
  for (let i = 0; i < 20; i++) { if (!(await bekleyenler(c)).length) break; if (i === 4) { elle = await c.sayfa.evaluate(() => { const d = document.querySelector('[data-bekleyen-gonder="1"]'); if (d) d.click(); return !!d; }); } await uyu(1500); }
  await c.sayfa.waitForTimeout(1500);
  return { defter: await bekleyenler(c), sunucudaAd: (await urunSatiri(c)).ad, elle };
}
const engelKur = (c) => c.sayfa.route("**/rest/v1/urunler**", (r) => (c.engel && !["GET", "HEAD", "OPTIONS"].includes(r.request().method())
  ? r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "SINAMA503", message: "sınama: sunucu geçici olarak yanıt vermiyor" }) }) : r.fallback()));
const gercekRedler = (c) => c.yazmalar.filter((y) => y.durum >= 400 && y.kod !== "SINAMA503").map(yazmaOzeti);
const renkSekmesi = async (sayfa) => { await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-urun-alt="renk"]'); if (b) b.click(); }); await sayfa.waitForTimeout(600); };
const renkAdi = async (sayfa, eski, yeni) => { const kutu = sayfa.locator(`input[value="${eski}"]`).first(); await kutu.fill(yeni); await kutu.press("Enter"); };

(async () => {
  yaz(`ekran-surum-gecis-46 · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase: Kong → PostgREST / GoTrue; giriş ekrandan)" : "PostgreSQL kipi (köprü; beş paket CRLF kurulum)"}`);
  for (const s of Object.keys(PAKETLER)) yaz(`  ${dosyaAdi(s)} · sha256 ${PAKETLER[s]} · ${govdeler[s].length} bayt`);
  const db = "surum_gecis46";
  yaz(`\n■ 0 SUNUCU · ${GERCEK ? "yerel Supabase, veri sıfırlandı" : `${db} (şablon ${TABAN})`} · beş paket kurulur`);
  await tabanKur(db);

  // ════════ K0 · KORUMA YOKLAMASI (Ayşe, yalnız stok) — başlangıç
  yayin = "1.744.44";
  const p0 = await ac(db, "Ayşe", "1.744.44"); await yerles(p0, "1.744.44");
  const iz0 = await paketIzi(p0.q); const durum0 = durumSorgulari(db);
  yaz(`\n■ K0 sunucu durumu (başlangıç): ${durum0.split("\n").filter((x) => /GENEL/.test(x)).join(" · ")}`);
  k_("K0 beş paket kurulu [b3a, b3a2, b4 işlev, B1 tetikleyici > 0]", [iz0.b3a > 0, iz0.b3a2 > 0, iz0.b4 > 0, iz0.b1 > 0], [true, true, true, true]);
  const koruma0 = await korumaYokla(p0);
  yaz(`     yetkisiz yoklama (Ayşe): ${JSON.stringify(koruma0)}`);
  k_("K0 yetkisiz fiyat (KR040), ad değişikliği (42501) ve cari yazması reddediliyor", [koruma0.fiyat, koruma0.adDegistir, koruma0.cariYaz[0]], [[true, "KR040"], [true, "42501"], true]);
  await p0.tarayici.close(); await p0.k.kapat().catch(() => {});

  // ════════ A · YÖNETİCİ (Ali): 44 → 46 → 47
  yaz(`\n■ A YÖNETİCİ · Ali · surum.json = 1.744.44`);
  const a = await ac(db, "Ali", "1.744.44"); await engelKur(a);
  let y = await yerles(a, "1.744.44");
  k_("A1 yayındaki sürüm açıldı: 1.744.44", [y.adres, /1\.744\.44/.test(y.baslik), y.hazir], [dosyaAdi("1.744.44"), true, true]);
  if (GERCEK) { k_("A1 giriş ekrandan, gerçek Auth hesabıyla yapıldı (1 kez)", a.girisSayisi, 1); await yerlestir(a, "A1"); }
  const giris0 = a.girisSayisi;
  let r = await urunKaydet(a, { ad: "Ekran Bot s44", satis: "144.44" });
  k_("A1 1.744.44'te temel kayıt yazıldı", r.hata || [r.sonra.ad, r.sonra.sf], ["Ekran Bot s44", 144.44]);
  let b = await bekleyenUret(a, "Ekran Bot bekleyen-44");
  yaz(`     bekleyen kayıt (44'te üretildi): defter ${JSON.stringify(b.defter)} · şerit ${b.serit} · sunucudaki ad "${b.sunucudaAd}"`);
  k_("A2 gönderilemeyen kayıt bekleyen defterde, sunucuya gitmedi", [b.hata || null, b.defter.length > 0, b.sunucudaAd], [null, true, "Ekran Bot s44"]);

  yaz(`\n  → YAYIN: surum.json = 1.744.46 · sayfa yenilenir (bekleyen kayıt varken)`);
  yayin = "1.744.46"; a.gezinmeler.length = 0;
  await a.sayfa.reload(); y = await yerles(a, "1.744.46");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("A3 uygulama kendiliğinden 1.744.46'ya geçti; oturum korundu", [y.adres, /1\.744\.46/.test(y.baslik), y.hazir, a.girisSayisi - giris0], [dosyaAdi("1.744.46"), true, true, 0]);
  k_("A3 bekleyen kayıt geçişten sonra defterde duruyor, sunucu hâlâ eski değerde", [(await bekleyenler(a)).length > 0, (await urunSatiri(a)).ad], [true, "Ekran Bot s44"]);
  let g = await bekleyenGonder(a);
  yaz(`     gönderim: ${g.elle ? '"Yeniden dene" ile' : "kendiliğinden"} · defter ${JSON.stringify(g.defter)} · sunucudaki ad "${g.sunucudaAd}"`);
  k_("A4 44'te bekleyen kayıt 1.744.46'dan gönderildi, defter boşaldı", [g.defter, g.sunucudaAd], [[], "Ekran Bot bekleyen-44"]);
  r = await urunKaydet(a, { ad: "Ekran Bot s46", satis: "146.46" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")}`);
  k_("A4 1.744.46'da temel kayıt yazıldı (yazma 1.744.46'dan, ret yok)", r.hata || [r.sonra.ad, r.sonra.sf, r.yazmalar.every((x) => x.surum === "1.744.46"), r.yazmalar.filter((x) => x.durum >= 400).length], ["Ekran Bot s46", 146.46, true, 0]);
  // B1: ad değişikliği 1.744.46'da, sunucu işlemiyle
  await renkSekmesi(a.sayfa); const adOnce = a.yazmalar.length;
  await renkAdi(a.sayfa, "Vizon Yılan", "Vizon Deri"); await a.sayfa.waitForTimeout(9000);
  k_("A5 1.744.46: renk adı sunucu işlemiyle değişti (B1), kalemler yeni adda, kopuk bağ yok",
    [a.yazmalar.slice(adOnce).filter((x) => /tanim_renk_ad_degistir/.test(x.yol)).map((x) => x.durum), await renkAdlari(a), await kalemRenkleri(a), await kopukKalem(a)], [[200], ["Siyah", "Vizon Deri"], ["1054 - Siyah/Vizon Deri"], 0]);
  b = await bekleyenUret(a, "Ekran Bot bekleyen-46");
  yaz(`     bekleyen kayıt (46'da üretildi): defter ${JSON.stringify(b.defter)} · sunucudaki ad "${b.sunucudaAd}"`);
  k_("A6 1.744.46'da gönderilemeyen kayıt bekleyen defterde", [b.hata || null, b.defter.length > 0, b.sunucudaAd], [null, true, "Ekran Bot s46"]);

  yaz(`\n  → GERİ DÖNÜŞ: surum.json = 1.744.47 · sayfa yenilenir (bekleyen kayıt varken; B1 SQL'i sunucuda KALIR)`);
  yayin = "1.744.47"; a.gezinmeler.length = 0;
  await a.sayfa.reload(); y = await yerles(a, "1.744.47");
  yaz(`     gezinme: ${a.gezinmeler.join(" → ")} · başlık "${y.baslik}"`);
  k_("A7 uygulama kendiliğinden 1.744.47'ye geçti; oturum korundu", [y.adres, /1\.744\.47/.test(y.baslik), y.hazir, a.girisSayisi - giris0], [dosyaAdi("1.744.47"), true, true, 0]);
  k_("A7 bekleyen kayıt geçişten sonra defterde duruyor", [(await bekleyenler(a)).length > 0, (await urunSatiri(a)).ad], [true, "Ekran Bot s46"]);
  g = await bekleyenGonder(a);
  yaz(`     gönderim: ${g.elle ? '"Yeniden dene" ile' : "kendiliğinden"} · defter ${JSON.stringify(g.defter)} · sunucudaki ad "${g.sunucudaAd}"`);
  k_("A8 46'da bekleyen kayıt 1.744.47'den gönderildi, defter boşaldı", [g.defter, g.sunucudaAd], [[], "Ekran Bot bekleyen-46"]);
  r = await urunKaydet(a, { ad: "Ekran Bot s47", satis: "147.47" });
  yaz(`     kayıt: ${r.hata || (r.yazmalar.map(yazmaOzeti).join(" | ") || "(ürün yazması yok)")}`);
  k_("A8 1.744.47'de temel kayıt yazıldı (yazma 1.744.47'den, ret yok)", r.hata || [r.sonra.ad, r.sonra.sf, r.yazmalar.every((x) => x.surum === "1.744.47"), r.yazmalar.filter((x) => x.durum >= 400).length], ["Ekran Bot s47", 147.47, true, 0]);
  k_("A9 geri dönüşten sonra 46'da değiştirilen ad ve bağlar YERİNDE (geri dönüş veriyi geri çevirmez)", [await renkAdlari(a), await kalemRenkleri(a), await kopukKalem(a)], [["Siyah", "Vizon Deri"], ["1054 - Siyah/Vizon Deri"], 0]);
  // eski kodlu istemci + B1 kurulu sunucu: eski adla gelen yeni kalem (bayat cihaz) yine güncel ada çevrilir
  const kr = await a.sayfa.evaluate(async () => { const f = JSON.parse(localStorage.getItem("firma:secim")); const o = JSON.parse(localStorage.getItem("atolye:oturum"));
    const yn = await fetch(`${f.url}/rest/v1/rpc/alt_yaz`, { method: "POST", headers: { "content-type": "application/json", apikey: f.anahtar, authorization: `Bearer ${o.erisim}` },
      body: JSON.stringify({ p: { siparis_kalemleri: { satirlar: [{ id: "kl-bayat-47", siparis_id: "sp-inc-1", urun_id: "inc-bot", urun_ad: "İnceleme Bot", renk: "1054 - Siyah/Vizon Yılan", beden: "40", miktar: 1, sira: 9 }] } } }) }); return yn.status; });
  k_("A9 1.744.47 açıkken eski adla yazılan kalem sunucuda güncel ada bağlandı (B1 koruması eski istemciyle de çalışıyor)",
    [kr, (await a.q(`select renk from public.siparis_kalemleri where id = 'kl-bayat-47'`)).map((x) => x.renk), await kopukKalem(a)], [200, ["1054 - Siyah/Vizon Deri"], 0]);
  // TERS YÖN: 1.744.47 düşük numaraya (46) dönmez
  yayin = "1.744.46"; await a.sayfa.reload(); y = await yerles(a, "1.744.47", 8);
  k_("A10 surum.json 1.744.46'ya çevrilse de 1.744.47 yerinde kaldı", y.adres, dosyaAdi("1.744.47"));
  // yeni sekmede 46 adresi → 47
  yayin = "1.744.47"; a.gezinmeler.length = 0; await a.sayfa.close(); await sekme(a); await a.sayfa.goto(KOK + dosyaAdi("1.744.46")); y = await yerles(a, "1.744.47");
  k_("A10 1.744.46 adresi elle açılınca 1.744.47'ye geçildi", [y.adres, a.gezinmeler.join(" → ")], [dosyaAdi("1.744.47"), `${dosyaAdi("1.744.46")} → ${dosyaAdi("1.744.47")}`]);
  k_("A sayfa hatası yok · sınama engeli dışında reddedilen yazma yok", [a.hatalar, gercekRedler(a)], [[], []]);
  yaz(`     toplam yazma: ${a.yazmalar.length} · sınama engeliyle 503: ${a.yazmalar.filter((x) => x.kod === "SINAMA503").length}`);
  await a.tarayici.close();

  // ════════ K1 · KORUMA YOKLAMASI ve SUNUCU DURUMU — son
  yayin = "1.744.47";
  const p1 = await ac(db, "Ayşe", "1.744.44"); y = await yerles(p1, "1.744.47");
  k_("K1 personelin cihazı (eski adres) doğrudan 1.744.47'ye geçti", y.adres, dosyaAdi("1.744.47"));
  const koruma1 = await korumaYokla(p1);
  yaz(`\n■ K1 yetkisiz yoklama (Ayşe, son): ${JSON.stringify(koruma1)}`);
  k_("K1 yetkisiz yoklamalar baştakiyle AYNI kodlarla reddedildi", koruma1, koruma0);
  k_("K1 yoklamalar veriyi değiştirmedi (fiyat, renk adı, cari)", [(await urunSatiri(p1)).sf, (await renkAdlari(p1)).includes("Siyah"), (await p1.q(`select unvan from public.cariler where id = 'inc-musteri'`))[0].unvan], [147.47, true, "İnceleme Müşteri"]);
  const iz1 = await paketIzi(p1.q); const durum1 = durumSorgulari(db);
  k_("S beş paketin tetikleyicileri ve fonksiyon gövdeleri sınama boyunca AYNI", [iz1.b3a, iz1.b3a2, iz1.b4, iz1.b1, iz1.govde], [iz0.b3a, iz0.b3a2, iz0.b4, iz0.b1, iz0.govde]);
  k_("S 41 (dört paket) ve 26 önkoşul (B1) durum sorgularının çıktısı baştakiyle AYNI", durum1 === durum0, true);
  yaz(`     sunucu durumu (son): ${durum1.split("\n").filter((x) => /GENEL/.test(x)).join(" · ")}`);
  k_("S eski ad defteri: 46'daki ad değişikliği kayıtlı", (await p1.q(`select count(*)::int n from public.tanim_ad_gecmisi where renk_id = 'r-vizon'`))[0].n, 1);
  await p1.tarayici.close(); await a.k.kapat().catch(() => {}); await p1.k.kapat().catch(() => {});

  k_("buluttaki projelere (ana, G-25) giden istek yok", dis.yasak, []);
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${bulgular.length ? "\nKALANLAR:\n  - " + bulgular.join("\n  - ") : ""}`);
  fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  if (!GERCEK && !process.env.GECIS_TUT) await pgYonet(acikKopyalar.map((d) => `drop database if exists ${d}`)).catch((e) => console.error("kopya silinemedi:", e.message));
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
