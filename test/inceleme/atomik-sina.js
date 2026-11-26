#!/usr/bin/env node
// ATOMİKLİK / TEKRAR / YANIT KAYBI / İPTAL — GERÇEK YÜKLERLE (27 Kasım, inceleme 25). YALNIZ yerel PostgreSQL (canlıyla hizalı taban).
// Yükler: ekran sınamalarının (ekran-stok, ekran-kasa, ekran-cari-virman …) uygulamadan GERÇEKTEN gönderdiği `fis_kes` istekleri — köprü
// KOPRU_KAYIT ile kaydetti. Her yük TEMİZ tabanda (createdb -T) ayrı ayrı sınanır; ölçülen: fiş / stok / cari / kasa satır sayıları ve
// bakiyeleri (geçerli satırlar), fişin kendisi.
//   N  normal: bir kez uygula → değişim (delta) ölçülür; yükün yazdığı tablolar buradan çıkar.
//   H  sonda bilerek hata: yükün yazdığı HER tablo için ayrı ayrı o tabloya "AFTER INSERT → hata" tetikleyicisi → çağrı hata vermeli ve
//      HİÇBİR tabloda iz kalmamalı (tam geri alma). Hatanın iletisi kontrol edilir (gerçekten o tetikleyici mi).
//   T  tekrar / yanıt kaybı: aynı istek İKİ kez (yanıt kaybında istemci aynı isteği yeniden gönderir) → ikinci "zatenVar", değişim tek seferlik.
//   E  eşzamanlı: aynı istek iki bağlantıdan aynı anda → tek fiş, değişim tek seferlik.
//   İ  iptal: normal uygulamadan sonra fis_iptal → bütün bakiyeler başlangıca döner; iptal İKİNCİ kez → bakiye yine değişmez (çift iptal yok).
// BOZMA: BOZMA=1 → fis_kes'in istek tekrarı denetimi kaldırılır (mevcut fiş araması) → T ve E kırmızıya dönmeli.
// Kullanım: KOPRU_PG=<pg> node atomik-sina.js <taban-db> <kopru-kayit.jsonl>
const { Client } = require(process.env.KOPRU_PG || "pg");
const { execFileSync } = require("child_process");
const fs = require("fs");
const [TABAN, KAYIT] = process.argv.slice(2);
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}: ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql], { encoding: "utf8" });
let sayac = 0;
const yeniDb = () => {
  const ad = `inc_atom_${process.pid}_${++sayac}`; psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${TABAN}`);
  if (process.env.BOZMA === "1") {   // istek tekrarı denetimini kaldır: mevcut fiş hiç bulunmaz
    const tanim = psql(ad, "select pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure)");
    const bozuk = tanim.replace("select * into mevcut from public.stk_fis f where f.istek = v_istek;", "select * into mevcut from public.stk_fis f where false;");
    if (bozuk === tanim) throw new Error("bozma uygulanamadı");
    const g = require("path").join(require("os").tmpdir(), `${ad}.sql`); fs.writeFileSync(g, bozuk); execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", ad, "-f", g]); fs.unlinkSync(g);
  }
  return ad;
};
const TABLOLAR = ["stk_fis", "stk_hareket", "car_hareket", "kas_hareket", "kas_cek", "fis_karsilanan_iz", "fis_cek_iz"];
async function baglan(db, eposta) {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "postgres" }); await c.connect();
  c.cagir = async (yuk) => {
    await c.query("begin");
    try {
      await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.40"}', true)`,
        [JSON.stringify({ role: "authenticated", email: eposta, sub: "00000000-0000-0000-0000-000000000001" })]);
      await c.query("set local role authenticated");
      const r = (await c.query("select public.fis_kes($1::jsonb) as r", [JSON.stringify(yuk)])).rows[0].r;
      await c.query("commit"); return r;
    } catch (e) { await c.query("rollback"); throw e; }
  };
  c.iptal = async (no) => {
    await c.query("begin");
    try {
      await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.40"}', true)`,
        [JSON.stringify({ role: "authenticated", email: eposta, sub: "00000000-0000-0000-0000-000000000001" })]);
      await c.query("set local role authenticated");
      const r = (await c.query("select public.fis_iptal($1::jsonb) as r", [JSON.stringify({ no })])).rows[0].r;
      await c.query("commit"); return r;
    } catch (e) { await c.query("rollback"); throw e; }
  };
  return c;
}
// Fotoğraf: satır sayıları + geçerli bakiyeler (stok: stk_stok toplamı; cari / kasa: geçerli satırların yönlü toplamı)
async function foto(c) {
  const f = {};
  for (const t of TABLOLAR) f[t] = Number((await c.query(`select count(*) as n from public.${t}`).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n);
  f.stok = (await c.query(`select coalesce(string_agg(urun_id || '/' || renk_ad || '/' || olcu_ad || '=' || miktar::float, ' ' order by 1), '') as s from public.stk_stok`)).rows[0].s;
  f.cari = (await c.query(`select coalesce(string_agg(cari_id || '=' || t::float, ' ' order by cari_id), '') as s from (select cari_id, sum(case when yon ilike 'b%' then tutar else -tutar end) t
      from public.car_hareket h where not coalesce(h.iptal, false) and not exists (select 1 from public.stk_fis f where f.id = h.fis_id and f.iptal) group by 1) x`)).rows[0].s;
  // kas_hareket'te tutar / yön `veri` içinde: geçerli satırların (hesap + içerik özeti) kümesi — iptal sonrası başlangıçtaki küme olmalı
  f.kasa = (await c.query(`select coalesce(md5(string_agg(hesap_id || ':' || md5(veri::text), ',' order by hesap_id, md5(veri::text))), '') as s
      from public.kas_hareket h where not coalesce(h.iptal, false) and not exists (select 1 from public.stk_fis f where f.id = h.fis_id and f.iptal)`)).rows[0].s;
  return f;
}
const fark = (a, b) => Object.fromEntries(TABLOLAR.map((t) => [t, b[t] - a[t]]).filter(([, v]) => v));

(async () => {
  const kayit = fs.readFileSync(KAYIT, "utf8").split("\n").filter(Boolean).map((x) => JSON.parse(x)).filter((x) => x.yol === "rpc/fis_kes");
  // aynı istek kimliği birden çok kez kaydedildiyse (ekran testinin kendi tekrar / kayıp adımları) bir kez al
  const gorulen = new Set(); const yukler = [];
  for (const x of kayit) { const p = JSON.parse(x.govde).p; const id = p && (p.istek || p.istekId || p.fis && p.fis.istek || JSON.stringify(p).slice(0, 200)); if (gorulen.has(id)) continue; gorulen.add(id); yukler.push({ p, eposta: x.eposta }); }
  console.log(`atomik-sina · taban ${TABAN} · ${yukler.length} ayrı fis_kes yükü (${kayit.length} kayıt)`);
  for (const [i, { p, eposta }] of yukler.entries()) {
    const tur = p.fis && p.fis.tur || p.tur || "?";
    console.log(`\n■ yük ${i + 1} · tür ${tur} · ${Object.keys(p).join(",")}`);
    // N
    let db = yeniDb(); let c = await baglan(db, eposta);
    const once = await foto(c);
    let r; try { r = await c.cagir(p); } catch (e) { console.log(`  (yük bu tabanda uygulanamadı: ${e.code} ${String(e.message).slice(0, 90)} — atlandı)`); await c.end(); continue; }
    const sonra = await foto(c); const delta = fark(once, sonra);
    console.log(`  N  fiş ${r.fisNo}${r.bagliFisNo ? ` + ${r.bagliFisNo}` : ""} · yazılan ${JSON.stringify(delta)}`);
    // T: aynı istek ikinci kez
    let r2; try { r2 = await c.cagir(p); } catch (e) { r2 = { hata: `${e.code} ${e.message}` }; }
    const sonra2 = await foto(c);
    k_("T  aynı istek ikinci kez → zatenVar, aynı fiş", [r2.zatenVar, r2.fisNo], [true, r.fisNo]);
    k_("T  ikinci istek hiçbir şey yazmadı", JSON.stringify(sonra2) === JSON.stringify(sonra), true);
    // İ: iptal → başa dön; ikinci iptal → değişmez
    let ip1, ip2;
    try { ip1 = await c.iptal(r.fisNo); } catch (e) { ip1 = { hata: `${e.code} ${String(e.message).slice(0, 80)}` }; }
    const iptalSonra = await foto(c);
    k_("İ  iptal sonrası stok / cari / kasa bakiyesi başlangıçta", [iptalSonra.stok, iptalSonra.cari, iptalSonra.kasa], [once.stok, once.cari, once.kasa]);
    try { ip2 = await c.iptal(r.fisNo); } catch (e) { ip2 = { hata: `${e.code} ${String(e.message).slice(0, 80)}` }; }
    const iptal2 = await foto(c);
    k_("İ  ikinci iptal bakiyeyi değiştirmedi (çift iptal yok)", [iptal2.stok, iptal2.cari, iptal2.kasa], [iptalSonra.stok, iptalSonra.cari, iptalSonra.kasa]);
    console.log(`     (1. iptal: ${JSON.stringify(ip1).slice(0, 90)} · 2. iptal: ${JSON.stringify(ip2).slice(0, 90)})`);
    await c.end();
    // E: eşzamanlı iki kopya
    db = yeniDb(); const a = await baglan(db, eposta); const b = await baglan(db, eposta);
    const eOnce = await foto(a);
    const sonuc = await Promise.allSettled([a.cagir(p), b.cagir(p)]);
    const eSonra = await foto(a);
    const fisler = sonuc.filter((x) => x.status === "fulfilled").map((x) => x.value.fisNo);
    k_("E  eşzamanlı iki kopya → tek fiş", new Set(fisler).size, 1);
    k_("E  değişim tek seferlik (normalle aynı)", JSON.stringify(fark(eOnce, eSonra)), JSON.stringify(delta));
    await a.end(); await b.end();
    // H: yazdığı her tabloda sonda bilerek hata
    for (const t of Object.keys(delta)) {
      db = yeniDb();
      psql(db, `create function public._sina_hata() returns trigger language plpgsql as 'begin raise exception ''SINAMA: ${t} yazılırken hata''; end';
                create trigger _sina_hata after insert on public.${t} for each row execute function public._sina_hata();`);
      c = await baglan(db, eposta);
      const hOnce = await foto(c);
      let msg = ""; try { await c.cagir(p); msg = "geçti"; } catch (e) { msg = e.message; }
      const hSonra = await foto(c);
      k_(`H  ${t} yazılırken hata → çağrı reddedildi`, msg, `SINAMA: ${t} yazılırken hata`);
      k_(`H  ${t} hatasında HİÇBİR tabloda iz yok, bakiyeler aynı`, JSON.stringify(hSonra) === JSON.stringify(hOnce), true);
      await c.end();
    }
  }
  console.log(`\n── atomik-sina: ${gecen} geçti · ${kalan} kaldı ──`);
  for (let i = 1; i <= sayac; i++) psql("postgres", `drop database if exists inc_atom_${process.pid}_${i}`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA", e); process.exit(2); });
