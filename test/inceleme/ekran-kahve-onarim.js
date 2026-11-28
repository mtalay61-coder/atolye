#!/usr/bin/env node
// 27181 KAHVE ONARIMI — YEREL SINAMA (28 Kasım). Canlıdaki kimliklerle kurulan kopyada (ürün, renk kayıtları, astar varyantı aynı
// kimliklerle; reçete 114 satır, çelişen satırlar 7 ve 84–88) onarım dosyası çalıştırılır, sonra GERÇEK istemciyle teslim alınır ve
// Geri Al ile iptal edilir. Ölçülen: astarın varyant kimliği / stok / hareket geçmişi korunuyor mu, yeni varyant açılıyor mu, tüketim
// doğru Kahve varyantlarından düşüyor mu, iptal başlangıca döndürüyor mu, geri alma dosyası ilk duruma döndürüyor mu.
// Yalnız yerel PostgreSQL (EKRAN_SABLON: b12_k_crlf = Paket K; b12_v = Paket K + V). ISTEMCI_DIZIN = yayındaki istemcinin ağacı.
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const { ekranAc, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik");
const SABLON = process.env.EKRAN_SABLON || "b12_v", DB = "b12_kahve";
const URUN = "stok-mwnj9g21-nyx6", SIYAH = "renk-mw7p1ue2-b6wc", ETKIN = "renk-mwnqdfdn-lhy8", PASIF = "renk-mvwf90xm-d04e", ASTAR_V = "vry-414c381d2808416ba7aec74c6d77680a";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1; yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const kisa = (s, n = 260) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
const crlf = (ad) => { const g = path.join(os.tmpdir(), `${process.pid}-${ad}`); fs.writeFileSync(g, fs.readFileSync(path.join(G, ad), "utf8").replace(/\r?\n/g, "\r\n")); return g; };
const psql = (dosya) => { try { return execFileSync("psql", ["-X", "-q", "-A", "-t", "-F", " | ", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-h", "localhost", "-d", DB, "-f", dosya], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim(); }
  catch (e) { return "HATA: " + kisa(String(e.stderr || e.message), 300); } };
(async () => {
  const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
  await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
  const c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect(); await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.stk_renk (id, ad, tur, aktif, kod) values ($1, 'Siyah', 'renk', true, '101'), ($2, 'Kahve', 'renk', true, '166'), ($3, 'Kahve', 'renk', false, '103')`, [SIYAH, ETKIN, PASIF]);
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || $1::jsonb) || '{"prosesler":[{"id":"p-dikim","ad":"Dikim","sira":1}]}'::jsonb where id = 'tekil'`,
    [JSON.stringify([{ id: SIYAH, ad: "Siyah", barkodKodu: "13" }, { id: ETKIN, ad: "Kahve", barkodKodu: "78" }])]);
  // Tanımlar'daki eski "Siyah" (r-siyah) bu kopyada adıyla çakışmasın: canlıda tek etkin kullanılan Siyah b6wc
  await c.query(`update public.stk_renk set ad = 'Siyah Eski', aktif = false where id = 'r-siyah'`);
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (select jsonb_agg(x) from jsonb_array_elements(veri -> 'renkler') x where x ->> 'id' <> 'r-siyah')) where id = 'tekil'`);
  await c.query(`insert into public.urunler (id, ad, kategori, malzeme_tipi, olcu_tipi, birim, stok_no) values ('h-astar', 'ASTAR DANA', 'Hammadde', 'Deri', 'Beden', 'desi', 10), ('h-taban', 'LADY BOSS LIGHT TERMO TABAN', 'Hammadde', 'Taban', 'Beden', 'çift', 5)`);
  await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ($1, 'h-astar', $2, 'b-40'), ('v-astar-siyah', 'h-astar', $3, 'b-40'), ('v-taban-kahve', 'h-taban', $4, 'b-40'), ('v-taban-siyah', 'h-taban', $3, 'b-40')`, [ASTAR_V, PASIF, SIYAH, ETKIN]);
  await c.query(`insert into public.stk_fis (id, tur, tarih) values ('f-acilis', 'Sayım', now()), ('f-eski-iptal', 'Sayım', now())`);
  for (const [v, u] of [[ASTAR_V, "h-astar"], ["v-astar-siyah", "h-astar"], ["v-taban-kahve", "h-taban"], ["v-taban-siyah", "h-taban"]])
    await c.query(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih) values ($1, 'f-acilis', $2, $3, 100, 'Sayım', now())`, [`h-ac-${v}`, v, u]);
  await c.query(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih, iptal) values ('h-eski-iptal', 'f-eski-iptal', $1, 'h-astar', 7, 'Sayım', now(), true)`, [ASTAR_V]);   // geçmişte iptal edilmiş hareket de korunmalı
  const recete = []; for (let i = 1; i <= 114; i += 1) {
    if (i === 7) recete.push({ id: `rc-${i}`, hammaddeUrunId: "h-astar", hammaddeAd: "ASTAR DANA", renk: "KAHVE", renkId: SIYAH, beden: "40", mamulRenk: "Siyah", mamulBeden: "40", proses: "Dikim", miktar: 2, birim: "desi" });
    else if (i >= 84 && i <= 88) { const b = String(36 + (i - 84)); recete.push({ id: `rc-${i}`, hammaddeUrunId: "h-taban", hammaddeAd: "LADY BOSS LIGHT TERMO TABAN", renk: "KAHVE", renkId: SIYAH, beden: b, mamulRenk: "Siyah", mamulBeden: b, proses: "Dikim", miktar: 1, birim: "çift" }); }
    else recete.push({ id: `rc-${i}`, hammaddeUrunId: "h-astar", hammaddeAd: "ASTAR DANA", renk: "Siyah", renkId: SIYAH, beden: "40", mamulRenk: "Başka Renk", mamulBeden: "40", proses: "Kesim", miktar: 1, birim: "desi", sira: i }); }
  await c.query(`insert into public.urunler (id, ad, kategori, mamul_tipi, olcu_tipi, birim, stok_no, recete) values ($1, '27181', 'Mamul', 'Ayakkabı', 'Beden', 'çift', 55, $2::jsonb)`, [URUN, JSON.stringify(recete)]);
  await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('v-mamul-40', $1, $2, 'b-40')`, [URUN, SIYAH]);
  await c.query(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
    values ('kh-1', 'KH1', 'KH1', $1, 'Dikim', '{}'::jsonb, 'Siyah', 10, '27181', '[{"beden": "40", "miktar": 10}]'::jsonb, $2::jsonb, '2026-11-28T08:00:00.000Z')`, [URUN, JSON.stringify([{ proses: "Dikim", sira: 1, verildiMi: true, tamamlandiMi: false }])]);
  await c.query(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
    values ('kh-1-a', 'kh-1', 'Dikim', null, '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb)`);
  await c.query("commit");
  const foto = async () => { const r = (await c.query(`select
      (select jsonb_object_agg(v.id, jsonb_build_object('renk_id', v.renk_id, 'olcu', v.olcu_id, 'aktif', v.aktif,
          'gecerli', (select count(*) from public.stk_hareket h where h.varyant_id = v.id and not coalesce(h.iptal, false)), 'iptal', (select count(*) from public.stk_hareket h where h.varyant_id = v.id and coalesce(h.iptal, false)),
          'net', (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float from public.stk_hareket h where h.varyant_id = v.id))) from public.stk_varyant v where v.urun_id in ('h-astar', 'h-taban')) varyant,
      (select md5(recete::text) from public.urunler where id = $1) recete_ozet,
      (select jsonb_agg(jsonb_build_array(t.sira, t.r ->> 'renk', t.r ->> 'renkId') order by t.sira) from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = $1 and t.sira in (7, 84, 85, 86, 87, 88)) alti,
      (select md5(string_agg(t.r::text, '|' order by t.sira)) from public.urunler u, jsonb_array_elements(u.recete) with ordinality t(r, sira) where u.id = $1 and t.sira not in (7, 84, 85, 86, 87, 88)) diger_satirlar,
      (select jsonb_agg(jsonb_build_array(id, ad, aktif) order by id) from public.stk_renk) renkler, (select count(*)::int from public.stk_varyant) varyant_sayisi,
      (select count(*)::int from public.stk_fis where not coalesce(iptal, false)) gecerli_fis, (select tamamlandi_mi from public.uretim_atamalari where id = 'kh-1-a') atama, (select asama from public.uretim where id = 'kh-1') asama`, [URUN])).rows[0]; return r; };
  const net = (f) => Object.fromEntries(Object.entries(f.varyant).map(([id, v]) => [id === ASTAR_V ? "astar-KAHVE(mevcut varyant)" : id.replace("v-", ""), v.net]).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  yaz(`ekran-kahve-onarim · istemci ${surum()} · PostgreSQL kipi (şablon ${SABLON}${/_v$/.test(SABLON) ? " = Paket K + V" : " = Paket K"})`);
  const f0 = await foto();
  yaz(`\n■ 0 · ÖNCE`); yaz(`  altı satır: ${JSON.stringify(f0.alti)}`); yaz(`  astar varyantı ${ASTAR_V}: ${JSON.stringify(f0.varyant[ASTAR_V])}`); yaz(`  stok: ${JSON.stringify(net(f0))}`);
  const onk = psql(path.join(G, "60-canli-kahve-onarim-onkosul-salt-okur.sql")).split("\n").filter((x) => /^D hazır/.test(x)).map((x) => x.split(" | ").slice(1, 4).join(" → ")); yaz(`  önkoşul sorgusu (D): ${JSON.stringify(onk)}`);
  k_("önkoşul sorgusu: altı satır 6, astar varyantı pasif kayıtta 1, ikiz 0", onk.slice(0, 3).map((x) => x.split(" → ").slice(1).join("=")), ["6=6", "1=1", "0=0"]);
  yaz(`\n■ 1 · ONARIM (61-kahve-onarim-uygula.sql, CRLF yapıştırma, iki kez)`);
  const u1 = psql(crlf("61-kahve-onarim-uygula.sql")); const u2 = psql(crlf("61-kahve-onarim-uygula.sql")); yaz(`  ${u1.split("\n").join("\n  ")}`); if (/HATA/.test(u1 + u2)) yaz(`  ikinci: ${u2}`);
  const f1 = await foto();
  k_("altı satır: ad \"Kahve\", kimlik etkin Kahve", f1.alti, [7, 84, 85, 86, 87, 88].map((i) => [i, "Kahve", ETKIN]));
  k_("reçetenin diğer 108 satırı bayt bayt aynı", f1.diger_satirlar, f0.diger_satirlar);
  k_("astar varyantı: KİMLİĞİ, ölçüsü, etkinliği, geçerli + iptal hareket sayısı ve stoku aynı; yalnız renk kaydı bağı değişti",
    [{ ...f1.varyant[ASTAR_V], renk_id: null }, f1.varyant[ASTAR_V].renk_id], [{ ...f0.varyant[ASTAR_V], renk_id: null }, ETKIN]);
  k_("yeni varyant açılmadı, hiçbir renk kaydı silinmedi / değişmedi, diğer varyantlar aynı", [f1.varyant_sayisi, f1.renkler, Object.keys(f1.varyant).filter((k) => k !== ASTAR_V).map((k) => f1.varyant[k])],
    [f0.varyant_sayisi, f0.renkler, Object.keys(f0.varyant).filter((k) => k !== ASTAR_V).map((k) => f0.varyant[k])]);
  k_("ikinci çalıştırma hiçbir şeyi değiştirmedi (hata yok)", /HATA/.test(u2), false);
  yaz(`\n■ 2 · GERÇEK TESLİM (10 çift; reçeteye göre astar 20, taban 10)`);
  const a = await ekranAc(DB, {}); const s = a.sayfa; s.on("dialog", (d) => d.accept().catch(() => {}));
  const kart = async () => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText("KH1", { exact: true }).last().click(); await s.waitForTimeout(1200); };
  await kart(); const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
  await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10"); await s.waitForTimeout(300); await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(5000);
  const f2 = await foto(); yaz(`  bildirim: ${kisa(await toastlar(s), 160)}`); yaz(`  stok: ${JSON.stringify(net(f2))}`);
  k_("tüketim doğru Kahve varyantlarından düştü: astarın MEVCUT varyantı 100→80, tabanın Kahve'si 100→90; Siyah'lar 100", net(f2), { "astar-KAHVE(mevcut varyant)": 80, "astar-siyah": 100, "taban-kahve": 90, "taban-siyah": 100 });
  k_("teslimde yeni varyant açılmadı; atama teslim alındı", [f2.varyant_sayisi, f2.atama], [f0.varyant_sayisi, true]);
  yaz(`\n■ 3 · İPTAL (ekrandan Geri Al)`);
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")', TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")';
  let geri = null;
  for (let t = 0; t < 3 && !geri; t += 1) {
    if (await s.locator(GERI + ":visible").count()) geri = s.locator(GERI + ":visible");
    else if (await s.locator(TAM + ":visible").count()) geri = s.locator(TAM + ":visible");
    else { const detay = s.getByText("detay / geri al"); if ((await detay.count()) && (await detay.last().isVisible())) { await detay.last().click(); await s.waitForTimeout(900); } else await kart().catch(() => {}); }
  }
  yaz(`  Geri Al düğmesi: ${geri ? await geri.count() : 0}`);
  if (geri) { await geri.first().click(); await s.waitForTimeout(6000); }
  const s2 = s, a2 = { k: { gunluk: [] }, hatalar: [] };
  const f3 = await foto(); yaz(`  bildirim: ${kisa(await toastlar(s2), 160)}`); yaz(`  stok: ${JSON.stringify(net(f3))}`);
  k_("iptal başlangıca döndürdü: dört varyant 100, atama bekliyor, geçerli fiş sayısı teslim öncesiyle aynı", [net(f3), f3.atama, f3.gecerli_fis], [net(f1), false, f1.gecerli_fis]);
  k_("iptalden sonra da varyant sayısı ve astar varyantının kimliği / bağı aynı", [f3.varyant_sayisi, f3.varyant[ASTAR_V].renk_id], [f0.varyant_sayisi, ETKIN]);
  const red = [...(a.k.gunluk || []), ...(a2.k.gunluk || [])].filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
  k_("reddedilen yazma ve sayfa hatası yok", [red, a.hatalar, a2.hatalar], [[], [], []]);
  await a.tarayici.close(); await a.k.kapat();
  yaz(`\n■ 4 · GERİ ALMA DOSYASI (61-kahve-onarim-geri-al.sql, CRLF)`);
  const g1 = psql(crlf("61-kahve-onarim-geri-al.sql")); const f4 = await foto(); yaz(`  ${g1.split("\n").slice(0, 3).join("\n  ")}`);
  k_("geri almadan sonra altı satır, reçetenin tamamı ve astar varyantının bağı İLK durumla aynı", [f4.alti, f4.recete_ozet, f4.varyant[ASTAR_V].renk_id], [f0.alti, f0.recete_ozet, PASIF]);
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-kahve-onarim${/_v$/.test(SABLON) ? "-paket-v" : ""}.txt`), satirlar.join("\n") + "\n");
  await c.end(); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
