#!/usr/bin/env node
// EKRAN SINAMASI — GEÇİŞ UYUMLULUĞU: ÜÇ GÜVENLİK PAKETİ (B4, B3a, B3a-2) KURULDUKTAN SONRA AÇIK KALMIŞ ESKİ SEKME (27 Kasım).
// Soru: paketler sunucuya kurulduğunda, hâlâ YAYINDAKİ 1.744.37 istemcisini çalıştıran sekmeler nasıl davranıyor?
//   (a) meşru kayıtlar reddediliyor mu · (b) eski istemci korumayı aşabiliyor mu · (c) kullanıcı reddi ekranda nasıl görüyor.
// İstemci: YAYINLANMIŞ paketin kendisi (atolye-erp-v1.744.37.html; SHA-256 çıktıya yazılır, YAYIN_SHA verilmişse denetlenir).
// 1.744.37'de window.__fiyatYetki YOK ve ürün kartındaki fiyat kutuları herkese AÇIK — istemci kısıtı yok, koruma yalnız sunucuda.
// Sunucu: yalnız YEREL PostgreSQL (gercek-pg-kopru). Her senaryo şablondan TAZE kopyada koşar; şablonlara yazılmaz:
//   aday_a = canlıya hizalı taban + ekran tohumu + üç paket · inc_ekran_taban = aynı taban, PAKETSİZ (yalnız G2).
// Hesaplar: Ayşe = yalnız stok (görüntüleme + düzenleme + kaydetme) · Ali = Yönetici.
//
// NEDEN yayin-ekran.js'in `ekranAc`'ı kullanılmadı: o koşucu "uygulama hazır" için [data-nav="Üretim"] bekler; yalnız stok yetkili
// Ayşe'nin menüsünde Üretim YOK, 90 sn sonra "yayın paketi açılmadı" diye düşer. Koşucu değiştirilemediği için (sınır: yalnız bu
// dosya + sonuç dosyası) açılış burada AYNI yalıtımla yeniden yazıldı; tek fark hazır ölçütü: herhangi bir [data-nav] + "Yükleniyor" yok.
// Yalıtım (yayin-ekran.js ile aynı): sayfa var olmayan bir kökenden verilir; firma seçimi sahte <ref>.supabase.co; /rest · /auth ·
// /functions köprüyle yerel PostgreSQL'e; dışarı yalnız esm.sh (yayın paketi React / lucide / xlsx'i oradan yükler) ve yazı tipleri;
// başka HER istek kesilir. Canlı (mqdg…) ve G-25 deneme (drtm…) projelerine giden istek / WebSocket SAYILIR — 0 olmalı.
//
// SENARYOLAR
//   G1 AÇILIŞ (paketli): Ayşe ve Ali açar, bütün modülleri gezer, ~12 sn bekler → sunucunun reddettiği YAZMA olmamalı.
//   G2 PAKET KURULURKEN AÇIK SEKME: sekme paketsiz veritabanında açılır; aynı veritabanına 27 → 28 → 29 kurulur; sekme
//      YENİLENMEDEN Ayşe ürün adını değiştirip kaydeder → geçmeli.
//   G3 MEŞRU ÜRÜN KAYDI (paketli): Ayşe fiyat DIŞI alanları (ad, stok kodu) değiştirir → geçmeli (eski istemci satırı fiyatlarla yollar).
//   G4 KORUMA AŞILABİLİYOR MU: Ayşe SATIŞ (G4s) / ALIŞ (G4a) fiyatını + adı değiştirip kaydeder → 42501, sunucuda HİÇBİRİ yazılmaz.
//      Kaydedilen: bildirim, ekranda beliren yeni satırlar, 30 sn içinde yeniden gönderim sayısı, yenilemeden sonra ekran / yeniden gönderim.
//   G5 YÖNETİCİ: Ali satış + alış fiyatını değiştirir → geçmeli.
//   G6 YENİ ÜRÜN (Ayşe): fiyatsız → geçmeli; satış fiyatlı → reddedilmeli.
//   G7 STOK GİRİŞ FİŞİ (Ayşe): bağımsız stok girişi → geçmeli (B4'lü fis_kes + B3a).
// Kural: beklenenden farklı çıkan kontrol EĞİLMEZ — ✗ kalır ve BULGU olarak (istek, HTTP durumu, kod, ileti, bildirim) yazılır.
//
// Kullanım: PGHOST=localhost KOPRU_PG=<pg modülü> PW_CHROMIUM=<chromium> node test/inceleme/ekran-gecis-1744-37.js
//   YAYIN_HTML (vars. depo kökündeki atolye-erp-v1.744.37.html) · YAYIN_SHA (verilirse denetlenir) · GECIS_TUT=1 → kopyalar silinmez
//   GECIS_SENARYO=G4s,G5 → yalnız seçilenler (teşhis için; sonuç dosyası yalnız TAM koşuda yazılır).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { kopruKur } = require("../gercek-pg-kopru.js");
const { Client } = require(process.env.KOPRU_PG || "pg");

const KOKDIZIN = path.join(__dirname, "..", "..");
const HTML = process.env.YAYIN_HTML || path.join(KOKDIZIN, "atolye-erp-v1.744.37.html");
const SONUC = path.join(__dirname, "sonuc-ekran-gecis-1744-37.txt");
const KOK = "https://yalitilmis-sinama.invalid/";
const YASAK = /mqdgucoomgqcvhvgixbl|drtmnovafswzcmpacubl/;
const PAKETLI = "aday_a", PAKETSIZ = "inc_ekran_taban";
const PAKET_SQL = ["27-b4-uygula.sql", "28-b3a-uygula.sql", "29-b3a2-uygula.sql"].map((x) => path.join(KOKDIZIN, "stok-v2", "guvenlik", x));
const URUN = "ekr-bot";
const SECILI = process.env.GECIS_SENARYO ? process.env.GECIS_SENARYO.split(",") : null;
const kos = (ad) => !SECILI || SECILI.includes(ad);

// ── ÇIKTI: ekrana ve sonuç dosyasına (psql NOTICE satırları stderr'dedir, buraya hiç girmez)
const satirlar = [];
const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const bulgular = [], yapilamayan = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  yaz(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const bulgu = (m) => { bulgular.push(m); yaz(`     ‼ BULGU: ${m}`); };
const yapilamadi = (ad, neden) => { kalan += 1; yapilamayan.push(`${ad}: ${neden}`); yaz(`  ✗ [${ad}] ekrandan yapılamadı: ${neden}`); };
const kisa = (s, n = 200) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

// ── DIŞ İSTEK SAYACI (bütün oturumlar): yasak projeler · izinli dış kaynak (esm.sh, yazı tipi) · kesilen başka adresler
const dis = { yasak: [], izinli: new Map(), kesilen: new Map() };
const say = (m, a) => m.set(a, (m.get(a) || 0) + 1);

const govde = fs.readFileSync(HTML);
const SHA = crypto.createHash("sha256").update(govde).digest("hex");
// DİKKAT: yayin-ekran.js'in e-posta türetmesi Türkçe harfi atar ("Ayşe" → aye@…; tohumdaki hesap ayse@…) — oradaki ön oturum Ayşe için
// GEÇERSİZ kalır, uygulama listede olmayan hesapla açılıp reddedilen yazmalar üretir. Burada ortak-ekran.js'in çevirisi kullanılır.
const epostasi = (ad) => String(ad).toLowerCase().replace(/[çğıiöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" })[h]).replace(/[^a-z0-9._-]/g, "") + "@atolye.local";

// ── VERİTABANI: taze kopya (şablon değişmez), paket durumu, paket kurulumu
const pgYonet = async (sql) => { const pg = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" });
  await pg.connect(); pg.on("notice", () => {}); try { for (const s of sql) await pg.query(s); } finally { await pg.end(); } };
const acikKopyalar = [];
const kopya = async (db, sablon) => { await pgYonet([`drop database if exists ${db}`, `create database ${db} template ${sablon}`]); acikKopyalar.push(db); };
const paketDurum = async (q) => { const r = (await q(`select (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru')::int a,
  (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru')::int b, (select count(*) from pg_proc where proname like 'b4\\_%')::int c`))[0]; return [r.a, r.b, r.c]; };
// paket kur: psql'in SON stdout satırı (GENEL|KURULU) döner; NOTICE'lar stderr'de kalır ve yazılmaz
const paketKur = (db, dosya) => { const cikti = execFileSync("psql", ["-X", "-q", "-A", "-t", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", dosya],
  { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return cikti[cikti.length - 1].trim(); };

// ── UYGULAMA HAZIR: herhangi bir menü öğesi var, "Yükleniyor" yok, giriş ekranı yok — art arda iki bakışta. Giriş ekranı çıkarsa giriş yapılır.
async function hazirBekle(sayfa, kullanici) {
  let ust = 0;
  for (let i = 0; i < 90; i++) {
    const d = await sayfa.evaluate(() => ({ menu: document.querySelectorAll("[data-nav]").length, yukleniyor: document.body.innerText.includes("Yükleniyor"),
      sifre: [...document.querySelectorAll('input[type="password"]')].some((x) => x.offsetParent !== null) })).catch(() => ({}));
    if (d.sifre) { try { await sayfa.locator('input:not([type="password"]):visible').first().fill(kullanici); await sayfa.locator('input[type="password"]:visible').first().fill("yerel-sinama");
      await sayfa.locator("button", { hasText: "Giriş Yap" }).first().click(); await sayfa.waitForTimeout(3000); } catch (e) { /* ekran değişti */ } ust = 0; continue; }
    if (d.menu && !d.yukleniyor) { ust += 1; if (ust >= 2) return true; } else ust = 0;
    await sayfa.waitForTimeout(1000);
  }
  return false;
}
// bildirim toplayıcı: bildirimler birkaç saniyede kaybolur; sayfada biriktirilir (yenilemeden sonra yeniden kurulur)
const toplayiciKur = (sayfa) => sayfa.evaluate(() => { window.__gcBildirim = [];
  const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__gcBildirim.includes(t)) window.__gcBildirim.push(t); });
  new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });

async function ac(db, kullanici) {
  const eposta = epostasi(kullanici);
  const k = kopruKur({ veritabani: db });
  const tarayici = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    env: { ...process.env, LANG: process.env.LANG || "C.UTF-8", LC_ALL: process.env.LC_ALL || "C.UTF-8" } });
  const sayfa = await tarayici.newPage({ viewport: { width: 1400, height: 950 } });
  const c = { tarayici, sayfa, k, q: (s, p) => k.sorgu(s, p), hatalar: [], eposta, kullanici, pencereler: [], yazmalar: [], db };
  sayfa.on("pageerror", (e) => c.hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", async (d) => { c.pencereler.push(`${d.type()}: ${kisa(d.message(), 200)}`); try { await d.accept(); } catch (e) { /* kapanmış */ } });
  sayfa.context().on("request", (r) => { if (YASAK.test(r.url())) dis.yasak.push(r.url().slice(0, 80)); });
  sayfa.on("websocket", (w) => { if (YASAK.test(w.url())) dis.yasak.push("ws " + w.url().slice(0, 80)); });
  // YAZMA KAYDI: uygulamanın gönderdiği her REST yazması — yöntem, yol + sorgu, gövde, yanıt durumu / kod / ileti, zaman
  sayfa.on("response", async (y) => { const r = y.request(); const u = r.url(); if (!/\/rest\/v1\//.test(u) || ["GET", "HEAD", "OPTIONS"].includes(r.method())) return;
    const kayit = { z: Date.now(), m: r.method(), yol: decodeURIComponent(u.replace(/^.*\/rest\/v1\//, "")), durum: y.status(), govde: r.postData() || "", prefer: r.headers().prefer || "", kim: String(r.headers().authorization || "").replace(/^Bearer\s+(yerel-test:)?/i, ""), surumBasligi: r.headers()["x-atolye-surum"] || "" };
    c.yazmalar.push(kayit);
    if (y.status() >= 400) { try { const j = JSON.parse(await y.text()); kayit.kod = j.code; kayit.ileti = j.message; } catch (e) { /* gövde yok */ } } });
  await sayfa.context().route(/^https?:\/\//, (r) => {
    const u = r.request().url(); const sunucu = (u.match(/^https?:\/\/([^/]+)/) || [])[1];
    if (/^https:\/\/(esm\.sh|fonts\.googleapis\.com|fonts\.gstatic\.com)\//.test(u)) { say(dis.izinli, sunucu); return r.continue(); }
    say(dis.kesilen, sunucu); return r.abort("blockedbyclient");
  });
  await sayfa.route(KOK + "**", (r) => (r.request().url() === KOK + path.basename(HTML)
    ? r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: govde }) : r.fulfill({ status: 404, body: "" })));
  await sayfa.addInitScript((e) => {
    localStorage.setItem("firma:secim", JSON.stringify({ kod: "yalitilmis", ad: "YALITILMIŞ SINAMA", url: "https://yalitilmissinama00.supabase.co", anahtar: "sb_publishable_yalitilmis_yerel_sinama" }));
    if (!localStorage.getItem("atolye:oturum")) localStorage.setItem("atolye:oturum", JSON.stringify({ erisim: `yerel-test:${e}`, yenileme: `yerel-test:${e}`, sonaErme: Date.now() + 864e5, email: e }));
  }, eposta);
  await k.bagla(sayfa);
  await sayfa.goto(KOK + path.basename(HTML));
  if (!(await hazirBekle(sayfa, kullanici))) throw new Error("yayın paketi açılmadı: " + kisa(await sayfa.evaluate(() => document.body.innerText), 300));
  await sayfa.waitForTimeout(1500);
  await toplayiciKur(sayfa);
  c.menu = await sayfa.evaluate(() => [...document.querySelectorAll("[data-nav]")].map((x) => x.getAttribute("data-nav")));
  c.surum = await sayfa.evaluate(() => document.title);
  c.fiyatBayragi = await sayfa.evaluate(() => typeof window.__fiyatYetki);
  c.jeton = await sayfa.evaluate(() => (JSON.parse(localStorage.getItem("atolye:oturum") || "{}").erisim) || "");
  yaz(`     ${kullanici} · ${eposta} · sekme başlığı "${c.surum}" · jeton ${c.jeton} · window.__fiyatYetki: ${c.fiyatBayragi} · menü: ${c.menu.join(" · ")}`);
  return c;
}
const yenile = async (c) => { await c.sayfa.reload(); await hazirBekle(c.sayfa, c.kullanici); await c.sayfa.waitForTimeout(1500); await toplayiciKur(c.sayfa); };
const kapat = async (c, ad) => {
  k_(`${ad}: sayfa hatası yok`, c.hatalar, []);
  if (c.pencereler.length) yaz(`     tarayıcı pencereleri: ${c.pencereler.join(" | ")}`);
  await c.tarayici.close(); await c.k.kapat().catch(() => {});
};
const modulAc = async (c, ad) => { const ok = await c.sayfa.evaluate((a) => { const b = document.querySelector(`[data-nav="${a}"]`); if (b) b.click(); return !!b; }, ad); await c.sayfa.waitForTimeout(1200); return ok; };
const bildirim = async (c) => kisa((await c.sayfa.evaluate(() => { const a = (window.__gcBildirim || []).slice(); if (window.__gcBildirim) window.__gcBildirim.length = 0; return a; })).join(" | ") || "(bildirim yok)", 500);
const ekranSatirlari = (c) => c.sayfa.evaluate(() => document.body.innerText.split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean));
const bekle = async (kosul, sn = 15) => { for (let i = 0; i < sn * 2; i++) { try { if (await kosul()) return true; } catch (e) { /* yeniden */ } await uyu(500); } return false; };
const yazmaOzeti = (y) => `${y.m} ${kisa(y.yol, 90)} [${y.kim}] → HTTP ${y.durum}${y.kod ? ` · ${y.kod}` : ""}${y.ileti ? ` · ${kisa(y.ileti, 220)}` : ""}`;
const redler = (c, sinir = 0) => c.yazmalar.slice(sinir).filter((y) => y.durum >= 400);
// gövdedeki sütun adları (satırın tamamı mı, yalnız değişen alan mı?)
const govdeAlanlari = (y) => { try { const j = JSON.parse(y.govde); const o = Array.isArray(j) ? j[0] : j; return o && typeof o === "object" ? Object.keys(o) : []; } catch (e) { return []; } };
const urunSatiri = async (c, id = URUN) => (await c.q(`select ad, stok_no, satis_fiyati::float sf, alis_fiyati::float af, surum from public.urunler where id = $1`, [id]))[0];
const satirDizi = (r) => [r.ad, r.sf, r.af];

// ── ÜRÜN KARTI: Ürün Stok › "<ad>…" kartı › Düzenle (ekran-b3a2-personel.js'deki yol)
const urunKartiAc = async (c, adDeseni = "^Ekran Bot") => {
  const s = c.sayfa;
  if (!(await modulAc(c, "Ürün Stok"))) return false;
  for (let tur = 0; tur < 3; tur++) {
    await s.evaluate((d) => { const re = new RegExp(d); const el = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && re.test((x.textContent || "").trim()) && x.offsetParent);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } } if (el) el.click(); }, adDeseni);
    await s.waitForTimeout(1500);
    if (await s.locator('[data-kart-eylem="duzenle"]:visible').count()) break;
  }
  const duzenle = s.locator('[data-kart-eylem="duzenle"]:visible');
  if (!(await duzenle.count())) return false;
  await duzenle.first().click(); await s.waitForTimeout(1200);
  return (await s.locator('[data-kart-eylem="kaydet"]:visible').count()) > 0;
};
// kart formundaki kutular: etiketi `desen` ile başlayan, görünür ilk <input> işaretlenir → { deger, kapali } ya da null
const kutu = async (c, anahtar, desen, sayiMi) => c.sayfa.evaluate(({ anahtar, desen, sayiMi }) => {
  const re = new RegExp(desen);
  const i = [...document.querySelectorAll("label input")].find((x) => x.offsetParent && (sayiMi ? x.type === "number" : x.type === "text") && re.test((x.closest("label").textContent || "").trim()));
  if (!i) return null; document.querySelectorAll(`[data-gecis-kutu="${anahtar}"]`).forEach((x) => x.removeAttribute("data-gecis-kutu"));
  i.setAttribute("data-gecis-kutu", anahtar); return { deger: i.value, kapali: i.disabled, baslik: i.title || "" };
}, { anahtar, desen, sayiMi });
const KUTU = { ad: ["^Ürün Adı", false], stokKodu: ["^Stok Kodu", false], alis: ["^Alış", true], satis: ["^Satış", true] };
const kutuOku = (c, a) => kutu(c, a, KUTU[a][0], KUTU[a][1]);
const kutuYaz = async (c, a, deger) => { const k = await kutuOku(c, a); if (!k) return false; await c.sayfa.locator(`[data-gecis-kutu="${a}"]`).fill(String(deger)); await c.sayfa.waitForTimeout(250); return true; };
const kartDegerleri = async (c) => { const o = {}; for (const a of ["ad", "alis", "satis"]) { const k = await kutuOku(c, a); o[a] = k ? k.deger : null; } return o; };
const kutuDurumu = async (c) => { const o = {}; for (const a of ["alis", "satis"]) { const k = await kutuOku(c, a); o[a] = k ? (k.kapali ? "KAPALI" : "AÇIK") : "YOK"; } return o; };
// Kaydet'e bas; ürün yazması (urunler) yanıtlanana ya da `sn` dolana kadar bekle
const kartKaydet = async (c, sn = 12) => {
  const sinir = c.yazmalar.length;
  await c.sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click();
  await bekle(async () => c.yazmalar.slice(sinir).some((y) => /^urunler/.test(y.yol)), sn);
  await c.sayfa.waitForTimeout(2000);
  return sinir;
};
// ürün kartında alan değiştir + kaydet; döner: { sinir, t0, once, sonra, bildirim, yeniSatirlar, formAcik }
const urunDuzenle = async (c, degisiklik) => {
  if (!(await urunKartiAc(c))) return null;
  const kutular = await kutuDurumu(c);
  const once = await urunSatiri(c);
  await bildirim(c);
  for (const [a, v] of Object.entries(degisiklik)) if (!(await kutuYaz(c, a, v))) return { hata: `kartta "${a}" kutusu bulunamadı`, kutular };
  const ekranOnce = await ekranSatirlari(c);
  const t0 = Date.now();
  const sinir = await kartKaydet(c);
  const ekranSonra = await ekranSatirlari(c);
  return { sinir, t0, once, sonra: await urunSatiri(c), kutular, bildirim: await bildirim(c),
    yeniSatirlar: ekranSonra.filter((x) => !ekranOnce.includes(x)), formAcik: (await c.sayfa.locator('[data-kart-eylem="kaydet"]:visible').count()) > 0 };
};
const urunYazmalari = (c, sinir) => c.yazmalar.slice(sinir).filter((y) => /^urunler/.test(y.yol));
const UYARI = /bekleyen|çakış|gönderileme|yazılamadı|kaydedileme|yetki|reddedil|oturumunuz|Yeniden dene|Yeniden giriş|diğer cihazlar|hata|başarısız/i;
const urunTam = async (c, id = URUN) => (await c.q(`select row_to_json(u) r from public.urunler u where id = $1`, [id]))[0].r;
const degisenSutunlar = (a, b) => Object.keys(b).filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));

(async () => {
  if (process.env.YAYIN_SHA && process.env.YAYIN_SHA !== SHA) throw new Error(`YAYIN_HTML özeti tutmuyor: ${SHA} ≠ ${process.env.YAYIN_SHA}`);
  yaz(`ekran-gecis-1744-37 · istemci ${path.basename(HTML)} · sha256 ${SHA} · ${govde.length} bayt`);
  yaz(`şablonlar: paketli ${PAKETLI} · paketsiz ${PAKETSIZ} · her senaryo taze kopyada (gecis_*)${SECILI ? ` · YALNIZ ${SECILI.join(", ")}` : ""}`);

  // ════════════════════════════════════════ G1 · AÇILIŞ ════════════════════════════════════════
  if (kos("G1")) for (const kullanici of ["Ayşe", "Ali"]) {
    const db = `gecis_g1_${kullanici === "Ali" ? "ali" : "ayse"}`;
    yaz(`\n■ G1 AÇILIŞ · ${kullanici} · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, kullanici);
    k_(`G1 ${kullanici}: üç paket kurulu [b3a_yazma_koru, b3a2_alan_koru, b4_* işlev]`, (await paketDurum(c.q)).map((x) => x > 0), [true, true, true]);
    k_(`G1 ${kullanici}: istemci 1.744.37, window.__fiyatYetki yok`, [/1\.744\.37/.test(c.surum), c.fiyatBayragi], [true, "undefined"]);
    const gezilen = [];
    for (const m of c.menu) { if (await modulAc(c, m)) gezilen.push(m); await c.sayfa.waitForTimeout(600); }
    await modulAc(c, "Anasayfa");
    await c.sayfa.waitForTimeout(12000);   // yoklama + gecikmeli açılış normalleştirmeleri
    const yazma = c.k.gunluk.filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m));
    const red = yazma.filter((x) => x.durum >= 400).map((x) => `${x.m} ${x.yol} ${x.durum} ${x.kod || ""} ${kisa(x.mesaj, 200)}`);
    yaz(`     gezilen ${gezilen.length} modül: ${gezilen.join(" · ")}`);
    yaz(`     yazma istekleri (${yazma.length}): ${Object.entries(yazma.reduce((o, x) => { const a = `${x.m} ${x.yol} ${x.durum}`; o[a] = (o[a] || 0) + 1; return o; }, {})).map(([a, n]) => `${a} ×${n}`).join(" ; ") || "—"}`);
    if (!k_(`G1 ${kullanici}: açılış + gezinti + 12 sn → sunucunun reddettiği YAZMA yok (${yazma.length} yazma)`, red, []))
      red.forEach((r) => bulgu(`G1 ${kullanici} — açılışta reddedilen yazma: ${r} · ekrandaki bildirim: ${"(aşağıda)"}`));
    // bilgi: reddedilen OKUMA (kontrol değil — ekran-stok.js'deki bilinen isteğe bağlı tablolar olabilir)
    const okumaRet = c.k.gunluk.filter((x) => x.m === "GET" && x.durum >= 400);
    yaz(`     bilgi — durum ≥ 400 OKUMA: ${okumaRet.length}${okumaRet.length ? " · " + [...new Set(okumaRet.map((x) => `${x.yol} ${x.durum} ${x.kod || ""}`))].join(" ; ") : ""}`);
    yaz(`     bildirimler: ${await bildirim(c)}`);
    await kapat(c, `G1 ${kullanici}`);
  }

  // ════════════════════════════════════════ G2 · PAKET KURULURKEN AÇIK SEKME ════════════════════════════════════════
  if (kos("G2")) {
    const db = "gecis_g2";
    yaz(`\n■ G2 PAKET KURULURKEN AÇIK SEKME · Ayşe · ${db} (şablon ${PAKETSIZ}; paketler sekme açıkken kurulur)`);
    await kopya(db, PAKETSIZ);
    const c = await ac(db, "Ayşe");
    k_("G2: sekme açılırken sunucu PAKETSİZ [b3a_yazma_koru, b3a2_alan_koru, b4_* işlev]", await paketDurum(c.q), [0, 0, 0]);
    const once = await urunSatiri(c);
    const kurulum = []; let kurHata = null;
    for (const f of PAKET_SQL) { try { kurulum.push(`${path.basename(f)} → ${paketKur(db, f)}`); } catch (e) { kurHata = `${path.basename(f)}: ${kisa((e.stderr || e.message || "").toString().split("\n").filter((x) => /ERROR|HATA/.test(x)).join(" ") || e.message, 300)}`; break; } }
    yaz(`     kurulum: ${kurulum.join(" ; ")}${kurHata ? ` ; HATA ${kurHata}` : ""}`);
    // başarı sözü betiğin KENDİ son satırı: 27-b4 "99|GENEL|UYGULANMIŞ" yazar (HAZIR = henüz uygulanmamış, FARKLI — DUR = beklenmeyen gövde);
    // 28-b3a ve 29-b3a2 "GENEL|KURULU" yazar
    k_("G2: üç paket sırayla kuruldu [27 → GENEL|UYGULANMIŞ, 28 → GENEL|KURULU, 29 → GENEL|KURULU]", [kurulum.map((x) => x.replace(/^.* → (\d+\|)?/, "")), kurHata], [["GENEL|UYGULANMIŞ", "GENEL|KURULU", "GENEL|KURULU"], null]);
    k_("G2: kurulumdan sonra paketler var", (await paketDurum(c.q)).map((x) => x > 0), [true, true, true]);
    // sekme YENİLENMEDEN: ad değiştir, kaydet
    const r = await urunDuzenle(c, { ad: "Ekran Bot G2" });
    if (!r || r.hata) yapilamadi("G2: ürün adını değiştirip kaydetme", r ? r.hata : "ürün kartı düzenlemeye açılamadı");
    else {
      const uy = urunYazmalari(c, r.sinir);
      yaz(`     ürün yazmaları: ${uy.map(yazmaOzeti).join(" ; ") || "YOK"} · gövdede fiyat sütunları: ${uy.map((y) => govdeAlanlari(y).filter((x) => /fiyat/.test(x)).join("+") || "yok").join(" ; ")}`);
      yaz(`     bildirim: ${r.bildirim}`);
      const ok = k_("G2: yenilenmemiş sekmede ad kaydı geçti → sunucuda [ad, satış, alış]", satirDizi(r.sonra), ["Ekran Bot G2", once.sf, once.af]);
      k_("G2: kayıtta reddedilen yazma yok", redler(c, r.sinir).map(yazmaOzeti), []);
      if (!ok) bulgu(`G2 — paket kurulurken açık kalmış sekmede MEŞRU ad kaydı yazılmadı: ${uy.map(yazmaOzeti).join(" ; ") || "ürün yazması gitmedi"} · bildirim: ${r.bildirim}`);
    }
    await c.sayfa.waitForTimeout(6000);
    k_("G2: senaryo boyunca reddedilen yazma yok", redler(c).map(yazmaOzeti), []);
    yaz("     not: köprü işlev imzalarını önbelleğe alır (ilk çağrıda); bu senaryoda paketten ÖNCE çağrılıp paketle imzası değişen işlev kullanılmadı (yalnız urunler yazması ölçüldü).");
    await kapat(c, "G2");
  }

  // ════════════════════════════════════════ G3 · MEŞRU ÜRÜN KAYDI ════════════════════════════════════════
  if (kos("G3")) {
    const db = "gecis_g3";
    yaz(`\n■ G3 MEŞRU ÜRÜN KAYDI (fiyat dışı alan) · Ayşe · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, "Ayşe");
    const tamOnce = await urunTam(c);
    const r = await urunDuzenle(c, { ad: "Ekran Bot G3", stokKodu: "GEC-3" });
    if (!r || r.hata) yapilamadi("G3: fiyat dışı alanları değiştirip kaydetme", r ? r.hata : "ürün kartı düzenlemeye açılamadı");
    else {
      const uy = urunYazmalari(c, r.sinir);
      k_("G3: 1.744.37'de fiyat kutuları Ayşe'ye AÇIK (istemci kısıtı yok)", r.kutular, { alis: "AÇIK", satis: "AÇIK" });
      yaz(`     ürün yazmaları: ${uy.map(yazmaOzeti).join(" ; ") || "YOK"}`);
      yaz(`     gövdedeki sütunlar (${uy[0] ? govdeAlanlari(uy[0]).length : 0}): ${uy[0] ? govdeAlanlari(uy[0]).join(", ") : "—"}`);
      k_("G3: eski istemci satırı fiyat sütunlarıyla birlikte yolluyor [satis_fiyati, alis_fiyati gövdede]", uy[0] ? ["satis_fiyati", "alis_fiyati"].map((x) => govdeAlanlari(uy[0]).includes(x)) : null, [true, true]);
      yaz(`     bildirim: ${r.bildirim}`);
      // "Stok Kodu" kutusunun hangi sütuna yazıldığı varsayılmaz (stok_no sayaçtır, kod değil): satırın tamamı önce / sonra karşılaştırılır
      const tamSonra = await urunTam(c); const degisen = degisenSutunlar(tamOnce, tamSonra);
      yaz(`     sunucuda değişen sütunlar: ${degisen.map((x) => `${x}: ${kisa(JSON.stringify(tamOnce[x]), 50)} → ${kisa(JSON.stringify(tamSonra[x]), 70)}`).join(" ; ") || "YOK"}`);
      const ok = k_("G3: sunucuda [ad, stok kodu satırda yazılı mı, satış, alış]", [r.sonra.ad, JSON.stringify(tamSonra).includes("GEC-3"), r.sonra.sf, r.sonra.af], ["Ekran Bot G3", true, r.once.sf, r.once.af]);
      k_("G3: reddedilen yazma yok", redler(c).map(yazmaOzeti), []);
      if (!ok) bulgu(`G3 — MEŞRU kayıt (fiyat dışı alan) yazılmadı: ${uy.map(yazmaOzeti).join(" ; ") || "ürün yazması gitmedi"} · bildirim: ${r.bildirim}`);
    }
    await kapat(c, "G3");
  }

  // ════════════════════════════════════════ G4 · KORUMA AŞILABİLİYOR MU ════════════════════════════════════════
  for (const [kod, alan, sutun, etiket, deger] of [["G4s", "satis", "sf", "SATIŞ", 150], ["G4a", "alis", "af", "ALIŞ", 90]]) {
    if (!kos(kod)) continue;
    const db = `gecis_${kod.toLowerCase()}`;
    yaz(`\n■ ${kod} ESKİ İSTEMCİ ${etiket} FİYATINI DEĞİŞTİRİYOR (+ ad) · Ayşe · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, "Ayşe");
    const yeniAd = `Ekran Bot ${kod}`;
    const r = await urunDuzenle(c, { ad: yeniAd, [alan]: deger });
    if (!r || r.hata) { yapilamadi(`${kod}: ${etiket} fiyatını değiştirip kaydetme`, r ? r.hata : "ürün kartı düzenlemeye açılamadı"); await kapat(c, kod); continue; }
    const ilk = urunYazmalari(c, r.sinir);
    yaz(`     kutular: ${JSON.stringify(r.kutular)} · kayıt anındaki ürün yazmaları: ${ilk.map(yazmaOzeti).join(" ; ") || "YOK (sunucuya ürün yazması gitmedi)"}`);
    if (ilk[0]) yaz(`     istek: ${ilk[0].m} ${ilk[0].yol} · Prefer: ${ilk[0].prefer || "—"} · x-atolye-surum: ${ilk[0].surumBasligi || "—"} · gövdede ${govdeAlanlari(ilk[0]).length} sütun · ad=${kisa(JSON.stringify((() => { try { const j = JSON.parse(ilk[0].govde); return (Array.isArray(j) ? j[0] : j).ad; } catch (e) { return null; } })()), 40)} · ${alan}_fiyati=${(() => { try { const j = JSON.parse(ilk[0].govde); return (Array.isArray(j) ? j[0] : j)[`${alan}_fiyati`]; } catch (e) { return "?"; } })()}`);
    const ret = ilk.find((y) => y.durum >= 400);
    const okRet = k_(`${kod}: sunucu reddetti [4xx, kod]`, ret ? [ret.durum >= 400 && ret.durum < 500, ret.kod] : [false, null], [true, "42501"]);
    if (ret) yaz(`     sunucu iletisi: ${kisa(ret.ileti, 400)}`);
    const okFiyat = k_(`${kod}: sunucuda ${etiket.toLocaleLowerCase("tr-TR")} fiyatı DEĞİŞMEDİ`, r.sonra[sutun], r.once[sutun]);
    const okAd = k_(`${kod}: aynı kayıttaki ad değişikliği de YAZILMADI (satır tek istek) [ad, sürüm]`, [r.sonra.ad, r.sonra.surum], [r.once.ad, r.once.surum]);
    if (!okRet || !okFiyat) bulgu(`${kod} — ESKİ İSTEMCİ KORUMAYI AŞTI ya da beklenen biçimde reddedilmedi: ${ilk.map(yazmaOzeti).join(" ; ") || "ürün yazması gitmedi"} · sunucu önce ${JSON.stringify(r.once)} · sonra ${JSON.stringify(r.sonra)} · bildirim: ${r.bildirim}`);
    if (!okAd && okFiyat) bulgu(`${kod} — reddedilen kayıtta ad AYRICA yazıldı (kısmi kayıt): önce ${JSON.stringify(r.once)} · sonra ${JSON.stringify(r.sonra)} · yazmalar: ${ilk.map(yazmaOzeti).join(" ; ")}`);
    // (c) KULLANICI NE GÖRÜYOR — kayıttan hemen sonra
    yaz(`     EKRAN (kayıttan hemen sonra) — bildirim: ${r.bildirim}`);
    yaz(`     EKRAN — düzenleme formu: ${r.formAcik ? "AÇIK kaldı" : "KAPANDI"} · ekranda beliren yeni satırlar (${r.yeniSatirlar.length}): ${kisa(r.yeniSatirlar.join(" ⏎ "), 600) || "—"}`);
    if (r.formAcik) yaz(`     EKRAN — formdaki değerler: ${JSON.stringify(await kartDegerleri(c))}`);
    const gorunen = [r.bildirim, ...r.yeniSatirlar].join(" ⏎ ");
    k_(`${kod}: ret kullanıcıya GÖRÜNÜR (ekranda "yazılamadı / gönderilemeyen / yetki" içeren ileti var)`, /yazılamadı|gönderileme|yetki/i.test(gorunen), true);
    if (!k_(`${kod}: ekrandaki ileti reddin NEDENİNİ söylüyor ("yetki" geçiyor)`, /yetki/i.test(gorunen), true))
      bulgu(`${kod} — kullanıcı reddin NEDENİNİ görmüyor: sunucu "${kisa(ret && ret.ileti, 160)}" dedi; ekranda: bildirim "${r.bildirim}" · beliren satırlar: ${kisa(r.yeniSatirlar.filter((x) => UYARI.test(x)).join(" ⏎ "), 420)}`);
    if (!k_(`${kod}: reddedilen kayıtta "başarılı" bildirimi ÇIKMADI ("güncellendi" yok)`, /güncellendi/i.test(gorunen), false))
      bulgu(`${kod} — sunucu kaydı reddettiği hâlde ekranda başarı bildirimi çıktı: "${r.bildirim}"`);
    if (!k_(`${kod}: ret "oturum kapandı" diye gösterilmedi`, /oturumunuz kapandı/i.test(gorunen), false))
      bulgu(`${kod} — yetki reddi (42501) ekranda "Bulut oturumunuz kapandı … Yeniden giriş yapınca gönderilir" şeridiyle gösterildi (oturum açık; yeniden giriş reddi çözmez)`);
    if (!k_(`${kod}: kayıttan hemen sonra ekran reddedilen değeri GÖSTERMİYOR (listede "${yeniAd}" yok)`, r.yeniSatirlar.some((x) => x.includes(yeniAd)), false))
      bulgu(`${kod} — reddedilen değerler ekranda kayıtlıymış gibi duruyor: ${kisa(r.yeniSatirlar.filter((x) => x.includes(yeniAd) || /₺/.test(x)).join(" ⏎ "), 260)}`);
    // YENİDEN GÖNDERİM: kayıttan sonraki 30 sn içinde reddedilen ürün yazmalarının sayısı ve zamanları
    await bekle(async () => Date.now() - r.t0 >= 30000, 35);
    const otuz = urunYazmalari(c, r.sinir);
    const otuzRet = otuz.filter((y) => y.durum >= 400);
    yaz(`     30 sn içinde ürün yazmaları: ${otuz.length} (reddedilen ${otuzRet.length}) · zamanlar (sn): ${otuz.map((y) => `${((y.z - r.t0) / 1000).toFixed(1)}→${y.durum}`).join(", ") || "—"}`);
    yaz(`     30 sn içinde bütün yazmalar: ${Object.entries(c.yazmalar.slice(r.sinir).reduce((o, y) => { const a = `${y.m} ${y.yol.split("?")[0]} ${y.durum}`; o[a] = (o[a] || 0) + 1; return o; }, {})).map(([a, n]) => `${a} ×${n}`).join(" ; ") || "—"}`);
    if (!k_(`${kod}: reddedilen yazma 30 sn içinde yeniden gönderilmedi (reddedilen ürün yazması sayısı)`, otuzRet.length, 1))
      bulgu(`${kod} — istemci reddedilen ürün yazmasını 30 sn içinde ${otuzRet.length} kez gönderdi (beklenen 1): ${otuzRet.map((y) => `${((y.z - r.t0) / 1000).toFixed(1)} sn ${y.m} ${kisa(y.yol, 60)} ${y.durum} ${y.kod || ""}`).join(" ; ")}`);
    const otuzEkran = await ekranSatirlari(c);
    const uyarilar = otuzEkran.filter((x) => UYARI.test(x));
    yaz(`     EKRAN (30 sn sonra) — uyarı / bekleyen kayıt / çakışma içeren satırlar (${uyarilar.length}): ${kisa(uyarilar.join(" ⏎ "), 600) || "—"}`);
    yaz(`     EKRAN (30 sn sonra) — sonradan gelen bildirimler: ${await bildirim(c)}`);
    yaz(`     EKRAN (30 sn sonra, yenilemeden) — listede "${yeniAd}" görünüyor mu: ${otuzEkran.some((x) => x.includes(yeniAd)) ? "EVET (ekran sunucudan farklı)" : "hayır"}`);
    k_(`${kod}: 30 sn sonra sunucu hâlâ değişmedi [ad, satış, alış]`, satirDizi(await urunSatiri(c)), satirDizi(r.once));
    // 30 sn'lik pencere dar olabilir (istemcide dakikalık otomatik yeniden gönderim var): 95 sn'ye kadar izlenir — BİLGİ, ayrıca sayılır
    await bekle(async () => Date.now() - r.t0 >= 95000, 70);
    const doksan = urunYazmalari(c, r.sinir).filter((y) => y.durum >= 400);
    yaz(`     95 sn içinde reddedilen ürün yazması: ${doksan.length} · zamanlar (sn): ${doksan.map((y) => ((y.z - r.t0) / 1000).toFixed(1)).join(", ")}`);
    if (!k_(`${kod}: 95 sn içinde de kendiliğinden yeniden gönderim yok (reddedilen ürün yazması sayısı)`, doksan.length, 1))
      bulgu(`${kod} — istemci reddedilen ürün yazmasını kendiliğinden yeniden gönderiyor: 95 sn içinde ${doksan.length} kez (${doksan.map((y) => ((y.z - r.t0) / 1000).toFixed(1)).join(", ")} sn) — her biri HTTP ${[...new Set(doksan.map((y) => `${y.durum} ${y.kod}`))].join(" / ")}`);
    // ŞERİT AYRINTISI: gönderilemeyen kaydın çipi ([data-bekleyen-cip]) tıklanınca kullanıcı ne okuyor
    { const cip = c.sayfa.locator("[data-bekleyen-cip]");
      if (await cip.count()) { const cipYazi = kisa(await cip.first().innerText(), 120); const onceS = await ekranSatirlari(c);
        await cip.first().evaluate((el) => el.click()); await c.sayfa.waitForTimeout(1200);
        const ayrinti = (await ekranSatirlari(c)).filter((x) => !onceS.includes(x));
        yaz(`     ŞERİT — çip: "${cipYazi}" · tıklanınca açılan ayrıntı (${ayrinti.length} satır): ${kisa(ayrinti.join(" ⏎ "), 1800) || "—"}`);
        // ayrıntıdaki genel "yazma yetkisi yok — giriş yapılmamış" sözü neden DEĞİL; aranan sunucunun kendi iletisi: hangi alan (… fiyatı), hangi yetki
        const at = ayrinti.join(" ");
        if (!k_(`${kod}: şerit ayrıntısında sunucunun iletisi okunuyor [alan adı ("${etiket.toLocaleLowerCase("tr-TR")} fiyatı") geçiyor, "gereken:" geçiyor]`, [new RegExp(`${alan === "satis" ? "satış" : "alış"} fiyatı`, "i").test(at), /gereken:/i.test(at)], [true, true]))
          bulgu(`${kod} — gönderilemeyen kayıt ayrıntısı reddin gerçek nedenini (hangi alan / hangi yetki) göstermiyor; kullanıcının okuduğu: ${kisa(at, 700) || "ayrıntı açılmadı"}`);
        if (/rls-kimlik|giriş yapılmamış|izni vermiyor/i.test(at)) bulgu(`${kod} — şerit ayrıntısı YANLIŞ yönlendiriyor: yetki reddi (42501, alan kuralı) "giriş yapılmamış / rls-kimlik.sql yeniden çalıştırılmalı / veritabanı yazma izni vermiyor" diye açıklanıyor`);
        await cip.first().evaluate((el) => el.click()).catch(() => {}); await c.sayfa.waitForTimeout(400);
      } else yaz("     ŞERİT — gönderilemeyen kayıt çipi ([data-bekleyen-cip]) ekranda yok"); }
    // "Yeniden dene" düğmesi (gönderilemeyen kayıt şeridi) varsa: basılınca ne oluyor
    { const d = c.sayfa.locator('button:visible', { hasText: "Yeniden dene" });
      if (await d.count()) { const sn = c.yazmalar.length; await bildirim(c);
        // düğmenin üstü başka bir katmanla örtülü olabilir (açık ürün kartı / bildirim): önce gerçek tık denenir; olmazsa örten öğe yazılır ve
        // düğme betikle tıklanır (kullanıcı örten katmanı kapatıp basabilir — sınanan düğmenin YAPTIĞI)
        try { await d.first().click({ timeout: 3000 }); } catch (e) {
          const orten = await d.first().evaluate((el) => { const b = el.getBoundingClientRect(); const u = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            return u ? `${u.tagName.toLowerCase()} "${(u.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80)}"` : "?"; });
          yaz(`     not: "Yeniden dene" düğmesine fareyle basılamadı — üstünü örten öğe: ${orten}; betikle tıklandı`);
          await d.first().evaluate((el) => el.click()); }
        await c.sayfa.waitForTimeout(5000);
        yaz(`     "Yeniden dene"ye basıldı → yazmalar: ${c.yazmalar.slice(sn).map(yazmaOzeti).join(" ; ") || "—"} · bildirim: ${await bildirim(c)} · şerit hâlâ ekranda: ${(await c.sayfa.getByText("Buluta gönderilemeyen kayıt var").count()) ? "EVET" : "hayır"}`);
        k_(`${kod}: "Yeniden dene" sonrası sunucu değişmedi [ad, satış, alış]`, satirDizi(await urunSatiri(c)), satirDizi(r.once));
      } else yaz('     "Yeniden dene" düğmesi ekranda yok (30 sn sonra)'); }
    // YENİLEME: ekran sunucudaki değere dönüyor mu; yenilemeden sonra reddedilen yazma yeniden gidiyor mu
    const ySinir = c.yazmalar.length;
    await yenile(c);
    await c.sayfa.waitForTimeout(8000);
    const yEkran = await ekranSatirlari(c);
    yaz(`     YENİLEMEDEN SONRA — bildirimler: ${await bildirim(c)} · uyarı satırları: ${kisa(yEkran.filter((x) => UYARI.test(x)).join(" ⏎ "), 500) || "—"}`);
    const ySonraYazma = c.yazmalar.slice(ySinir);
    yaz(`     YENİLEMEDEN SONRA — yazmalar: ${ySonraYazma.map(yazmaOzeti).join(" ; ") || "—"}`);
    if (!k_(`${kod}: yenilemeden sonra reddedilen ürün yazması yeniden GÖNDERİLMEDİ`, ySonraYazma.filter((y) => /^urunler/.test(y.yol)).map(yazmaOzeti), []))
      bulgu(`${kod} — sayfa yenilenince istemci ürün yazmasını yeniden gönderdi: ${ySonraYazma.filter((y) => /^urunler/.test(y.yol)).map(yazmaOzeti).join(" ; ")}`);
    if (await urunKartiAc(c, "^Ekran Bot")) {
      const d = await kartDegerleri(c); const s = await urunSatiri(c);
      if (!k_(`${kod}: yenilemeden sonra kart sunucudaki değeri gösteriyor [ad, alış, satış]`, [d.ad, Number(d.alis), Number(d.satis)], [s.ad, s.af, s.sf]))
        bulgu(`${kod} — yenilemeden sonra ekran sunucudan FARKLI: kart ${JSON.stringify(d)} · sunucu ${JSON.stringify(s)}`);
    } else yapilamadi(`${kod}: yenilemeden sonra ürün kartını okuma`, `kart düzenlemeye açılamadı; listede görünen: ${kisa(yEkran.filter((x) => /Bot/.test(x)).join(" | "), 200)}`);
    k_(`${kod}: yenilemeden sonra da sunucu [ad, satış, alış] başlangıçtaki gibi`, satirDizi(await urunSatiri(c)), satirDizi(r.once));
    // ÇIKIŞ YOLU: kullanıcı (kart düzenlemede açık) fiyatı eski değerine döndürüp yeniden kaydederse takılı kayıt çözülüyor mu?
    if (await c.sayfa.locator('[data-kart-eylem="kaydet"]:visible').count()) {
      await kutuYaz(c, alan, r.once[sutun]); await bildirim(c);
      const cs = await kartKaydet(c); await c.sayfa.waitForTimeout(3000);
      const son = await urunSatiri(c); const cy = urunYazmalari(c, cs);
      yaz(`     ÇIKIŞ YOLU — fiyat ${r.once[sutun]} yapılıp yeniden kaydedildi → yazmalar: ${cy.map(yazmaOzeti).join(" ; ") || "YOK"} · bildirim: ${await bildirim(c)}`);
      yaz(`     ÇIKIŞ YOLU — şerit ("Buluta gönderilemeyen kayıt var") hâlâ ekranda: ${(await c.sayfa.getByText("Buluta gönderilemeyen kayıt var").count()) ? "EVET" : "hayır"}`);
      if (!k_(`${kod}: çıkış yolu — fiyat eski değerine döndürülünce kayıt geçti [ad, satış, alış]`, satirDizi(son), [yeniAd, r.once.sf, r.once.af]))
        bulgu(`${kod} — fiyat eski değerine döndürülüp kaydedildiği hâlde kayıt geçmedi: ${cy.map(yazmaOzeti).join(" ; ") || "yazma gitmedi"} · sunucu ${JSON.stringify(son)}`);
    }
    await kapat(c, kod);
  }

  // ════════════════════════════════════════ G5 · YÖNETİCİ ════════════════════════════════════════
  if (kos("G5")) {
    const db = "gecis_g5";
    yaz(`\n■ G5 YÖNETİCİ SATIŞ + ALIŞ FİYATI · Ali · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, "Ali");
    const r = await urunDuzenle(c, { satis: 200, alis: 120 });
    if (!r || r.hata) yapilamadi("G5: satış + alış fiyatını değiştirip kaydetme", r ? r.hata : "ürün kartı düzenlemeye açılamadı");
    else {
      const uy = urunYazmalari(c, r.sinir);
      yaz(`     ürün yazmaları: ${uy.map(yazmaOzeti).join(" ; ") || "YOK"} · bildirim: ${r.bildirim}`);
      const ok = k_("G5: sunucuda [ad, satış, alış]", satirDizi(r.sonra), [r.once.ad, 200, 120]);
      k_("G5: reddedilen yazma yok", redler(c).map(yazmaOzeti), []);
      if (!ok) bulgu(`G5 — YÖNETİCİNİN fiyat kaydı yazılmadı: ${uy.map(yazmaOzeti).join(" ; ") || "ürün yazması gitmedi"} · bildirim: ${r.bildirim}`);
    }
    await kapat(c, "G5");
  }

  // ════════════════════════════════════════ G6 · YENİ ÜRÜN ════════════════════════════════════════
  if (kos("G6")) {
    const db = "gecis_g6";
    yaz(`\n■ G6 YENİ ÜRÜN (fiyatsız / satış fiyatlı) · Ayşe · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, "Ayşe"); const s = c.sayfa;
    const urunEkle = async (ad, satis) => {
      if (!(await modulAc(c, "Ürün Stok"))) return { hata: 'menüde "Ürün Stok" yok' };
      const dugme = s.locator('button:has-text("Ürün Ekle"):visible');
      if (!(await dugme.count())) return { hata: '"Ürün Ekle" düğmesi yok' };
      await dugme.first().click(); await s.waitForTimeout(1200);
      if (!(await s.getByText("Yeni Stok Kartı").count())) return { hata: '"Yeni Stok Kartı" formu açılmadı' };
      if (!(await kutuYaz(c, "ad", ad))) return { hata: "Ürün Adı kutusu bulunamadı" };
      const kutular = await kutuDurumu(c);
      if (satis != null && !(await kutuYaz(c, "satis", satis))) return { hata: "Satış Fiyatı kutusu bulunamadı", kutular };
      // Tohumda Tanımlar › Birimler BOŞ: formun birimi kendiliğinden dolmaz ("Önce Tanımlar → Birimler…" uyarısı, yazma gitmez).
      // Kullanıcı gibi Birim kutusundan açıkça seçilir (çift).
      const birim = s.locator("label:visible", { hasText: /^Birim/ }).locator("select");
      if (await birim.count()) { await birim.first().selectOption("çift"); await s.waitForTimeout(300); }
      // Kaydet, renk × beden matrisi oluşturulana kadar KAPALI: renksiz, tek beden (40) seçilip "Matris Oluştur"a basılır
      const beden = s.locator("button.mono:visible", { hasText: /^40$/ }); if (await beden.count()) { await beden.first().click(); await s.waitForTimeout(300); }
      const matris = s.locator("button:visible", { hasText: "Matris Oluştur" }); if (await matris.count()) { await matris.first().click(); await s.waitForTimeout(700); }
      const kaydet = s.locator("button.btn-save:visible", { hasText: "Kaydet" }).first();
      if (await kaydet.isDisabled()) return { hata: `formun Kaydet düğmesi kapalı kaldı (beden 40 + "Matris Oluştur" denendi); formda görünen: ${kisa((await ekranSatirlari(c)).filter((x) => /matris|beden|renk/i.test(x)).join(" | "), 240)}`, kutular };
      await bildirim(c);
      const sinir = c.yazmalar.length; const ekranOnce = await ekranSatirlari(c);
      await kaydet.click();
      await bekle(async () => c.yazmalar.slice(sinir).some((y) => /^urunler/.test(y.yol)), 12); await s.waitForTimeout(2500);
      const ekranSonra = await ekranSatirlari(c);
      return { sinir, kutular, bildirim: await bildirim(c), satir: await c.q(`select id, ad, satis_fiyati::float sf, alis_fiyati::float af from public.urunler where ad = $1`, [ad]),
        formAcik: (await s.getByText("Yeni Stok Kartı").count()) > 0, yeniSatirlar: ekranSonra.filter((x) => !ekranOnce.includes(x)) };
    };
    const a = await urunEkle("Geçiş Ürün Fiyatsız", null);
    if (a.hata) yapilamadi("G6a: fiyatsız yeni ürün", a.hata);
    else {
      const y = c.yazmalar.slice(a.sinir);
      yaz(`     G6a yazmalar: ${y.map(yazmaOzeti).join(" ; ") || "YOK"} · bildirim: ${a.bildirim} · form ${a.formAcik ? "AÇIK kaldı" : "kapandı"}`);
      const ok = k_("G6a: fiyatsız yeni ürün sunucuda oluştu [satır sayısı, satış, alış]", [a.satir.length, a.satir[0] && a.satir[0].sf, a.satir[0] && a.satir[0].af], [1, 0, 0]);
      k_("G6a: reddedilen yazma yok", y.filter((x) => x.durum >= 400).map(yazmaOzeti), []);
      if (!ok) bulgu(`G6a — MEŞRU yeni ürün (fiyatsız) yazılmadı: ${y.map(yazmaOzeti).join(" ; ") || "yazma gitmedi"} · bildirim: ${a.bildirim} · ekranda beliren: ${kisa(a.yeniSatirlar.join(" ⏎ "), 300)}`);
    }
    // formu kapat (açık kaldıysa) — ikinci deneme temiz formla
    { const v = s.locator("button.btn-ghost:visible", { hasText: "Vazgeç" }); if ((await s.getByText("Yeni Stok Kartı").count()) && (await v.count())) { await v.first().click(); await s.waitForTimeout(600); } }
    const b = await urunEkle("Geçiş Ürün Fiyatlı", 99);
    if (b.hata) yapilamadi("G6b: satış fiyatlı yeni ürün", b.hata);
    else {
      const y = c.yazmalar.slice(b.sinir); const ret = y.find((x) => /^urunler/.test(x.yol) && x.durum >= 400);
      yaz(`     G6b kutular: ${JSON.stringify(b.kutular)} · yazmalar: ${y.map(yazmaOzeti).join(" ; ") || "YOK"}`);
      yaz(`     G6b EKRAN — bildirim: ${b.bildirim} · form ${b.formAcik ? "AÇIK kaldı" : "kapandı"} · beliren satırlar: ${kisa(b.yeniSatirlar.join(" ⏎ "), 400) || "—"}`);
      const ok1 = k_("G6b: satış fiyatlı yeni ürün reddedildi [4xx, kod]", ret ? [ret.durum >= 400 && ret.durum < 500, ret.kod] : [false, null], [true, "42501"]);
      const ok2 = k_("G6b: sunucuda ürün OLUŞMADI (satır sayısı)", b.satir.length, 0);
      if (!ok1 || !ok2) bulgu(`G6b — Ayşe satış fiyatlı yeni ürün ekleyebildi ya da beklenen biçimde reddedilmedi: ${y.map(yazmaOzeti).join(" ; ") || "yazma gitmedi"} · sunucu ${JSON.stringify(b.satir)} · bildirim: ${b.bildirim}`);
      if (!k_('G6b: reddedilen yeni üründe "başarılı" bildirimi ÇIKMADI ("kaydedildi" yok)', /kaydedildi/i.test(b.bildirim), false))
        bulgu(`G6b — sunucu yeni ürünü reddettiği hâlde ekranda başarı bildirimi çıktı ve ürün listede görünüyor: "${b.bildirim}" · beliren satırlar: ${kisa(b.yeniSatirlar.join(" ⏎ "), 330)}`);
      await c.sayfa.waitForTimeout(8000);
      const artik = await c.q(`select count(*)::int n from public.stk_varyant v where not exists (select 1 from public.urunler u where u.id = v.urun_id)`);
      yaz(`     G6b sonrası: ürünsüz kalan varyant satırı ${artik[0].n} · 8 sn içinde sonraki yazmalar: ${c.yazmalar.slice(b.sinir + y.length).map(yazmaOzeti).join(" ; ") || "—"}`);
    }
    await kapat(c, "G6");
  }

  // ════════════════════════════════════════ G7 · STOK GİRİŞ FİŞİ ════════════════════════════════════════
  if (kos("G7")) {
    const db = "gecis_g7";
    yaz(`\n■ G7 BAĞIMSIZ STOK GİRİŞ FİŞİ · Ayşe · ${db} (şablon ${PAKETLI})`);
    await kopya(db, PAKETLI);
    const c = await ac(db, "Ayşe"); const s = c.sayfa;
    const stok = async (olcu) => Number(((await c.q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' and olcu_ad = $2`, [URUN, olcu]))[0] || {}).m || 0);
    const fisSayisi = async () => { const r = (await c.q(`select count(*) filter (where not iptal)::int g, count(*) filter (where iptal)::int i from public.stk_fis`))[0]; return `${r.g} geçerli / ${r.i} iptal`; };
    let neden = null;
    if (!(await modulAc(c, "Stok"))) neden = 'menüde "Stok" yok';
    else {
      if (!(await s.locator("[data-stok-giris-seridi]").count())) { const d = s.locator('button[title^="Bağımsız stok girişi"]'); if (await d.count()) { await d.first().click(); await s.waitForTimeout(700); } }
      if (!(await s.locator("[data-stok-giris-seridi]").count())) neden = "bağımsız stok girişi şeridi ([data-stok-giris-seridi]) açılamadı";
    }
    if (neden) yapilamadi("G7: bağımsız stok giriş fişi", neden);
    else {
      const f0 = await fisSayisi(), s40 = await stok("40"), s41 = await stok("41");
      await s.locator("[data-stok-giris-urun]").first().selectOption(URUN); await s.waitForTimeout(400);
      await s.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await s.waitForTimeout(400);
      await s.locator('[data-stok-giris-miktar="40"]').first().fill("5"); await s.locator('[data-stok-giris-miktar="41"]').first().fill("3");
      await bildirim(c); const sinir = c.yazmalar.length;
      await s.locator("[data-stok-giris-seridi] .btn-save").first().click();
      await bekle(async () => (await stok("40")) === s40 + 5, 20); await s.waitForTimeout(2000);
      const y = c.yazmalar.slice(sinir); const bl = await bildirim(c);
      yaz(`     yazmalar: ${y.map(yazmaOzeti).join(" ; ") || "YOK"} · bildirim: ${bl}`);
      const ok = k_("G7: stok girişi → Siyah [40 farkı, 41 farkı]", [(await stok("40")) - s40, (await stok("41")) - s41], [5, 3]);
      k_("G7: stk_fis'te 1 yeni geçerli fiş [önce, sonra]", [f0, await fisSayisi()], ["0 geçerli / 0 iptal", "1 geçerli / 0 iptal"]);
      const fis = (await c.q(`select id, tur, olusturan from public.stk_fis order by olusturma desc limit 1`))[0];
      yaz(`     fiş: ${fis ? `${fis.id} · ${fis.tur} · oluşturan ${fis.olusturan}` : "YOK"}`);
      k_("G7: reddedilen yazma yok", redler(c).map(yazmaOzeti), []);
      if (!ok) bulgu(`G7 — MEŞRU stok giriş fişi yazılmadı: ${y.map(yazmaOzeti).join(" ; ") || "yazma gitmedi"} · bildirim: ${bl}`);
    }
    await kapat(c, "G7");
  }

  // ════════════════════════════════════════ ÖZET ════════════════════════════════════════
  yaz("\n■ YALITIM");
  k_("canlıya / G-25'e giden istek sayısı", dis.yasak.length, 0);
  yaz(`     izinli dış kaynak (yayın paketi kitaplıklarını buradan yükler): ${[...dis.izinli].map(([a, n]) => `${a} ×${n}`).join(" ; ") || "—"}`);
  yaz(`     kesilen başka adresler: ${[...dis.kesilen].map(([a, n]) => `${a} ×${n}`).join(" ; ") || "—"}`);
  yaz(`\nBULGULAR (${bulgular.length})`); bulgular.forEach((b, i) => yaz(`  ${i + 1}. ${b}`)); if (!bulgular.length) yaz("  —");
  yaz(`EKRANDAN YAPILAMAYAN (${yapilamayan.length})`); yapilamayan.forEach((b, i) => yaz(`  ${i + 1}. ${b}`)); if (!yapilamayan.length) yaz("  —");
  yaz(`\n── ekran-gecis-1744-37: ${gecen} geçti · ${kalan} kaldı ──`);
  if (!SECILI) fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  if (!process.env.GECIS_TUT) await pgYonet(acikKopyalar.map((d) => `drop database if exists ${d}`)).catch((e) => console.error("kopyalar silinemedi:", e.message));
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
