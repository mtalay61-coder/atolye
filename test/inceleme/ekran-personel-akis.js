#!/usr/bin/env node
// EKRAN SINAMASI — GÜVENLİK PAKETLERİ (B4, B3a, B3a-2 + ret iletisi paketi 31) KURULUYKEN PERSONEL HESAPLARI (27 Kasım; istemci 1.744.44).
// Soru: paketler kuruluyken personel YETKİLİ işini ekrandan bitirebiliyor mu, YETKİSİZ yazma / iptal sunucuda reddediliyor mu, silme
// yetkisi olmayan hesap iptal / "Geri Al" düğmesini GÖRMÜYOR mu?
// Yalnız YEREL PostgreSQL (gercek-pg-kopru; Supabase'e / dış servise istek yok). Çalışma veritabanı her koşuda şablondan
// (aday_a4 = canlıya hizalı taban + ekran tohumu + üç paket + ret iletisi paketi) TAZE kopyalanır; şablona dokunulmaz.
//
// KULLANICI KARARI (27 Kasım): fiş iptali ve üretimde "Geri Al" SİLME yetkisi ister (altı modülden — stok, fisler, siparis, uretim, cari,
//   muhasebe — herhangi birinde); kaydetme yetkisi buna genişletilmez. Yani kaydetme yetkili ama silme yetkisiz personelin iptal
//   EDEMEMESİ beklenen davranıştır; ama düğmeyi görmemeli (1.744.44: window.__fisIptalGizli) ve doğrudan istekte sunucu yine
//   reddetmeli — iletide gerçek işlem ("fiş iptali") ve gereken yetki ("… modüllerinden birinde silme") yazmalı, "(stok: silme)" DEĞİL.
//
// HESAPLAR (yalnız sınama kopyasına eklenir; g = görüntüleme, d = düzenleme, k = kaydetme):
//   Ayşe = stok g/d/k (tohumda var) · Selin = sipariş g/d/k · Murat = muhasebe g/d/k · Umut = üretim g/d/k            → silme YOK
//   Mert = muhasebe g/d/k + SİLME · Ufuk = üretim g/d/k + SİLME
// OTURUM SIRASI: Ayşe, Selin, Mert, Murat, Ufuk, Umut. Silme yetkili hesap, eşi olan silmesiz hesaptan ÖNCE koşar: silmesiz hesabın
//   doğrudan iptal denemesi, silme yetkili hesabın ekrandan yaptığı GERÇEK iptal isteğinin gövdesini (istek dinleyicisiyle yakalanır)
//   kendi fişine uyarlayarak taklit eder. Hesapların kayıtları AYRI (her hesabın kendi tahsilat fişi, kendi üretim kayıtları).
// AKIŞLAR (hepsi ekrandan; sonuç sunucudan, süper kullanıcı sorgusuyla ölçülür):
//   Ayşe  : bağımsız stok giriş fişi · ürün kartında fiyat DIŞI alan (ad) · ürün kartından hızlı tedarikçi ekleme
//   Selin : yeni satış siparişi (mevcut müşteri, tek kalem) · ürün kartında satış kutusu açık / alış kapalı
//   Mert  : tahsilat → bildirimdeki "Geri al" ile iptal · ikinci tahsilat → cari kartı › Hareketler › Sil ile iptal
//   Murat : tahsilat → bildirimde "Geri al" YOK, Hareketler'de "Sil" YOK (DOM) → doğrudan rpc/fis_iptal reddedilir, fiş geçerli kalır
//   Ufuk / Umut — dört üretim akışı, her hesap KENDİ üretim kayıtlarında (Ufuk PAF…, Umut PAU…; hepsi 10 çift, Siyah/40):
//     TAM   (…1, Dikim 35 ₺)        : İşi Ver → teslim 10 [→ Ufuk: Geri Al → yeniden teslim · Umut: Geri Al YOK]
//     KISMİ (…K, Dikim 35 ₺)        : İşi Ver → 6 sağlam → kalan 4 [→ Ufuk: iki parçayı Geri Al → yeniden teslim · Umut: Geri Al YOK]
//     TAMİR (…T, Dikim 35 ₺)        : İşi Ver → 8 sağlam + 2 tamir (PA Tamirci, 5 ₺) → tamirci 2'yi teslim eder
//     HAMMADDELİ (…H, Kesim 30 ₺ reçeteli: fin-taban çift başına 1 · Saya 20 ₺): Kesim'i ver → hammadde ölçülür → Kesim teslim
//                                     [→ Ufuk: Geri Al → yeniden teslim · Umut: Geri Al YOK] → Saya'yı ver (PA Usta2) → Saya teslim
//   Her adımda: mamul stoğu (ekr-bot Siyah/40), hammadde stoğu (fin-taban Siyah/40), üç personelin cari bakiyesi (akış başına FARK),
//   üretimin geçerli / iptal fişleri, atama satırları (T = tamir ataması). Oturum sonunda toplam fark: fazla stok / çift işçilik yok.
//   Umut'un TAM teslimine, Ufuk'un yakalanan gerçek `fis_iptal_toplu` gövdesi uyarlanarak doğrudan istek atılır → ret beklenir.
// YETKİSİZ DENEMELER: her hesabın KENDİ oturum jetonuyla, sayfanın içinden `fetch` — uygulamanın gönderdiği başlıklar (apikey,
//   Authorization, x-atolye-surum, Prefer) ve biçim (sürüm koşullu PATCH: ?id=eq.X&surum=eq.N, gövdede surum N+1; tanimlar: tek
//   satırın upsert'i — uygulamanın `tekilYaz` biçimi — ve ayrıca düz PATCH). Beklenen ret: HTTP 4xx + 42501, satır değişmedi.
// BEKLENMEYEN RET: akışlar boyunca köprü günlüğünde (k.gunluk) durum ≥ 400 olan her yazma (uygulamanın kendi otomatik yazmaları
//   dahil) — hem akış başına hem oturum sonunda listelenir.
// Kural: yetkili akış reddedilirse, yetkisiz yazma / iptal geçerse ya da fazla stok / çift işçilik oluşursa sınama EĞİLMEZ — ✗ olarak
//   kalır ve BULGU diye yazılır.
//
// Kullanım: PGHOST=localhost KOPRU_PG=<pg modülü> PW_CHROMIUM=<chromium> node test/inceleme/ekran-personel-akis.js
//   EKRAN_DB verilirse o veritabanı OLDUĞU GİBİ kullanılır (kopyalanmaz); verilmezse aday_pa, EKRAN_SABLON (vars. aday_a4) kopyası.
//   PA_YALNIZ=Ufuk,Umut → yalnız o oturumlar (hata ayıklama; sonuç dosyası YAZILMAZ, tam koşunun sonucu bozulmasın).
const fs = require("fs");
const path = require("path");
const { ekranAc, O } = require("../ekran/ortak-ekran.js");
const { kopruKur } = require("../gercek-pg-kopru.js");
const { Client } = require(process.env.KOPRU_PG || "pg");

const DB = process.env.EKRAN_DB || "aday_pa";
const SABLON = process.env.EKRAN_SABLON || "aday_a4";
const SONUC = path.join(__dirname, "sonuc-ekran-personel-akis.txt");
const URUN = "ekr-bot", HAMMADDE = "fin-taban", MUSTERI = "inc-musteri", USTA = "pa-usta", USTA2 = "pa-usta2", TAMIRCI = "pa-tamirci";
// üretim kayıtları: hesap başına dört akış (ön ek PAF = Ufuk, PAU = Umut); kimlik = "pa-" + küçük harfli no
const URETIMLER = (on) => ({ tam: `${on}1`, kismi: `${on}K`, tamir: `${on}T`, ham: `${on}H` });
const uid = (no) => `pa-${no.toLowerCase()}`;
const YALNIZ = process.env.PA_YALNIZ ? process.env.PA_YALNIZ.split(",").map((x) => x.trim()) : null;
const kosar = (ad) => !YALNIZ || YALNIZ.includes(ad);

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
  await q(`insert into public.cariler (id, unvan, tip) values ($1, 'PA Usta', 'Personel'), ($2, 'PA Usta2', 'Personel'), ($3, 'PA Tamirci', 'Personel') on conflict (id) do nothing`, [USTA, USTA2, TAMIRCI]);
  // hammadde + reçete (ekran-uretim-b4.js fikstürü): yalnız "Kesim" adımı fin-taban düşer (çift başına 1); Dikim ve Saya reçetesiz
  await q(`insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ($1, 'Fin Taban', 'Hammadde', 'çift', 'Beden', false, 1) on conflict (id) do nothing`, [HAMMADDE]);
  await q(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif)
           values ('vry-fin-taban', $1, public.stk_renk_coz(null, 'Siyah'), public.stk_olcu_coz(null, '40'), 0, true) on conflict (id) do nothing`, [HAMMADDE]);
  await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35, "Kesim": 30, "Saya": 20}'::jsonb,
             recete = '[{"hammaddeUrunId": "fin-taban", "hammaddeAd": "Fin Taban", "mamulRenk": "Siyah", "mamulBeden": "40", "proses": "Kesim", "renk": "Siyah", "beden": "40", "miktar": 1, "birim": "çift"}]'::jsonb
           where id = $1`, [URUN]);
  // üretimler: hiçbir adım VERİLMEMİŞ — iş ekrandan "İşi Ver" ile verilir (gerçek akış). Hesap başına: üç tek adımlı (Dikim) + bir Kesim → Saya
  for (const on of ["PAF", "PAU"]) { const N = URETIMLER(on);
    for (const [no, adimlar] of [[N.tam, ["Dikim"]], [N.kismi, ["Dikim"]], [N.tamir, ["Dikim"]], [N.ham, ["Kesim", "Saya"]]])
      await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
        values ($1, $2, $2, $3, $4, '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $5::jsonb, '2026-11-27T08:00:00.000Z')`,
        [uid(no), no, URUN, adimlar[0], JSON.stringify(adimlar.map((p, i) => ({ proses: p, sira: i + 1, verildiMi: false, tamamlandiMi: false })))]); }
  const paketler = (await q(`select (select count(*) from pg_trigger where tgname = 'b3a_yazma_koru')::int a, (select count(*) from pg_trigger where tgname = 'b3a2_alan_koru')::int b,
    (select count(*) from pg_proc where proname like 'b4\\_%')::int c`))[0];
  yaz(`ekran-personel-akis · ${DB} (şablon ${process.env.EKRAN_DB ? "—" : SABLON}) · b3a_yazma_koru ${paketler.a} tablo · b3a2_alan_koru ${paketler.b} tablo · b4_* işlev ${paketler.c}${YALNIZ ? ` · YALNIZ ${YALNIZ.join(", ")} (kısmi koşu)` : ""}`);
  k_("üç paket kurulu (B3a, B3a-2 tetikleyicileri, B4 işlevleri)", [paketler.a > 0, paketler.b > 0, paketler.c > 0], [true, true, true]);

  // ── SUNUCU ÖLÇÜMLERİ
  const stok = async (renk = "Siyah", olcu = "40") => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = $1 and renk_ad = $2 and olcu_ad = $3`, [URUN, renk, olcu]))[0] || {}).m || 0);
  const cariBakiye = async (id) => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`, [id]))[0].t);
  const kasaBakiye = async () => Number((await q(`select coalesce(sum(case when h.veri->>'yon' = 'Giriş' then (h.veri->>'tutar')::numeric else -(h.veri->>'tutar')::numeric end), 0)::float b
      from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where h.hesap_id = 'K1' and not h.iptal and (h.fis_id is null or not f.iptal)`))[0].b);
  const fisSayisi = async () => { const r = (await q(`select count(*) filter (where not iptal)::int g, count(*) filter (where iptal)::int i from public.stk_fis`))[0]; return `${r.g} geçerli / ${r.i} iptal`; };
  const uretimFis = async (id) => { const r = (await q(`select count(*) filter (where not iptal)::int g, count(*) filter (where iptal)::int i from public.stk_fis where uretim_id = $1`, [id]))[0]; return `${r.g} geçerli / ${r.i} iptal`; };
  const gecerliFisler = async (id) => (await q(`select id from public.stk_fis where uretim_id = $1 and not iptal order by id`, [id])).map((x) => x.id);
  // atama satırı: proses:miktar[T = tamir ataması]:personel:durum
  const atamaSatirlari = (id) => q(`select id, proses, miktar::float m, tamamlandi_mi t, tamir_mi tm, personel_id p from public.uretim_atamalari where uretim_id = $1 order by id`, [id]);
  const atamalar = async (id) => (await atamaSatirlari(id)).map((a) => `${a.proses}:${a.m}${a.tm ? "T" : ""}:${a.p || "-"}:${a.t ? "teslim" : "bekliyor"}`).sort();
  const stokU = async (urun) => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' and olcu_ad = '40'`, [urun]))[0] || {}).m || 0);
  // üretim ölçümü: mamul, hammadde, üç personelin bakiyesi (alacak −). fark = sıfırdan farklı değişimler (anahtar sırası foto sırası)
  const foto = async () => ({ mamul: await stokU(URUN), taban: await stokU(HAMMADDE), usta: await cariBakiye(USTA), usta2: await cariBakiye(USTA2), tamirci: await cariBakiye(TAMIRCI) });
  const fark = (a, b) => Object.fromEntries(Object.keys(b).map((x) => [x, Math.round((b[x] - a[x]) * 100) / 100]).filter(([, v]) => v !== 0));
  // DEFTER ÖZETİ: reddedilen iptal denemesinde "hiçbir kayıt değişmedi" — fiş, stok / cari / kasa hareketi, atama, üretim, stok satırları
  const defter = async () => (await q(`select string_agg(t || '=' || n || ':' || m, ' ' order by t) s from (
      select 'stk_fis' t, count(*) n, md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) m from public.stk_fis x
      union all select 'stk_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_hareket x
      union all select 'car_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.car_hareket x
      union all select 'kas_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.kas_hareket x
      union all select 'uretim_atamalari', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.uretim_atamalari x
      union all select 'uretim', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.uretim x
      union all select 'stk_stok', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_stok x) z`))[0].s;
  const urunSatiri = async () => { const r = (await q(`select ad, satis_fiyati::float sf, alis_fiyati::float af, tedarikci_id t, surum from public.urunler where id = $1`, [URUN]))[0]; return r; };
  // koşul gerçekleşene kadar bekle (arka planda başka koşu CPU yiyor olabilir) — en çok `sn` saniye
  const bekle = async (kosul, sn = 25) => { for (let i = 0; i < sn * 2; i++) { try { if (await kosul()) return true; } catch (e) { /* yeniden */ } await new Promise((r) => setTimeout(r, 500)); } return false; };

  // ── OTURUM AÇ: menü kaydı, pencere yanıtlayıcı, uygulamanın gerçek istek başlıklarının yakalanması
  const ac = async (kullanici) => {
    const c = await ekranAc(DB, { kullanici });
    c.kullanici = kullanici; c.pencereler = []; c.istem = null; c.ornek = null; c.rpc = [];
    c.sayfa.on("dialog", async (d) => { c.pencereler.push(`${d.type()}: ${kisa(d.message(), 90)}`);
      try { if (d.type() === "prompt") await d.accept(c.istem == null ? "" : c.istem); else await d.accept(); } catch (e) { /* kapanmış */ } });
    // uygulamanın KENDİ REST isteği: adres kökü + başlıklar yetkisiz denemelerde aynen kullanılır
    c.sayfa.on("request", (r) => { const u = r.url(); if (/\/rest\/v1\//.test(u)) { const h = r.headers(); if (h.authorization && (!c.ornek || r.method() !== "GET")) c.ornek = { kok: u.replace(/\/rest\/v1\/.*$/, "/rest/v1/"), basliklar: h, m: r.method() };
        // uygulamanın GERÇEK RPC gövdeleri (iptal isteklerinin biçimi buradan alınır)
        const rpc = u.match(/\/rest\/v1\/(rpc\/[a-z_0-9]+)/); if (rpc && r.method() === "POST") c.rpc.push({ yol: rpc[1], govde: r.postData() }); } });
    for (let i = 0; i < 30 && !(await c.sayfa.locator("[data-nav]").count()); i++) await c.sayfa.waitForTimeout(1000);
    // BİLDİRİM TOPLAYICI: bildirimler birkaç saniyede kaybolur; beklerken kaçmasın diye sayfada biriktirilir
    // __paGeriAl: bildirimde "Geri al" düğmesi ([data-toast-geri-al]) HİÇ çizildi mi (son sıfırlamadan beri)
    await c.sayfa.evaluate(() => { window.__paBildirim = []; window.__paGeriAl = 0;
      const tara = () => { if (document.querySelector("[data-toast-geri-al]")) window.__paGeriAl += 1;
        document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__paBildirim.includes(t)) window.__paBildirim.push(t); }); };
      new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
    c.menu = await c.sayfa.evaluate(() => [...document.querySelectorAll("[data-nav]")].map((x) => x.getAttribute("data-nav")));
    c.gruplar = await c.sayfa.evaluate(() => [...document.querySelectorAll("[data-nav-grup]")].map((x) => x.getAttribute("data-nav-grup")));
    yaz(`\n■ ${kullanici} · ${c.eposta}`);
    yaz(`     menü ([data-nav]): ${c.menu.join(" · ")}`);
    yaz(`     menü grupları: ${c.gruplar.join(" · ")} · fiyat bayrağı ${JSON.stringify(await c.sayfa.evaluate(() => window.__fiyatYetki || null))}`);
    c.iptalBayrak = await c.sayfa.evaluate(() => ({ yetki: window.__fisIptalYetki, gizli: window.__fisIptalGizli }));
    yaz(`     fiş iptali bayrağı (1.744.44): ${JSON.stringify(c.iptalBayrak)}`);
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
    const ok = k_(`${c.kullanici} YETKİSİZ: ${ad} → ret (4xx + KR040), satır değişmedi`, [r.durum >= 400 && r.durum < 500, r.kod, sonra === once], [true, "KR040", true]);
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
    // gerçek API kipinde (yerel Supabase) jeton GoTrue'nun imzaladığı JWT'dir: içindeki e-posta hesabınki olmalı
    if (process.env.KOPRU_SUPABASE) { let e = null; try { e = JSON.parse(Buffer.from(String(j).split(".")[1], "base64url").toString("utf8")).email; } catch (x) { /* JWT değil */ }
      k_(`${c.kullanici}: denemeler hesabın KENDİ gerçek oturum jetonuyla (JWT e-postası)`, e, c.eposta); }
    else k_(`${c.kullanici}: denemeler hesabın KENDİ jetonuyla`, j, `yerel-test:${c.eposta}`); };
  const kapat = async (c) => {
    // denemeler sırasında köprünün gördüğü ret sayısı (bilgi) + sayfa hatası
    k_(`${c.kullanici}: sayfa hatası yok`, c.hatalar, []);
    yaz(`     istemcinin isteklerinde x-atolye-surum: ${(c.ornek && c.ornek.basliklar["x-atolye-surum"]) || "?"}`);
    if (c.pencereler.length) yaz(`     tarayıcı pencereleri: ${c.pencereler.join(" | ")}`);
    await c.tarayici.close(); await c.k.kapat().catch(() => {});
  };

  // ── İPTAL DENEMESİ (silme yetkisi OLMAYAN hesap, doğrudan RPC): ret 403 / 42501; ileti gerçek işlemi ("fiş iptali") ve gereken yetkiyi
  // ("silme") söyler, eski yanıltıcı "(stok: silme)" biçimini İÇERMEZ; defterlerde hiçbir satır değişmez; fiş(ler) geçerli kalır.
  const iptalRetBekle = async (c, ad, gonder, fisNolar) => {
    const once = await defter(); const r = await gonder(); const sonra = await defter();
    const m = String(r.mesaj || "");
    const gecerli = (await q(`select count(*)::int n from public.stk_fis where id = any($1::text[]) and not iptal`, [fisNolar]))[0].n;
    const ok = k_(`${c.kullanici} YETKİSİZ İPTAL: ${ad} → [HTTP, kod, iletide "fiş iptali", iletide "silme", iletide "(stok:", hiçbir kayıt değişmedi, geçerli kalan fiş]`,
      [r.durum, r.kod, /fiş iptali/.test(m), /silme/.test(m), /\(stok:/.test(m), sonra === once, gecerli], [403, "42501", true, true, false, true, fisNolar.length]);
    yaz(`     HTTP ${r.durum}${r.kod ? ` · ${r.kod}` : ""} · ${kisa(r.mesaj, 400)}`);
    if (!ok) bulgu(`${c.kullanici} — silme yetkisi olmayan hesabın doğrudan iptal isteği beklenen biçimde reddedilmedi: ${ad} · HTTP ${r.durum} ${r.kod || ""} · ${kisa(r.mesaj, 300)} · kayıtlar ${sonra === once ? "aynı" : "DEĞİŞTİ"} · geçerli fiş ${gecerli}/${fisNolar.length}`);
    return ok;
  };

  // ── TAHSİLAT (Ödeme & Tahsilat): cariden nakit tahsilat fişi keser; bildirimde "Geri al" düğmesinin çizilip çizilmediğini de döndürür
  const fisIptalMi = (r) => (r[0] ? (r[0].iptal ? "iptal" : "geçerli") : "fiş yok");
  const fisDurumu = async (no) => fisIptalMi(await q(`select iptal from public.stk_fis where id = $1`, [no]));
  const odemeAc = async (c, giris) => { const s = c.sayfa; await O.modulAc(s, giris); await s.waitForTimeout(900);
    const sek = s.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible'); if (await sek.count()) { await sek.first().click(); await s.waitForTimeout(800); } };
  const tahsilatKes = async (c, giris) => {
    const s = c.sayfa;
    const b0 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: await fisSayisi() };
    await odemeAc(c, giris);
    await s.locator('[data-odeme-tip="Tahsilat"]:visible').first().click();
    await s.locator('[data-odeme-sekli="Nakit"]:visible').first().click(); await s.waitForTimeout(400);
    if ((await s.locator("[data-odeme-hesap]:visible").count()) > 1) await s.locator("[data-odeme-hesap]:visible", { hasText: "Merkez" }).first().click();
    const ck = s.locator("[data-odeme-cari]:visible").first();
    await ck.click(); await ck.fill("İnceleme Müşteri"); await s.waitForTimeout(500); await ck.press("Enter"); await s.waitForTimeout(900);
    await s.locator("[data-odeme-satiri-tutar]:visible").first().fill("500"); await s.waitForTimeout(300);
    // kasa ile cari para birimi farklıysa kur kutusu çıkar (sınama ortamında kur servisi yok) — boşsa doldur
    const kur = s.locator("[data-odeme-ikili-pb] input:visible");
    for (let i = 0; i < await kur.count(); i++) { if (!(await kur.nth(i).inputValue())) { await kur.nth(i).fill("1"); break; } }
    await toast(c); await s.evaluate(() => { window.__paGeriAl = 0; });
    await s.locator("[data-odeme-satiri-kaydet]:visible").first().click();
    await bekle(async () => (await kasaBakiye()) !== b0.kasa, 25);
    // bildirim çizilene kadar (en çok 8 sn) — "Geri al" düğmesi bildirimle AYNI anda çizilir (100-app showToast)
    await bekle(async () => s.evaluate(() => (window.__paBildirim || []).some((t) => /Tahsilat kaydedildi/.test(t))), 8);
    const b1 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: await fisSayisi() };
    const th = (await q(`select coalesce(h.fis_no, f.id) no, f.id, f.tur, f.iptal, f.olusturan from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 order by h.olusturma desc limit 1`, [MUSTERI]))[0] || {};
    const geriAl = await s.evaluate(() => ({ cizildi: window.__paGeriAl > 0, simdi: document.querySelectorAll("[data-toast-geri-al]").length, bildirimVar: document.querySelectorAll("[data-toast]").length }));
    const bildirim = await s.evaluate(() => (window.__paBildirim || []).join(" | "));
    yaz(`     bildirim: ${kisa(bildirim, 200)} · fiş ${th.no || "YOK"} (${th.tur || "?"}, ${th.olusturan || "?"})`);
    return { no: th.no, b0, b1, geriAl, bildirim };
  };
  // cari kartı › Hareketler'de fişin satırı: Ödeme & Tahsilat › "Son tahsilat ve ödemeler"de satıra dokun → cari kartı açılır. (Listedeki
  // doğrudan sil düğmesi yalnız gelir/gider KARTI kayıtlarında — 260-cari.) Döner: { liste, satir, sil (o satırdaki Sil düğmesi sayısı), dugme }
  const hareketSatiri = async (c, giris, fisNo) => {
    const s = c.sayfa; await odemeAc(c, giris);
    const son = s.locator(`[data-odeme-son-satir="${fisNo}"]:visible`).first();
    if (!(await son.count())) return { liste: false, satir: 0, sil: 0 };
    await son.click(); await s.waitForTimeout(1500);
    const tr = s.locator("tr", { has: s.locator(`button[title^="${fisNo}"]`) });
    await bekle(async () => (await tr.count()) > 0, 8);
    const dugme = tr.locator("[data-sil-onay]:visible");
    return { liste: true, satir: await tr.count(), sil: await dugme.count(), dugme, sayfadaSil: await s.locator("[data-sil-onay]:visible").count() };
  };
  // iptalin sonucu: kasa ve cari tahsilattan ÖNCEKİ hâline döndü, fiş iptal. `yol`: iptalin ekrandaki yolu (ad), `tikla`: düğmeye basan iş
  const tahsilatIptalOlc = async (c, yol, t, tikla) => {
    const sinir = c.k.gunluk.length, rpcSinir = c.rpc.length; await toast(c);
    try { await tikla(); } catch (e) { yaz(`     ! ${yol}: ekran adımı yapılamadı — ${kisa(e.message, 160)}`); }
    await bekle(async () => (await kasaBakiye()) === t.b0.kasa, 20); await c.sayfa.waitForTimeout(1500);
    const b2 = { kasa: await kasaBakiye(), cari: await cariBakiye(MUSTERI), fis: await fisDurumu(t.no) };
    const istekler = c.k.gunluk.slice(sinir).filter((x) => x.m !== "GET" && x.m !== "HEAD").map((x) => `${x.m} ${x.yol} ${x.durum}${x.kod ? ` ${x.kod} ${kisa(x.mesaj, 160)}` : ""}`);
    const bildirim = await toast(c);
    const ok = k_(`${c.kullanici}: tahsilat fişi ${t.no} ${yol} → [kasa farkı, cari bakiye farkı] başa döndü, fiş iptal`, [b2.kasa - t.b0.kasa, b2.cari - t.b0.cari, b2.fis], [0, 0, "iptal"]);
    yaz(`     bildirim: ${bildirim} · yazmalar: ${JSON.stringify(istekler)}`);
    if (!ok) bulgu(`${c.kullanici} (silme yetkili) — tahsilat fişinin (${t.no}) ${yol} tamamlanmadı: ${istekler.filter((x) => / [45]\d\d/.test(x)).join(" ; ") || "sunucuya iptal isteği gitmedi / reddedilmedi"} · ekrandaki bildirim: ${bildirim}`);
    // uygulamanın gerçek iptal isteği (gövde biçimi silmesiz hesabın doğrudan denemesinde taklit edilir)
    const ornek = c.rpc.slice(rpcSinir).filter((x) => x.yol === "rpc/fis_iptal").pop();
    return { ok, ornek: ornek ? ornek.govde : null };
  };

  // ── ÜRETİM EKRANI yardımcıları (ekran-uretim-b4.js'den uyarlandı): Üretim listesinde kart şeridine ([data-uretim-kart-serit="<no>"])
  // dokununca kart yerinde açılır; İşi Ver, teslim (sağlam / tamir), Geri Al o kartın İÇİNDE aranır — listede sekiz üretim var, başka
  // üretimin formu / düğmesi karışmasın. Her adım sunucudan ölçülür.
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al"):visible', TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al"):visible';
  const tablo = {};   // özet: hesap → [{ ad, ok, kalan, ret }]
  const uretimEkrani = (c) => {
    const s = c.sayfa;
    const kart = (no) => s.locator(`[data-uretim-kart-serit="${no}"]`).locator("xpath=..");
    // kart KAPALIYKEN şeritte tek satır özeti ([data-uretim-tek-satir]) durur; açıkken yok — şeride dokunmak aç / kapa yapar
    const kartAc = async (no) => {
      for (let tur = 0; tur < 4; tur++) {
        const serit = s.locator(`[data-uretim-kart-serit="${no}"]:visible`);
        if (!(await serit.count())) { await O.modulAc(s, "Üretim"); await s.waitForTimeout(1200); continue; }
        if (!(await s.locator(`[data-uretim-tek-satir="${no}"]`).count())) return kart(no);
        await s.locator(`[data-uretim-tek-satir="${no}"]`).first().click(); await s.waitForTimeout(1200);
      }
      throw new Error(`üretim kartı açılamadı (${no})`);
    };
    const isVer = async (no, personel) => {
      const K = await kartAc(no);
      await bekle(async () => (await K.locator('button:has-text("İşi Ver"):visible').count()) > 0, 10);
      await K.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption(personel);
      await s.waitForTimeout(400); await K.locator('button:has-text("İşi Ver"):visible').last().click();
    };
    // teslim formu: SAĞLAM (+ TAMİR, tamirci, tamir ücreti). Doldurmadan önce formun önerdiği sağlam miktarını (kalan) döndürür.
    const teslim = async (no, { saglam, tamir = 0, tamirci = null, tamirUcret = null }) => {
      const K = await kartAc(no);
      await bekle(async () => (await K.locator("[data-teslim-al]:visible").count()) > 0, 10);
      const n = await K.locator("[data-teslim-al]:visible").count();
      if (!n) throw new Error("kartta teslim formu ([data-teslim-al]) yok");
      const f = K.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
      const kutu = f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first();
      const oneri = await kutu.inputValue();
      if (saglam != null) await kutu.fill(String(saglam));   // saglam verilmezse formun önerdiği (bekleyen parçanın tamamı) teslim edilir
      if (tamir) {
        await f.locator("tr", { hasText: "TAMİR" }).locator("input").first().fill(String(tamir)); await s.waitForTimeout(400);
        if (tamirci) await f.locator("label", { hasText: "Tamiri kim yapacak" }).locator("select").selectOption(tamirci);
        if (tamirUcret != null) await f.locator("label", { hasText: "Tamir ücreti" }).locator("input").fill(String(tamirUcret));
      }
      await s.waitForTimeout(400);
      c.sonForm = { no, form: n, oneri, ozet: ((await f.innerText().catch(() => "")).replace(/\s+/g, " ").match(/Sağlam \d+(?: · Tamir \d+)?(?: · Hurda \d+)?/) || ["?"])[0] };
      await K.locator("[data-teslim-al]:visible").first().click();
    };
    // kartta bekleyen BÜTÜN parçaları sırayla, formun önerdiği miktarla teslim eder (geri alınan kısmi teslimden sonra iki parça bekler)
    const teslimTum = async (no) => {
      const oneriler = [];
      for (let tur = 0; tur < 4; tur++) {
        const K = await kartAc(no); await s.waitForTimeout(800);
        const n = await K.locator("[data-teslim-al]:visible").count(); if (!n) break;
        const f0 = (await gecerliFisler(uid(no))).length;
        await teslim(no, { saglam: null }); oneriler.push(c.sonForm.oneri);
        await bekle(async () => (await gecerliFisler(uid(no))).length > f0, 20); await s.waitForTimeout(1500);
      }
      c.sonForm = { oneri: oneriler.join(" + "), ozet: `${oneriler.length} form` };
    };
    // kapalı "detay" / "detay / geri al" bölümlerinin hepsini açar (tamamlanan adımın atamaları ve Geri Al düğmesi oradadır)
    const detaylariAc = async (K) => {
      for (let tur = 0; tur < 8; tur++) {
        const d = K.getByText(/^detay( \/ geri al)?$/).locator("visible=true");
        if (!(await d.count())) return; await d.first().click(); await s.waitForTimeout(700);
      }
    };
    const geriAlDugmeleri = async (no) => {
      const K = await kartAc(no);
      for (let tur = 0; tur < 2; tur++) {
        for (const sec of [GERI, TAM]) { const d = K.locator(sec); if (await d.count()) return d; }
        await detaylariAc(K);
      }
      return K.locator(TAM);
    };
    // sira: kaçıncı "Geri Al" (eksi = sondan)
    const geriAl = async (no, sira = 0) => {
      const d = await geriAlDugmeleri(no); const n = await d.count();
      if (!n) throw new Error('kartta "Geri Al" düğmesi yok');
      await d.nth(sira < 0 ? n + sira : sira).click();
    };
    // SİLMESİZ HESAP: kartta (bütün detaylar açıkken) ve sayfanın hiçbir yerinde TESLİMİ geri alan düğme yok; kapalı bölümün etiketi
    // "detay" ("detay / geri al" değil). Düğmenin çizileceği yer ("Teslim Alındı" satırı ya da detaydaki "Atamalar:" listesi) ekranda
    // olmalı — yer var, düğme yok. AYRIM: henüz teslim ALINMAMIŞ (bekleyen) atamanın "Geri Al"ı iş VERMEYİ geri alır (310-uretimkarti:
    // "Yanlış personele/miktarla verildiyse — hiçbir stok/cari etkisi olmadan geri alır"); fiş iptali değildir, silme istemez — ayrı
    // sayılır ve bilgi olarak yazılır. Başlığı bu olmayan her "…Geri Al" düğmesi teslim geri alma sayılır (bilinmeyen düğme de).
    const geriAlYok = async (no, an) => {
      const K = await kartAc(no);
      const etiketOnce = await K.getByText(/^detay( \/ geri al)?$/).locator("visible=true").allInnerTexts();
      await detaylariAc(K);
      const r = await s.evaluate((n) => { const g = (x) => x.offsetParent !== null; const K = document.querySelector(`[data-uretim-kart-serit="${n}"]`).parentElement;
        const d = (kok) => [...kok.querySelectorAll("button")].filter((b) => g(b) && /geri al/i.test(b.textContent || "")).map((b) => ({ metin: (b.textContent || "").trim(), baslik: b.title || "" }));
        return { kartta: d(K), sayfada: d(document), teslimAlindi: /Teslim Alındı/.test(K.innerText), atamalar: /Atamalar:/.test(K.innerText), gizli: window.__fisIptalGizli }; }, no);
      const verme = (b) => /^Yanlış personele\/miktarla verildiyse/.test(b.baslik), teslimGeri = (l) => l.filter((b) => !verme(b));
      const ok = k_(`${c.kullanici} ${no}: ${an} — teslimi geri alan "Geri Al" düğmesi YOK [kartta, sayfada, "detay / geri al" etiketi, düğmenin yeri ekranda, __fisIptalGizli]`,
        [teslimGeri(r.kartta).length, teslimGeri(r.sayfada).length, etiketOnce.filter((t) => /geri al/.test(t)).length, r.teslimAlindi || r.atamalar, r.gizli], [0, 0, 0, true, true]);
      yaz(`     kapalı bölüm etiketleri: ${JSON.stringify(etiketOnce)} · "Teslim Alındı" satırı ${r.teslimAlindi ? "var" : "yok"} · detayda "Atamalar:" ${r.atamalar ? "var" : "yok"} · bekleyen atamada iş vermeyi geri alan düğme (fiş iptali değil): ${r.kartta.filter(verme).length}`);
      if (!ok) bulgu(`${c.kullanici} (silme yok) — ${no} kartında teslimi geri alan düğme GÖRÜNÜYOR (${an}): ${JSON.stringify(teslimGeri(r.sayfada)).slice(0, 300)} · __fisIptalGizli ${r.gizli}`);
    };
    const olc = async (no, o) => [fark(o, await foto()), await uretimFis(uid(no)), await atamalar(uid(no))];
    // ADIM: ekran işini yapar, sunucu beklenen duruma gelene kadar (en çok 25 sn) bekler, sonra 2 sn daha bekleyip YENİDEN ölçer
    const adim = async (no, ad, is, beklenen, o) => {
      const sinir = c.k.gunluk.length; await toast(c); c.sonForm = null;
      try { await is(); } catch (e) { yaz(`     ! ${no} ${ad}: ekran adımı yapılamadı — ${kisa(e.message, 200)}`); }
      await bekle(async () => JSON.stringify(await olc(no, o)) === JSON.stringify(beklenen), 25); await s.waitForTimeout(2000);
      const yazma = c.k.gunluk.slice(sinir).filter((x) => x.m !== "GET" && x.m !== "HEAD").map((x) => `${x.m} ${x.yol} ${x.durum}${x.kod ? ` ${x.kod} ${kisa(x.mesaj, 160)}` : ""}`);
      const ok = k_(`${c.kullanici} ${no}: ${ad} → [fark (akış başından), üretim fişleri, atamalar]`, await olc(no, o), beklenen);
      const bildirim = await toast(c);
      yaz(`     ${c.sonForm ? `form: önerilen sağlam ${c.sonForm.oneri} · ${c.sonForm.ozet} · ` : ""}bildirim: ${bildirim} · yazmalar: ${JSON.stringify(yazma)}`);
      if (!ok) bulgu(`${c.kullanici} — yetkili üretim adımı beklenen sonucu vermedi (${no} · ${ad}): ${yazma.filter((x) => / [45]\d\d/.test(x)).join(" ; ") || "sunucu reddi yok"} · ekrandaki bildirim: ${bildirim}`);
      return ok;
    };
    // AKIŞ: adımlar sırayla; biri kalırsa sonrakiler YAPILAMADI sayılır (yarım durumda devam edilmez)
    const akis = (ad, no) => { const a = { ad, no, ok: true, kalan: null, ret: [], sinir: c.k.gunluk.length, o: null }; (tablo[c.kullanici] = tablo[c.kullanici] || []).push(a); return a; };
    const A = async (a, ad, is, beklenen) => {
      if (!a.ok) { kalan += 1; yaz(`  ✗ [${c.kullanici} ${a.no}: ${ad}] YAPILAMADI — önceki adım (${a.kalan}) tamamlanmadı`); return false; }
      const r = await adim(a.no, ad, is, beklenen, a.o); if (!r) { a.ok = false; a.kalan = ad; } return r;
    };
    // akış sonu: bu akış boyunca sunucunun reddettiği yazmalar (k.gunluk)
    const akisBitir = async (a) => {
      const yazma = c.k.gunluk.slice(a.sinir).filter((x) => x.m !== "GET" && x.m !== "HEAD" && x.m !== "OPTIONS");
      a.ret = yazma.filter((x) => x.durum >= 400).map((x) => `${x.m} ${x.yol} ${x.durum} ${x.kod || ""} ${kisa(x.mesaj, 150)}`);
      k_(`${c.kullanici} ${a.no} (${a.ad}): akışta reddedilen yazma YOK (${yazma.length} yazma isteği)`, a.ret, []);
      yaz(`     ${a.ad} akışı: ${a.ok ? "TAMAMLANDI" : `TAMAMLANAMADI — kalan adım: ${a.kalan}`}`);
    };
    return { kart, kartAc, isVer, teslim, teslimTum, geriAl, geriAlYok, geriAlDugmeleri, adim, akis, A, akisBitir };
  };

  // ── DÖRT ÜRETİM AKIŞI — hesabın KENDİ kayıtlarında (on = PAF / PAU). silme = hesapta silme yetkisi var mı (Geri Al adımları)
  const B = (no, proses, m, p, d, t = "") => `${proses}:${m}${t}:${p}:${d}`;
  const uretimAkislari = async (c, on, silme) => {
    const e = uretimEkrani(c), N = URETIMLER(on), o0 = await foto(), f0 = await fisSayisi();
    k_(`${c.kullanici}: fiş iptali bayrağı [yetki, düğme gizli] (silme ${silme ? "VAR" : "YOK"})`, [c.iptalBayrak.yetki, c.iptalBayrak.gizli], [silme, !silme]);

    // ── TAM: İşi Ver → teslim 10 [→ Geri Al → yeniden teslim]
    { const no = N.tam, a = e.akis("TAM teslim" + (silme ? " + Geri Al + yeniden teslim" : ""), no); a.o = await foto();
      yaz(`  · TAM (${no}) — başlangıç ${JSON.stringify(a.o)} · fiş ${await uretimFis(uid(no))} · atamalar ${JSON.stringify(await atamalar(uid(no)))}`);
      await e.A(a, "İşi Ver (PA Usta)", () => e.isVer(no, USTA), [{}, "0 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "bekliyor")]]);
      await e.A(a, "teslim al (sağlam 10)", () => e.teslim(no, { saglam: 10 }), [{ mamul: 10, usta: -350 }, "1 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "teslim")]]);
      if (silme) {
        const fisler = await gecerliFisler(uid(no)), atama = (await atamaSatirlari(uid(no))).map((x) => x.id), rpcSinir = c.rpc.length;
        const g = await e.A(a, "Geri Al (teslimin iptali)", () => e.geriAl(no), [{}, "0 geçerli / 1 iptal", [B(no, "Dikim", 10, USTA, "bekliyor")]]);
        // uygulamanın GERÇEK toplu iptal isteği — Umut'un doğrudan denemesi bunu kendi fişine uyarlar
        const ornek = c.rpc.slice(rpcSinir).filter((x) => x.yol === "rpc/fis_iptal_toplu").pop();
        if (g && ornek) durumlar.topluOrnek = { govde: ornek.govde, fisler, atama, no, id: uid(no) };
        yaz(`     yakalanan gerçek istek (rpc/fis_iptal_toplu): ${ornek ? kisa(ornek.govde, 420) : "YOK"}`);
        await e.A(a, "yeniden teslim (sağlam 10)", () => e.teslim(no, { saglam: 10 }), [{ mamul: 10, usta: -350 }, "1 geçerli / 1 iptal", [B(no, "Dikim", 10, USTA, "teslim")]]);
      } else if (a.ok) await e.geriAlYok(no, "tam teslimden sonra");
      await e.akisBitir(a); }

    // ── KISMİ: İşi Ver → 6 sağlam (kalan 4 ustada) → kalan 4 [→ iki parçayı Geri Al → yeniden teslim]
    { const no = N.kismi, a = e.akis("KISMİ teslim (6 + 4)" + (silme ? " + Geri Al + yeniden teslim" : ""), no); a.o = await foto();
      yaz(`  · KISMİ (${no}) — başlangıç ${JSON.stringify(a.o)}`);
      await e.A(a, "İşi Ver (PA Usta)", () => e.isVer(no, USTA), [{}, "0 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "bekliyor")]]);
      await e.A(a, "kısmi teslim (10'dan 6 sağlam) → kalan 4 bekliyor", () => e.teslim(no, { saglam: 6 }), [{ mamul: 6, usta: -210 }, "1 geçerli / 0 iptal", [B(no, "Dikim", 4, USTA, "bekliyor"), B(no, "Dikim", 6, USTA, "teslim")]]);
      if (!silme && a.ok) await e.geriAlYok(no, "kısmi teslimden sonra");
      const k2 = await e.A(a, "kalan 4'ü teslim → toplam 10, fazlası yok", () => e.teslim(no, { saglam: 4 }), [{ mamul: 10, usta: -350 }, "2 geçerli / 0 iptal", [B(no, "Dikim", 4, USTA, "teslim"), B(no, "Dikim", 6, USTA, "teslim")]]);
      if (k2) { const K = await e.kartAc(no);
        k_(`${c.kullanici} ${no}: kalan teslimde formun önerdiği miktar 4; iş bitince kartta teslim formu ve "İşi Ver" kalmadı`,
          [c.sonForm ? c.sonForm.oneri : "?", await K.locator("[data-teslim-al]:visible").count(), await K.locator('button:has-text("İşi Ver"):visible').count()], ["4", 0, 0]); }
      if (silme) {
        await e.A(a, "Geri Al — son parça (4)", () => e.geriAl(no, -1), [{ mamul: 6, usta: -210 }, "1 geçerli / 1 iptal", [B(no, "Dikim", 4, USTA, "bekliyor"), B(no, "Dikim", 6, USTA, "teslim")]]);
        // iki parça da geri alınınca iş ustada İKİ bekleyen parça olarak durur (4 + 6 = 10; birleşmez) — stok ve işçilik sıfırda
        await e.A(a, "Geri Al — ilk parça (6) → stok ve işçilik başa döndü, 10'un tamamı bekliyor", () => e.geriAl(no, 0), [{}, "0 geçerli / 2 iptal", [B(no, "Dikim", 4, USTA, "bekliyor"), B(no, "Dikim", 6, USTA, "bekliyor")]]);
        await e.A(a, "yeniden teslim (bekleyen iki parça, formların önerdiği miktarla) → toplam 10", () => e.teslimTum(no), [{ mamul: 10, usta: -350 }, "2 geçerli / 2 iptal", [B(no, "Dikim", 4, USTA, "teslim"), B(no, "Dikim", 6, USTA, "teslim")]]);
      } else if (a.ok) await e.geriAlYok(no, "kalan teslimden sonra");
      await e.akisBitir(a); }

    // ── TAMİR: İşi Ver → 8 sağlam + 2 tamir (PA Tamirci, 5 ₺) → tamirci 2'yi teslim eder
    { const no = N.tamir, a = e.akis("TAMİR (8 sağlam + 2 tamir → tamirci teslimi)", no); a.o = await foto();
      yaz(`  · TAMİR (${no}) — başlangıç ${JSON.stringify(a.o)}`);
      await e.A(a, "İşi Ver (PA Usta)", () => e.isVer(no, USTA), [{}, "0 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "bekliyor")]]);
      // usta 10'un tamamının işçiliğini alır (ekran-uretim-b4 T7) — ustanın ataması 10 olarak teslimli kalır; tamirdeki 2 mamule GİRMEZ,
      // tamirciye 2'lik tamir ataması (T) doğar
      await e.A(a, "teslim (8 sağlam + 2 tamir · PA Tamirci · 5 ₺) → tamir ataması", () => e.teslim(no, { saglam: 8, tamir: 2, tamirci: TAMIRCI, tamirUcret: 5 }),
        [{ mamul: 8, usta: -350 }, "1 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "teslim"), B(no, "Dikim", 2, TAMIRCI, "bekliyor", "T")]]);
      await e.A(a, "tamirci 2'yi teslim eder → mamul +2, tamirci 2 × 5 ₺", () => e.teslim(no, { saglam: 2 }),
        [{ mamul: 10, usta: -350, tamirci: -10 }, "2 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "teslim"), B(no, "Dikim", 2, TAMIRCI, "teslim", "T")]]);
      if (a.ok) { const K = await e.kartAc(no);
        k_(`${c.kullanici} ${no}: tamir tesliminde formun önerdiği miktar 2; iş bitince kartta teslim formu kalmadı`, [c.sonForm ? c.sonForm.oneri : "?", await K.locator("[data-teslim-al]:visible").count()], ["2", 0]);
        if (!silme) await e.geriAlYok(no, "tamir tesliminden sonra"); }
      await e.akisBitir(a); }

    // ── HAMMADDELİ: Kesim'i ver → hammadde → Kesim teslim [→ Geri Al → yeniden teslim] → Saya'yı ver → Saya teslim (mamul)
    { const no = N.ham, a = e.akis("HAMMADDELİ (Kesim reçeteli → Saya)" + (silme ? " + Geri Al + yeniden teslim" : ""), no); a.o = await foto();
      yaz(`  · HAMMADDELİ (${no}) — başlangıç ${JSON.stringify(a.o)}`);
      // 1.744.37'den beri hammadde iş VERİLİRKEN değil TESLİMDE düşer (ekran-uretim-b4 T8a) — iş vermede defter değişmez
      const v = await e.A(a, "Kesim'i ver (PA Usta) — hammadde henüz düşmez", () => e.isVer(no, USTA), [{}, "0 geçerli / 0 iptal", [B(no, "Kesim", 10, USTA, "bekliyor")]]);
      if (v) yaz(`     iş verildikten sonra hammadde (fin-taban Siyah/40) farkı: ${(await stokU(HAMMADDE)) - a.o.taban} (teslimde düşmesi beklenir)`);
      await e.A(a, "Kesim teslim (sağlam 10) → hammadde −10, usta 10 × 30 ₺, mamul YOK (ara adım)", () => e.teslim(no, { saglam: 10 }), [{ taban: -10, usta: -300 }, "1 geçerli / 0 iptal", [B(no, "Kesim", 10, USTA, "teslim")]]);
      if (silme) {
        await e.A(a, "Geri Al (Kesim teslimi) → hammadde ve işçilik başa döndü", () => e.geriAl(no), [{}, "0 geçerli / 1 iptal", [B(no, "Kesim", 10, USTA, "bekliyor")]]);
        await e.A(a, "Kesim'i yeniden teslim (sağlam 10)", () => e.teslim(no, { saglam: 10 }), [{ taban: -10, usta: -300 }, "1 geçerli / 1 iptal", [B(no, "Kesim", 10, USTA, "teslim")]]);
      } else if (a.ok) await e.geriAlYok(no, "Kesim tesliminden sonra");
      const ip = silme ? 1 : 0;
      await e.A(a, "Saya'yı ver (PA Usta2)", () => e.isVer(no, USTA2), [{ taban: -10, usta: -300 }, `1 geçerli / ${ip} iptal`, [B(no, "Kesim", 10, USTA, "teslim"), B(no, "Saya", 10, USTA2, "bekliyor")]]);
      await e.A(a, "Saya teslim (sağlam 10) → mamul +10, usta2 10 × 20 ₺; hammadde İKİNCİ kez düşmedi", () => e.teslim(no, { saglam: 10 }),
        [{ mamul: 10, taban: -10, usta: -300, usta2: -200 }, `2 geçerli / ${ip} iptal`, [B(no, "Kesim", 10, USTA, "teslim"), B(no, "Saya", 10, USTA2, "teslim")]]);
      if (!silme && a.ok) await e.geriAlYok(no, "Saya tesliminden sonra (iş bitti)");
      await e.akisBitir(a); }
    return { e, N, o0, f0 };
  };
  // oturum sonu (8 sn bekledikten sonra): dört akışın TOPLAM etkisi — fazla stok / çift işçilik / fazladan fiş yok
  const uretimToplam = async (c, u) => {
    const tamam = (tablo[c.kullanici] || []).every((a) => a.ok);
    const ok = k_(`${c.kullanici}: dört akışın toplam etkisi (oturum sonu) — mamul 4 × 10, hammadde −10 (tek akış), usta 3 × 350 + 300, usta2 200, tamirci 10`,
      fark(u.o0, await foto()), { mamul: 40, taban: -10, usta: -1350, usta2: -200, tamirci: -10 });
    const fis = await Promise.all(Object.values(u.N).map(async (no) => `${no} ${await uretimFis(uid(no))}`));
    yaz(`     üretim fişleri: ${fis.join(" · ")} · bütün fişler önce ${u.f0} sonra ${await fisSayisi()}`);
    if (!ok && tamam) bulgu(`${c.kullanici} — akışlar tamamlandı ama toplam stok / işçilik beklenenden farklı (fazla stok ya da çift işçilik olabilir): ${JSON.stringify(fark(u.o0, await foto()))}`);
  };
  const durumlar = {};   // hesaplar arası aktarılan: gerçek iptal isteklerinin gövdeleri

  // ════════════════════════════════════════ 1 · AYŞE (yalnız stok) ════════════════════════════════════════
  if (kosar("Ayşe")) { const c = await ac("Ayşe"); const s = c.sayfa;
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
  if (kosar("Selin")) { const c = await ac("Selin"); const s = c.sayfa;
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

  // ════════════════════════════════════════ 3 · MERT (muhasebe + SİLME) ════════════════════════════════════════
  // Silme yetkili muhasebe hesabı: iptal düğmeleri GÖRÜNÜR ve iki ekran yolu da tamamlanır. Gerçek `fis_iptal` isteği Murat için saklanır.
  if (kosar("Mert")) { const c = await ac("Mert"); const s = c.sayfa;
    k_("Mert: fiş iptali bayrağı [yetki, düğme gizli] (silme VAR)", [c.iptalBayrak.yetki, c.iptalBayrak.gizli], [true, false]);
    const giris = ["Kasa & Banka", "Ödeme & Tahsilat"].find((m) => c.menu.includes(m));
    if (!giris) erisilemiyor(c, "tahsilat fişi + iptal", "Kasa & Banka / Ödeme & Tahsilat");
    else {
      // (a) tahsilat → bildirimdeki "Geri al"
      const t1 = await tahsilatKes(c, giris);
      k_("Mert (a): tahsilat fişi → kasa +500, cari bakiyesi −500 (alacak), fiş geçerli", [t1.b1.kasa - t1.b0.kasa, t1.b1.cari - t1.b0.cari, await fisDurumu(t1.no)], [500, -500, "geçerli"]);
      k_('Mert (a): bildirimde "Geri al" düğmesi GÖRÜNÜR ([data-toast-geri-al] çizildi)', t1.geriAl.cizildi, true);
      const r1 = await tahsilatIptalOlc(c, 'bildirimdeki "Geri al" ile iptal', t1, async () => { await s.locator("[data-toast-geri-al]:visible").first().click({ timeout: 6000 }); });
      if (r1.ornek) durumlar.iptalOrnek = { govde: r1.ornek, no: t1.no };
      yaz(`     yakalanan gerçek istek (rpc/fis_iptal): ${r1.ornek ? kisa(r1.ornek, 300) : "YOK"}`);
      // (b) ikinci tahsilat → cari kartı › Hareketler › Sil › onay
      const t2 = await tahsilatKes(c, giris);
      k_("Mert (b): ikinci tahsilat fişi → kasa +500, cari bakiyesi −500, fiş geçerli", [t2.b1.kasa - t2.b0.kasa, t2.b1.cari - t2.b0.cari, await fisDurumu(t2.no)], [500, -500, "geçerli"]);
      const h = await hareketSatiri(c, giris, t2.no);
      k_(`Mert (b): cari kartı › Hareketler'de ${t2.no} satırında "Sil" düğmesi GÖRÜNÜR [son işlemler listesinde, hareket satırı, Sil düğmesi]`, [h.liste, h.satir > 0, h.sil > 0], [true, true, true]);
      const r2 = await tahsilatIptalOlc(c, "cari kartı › Hareketler › Sil ile iptal", t2, async () => { await h.dugme.first().click(); await s.waitForTimeout(600);
        const onay = s.locator("[data-sil-onayla]:visible"); if (await onay.count()) await onay.first().click(); });
      if (!durumlar.iptalOrnek && r2.ornek) durumlar.iptalOrnek = { govde: r2.ornek, no: t2.no };
      yaz(`     onay bekleyen kayıt (onaylar tablosu): ${(await q(`select count(*)::int n from public.onaylar`).catch(() => [{ n: "?" }]))[0].n}`);
    }
    await beklenmeyenRet(c); await kapat(c); }

  // ════════════════════════════════════════ 4 · MURAT (yalnız muhasebe; silme YOK) ════════════════════════════════════════
  if (kosar("Murat")) { const c = await ac("Murat"); const s = c.sayfa; let t = null;
    k_("Murat: menüde Üretim YOK (iş verme / teslim bu hesaptan yapılamaz)", c.menu.includes("Üretim"), false);
    k_("Murat: fiş iptali bayrağı [yetki, düğme gizli] (silme YOK)", [c.iptalBayrak.yetki, c.iptalBayrak.gizli], [false, true]);
    const giris = ["Kasa & Banka", "Ödeme & Tahsilat"].find((m) => c.menu.includes(m));
    if (!giris) erisilemiyor(c, "tahsilat fişi", "Kasa & Banka / Ödeme & Tahsilat");
    else {
      yaz(`     Kasa & Banka alanına giriş: menü "${giris}"${giris === "Kasa & Banka" ? "" : ' (menüde ayrı "Kasa & Banka" öğesi yok; aynı alanın sekmesi)'}`);
      t = await tahsilatKes(c, giris);
      k_("Murat: tahsilat fişi → kasa +500, cari bakiyesi −500 (alacak), fiş geçerli", [t.b1.kasa - t.b0.kasa, t.b1.cari - t.b0.cari, await fisDurumu(t.no)], [500, -500, "geçerli"]);
      // ekranda iptal yolu YOK (1): bildirim çizildi, içinde "Geri al" düğmesi HİÇ çizilmedi
      k_('Murat: bildirimde "Geri al" düğmesi YOK [bildirim görüldü, [data-toast-geri-al] çizildi, bildirim metninde "Geri al"]',
        [/Tahsilat kaydedildi/.test(t.bildirim), t.geriAl.cizildi, /Geri al/i.test(t.bildirim)], [true, false, false]);
      // ekranda iptal yolu YOK (2): cari kartı › Hareketler'de fişin satırı var, satırda "Sil" düğmesi yok
      const h = await hareketSatiri(c, giris, t.no);
      k_(`Murat: cari kartı › Hareketler'de ${t.no} satırında "Sil" düğmesi YOK [son işlemler listesinde, hareket satırı, satırdaki Sil düğmesi]`, [h.liste, h.satir > 0, h.sil], [true, true, 0]);
      yaz(`     sayfanın tamamında görünen Sil düğmesi ([data-sil-onay]): ${h.sayfadaSil}`);
      k_(`Murat: fiş ${t.no} geçerli; kasa / cari tahsilat sonrası hâlinde`, [await fisDurumu(t.no), (await kasaBakiye()) - t.b0.kasa, (await cariBakiye(MUSTERI)) - t.b0.cari], ["geçerli", 500, -500]);
    }
    await fiyatKutuKontrol(c, [true, false]);
    await beklenmeyenRet(c);
    await denemeBasligi(c);
    await retBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", (await fiyatOku("satis_fiyati")()) + 7), fiyatOku("satis_fiyati"));
    { const hedef = (await fiyatOku("alis_fiyati")()) + 60;
      await gecisBekle(c, "urunler alış fiyatı PATCH", fiyatPatch(c, "alis_fiyati", hedef), fiyatOku("alis_fiyati"), hedef); }
    await tanimDene(c, "mevcut rengin adını değiştirme (Siyah → Kara)", (v) => { v.renkler = (v.renkler || []).map((r) => (r.id === "r-siyah" ? { ...r, ad: "Kara" } : r)); }, "renkler");
    // doğrudan iptal: Mert'in ekrandan gönderdiği GERÇEK isteğin gövdesi, fiş numarası Murat'ın fişiyle değiştirilerek
    if (t && t.no) {
      const o = durumlar.iptalOrnek;
      const govde = o ? JSON.parse(o.govde.split(o.no).join(t.no)) : { p: { no: t.no, sebep: null } };
      yaz(`     doğrudan iptal gövdesi: ${o ? `Mert'in gerçek isteğinden (${o.no} → ${t.no})` : "Mert'in isteği yakalanamadı — 078-fis-kes biçimi { p: { no, sebep } }"} · p anahtarları ${JSON.stringify(Object.keys(govde.p || {}))} · p.no ${govde.p && govde.p.no}`);
      await iptalRetBekle(c, `POST rpc/fis_iptal (${t.no})`, () => istek(c, "POST", "rpc/fis_iptal", govde), [t.no]);
    } else { kalan += 1; yaz("  ✗ [Murat YETKİSİZ İPTAL: POST rpc/fis_iptal] YAPILAMADI — tahsilat fişi kesilemedi"); }
    await kapat(c); }

  // ════════════════════════════════════════ 5 · UFUK (üretim + SİLME) ════════════════════════════════════════
  if (kosar("Ufuk")) { const c = await ac("Ufuk");
    k_("Ufuk: menüde Üretim VAR", c.menu.includes("Üretim"), true);
    if (!c.menu.includes("Üretim")) erisilemiyor(c, "üretim akışları", "Üretim");
    else { const u = await uretimAkislari(c, "PAF", true); await beklenmeyenRet(c); await uretimToplam(c, u); }
    await kapat(c); }

  // ════════════════════════════════════════ 6 · UMUT (yalnız üretim; silme YOK) ════════════════════════════════════════
  if (kosar("Umut")) { const c = await ac("Umut"); let u = null;
    k_("Umut: menüde Üretim VAR", c.menu.includes("Üretim"), true);
    if (!c.menu.includes("Üretim")) erisilemiyor(c, "üretim akışları", "Üretim");
    else u = await uretimAkislari(c, "PAU", false);
    await beklenmeyenRet(c);
    if (u) await uretimToplam(c, u);
    await denemeBasligi(c);
    await retBekle(c, "urunler satış fiyatı PATCH", fiyatPatch(c, "satis_fiyati", (await fiyatOku("satis_fiyati")()) + 7), fiyatOku("satis_fiyati"));
    await retBekle(c, "urunler alış fiyatı PATCH", fiyatPatch(c, "alis_fiyati", (await fiyatOku("alis_fiyati")()) + 7), fiyatOku("alis_fiyati"));
    await retBekle(c, "cariler unvan PATCH", () => surumluPatch(c, "cariler", MUSTERI, { unvan: "Umut Değiştirdi" }), unvanOku);
    // doğrudan toplu iptal: Ufuk'un TAM akışındaki gerçek "Geri Al" isteği, Umut'un TAM teslimine uyarlanır (fiş no, üretim, atama kimliği)
    if (u) {
      const no = u.N.tam, fisler = await gecerliFisler(uid(no)), atama = (await atamaSatirlari(uid(no))).map((x) => x.id), o = durumlar.topluOrnek;
      if (!fisler.length) { kalan += 1; yaz(`  ✗ [Umut YETKİSİZ İPTAL: POST rpc/fis_iptal_toplu] YAPILAMADI — ${no} için geçerli teslim fişi yok (teslim akışı tamamlanmadı)`); }
      else {
        let govde;
        if (o && o.fisler.length === fisler.length && o.atama.length === atama.length) {
          let m = o.govde; o.fisler.forEach((f, i) => { m = m.split(f).join(fisler[i]); }); o.atama.forEach((x, i) => { m = m.split(x).join(atama[i]); });
          m = m.split(o.id).join(uid(no)).split(o.no).join(no); govde = JSON.parse(m);
        } else govde = { p: { fisler, sebep: `Üretim teslimi geri alındı (${no} · Dikim)`, alt: null } };
        yaz(`     doğrudan toplu iptal gövdesi: ${o ? `Ufuk'un gerçek isteğinden (${o.no} → ${no}; fiş ${o.fisler.join(",")} → ${fisler.join(",")})` : "Ufuk'un isteği yakalanamadı — 100-app biçimi { p: { fisler, sebep, alt } }"} · p anahtarları ${JSON.stringify(Object.keys(govde.p || {}))} · ${kisa(JSON.stringify(govde), 420)}`);
        k_("Umut: doğrudan toplu iptal gövdesi Umut'un KENDİ geçerli teslim fişini hedefliyor", govde.p.fisler, fisler);
        await iptalRetBekle(c, `POST rpc/fis_iptal_toplu (${no}: ${fisler.join(", ")})`, () => istek(c, "POST", "rpc/fis_iptal_toplu", govde), fisler);
        k_(`Umut: ret sonrası ${no} aynen [üretim fişleri, atamalar]`, [await uretimFis(uid(no)), await atamalar(uid(no))], ["1 geçerli / 0 iptal", [B(no, "Dikim", 10, USTA, "teslim")]]);
        // tekil iptal işlevi de (Mert'in gerçek isteğinin biçimiyle) aynı kurala bağlı
        const t = durumlar.iptalOrnek, tekil = t ? JSON.parse(t.govde.split(t.no).join(fisler[0])) : { p: { no: fisler[0], sebep: null } };
        await iptalRetBekle(c, `POST rpc/fis_iptal (${fisler[0]})`, () => istek(c, "POST", "rpc/fis_iptal", tekil), fisler);
      }
    }
    await kapat(c); }

  // ── SON DURUM (sunucu) + AKIŞ TABLOSU + ÖZET
  const u = await urunSatiri();
  yaz(`\nSON DURUM (sunucu): ürün ${JSON.stringify(u)} · müşteri unvanı "${await unvanOku()}" · renkler ${JSON.stringify((await tanimOku("renkler")()).map((r) => r.ad))} · fişler ${await fisSayisi()}`);
  yaz("ÜRETİM AKIŞLARI (hesap başına):");
  for (const [kim, liste] of Object.entries(tablo)) for (const a of liste)
    yaz(`  ${kim} · ${a.no} · ${a.ad}: ${a.ok ? "TAMAMLANDI" : `TAMAMLANAMADI (kalan adım: ${a.kalan})`}${a.ret.length ? ` · reddedilen yazma ${a.ret.length}` : ""}`);
  yaz(`BULGULAR: ${bulgular.length ? "" : "yok"}`); bulgular.forEach((b, i) => yaz(`  ${i + 1}. ${b}`));
  yaz(`\n── ekran-personel-akis: ${gecen} geçti · ${kalan} kaldı ──`);
  if (!YALNIZ) fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  await k0.kapat().catch(() => {});
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); try { if (!YALNIZ) fs.writeFileSync(SONUC, satirlar.join("\n") + `\nHATA ${x && x.stack || x}\n`); } catch (e) { /* yazılamadı */ } process.exit(2); });
