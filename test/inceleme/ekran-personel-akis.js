#!/usr/bin/env node
// EKRAN SINAMASI — ÜÇ GÜVENLİK PAKETİ (B4, B3a, B3a-2) KURULUYKEN PERSONEL HESAPLARI (27 Kasım).
// Soru: paketler kuruluyken personel YETKİLİ işini ekrandan bitirebiliyor mu, YETKİSİZ yazma sunucuda reddediliyor mu?
// Yalnız YEREL PostgreSQL (gercek-pg-kopru; Supabase'e / dış servise istek yok). Çalışma veritabanı her koşuda şablondan
// (aday_a = canlıya hizalı taban + ekran tohumu + üç paket) TAZE kopyalanır; şablona dokunulmaz.
//
// HESAPLAR (yalnız sınama kopyasına eklenir; her biri TEK modülde görüntüleme + düzenleme + kaydetme, silme YOK):
//   Ayşe = stok (tohumda var) · Selin = sipariş · Murat = muhasebe · Umut = üretim
// AKIŞLAR (hepsi ekrandan; sonuç sunucudan, süper kullanıcı sorgusuyla ölçülür):
//   Ayşe  : bağımsız stok giriş fişi · ürün kartında fiyat DIŞI alan (ad) · ürün kartından hızlı tedarikçi ekleme
//   Selin : yeni satış siparişi (mevcut müşteri, tek kalem) · ürün kartında satış kutusu açık / alış kapalı
//   Murat : cariden nakit tahsilat fişi → ekrandan iptal · ürün kartında alış kutusu açık / satış kapalı
//   Umut  : İşi Ver → teslim (sağlam) → Geri Al → yeniden teslim (her adımda mamul stoğu, usta bakiyesi, fiş sayısı)
// EK HESAPLAR (teşhis; asıl dört hesabın sonucunu DEĞİŞTİRMEZ, ayrı satırlarda raporlanır): fiş iptali (tahsilatın silinmesi, üretimde
//   "Geri Al") sunucuda `silme` yetkisi ister (fis_iptal / fis_iptal_toplu → stk_yetki(…, 'silme'); paketlerden ÖNCE de böyle). Görevdeki
//   hesaplarda silme yok; aynı akışın `silme` EKLENİNCE ekrandan tamamlandığını göstermek için:
//   Mert = muhasebe (g, d, k + silme) · Ufuk = üretim (g, d, k + silme)
// YETKİSİZ DENEMELER: her hesabın KENDİ oturum jetonuyla, sayfanın içinden `fetch` — uygulamanın gönderdiği başlıklar (apikey,
//   Authorization, x-atolye-surum, Prefer) ve biçim (sürüm koşullu PATCH: ?id=eq.X&surum=eq.N, gövdede surum N+1; tanimlar: tek
//   satırın upsert'i — uygulamanın `tekilYaz` biçimi — ve ayrıca düz PATCH). Beklenen ret: HTTP 4xx + 42501, satır değişmedi.
// BEKLENMEYEN RET: akışlar boyunca köprü günlüğünde durum ≥ 400 olan her yazma (uygulamanın kendi otomatik yazmaları dahil).
// Kural: yetkili akış reddedilirse ya da yetkisiz yazma geçerse sınama EĞİLMEZ — ✗ olarak kalır ve BULGU diye yazılır.
//
// Kullanım: PGHOST=localhost KOPRU_PG=<pg modülü> PW_CHROMIUM=<chromium> node test/inceleme/ekran-personel-akis.js
//   EKRAN_DB verilirse o veritabanı OLDUĞU GİBİ kullanılır (kopyalanmaz); verilmezse aday_pa, EKRAN_SABLON (vars. aday_a) kopyası.
const fs = require("fs");
const path = require("path");
const { ekranAc, O } = require("../ekran/ortak-ekran.js");
const { kopruKur } = require("../gercek-pg-kopru.js");
const { Client } = require(process.env.KOPRU_PG || "pg");

const DB = process.env.EKRAN_DB || "aday_pa";
const SABLON = process.env.EKRAN_SABLON || "aday_a";
const SONUC = path.join(__dirname, "sonuc-ekran-personel-akis.txt");
const URUN = "ekr-bot", MUSTERI = "inc-musteri", USTA = "pa-usta", URETIM_NO = "PAU1", URETIM_ID = "pa-u1";

// ── ÇIKTI: ekrana ve sonuç dosyasına (NOTICE satırları psql'den gelir; burada yok)
const satirlar = [];
const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const bulgular = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  yaz(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const bulgu = (m) => { bulgular.push(m); yaz(`     ‼ BULGU: ${m}`); };
const kisa = (s, n = 170) => String(s == null ? "" : s).replace(/\s+/g, " ").slice(0, n);

(async () => {
  // ── TAZE KOPYA (yalnız varsayılan ad; şablon değişmez)
  if (!process.env.EKRAN_DB) {
    const pg = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" });
    await pg.connect(); pg.on("notice", () => {});
    await pg.query(`drop database if exists ${DB}`); await pg.query(`create database ${DB} template ${SABLON}`); await pg.end();
  }
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);

  // ── HESAPLAR (b3a2-matris'teki HESAP biçimi) + ÜRETİM FİKSTÜRÜ (ekran-uretim-b4'ten; gözlemci = süper kullanıcı, sınanan bu değil)
  const yt = (m) => ({ [m]: { goruntuleme: true, duzenleme: true, kaydetme: true } });
  const HESAP = [
    { id: "u-selin", kullaniciAdi: "Selin", eposta: "selin@atolye.local", rol: "Personel", yetkiler: yt("siparis") },
    { id: "u-murat", kullaniciAdi: "Murat", eposta: "murat@atolye.local", rol: "Personel", yetkiler: yt("muhasebe") },
    { id: "u-umut", kullaniciAdi: "Umut", eposta: "umut@atolye.local", rol: "Personel", yetkiler: yt("uretim") },
    { id: "u-mert", kullaniciAdi: "Mert", eposta: "mert@atolye.local", rol: "Personel", yetkiler: { muhasebe: { ...yt("muhasebe").muhasebe, silme: true } } },
    { id: "u-ufuk", kullaniciAdi: "Ufuk", eposta: "ufuk@atolye.local", rol: "Personel", yetkiler: { uretim: { ...yt("uretim").uretim, silme: true } } },
  ];
  await q(`update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || $1::jsonb) where id = 'tekil'`, [JSON.stringify(HESAP)]);
  await q(`insert into public.cariler (id, unvan, tip) values ($1, 'PA Usta', 'Personel') on conflict (id) do nothing`, [USTA]);
  await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35}'::jsonb where id = $1`, [URUN]);
  // tek adımlı (Dikim, 35 ₺, reçetesiz) üretim; adım VERİLMEMİŞ — iş ekrandan "İşi Ver" ile verilir
  await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
    values ($1, $2, $2, $3, 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
            '[{"proses": "Dikim", "sira": 1, "verildiMi": false, "tamamlandiMi": false}]'::jsonb, '2026-11-27T08:00:00.000Z')`, [URETIM_ID, URETIM_NO, URUN]);
  const paketler = (await q(`select (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru')::int a, (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru')::int b,
    (select count(*) from pg_proc where proname like 'b4\\_%')::int c`))[0];
  yaz(`ekran-personel-akis · ${DB} (şablon ${process.env.EKRAN_DB ? "—" : SABLON}) · b3a_yazma_koru ${paketler.a} tablo · b3a2_alan_koru ${paketler.b} tablo · b4_* işlev ${paketler.c}`);
  k_("üç paket kurulu (B3a, B3a-2 tetikleyicileri, B4 işlevleri)", [paketler.a > 0, paketler.b > 0, paketler.c > 0], [true, true, true]);

  // ── SUNUCU ÖLÇÜMLERİ
  const stok = async (renk = "Siyah", olcu = "40") => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = $1 and renk_ad = $2 and olcu_ad = $3`, [URUN, renk, olcu]))[0] || {}).m || 0);
  const cariBakiye = async (id) => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`, [id]))[0].t);
  const kasaBakiye = async () => Number((await q(`select coalesce(sum(case when h.veri->>'yon' = 'Giriş' then (h.veri->>'tutar')::numeric else -(h.veri->>'tutar')::numeric end), 0)::float b
      from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = 'K1' and not h.iptal and (h.fis_id is null or not f.iptal)`))[0].b);
  const fisSayisi = async () => { const r = (await q(`select count(*) filter (where not iptal)::int g, count(*) filter (where iptal)::int i from public.stk_fis`))[0]; return `${r.g} geçerli / ${r.i} iptal`; };
  const uretimFis = async () => { const r = (await q(`select count(*) filter (where not iptal)::int g, count(*) filter (where iptal)::int i from public.stk_fis where uretim_id = $1`, [URETIM_ID]))[0]; return `${r.g} geçerli / ${r.i} iptal`; };
  const atamalar = async () => (await q(`select proses, miktar::float m, tamamlandi_mi t, personel_id p from public.uretim_atamalari where uretim_id = $1 order by id`, [URETIM_ID]))
    .map((a) => `${a.proses}:${a.m}:${a.p || "-"}:${a.t ? "teslim" : "bekliyor"}`).sort();
  const urunSatiri = async () => { const r = (await q(`select ad, satis_fiyati::float sf, alis_fiyati::float af, tedarikci_id t, surum from public.urunler where id = $1`, [URUN]))[0]; return r; };
  // koşul gerçekleşene kadar bekle (arka planda başka koşu CPU yiyor olabilir) — en çok `sn` saniye
  const bekle = async (kosul, sn = 25) => { for (let i = 0; i < sn * 2; i++) { try { if (await kosul()) return true; } catch (e) { /* yeniden */ } await new Promise((r) => setTimeout(r, 500)); } return false; };

  // ── OTURUM AÇ: menü kaydı, pencere yanıtlayıcı, uygulamanın gerçek istek başlıklarının yakalanması
  const ac = async (kullanici) => {
    const c = await ekranAc(DB, { kullanici });
    c.kullanici = kullanici; c.pencereler = []; c.istem = null; c.ornek = null;
    c.sayfa.on("dialog", async (d) => { c.pencereler.push(`${d.type()}: ${kisa(d.message(), 90)}`);
      try { if (d.type() === "prompt") await d.accept(c.istem == null ? "" : c.istem); else await d.accept(); } catch (e) { /* kapanmış */ } });
    // uygulamanın KENDİ REST isteği: adres kökü + başlıklar yetkisiz denemelerde aynen kullanılır
    c.sayfa.on("request", (r) => { const u = r.url(); if (/\/rest\/v1\//.test(u)) { const h = r.headers(); if (h.authorization && (!c.ornek || r.method() !== "GET")) c.ornek = { kok: u.replace(/\/rest\/v1\/.*$/, "/rest/v1/"), basliklar: h, m: r.method() }; } });
    for (let i = 0; i < 30 && !(await c.sayfa.locator("[data-nav]").count()); i++) await c.sayfa.waitForTimeout(1000);
    // BİLDİRİM TOPLAYICI: bildirimler birkaç saniyede kaybolur; beklerken kaçmasın diye sayfada biriktirilir
    await c.sayfa.evaluate(() => { window.__paBildirim = [];
      const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__paBildirim.includes(t)) window.__paBildirim.push(t); });
      new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
    c.menu = await c.sayfa.evaluate(() => [...document.querySelectorAll("[data-nav]")].map((x) => x.getAttribute("data-nav")));
    c.gruplar = await c.sayfa.evaluate(() => [...document.querySelectorAll("[data-nav-grup]")].map((x) => x.getAttribute("data-nav-grup")));
    yaz(`\n■ ${kullanici} · ${c.eposta}`);
    yaz(`     menü ([data-nav]): ${c.menu.join(" · ")}`);
    yaz(`     menü grupları: ${c.gruplar.join(" · ")} · fiyat bayrağı ${JSON.stringify(await c.sayfa.evaluate(() => window.__fiyatYetki || null))}`);
    return c;
  };
  const erisilemiyor = (c, akis, modul) => { kalan += 1; yaz(`  ✗ [${c.kullanici}: ${akis}] EKRANDAN ERİŞİLEMİYOR — menüde "${modul}" yok`); };
  // son okumadan beri görünen bütün bildirimler (okununca boşalır)
  const toast = async (c) => kisa((await c.sayfa.evaluate(() => { const a = (window.__paBildirim || []).slice(); if (window.__paBildirim) window.__paBildirim.length = 0; return a; })).join(" | ") || "(bildirim yok)", 320);
  // akışlar bitince: sunucunun reddettiği yazmalar (uygulamanın kendi otomatik yazmaları dahil). Yetkisiz denemelerden ÖNCE alınır.
  const beklenmeyenRet = async (c) => {
    await c.sayfa.waitForTimeout(8000);   // yoklama + gecikmeli otomatik yazmalar
    const yazma = c.k.gunluk.filter((x) => x.m !== "GET" && x.m !== "HEAD" && x.m !== "OPTIONS");
    const red = yazma.filter((x) => x.durum >= 400).map((x) => `${x.m} ${x.yol} ${x.durum} ${x.kod || ""} ${kisa(x.mesaj, 150)}`);
    if (k_(`${c.kullanici}: akışlarda sunucunun reddettiği yazma YOK (${yazma.length} yazma isteği)`, red, []) === false)
      red.filter((r) => !bulgular.some((b) => b.startsWith(c.kullanici) && b.includes(r.slice(0, 60)))).forEach((r) => bulgu(`${c.kullanici} — beklenmeyen ret: ${r}`));
    c.gunlukSinir = c.k.gunluk.length;
  };

  // ── ÜRÜN KARTI (ekran-b3a2-personel'deki yol): Ürün Stok › "Ekran Bot…" kartı › Düzenle
  const urunKartiAc = async (c) => {
    const s = c.sayfa;
    await O.modulAc(s, "Ürün Stok"); await s.waitForTimeout(1200);
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
  // kartın fiyat kutuları: "Alış" / "Satış" etiketli sayı kutuları (step="any") → { alis: açık mı, satis: açık mı, neden }
  const fiyatKutulari = (c) => c.sayfa.evaluate(() => { const o = {};
    [...document.querySelectorAll('label input[type="number"]')].filter((x) => x.offsetParent && x.step === "any").forEach((x) => {
      const e = (x.closest("label").textContent || "").trim(); const ad = /^Alış/.test(e) ? "alis" : /^Satış/.test(e) ? "satis" : null;
      if (ad && !(ad in o)) { o[ad] = !x.disabled; if (x.disabled) o[ad + "Neden"] = x.title || ""; } });
    return o; });
  const kartKaydet = async (c) => { await c.sayfa.locator('[data-kart-eylem="kaydet"]:visible').first().click(); await c.sayfa.waitForTimeout(1500); };
  const kartVazgec = async (c) => { const v = c.sayfa.locator('[data-kart-eylem="vazgec"]:visible, [data-kart-eylem="iptal"]:visible'); if (await v.count()) { await v.first().click(); await c.sayfa.waitForTimeout(500); } };
  const fiyatKutuKontrol = async (c, beklenen) => {
    if (!c.menu.includes("Ürün Stok")) { yaz(`     (${c.kullanici}: ürün kartı — menüde "Ürün Stok" yok, kutular ölçülemedi)`); return; }
    if (!(await urunKartiAc(c))) { kalan += 1; yaz(`  ✗ [${c.kullanici}: ürün kartı düzenlemeye açılamadı] ${kisa(await c.sayfa.evaluate(() => document.body.innerText), 200)}`); return; }
    const f = await fiyatKutulari(c);
    k_(`${c.kullanici}: ürün kartında fiyat kutuları (alış açık mı, satış açık mı)`, [f.alis, f.satis], beklenen);
    if (f.alisNeden || f.satisNeden) yaz(`     kapalı kutunun açıklaması: ${[f.alisNeden, f.satisNeden].filter(Boolean).join(" | ")}`);
    await kartVazgec(c);
  };

  // ── YETKİSİZ / İZİNLİ DOĞRUDAN YAZMA: sayfanın içinden, hesabın kendi jetonu ve uygulamanın başlıklarıyla
  const istek = async (c, m, yol, govde, prefer) => {
    const o = c.ornek || {};
    return c.sayfa.evaluate(async ({ m, yol, govde, prefer, kok, ornek }) => {
      // uygulamanın gönderdiği başlıklar (yakalanan gerçek istekten); jeton oturum deposundan — hesabın KENDİ jetonu
      const oturum = JSON.parse(localStorage.getItem("atolye:oturum") || "{}");
      const h = { "Content-Type": "application/json", Authorization: `Bearer ${oturum.erisim}` };
      for (const a of ["apikey", "x-atolye-surum", "x-istemci"]) if (ornek && ornek[a]) h[a] = ornek[a];
      if (prefer) h.Prefer = prefer;
      const y = await fetch(kok + yol, { method: m, headers: h, body: govde === undefined ? undefined : JSON.stringify(govde), cache: "no-store" });
      const metin = await y.text(); let j = null; try { j = JSON.parse(metin); } catch (e) { /* boş gövde */ }
      return { durum: y.status, kod: j && !Array.isArray(j) ? j.code || null : null, mesaj: j && !Array.isArray(j) ? j.message || null : null, satir: Array.isArray(j) ? j.length : null, veri: j, jeton: oturum.erisim };
    }, { m, yol, govde, prefer, kok: o.kok, ornek: o.basliklar });
  };
  // uygulamanın biçimi: sürüm koşullu PATCH (040-esitle) — ?id=eq.X&surum=eq.N&select=id, gövdede değişen alan + surum N+1
  const surumluPatch = async (c, tablo, id, alanlar) => {
    const n = (await q(`select surum from public.${tablo} where id = $1`, [id]))[0].surum;
    return istek(c, "PATCH", `${tablo}?id=eq.${encodeURIComponent(id)}&surum=eq.${n}&select=id`, { ...alanlar, surum: n + 1 }, "return=representation");
  };
  const ozet = (r) => `HTTP ${r.durum}${r.kod ? ` · ${r.kod}` : ""}${r.satir != null ? ` · ${r.satir} satır` : ""}${r.mesaj ? ` · ${kisa(r.mesaj, 190)}` : ""}`;
  // RET beklenen deneme: 4xx + 42501 ve satır aynı
  const retBekle = async (c, ad, gonder, oku) => {
    const once = JSON.stringify(await oku()); const r = await gonder(); const sonra = JSON.stringify(await oku());
    const ok = k_(`${c.kullanici} YETKİSİZ: ${ad} → ret (4xx + 42501), satır değişmedi`, [r.durum >= 400 && r.durum < 500, r.kod, sonra === once], [true, "42501", true]);
    yaz(`     ${ozet(r)}`);
    if (!ok) bulgu(`${c.kullanici} — YETKİSİZ YAZMA beklenen biçimde reddedilmedi: ${ad} · ${ozet(r)} · önce ${kisa(once, 120)} · sonra ${kisa(sonra, 120)}`);
  };
  // GEÇMESİ beklenen deneme: 2xx, 1 satır, değer yazıldı
  const gecisBekle = async (c, ad, gonder, oku, beklenenDeger) => {
    const r = await gonder(); const sonra = await oku();
    const ok = k_(`${c.kullanici} İZİNLİ: ${ad} → geçti, değer yazıldı`, [r.durum >= 200 && r.durum < 300, r.satir, sonra], [true, 1, beklenenDeger]);
    yaz(`     ${ozet(r)}`);
    if (!ok) bulgu(`${c.kullanici} — YETKİLİ YAZMA reddedildi / yazılmadı: ${ad} · ${ozet(r)}`);
  };
  const fiyatOku = (sutun) => async () => Number((await q(`select ${sutun}::float v from public.urunler where id = $1`, [URUN]))[0].v);
  const fiyatPatch = (c, sutun, deger) => () => surumluPatch(c, "urunler", URUN, { [sutun]: deger });
  const unvanOku = async () => (await q(`select unvan from public.cariler where id = $1`, [MUSTERI]))[0].unvan;
  const tanimOku = (anahtar) => async () => (await q(`select veri -> $1 v from public.tanimlar where id = 'tekil'`, [anahtar]))[0].v;
  // tanimlar: hesabın jetonuyla bütün `veri` okunur, değiştirilir; (1) uygulamanın biçimi = tek satır upsert, (2) düz PATCH
  const tanimDene = async (c, ad, degistir, anahtar) => {
    const oku = async () => { const r = await istek(c, "GET", "tanimlar?id=eq.tekil&select=veri"); return JSON.parse(JSON.stringify(r.veri[0].veri)); };
    await retBekle(c, `${ad} (tanimlar upsert — uygulamanın biçimi)`, async () => { const v = await oku(); degistir(v); return istek(c, "POST", "tanimlar", [{ id: "tekil", veri: v }], "resolution=merge-duplicates,return=minimal"); }, tanimOku(anahtar));
    await retBekle(c, `${ad} (tanimlar PATCH)`, async () => { const v = await oku(); degistir(v); return istek(c, "PATCH", "tanimlar?id=eq.tekil", { veri: v }, "return=representation"); }, tanimOku(anahtar));
  };
  const denemeBasligi = async (c) => { yaz(`  — doğrudan REST denemeleri (jeton ${c.ornek ? "✓" : "?"} · kök ${c.ornek ? c.ornek.kok.replace(/^https?:\/\//, "").slice(0, 60) : "YOK"} · başlıklar ${c.ornek ? Object.keys(c.ornek.basliklar).filter((x) => /apikey|authorization|x-atolye|x-istemci|content-type/.test(x)).join(", ") : "—"})`);
    const j = await c.sayfa.evaluate(() => (JSON.parse(localStorage.getItem("atolye:oturum") || "{}").erisim) || "");
    k_(`${c.kullanici}: denemeler hesabın KENDİ jetonuyla`, j, `yerel-test:${c.eposta}`); };
  const kapat = async (c) => {
    // denemeler sırasında köprünün gördüğü ret sayısı (bilgi) + sayfa hatası
    k_(`${c.kullanici}: sayfa hatası yok`, c.hatalar, []);
    if (c.pencereler.length) yaz(`     tarayıcı pencereleri: ${c.pencereler.join(" | ")}`);
    await c.tarayici.close(); await c.k.kapat().catch(() => {});
  };

  // ── TAHSİLAT FİŞİNİN EKRANDAN İPTALİ: Ödeme & Tahsilat › "Son tahsilat ve ödemeler"de satıra dokun → cari kartı açılır ›
  // Hareketler'de fişin satırındaki Sil › onay. (Listedeki doğrudan sil düğmesi yalnız gelir/gider KARTI kayıtlarında — 260-cari.)
  const fisIptalMi = (r) => (r[0] ? (r[0].iptal ? "iptal" : "geçerli") : "fiş yok");
  const tahsilatIptal = async (c, giris, fisNo, b0) => {
    const s = c.sayfa;
    await O.modulAc(s, giris); await s.waitForTimeout(900);
    const sek = s.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible'); if (await sek.count()) { await sek.first().click(); await s.waitForTimeout(800); }
    const satir = s.locator(`[data-odeme-son-satir="${fisNo}"]:visible`).first();
    if (!(await satir.count())) { kalan += 1; yaz(`  ✗ [${c.kullanici}: tahsilat fişinin iptali] EKRANDAN ERİŞİLEMİYOR — "Son tahsilat ve ödemeler"de ${fisNo} satırı yok`); return false; }
    await satir.click(); await s.waitForTimeout(1500);
    const sil = s.locator("tr", { has: s.locator(`button[title^="${fisNo}"]`) }).locator("[data-sil-onay]:visible").first();
    if (!(await sil.count())) { kalan += 1; yaz(`  ✗ [${c.kullanici}: tahsilat fişinin iptali] EKRANDAN ERİŞİLEMİYOR — cari kartının Hareketler'inde ${fisNo} satırında Sil düğmesi yok`); return false; }
    const sinir = c.k.gunluk.length; await toast(c);
    await sil.click(); await s.waitForTimeout(600);
    const onay = s.locator("[data-sil-onayla]:visible"); if (await onay.count()) await onay.first().click();
    await bekle(async () => (await kasaBakiye()) === b0.kasa, 15); await s.waitForTimeout(1500);
    const b2 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: fisIptalMi(await q(`select iptal from public.stk_fis where id = $1`, [fisNo])) };
    const istekler = c.k.gunluk.slice(sinir).filter((x) => x.m !== "GET" && x.m !== "HEAD").map((x) => `${x.m} ${x.yol} ${x.durum}${x.kod ? ` ${x.kod} ${kisa(x.mesaj, 160)}` : ""}`);
    const bildirim = await toast(c);
    const ok = k_(`${c.kullanici}: tahsilat fişi ${fisNo} ekrandan iptal → [kasa farkı, cari bakiye farkı] başa döndü, fiş iptal`, [b2.kasa - b0.kasa, b2.cari - b0.cari, b2.fis], [0, 0, "iptal"]);
    yaz(`     bildirim: ${bildirim} · yazmalar: ${JSON.stringify(istekler)}`);
    const onayKaydi = await q(`select count(*)::int n from public.onaylar`).catch(() => [{ n: "?" }]);
    yaz(`     onay bekleyen kayıt (onaylar tablosu): ${onayKaydi[0].n}`);
    if (!ok) bulgu(`${c.kullanici} — tahsilat fişinin (${fisNo}) ekrandan iptali tamamlanmadı: ${istekler.filter((x) => / [45]\d\d/.test(x)).join(" ; ") || "sunucuya iptal isteği gitmedi"} · ekrandaki bildirim: ${bildirim}`);
    return ok;
  };

  // ── ÜRETİM EKRANI yardımcıları (ekran-uretim-b4.js'den): kart aç, İşi Ver, teslim, Geri Al; her adım sunucudan ölçülür
  const uretimEkrani = (c) => {
    const s = c.sayfa;
    const kartAc = async () => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(1200); await s.getByText(URETIM_NO, { exact: true }).last().click(); await s.waitForTimeout(1500); };
    const isVer = async (personel) => {
      if (!(await s.locator('button:has-text("İşi Ver"):visible').count())) await kartAc();
      await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption(personel);
      await s.waitForTimeout(400); await s.locator('button:has-text("İşi Ver"):visible').last().click();
    };
    const teslim = async (saglam) => {
      if (!(await s.locator("[data-teslim-al]:visible").count())) await kartAc();
      if (!(await s.locator("[data-teslim-al]:visible").count())) throw new Error("ekranda teslim formu ([data-teslim-al]) yok");
      const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
      await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill(String(saglam)); await s.waitForTimeout(400);
      await s.locator("[data-teslim-al]:visible").first().click();
    };
    const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")', TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")';
    const geriAl = async () => {
      for (let tur = 0; tur < 3; tur++) {
        for (const sec of [GERI, TAM]) { const d = s.locator(sec + ":visible"); if (await d.count()) { await d.first().click(); return; } }
        const detay = s.getByText("detay / geri al");
        if ((await detay.count()) && (await detay.last().isVisible())) { await detay.last().click(); await s.waitForTimeout(1000); continue; }
        await kartAc();
      }
      throw new Error('ekranda "Geri Al" düğmesi yok');
    };
    const foto = async () => ({ mamul: await stok("Siyah", "40"), usta: await cariBakiye(USTA) });
    const adim = async (ad, is, kosul, beklenen, o) => {
      const sinir = c.k.gunluk.length; await toast(c);
      try { await is(); } catch (e) { yaz(`     ! ${ad}: ekran adımı yapılamadı — ${kisa(e.message, 160)}`); }
      await bekle(kosul, 20); await s.waitForTimeout(1500);
      const yazma = c.k.gunluk.slice(sinir).filter((x) => x.m !== "GET" && x.m !== "HEAD").map((x) => `${x.m} ${x.yol} ${x.durum}${x.kod ? ` ${x.kod} ${kisa(x.mesaj, 160)}` : ""}`);
      const f = await foto();
      const ok = k_(`${c.kullanici}: ${ad} → [mamul farkı, usta bakiye farkı, üretim fişleri, atamalar]`, [f.mamul - o.mamul, f.usta - o.usta, await uretimFis(), await atamalar()], beklenen);
      const bildirim = await toast(c);
      yaz(`     bildirim: ${bildirim} · yazmalar: ${JSON.stringify(yazma)}`);
      if (!ok && yazma.some((x) => / [45]\d\d/.test(x))) bulgu(`${c.kullanici} — üretim adımı sunucuda reddedildi (${ad}): ${yazma.filter((x) => / [45]\d\d/.test(x)).join(" ; ")} · ekrandaki bildirim: ${bildirim}`);
      return ok;
    };
    const atla = (ad, neden) => { kalan += 1; yaz(`  ✗ [${c.kullanici}: ${ad}] YAPILAMADI — ${neden}`); return false; };
    return { kartAc, isVer, teslim, geriAl, foto, adim, atla };
  };
  const U = { bos: [0, 0, "0 geçerli / 0 iptal", [`Dikim:10:${USTA}:bekliyor`]], teslim1: [10, -350, "1 geçerli / 0 iptal", [`Dikim:10:${USTA}:teslim`]],
    geri: [0, 0, "0 geçerli / 1 iptal", [`Dikim:10:${USTA}:bekliyor`]], teslim2: [10, -350, "1 geçerli / 1 iptal", [`Dikim:10:${USTA}:teslim`]] };
  const durumlar = {};   // hesaplar arası aktarılan: tahsilat fişi, üretim başlangıç ölçümü, hangi adımda kalındı

  // ════════════════════════════════════════ 1 · AYŞE (yalnız stok) ════════════════════════════════════════
  { const c = await ac("Ayşe"); const s = c.sayfa;
    k_("Ayşe: menüde Üretim YOK (iş verme / teslim bu hesaptan yapılamaz)", c.menu.includes("Üretim"), false);
    // (a) bağımsız stok giriş fişi — ekran-stok.js'deki yol
    if (!c.menu.includes("Stok")) erisilemiyor(c, "bağımsız stok giriş fişi", "Stok");
    else {
      const f0 = await fisSayisi(), s40 = await stok("Siyah", "40"), s41 = await stok("Siyah", "41");
      await O.modulAc(s, "Stok"); await s.waitForTimeout(1000);
      if (!(await s.locator("[data-stok-giris-seridi]").count())) { await s.locator('button[title^="Bağımsız stok girişi"]').first().click(); await s.waitForTimeout(600); }
      await s.locator("[data-stok-giris-urun]").first().selectOption(URUN); await s.waitForTimeout(400);
      await s.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await s.waitForTimeout(400);
      await s.locator('[data-stok-giris-miktar="40"]').first().fill("5"); await s.locator('[data-stok-giris-miktar="41"]').first().fill("3");
      await s.locator("[data-stok-giris-seridi] .btn-save").first().click();
      await bekle(async () => (await stok("Siyah", "40")) === s40 + 5);
      yaz(`     bildirim: ${await toast(c)}`);
      k_("Ayşe (a): bağımsız stok girişi → stok Siyah 40 +5, 41 +3", [(await stok("Siyah", "40")) - s40, (await stok("Siyah", "41")) - s41], [5, 3]);
      k_("Ayşe (a): stk_fis'te 1 yeni geçerli fiş", [f0, await fisSayisi()], ["0 geçerli / 0 iptal", "1 geçerli / 0 iptal"]);
      const fis = (await q(`select id, tur, olusturan from public.stk_fis order by olusturma desc limit 1`))[0];
      yaz(`     fiş: ${fis ? `${fis.id} · ${fis.tur} · ${fis.olusturan}` : "YOK"}`);
    }
    if (!c.menu.includes("Ürün Stok")) { erisilemiyor(c, "ürün kartı düzenleme", "Ürün Stok"); erisilemiyor(c, "hızlı tedarikçi ekleme", "Ürün Stok"); }
    else {
      // (b) fiyat DIŞI alan (ad) + fiyat kutuları kapalı
      const u0 = await urunSatiri(); const yeniAd = "Ekran Bot Ayşe";
      if (!(await urunKartiAc(c))) { kalan += 1; yaz("  ✗ [Ayşe (b): ürün kartı düzenlemeye açılamadı]"); }
      else {
        const f = await fiyatKutulari(c);
        k_("Ayşe (b): ürün kartında fiyat kutuları KAPALI (alış açık mı, satış açık mı)", [f.alis, f.satis], [false, false]);
        yaz(`     açıklama: ${[f.alisNeden, f.satisNeden].filter(Boolean).join(" | ")}`);
        await s.evaluate(() => { const i = [...document.querySelectorAll("input")].find((x) => x.offsetParent && /^Ekran Bot/.test(x.value || "")); if (i) i.setAttribute("data-sinama-ad", "1"); });
        await s.locator('[data-sinama-ad="1"]').fill(yeniAd); await s.waitForTimeout(300);
        await kartKaydet(c);
        await bekle(async () => (await urunSatiri()).ad === yeniAd);
        const u1 = await urunSatiri();
        k_("Ayşe (b): fiyat dışı alan (ad) kaydedildi, fiyatlar aynen", [u1.ad, u1.sf, u1.af], [yeniAd, u0.sf, u0.af]);
        yaz(`     bildirim: ${await toast(c)}`);
      }
      // (c) hızlı tedarikçi: kartta Tedarikçi › "+ Yeni tedarikçi tanımla…" (window.prompt) › Kaydet
      const HIZLI = "PA Hızlı Tedarik";
      const c0 = (await q(`select count(*)::int n from public.cariler`))[0].n;
      if (!(await urunKartiAc(c))) { kalan += 1; yaz("  ✗ [Ayşe (c): ürün kartı düzenlemeye açılamadı]"); }
      else {
        const sec = s.locator('select[data-urun-tedarikci]:visible');
        if (!(await sec.count())) { kalan += 1; yaz("  ✗ [Ayşe (c): kartta Tedarikçi seçimi yok — ekrandan erişilemiyor]"); }
        else {
          const secenekler = await sec.first().evaluate((x) => [...x.options].map((o) => o.value));
          if (!secenekler.includes("__yeni__")) { kalan += 1; yaz(`  ✗ [Ayşe (c): "+ Yeni tedarikçi tanımla…" seçeneği yok] ${JSON.stringify(secenekler)}`); }
          else {
            c.istem = HIZLI;
            await sec.first().selectOption("__yeni__"); await s.waitForTimeout(1200);
            await bekle(async () => (await q(`select 1 from public.cariler where unvan = $1`, [HIZLI])).length > 0, 15);
            const secili = await sec.first().inputValue().catch(() => "");
            await kartKaydet(c);
            await bekle(async () => !!(await urunSatiri()).t, 15);
            const yeni = (await q(`select id, unvan, tip, coalesce(telefon, '') tel, coalesce(vergi_no, '') vn, coalesce(adres, '') adr, coalesce(fiyat_grubu, '') fg, coalesce(ek ->> 'fiyatGrubuId', '') fgid,
              coalesce(bagli_prosesler, '[]'::jsonb)::text bp, coalesce(pasif, false) pasif from public.cariler where unvan = $1`, [HIZLI]));
            k_("Ayşe (c): hızlı tedarikçi → cariler'de 1 yeni satır", [(await q(`select count(*)::int n from public.cariler`))[0].n - c0, yeni.length], [1, 1]);
            if (yeni[0]) {
              k_("Ayşe (c): yeni cari yalnız unvan + tip (telefon, vergi no, adres, fiyat grubu, bağlı proses boş; pasif değil)",
                [yeni[0].unvan, yeni[0].tip, yeni[0].tel, yeni[0].vn, yeni[0].adr, yeni[0].fg, yeni[0].fgid, yeni[0].bp, yeni[0].pasif], [HIZLI, "Tedarikçi", "", "", "", "", "", "[]", false]);
              k_("Ayşe (c): ürün kartı yeni tedarikçiyle kaydedildi (urunler.tedarikci_id)", (await urunSatiri()).t, yeni[0].id);
              yaz(`     kartta seçili: ${secili} · pencere: ${c.pencereler.slice(-1)[0] || "—"}`);
            }
          }
        }
      }
    }
    await beklenmeyenRet(c);
    await denemeBasligi(c);
    await retBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", (await fiyatOku("satis_fiyati")()) + 7), fiyatOku("satis_fiyati"));
    await retBekle(c, "cariler unvan PATCH", () => surumluPatch(c, "cariler", MUSTERI, { unvan: "Ayşe Değiştirdi" }), unvanOku);
    await tanimDene(c, "bir rengi silme (renkler'den Vizon Yılan)", (v) => { v.renkler = (v.renkler || []).filter((r) => r.id !== "r-vizon"); }, "renkler");
    await kapat(c); }

  // ════════════════════════════════════════ 2 · SELİN (yalnız sipariş) ════════════════════════════════════════
  { const c = await ac("Selin"); const s = c.sayfa;
    k_("Selin: menüde Üretim YOK (iş verme / teslim bu hesaptan yapılamaz)", c.menu.includes("Üretim"), false);
    if (!c.menu.includes("Sipariş")) erisilemiyor(c, "yeni satış siparişi", "Sipariş");
    else {
      const n0 = (await q(`select (select coalesce(array_agg(id), '{}') from public.siparisler) idler, (select count(*) from public.siparis_kalemleri)::int k`))[0];
      await O.modulAc(s, "Sipariş"); await s.waitForTimeout(1000);
      await s.locator("[data-yeni-siparis]:visible").first().click(); await s.waitForTimeout(900);
      const kutu = s.locator("input[data-siparis-cari]:visible").first();
      await kutu.click(); await kutu.fill("İnceleme"); await s.waitForTimeout(400); await kutu.press("Enter"); await s.waitForTimeout(500);
      const secilen = await kutu.evaluate((i) => i.getAttribute("data-cari-id"));
      const u = s.locator("input[data-siparis-urun]:visible").first();
      await u.click(); await u.fill("Ekran"); await s.waitForTimeout(600); await u.press("Enter"); await s.waitForTimeout(700);
      const r = s.locator("input[data-siparis-renk-arama]:visible").first();
      await r.click(); await r.fill("Siy"); await s.waitForTimeout(500);
      await s.locator('[data-aramali-oneri="Siyah"]:visible').first().dispatchEvent("mousedown"); await s.waitForTimeout(700);
      await s.locator('[data-olcu-miktar="40"]:visible').first().fill("4");
      await s.locator("[data-siparis-birim-fiyat]:visible").first().fill("100"); await s.waitForTimeout(300);
      await s.locator("[data-kalemlere-ekle]:visible").first().click(); await s.waitForTimeout(800);
      await s.locator("[data-siparis-kaydet]:visible").first().click();
      await bekle(async () => (await q(`select count(*)::int n from public.siparis_kalemleri`))[0].n > n0.k, 25);
      yaz(`     seçilen cari ${secilen} · bildirim: ${await toast(c)}`);
      const sip = await q(`select id, siparis_no, cari_id, tip, durum from public.siparisler where id not in (select unnest($1::text[])) order by olusturma desc`, [n0.idler]);
      const kal = sip[0] ? await q(`select urun_id, urun_ad, renk, beden, miktar::float m, fiyat::float f, para_birimi pb from public.siparis_kalemleri where siparis_id = $1 order by sira`, [sip[0].id]) : [];
      k_("Selin: yeni satış siparişi → siparisler +1 (mevcut müşteri, tip Satış)", [sip.length, sip[0] && sip[0].cari_id, sip[0] && sip[0].tip], [1, MUSTERI, "Satış"]);
      k_("Selin: siparis_kalemleri'nde yeni siparişin kalemi (Ekran Bot · Siyah · 40 × 4 · 100)", kal.map((x) => [x.urun_id, x.renk, x.beden, x.m, x.f]), [[URUN, "Siyah", "40", 4, 100]]);
      yaz(`     sipariş: ${kisa(JSON.stringify(sip[0] || null), 200)} · kalem: ${kisa(JSON.stringify(kal), 240)}`);
    }
    await fiyatKutuKontrol(c, [false, true]);
    await beklenmeyenRet(c);
    await denemeBasligi(c);
    await retBekle(c, "urunler alış fiyatı PATCH", fiyatPatch(c, "alis_fiyati", (await fiyatOku("alis_fiyati")()) + 7), fiyatOku("alis_fiyati"));
    await retBekle(c, "cariler unvan PATCH", () => surumluPatch(c, "cariler", MUSTERI, { unvan: "Selin Değiştirdi" }), unvanOku);
    await retBekle(c, "müşterinin ek.fiyatGrubuId'si PATCH", async () => { const ek = (await q(`select coalesce(ek, '{}'::jsonb) ek from public.cariler where id = $1`, [MUSTERI]))[0].ek;
      return surumluPatch(c, "cariler", MUSTERI, { ek: { ...ek, fiyatGrubuId: "fg-sinama" } }); }, async () => (await q(`select ek from public.cariler where id = $1`, [MUSTERI]))[0].ek);
    { const hedef = (await fiyatOku("satis_fiyati")()) + 120;
      await gecisBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", hedef), fiyatOku("satis_fiyati"), hedef); }
    await kapat(c); }

  // ════════════════════════════════════════ 3 · MURAT (yalnız muhasebe) ════════════════════════════════════════
  { const c = await ac("Murat"); const s = c.sayfa;
    k_("Murat: menüde Üretim YOK (iş verme / teslim bu hesaptan yapılamaz)", c.menu.includes("Üretim"), false);
    const giris = ["Kasa & Banka", "Ödeme & Tahsilat"].find((m) => c.menu.includes(m));
    if (!giris) erisilemiyor(c, "tahsilat fişi + iptal", "Kasa & Banka / Ödeme & Tahsilat");
    else {
      yaz(`     Kasa & Banka alanına giriş: menü "${giris}"${giris === "Kasa & Banka" ? "" : ' (menüde ayrı "Kasa & Banka" öğesi yok; aynı alanın sekmesi)'}`);
      const odemeAc = async () => { await O.modulAc(s, giris); await s.waitForTimeout(900);
        const sek = s.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible'); if (await sek.count()) { await sek.first().click(); await s.waitForTimeout(800); } };
      const b0 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: await fisSayisi() };
      await odemeAc();
      await s.locator('[data-odeme-tip="Tahsilat"]:visible').first().click();
      await s.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await s.waitForTimeout(400);
      if ((await s.locator("[data-odeme-hesap]:visible").count()) > 1) await s.locator("[data-odeme-hesap]:visible", { hasText: "Merkez" }).first().click();
      const ck = s.locator("[data-odeme-cari]:visible").first();
      await ck.click(); await ck.fill("İnceleme Müşteri"); await s.waitForTimeout(500); await ck.press("Enter"); await s.waitForTimeout(900);
      await s.locator("[data-odeme-satiri-tutar]:visible").first().fill("500"); await s.waitForTimeout(300);
      // kasa ile cari para birimi farklıysa kur kutusu çıkar (sınama ortamında kur servisi yok) — boşsa doldur
      const kur = s.locator("[data-odeme-ikili-pb] input:visible");
      for (let i = 0; i < await kur.count(); i++) { if (!(await kur.nth(i).inputValue())) { await kur.nth(i).fill("1"); break; } }
      await s.locator("[data-odeme-satiri-kaydet]:visible").first().click();
      await bekle(async () => (await kasaBakiye()) !== b0.kasa, 25);
      const b1 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: await fisSayisi() };
      const th = (await q(`select coalesce(h.fis_no, f.id) no, f.id, f.tur, f.iptal, f.olusturan from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 order by h.olusturma desc limit 1`, [MUSTERI]))[0] || {};
      yaz(`     bildirim: ${await toast(c)} · fiş ${th.no || "YOK"} (${th.tur || "?"}, ${th.olusturan || "?"})`);
      k_("Murat: tahsilat fişi → kasa +500, cari bakiyesi −500 (alacak), 1 yeni geçerli fiş", [b1.kasa - b0.kasa, b1.cari - b0.cari, b1.fis], [500, -500, "2 geçerli / 0 iptal"]);
      durumlar.tahsilat = { no: th.no, b0, giris };
      await tahsilatIptal(c, giris, th.no, b0);
    }
    await fiyatKutuKontrol(c, [true, false]);
    await beklenmeyenRet(c);
    await denemeBasligi(c);
    await retBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", (await fiyatOku("satis_fiyati")()) + 7), fiyatOku("satis_fiyati"));
    { const hedef = (await fiyatOku("alis_fiyati")()) + 60;
      await gecisBekle(c, "urunler alış fiyatı PATCH", fiyatPatch(c, "alis_fiyati", hedef), fiyatOku("alis_fiyati"), hedef); }
    await tanimDene(c, "mevcut rengin adını değiştirme (Siyah → Kara)", (v) => { v.renkler = (v.renkler || []).map((r) => (r.id === "r-siyah" ? { ...r, ad: "Kara" } : r)); }, "renkler");
    await kapat(c); }

  // ════════════════════════════════════════ 4 · UMUT (yalnız üretim) ════════════════════════════════════════
  { const c = await ac("Umut"); const s = c.sayfa;
    k_("Umut: menüde Üretim VAR", c.menu.includes("Üretim"), true);
    if (!c.menu.includes("Üretim")) erisilemiyor(c, "İşi Ver → teslim → Geri Al → yeniden teslim", "Üretim");
    else {
      const e = uretimEkrani(c);
      await e.kartAc();
      const o = await e.foto(); durumlar.uretim = { o, geriAlindi: false, yenidenTeslim: false };
      yaz(`     başlangıç: mamul (Siyah/40) ${o.mamul} · usta bakiyesi ${o.usta} · fiş ${await uretimFis()} · atamalar ${JSON.stringify(await atamalar())}`);
      const a1 = await e.adim("İşi Ver (PA Usta)", () => e.isVer(USTA), async () => (await atamalar()).length > 0, U.bos, o);
      const a2 = a1 ? await e.adim("teslim al (sağlam 10)", () => e.teslim(10), async () => (await uretimFis()) === "1 geçerli / 0 iptal", U.teslim1, o) : e.atla("teslim al (sağlam 10)", "önceki adım (İşi Ver) tamamlanmadı");
      const a3 = a2 ? await e.adim("Geri Al (teslimin iptali)", () => e.geriAl(), async () => (await uretimFis()) === "0 geçerli / 1 iptal", U.geri, o) : e.atla("Geri Al (teslimin iptali)", "önceki adım (teslim) tamamlanmadı");
      const a4 = a3 ? await e.adim("yeniden teslim (sağlam 10)", () => e.teslim(10), async () => (await uretimFis()) === "1 geçerli / 1 iptal", U.teslim2, o) : e.atla("yeniden teslim (sağlam 10)", "önceki adım (Geri Al) tamamlanmadı — teslim hâlâ geçerli, yeniden teslim edilecek iş yok");
      durumlar.uretim.teslimEdildi = !!a2; durumlar.uretim.geriAlindi = !!a3; durumlar.uretim.yenidenTeslim = !!a4;
    }
    await beklenmeyenRet(c);
    await denemeBasligi(c);
    await retBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", (await fiyatOku("satis_fiyati")()) + 7), fiyatOku("satis_fiyati"));
    await retBekle(c, "urunler alış fiyatı PATCH", fiyatPatch(c, "alis_fiyati", (await fiyatOku("alis_fiyati")()) + 7), fiyatOku("alis_fiyati"));
    await retBekle(c, "cariler unvan PATCH", () => surumluPatch(c, "cariler", MUSTERI, { unvan: "Umut Değiştirdi" }), unvanOku);
    await kapat(c); }

  // ════════════════════════════════════════ EK · `silme` EKLENMİŞ HESAPLAR (teşhis) ════════════════════════════════════════
  // Yalnız asıl hesapta iptal adımı TAMAMLANMADIYSA koşar: aynı ekran yolu, aynı fiş / üretim — tek fark hesapta `silme` olması.
  if (durumlar.tahsilat && fisIptalMi(await q(`select iptal from public.stk_fis where id = $1`, [durumlar.tahsilat.no])) === "geçerli") {
    const c = await ac("Mert"); yaz("     (EK hesap: muhasebe görüntüleme + düzenleme + kaydetme + SİLME — Murat'ın iptal edemediği fiş)");
    const giris = ["Kasa & Banka", "Ödeme & Tahsilat"].find((m) => c.menu.includes(m));
    if (!giris) erisilemiyor(c, "tahsilat fişinin iptali", "Ödeme & Tahsilat"); else await tahsilatIptal(c, giris, durumlar.tahsilat.no, durumlar.tahsilat.b0);
    await beklenmeyenRet(c); await kapat(c);
  } else yaz("\n■ Mert (EK) — koşmadı: Murat'ın tahsilat fişi zaten iptal ya da hiç kesilmedi");
  if (durumlar.uretim && durumlar.uretim.teslimEdildi && !durumlar.uretim.yenidenTeslim) {
    const c = await ac("Ufuk"); yaz("     (EK hesap: üretim görüntüleme + düzenleme + kaydetme + SİLME — Umut'un geri alamadığı teslim)");
    if (!c.menu.includes("Üretim")) erisilemiyor(c, "Geri Al → yeniden teslim", "Üretim");
    else {
      const e = uretimEkrani(c), o = durumlar.uretim.o;
      await e.kartAc();
      const a3 = durumlar.uretim.geriAlindi || await e.adim("Geri Al (teslimin iptali)", () => e.geriAl(), async () => (await uretimFis()) === "0 geçerli / 1 iptal", U.geri, o);
      if (a3) await e.adim("yeniden teslim (sağlam 10)", () => e.teslim(10), async () => (await uretimFis()) === "1 geçerli / 1 iptal", U.teslim2, o);
      else e.atla("yeniden teslim (sağlam 10)", "Geri Al tamamlanmadı");
    }
    await beklenmeyenRet(c); await kapat(c);
  } else yaz("\n■ Ufuk (EK) — koşmadı: Umut'un akışı tamamlandı ya da teslim aşamasına gelmedi");

  // ── SON DURUM (sunucu) + ÖZET
  const u = await urunSatiri();
  yaz(`\nSON DURUM (sunucu): ürün ${JSON.stringify(u)} · müşteri unvanı "${await unvanOku()}" · renkler ${JSON.stringify((await tanimOku("renkler")()).map((r) => r.ad))} · fişler ${await fisSayisi()}`);
  yaz(`BULGULAR: ${bulgular.length ? "" : "yok"}`); bulgular.forEach((b, i) => yaz(`  ${i + 1}. ${b}`));
  yaz(`\n── ekran-personel-akis: ${gecen} geçti · ${kalan} kaldı ──`);
  fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  await k0.kapat().catch(() => {});
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); try { fs.writeFileSync(SONUC, satirlar.join("\n") + `\nHATA ${x && x.stack || x}\n`); } catch (e) { /* yazılamadı */ } process.exit(2); });
