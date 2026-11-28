#!/usr/bin/env node
// EKRAN SINAMASI — BULUTTAN GELEN TANIMLAR EKRANA İŞLENİYOR MU (27 Kasım, canlı hata: 1.744.46).
//
// HATA: `bulutDegisikligiUygula` (100) buluttan okunan Tanımlar'ı ekrandaki hâlin KENDİ alt kümesiyle karşılaştırıyor, anahtar kümeleri
// aynıyken hiç işlemiyordu; fark tabanı ise bulut hâline geçiyordu. Renk adı sunucuda değişince (B1) ekrandaki Tanımlar eski adda
// kalıyor ("N üründe" rozeti kayboluyor), aynı cihazın SONRAKİ Tanımlar kaydı eski adı "yerel değişiklik" sanıp geri yazıyor; kalemler
// yeni adda kaldığı için bağ kopuyordu. Aynı nedenle başka cihazın Tanımlar değişikliği de açık ekrana gelmiyordu.
//
// SENARYOLAR (her biri taze veride; beş sunucu paketi kurulu):
//   T1 AYNI CİHAZ: renk adı değiştir → aynı cihazdan başka Tanımlar kaydı (renk ekle) → sayfayı yenile → bir kayıt daha.
//      Ad, renk / kombinasyon kimlikleri, varyantlar ve sipariş bağları korunur; rozet kaybolmaz.
//   T2 DİĞER CİHAZ: A ton kodu değiştirir, renk ekler, bir rengin adını değiştirir → B'nin AÇIK ekranına gelir (yenilemeden);
//      B'nin sonraki kaydı A'nın değişikliklerini geri çevirmez.
//   T3 BEKLEYEN YEREL DEĞİŞİKLİK: B'nin Tanımlar yazması gidemiyor (bekleyen defterde); A başka bir öğeyi değiştirir → tazeleme B'nin
//      bekleyen değişikliğini EZMEZ; yazma açılınca ikisi de sunucuda (B2 birleştirme).
//   T4 BEKLEYEN + ÇAKIŞMA: B'nin bekleyen değişikliği ile A'nın değişikliği AYNI alanda → B sessizce ezmez / ezilmez: çakışma şeridi,
//      "Benimkini uygula" ile çözülür (B2 çakışma koruması).
// İSTEMCİ: ISTEMCI_DIZIN (içinde test/test.html olan çalışma ağacı). Eski kod (1.744.46) T1 ve T2'de KALMALI, düzeltme hepsini geçmeli.
// İki kip: yerel PostgreSQL (paketler CRLF kurulu şablon) ve gerçek API kipi (KOPRU_SUPABASE: yerel Supabase, giriş ekrandan). Bulut yok.
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
const DB = "b12_taz";
const SECILI = process.env.SENARYO ? process.env.SENARYO.split(",") : null;
const SONUC = path.join(__dirname, GERCEK ? `sonuc-ekran-tanim-tazele${process.env.SONUC_EK || ""}-supabase.txt` : `sonuc-ekran-tanim-tazele${process.env.SONUC_EK || ""}.txt`);

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
  if (!ok) yaz(`     (ton kodu kutusu yok: ${ad} — satır ekranda bu adla değil)`); return ok; };
// oturum: ekran + yazma günlüğü (köprünün günlüğü: m, yol, durum, kod, mesaj)
async function ac(kullanici, engelli) {
  const durum = { engel: false };
  // `window.__TANI_AC`: uygulama bellekteki güncel durumu (yalnız okuma) `window.__TANI`'ye bağlar — ekranda görünmeyen bayat kopya ölçülür.
  // `engelli`: bu cihazın Tanımlar YAZMALARI istenince 503 alır (sunucuya gidemeyen yazma → bekleyen defter); okumalar serbest.
  const mudahale = async (s) => { await s.addInitScript(() => { window.__TANI_AC = true; });
    if (engelli) await s.route("**/rest/v1/tanimlar**", (r) => (durum.engel && ["POST", "PATCH"].includes(r.request().method())
      ? r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "SINAMA503", message: "sınama: sunucu geçici olarak yanıt vermiyor" }) }) : r.fallback())); };
  const c = await ekranAc(GERCEK ? undefined : DB, { kullanici, mudahale }); c.durum = durum;
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

const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const { yenile } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const bellek = (c) => c.sayfa.evaluate(() => { const g = window.__TANI && window.__TANI.current; if (!g) return null;
  return { renkler: (g.tanimlar.renkler || []).map((r) => r.ad + (r.kod && ["r-siyah", "r-vizon"].includes(r.id) ? "#" + r.kod : "")).sort(),
    varyantAdlari: [...new Set((g.stok || []).flatMap((u) => (u.variants || []).map((v) => v.renk)))].sort() }; });
const rozet = (c, ad) => c.sayfa.evaluate((a) => { let el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && e.value === a); if (!el) return "(satır yok)";
  while (el && !el.querySelector('input[placeholder="örn. 101"]')) el = el.parentElement; return ((el && el.innerText.match(/\d+ üründe/)) || ["(rozet yok)"])[0]; }, ad);
// yeni eklenen renge uygulama OTOMATİK ton kodu verir — kod yalnız tohumdaki iki renkte (r-siyah, r-vizon) karşılaştırılır
const kodlar = async (k) => (await k.sorgu(`select array(select (r ->> 'ad') || case when r ->> 'id' in ('r-siyah', 'r-vizon') then coalesce('#' || nullif(r ->> 'kod', ''), '') else '' end from jsonb_array_elements(veri -> 'renkler') r order by 1) a from public.tanimlar where id = 'tekil'`))[0].a;
const bekleyenler = (c) => c.sayfa.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("bekleyen:yazma") || "{}")); } catch (e) { return ["(okunamadı)"]; } });
const yenidenDene = (c) => c.sayfa.evaluate(() => { const d = document.querySelector('[data-bekleyen-gonder="1"]'); if (d) d.click(); return !!d; });
const seritSatirlari = (c) => c.sayfa.evaluate(() => [...document.querySelectorAll("[data-tanim-cakisma-satir]")].map((x) => x.getAttribute("data-tanim-cakisma-satir")));
const YOKLAMA = 24000;   // değişiklik yoklaması 8 sn'de bir; kendi yazmasından sonra 12 sn erteler
const istemciSurumu = () => { try { return (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1]; } catch (e) { return "?"; } };
const kos = (ad) => !SECILI || SECILI.includes(ad);

(async () => {
  yaz(`ekran-tanim-tazele · istemci ${istemciSurumu()} (${ISTEMCI}) · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase; giriş ekrandan)" : `PostgreSQL kipi (şablon ${SABLON}: dört paket + B1, CRLF kurulum)`}`);

  // ════════ T1 · AYNI CİHAZ: ad değiştir → başka Tanımlar kaydı → yenile
  if (kos("T1")) {
    yaz(`\n■ T1 aynı cihaz: "Vizon Yılan" → "Vizon Deri", ardından aynı cihazdan renk eklenir, sayfa yenilenir`);
    await sifirla(); const a = await ac("Ali");
    const once = await goruntu(a.k);
    await renkSekmesi(a.sayfa);
    k_("T1 başlangıç: rozet var, kopuk bağ yok", [await rozet(a, "Vizon Yılan"), await kopukKalem(a.k)], ["1 üründe", 0]);
    await renkAdi(a.sayfa, "Vizon Yılan", "Vizon Deri"); await a.sayfa.waitForTimeout(7000);
    const b1 = await bellek(a);
    yaz(`     ad değişikliğinden sonra bellek: ${JSON.stringify(b1)}`);
    k_("T1 ad değişikliğinden sonra ekrandaki (bellekteki) Tanımlar YENİ adda", b1 && b1.renkler, ["Siyah", "Vizon Deri"]);
    k_("T1 rozet kaybolmadı (\"N üründe\")", await rozet(a, "Vizon Deri"), "1 üründe");
    await renkEkle(a.sayfa, "Mor"); await a.sayfa.waitForTimeout(9000);
    k_("T1 aynı cihazın sonraki Tanımlar kaydı eski adı GERİ YAZMADI (sunucu Tanımlar)", await sunucuRenkleri(a.k), ["Mor", "Siyah", "Vizon Deri"]);
    k_("T1 varyant etiketleri yeni adda", await stkAd(a.k), ["k-1054=1054 - Siyah/Vizon Deri", "r-vizon=Vizon Deri"]);
    k_("T1 sipariş kalemleri yeni adda, kopuk bağ yok", [await kalemRenkleri(a.k), await kopukKalem(a.k)], [["1054 - Siyah/Vizon Deri"], 0]);
    k_("T1 renk / kombinasyon kimlikleri, varyantlar, kalem ve sipariş bağları AYNI", await goruntu(a.k), once);
    await yenile(a.sayfa); await renkSekmesi(a.sayfa);
    k_("T1 yenilemeden sonra ekranda yeni ad ve rozet; bekleyen kayıt / çakışma yok",
      [await rozet(a, "Vizon Deri"), await rozet(a, "Vizon Yılan"), await bekleyenler(a), await seritSatirlari(a)], ["1 üründe", "(satır yok)", [], []]);
    await tonKodu(a.sayfa, "Vizon Deri", "450"); await a.sayfa.waitForTimeout(8000);
    k_("T1 yenilemeden sonraki kayıt da adı korudu", [await kodlar(a.k), await kalemRenkleri(a.k), await kopukKalem(a.k)], [["Mor", "Siyah", "Vizon Deri#450"], ["1054 - Siyah/Vizon Deri"], 0]);
    k_("T1 reddedilen yazma yok, sayfa hatası yok", [a.redler(), a.hatalar], [[], []]);
    await kapat(a);
  }

  // ════════ T2 · DİĞER CİHAZ: değişiklik açık ekrana gelir; sonraki kayıt geri çevirmez
  if (kos("T2")) {
    yaz(`\n■ T2 diğer cihaz: A ton kodu verir, renk ekler, bir rengin adını değiştirir — B'nin ekranı AÇIK, yenilenmez`);
    await sifirla(); const a = await ac("Ali"); const b = await ac("Deniz");
    const once = await goruntu(a.k);
    await renkSekmesi(a.sayfa); await renkSekmesi(b.sayfa);
    await tonKodu(a.sayfa, "Siyah", "301"); await a.sayfa.waitForTimeout(3000);
    await renkEkle(a.sayfa, "Kırmızı"); await a.sayfa.waitForTimeout(3000);
    await renkAdi(a.sayfa, "Vizon Yılan", "Vizon Deri"); await a.sayfa.waitForTimeout(3000);
    k_("T2 A'nın değişiklikleri sunucuda", await kodlar(a.k), ["Kırmızı", "Siyah#301", "Vizon Deri"]);
    await b.sayfa.waitForTimeout(YOKLAMA);
    const bb = await bellek(b);
    yaz(`     B'nin belleği (yoklamadan sonra): ${JSON.stringify(bb)} · B bildirimleri: ${kisa(await b.bildirimler(), 200)}`);
    k_("T2 A'nın değişiklikleri B'nin AÇIK ekranına geldi (ton kodu, yeni renk, yeni ad)", bb && bb.renkler, ["Kırmızı", "Siyah#301", "Vizon Deri"]);
    k_("T2 B'nin ekranında yeni renk ve yeni ad görünüyor", [await rozet(b, "Kırmızı") !== "(satır yok)", await rozet(b, "Vizon Deri")], [true, "1 üründe"]);
    await renkEkle(b.sayfa, "Lacivert"); await b.sayfa.waitForTimeout(9000);
    k_("T2 B'nin sonraki kaydı A'nın değişikliklerini GERİ ÇEVİRMEDİ", await kodlar(a.k), ["Kırmızı", "Lacivert", "Siyah#301", "Vizon Deri"]);
    k_("T2 kalemler yeni adda, kopuk bağ yok; kimlikler ve bağlar AYNI", [await kalemRenkleri(a.k), await kopukKalem(a.k), JSON.stringify(await goruntu(a.k)) === JSON.stringify(once)], [["1054 - Siyah/Vizon Deri"], 0, true]);
    k_("T2 çakışma şeridi yok, bekleyen yok, ret yok", [await seritSatirlari(b), await bekleyenler(b), b.redler(), a.redler()], [[], [], [], []]);
    k_("T2 sayfa hatası yok", [a.hatalar, b.hatalar], [[], []]);
    await kapat(a, b);
  }

  // ════════ T3 · BEKLEYEN YEREL DEĞİŞİKLİK: tazeleme ezmez; birleşir
  if (kos("T3")) {
    yaz(`\n■ T3 B'nin Tanımlar yazması gidemiyor (bekleyen); A başka bir öğeyi değiştirir`);
    await sifirla(); const a = await ac("Ali"); const b = await ac("Deniz", true);
    await renkSekmesi(a.sayfa); await renkSekmesi(b.sayfa);
    b.durum.engel = true;
    await tonKodu(b.sayfa, "Vizon Yılan", "777"); await b.sayfa.waitForTimeout(6000);
    k_("T3 B'nin değişikliği bekleyen defterde, sunucuya gitmedi", [(await bekleyenler(b)).includes("tanimlar:data"), await kodlar(a.k)], [true, ["Siyah", "Vizon Yılan"]]);
    await renkEkle(a.sayfa, "Kırmızı"); await a.sayfa.waitForTimeout(3000);
    await b.sayfa.waitForTimeout(YOKLAMA);
    const bb = await bellek(b);
    yaz(`     B'nin belleği (A yazdıktan ve yoklama süresi geçtikten sonra): ${JSON.stringify(bb && bb.renkler)}`);
    k_("T3 tazeleme B'nin bekleyen yerel değişikliğini EZMEDİ (ekranda 777 duruyor, defterde duruyor)",
      [bb && bb.renkler.includes("Vizon Yılan#777"), (await bekleyenler(b)).includes("tanimlar:data")], [true, true]);
    b.durum.engel = false; await yenidenDene(b); await b.sayfa.waitForTimeout(10000);
    k_("T3 yazma açılınca ikisi de sunucuda: B'nin ton kodu + A'nın rengi (B2 birleştirme)", await kodlar(a.k), ["Kırmızı", "Siyah", "Vizon Yılan#777"]);
    k_("T3 defter boşaldı, çakışma şeridi yok", [await bekleyenler(b), await seritSatirlari(b)], [[], []]);
    k_("T3 sınama engeli dışında ret yok, sayfa hatası yok", [b.redler().filter((x) => !/SINAMA503/.test(x)), a.redler(), a.hatalar, b.hatalar], [[], [], [], []]);
    await kapat(a, b);
  }

  // ════════ T4 · BEKLEYEN + AYNI ALAN: B2 çakışma koruması
  if (kos("T4")) {
    yaz(`\n■ T4 B'nin bekleyen değişikliği ile A'nın değişikliği AYNI alanda (Siyah › ton kodu)`);
    await sifirla(); const a = await ac("Ali"); const b = await ac("Deniz", true);
    await renkSekmesi(a.sayfa); await renkSekmesi(b.sayfa);
    b.durum.engel = true;
    await tonKodu(b.sayfa, "Siyah", "888"); await b.sayfa.waitForTimeout(6000);
    await tonKodu(a.sayfa, "Siyah", "999"); await a.sayfa.waitForTimeout(3000);
    await b.sayfa.waitForTimeout(YOKLAMA);
    const bb = await bellek(b);
    k_("T4 tazeleme B'nin bekleyen değerini EZMEDİ (ekranda 888)", bb && bb.renkler.includes("Siyah#888"), true);
    b.durum.engel = false; await yenidenDene(b); await b.sayfa.waitForTimeout(10000);
    const serit = await seritSatirlari(b);
    k_("T4 B sessizce ezmedi: sunucuda A'nın değeri", await kodlar(a.k), ["Siyah#999", "Vizon Yılan"]);
    k_("T4 B'de çakışma şeridi: hangi öğe; değişiklik defterde bekliyor", [serit, (await bekleyenler(b)).includes("tanimlar:data")], [["renkler › Siyah › kod"], true]);
    if (serit.length) { await b.sayfa.locator("[data-tanim-cakisma-benim]").first().click(); await b.sayfa.waitForTimeout(9000); }
    k_("T4 \"Benimkini uygula\" → sunucuda B'nin değeri; şerit kapandı, defter boş", [await kodlar(a.k), await seritSatirlari(b), await bekleyenler(b)], [["Siyah#888", "Vizon Yılan"], [], []]);
    k_("T4 sayfa hatası yok", [a.hatalar, b.hatalar], [[], []]);
    await kapat(a, b);
  }

  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${kalanlar.length ? "\nKALANLAR:\n  - " + kalanlar.join("\n  - ") : ""}`);
  fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
