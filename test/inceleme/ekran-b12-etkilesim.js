#!/usr/bin/env node
// EKRAN SINAMASI — B1/B2 × DÖRT SUNUCU PAKETİ (B4/B5, B3a, B3a-2, ret iletisi) ETKİLEŞİMİ, YÖNETİCİ OLMAYAN HESAPLARLA (27 Kasım).
//
// SORU: B1 (renk adı sunucuda tek işlem) ve B2 (Tanımlar sürüm koşullu yazma) canlıdaki dört paketin ÜSTÜNE kurulunca
//   · renk adı değişikliği yetkili personelde bütün bağlarıyla geçiyor mu (B3a'nın tablo tetikleyicileri işlemi yarıda kesmiyor mu),
//   · renk / kombinasyon KİMLİKLERİ, varyantlar ve sipariş kalemlerinin bağları (kimlik, sipariş, ürün, beden, miktar) aynı kalıyor mu,
//   · B2'nin birleştirme / çakışma yazmaları B3a-2'nin Tanımlar kuralından geçiyor mu; B3a-2 reddettiğinde istemci bunu çakışma
//     sanıp dönüyor mu,
//   · mevcut yetki korumaları (yetkisiz ad değişikliği, yetkisiz ekleme, fiyat) yerinde mi.
// Uygulama EKRANDAN, iki tarayıcı = iki cihaz. İki kip: yerel PostgreSQL (köprü; paketler CRLF kurulu şablon) ve gerçek API kipi
// (KOPRU_SUPABASE: yerel Supabase, Kong → PostgREST / GoTrue; giriş ekrandan). Buluttaki hiçbir projeye bağlanmaz.
//
// HESAPLAR (yalnız sınama kopyasında; Tanımlar'a doğrudan yazılır): Ali = Yönetici · Tuna = yalnız Tanımlar (görüntüleme + düzenleme)
//   · Deniz = Tanımlar (görüntüleme + düzenleme) + Stok (görüntüleme + düzenleme + kaydetme) · Ayşe = yalnız Stok.
// B3a-2 kuralı: renk EKLEME = stok: kaydetme · var olan rengi DEĞİŞTİRME = tanımlar: düzenleme. B1: ad değiştirme = tanımlar: düzenleme.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const GERCEK = !!process.env.KOPRU_SUPABASE;
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const { ekranAc, toastlar } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik");
const SABLON = process.env.EKRAN_SABLON || "b12_crlf";   // inc_ekran_taban + 27, 28, 29, 31 (CRLF) + 26-b1 (CRLF)
const DB = "b12_etk";
const SECILI = process.env.SENARYO ? process.env.SENARYO.split(",") : null;
const SONUC = path.join(__dirname, GERCEK ? "sonuc-ekran-b12-etkilesim-supabase.txt" : "sonuc-ekran-b12-etkilesim.txt");

const satirlar = [];
const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const kalanlar = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else { kalan += 1; kalanlar.push(ad); }
  yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); return ok; };
const kisa = (s, n = 260) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

const HESAPLAR = [
  { id: "u-tuna", kullaniciAdi: "Tuna", eposta: "tuna@atolye.local", rol: "Personel", yetkiler: { tanimlar: { goruntuleme: true, duzenleme: true } } },
  { id: "u-deniz", kullaniciAdi: "Deniz", eposta: "deniz@atolye.local", rol: "Personel",
    yetkiler: { tanimlar: { goruntuleme: true, duzenleme: true }, stok: { goruntuleme: true, duzenleme: true, kaydetme: true } } },
];
const psqlSon = (args) => { const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return c[c.length - 1]; };
// TAZE DURUM: her senaryo aynı başlangıçtan. Hesaplar tetikleyiciler kapalıyken eklenir (yalnız sınama fikstürü).
async function sifirla() {
  let baglanti;
  if (GERCEK) {
    execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] });
    const son = psqlSon([SB_PG, "-f", path.join(G, "26-b1-uygula.sql"), "-c", "notify pgrst, 'reload schema'"]);
    if (!/KURULU/.test(psqlSon([SB_PG, "-f", path.join(G, "26-b1-onkosul-salt-okur.sql")]))) throw new Error("B1 yerel Supabase'e kurulamadı: " + son);
    baglanti = { connectionString: SB_PG };
  } else {
    const y = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" }); await y.connect();
    await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
    baglanti = { host: process.env.PGHOST || "localhost", database: DB, user: process.env.PGUSER || "postgres" };
  }
  const c = new Client(baglanti); await c.connect();
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (select jsonb_agg(k) from jsonb_array_elements(veri -> 'kullanicilar') k where k ->> 'kullaniciAdi' in ('Ali', 'Ayşe')) || $1::jsonb) where id = 'tekil'`, [JSON.stringify(HESAPLAR)]);
  await c.query("commit"); await c.end();
  if (GERCEK) await new Promise((r) => setTimeout(r, 1500));
}
// KİMLİK VE BAĞ GÖRÜNTÜSÜ: ad / etiket METİNLERİ dışında her şey. Ad değişikliğinden önce ve sonra AYNI olmalı.
const goruntu = async (k) => (await k.sorgu(`select jsonb_build_object(
  'renkKimlikleri', (select jsonb_agg(r ->> 'id' order by r ->> 'id') from public.tanimlar, jsonb_array_elements(veri -> 'renkler') r where id = 'tekil' and r ->> 'id' in ('r-siyah', 'r-vizon')),
  'renkBarkodKodlari', (select jsonb_agg((r ->> 'id') || '=' || coalesce(r ->> 'barkodKodu', '') order by r ->> 'id') from public.tanimlar, jsonb_array_elements(veri -> 'renkler') r where id = 'tekil' and r ->> 'id' in ('r-siyah', 'r-vizon')),
  'kombinasyonlar', (select jsonb_agg(jsonb_build_object('id', x ->> 'id', 'kod', x ->> 'kod', 'renkIdler', x -> 'renkIdler') order by x ->> 'id') from public.tanimlar, jsonb_array_elements(veri -> 'renkKombinasyonlari') x where id = 'tekil'),
  'stkRenk', (select jsonb_agg(id || ':' || tur || ':' || aktif order by id) from public.stk_renk where id in ('r-siyah', 'r-vizon', 'k-1054')),
  'varyantlar', (select jsonb_agg(id || ':' || urun_id || ':' || renk_id || ':' || olcu_id order by id) from public.stk_varyant),
  'kalemler', (select jsonb_agg(id || ':' || siparis_id || ':' || urun_id || ':' || beden || ':' || miktar order by id) from public.siparis_kalemleri),
  'siparisler', (select jsonb_agg(id || ':' || siparis_no || ':' || cari_id || ':' || durum order by id) from public.siparisler)) g`))[0].g;
const kalemRenkleri = async (k) => (await k.sorgu(`select array(select distinct renk from public.siparis_kalemleri order by 1) a`))[0].a;
const sunucuRenkleri = async (k) => (await k.sorgu(`select array(select r ->> 'ad' from jsonb_array_elements(veri -> 'renkler') r order by 1) a from public.tanimlar where id = 'tekil'`))[0].a;
const stkAd = async (k) => (await k.sorgu(`select array(select id || '=' || ad from public.stk_renk where id in ('r-vizon', 'k-1054') order by id) a`))[0].a;
const vizonKodu = async (k) => (await k.sorgu(`select r ->> 'kod' k from public.tanimlar, jsonb_array_elements(veri -> 'renkler') r where id = 'tekil' and r ->> 'id' = 'r-vizon'`))[0].k;
// kalemler varyanta bağlı mı: kalemin renk METNİ, ürünün etkin bir varyantının renk etiketiyle eşleşiyor mu (kopuk bağ = 0 olmalı)
const kopukKalem = async (k) => (await k.sorgu(`select count(*)::int n from public.siparis_kalemleri kl where not exists (
  select 1 from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id where v.urun_id = kl.urun_id and r.aktif and r.ad = kl.renk)`))[0].n;

const renkSekmesi = async (sayfa) => {
  const dugme = sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first();
  if (!(await dugme.count())) return false;
  await dugme.click(); await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-tanim-sekme="urun"]').first().click(); await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-urun-alt="renk"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  return (await sayfa.locator('input[value="Vizon Yılan"]').count()) > 0 || (await sayfa.locator('input[placeholder="Örn. Ham Bej"]').count()) > 0;
};
const renkEkle = async (sayfa, ad) => { const kutu = sayfa.locator('input[placeholder="Örn. Ham Bej"]').first(); await kutu.fill(ad); await kutu.press("Enter"); };
const renkAdi = async (sayfa, eski, yeni) => { const kutu = sayfa.locator(`input[value="${eski}"]`).first(); await kutu.fill(yeni); await kutu.press("Enter"); };
const tonKodu = async (sayfa, ad, kod) => { const ok = await sayfa.evaluate(([a, kd]) => {
  let el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && e.value === a);
  while (el && !el.querySelector('input[placeholder="örn. 101"]')) el = el.parentElement;
  const t = el && el.querySelector('input[placeholder="örn. 101"]'); if (!t) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(t, kd); t.dispatchEvent(new Event("input", { bubbles: true })); return true; }, [ad, kod]);
  if (!ok) throw new Error(`ton kodu kutusu yok: ${ad}`); };
// oturum: ekran + yazma günlüğü (köprünün günlüğü: m, yol, durum, kod, mesaj)
async function ac(kullanici, mudahale) {
  const c = await ekranAc(GERCEK ? undefined : DB, { kullanici, mudahale });
  c.kullanici = kullanici; c.sayfa.on("dialog", (d) => d.accept().catch(() => {}));
  // bildirimler birkaç saniyede kaybolur ve yenisi eskisinin yerine geçer — sayfada biriktirilir
  await c.sayfa.evaluate(() => { window.__b12Bildirim = [];
    const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__b12Bildirim.includes(t)) window.__b12Bildirim.push(t); });
    new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
  c.bildirimler = async () => (await c.sayfa.evaluate(() => (window.__b12Bildirim || []).slice())).join(" | ");
  c.yazmalar = () => (c.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m));
  c.redler = () => c.yazmalar().filter((x) => x.durum >= 400).map((x) => `${x.m} ${kisa(x.yol, 50)} ${x.durum} ${x.kod || ""} ${kisa(x.mesaj, 150)}`);
  return c;
}
const kapat = async (...cs) => { for (const c of cs) { await c.tarayici.close().catch(() => {}); await c.k.kapat().catch(() => {}); } };
// sayfanın kendi oturumuyla doğrudan sunucu çağrısı (ekranda düğmesi olmayan / gizli işlem — sunucu denetimi ölçülür)
const rpc = (c, ad, govde) => c.sayfa.evaluate(async ({ ad, govde }) => {
  const f = JSON.parse(localStorage.getItem("firma:secim") || "null"); const o = JSON.parse(localStorage.getItem("atolye:oturum") || "{}");
  const kok = (f && f.url) || (window.SUPABASE_URL || "");
  const y = await fetch(`${kok}/rest/v1/${ad}`, { method: govde.__yontem || "POST", headers: { "content-type": "application/json", apikey: (f && f.anahtar) || "x", authorization: `Bearer ${o.erisim}`, prefer: "return=representation" }, body: JSON.stringify(govde.__govde || govde) });
  let j = null; try { j = await y.json(); } catch (e) { /* gövde yok */ } return { durum: y.status, kod: j && j.code, ileti: j && j.message, govde: j };
}, { ad, govde });
const kos = (ad) => !SECILI || SECILI.includes(ad);

(async () => {
  yaz(`ekran-b12-etkilesim · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase; giriş ekrandan)" : `PostgreSQL kipi (şablon ${SABLON}: dört paket + B1, CRLF kurulum)`}`);

  // ════════ E1 · YETKİLİ PERSONEL (Tuna: yalnız Tanımlar) RENK ADINI DEĞİŞTİRİR — kimlikler ve bağlar korunur
  if (kos("E1")) {
    yaz(`\n■ E1 Tuna (yalnız Tanımlar › düzenleme) "Vizon Yılan" → "Vizon Deri"`);
    await sifirla(); const t = await ac("Tuna");
    const once = await goruntu(t.k);
    k_("E1 başlangıç: kalemler eski adda, kopuk bağ yok", [await kalemRenkleri(t.k), await kopukKalem(t.k)], [["1054 - Siyah/Vizon Yılan"], 0]);
    k_("E1 Tanımlar › renk sekmesi Tuna'ya açık", await renkSekmesi(t.sayfa), true);
    await renkAdi(t.sayfa, "Vizon Yılan", "Vizon Deri"); await t.sayfa.waitForTimeout(9000);
    const cagri = t.yazmalar().filter((x) => /tanim_renk_ad_degistir/.test(x.yol)).map((x) => x.durum);
    yaz(`     bildirim: ${kisa(await toastlar(t.sayfa), 300)}`);
    k_("E1 ad değişikliği sunucu işlemiyle gitti ve kabul edildi (HTTP 200)", cagri, [200]);
    k_("E1 Tanımlar'da ad değişti", await sunucuRenkleri(t.k), ["Siyah", "Vizon Deri"]);
    k_("E1 varyant tablosunda renk ve kombinasyon etiketi yeni adda", await stkAd(t.k), ["k-1054=1054 - Siyah/Vizon Deri", "r-vizon=Vizon Deri"]);
    k_("E1 sipariş kalemleri yeni adda (B3a tablo tetikleyicisi işlemi kesmedi), kopuk bağ yok", [await kalemRenkleri(t.k), await kopukKalem(t.k)], [["1054 - Siyah/Vizon Deri"], 0]);
    k_("E1 renk / kombinasyon KİMLİKLERİ, varyantlar, kalem ve sipariş bağları AYNI", await goruntu(t.k), once);
    k_("E1 eski ad defterine yazıldı (rengin adı + geçtiği kombinasyon etiketi)", (await t.k.sorgu(`select renk_id || ':' || eski_ad || '→' || yeni_ad x from public.tanim_ad_gecmisi order by 1`)).map((x) => x.x),
      ["k-1054:1054 - Siyah/Vizon Yılan→1054 - Siyah/Vizon Deri", "r-vizon:Vizon Yılan→Vizon Deri"]);
    k_("E1 reddedilen yazma yok, sayfa hatası yok", [t.redler(), t.hatalar], [[], []]);
    await kapat(t);
  }

  // ════════ E2 · YETKİ KORUMALARI: yetkisiz ad değişikliği, yetkisiz renk ekleme; fiyat koruması
  if (kos("E2")) {
    yaz(`\n■ E2 yetki korumaları (B1 kuruluyken)`);
    await sifirla(); const ay = await ac("Ayşe");
    const once = await goruntu(ay.k);
    yaz(`     Ayşe'de Tanımlar › renk sekmesi: ${(await renkSekmesi(ay.sayfa)) ? "açık" : "yok / kapalı"} (bilgi)`);
    let r = await rpc(ay, "rpc/tanim_renk_ad_degistir", { p: { renk_id: "r-vizon", yeni_ad: "Vizon Deri", eski_ad: "Vizon Yılan" } });
    yaz(`     Ayşe ad değiştirme çağrısı → HTTP ${r.durum} · ${r.kod} · ${kisa(r.ileti, 160)}`);
    k_("E2 Ayşe (yalnız stok) renk adını değiştiremez: 42501, ileti gereken yetkiyi söyler", [r.kod, /^Bu işlem için yetkiniz yok/.test(r.ileti || ""), /tanimlar/.test(r.ileti || "")], ["42501", true, true]);
    r = await rpc(ay, "rpc/tanim_eski_ad_serbest", { p: { ad: "Vizon Yılan" } });
    k_("E2 Ayşe eski adı serbest bırakamaz (yalnız Yönetici)", [r.durum >= 400, r.kod], [true, "42501"]);
    r = await rpc(ay, "urunler?id=eq.ekr-bot", { __yontem: "PATCH", __govde: { satis_fiyati: 999 } });
    yaz(`     Ayşe fiyat yazması → HTTP ${r.durum} · ${r.kod} · ${kisa(r.ileti, 140)}`);
    k_("E2 Ayşe satış fiyatını değiştiremez (B3a-2, KR040) — koruma yerinde", [r.durum >= 400, r.kod], [true, "KR040"]);
    k_("E2 hiçbir şey değişmedi: adlar, kalemler, kimlikler", [await sunucuRenkleri(ay.k), await kalemRenkleri(ay.k), JSON.stringify(await goruntu(ay.k)) === JSON.stringify(once)], [["Siyah", "Vizon Yılan"], ["1054 - Siyah/Vizon Yılan"], true]);
    await kapat(ay);
    // Tuna renk EKLER (B3a-2: ekleme = stok: kaydetme YA DA tanımlar: düzenleme → geçer), sonra SİLMEYE çalışır (silme = tanımlar: silme;
    // Tuna'da yok) — B2'nin sürüm koşullu yazması B3a-2'den KALICI ret alır: istemci bunu çakışma sanmamalı, dönüp durmamalı.
    const t = await ac("Tuna"); await renkSekmesi(t.sayfa);
    await renkEkle(t.sayfa, "Mor"); await t.sayfa.waitForTimeout(8000);
    k_("E2 Tuna (tanımlar: düzenleme) renk ekleyebildi — B2 yazması B3a-2'den geçti", [await sunucuRenkleri(t.k), t.redler()], [["Mor", "Siyah", "Vizon Yılan"], []]);
    const sinir = t.yazmalar().length;
    const silDugmesi = await t.sayfa.evaluate(() => {
      let el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && e.value === "Mor");
      while (el && !el.querySelector('input[placeholder="örn. 101"]')) el = el.parentElement;
      if (!el) return "satır yok";
      const d = [...el.querySelectorAll("button")].filter((x) => x.offsetParent);
      const sil = d.find((x) => /sil/i.test((x.title || "") + " " + (x.getAttribute("aria-label") || "") + " " + x.innerText)) || null;
      if (!sil) return "silme düğmesi yok (düğmeler: " + d.map((x) => x.title || x.innerText).join(", ") + ")";
      sil.click(); return "tıklandı"; });
    await t.sayfa.waitForTimeout(1500);
    // onay penceresi uygulama içiyse (tarayıcı penceresi değilse) onayla
    await t.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].filter((x) => x.offsetParent).find((x) => /^(Evet|Sil|Onayla|Evet, sil)$/i.test(x.innerText.trim())); if (b) b.click(); });
    await t.sayfa.waitForTimeout(25000);
    const tanimYazmalari = t.yazmalar().slice(sinir).filter((x) => /^tanimlar/.test(x.yol));
    const bild = kisa(await t.bildirimler(), 600);
    const serit = await t.sayfa.evaluate(() => document.querySelectorAll("[data-tanim-cakisma-satir]").length);
    const ekran = kisa(await t.sayfa.evaluate(() => document.body.innerText), 6000);
    yaz(`     silme düğmesi: ${silDugmesi} · Tuna'nın silme sonrası Tanımlar yazmaları: ${tanimYazmalari.map((x) => `${x.m} ${x.durum} ${x.kod || ""}`).join(" | ") || "yok"}`);
    yaz(`     ret iletisi: ${kisa((tanimYazmalari.find((x) => x.durum >= 400) || {}).mesaj, 240)}`);
    yaz(`     Tuna bildirimleri: ${bild}`);
    if (silDugmesi === "tıklandı") {
      k_("E2 Tuna'nın renk silmesi sunucuda reddedildi (KR040), renk yerinde", [tanimYazmalari.some((x) => x.kod === "KR040"), await sunucuRenkleri(t.k)], [true, ["Mor", "Siyah", "Vizon Yılan"]]);
      k_("E2 ret çakışma SANILMADI (çakışma şeridi yok) ve yazma dönüp durmadı (25 sn'de en çok 3 deneme)", [serit, tanimYazmalari.length <= 3], [0, true]);
      k_("E2 ret ekranda yetki sebebiyle gösterildi (bildirim ya da şerit)", /yetki/i.test(bild + " " + ekran), true);
    } else {
      yaz("     (bilgi) silme ekrandan üretilemedi — sunucu denetimi doğrudan çağrıyla ölçülür; istemcinin ret gösterimi bu senaryoda ÖLÇÜLMEDİ");
      const sr = (await t.k.sorgu(`select surum from public.tanimlar where id = 'tekil'`))[0].surum;
      const veri = (await t.k.sorgu(`select jsonb_set(veri, '{renkler}', (select jsonb_agg(r) from jsonb_array_elements(veri -> 'renkler') r where r ->> 'ad' <> 'Mor')) v from public.tanimlar where id = 'tekil'`))[0].v;
      const r2 = await rpc(t, `tanimlar?id=eq.tekil&surum=eq.${sr}`, { __yontem: "PATCH", __govde: { veri } });
      k_("E2 Tuna'nın renk silmesi (doğrudan sürüm koşullu yazma) reddedildi (KR040), renk yerinde", [r2.kod, await sunucuRenkleri(t.k)], ["KR040", ["Mor", "Siyah", "Vizon Yılan"]]);
    }
    // EKRANDAN ÜRETİLEN RET: Tuna "Fiyat Grupları"na Satış tipli grup ekler (B3a-2: sipariş: düzenleme ister; Tuna'da yok). Yazma B2'nin
    // sürüm koşullu yolundan gider ve KALICI ret alır — istemci bunu çakışma sanmamalı, dönüp durmamalı, sebebi göstermeli.
    await t.sayfa.evaluate(() => { const x = document.querySelector('[data-urun-alt="fiyat"]'); if (x) x.click(); }); await t.sayfa.waitForTimeout(700);
    const fg = t.sayfa.locator('input[placeholder="Örn. Toptan Müşteri"]').first();
    if (await fg.count()) {
      const sinir2 = t.yazmalar().length;
      await fg.fill("Toptan Deneme"); await fg.press("Enter"); await t.sayfa.waitForTimeout(25000);
      const yz = t.yazmalar().slice(sinir2).filter((x) => /^tanimlar/.test(x.yol));
      const bild2 = kisa(await t.bildirimler(), 900); const ekran2 = kisa(await t.sayfa.evaluate(() => document.body.innerText), 8000);
      const serit2 = await t.sayfa.evaluate(() => document.querySelectorAll("[data-tanim-cakisma-satir]").length);
      yaz(`     Tuna fiyat grubu ekledi → Tanımlar yazmaları: ${yz.map((x) => `${x.m} ${x.durum} ${x.kod || ""}`).join(" | ") || "yok"}`);
      yaz(`     ret iletisi: ${kisa((yz.find((x) => x.durum >= 400) || {}).mesaj, 260)}`);
      yaz(`     Tuna bildirimleri: ${bild2}`);
      k_("E2 Tuna'nın Satış fiyat grubu eklemesi sunucuda reddedildi (KR040), grup yazılmadı", [yz.some((x) => x.kod === "KR040"), (await t.k.sorgu(`select coalesce(jsonb_array_length(veri -> 'fiyatGruplari'), 0) n from public.tanimlar where id = 'tekil'`))[0].n], [true, 0]);
      k_("E2 ret çakışma SANILMADI (çakışma şeridi yok) ve yazma dönüp durmadı (25 sn'de en çok 3 deneme)", [serit2, yz.length <= 3], [0, true]);
      // GÖSTERİM (1.744.0'dan beri, bu pakette DEĞİŞMEDİ): kalıcı ret turuncu şeritte "inceleme gerekiyor (kendiliğinden denenmez)" diye durur;
      // sebep şeritteki "Hata" düğmesinin arkasındadır (doğrudan görünmez — bilinen açık madde, B1/B2 kapsamı dışı).
      const serit3 = /Tanımlar — inceleme gerekiyor \(kendiliğinden denenmez\)/.test(ekran2);
      await t.sayfa.locator('[data-bekleyen-hata="1"]').first().click().catch(() => {}); await t.sayfa.waitForTimeout(1200);
      const ayrinti = kisa(await t.sayfa.evaluate(() => document.body.innerText), 12000);
      yaz(`     şerit: ${serit3 ? '"Tanımlar — inceleme gerekiyor (kendiliğinden denenmez)"' : "YOK"} · "Hata" penceresinde sebep: ${/yetkiniz yok: satış fiyat grubu/.test(ayrinti) ? "var (yetkiniz yok: satış fiyat grubu … sipariş: düzenleme)" : "YOK"}`);
      k_("E2 ret ekranda kalıcı ret şeridiyle duruyor; sebep \"Hata\" penceresinde okunuyor", [serit3, /yetkiniz yok: satış fiyat grubu/.test(ayrinti)], [true, true]);
      k_("E2 reddedilen yazma Tuna'nın önceki eklemesini (Mor) bozmadı", await sunucuRenkleri(t.k), ["Mor", "Siyah", "Vizon Yılan"]);
    } else yaz("     (bilgi) Fiyat Grupları kutusu Tuna'da yok — ekrandan ret üretilemedi; istemcinin ret gösterimi ÖLÇÜLMEDİ");
    await kapat(t);
  }

  // ════════ E3 · B2 BİRLEŞTİRME × B3a-2: iki cihaz aynı anda renk ekler (Ali + Deniz); Deniz'in yazması geç varır
  if (kos("E3")) {
    yaz(`\n■ E3 iki cihaz aynı anda renk ekler: Ali "Kırmızı", Deniz (stok + tanımlar) "Lacivert" — Deniz'in yazması Ali'ninkinden SONRA varır`);
    await sifirla();
    let tut = null; const tutulan = [];
    const mudahale = async (s) => { await s.route("**/rest/v1/tanimlar**", async (r) => { const m = r.request().method(); if ((m === "POST" || m === "PATCH") && tut) { await tut; tutulan.push(m); } return r.fallback(); }); };
    const a = await ac("Ali"); const d = await ac("Deniz", mudahale);
    const once = await goruntu(a.k);
    await renkSekmesi(a.sayfa); k_("E3 Tanımlar › renk sekmesi Deniz'e açık", await renkSekmesi(d.sayfa), true);
    let birak; tut = new Promise((r) => { birak = r; });
    await renkEkle(d.sayfa, "Lacivert"); await d.sayfa.waitForTimeout(1500);
    await renkEkle(a.sayfa, "Kırmızı"); await a.sayfa.waitForTimeout(4000);
    tut = null; birak(); await d.sayfa.waitForTimeout(20000);
    yaz(`     Deniz'in bekletilen yazması: ${tutulan.join(",") || "yok"} · Deniz'in Tanımlar yazmaları: ${d.yazmalar().filter((x) => /^tanimlar/.test(x.yol)).map((x) => `${x.m} ${x.durum}`).join(" | ")}`);
    k_("E3 iki renk de sunucuda (birinin eklediği kaybolmadı)", await sunucuRenkleri(a.k), ["Kırmızı", "Lacivert", "Siyah", "Vizon Yılan"]);
    const kodlar = await a.k.sorgu(`select r ->> 'kod' kod, r ->> 'barkodKodu' bk from public.tanimlar, jsonb_array_elements(veri -> 'renkler') r where id = 'tekil'`);
    const tekil = (al) => { const x = kodlar.map((y) => y[al]).filter((y) => y != null && y !== ""); return x.length === new Set(x).size; };
    k_("E3 renk kodları ve barkod kodları tekil", [tekil("kod"), tekil("bk")], [true, true]);
    k_("E3 var olan renk / kombinasyon kimlikleri, varyantlar ve sipariş bağları AYNI", await goruntu(a.k), once);
    k_("E3 B3a-2 Deniz'in birleştirme yazmasını reddetmedi; Ali'de de ret yok", [d.redler(), a.redler()], [[], []]);
    k_("E3 sayfa hatası yok", [a.hatalar, d.hatalar], [[], []]);
    await kapat(a, d);
  }

  // ════════ E4 · B2 ÇAKIŞMA × B3a-2: aynı alan iki cihazda farklı (ton kodu); personelin "Benimkini uygula" yazması
  if (kos("E4")) {
    yaz(`\n■ E4 aynı alan iki cihazda: Ali ton kodu "201", Tuna "202" (Tuna'nın yazması sonra varır) → Tuna "Benimkini uygula"`);
    await sifirla();
    let tut = null;
    const mudahale = async (s) => { await s.route("**/rest/v1/tanimlar**", async (r) => { const m = r.request().method(); if ((m === "POST" || m === "PATCH") && tut) await tut; return r.fallback(); }); };
    const a = await ac("Ali"); const t = await ac("Tuna", mudahale);
    const once = await goruntu(a.k);
    await renkSekmesi(a.sayfa); await renkSekmesi(t.sayfa);
    let birak; tut = new Promise((r) => { birak = r; });
    await tonKodu(t.sayfa, "Vizon Yılan", "202"); await t.sayfa.waitForTimeout(1500);
    await tonKodu(a.sayfa, "Vizon Yılan", "201"); await a.sayfa.waitForTimeout(4000);
    tut = null; birak(); await t.sayfa.waitForTimeout(20000);
    const serit = await t.sayfa.evaluate(() => [...document.querySelectorAll("[data-tanim-cakisma-satir]")].map((x) => x.getAttribute("data-tanim-cakisma-satir")));
    k_("E4 sunucuda Ali'nin değeri kaldı (Tuna sessizce ezmedi)", await vizonKodu(a.k), "201");
    k_("E4 Tuna'da çakışma şeridi: hangi öğe", serit, ["renkler › Vizon Yılan › kod"]);
    k_("E4 Tuna'nın değişikliği bekleyen defterde (kaybolmadı)", await t.sayfa.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")).includes("tanimlar:data"); } catch (e) { return false; } }), true);
    if (serit.length) { await t.sayfa.locator("[data-tanim-cakisma-benim]").first().click(); await t.sayfa.waitForTimeout(9000); }
    k_("E4 'Benimkini uygula' → sunucuda Tuna'nın değeri (B3a-2 personelin çakışma çözümünü reddetmedi)", await vizonKodu(a.k), "202");
    k_("E4 çakışma şeridi kapandı", await t.sayfa.locator("[data-tanim-cakisma-satir]").count(), 0);
    k_("E4 kimlikler ve bağlar AYNI; ret yok", [JSON.stringify(await goruntu(a.k)) === JSON.stringify(once), t.redler().filter((x) => !/ 409 | 412 /.test(x)), a.redler()], [true, [], []]);
    await kapat(a, t);
  }

  // ════════ E5 · İKİ CİHAZ AYNI RENGİN ADINI DEĞİŞTİRİR (Tuna önce, Ali sonra) + BAYAT CİHAZIN ESKİ ADLA YAZMASI
  if (kos("E5")) {
    yaz(`\n■ E5 Tuna "Vizon Yılan" → "Vizon Rugan"; ardından (ekranı bayat) Ali aynı rengi "Vizon Deri" yapmak ister`);
    await sifirla();
    const a = await ac("Ali"); const t = await ac("Tuna");
    const once = await goruntu(a.k);
    await renkSekmesi(a.sayfa); await renkSekmesi(t.sayfa);
    await renkAdi(t.sayfa, "Vizon Yılan", "Vizon Rugan"); await t.sayfa.waitForTimeout(4000);
    const aOnce = a.yazmalar().length;
    const bayatMi = (await a.sayfa.locator('input[value="Vizon Yılan"]').count()) > 0;
    if (bayatMi) { await renkAdi(a.sayfa, "Vizon Yılan", "Vizon Deri"); await a.sayfa.waitForTimeout(3000); }
    const retA = a.yazmalar().slice(aOnce).filter((x) => /tanim_renk_ad_degistir/.test(x.yol)).map((x) => `${x.durum}:${x.kod || ""}`);
    const bildA = kisa(await a.bildirimler(), 500);
    yaz(`     Ali'nin ekranı ${bayatMi ? "bayattı (eski ad görünüyordu)" : "kendiliğinden tazelenmişti — bayat istek ekrandan üretilemedi"} · Ali'nin isteği: ${retA.join(",") || "yok"} · bildirim: ${bildA}`);
    if (bayatMi) k_("E5 ikinci istek KR021 ile reddedildi, açık ileti", [retA.some((x) => /KR021/.test(x)), /bu arada değişmiş/.test(bildA)], [true, true]);
    else { const r = await rpc(a, "rpc/tanim_renk_ad_degistir", { p: { renk_id: "r-vizon", yeni_ad: "Vizon Deri", eski_ad: "Vizon Yılan" } });
      k_("E5 bayat istek (doğrudan çağrı) KR021 ile reddedildi", r.kod, "KR021"); }
    k_("E5 ilk gelen uygulandı, ikinci EZMEDİ", [await sunucuRenkleri(a.k), await kalemRenkleri(a.k)], [["Siyah", "Vizon Rugan"], ["1054 - Siyah/Vizon Rugan"]]);
    // bayat cihaz eski adla yeni kalem yazar (alt_yaz: uygulamanın kalem yolu) → tetikleyici güncel ada çevirir, bağ kopmaz
    const r = await rpc(a, "rpc/alt_yaz", { p: { siparis_kalemleri: { satirlar: [{ id: "kl-bayat-1", siparis_id: "sp-inc-1", urun_id: "inc-bot", urun_ad: "İnceleme Bot", renk: "1054 - Siyah/Vizon Yılan", beden: "40", miktar: 1, sira: 9 }] } } });
    yaz(`     eski adla kalem yazması → HTTP ${r.durum}${r.kod ? ` · ${r.kod} · ${kisa(r.ileti, 120)}` : ""}`);
    k_("E5 eski adla gelen yeni kalem güncel ada bağlandı, kopuk bağ yok", [(await a.k.sorgu(`select renk from public.siparis_kalemleri where id = 'kl-bayat-1'`)).map((x) => x.renk), await kopukKalem(a.k)], [["1054 - Siyah/Vizon Rugan"], 0]);
    const son = await goruntu(a.k); son.kalemler = son.kalemler.filter((x) => !/^kl-bayat-1:/.test(x));
    k_("E5 kimlikler, varyantlar ve önceki kalem / sipariş bağları AYNI", son, once);
    k_("E5 sayfa hatası yok", [a.hatalar, t.hatalar], [[], []]);
    await kapat(a, t);
  }

  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${kalanlar.length ? "\nKALANLAR:\n  - " + kalanlar.join("\n  - ") : ""}`);
  fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
