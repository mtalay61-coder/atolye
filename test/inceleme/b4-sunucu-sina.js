#!/usr/bin/env node
// B4 / B5 SUNUCU SINAMASI (28 Kasım) — gerçek istemci yükleriyle (b4-yukler.json: ekran-uretim-b4.js'te 1.744.37 istemcisinin gönderdiği
// fis_kes yükleri), gerçek kullanıcı yetkisiyle (LOGIN inc_istemci → SET LOCAL ROLE authenticated + JWT; süper kullanıcı değil).
// Her durum şablondan (TABAN, vars. inc_b4s_kur) atılabilir kopyada; şablon değişmez (fonksiyon md5'leri başta / sonda denetlenir).
// "İkinci cihaz" yükü: istek kimliği VE satır / yeni atama kimlikleri yenilenir (iki cihaz farklı kimlik üretir; aynı kimlik birincil
// anahtardan reddedilir, sınama bunu korumanın yerine saymaz).
//   E  EŞZAMANLI: A işlemini açık tutar (fis_kes yaptı, commit yok), B aynı işi teslim etmeye çalışır, sonra A commit → tek fiş, tek
//      stok / işçilik; B'nin hatası KR030 / KR032 (kilit yoksa B A'yı göremez ve geçerdi — bozma kipi bunu gösterir)
//   Y  YANIT KAYBI: A commit; aynı istek yeniden → zatenVar, değişiklik yok; kullanıcı YENİ istekle yeniden → ret, değişiklik yok
//   H  SON ADIMDA HATA: yazılan her tabloda (stk_fis, stk_hareket, car_hareket, uretim_atamalari) AFTER hata → defterler AYNI
//   İ  İPTAL ZİNCİRİ (T1 yükü): teslim F1 → iptal (toplu, atama geri) → yeniden teslim F2 → F1'in BAYAT iptali (toplu ve tekil) → defterler
//      ve atama değişmez; F2'nin iptali yanıt kaybı: ikinci iptal etkisiz; F2 iptalinde son adım hatası → defterler AYNI, F2 geçerli
//   T  TAMİR: tamirli teslim → tamir parçasını iki cihaz eşzamanlı teslim → tek
// BOZMA=ad (yalnız adım adı denetimi kalkar — atama durumu denetimi tek başına tutmalı: YEŞİL kalır) ·
// BOZMA=kilit (b4_teslim_denetle'den FOR UPDATE kalkar) · BOZMA=denetim (b4_teslim_denetle boş) · BOZMA=iptal (bayat iptal koruması kalkar):
// yalnız atılabilir kopyada; beklenen: ilgili denetimler KIRMIZI.
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { Client } = require(process.env.KOPRU_PG || "pg");
const TABAN = process.env.TABAN || "inc_b4s_kur";
const BOZMA = process.env.BOZMA || "";
const YUK = JSON.parse(fs.readFileSync(path.join(__dirname, "b4-yukler.json"), "utf8"));
let gecen = 0, kalan = 0, sayac = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}: ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db], { input: sql, encoding: "utf8" }).trim();
const md5ler = (db) => psql(db, "select string_agg(proname || '=' || md5(pg_get_functiondef(oid)), ' ' order by proname) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('fis_kes','fis_iptal','fis_iptal_toplu','b4_teslim_denetle','b4_iptal_denetle')");

const yeniDb = () => {
  const ad = `b4s_${process.pid}_${++sayac}`;
  psql("postgres", `drop database if exists ${ad}; create database ${ad} template ${TABAN};`);
  if (BOZMA) boz(ad);
  return ad;
};
const sil = (ad) => psql("postgres", `drop database if exists ${ad}`);
function boz(db) {
  const def = (f) => psql(db, `select pg_get_functiondef('${f}'::regprocedure)`);
  const uygula = (metin) => execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db], { input: metin + ";", encoding: "utf8" });
  if (BOZMA === "kilit") uygula(def("public.b4_teslim_denetle(jsonb)").replace(/\n\s*perform 1 from public\.uretim u[^\n]*\n\s*perform 1 from public\.uretim_atamalari a[^\n]*\n/, "\n"));
  if (BOZMA === "ad") uygula(def("public.b4_teslim_denetle(jsonb)").replace("if v_cakisan is not null then", "if false then"));
  if (BOZMA === "denetim") uygula(def("public.b4_teslim_denetle(jsonb)").replace(/\nbegin\n/, "\nbegin\n  return;\n"));
  if (BOZMA === "iptal") {
    uygula(def("public.b4_iptal_denetle(jsonb,text[])").replace(/\nbegin\n/, "\nbegin\n  return;\n"));
    uygula(def("public.fis_iptal(jsonb)").replace("v_zaten := f.iptal and", "v_zaten := false and"));
  }
}
async function istemci(db) {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "inc_istemci" }); await c.connect();
  c.basla = async () => {
    await c.query("begin");
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "authenticated", email: "ali@atolye.local", sub: "00000000-0000-0000-0000-000000000001" })]);
    await c.query("set local role authenticated");
    const kim = (await c.query("select current_user u, session_user s, (select rolsuper from pg_roles where rolname = current_user) su")).rows[0];
    if (kim.u !== "authenticated" || kim.s !== "inc_istemci" || kim.su) throw new Error(`yetki ortamı yanlış: ${JSON.stringify(kim)}`);
  };
  c.rpc = async (ad, p, { acik = false } = {}) => {
    await c.basla();
    try { const r = (await c.query(`select public.${ad}($1::jsonb) r`, [JSON.stringify(p)])).rows[0].r; if (!acik) await c.query("commit"); return r; }
    catch (e) { await c.query("rollback").catch(() => {}); return { hata: e.code, ileti: String(e.message).slice(0, 110) }; }
  };
  return c;
}
async function gozcu(db) { const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "postgres" }); await c.connect(); return c; }
const defter = async (g) => (await g.query(`select string_agg(t || '=' || n || ':' || m, ' ' order by t) s from (
  select 'stk_fis' t, count(*) n, md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) m from public.stk_fis x
  union all select 'stk_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_hareket x
  union all select 'car_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.car_hareket x
  union all select 'uretim_atamalari', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.uretim_atamalari x) z`)).rows[0].s;
const durum = async (g, u) => (await g.query(`select
    (select coalesce(sum(miktar), 0)::float from public.stk_stok where urun_id = 'ekr-bot' and renk_ad = 'Siyah' and olcu_ad = '40') as mamul,
    (select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id
      where h.cari_id in ('fin-usta', 'fin-tamirci') and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)) as isci,
    (select count(*) from public.stk_fis where uretim_id = $1 and not iptal)::int as gecerli,
    (select string_agg(proses || ':' || miktar::float || ':' || case when tamamlandi_mi then 't' else 'b' end, ',' order by miktar desc, id) from public.uretim_atamalari where uretim_id = $1) as atama`, [u])).rows[0];
// İkinci cihazın yükü: yeni istek + yeni satır / yeni atama kimlikleri (kaynak atamaya başvurular aynı kalır)
const ikinci = (p, ek = "B", { atamaYenile = true } = {}) => {
  const y = JSON.parse(JSON.stringify(p));
  y.istek = `${p.istek}-${ek}`;
  for (const t of ["stok", "cari"]) for (const s of ((y[t] || {}).satirlar || [])) s.id = `${s.id}-${ek}`;
  // yeni açılan kalan / tamir parçası her cihazda yeni kimlik alır; sunucuda VAR olan atama (ör. tamir parçasının teslimi) aynı kalır
  if (atamaYenile) for (const a of (((y.alt || {}).uretim_atamalari || {}).satirlar || [])) if (/^atama-/.test(a.id)) a.id = `${a.id}-${ek}`;
  return y;
};
const geriAlYuku = (p, fisNo) => ({ fisler: [fisNo], sebep: "sınama", alt: { uretim_atamalari: { satirlar: p.alt.uretim_atamalari.satirlar.filter((a) => !/^atama-/.test(a.id)).map((a) => ({ ...a, tamamlandi_mi: false })), sil: p.alt.uretim_atamalari.satirlar.filter((a) => /^atama-/.test(a.id)).map((a) => a.id) } } });
const RET = ["KR030", "KR031", "KR032"];

(async () => {
  psql("postgres", `do $$ begin if not exists (select 1 from pg_roles where rolname = 'inc_istemci') then create role inc_istemci login noinherit; end if; end $$; grant authenticated to inc_istemci;`);
  const ilkMd5 = md5ler(TABAN);
  console.log(`b4-sunucu-sina · şablon ${TABAN} · ${BOZMA ? `BOZMA=${BOZMA} (atılabilir kopyalarda)` : "normal"} · B4 kurulu ${/b4_teslim_denetle/.test(ilkMd5) ? "EVET" : "HAYIR"}`);
  const senaryolar = [["T1 tam", "b4-b4t1#1", "b4-b4t1", { mamul: 10, isci: -350 }], ["T3 kısmi 6 + kalan 4", "b4-b4t3#1", "b4-b4t3", { mamul: 6, isci: -210 }],
    ["T7 tamirli (7 + 3 tamir)", "b4-b4t7#1", "b4-b4t7", { mamul: 7, isci: -350 }]];
  for (const [ad, anahtar, u, bek] of senaryolar) {
    const P = YUK[anahtar];
    console.log(`\n■ ${ad}`);
    // E — eşzamanlı (A'nın işlemi açıkken B)
    { const db = yeniDb(); const A = await istemci(db), B = await istemci(db), g = await gozcu(db);
      const ra = await A.rpc("fis_kes", P, { acik: true });
      const sB = B.rpc("fis_kes", ikinci(P));
      await new Promise((r) => setTimeout(r, 1200));
      await A.query("commit");
      const rb = await sB; const d = await durum(g, u);
      k_("E A geçti", !!ra.fisNo, true);
      k_("E B reddedildi (kod)", RET.includes(rb.hata), true);
      k_("E tek fiş, stok / işçilik bir kez", [d.gecerli, d.mamul, d.isci], [1, bek.mamul, bek.isci]);
      if (rb.hata) console.log(`     B: ${rb.hata} ${rb.ileti}`);
      await A.end(); await B.end(); await g.end(); sil(db); }
    // Y — yanıt kaybı
    { const db = yeniDb(); const A = await istemci(db), g = await gozcu(db);
      const r1 = await A.rpc("fis_kes", P); const d1 = await defter(g);
      const r2 = await A.rpc("fis_kes", P);
      k_("Y aynı istek yeniden → zatenVar, aynı fiş, defter aynı", [r2.zatenVar, r2.fisNo === r1.fisNo, (await defter(g)) === d1], [true, true, true]);
      const r3 = await A.rpc("fis_kes", ikinci(P, "Y"));
      k_("Y kullanıcı YENİ istekle yeniden → ret, defter aynı", [RET.includes(r3.hata), (await defter(g)) === d1], [true, true]);
      const d = await durum(g, u); k_("Y tek fiş", [d.gecerli, d.mamul, d.isci], [1, bek.mamul, bek.isci]);
      await A.end(); await g.end(); sil(db); }
    // H — son adımda hata (her tablo)
    for (const t of ["stk_fis", "stk_hareket", "car_hareket", "uretim_atamalari"]) {
      const db = yeniDb(); const A = await istemci(db), g = await gozcu(db);
      psql(db, `create function public.b4_boz() returns trigger language plpgsql as $f$ begin raise exception 'SINAMA hata %', tg_table_name; end $f$;
                create trigger b4_boz after insert or update on public.${t} for each row execute function public.b4_boz();`);
      const d0 = await defter(g); const r = await A.rpc("fis_kes", P);
      k_(`H ${t} son adımda hata → defterler AYNI`, [r.hata, (await defter(g)) === d0], ["P0001", true]);
      await A.end(); await g.end(); sil(db);
    }
  }
  // İ — iptal zinciri (T1)
  { const P = YUK["b4-b4t1#1"], u = "b4-b4t1"; console.log("\n■ İptal zinciri (T1): teslim F1 → iptal → yeniden teslim F2 → F1'in bayat iptali");
    const db = yeniDb(); const A = await istemci(db), B = await istemci(db), g = await gozcu(db);
    const f1 = (await A.rpc("fis_kes", P)).fisNo;
    const i1 = await A.rpc("fis_iptal_toplu", geriAlYuku(P, f1));
    k_("İ F1 iptal, atama bekliyor", [!!i1.fisler, (await durum(g, u)).atama, (await durum(g, u)).gecerli], [true, "Dikim:10:b", 0]);
    const f2 = (await A.rpc("fis_kes", ikinci(P, "F2"))).fisNo;
    const d2 = await defter(g), s2 = await durum(g, u);
    k_("İ F2 geçerli: stok 10, işçilik −350, atama teslim", [s2.gecerli, s2.mamul, s2.isci, s2.atama], [1, 10, -350, "Dikim:10:t"]);
    const b1 = await B.rpc("fis_iptal_toplu", geriAlYuku(P, f1));
    k_("İ bayat B: F1'in toplu iptali → defterler ve atama DEĞİŞMEDİ", [(await defter(g)) === d2, (await durum(g, u)).atama], [true, "Dikim:10:t"]);
    console.log(`     B toplu: ${JSON.stringify(b1).slice(0, 140)}`);
    const b2 = await B.rpc("fis_iptal", { no: f1, sebep: "sınama", alt: geriAlYuku(P, f1).alt });
    k_("İ bayat B: F1'in tekil iptali → defterler ve atama DEĞİŞMEDİ", [(await defter(g)) === d2, (await durum(g, u)).atama, b2.zatenIptal], [true, "Dikim:10:t", true]);
    // F2 iptalinde son adım hatası
    for (const t of ["uretim_atamalari", "car_hareket", "stk_hareket"]) {
      psql(db, `create or replace function public.b4_boz() returns trigger language plpgsql as $f$ begin raise exception 'SINAMA hata %', tg_table_name; end $f$;
                create trigger b4_boz after update on public.${t} for each row execute function public.b4_boz();`);
      const r = await A.rpc("fis_iptal_toplu", geriAlYuku(P, f2));
      k_(`İ F2 iptalinde ${t} hatası → defterler AYNI, F2 geçerli`, [r.hata, (await defter(g)) === d2, (await durum(g, u)).gecerli], ["P0001", true, 1]);
      psql(db, `drop trigger b4_boz on public.${t};`);
    }
    // F2 iptali, yanıt kaybı → ikinci iptal
    await A.rpc("fis_iptal_toplu", geriAlYuku(P, f2)); const d3 = await defter(g);
    const i3 = await A.rpc("fis_iptal_toplu", geriAlYuku(P, f2));
    k_("İ F2 iptali tekrar (yanıt kaybı) → etkisiz, atama bekliyor", [(await defter(g)) === d3, (await durum(g, u)).atama, (await durum(g, u)).gecerli, (i3.fisler || [{}])[0].zatenIptal], [true, "Dikim:10:b", 0, true]);
    await A.end(); await B.end(); await g.end(); sil(db); }
  // T — tamir parçasını iki cihaz eşzamanlı teslim
  { const P1 = YUK["b4-b4t7#1"], P2 = YUK["b4-b4t7#2"], u = "b4-b4t7"; console.log("\n■ Tamir: tamirli teslim → tamir parçasını iki cihaz eşzamanlı teslim");
    const db = yeniDb(); const A = await istemci(db), B = await istemci(db), g = await gozcu(db);
    await A.rpc("fis_kes", P1); const o = await durum(g, u);
    const ra = await A.rpc("fis_kes", P2, { acik: true });
    const sB = B.rpc("fis_kes", ikinci(P2, "B", { atamaYenile: false })); await new Promise((r) => setTimeout(r, 1200)); await A.query("commit"); const rb = await sB;
    const d = await durum(g, u);
    k_("T tamir teslimi bir kez: mamul +3, işçilik −15", [!!ra.fisNo, RET.includes(rb.hata), d.mamul - o.mamul, d.isci - o.isci, d.gecerli], [true, true, 3, -15, 2]);
    if (rb.hata) console.log(`     B: ${rb.hata} ${rb.ileti}`);
    await A.end(); await B.end(); await g.end(); sil(db); }
  const sonMd5 = md5ler(TABAN);
  k_("şablon fonksiyonları koşu boyunca değişmedi", sonMd5 === ilkMd5, true);
  console.log(`\n── b4-sunucu-sina (${BOZMA ? `BOZMA=${BOZMA}` : "normal"}): ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA", e); process.exit(2); });
