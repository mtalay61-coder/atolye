#!/usr/bin/env node
// EKRAN SINAMASI — CANLIDAKİ DENEME KALINTISI UYGULAMANIN KENDİ EKRANLARINDAN NASIL TEMİZLENİR (27 Kasım).
// Kullanıcı: "İşi ustadan geri alıp üretimi SİLMEDEN iptal etme, ardından üç deneme kartını pasife alma. İptal fişleri ve geçmiş
// korunsun; stok, cari ve bölüm tahakkuku sıfır kalsın; açık iş ve hammadde ihtiyacı kalksın."
// Bu sınama canlıdaki durumu YERELDE kurar ve iki yolu ayrı kopyalarda dener; canlıya / buluta / hiçbir Supabase projesine BAĞLANMAZ.
//   İstemci : YAYINLANMIŞ paket (YAYIN_HTML = atolye-erp-v1.744.37.html, SHA-256 denetimli; yayin-ekran.js).
//   Sunucu  : yerel PostgreSQL; inc_ekran_taban (canlıya hizalı, yetki paketsiz) kopyası + YALNIZ B4 (27-b4-uygula.sql).
//   Yazılan veritabanları yalnız `dt_dnm_*` (her koşuda silinip yeniden kurulur); şablonlara dokunulmaz.
//
// DURUMUN KURULUŞU (hangisi fikstür, hangisi ekran):
//   FİKSTÜR (süper kullanıcı SQL'i): KESİMHANE bölümü (Kesim prosesi bağlı), "1068 - Siyah" renk kombinasyonu, üç kart (DENEME ÜRÜN —
//     reçete: Kesim / DENEME HAMMADDE / çift başı 1, Kesim işçiliği 1 ₺; DENEME HAMMADDE; DENEME USTA), üretim 10001 (2 çift, 40:2,
//     aşama Kesim, iş VERİLMEMİŞ).
//   EKRAN (yayın paketi, Ali / Yönetici): "Reçeteyi onayla" → "İşi Ver" (DENEME USTA) → 2 × ("Teslim Al" + "Geri Al").
//   Sonuç canlıyla aynı: atama Kesim 2 adet "bekliyor", 2 İPTAL ÜRT fişi, geçerli fiş 0, stok / cari / bölüm tahakkuku 0.
//
// SIRALAR (her biri kurulmuş durumun TAZE kopyasında):
//   S1 (i)  : Soru 1 (ekranda "iptal" var mı) → işi vermeyi "Geri Al" → (iptal yolu yok → üretim bırakılır) → üç kartı "Pasife al"
//   S2 (ii) : işi vermeyi "Geri Al" → "Üretimi sil" → üç kartı "Pasife al"
//   S3 (ek) : iş ustadayken üç kartı "Pasife al" (açık iş varken izin veriyor mu) → Geri Al YAPMADAN "Üretimi sil" →
//             geri dönüş: Tanımlar › Çöp Kutusu "Geri yükle"; orada yoksa aynı sekmedeki "Sunucu arşivi" (Üretim, İş ataması)
// Her adımdan sonra SUNUCUDAN: 40-canli-deneme-temiz-salt-okur.sql (son satırı + BAK satırları) ve ayrıntı satırı (stok, fişler ve
// satırları, cari, bölüm tahakkuku, üretim satırı, atamalar, cop, pasif); EKRANDAN: Üretim Takibi, kartın Hammadde İhtiyacı sekmesi,
// Üretim Raporu, Depo, Planlama › Hammadde İhtiyaç, Fişler.
// Kural: beklenmeyen davranış EĞİLMEZ — ✗ / BULGU olarak yazılır.
//
// Kullanım (depo kökünden):
//   PGHOST=localhost KOPRU_PG=<pg modülü> PW_CHROMIUM=<chromium> YAYIN_HTML=<…v1.744.37.html> YAYIN_SHA=<sha256> \
//     node test/inceleme/ekran-deneme-temizlik.js          (DNM_SIRA=S1,S3 → yalnız seçilenler; sonuç dosyası yalnız TAM koşuda yazılır)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { Client } = require(process.env.KOPRU_PG || "pg");
if (!process.env.YAYIN_HTML || !process.env.YAYIN_SHA) { console.error("YAYIN_HTML ve YAYIN_SHA gerekli (yayın paketiyle koşar)"); process.exit(2); }
if (process.env.KOPRU_SUPABASE) { console.error("KOPRU_SUPABASE açık — bu sınama yalnız yerel PostgreSQL ile koşar"); process.exit(2); }
const YAYIN = require("./yayin-ekran.js");
const { O } = require("../ekran/ortak-ekran.js");

const KOKDIZIN = path.join(__dirname, "..", "..");
const SONUC = path.join(__dirname, "sonuc-ekran-deneme-temizlik.txt");
const B4_SQL = path.join(KOKDIZIN, "stok-v2", "guvenlik", "27-b4-uygula.sql");
const OLCUM_SQL = fs.readFileSync(path.join(KOKDIZIN, "stok-v2", "guvenlik", "40-canli-deneme-temiz-salt-okur.sql"), "utf8").replace(/;\s*$/, "");
const TABAN = "dt_dnm_taban";
const SECILI = process.env.DNM_SIRA ? process.env.DNM_SIRA.split(",") : null;
const kos = (ad) => !SECILI || SECILI.includes(ad);

// ── ÇIKTI
const satirlar = [];
const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const bulgular = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  yaz(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const bulgu = (m) => { bulgular.push(m); yaz(`     ‼ BULGU: ${m}`); };
const kisa = (s, n = 300) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

// ── VERİTABANI
const pgYonet = async (sql) => { const pg = new Client({ host: process.env.PGHOST || "localhost", database: "postgres", user: process.env.PGUSER || "postgres" });
  await pg.connect(); pg.on("notice", () => {}); try { for (const s of sql) await pg.query(s); } finally { await pg.end(); } };
const kopya = async (db, sablon) => { if (!/^dt_dnm_/.test(db)) throw new Error("yalnız dt_dnm_* yazılır"); await pgYonet([`drop database if exists ${db}`, `create database ${db} template ${sablon}`]); };
// FİKSTÜR — canlıdaki kartların ve üretimin İŞ VERİLMEDEN önceki hâli. Kimlikler yerel (dnm-…); ölçüm sorgusu adlarla arar.
const FIKSTUR = [
  `update public.tanimlar set veri = veri || jsonb_build_object(
     'renkKombinasyonlari', (veri -> 'renkKombinasyonlari') || '[{"id": "k-1068", "kod": "1068", "renkIdler": ["r-siyah"]}]'::jsonb,
     'bolumler', '[{"id": "bolum-kesimhane", "ad": "KESİMHANE", "prosesler": ["Kesim"], "personel": []}]'::jsonb) where id = 'tekil'`,
  `insert into public.stk_renk (id, ad, tur, kod, aktif) values ('k-1068', '1068 - Siyah', 'model', '1068', true) on conflict (id) do nothing`,
  `insert into public.cariler (id, unvan, tip, para_birimi, surum) values ('dnm-usta', 'DENEME USTA', 'Personel', 'TRY', 1)`,
  `insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ('dnm-ham', 'DENEME HAMMADDE', 'Hammadde', 'çift', 'Beden', false, 1)`,
  `insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif) values ('vry-dnm-ham', 'dnm-ham', 'r-siyah', 'b-40', 0, true)`,
  `insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum, proses_ucretleri, recete) values ('dnm-urun', 'DENEME ÜRÜN', 'Mamul', 'çift', 'Beden', false, 1, '{"Kesim": 1}'::jsonb,
     '[{"hammaddeUrunId": "dnm-ham", "hammaddeAd": "DENEME HAMMADDE", "mamulRenk": "1068 - Siyah", "mamulBeden": "40", "proses": "Kesim", "renk": "Siyah", "beden": "40", "miktar": 1, "birim": "çift"}]'::jsonb)`,
  `insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif) values ('vry-dnm-urun', 'dnm-urun', 'k-1068', 'b-40', 0, true)`,
  `insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
     values ('dnm-10001', '10001', '10001', 'dnm-urun', 'Kesim', '{}'::jsonb, '1068 - Siyah', 2, 'DENEME ÜRÜN', '[{"beden": "40", "miktar": 2}]'::jsonb,
     '[{"proses": "Kesim", "sira": 1, "verildiMi": false, "tamamlandiMi": false}]'::jsonb, now())`,
];

// ── SUNUCU ÖLÇÜMÜ. `olc`: hazır sorgu (son satır + BAK satırları) + ayrıntı satırı. Döner: { genel, ayr, defter }.
const AYRINTI = `select
  (select coalesce(sum(miktar), 0)::float from public.stk_stok where urun_id = 'dnm-urun') as su,
  (select coalesce(sum(miktar), 0)::float from public.stk_stok where urun_id = 'dnm-ham') as sh,
  (select coalesce(string_agg(f.id || (case when f.iptal then ':İPTAL' else ':GEÇERLİ' end) || ':' ||
      (select count(*) from public.stk_hareket h where h.fis_id = f.id) || ' satır(' || (select count(*) from public.stk_hareket h where h.fis_id = f.id and h.iptal) || ' iptal)', ', ' order by f.id), 'fiş yok')
     from public.stk_fis f where f.id like 'ÜRT-%') as fis,
  (select count(*)::int from public.stk_fis) as fis_n, (select count(*)::int from public.stk_hareket) as har_n, (select count(*)::int from public.car_hareket) as car_n,
  (select count(*)::int from public.car_hareket c left join public.stk_fis s on s.id = c.fis_id where c.cari_id = 'dnm-usta' and not c.iptal and not coalesce(s.iptal, false)) as usta_gecerli,
  (select coalesce(string_agg(u.id || ' aşama=' || coalesce(u.asama, '—') || ' stoğaEklendi=' || u.stoga_eklendi_mi || ' tahakkuk=' ||
      (case when jsonb_typeof(u.ek -> 'bolumTahakkuklari') = 'array' then jsonb_array_length(u.ek -> 'bolumTahakkuklari') else 0 end) || ' adımlar=' ||
      (select coalesce(string_agg((p ->> 'proses') || ':verildi=' || coalesce(p ->> 'verildiMi', 'false') || ':tamam=' || coalesce(p ->> 'tamamlandiMi', 'false'), ';'), '') from jsonb_array_elements(u.proses_ilerleme) p), ' | '), 'ÜRETİM SATIRI YOK')
     from public.uretim u where u.id = 'dnm-10001') as uretim,
  (select coalesce(string_agg(a.proses || ':' || a.miktar::float || ':' || coalesce((select unvan from public.cariler c where c.id = a.personel_id), '-') || ':' ||
      (case when a.tamamlandi_mi then 'TESLİM' when a.verildi_mi then 'bekliyor' else 'verilmedi' end), ', ' order by a.id), 'atama yok') from public.uretim_atamalari a where a.uretim_id = 'dnm-10001') as atama,
  (select coalesce(string_agg(c.tur || ':"' || c.baslik || '"', ', ' order by c.olusturma), 'boş') from public.cop c) as cop,
  (select count(*)::int from public.uretim_silinen) as silinen_iz,
  (select count(*)::int from public.stok_rezervasyonlari) as rez,
  (select string_agg(ad || '=' || (case when coalesce(pasif, false) then 'pasif' else 'aktif' end), ', ' order by ad) from public.urunler where id in ('dnm-urun', 'dnm-ham'))
    || ', ' || (select unvan || '=' || (case when coalesce(pasif, false) then 'pasif' else 'aktif' end) from public.cariler where id = 'dnm-usta') as pasif`;
// DEFTER ÖZETİ: fiş, stok hareketi, cari hareketi, stok bakiyesi tablolarının BÜTÜN satırları — bir adım bunlara dokunduysa değişir.
const DEFTER = `select string_agg(t || '=' || n || ':' || left(m, 8), ' ' order by t) s from (
  select 'stk_fis' t, count(*) n, md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) m from public.stk_fis x
  union all select 'stk_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_hareket x
  union all select 'car_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.car_hareket x
  union all select 'stk_stok', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_stok x) z`;
async function olc(c, etiket) {
  const r = await c.k.sorgu(OLCUM_SQL);
  const genel = r.find((x) => Number(x.sira) === 99).durum;
  const bak = r.filter((x) => x.sonuc === "BAK").map((x) => `${x.sira}) ${x.kontrol} → ${x.durum}`);
  const a = (await c.k.sorgu(AYRINTI))[0];
  const defter = (await c.k.sorgu(DEFTER))[0].s;
  yaz(`  ▸ SUNUCU [${etiket}]`);
  yaz(`      40-sorgu son satır: 99|GENEL|${genel}${bak.length ? "\n      BAK satırları: " + bak.join("\n                     ") : ""}`);
  yaz(`      stok: DENEME ÜRÜN=${a.su} · DENEME HAMMADDE=${a.sh} | ÜRT fişleri: ${a.fis} | DENEME USTA geçerli cari hareketi=${a.usta_gecerli}`);
  yaz(`      üretim: ${a.uretim} | atamalar: ${a.atama}`);
  yaz(`      cop: ${a.cop} | uretim_silinen izi=${a.silinen_iz} | stok_rezervasyonlari=${a.rez} | kartlar: ${a.pasif}`);
  yaz(`      tablo satır sayıları: stk_fis=${a.fis_n} stk_hareket=${a.har_n} car_hareket=${a.car_n} | defter özeti: ${defter}`);
  return { genel, ayr: a, defter, bak };
}

// ── EKRAN YARDIMCILARI
const bekle = (s, ms) => s.waitForTimeout(ms);
// sayfa metni: üst menü ve alt sekme şeridi atılır (her ekranda aynı; kanıt satırını kalabalıklaştırır)
const govde = async (s, n = 900) => kisa(String(await s.evaluate(() => document.body.innerText)).replace(/\s+/g, " ")
  .replace(/^.*?Finans \? /, "").replace(/ Anasayfa( (Üretim Raporu|Üretim|Planlama|Ürün Stok|Stok|Cari|Tanımlar|Depo|Fişler|Ürün: DENEME ÜRÜN|Ürün: DENEME HAMMADDE|Ürün: Ekran Bot))* Kur girilmedi.*$/, ""), n);
const dugmeler = (s) => s.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent)
  .map((b) => (b.innerText || b.title || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()).filter(Boolean));
const toplayiciKur = (s) => s.evaluate(() => { window.__dnmBildirim = [];
  const tara = () => document.querySelectorAll("[data-toast]").forEach((x) => { const t = (x.innerText || "").replace(/\s+/g, " ").trim(); if (t && !window.__dnmBildirim.includes(t)) window.__dnmBildirim.push(t); });
  new MutationObserver(tara).observe(document.body, { childList: true, subtree: true, characterData: true }); tara(); });
// adım boyunca çıkan bildirimler (birkaç saniyede kaybolurlar; toplayıcı biriktirir)
const bildirimAl = async (s) => { const b = await s.evaluate(() => { const x = window.__dnmBildirim || []; window.__dnmBildirim = []; return x; }).catch(() => []); return b.length ? b.map((x) => kisa(x, 260)).join(" ‖ ") : "(bildirim yok)"; };
async function ac(db) {
  const c = await YAYIN.ekranAc(db); c.pencereler = [];
  c.sayfa.on("dialog", async (d) => { c.pencereler.push(`${d.type()}: ${kisa(d.message(), 200)}`); try { await d.accept(); } catch (e) { /* kapanmış */ } });
  await toplayiciKur(c.sayfa); c.gunlukBasi = c.k.gunluk.length; return c;
}
const yenile = async (c) => { await YAYIN.yenile(c); await toplayiciKur(c.sayfa); };
const kapat = async (c) => { await c.tarayici.close(); await c.k.kapat(); };
// adım boyunca uygulamanın gönderdiği YAZMA istekleri (GET / HEAD / OPTIONS dışı): yöntem yol → durum
const yazmalar = (c) => { const y = c.k.gunluk.slice(c.gunlukBasi).filter((g) => g.m && !["GET", "HEAD", "OPTIONS"].includes(g.m)); c.gunlukBasi = c.k.gunluk.length;
  const say = new Map(); y.forEach((g) => { const a = `${g.m} ${String(g.yol).split("?")[0]} → ${g.durum}${g.kod ? " " + g.kod : ""}`; say.set(a, (say.get(a) || 0) + 1); });
  return [...say].map(([a, n]) => (n > 1 ? `${a} ×${n}` : a)).join(" · ") || "(yazma isteği yok)"; };
const stokKartiKapat = async (s) => { const b = s.locator('button:has-text("Kapat"):visible'); if (await b.count()) { await b.first().click(); await bekle(s, 500); } };
const uretimAc = async (s) => { await stokKartiKapat(s); await O.modulAc(s, "Üretim"); await bekle(s, 1000); };
const kartVar = (s) => s.locator('[data-uretim-kart-serit="10001"]').count();
// üretim kartını AÇ (kapalıysa şeride dokun)
const kartAc = async (s) => { await uretimAc(s); if (!(await kartVar(s))) return false;
  if (!(await s.locator('button:has-text("Hammadde İhtiyacı"):visible').count())) { await s.locator('[data-uretim-kart-serit="10001"]').click(); await bekle(s, 1200); } return true; };
// sağ tık: menü metni = sağ tıktan SONRA sayfaya eklenen metin (menü başlığından itibaren)
const sagTik = async (s, loc, baslik) => { await loc.click({ button: "right" }); await bekle(s, 700);
  const t = String(await s.evaluate(() => document.body.innerText)).replace(/\s+/g, " "); const i = t.lastIndexOf(baslik); return i < 0 ? null : kisa(t.slice(i), 300); };

// ── EKRAN ÖLÇÜMÜ: kullanıcının canlıda bakacağı yerler
async function ekranOlc(c, etiket) {
  const s = c.sayfa; yaz(`  ▸ EKRAN [${etiket}]`);
  await uretimAc(s);
  yaz(`      Üretim › Üretim Takibi: ${await govde(s, 700)}`);
  if (await kartAc(s)) { await s.locator('button:has-text("Hammadde İhtiyacı"):visible').first().click(); await bekle(s, 800);
    const t = await govde(s, 900); yaz(`      üretim kartı › "Hammadde İhtiyacı" sekmesi: ${kisa(t.replace(/^.*?Prosesler Hammadde İhtiyacı /, "").replace(/ Bu görünümdeki toplam.*$/, ""), 300)}`);
    await s.locator('button:has-text("Prosesler"):visible').first().click(); await bekle(s, 400);
    yaz(`      üretim kartı › "Prosesler" sekmesi: ${kisa((await govde(s, 900)).replace(/^.*?Prosesler Hammadde İhtiyacı /, "").replace(/ Bu görünümdeki toplam.*$/, ""), 260)}`);
  } else yaz(`      üretim kartı: 10001 Üretim Takibi listesinde YOK`);
  await O.modulAc(s, "Üretim Raporu"); await bekle(s, 1200);
  yaz(`      Üretim Raporu: ${kisa((await govde(s, 600)).replace(/ Dönemde biten.*$/, ""), 260)}`);
  await O.modulAc(s, "Depo"); await bekle(s, 1200);
  const depo = await s.evaluate(() => [...document.querySelectorAll("tr")].map((x) => x.innerText.replace(/\s+/g, " ").trim()).filter((t) => /DENEME/.test(t) && t.length < 260));
  yaz(`      Depo › Hammadde Deposu (DENEME satırları; sütunlar STOK AYRILAN SERBEST TALEP İHTİYAÇ): ${depo.length ? depo.join(" ‖ ") : "(DENEME satırı yok) " + kisa((await govde(s, 300)), 200)}`);
  await O.modulAc(s, "Planlama"); await bekle(s, 900);
  const hi = s.locator('button:has-text("Hammadde İhtiyaç"):visible'); if (await hi.count()) { await hi.first().click(); await bekle(s, 1000); }
  yaz(`      Planlama › Hammadde İhtiyaç: ${kisa((await govde(s, 600)).replace(/^.*?Hammadde İhtiyaç /, ""), 260)}`);
  await O.modulAc(s, "Fişler"); await bekle(s, 1200);
  yaz(`      Fişler: ${kisa((await govde(s, 600)), 300)}`);
}

// ── ADIMLAR (ekrandan)
const ISI_GERI = 'button[title^="Yanlış personele/miktarla verildiyse"]';   // atama satırındaki, fiş iptali OLMAYAN "Geri Al"
async function isiGeriAl(c) {
  const s = c.sayfa; await kartAc(s);
  const n = await s.locator(ISI_GERI + ":visible").count();
  if (!n) { yaz(`  ✗ işi vermeyi "Geri Al" düğmesi ekranda yok: ${await govde(s, 400)}`); kalan += 1; return false; }
  const ipucu = await s.locator(ISI_GERI + ":visible").first().getAttribute("title");
  const satir = await s.locator(ISI_GERI + ":visible").first().evaluate((b) => b.parentElement.parentElement.innerText.replace(/\s+/g, " ").trim());
  await s.locator(ISI_GERI + ":visible").first().click(); await bekle(s, 3500);
  yaz(`  ● üretim 10001 kartı › Prosesler › atama satırı «${kisa(satir, 120)}» › "Geri Al" (ipucu: "${ipucu}") → bildirim: ${await bildirimAl(s)}`);
  yaz(`      yazma istekleri: ${yazmalar(c)}`);
  return true;
}
async function uretimiSil(c) {
  const s = c.sayfa; await uretimAc(s);
  const menu = await sagTik(s, s.locator('[data-uretim-kart-serit="10001"]'), "ÜRETİM · 10001");
  await s.getByText("Üretimi sil", { exact: true }).first().click(); await bekle(s, 800);
  const onay = s.locator('button:has-text("Evet, Sil"):visible');
  const onayMetni = await s.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /Evet, Sil/.test(x.innerText)); return b ? b.parentElement.parentElement.innerText.replace(/\s+/g, " ").trim() : ""; });
  yaz(`  ● üretim şeridine sağ tık (menü: ${menu}) → "Üretimi sil" → onay kutusu: «${kisa(onayMetni, 330)}»`);
  if (!(await onay.count())) { yaz("  ✗ silme onay düğmesi çıkmadı"); kalan += 1; return menu; }
  await onay.first().click(); await bekle(s, 4500);
  yaz(`      → bildirim: ${await bildirimAl(s)}`);
  yaz(`      yazma istekleri: ${yazmalar(c)}`);
  return menu;
}
// ürün kartı: Depo › Ürün Stok (mamul) / Stok (hammadde) listesinde satıra dokun → kart açılır → şeride sağ tık → "Pasife al"
async function urunPasif(c, modul, ad) {
  const s = c.sayfa; await stokKartiKapat(s); await O.modulAc(s, modul); await bekle(s, 1200);
  const satir = s.getByText(ad, { exact: true });
  if (!(await satir.count())) { yaz(`  ✗ ${modul} listesinde "${ad}" yok: ${await govde(s, 300)}`); kalan += 1; return; }
  await satir.first().click(); await bekle(s, 1200);
  const kartDugme = (await dugmeler(s)).filter((x) => /pasif|sil/i.test(x) && !/sekmesini/.test(x));
  const menu = await sagTik(s, s.locator(`[data-urun-kart-serit="${ad}"]`).first(), `ÜRÜN · ${ad}`);
  const og = s.getByText("Pasife al", { exact: true });
  if (!(await og.count())) { yaz(`  ✗ "${ad}" sağ tık menüsünde "Pasife al" yok: ${await govde(s, 400)}`); kalan += 1; return; }
  await og.first().click(); await bekle(s, 3000);
  yaz(`  ● ${modul} › "${ad}" satırına dokun (STOK KARTI açılır; kartta görünen pasif/sil düğmesi: ${JSON.stringify(kartDugme)}) › mor şeride sağ tık (menü: ${menu}) › "Pasife al"`);
  yaz(`      → bildirim: ${await bildirimAl(s)} · yazma istekleri: ${yazmalar(c)}`);
  await stokKartiKapat(s);
  yaz(`      ${modul} listesi şimdi: ${kisa(await govde(s, 500), 300)}`);
}
async function cariPasif(c, unvan) {
  const s = c.sayfa; await stokKartiKapat(s); await O.modulAc(s, "Cari"); await bekle(s, 1200);
  const serit = s.locator(`[data-cari-kart-serit="${unvan}"]`);
  if (!(await serit.count())) { yaz(`  ✗ Cari listesinde "${unvan}" yok: ${await govde(s, 300)}`); kalan += 1; return; }
  const menu = await sagTik(s, serit.first(), `CARİ · ${unvan}`);
  await s.getByText("Pasife al", { exact: true }).first().click(); await bekle(s, 3000);
  yaz(`  ● Cari › "${unvan}" satırına sağ tık (menü: ${menu}) › "Pasife al"`);
  yaz(`      → bildirim: ${await bildirimAl(s)} · yazma istekleri: ${yazmalar(c)}`);
  yaz(`      Cari listesi şimdi: ${kisa(await govde(s, 500), 300)}`);
}
async function ucKartiPasifeAl(c) {
  await urunPasif(c, "Ürün Stok", "DENEME ÜRÜN");
  await urunPasif(c, "Stok", "DENEME HAMMADDE");
  await cariPasif(c, "DENEME USTA");
}
// seçim kutuları: yeni üretim (mamul listesi), reçete (hammadde arama), iş verme (personel listesi — üretim duruyorsa)
async function secimKutulari(c, etiket) {
  const s = c.sayfa; yaz(`  ▸ SEÇİM KUTULARI [${etiket}]`);
  await uretimAc(s);
  await s.locator('button:has-text("Yeni Üretim Siparişi"):visible').first().click(); await bekle(s, 1000);
  const mamuller = await s.evaluate(() => { const x = [...document.querySelectorAll("select")].find((q) => q.offsetParent && [...q.options].some((o) => /Seçin/.test(o.text))); return x ? [...x.options].map((o) => o.text) : null; });
  yaz(`      Üretim › "Yeni Üretim Siparişi" › Ürün (Mamul) listesi: ${JSON.stringify(mamuller)}`);
  k_(`${etiket}: pasif DENEME ÜRÜN yeni üretimde SEÇİLEMİYOR`, [Array.isArray(mamuller), (mamuller || []).includes("DENEME ÜRÜN")], [true, false]);
  const vz = s.locator('button:has-text("Vazgeç"):visible'); if (await vz.count()) { await vz.first().click(); await bekle(s, 400); }
  if (await kartAc(s)) {
    const per = await s.evaluate(() => { const x = [...document.querySelectorAll("select")].find((q) => q.offsetParent && [...q.options].some((o) => /Personel seçin/.test(o.text))); return x ? [...x.options].map((o) => o.text) : null; });
    yaz(`      üretim 10001 kartı › "Kime" (iş verme) listesi: ${JSON.stringify(per)}${per ? "" : " (iş verme kutusu ekranda yok)"}`);
    if (per && !k_(`${etiket}: pasif DENEME USTA iş vermede SEÇİLEMİYOR`, per.includes("DENEME USTA"), false))
      bulgu(`${etiket}: pasife alınan DENEME USTA, üretim kartındaki "Kime" (iş verme) listesinde HÂLÂ ÇIKIYOR — pasif cari iş vermede seçilebiliyor (pasif bildirimi "yeni işlemlerde seçilemez" diyor). Açık üretim kalırsa iş yeniden bu ustaya verilebilir.`);
  } else yaz(`      iş verme listesi: üretim 10001 yok — bakılamadı (başka açık üretim de yok)`);
  await O.modulAc(s, "Ürün Stok"); await bekle(s, 1000);
  await s.getByText("Ekran Bot", { exact: true }).first().click(); await bekle(s, 1000);
  await s.locator('button:has-text("Reçete"):visible').first().click(); await bekle(s, 800);
  const ara = s.locator('input[placeholder^="Hammadde ara"]:visible');
  if (await ara.count()) { await ara.first().click(); await bekle(s, 500);
    const bos = await s.evaluate(() => (document.querySelector("[data-urun-karti]") || document.body).innerText.includes("DENEME HAMMADDE"));
    await ara.first().fill("DENEME"); await bekle(s, 800);
    const dolu = await s.evaluate(() => (document.querySelector("[data-urun-karti]") || document.body).innerText.includes("DENEME HAMMADDE"));
    const cevre = await s.evaluate(() => { const g = [...document.querySelectorAll("input")].find((x) => x.offsetParent && /^Hammadde ara/.test(x.placeholder)); let k = g; for (let i = 0; i < 3 && k.parentElement; i++) k = k.parentElement; return k.innerText.replace(/\s+/g, " ").trim().slice(0, 200); });
    yaz(`      Ürün Stok › Ekran Bot › Reçete › "Hammadde ara…": kutuya dokununca "DENEME HAMMADDE" ${bos ? "VAR" : "yok"}; "DENEME" yazınca ${dolu ? "VAR" : "yok"} · kutunun çevresi: «${cevre}»`);
    k_(`${etiket}: pasif DENEME HAMMADDE reçete hammadde aramasında ÇIKMIYOR`, [bos, dolu], [false, false]);
    await ara.first().fill("");
  } else yaz(`      reçete hammadde arama kutusu bulunamadı: ${await govde(s, 300)}`);
  await stokKartiKapat(s);
}

// ── KURULUM: canlıdaki durum (fikstür + ekran) → dt_dnm_taban
async function kurulum() {
  yaz("■ KURULUM — canlıdaki durumun yerelde kuruluşu");
  await kopya(TABAN, "inc_ekran_taban");
  const cikti = execFileSync("psql", ["-X", "-q", "-A", "-t", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-d", TABAN, "-f", B4_SQL], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n");
  yaz(`  sunucu: inc_ekran_taban kopyası + 27-b4-uygula.sql → ${cikti[cikti.length - 1].trim()}`);
  const pg = new Client({ host: process.env.PGHOST || "localhost", database: TABAN, user: process.env.PGUSER || "postgres" }); await pg.connect();
  for (const q of FIKSTUR) await pg.query(q);
  const pk = (await pg.query(`select (select count(*) from pg_proc where proname like 'b4\\_%')::int b4, (select count(*) from pg_trigger where tgname in ('b3a_yazma_koru', 'b3a2_alan_koru'))::int yetki,
    (select count(*) from pg_proc where proname like 'g25%')::int g25, (select count(*) from pg_proc where proname = 'uretim_sil')::int usil, (select fis_aktif from public.stk_ayar) fa`)).rows[0];
  await pg.end();
  yaz(`  paketler: B4 işlevi ${pk.b4} · yetki paketi tetikleyicisi ${pk.yetki} (0 = YOK) · G-25 nesnesi ${pk.g25} · sunucuda uretim_sil ${pk.usil ? "VAR" : "YOK"} · stk_ayar.fis_aktif=${pk.fa}`);
  yaz("  fikstür (SQL): KESİMHANE bölümü (Kesim), 1068 - Siyah, DENEME ÜRÜN (+reçete, Kesim 1 ₺), DENEME HAMMADDE, DENEME USTA, üretim 10001 (2 çift, iş verilmemiş)");
  const c = await ac(TABAN); const s = c.sayfa;
  yaz(`  istemci: ${path.basename(process.env.YAYIN_HTML)} · sha256 ${process.env.YAYIN_SHA} · kullanıcı Ali (Yönetici)`);
  // reçete onayı (ekrandan)
  await O.modulAc(s, "Ürün Stok"); await bekle(s, 1200); await s.getByText("DENEME ÜRÜN", { exact: true }).first().click(); await bekle(s, 1000);
  await s.locator('button:has-text("Reçete"):visible').first().click(); await bekle(s, 800);
  const onayD = s.locator('button:has-text("Reçeteyi onayla"):visible');
  const onayDurum = (await onayD.count()) ? ((await onayD.first().isEnabled()) ? "etkin" : "PASİF (basılamıyor)") : "düğme yok";
  if (onayDurum === "etkin") { await onayD.first().click(); await bekle(s, 2500); }
  const onay = (await c.k.sorgu(`select ek -> 'receteOnay' ->> 'onaylayan' o from public.urunler where id = 'dnm-urun'`))[0].o;
  yaz(`  ● ekran: Ürün Stok › DENEME ÜRÜN › Reçete › "Reçeteyi onayla" (${onayDurum}) → bildirim: ${await bildirimAl(s)} · sunucuda receteOnay.onaylayan=${JSON.stringify(onay)}`);
  if (!onay) { const neden = kisa((await govde(s, 2500)).replace(/^.*?Şablon \/ kopyala /, "").replace(/ Yeni Reçete Satırı Ekle.*$/, ""), 260);
    bulgu(`Reçete ekrandan onaylanamadı (ekranda: «${neden}») — yerel durum canlıdan YALNIZ bu noktada ayrılıyor (canlıda reçete onaylı). Üretim fikstürle açıldığı için sonraki adımlar etkilenmez.`); }
  await stokKartiKapat(s);
  // işi ver (ekrandan)
  await kartAc(s);
  await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption("dnm-usta");
  await bekle(s, 300); await s.locator('button:has-text("İşi Ver"):visible').last().click(); await bekle(s, 3500);
  yaz(`  ● ekran: üretim 10001 › "İşi Ver" (DENEME USTA) → bildirim: ${await bildirimAl(s)}`);
  // 2 × teslim al + geri al (ekrandan) — her teslimden sonra işçiliğin NEREYE yazıldığı ölçülür (bölüm tahakkuku, cari değil)
  for (let i = 1; i <= 2; i++) {
    await yenile(c); await kartAc(s);
    const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
    await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("2"); await bekle(s, 300);
    await s.locator("[data-teslim-al]:visible").first().click(); await bekle(s, 3500);
    const a = (await c.k.sorgu(AYRINTI))[0];
    yaz(`  ● ekran: ${i}. "Teslim Al" (sağlam 2) → bildirim: ${await bildirimAl(s)}`);
    yaz(`      teslim sonrası: stok ÜRÜN=${a.su} HAMMADDE=${a.sh} · ${a.uretim} · DENEME USTA geçerli cari hareketi=${a.usta_gecerli} (işçilik bölüm tahakkukunda)`);
    await yenile(c); await kartAc(s);
    const detay = s.getByText("detay / geri al"); if (await detay.count()) { await detay.last().click(); await bekle(s, 900); }
    await s.locator('button:has-text("Geri Al"):visible').first().click(); await bekle(s, 3500);
    yaz(`  ● ekran: ${i}. teslimi "Geri Al" → bildirim: ${await bildirimAl(s)}`);
  }
  const o = await olc(c, "BAŞLANGIÇ = canlıdaki durum");
  k_("başlangıç: 40-sorgu TEMİZ", o.genel, "TEMİZ — geçerli deneme kaydı kalmadı");
  k_("başlangıç: stoklar 0, 2 iptal ÜRT fişi, geçerli 0", [o.ayr.su, o.ayr.sh, (o.ayr.fis.match(/İPTAL/g) || []).length, (o.ayr.fis.match(/GEÇERLİ/g) || []).length], [0, 0, 2, 0]);
  k_("başlangıç: atama Kesim 2 adet DENEME USTA'da bekliyor", o.ayr.atama, "Kesim:2:DENEME USTA:bekliyor");
  k_("başlangıç: üç kart aktif", o.ayr.pasif, "DENEME HAMMADDE=aktif, DENEME ÜRÜN=aktif, DENEME USTA=aktif");
  await yenile(c);
  await ekranOlc(c, "BAŞLANGIÇ (sayfa yenilendi)");
  k_("kurulumda sayfa hatası yok", c.hatalar, []);
  await kapat(c);
}

// ── SORU 1: üretimi SİLMEDEN iptal etmenin yolu var mı — ekranda ne varsa yazılır
async function soru1(c) {
  const s = c.sayfa; yaz("  ▸ SORU 1 — ekranda üretimi SİLMEDEN iptal / kapatma / durdurma var mı");
  const genel = /sekmesini kapat|Kuru elle|TCMB|^Atölye ERP$|^Anasayfa$|^Depo$|^Üretim$|^Planlama$|^Siparişler$|^Finans$|^Sohbet$|kılavuzu|^Günlük$|Onay Bekleyenler|Tanımlar \/ Ayarlar|^\?$/;
  await uretimAc(s);
  if (await s.locator('button:has-text("Hammadde İhtiyacı"):visible').count()) { await s.locator('[data-uretim-kart-serit="10001"]').click(); await bekle(s, 600); }   // kart açıksa kapat
  const ust = (await dugmeler(s)).filter((x) => !genel.test(x));
  yaz(`      Üretim Takibi (kart kapalı) görünen düğmeler: ${ust.join(" | ")}`);
  const menu = await sagTik(s, s.locator('[data-uretim-kart-serit="10001"]'), "ÜRETİM · 10001");
  yaz(`      üretim şeridine SAĞ TIK menüsü: ${menu}`);
  await s.keyboard.press("Escape"); await bekle(s, 300);
  if (await s.getByText("Üretimi sil", { exact: true }).count()) { await s.mouse.click(1300, 930); await bekle(s, 300); }
  await kartAc(s);
  const acik = (await dugmeler(s)).filter((x) => !ust.includes(x) && !genel.test(x));
  yaz(`      kart AÇIKKEN eklenen düğmeler (Prosesler sekmesi): ${acik.join(" | ")}`);
  const tum = [...ust, ...acik, menu || ""].join(" | ");
  k_("Soru 1: üretim için İPTAL / askıya al / durdur / sonlandır düğmesi ya da menü öğesi YOK; \"Üretimi sil\" VAR", [/iptal|askı|durdur|sonlandır|üretimi kapat/i.test(tum), /Üretimi sil/.test(tum)], [false, true]);
}

// ── S1 (i): işi geri al → (iptal yok → bırak) → kartları pasife al
async function sira1() {
  yaz("\n■ S1 — SIRA (i): işi vermeyi Geri Al → (iptal yolu varsa iptal, yoksa bırak) → üç kartı Pasife al");
  await kopya("dt_dnm_s1", TABAN); const c = await ac("dt_dnm_s1");
  const o0 = await olc(c, "S1 başlangıç");
  await soru1(c);
  await isiGeriAl(c);
  const o1 = await olc(c, "S1 · işi vermeyi Geri Al sonrası (YOL A)");
  k_("S1/A: defterler (fiş, stok hareketi, cari hareketi, stok) DEĞİŞMEDİ", o1.defter === o0.defter, true);
  k_("S1/A: atama satırı silindi, üretim satırı duruyor (Kesim verilmedi)", [o1.ayr.atama, /Kesim:verildi=false:tamam=false/.test(o1.ayr.uretim)], ["atama yok", true]);
  await yenile(c);
  await ekranOlc(c, "S1 · Geri Al sonrası (sayfa yenilendi)");
  yaz("  ● üretim için ekranda iptal yolu YOK (Soru 1) → üretim 10001 OLDUĞU GİBİ BIRAKILDI (açık, Kesim'de, iş verilmemiş)");
  await ucKartiPasifeAl(c);
  const o2 = await olc(c, "S1 · üç kart pasif (SON)");
  k_("S1: üç kart pasif", o2.ayr.pasif, "DENEME HAMMADDE=pasif, DENEME ÜRÜN=pasif, DENEME USTA=pasif");
  k_("S1: pasife alma defterlere dokunmadı (2 iptal fiş satırlarıyla duruyor)", [o2.defter === o0.defter, o2.ayr.fis === o0.ayr.fis], [true, true]);
  k_("S1: 40-sorgu TEMİZ", o2.genel, "TEMİZ — geçerli deneme kaydı kalmadı");
  await yenile(c);
  await ekranOlc(c, "S1 · SON (sayfa yenilendi)");
  await secimKutulari(c, "S1");
  yaz(`  pencereler: ${JSON.stringify(c.pencereler)} · sayfa hataları: ${JSON.stringify(c.hatalar)}`);
  if (!/ÜRETİM SATIRI YOK/.test(o2.ayr.uretim)) bulgu("S1 sonunda üretim 10001 AÇIK üretim olarak duruyor (Üretim Takibi'nde listeleniyor, Üretim Raporu'nda \"Açık üretim 1\", kartında hammadde ihtiyacı yazıyor) — \"açık iş ve hammadde ihtiyacı kalksın\" isteği bu sırayla KARŞILANMIYOR.");
  await kapat(c);
}

// ── S2 (ii): işi geri al → üretimi sil → kartları pasife al
async function sira2() {
  yaz("\n■ S2 — SIRA (ii): işi vermeyi Geri Al → Üretimi sil → üç kartı Pasife al");
  await kopya("dt_dnm_s2", TABAN); const c = await ac("dt_dnm_s2");
  const o0 = await olc(c, "S2 başlangıç");
  await isiGeriAl(c);
  await olc(c, "S2 · işi vermeyi Geri Al sonrası");
  await yenile(c);
  await uretimiSil(c);
  const o2 = await olc(c, "S2 · Üretimi sil sonrası (YOL B)");
  if (!k_("S2/B: üretim satırı sunucudan SİLİNDİ, çöpte (cop) kopyası var", [o2.ayr.uretim, /uretim:"Üretim 10001"/.test(o2.ayr.cop)], ["ÜRETİM SATIRI YOK", true]))
    bulgu("Yol B: geçerli hareketi olmayan (\"etkisiz\") üretim silinince Çöp Kutusu'na GİTMİYOR — `cop` tablosu boş, Tanımlar › Çöp Kutusu \"boş\" diyor; üretim ve atama satırı sunucudan kalıcı siliniyor (DELETE uretim). Kopya yalnız sunucu arşivinde (silinen_arsiv: uretim + uretim_atamalari) ve `uretim_silinen` izinde kalıyor. Kaynak: 076-uretim-sil.jsx — `copaAt` yalnız hareketli (cascade) dalda çağrılıyor.");
  k_("S2/B: iki iptal ÜRT fişi satırlarıyla DURUYOR; defterler değişmedi (yeni fiş / hareket YOK)", [o2.ayr.fis === o0.ayr.fis, o2.defter === o0.defter], [true, true]);
  k_("S2/B: stoklar 0, DENEME USTA geçerli cari hareketi 0", [o2.ayr.su, o2.ayr.sh, o2.ayr.usta_gecerli], [0, 0, 0]);
  const bag = await c.k.sorgu(`select id, iptal, uretim_id, siparis_no, iptal_sebebi from public.stk_fis where id like 'ÜRT-%' order by id`);
  yaz(`      iptal fişlerin üretim bağı (silmeden sonra): ${bag.map((f) => `${f.id} iptal=${f.iptal} uretim_id=${f.uretim_id} siparis_no=${f.siparis_no} sebep="${f.iptal_sebebi}"`).join(" ‖ ")}`);
  const ars = await c.k.sorgu(`select to_regclass('public.silinen_arsiv') is not null v`);
  if (ars[0].v) { const kol = (await c.k.sorgu(`select string_agg(column_name, ',') k from information_schema.columns where table_schema = 'public' and table_name = 'silinen_arsiv'`))[0].k;
    const n = (await c.k.sorgu(`select count(*)::int n from public.silinen_arsiv`))[0].n; yaz(`      sunucu arşivi (silinen_arsiv; sütunlar ${kol}): ${n} satır`); }
  yaz(`      40-sorgu notu: sorgu deneme fişlerini ÜRETİM SATIRI üzerinden bulur; üretim silinince 4. satır "0 kayıt" (BAK) ve 5. satır "0 / 0" olur — fişler silinmedi, yukarıdaki ÜRT satırı kanıt.`);
  await yenile(c);
  await ekranOlc(c, "S2 · Sil sonrası (sayfa yenilendi)");
  const s = c.sayfa;
  await s.locator('button[title="Tanımlar / Ayarlar"], button[aria-label="Tanımlar / Ayarlar"]').first().click(); await bekle(s, 1200);
  await s.getByText(/^Çöp Kutusu/).first().click(); await bekle(s, 1200);
  yaz(`      Tanımlar › Çöp Kutusu: ${kisa((await govde(s, 2500)).replace(/^.*?sunucu arşivinde saklanır \(aşağıda\)\. /, "").replace(/ Sunucu arşivi.*$/, ""), 400)}`);
  await ucKartiPasifeAl(c);
  const o3 = await olc(c, "S2 · üç kart pasif (SON)");
  k_("S2: üç kart pasif", o3.ayr.pasif, "DENEME HAMMADDE=pasif, DENEME ÜRÜN=pasif, DENEME USTA=pasif");
  k_("S2: pasife alma defterlere dokunmadı", [o3.defter === o0.defter, o3.ayr.fis === o0.ayr.fis], [true, true]);
  await yenile(c);
  await ekranOlc(c, "S2 · SON (sayfa yenilendi)");
  await secimKutulari(c, "S2");
  yaz(`  pencereler: ${JSON.stringify(c.pencereler)} · sayfa hataları: ${JSON.stringify(c.hatalar)}`);
  await kapat(c);
}

// ── S3 (ek): iş ustadayken pasife al → Geri Al yapmadan sil → çöpten geri yükle
async function sira3() {
  yaz("\n■ S3 — EK: iş ustadayken üç kartı Pasife al → Geri Al YAPMADAN Üretimi sil → Çöp Kutusu'ndan Geri yükle");
  await kopya("dt_dnm_s3", TABAN); const c = await ac("dt_dnm_s3"); const s = c.sayfa;
  const o0 = await olc(c, "S3 başlangıç");
  await ucKartiPasifeAl(c);
  const o1 = await olc(c, "S3 · açık üretim + ustada bekleyen iş VARKEN üç kart pasif");
  k_("S3: açık üretimi / ustada işi varken pasife almaya İZİN VERİYOR (uyarı penceresi yok)", [o1.ayr.pasif, c.pencereler], ["DENEME HAMMADDE=pasif, DENEME ÜRÜN=pasif, DENEME USTA=pasif", []]);
  k_("S3: pasife alma üretime, atamaya, defterlere dokunmadı", [o1.ayr.uretim === o0.ayr.uretim, o1.ayr.atama, o1.defter === o0.defter], [true, "Kesim:2:DENEME USTA:bekliyor", true]);
  await yenile(c);
  await ekranOlc(c, "S3 · kartlar pasif, iş hâlâ ustada (sayfa yenilendi)");
  await kartAc(s);
  yaz(`      (pasif kartlarla üretim 10001 kartında "Teslim Al" ${await s.locator("[data-teslim-al]:visible").count() ? "HÂLÂ VAR — pasif usta / pasif ürünle teslim alınabilir görünüyor; DENENMEDİ" : "yok"})`);
  await uretimiSil(c);
  const o2 = await olc(c, "S3 · iş ustadayken (Geri Al yapmadan) Üretimi sil sonrası");
  k_("S3: üretim ve ataması silindi; iptal fişler duruyor; defterler değişmedi", [o2.ayr.uretim, o2.ayr.atama, o2.ayr.fis === o0.ayr.fis, o2.defter === o0.defter], ["ÜRETİM SATIRI YOK", "atama yok", true, true]);
  // geri dönüş: önce Çöp Kutusu, orada yoksa aynı sekmenin altındaki "Sunucu arşivi" (Üretim → İş ataması; uygulamanın kendi düğmeleri)
  await yenile(c);
  await s.locator('button[title="Tanımlar / Ayarlar"], button[aria-label="Tanımlar / Ayarlar"]').first().click(); await bekle(s, 1200);
  await s.getByText(/^Çöp Kutusu/).first().click(); await bekle(s, 1200);
  const gy = s.locator('button:has-text("Geri yükle"):visible');
  yaz(`  ● Tanımlar › Çöp Kutusu: ${kisa((await govde(s, 2500)).replace(/^.*?sunucu arşivinde saklanır \(aşağıda\)\. /, "").replace(/ Sunucu arşivi.*$/, ""), 300)} · "Geri yükle" düğmesi ${await gy.count()} adet`);
  if (!k_("S3: silinen üretim Çöp Kutusu'nda, \"Geri yükle\" düğmesi var", (await gy.count()) > 0, true))
    bulgu("S3: iş ustadayken silinen üretim de Çöp Kutusu'na gitmedi (atama satırıyla birlikte kalıcı silindi). Geri dönüş yalnız Tanımlar › Çöp Kutusu › \"Sunucu arşivi\" üzerinden: önce \"Üretim\", sonra \"İş ataması\" tablosu (aşağıda denendi).");
  if (await gy.count()) { await gy.first().click(); await bekle(s, 4000);
    yaz(`      → "Geri yükle" bildirimi: ${await bildirimAl(s)}`); yaz(`      yazma istekleri: ${yazmalar(c)}`); }
  else {
    for (const [tablo, ad] of [["uretim", "Üretim"], ["uretim_atamalari", "İş ataması"]]) {
      await s.locator('button[title="Tanımlar / Ayarlar"], button[aria-label="Tanımlar / Ayarlar"]').first().click(); await bekle(s, 1200);
      await s.getByText(/^Çöp Kutusu/).first().click(); await bekle(s, 1200);
      const kutu = s.locator("[data-sunucu-arsivi]");
      await kutu.locator("select").first().selectOption(tablo); await bekle(s, 400);
      await kutu.locator("[data-arsiv-yukle]").click(); await bekle(s, 2500);
      const d = kutu.locator("[data-arsiv-geri-yukle]");
      const etiket = (await d.count()) ? kisa(await d.first().innerText(), 60) : "(düğme yok)";
      const engel = (await kutu.locator("[data-arsiv-v2-engel]").count()) ? kisa(await kutu.locator("[data-arsiv-v2-engel]").first().innerText(), 200) : "";
      yaz(`  ● Tanımlar › Çöp Kutusu › Sunucu arşivi › tablo "${ad}" › "Arşivi getir" → düğme: «${etiket}»${engel ? " · engel: " + engel : ""}`);
      if ((await d.count()) && (await d.first().isEnabled())) { await d.first().click(); await bekle(s, 6000);
        yaz(`      → onay penceresi: ${JSON.stringify(c.pencereler.slice(-1))} · yazma istekleri: ${yazmalar(c)}`);
        await yenile(c); }
      else yaz(`      → geri yükleme düğmesine basılamadı: ${kisa((await kutu.innerText()), 300)}`);
    }
  }
  const o3 = await olc(c, "S3 · geri yükleme (Çöp Kutusu yoksa Sunucu arşivi) sonrası");
  k_("S3: silinen üretim GERİ GELDİ (atamasıyla), defterler değişmedi", [o3.ayr.uretim === o0.ayr.uretim, o3.ayr.atama, o3.defter === o0.defter], [true, "Kesim:2:DENEME USTA:bekliyor", true]);
  await yenile(c);
  await ekranOlc(c, "S3 · geri yükleme sonrası (sayfa yenilendi)");
  yaz(`  pencereler: ${JSON.stringify(c.pencereler)} · sayfa hataları: ${JSON.stringify(c.hatalar)}`);
  await kapat(c);
}

(async () => {
  yaz(`ekran-deneme-temizlik · ${new Date().toISOString().slice(0, 10)} · yalnız yerel PostgreSQL (${process.env.PGHOST || "localhost"}) · yayın paketi ${path.basename(process.env.YAYIN_HTML)}`);
  await kurulum();
  if (kos("S1")) await sira1();
  if (kos("S2")) await sira2();
  if (kos("S3")) await sira3();
  yaz("");
  k_("canlı / G-25 deneme projesine giden istek ya da WebSocket YOK", YAYIN.disIstekler, []);
  if (bulgular.length) { yaz("\nBULGULAR"); bulgular.forEach((b, i) => yaz(`  ${i + 1}. ${b}`)); }
  yaz(`\n── ekran-deneme-temizlik: ${gecen} geçti · ${kalan} kaldı · ${bulgular.length} bulgu ──`);
  if (!SECILI) fs.writeFileSync(SONUC, satirlar.join("\n") + "\n");
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); yaz("HATA " + String((x && x.stack) || x).slice(0, 600)); process.exit(2); });
