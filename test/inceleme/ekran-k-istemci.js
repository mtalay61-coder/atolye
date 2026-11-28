#!/usr/bin/env node
// EKRAN SINAMASI — PAKET K GERÇEK İSTEMCİYLE (28 Kasım). Kalıcı sınama.
//   C1 YENİ CARİ + HEMEN HAREKET: ekrandan cari açılır, ardından beklemeden o cariye cari virmanı kaydedilir → ikisi de sunucuda.
//   C2 SIRA BOZULURSA: yeni carinin yazması YOLDA TUTULUR, hareket (fiş) sunucuya cariden ÖNCE varır → Paket K yabancı anahtarı reddeder.
//      Ölçülen: istemci kaydı KAYBETMİYOR mu (form / bekleyen defter / bildirim), isteği SONSUZ tekrar etmiyor mu, cari yazması
//      serbest kalınca kullanıcı kaydı tamamlayabiliyor mu, sunucuda çift kayıt oluşmuyor mu.
//   C3 HAREKETİ OLAN CARİ EKRANDAN SİLİNEMEZ (istemci denetimi) ve doğrudan API ile de silinemez (KR050).
//   C4 KASA HESABI SİLME: hareketi olan hesap uygulamanın yoluyla (`kas_yaz` · hesapSil) silinince hareketleri duruyor mu.
// İki kip: yerel PostgreSQL (EKRAN_SABLON, vars. b12_k_crlf = beş paket + Paket K, CRLF) ve gerçek API kipi (KOPRU_SUPABASE: yerel
// Supabase; giriş ekrandan, gerçek Auth). Buluta bağlanmaz.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const GERCEK = !!process.env.KOPRU_SUPABASE;
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const { ekranAc, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik");
const SABLON = process.env.EKRAN_SABLON || "b12_k_crlf", DB = "b12_kist";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const kalanlar = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else { kalan += 1; kalanlar.push(ad); }
  yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const kisa = (s, n = 300) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const psqlSon = (args) => { const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return c[c.length - 1]; };
async function sifirla() {
  let b;
  if (GERCEK) { execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] });
    for (const f of ["26-b1-uygula.sql", "52-k-uygula.sql"]) psqlSon([SB_PG, "-f", path.join(G, f)]);
    yaz(`  yerel Supabase: Paket K durumu → ${psqlSon([SB_PG, "-f", path.join(G, "52-k-durum-salt-okur.sql"), "-c", "notify pgrst, 'reload schema'"])}`); b = { connectionString: SB_PG };
  } else { const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
    await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end(); b = { host: "localhost", database: DB, user: "postgres" }; }
  const c = new Client(b); await c.connect(); await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.cariler (id, unvan, tip, para_birimi) values ('ekr-satici', 'Ekran Satıcı', 'Tedarikçi', 'TRY'), ('ekr-gecmis', 'Ekran Geçmişli', 'Müşteri', 'TRY') on conflict (id) do nothing`);
  await c.query(`insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama) values ('ch-ekr-1', 'ekr-gecmis', current_date, 'Borç', 250, 'geçmiş') on conflict (id) do nothing`);
  await c.query(`insert into public.kas_hesap (id, tur, sira, veri, aktif) values ('K-ekr', 'kasa', 9, '{"id":"K-ekr","ad":"Ekran Kasa","paraBirimi":"TRY"}', true) on conflict (id) do nothing`);
  await c.query(`insert into public.kas_hareket (id, hesap_id, sira, veri) values ('kh-ekr-1', 'K-ekr', 1, '{"id":"kh-ekr-1","tutar":40,"yon":"Giriş","tarih":"2026-11-28","aciklama":"geçmiş"}') on conflict (id) do nothing`);
  await c.query("commit"); await c.end(); if (GERCEK) await new Promise((r) => setTimeout(r, 1500));
}
const yazmalar = (a) => (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m));
const ozet = (x) => `${x.m} ${kisa(x.yol, 34)} ${x.durum}${x.kod ? " " + x.kod : ""}`;
const cariEkle = async (s, unvan) => {
  if (!(await s.evaluate(() => { const b = document.querySelector('[data-nav="Cari"]') || document.querySelector('[data-nav="Cariler"]'); if (b) b.click(); return !!b; }))) throw new Error("Cari menüsü yok");
  await s.waitForTimeout(900);
  await s.locator("button", { hasText: "Cari Ekle" }).first().click(); await s.waitForTimeout(500);
  await s.locator('input[placeholder="Örn. Deniz Ayakkabıcılık"]').first().fill(unvan);
  await s.locator("[data-cari-form-seridi] button.btn-save, button.btn-save").first().click();
};
const virman = async (s, ilk, karsi, tutar) => {
  await O.modulAc(s, "Kasa & Banka"); await s.waitForTimeout(500);
  await s.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await s.waitForTimeout(700);
  await s.locator('[data-odeme-tip="Ödeme"]:visible').first().click(); await s.waitForTimeout(150);
  await s.locator('[data-odeme-sekli="Virman"]:visible').first().click(); await s.waitForTimeout(200);
  await O.cariSec(s, ilk, "", "data-odeme-cari");
  await O.cariSec(s, karsi, '[data-cari-virman="Ödeme"]', "data-cari-virman-karsi");
  await s.locator("[data-cari-virman-tutar]:visible").fill(String(tutar));
  await s.locator("[data-cari-virman-kaydet]:visible").click();
};
const cariDurumu = async (k, unvan) => (await k.sorgu(`select (select count(*) from public.cariler where unvan = $1)::int cari,
  (select count(*) from public.car_hareket h join public.cariler c on c.id = h.cari_id where c.unvan = $1 and not coalesce(h.iptal, false))::int hareket,
  (select count(*) from public.car_hareket h where not exists (select 1 from public.cariler c where c.id = h.cari_id) and h.id <> 'ch-yetim')::int yetim`, [unvan]))[0];
// bildirimler birkaç saniyede kaybolur — sayfada biriktirilir
const toplayici = (s) => s.evaluate(() => { window.__kBildirim = []; const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__kBildirim.includes(t)) window.__kBildirim.push(t); });
  new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
const bildirimler = (s) => s.evaluate(() => (window.__kBildirim || []).join(" | "));
const bekleyen = (s) => s.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")); } catch (e) { return ["?"]; } });

(async () => {
  yaz(`ekran-k-istemci · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase; giriş ekrandan)" : `PostgreSQL kipi (şablon ${SABLON})`}`);

  yaz("\n■ C1 yeni cari + hemen cari virmanı");
  { await sifirla(); const a = await ekranAc(GERCEK ? undefined : DB, {}); const s = a.sayfa;
    await cariEkle(s, "Yeni Müşteri K"); await virman(s, "Yeni Müşteri K", "Ekran Satıcı", 100); await s.waitForTimeout(6000);
    const d = await cariDurumu(a.k, "Yeni Müşteri K"); const red = yazmalar(a).filter((x) => x.durum >= 400).map(ozet);
    yaz(`     sunucu: ${JSON.stringify(d)} · reddedilen: ${red.join(" | ") || "yok"} · bildirim: ${kisa(await toastlar(s), 160)}`);
    k_("C1 yeni cari ve hemen ardından yazılan hareketi sunucuda; carisiz hareket yok; ret yok", [d.cari, d.hareket, d.yetim, red], [1, 1, 0, []]);
    k_("C1 sayfa hatası yok", a.hatalar, []); await a.tarayici.close(); await a.k.kapat(); }

  yaz("\n■ C2 sıra bozulur: carinin yazması yolda tutulur, hareket önce varır");
  { await sifirla(); let tut = null, birak; const tutulan = [];
    const mudahale = async (pg) => { await pg.route("**/rest/v1/cariler**", async (r) => { const m = r.request().method(); if (["POST", "PATCH"].includes(m) && tut) { tutulan.push(m); await tut; } return r.fallback(); }); };
    const a = await ekranAc(GERCEK ? undefined : DB, { mudahale }); const s = a.sayfa; await toplayici(s);
    tut = new Promise((r) => { birak = r; });
    await cariEkle(s, "Geciken Müşteri K"); await virman(s, "Geciken Müşteri K", "Ekran Satıcı", 70); await s.waitForTimeout(30000);
    const fisIstekleri = yazmalar(a).filter((x) => /rpc\/fis_kes/.test(x.yol)); const d1 = await cariDurumu(a.k, "Geciken Müşteri K");
    const b1 = kisa(await bildirimler(s), 400), bek1 = await bekleyen(s);
    const ekran1 = kisa(await s.evaluate(() => document.body.innerText.split("\n").filter((x) => /Geciken|gönderile|bekle|incele|kaydedilemedi|tekrar/i.test(x)).slice(0, 6).join(" | ")), 400);
    yaz(`     30 sn sonra: tutulan cari yazması ${tutulan.join(",") || "yok"} · fiş istekleri: ${fisIstekleri.map(ozet).join(" | ") || "yok"}`);
    yaz(`     ret iletisi: ${kisa((fisIstekleri.find((x) => x.durum >= 400) || {}).mesaj, 200)}`);
    yaz(`     sunucu: ${JSON.stringify(d1)} · bekleyen defter ${JSON.stringify(bek1)} · bildirim: ${b1 || "(yok)"} · ekranda: ${ekran1 || "(yok)"}`);
    k_("C2 cari yokken gelen hareket reddedildi; carisiz hareket OLUŞMADI", [fisIstekleri.some((x) => x.durum >= 400), d1.hareket, d1.yetim], [true, 0, 0]);
    k_("C2 istek sonsuz tekrar edilmedi (30 sn'de en çok 3 fiş isteği)", fisIstekleri.length <= 3, true);
    k_("C2 kullanıcıya bildirildi (bildirim ya da ekranda uyarı)", /kaydedilemedi|yazılamadı|hata|bulunamadı|reddedil|gönderile/i.test(b1 + " " + ekran1), true);
    tut = null; birak(); await s.waitForTimeout(6000);
    const d2 = await cariDurumu(a.k, "Geciken Müşteri K");
    yaz(`     cari yazması serbest kaldıktan sonra: ${JSON.stringify(d2)} · bekleyen ${JSON.stringify(await bekleyen(s))}`);
    k_("C2 cari yazması serbest kalınca cari sunucuda (cari kaydı kaybolmadı)", d2.cari, 1);
    // hareket kendiliğinden gitmediyse kullanıcı formdan yeniden kaydeder: çift kayıt olmamalı
    if (d2.hareket === 0) { await virman(s, "Geciken Müşteri K", "Ekran Satıcı", 70); await s.waitForTimeout(6000); }
    const d3 = await cariDurumu(a.k, "Geciken Müşteri K");
    yaz(`     ${d2.hareket === 0 ? "kullanıcı yeniden kaydetti" : "hareket kendiliğinden gitti"} → ${JSON.stringify(d3)}`);
    k_("C2 sonunda hareket TEK kez sunucuda (kayıp yok, çift yok), carisiz hareket yok", [d3.hareket, d3.yetim], [1, 0]);
    k_("C2 sayfa hatası yok", a.hatalar, []); await a.tarayici.close(); await a.k.kapat(); }

  yaz("\n■ C3 hareketi olan cari silinemez · C4 hareketi olan kasa hesabı");
  { await sifirla(); const a = await ekranAc(GERCEK ? undefined : DB, {}); const s = a.sayfa;
    const api = (yol, yontem, govde) => s.evaluate(async ({ yol, yontem, govde }) => { const f = JSON.parse(localStorage.getItem("firma:secim") || "null"); const o = JSON.parse(localStorage.getItem("atolye:oturum") || "{}");
      const kok = (f && f.url) || window.SUPABASE_URL || ""; const y = await fetch(`${kok}/rest/v1/${yol}`, { method: yontem, headers: { "content-type": "application/json", apikey: (f && f.anahtar) || "x", authorization: `Bearer ${o.erisim}`, prefer: "return=representation" }, body: govde ? JSON.stringify(govde) : undefined });
      let j = null; try { j = await y.json(); } catch (e) { /* */ } return { durum: y.status, kod: j && j.code, ileti: j && j.message }; }, { yol, yontem, govde });
    const r3 = await api("cariler?id=eq.ekr-gecmis", "DELETE");
    yaz(`     hareketi olan cariyi doğrudan API ile silme → HTTP ${r3.durum} · ${r3.kod} · ${kisa(r3.ileti, 150)}`);
    k_("C3 hareketi olan cari gerçek API üzerinden silinemez (KR050); cari ve hareketi yerinde", [r3.kod, (await a.k.sorgu(`select count(*)::int n from public.cariler where id = 'ekr-gecmis'`))[0].n, (await a.k.sorgu(`select count(*)::int n from public.car_hareket where id = 'ch-ekr-1'`))[0].n], ["KR050", 1, 1]);
    const r3b = await api("cariler?id=eq.ekr-satici", "DELETE");
    k_("C3 hiçbir bağı olmayan cari silinebilir (gereksiz engel yok)", [r3b.durum < 300, (await a.k.sorgu(`select count(*)::int n from public.cariler where id = 'ekr-satici'`))[0].n], [true, 0]);
    const r4 = await api("rpc/kas_yaz", "POST", { p: { hesapSil: ["K-ekr"] } });
    const h = (await a.k.sorgu(`select (select count(*) from public.kas_hesap where id = 'K-ekr')::int satir, (select aktif from public.kas_hesap where id = 'K-ekr') aktif, (select count(*) from public.kas_hareket where hesap_id = 'K-ekr' and not coalesce(iptal, false))::int hareket`))[0];
    yaz(`     kasa hesabı silme (kas_yaz · hesapSil) → HTTP ${r4.durum}${r4.kod ? " · " + r4.kod + " · " + kisa(r4.ileti, 120) : ""} · hesap satırı ${h.satir}, etkin ${h.aktif}, geçerli hareket ${h.hareket}`);
    k_("C4 kasa hesabı silinince hesap satırı ve hareketleri DURUYOR (silme = pasife alma; geçmiş kaybolmaz)", [h.satir, h.hareket], [1, 1]);
    await a.tarayici.close(); await a.k.kapat(); }

  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${kalanlar.length ? "\nKALANLAR:\n  - " + kalanlar.join("\n  - ") : ""}`);
  fs.writeFileSync(path.join(__dirname, GERCEK ? "sonuc-ekran-k-istemci-supabase.txt" : "sonuc-ekran-k-istemci.txt"), satirlar.join("\n") + "\n");
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
