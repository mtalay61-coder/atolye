#!/usr/bin/env node
// EKRAN SINAMASI — FASON TİPİNİN ADI DEĞİŞTİKTEN SONRA GERÇEK ÜRETİM TESLİMİ (Paket F, 28 Kasım). Kalıcı sınama.
// Fason usta (cari tipi "Fasoncu"), bölüme bağlı proseste (Dikim → Dikimhane) iki ayrı üretimde iş almış durumda.
//   1. İlk üretim EKRANDAN teslim alınır → işçilik ustanın CARİSİNE alacak yazılır (35 ₺ × 10 = 350), bölüm tahakkuku oluşmaz.
//   2. Tanımlar › Firma › Cari Tipleri'nde tipin adı "Fason Atölye" yapılır.
//   3. İkinci üretim EKRANDAN teslim alınır → işçilik YİNE cariye yazılmalı. Eski kodda bölüm tahakkukuna döner (cariye yazılmaz).
//   4. İlk teslimin cari hareketi olduğu gibi durur (geçmiş değişmez).
// İki kip: yerel PostgreSQL (EKRAN_SABLON) ve gerçek API kipi (KOPRU_SUPABASE: yerel Supabase; giriş ekrandan). ISTEMCI_DIZIN = istemci.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const GERCEK = !!process.env.KOPRU_SUPABASE;
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const { ekranAc, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik");
const SABLON = process.env.EKRAN_SABLON || "b12_crlf", DB = "b12_fteslim", F_SUNUCU = process.env.PAKET_F === "1";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const kisa = (s, n = 260) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
const psqlSon = (args) => { const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return c[c.length - 1]; };
(async () => {
  let b;
  if (GERCEK) { execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] }); psqlSon([SB_PG, "-f", path.join(G, "26-b1-uygula.sql")]);
    if (F_SUNUCU) yaz(`  yerel Supabase: Paket F (sunucu) → ${psqlSon([SB_PG, "-f", path.join(G, "54-f-uygula.sql")])}`);
    psqlSon([SB_PG, "-c", "notify pgrst, 'reload schema'"]); b = { connectionString: SB_PG };
  } else { const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
    await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end(); b = { host: "localhost", database: DB, user: "postgres" };
    if (F_SUNUCU) execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", DB, "-f", path.join(G, "54-f-uygula.sql")], { stdio: ["ignore", "ignore", "pipe"], env: process.env }); }
  const c = new Client(b); await c.connect(); await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.cariler (id, unvan, tip, para_birimi, ek) values ('fs-1', 'Fason Usta', 'Personel', 'TRY', '{"altTip":"Fasoncu"}') on conflict (id) do nothing`);
  await c.query(`update public.tanimlar set veri = veri || '{"prosesler":[{"id":"p-dikim","ad":"Dikim","sira":1}],"bolumler":[{"id":"b1","ad":"Dikimhane","prosesler":["Dikim"],"personel":[]}]}'::jsonb where id = 'tekil'`);
  await c.query(`update public.urunler set proses_ucretleri = '{"Dikim": 35}'::jsonb where id = 'ekr-bot'`);
  for (const no of ["FT1", "FT2"]) { const id = `ft-${no.toLowerCase()}`;
    await c.query(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $3::jsonb, '2026-11-28T08:00:00.000Z') on conflict (id) do nothing`,
      [id, no, JSON.stringify([{ proses: "Dikim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "fs-1" }])]);
    await c.query(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
      values ($1, $2, 'Dikim', 'fs-1', '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb) on conflict (id) do nothing`, [`${id}-a`, id]); }
  await c.query("commit"); if (GERCEK) await new Promise((r) => setTimeout(r, 1500));
  const cari = async () => Number((await c.query(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id
    where h.cari_id = 'fs-1' and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`)).rows[0].t);
  const tahakkuk = async (id) => Number((await c.query(`select coalesce(jsonb_array_length(case when jsonb_typeof(ek -> 'bolumTahakkuklari') = 'array' then ek -> 'bolumTahakkuklari' else '[]'::jsonb end), 0) n from public.uretim where id = $1`, [id])).rows[0].n);
  const hareketler = async () => (await c.query(`select id, tutar::float t, yon, coalesce(iptal, false) i from public.car_hareket where cari_id = 'fs-1' order by olusturma, id`)).rows.map((x) => `${x.yon}:${x.t}${x.i ? "(iptal)" : ""}`);

  const a = await ekranAc(GERCEK ? undefined : DB, {}); const s = a.sayfa; s.on("dialog", (d) => d.accept().catch(() => {}));
  yaz(`ekran-fason-teslim · istemci ${surum()} · ${GERCEK ? "GERÇEK API KİPİ (yerel Supabase; giriş ekrandan)" : `PostgreSQL kipi (şablon ${SABLON})`}${F_SUNUCU ? " · Paket F sunucu kuralı KURULU" : ""}`);
  const kartAc = async (no) => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200); };
  const teslim = async (no) => { await kartAc(no);
    const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
    await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10"); await s.waitForTimeout(300);
    await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(5000); };
  const c0 = await cari();
  await teslim("FT1");
  const c1 = await cari(); const h1 = await hareketler();
  yaz(`     1. teslim (tip adı "Fasoncu"): cari bakiye farkı ${c1 - c0} · bölüm tahakkuku ${await tahakkuk("ft-ft1")} · bildirim: ${kisa(await toastlar(s), 120)}`);
  k_("1. teslim: işçilik fason ustanın carisine alacak (−350), bölüm tahakkuku yok", [c1 - c0, await tahakkuk("ft-ft1")], [-350, 0]);
  await s.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await s.waitForTimeout(600);
  await s.locator('[data-tanim-sekme="firma"]').first().click(); await s.waitForTimeout(800);
  const kutu = s.locator('[data-cari-tipi-ad="Fasoncu"]').first(); await kutu.scrollIntoViewIfNeeded(); await kutu.fill("Fason Atölye"); await kutu.press("Enter"); await s.waitForTimeout(8000);
  const tip = (await c.query(`select veri -> 'cariTipleri' t, (select ek from public.cariler where id = 'fs-1') e from public.tanimlar where id = 'tekil'`)).rows[0];
  yaz(`     ad değişikliği: tipler ${JSON.stringify(tip.t)} · cari ${JSON.stringify(tip.e)}`);
  k_("tip adı sunucuda değişti", (tip.t || []).map((x) => x.ad), ["Fason Atölye"]);
  // SÜRÜM KAPISI (isteğe bağlı, MIN_SURUM): yayından sonra bütün cihazlar geçince sunucuda `stk_ayar.min_istemci_surum` yükseltilir —
  // eski istemcinin HİÇBİR yazması kabul edilmez. Burada ikinci teslimden önce ayarlanır (yalnız sınama kopyasında).
  if (process.env.MIN_SURUM) { await c.query(`update public.stk_ayar set min_istemci_surum = $1 where id = 'tekil'`, [process.env.MIN_SURUM]); yaz(`     sürüm kapısı: min_istemci_surum = ${process.env.MIN_SURUM}`); }
  await teslim("FT2");
  const c2 = await cari();
  const fis2 = (await c.query(`select count(*) filter (where not coalesce(iptal, false))::int g from public.stk_fis where uretim_id = 'ft-ft2'`)).rows[0].g;
  const at2 = (await c.query(`select tamamlandi_mi t from public.uretim_atamalari where id = 'ft-ft2-a'`)).rows[0].t;
  yaz(`     2. üretim: geçerli fiş ${fis2} · atama ${at2 ? "teslim alındı" : "bekliyor"}`);
  yaz(`     2. teslim (tip adı "Fason Atölye"): cari bakiye farkı ${c2 - c1} · bölüm tahakkuku ${await tahakkuk("ft-ft2")} · bildirim: ${kisa(await toastlar(s), 120)}`);
  k_("2. teslim (ad değiştikten sonra): işçilik YİNE carisine alacak (−350), bölüm tahakkuku yok", [c2 - c1, await tahakkuk("ft-ft2")], [-350, 0]);
  k_("1. teslimin cari hareketi olduğu gibi (geçmiş değişmedi)", (await hareketler()).slice(0, h1.length), h1);
  const red = (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
  k_("reddedilen yazma yok, sayfa hatası yok", [red, a.hatalar], [[], []]);
  yaz(`SONUÇ: ${gecen} geçti · ${kalan} kaldı`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-fason-teslim${process.env.SONUC_EK || ""}${GERCEK ? "-supabase" : ""}.txt`), satirlar.join("\n") + "\n");
  await a.tarayici.close(); await a.k.kapat(); await c.end(); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
