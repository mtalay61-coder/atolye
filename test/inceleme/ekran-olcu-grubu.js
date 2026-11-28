#!/usr/bin/env node
// PAKET V + Ö — GERÇEK İSTEMCİYLE ÖLÇÜ GRUBU SENARYOLARI (28 Kasım). "40" adı hem Beden hem Boyut grubunda tanımlı (canlıdaki 36–42 gibi).
//   1. Stok girişi (ekrandan): Boyut ölçülü, RENKSİZ hammaddeye (SÜNGER) giriş → miktar MEVCUT Boyut varyantına yazılmalı.
//   2. Tüketim: reçetesi bu hammaddeyi ve ÖLÇÜSÜZ + RENKSİZ bir hammaddeyi (ASTAR) kullanan üretimin teslimi → mevcut varyantlardan düşmeli.
//   3. İptal (ekrandan Geri Al) → başlangıca dönmeli.
//   4. Eşzamanlı iki ilk giriş: hiç varyantı olmayan Boyut ürününde aynı anda iki ilk varyant isteği (gerçek API) + iki cihazdan aynı anda giriş.
//   5. Çelişki: ürünün ölçü tipi Beden, varyantı Boyut kaydında → açık hata, hiçbir şey yazılmaz.
// Her adımda: yeni ikiz varyant açıldı mı, doğru MEVCUT varyant kullanıldı mı.
// Kipler: yerel Supabase (KOPRU_SUPABASE; giriş ekrandan, istekler gerçek API) ve yerel PostgreSQL (EKRAN_SABLON, vars. b12_vo).
// PAKETLER=k | kv | kvo (vars. kvo) — Supabase kipinde hangi paketlerin kurulacağı; PostgreSQL kipinde şablon belirler.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const GERCEK = !!process.env.KOPRU_SUPABASE;
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const { ekranAc, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik");
const SABLON = process.env.EKRAN_SABLON || "b12_vo", DB = "b12_olcu";
const PAKETLER = GERCEK ? (process.env.PAKETLER || "kvo") : (/_vo$/.test(SABLON) ? "kvo" : /_v$/.test(SABLON) ? "kv" : "k");
const TAM = PAKETLER === "kvo";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1; yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const kisa = (s, n = 230) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
const psqlSon = (args) => { const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return c[c.length - 1]; };
(async () => {
  let c;
  if (GERCEK) { execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] });
    for (const d of ["59-v-geri-al.sql", "62-o-geri-al.sql"]) { try { psqlSon([SB_PG, "-f", path.join(G, d)]); } catch (e) { /* kurulu değilse */ } }
    psqlSon([SB_PG, "-f", path.join(G, "26-b1-uygula.sql")]); psqlSon([SB_PG, "-f", path.join(G, "52-k-uygula.sql")]);
    if (/v/.test(PAKETLER)) psqlSon([SB_PG, "-f", path.join(G, "59-v-uygula.sql")]); if (/o/.test(PAKETLER)) psqlSon([SB_PG, "-f", path.join(G, "62-o-uygula.sql")]);
    psqlSon([SB_PG, "-c", "notify pgrst, 'reload schema'"]); c = new Client({ connectionString: SB_PG }); await c.connect();
  } else { const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
    await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end(); c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect(); }
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.stk_olcu (id, ad, tur, aktif) values ('olcu-mwng-40', '40', 'Boyut', true), ('olcu-mwng-41', '41', 'Boyut', true)`);   // b-40 / b-41 [Beden] tohumda var
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{bedenler}', (veri -> 'bedenler') || '[{"id":"olcu-mwng-40","ad":"40","tip":"Boyut"},{"id":"olcu-mwng-41","ad":"41","tip":"Boyut"}]'::jsonb)
     || '{"prosesler":[{"id":"p-dikim","ad":"Dikim","sira":1}]}'::jsonb where id = 'tekil'`);
  await c.query(`insert into public.urunler (id, ad, kategori, malzeme_tipi, olcu_tipi, birim, stok_no) values ('h-sunger', 'SÜNGER', 'Hammadde', 'Sünger', 'Boyut', 'adet', 960), ('h-astar', 'ASTAR', 'Hammadde', 'Deri', 'Beden', 'desi', 961),
     ('h-yaris', 'YARIŞ SÜNGER', 'Hammadde', 'Sünger', 'Boyut', 'adet', 962), ('h-celiski', 'ÇELİŞKİLİ', 'Hammadde', 'Sünger', 'Beden', 'adet', 963)`);
  await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('v-sunger-40', 'h-sunger', null, 'olcu-mwng-40'), ('v-astar', 'h-astar', null, null), ('v-celiski-40', 'h-celiski', null, 'olcu-mwng-40')`);
  await c.query(`insert into public.stk_fis (id, tur, tarih) values ('f-acilis', 'Sayım', now())`);
  for (const [v, u] of [["v-sunger-40", "h-sunger"], ["v-astar", "h-astar"], ["v-celiski-40", "h-celiski"]]) await c.query(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih) values ($1, 'f-acilis', $2, $3, 100, 'Sayım', now())`, [`h-ac-${v}`, v, u]);
  await c.query(`update public.urunler set recete = $1::jsonb where id = 'ekr-bot'`, [JSON.stringify([
    { id: "rc-1", hammaddeUrunId: "h-sunger", hammaddeAd: "SÜNGER", renk: "Standart", beden: "40", mamulRenk: "Siyah", mamulBeden: "40", proses: "Dikim", miktar: 1, birim: "adet" },
    { id: "rc-2", hammaddeUrunId: "h-astar", hammaddeAd: "ASTAR", renk: "Standart", beden: "Standart", mamulRenk: "Siyah", mamulBeden: "40", proses: "Dikim", miktar: 2, birim: "desi" }])]);
  await c.query(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
    values ('og-1', 'OG1', 'OG1', 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $1::jsonb, '2026-11-28T08:00:00.000Z')`, [JSON.stringify([{ proses: "Dikim", sira: 1, verildiMi: true, tamamlandiMi: false }])]);
  await c.query(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
    values ('og-1-a', 'og-1', 'Dikim', null, '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb)`);
  await c.query("commit"); if (GERCEK) await new Promise((r) => setTimeout(r, 1500));
  const HAM = ["h-sunger", "h-astar", "h-yaris", "h-celiski"];
  const vary = async () => Object.fromEntries((await c.query(`select u.ad || ' · ' || coalesce(o.ad || ' [' || o.tur || ']', 'ölçüsüz') || ' · ' || v.id a, coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float m
     from public.stk_varyant v join public.urunler u on u.id = v.urun_id left join public.stk_olcu o on o.id = v.olcu_id left join public.stk_hareket h on h.varyant_id = v.id where v.urun_id = any ($1) group by 1 order by 1`, [HAM])).rows.map((x) => [x.a, x.m]));
  const fark = (o, n) => Object.fromEntries(Object.keys(n).filter((k) => n[k] !== o[k]).map((k) => [k.replace(/ · [^·]*$/, o[k] === undefined ? " · YENİ VARYANT" : ""), n[k] - (o[k] || 0)]));
  const yeniV = (o, n) => Object.keys(n).filter((k) => !(k in o)).map((k) => k.replace(/ · [^·]*$/, ""));
  const fisSay = async () => Number((await c.query(`select count(*) filter (where not coalesce(iptal, false))::int n from public.stk_fis`)).rows[0].n);
  const ac = async () => { const a = await ekranAc(GERCEK ? undefined : DB, {}); a.sayfa.on("dialog", (d) => d.accept().catch(() => {})); return a; };
  const girisHazirla = async (s, urun, beden, miktar) => { await O.modulAc(s, "Stok"); await s.waitForTimeout(800);
    if (!(await s.locator("[data-stok-giris-seridi]").count())) { await s.locator('button[title^="Bağımsız stok girişi"]').first().click(); await s.waitForTimeout(500); }
    await s.locator("[data-stok-giris-urun]").first().selectOption(urun); await s.waitForTimeout(400);
    const n = await s.locator("[data-stok-giris-renk] option").count(); if (n > 1) await s.locator("[data-stok-giris-renk]").first().selectOption({ index: n - 1 }).catch(() => {}); await s.waitForTimeout(300);
    await s.locator(`[data-stok-giris-miktar="${beden}"]`).first().fill(String(miktar)); return s.locator("[data-stok-giris-seridi] .btn-save").first(); };
  yaz(`ekran-olcu-grubu · istemci ${surum()} · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase; giriş ekrandan)" : `PostgreSQL kipi (şablon ${SABLON})`} · paketler: K${/v/.test(PAKETLER) ? " + V" : ""}${/o/.test(PAKETLER) ? " + Ö" : ""}`);
  const a = await ac(); const s = a.sayfa;
  const v0 = await vary(); yaz(`  başlangıç: ${JSON.stringify(Object.fromEntries(Object.entries(v0).map(([k, m]) => [k.replace(/ · [^·]*$/, ""), m])))}`);
  yaz(`\n■ 1 · STOK GİRİŞİ (ekrandan): SÜNGER · 40 → +12   ("40" hem Beden hem Boyut grubunda tanımlı; ürün Boyut, renksiz)`);
  await (await girisHazirla(s, "h-sunger", "40", 12)).click(); await s.waitForTimeout(5000); const v1 = await vary();
  yaz(`  bildirim: ${kisa(await toastlar(s))}`); yaz(`  değişen: ${JSON.stringify(fark(v0, v1))} · yeni varyant: ${JSON.stringify(yeniV(v0, v1))}`);
  if (TAM) k_("giriş MEVCUT Boyut varyantına yazıldı (+12), yeni varyant açılmadı", [fark(v0, v1), yeniV(v0, v1)], [{ "SÜNGER · 40 [Boyut]": 12 }, []]);
  yaz(`\n■ 2 · TÜKETİM (gerçek teslim, 10 çift): SÜNGER 40 ×1, ölçüsüz + renksiz ASTAR ×2`);
  const f1 = await fisSay();
  await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText("OG1", { exact: true }).last().click(); await s.waitForTimeout(1200);
  const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
  await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10"); await s.waitForTimeout(300); await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(5000);
  const v2 = await vary(); yaz(`  bildirim: ${kisa(await toastlar(s))}`); yaz(`  değişen: ${JSON.stringify(fark(v1, v2))} · yeni varyant: ${JSON.stringify(yeniV(v1, v2))}`);
  if (TAM) k_("tüketim mevcut varyantlardan düştü: SÜNGER 40 [Boyut] −10, ölçüsüz ASTAR −20; yeni varyant yok", [fark(v1, v2), yeniV(v1, v2)], [{ "ASTAR · ölçüsüz": -20, "SÜNGER · 40 [Boyut]": -10 }, []]);
  yaz(`\n■ 3 · İPTAL (ekrandan Geri Al)`);
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")', TAMG = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")'; let geri = null;
  for (let t = 0; t < 3 && !geri; t += 1) { if (await s.locator(GERI + ":visible").count()) geri = s.locator(GERI + ":visible"); else if (await s.locator(TAMG + ":visible").count()) geri = s.locator(TAMG + ":visible");
    else { const d = s.getByText("detay / geri al"); if ((await d.count()) && (await d.last().isVisible())) { await d.last().click(); await s.waitForTimeout(900); } else { await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText("OG1", { exact: true }).last().click().catch(() => {}); await s.waitForTimeout(1200); } } }
  if (geri) { await geri.first().click(); await s.waitForTimeout(6000); }
  const v3 = await vary(); yaz(`  Geri Al düğmesi: ${geri ? "bulundu" : "YOK"} · bildirim: ${kisa(await toastlar(s))}`); yaz(`  teslim öncesine göre fark: ${JSON.stringify(fark(v1, v3))}`);
  if (TAM) k_("iptal teslim öncesine döndürdü: hiçbir varyantta fark yok, atama bekliyor, geçerli fiş sayısı aynı", [fark(v1, v3), (await c.query(`select tamamlandi_mi t from public.uretim_atamalari where id = 'og-1-a'`)).rows[0].t, await fisSay()], [{}, false, f1]);
  yaz(`\n■ 4 · EŞZAMANLI İKİ İLK GİRİŞ: YARIŞ SÜNGER (Boyut, hiç varyantı yok)`);
  if (GERCEK) { const U = process.env.KOPRU_SUPABASE, A = process.env.KOPRU_SUPABASE_ANAHTAR;
    const g = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: A, "Content-Type": "application/json" }, body: JSON.stringify({ email: "ali@atolye.local", password: "yerel-sinama" }) })).json();
    const rpc = async (govde) => { const r = await fetch(`${U}/rest/v1/rpc/stk_varyant_ac`, { method: "POST", headers: { apikey: A, Authorization: `Bearer ${g.access_token}`, "Content-Type": "application/json", "x-atolye-surum": surum() }, body: JSON.stringify(govde) }); return `${r.status}${r.status >= 400 ? " " + kisa(await r.text(), 90) : ""}`; };
    const [r1, r2] = await Promise.all([rpc({ p: { urunId: "h-yaris", renk: "Standart", olcu: "40" } }), rpc({ p: { urunId: "h-yaris", renk: "Standart", olcu: "40" } })]);
    yaz(`  gerçek API'den aynı anda iki ilk varyant isteği (adla, "40") → ${r1} · ${r2}`); }
  else await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', false)`).then(() => c.query(`select public.stk_varyant_ac('{"urunId":"h-yaris","renk":"Standart","olcu":"40"}'::jsonb)`)).catch((e) => yaz(`  ilk varyant: ${kisa(e.message)}`)).then(() => c.query(`select set_config('request.jwt.claims', '', false)`));
  const v4 = await vary(); yaz(`  YARIŞ SÜNGER varyantları: ${JSON.stringify(Object.keys(v4).filter((k) => /^YARIŞ/.test(k)).map((k) => k.replace(/ · [^·]*$/, "")))}`);
  if (TAM) k_("iki eşzamanlı ilk istek TEK varyant açtı, o da ürünün grubunda (40 [Boyut])", Object.keys(v4).filter((k) => /^YARIŞ/.test(k)).map((k) => k.replace(/ · [^·]*$/, "")), ["YARIŞ SÜNGER · 40 [Boyut]"]);
  const b = await ac(); await s.reload().catch(() => {}); const a3 = await ac();
  const [d1, d2] = [await girisHazirla(a3.sayfa, "h-yaris", "40", 3).catch(() => null), await girisHazirla(b.sayfa, "h-yaris", "40", 4).catch(() => null)];
  if (d1 && d2) { await Promise.all([d1.click(), d2.click()]); await a3.sayfa.waitForTimeout(7000); }
  const v5 = await vary(); yaz(`  iki cihazdan aynı anda ilk stok girişi (3 ve 4) → değişen: ${JSON.stringify(fark(v4, v5))} · yeni varyant: ${JSON.stringify(yeniV(v4, v5))} · bildirimler: ${kisa(await toastlar(a3.sayfa), 90)} | ${kisa(await toastlar(b.sayfa), 90)}`);
  if (TAM) k_("iki cihazın eşzamanlı ilk girişi aynı tek varyanta yazıldı (toplam 7), ikiz açılmadı", [fark(v4, v5), yeniV(v4, v5)], [{ "YARIŞ SÜNGER · 40 [Boyut]": 7 }, []]);
  yaz(`\n■ 5 · ÇELİŞKİ: ÇELİŞKİLİ ürünün ölçü tipi Beden, varyantı 40 [Boyut] kaydında — ekrandan stok girişi +5`);
  const f5 = await fisSay(); const d5 = await girisHazirla(a3.sayfa, "h-celiski", "40", 5).catch(() => null); if (d5) { await d5.click(); await a3.sayfa.waitForTimeout(5000); }
  const v6 = await vary(); const t5 = kisa(await toastlar(a3.sayfa), 260); yaz(`  bildirim: ${t5}`); yaz(`  değişen: ${JSON.stringify(fark(v5, v6))} · yeni varyant: ${JSON.stringify(yeniV(v5, v6))}`);
  if (TAM) k_("çelişkide açık hata (KR062); hiçbir varyant değişmedi, yeni varyant ve fiş yok", [/KR062/.test(t5), fark(v5, v6), yeniV(v5, v6), await fisSay()], [true, {}, [], f5]);
  const red = [a, b, a3].flatMap((x) => (x.k.gunluk || []).filter((y) => !["GET", "HEAD", "OPTIONS"].includes(y.m) && y.durum >= 400).map((y) => `${y.m} ${y.yol.slice(0, 30)} ${y.durum} ${y.kod || ""}`));
  yaz(`\n  reddedilen yazmalar: ${JSON.stringify(red)} · sayfa hataları: ${JSON.stringify([a, b, a3].flatMap((x) => x.hatalar))}`);
  if (TAM) k_("beklenen tek ret çelişki adımındaki KR062; sayfa hatası yok", [red.filter((x) => !/KR062/.test(x)), [a, b, a3].flatMap((x) => x.hatalar)], [[], []]);
  const ikiz = (await c.query(`select count(*)::int n from (select v.urun_id from public.stk_varyant v left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id group by v.urun_id, coalesce(public.stk_nrm(r.ad), ''), coalesce(public.stk_nrm(o.ad), '') having count(*) > 1) q`)).rows[0].n;
  yaz(`  sınama sonunda aynı üründe aynı adla birden çok varyant: ${ikiz}`); if (TAM) k_("sınama sonunda veritabanında ikiz varyant yok", ikiz, 0);
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı${TAM ? "" : "  (bu kurulum yalnız ölçüm içindir; hedefler K + V + Ö için tanımlı)"}`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-olcu-grubu-${PAKETLER}${GERCEK ? "-supabase" : ""}.txt`), satirlar.join("\n") + "\n");
  for (const x of [a, b, a3]) { await x.tarayici.close().catch(() => {}); await x.k.kapat().catch(() => {}); } await c.end(); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
