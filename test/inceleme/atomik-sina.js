#!/usr/bin/env node
// ATOMİKLİK / TEKRAR / YANIT KAYBI / İPTAL — GERÇEK YÜKLERLE, GERÇEK KULLANICI YETKİSİYLE (27 Kasım, inceleme 25). YALNIZ yerel PostgreSQL.
// Yükler: ekran sınamalarının (ekran-stok, ekran-kasa, ekran-cari-virman …) uygulamadan GERÇEKTEN gönderdiği `fis_kes` istekleri — köprü
// KOPRU_KAYIT ile kaydetti (gövde + oturumun e-postası). Her adım ŞABLONDAN yeni, atılabilir bir veritabanında (createdb -T) koşar.
// YETKİ: çağrı süper kullanıcıyla DEĞİL — Supabase'deki authenticator gibi giriş yapabilen ama yetkisiz `inc_istemci` rolüyle bağlanılır,
//   işlemde SET LOCAL ROLE authenticated + request.jwt.claims (kaydedilen e-posta) + x-atolye-surum; her çağrıdan önce current_user =
//   authenticated ve süper kullanıcı olmadığı doğrulanır. ÖLÇÜM ayrı "gözcü" bağlantısıyla (postgres) — RLS satır gizlemesin.
// Ölçülen: tablo satır sayıları, stok (stk_stok), cari bakiyesi (car_hareket: borç − alacak, geçerli), kasa BAKİYESİ (kas_hareket:
//   Giriş − Çıkış, geçerli satır + geçerli fiş — ekran-kasa'nın sunucu hesabı) ve kasa İÇERİK ÖZETİ (geçerli satır kümesi).
//   N  normal: bir kez → değişim; yükün yazdığı tablolar.
//   Y  YANIT KAYBI: ilk istek sunucuda TAMAMLANIR (commit), yanıtı OKUNMAZ; aynı istek kimliğiyle yeniden gönderilir → "zatenVar", ikinci fiş /
//      hareket YOK (değişim tek seferlik).
//   T  tekrar (yanıt alındıktan sonra yeniden gönderim) → aynı.
//   E  eşzamanlı iki kopya → tek fiş.
//   İ  iptal → stok / cari / kasa bakiyesi başlangıçta; ikinci iptal bakiyeyi değiştirmez.
//   H  sonda bilerek hata: yükün yazdığı HER tabloda ayrı ayrı AFTER INSERT → hata; çağrı o iletiyle reddedilmeli, HİÇBİR iz kalmamalı.
// BOZMA=1 (AYRI koşu): her atılabilir kopyada fis_kes'in istek tekrarı araması kaldırılır → Y / T / E kırmızıya dönmeli. Şablon (TABAN)
//   ASLA değiştirilmez: koşu başında ve sonunda şablondaki fis_kes'in md5'i yazılır ve karşılaştırılır; normal koşuda her kopyanın fis_kes'i
//   şablonunkiyle aynı olmalı (korumasız fonksiyon kalmadı).
// Kullanım: KOPRU_PG=<pg> node atomik-sina.js <şablon-db> <kopru-kayit.jsonl>
const { Client } = require(process.env.KOPRU_PG || "pg");
const { execFileSync } = require("child_process");
const fs = require("fs"); const os = require("os"); const path = require("path");
const [TABAN, KAYIT] = process.argv.slice(2);
const BOZMA = process.env.BOZMA === "1";
let gecen = 0, kalan = 0, atlanan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++;
  console.log(`  ${ok ? "✓" : "✗"} ${ad}: ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql], { encoding: "utf8" });
const fisKesMd5 = (db) => psql(db, "select md5(pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure))").trim();
let sayac = 0; const kopyalar = [];
const yeniDb = () => {
  const ad = `inc_atom_${BOZMA ? "bozuk_" : ""}${process.pid}_${++sayac}`; kopyalar.push(ad);
  psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${TABAN}`);
  if (BOZMA) {   // YALNIZ bu atılabilir kopyada: istek tekrarı denetimini kaldır (mevcut fiş hiç bulunmaz)
    const tanim = psql(ad, "select pg_get_functiondef('public.fis_kes(jsonb)'::regprocedure)");
    const bozuk = tanim.replace("select * into mevcut from public.stk_fis f where f.istek = v_istek;", "select * into mevcut from public.stk_fis f where false;");
    if (bozuk === tanim) throw new Error("bozma uygulanamadı");
    const g = path.join(os.tmpdir(), `${ad}.sql`); fs.writeFileSync(g, bozuk); execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", ad, "-f", g]); fs.unlinkSync(g);
  } else if (fisKesMd5(ad) !== TABAN_MD5) throw new Error(`kopyada fis_kes şablondan farklı (${ad})`);
  return ad;
};
let TABAN_MD5 = "";
const TABLOLAR = ["stk_fis", "stk_hareket", "car_hareket", "kas_hareket", "kas_cek", "fis_karsilanan_iz", "fis_cek_iz"];
// İstemci bağlantısı: giriş rolü inc_istemci (yetkisiz), işlemde authenticated
async function istemci(db, eposta) {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "inc_istemci" }); await c.connect();
  const islem = async (sql, deger) => {
    await c.query("begin");
    try {
      await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.40"}', true)`,
        [JSON.stringify({ role: "authenticated", email: eposta, sub: "00000000-0000-0000-0000-000000000001" })]);
      await c.query("set local role authenticated");
      const kim = (await c.query("select current_user as u, session_user as s, (select rolsuper from pg_roles where rolname = current_user) as su")).rows[0];
      if (kim.u !== "authenticated" || kim.s !== "inc_istemci" || kim.su) throw new Error(`yetki ortamı yanlış: ${JSON.stringify(kim)}`);
      const r = (await c.query(sql, deger)).rows[0].r;
      await c.query("commit"); return r;
    } catch (e) { await c.query("rollback").catch(() => {}); throw e; }
  };
  c.cagir = (yuk) => islem("select public.fis_kes($1::jsonb) as r", [JSON.stringify(yuk)]);
  c.iptal = (no) => islem("select public.fis_iptal($1::jsonb) as r", [JSON.stringify({ no })]);
  return c;
}
async function gozcu(db) { const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "postgres" }); await c.connect(); return c; }
async function foto(g) {
  const f = {};
  for (const t of TABLOLAR) f[t] = Number((await g.query(`select count(*) as n from public.${t}`).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n);
  f.stok = (await g.query(`select coalesce(string_agg(urun_id || '/' || renk_ad || '/' || olcu_ad || '=' || miktar::float, ' ' order by 1), '') as s from public.stk_stok`)).rows[0].s;
  f.cari = (await g.query(`select coalesce(string_agg(cari_id || '=' || t::float, ' ' order by cari_id), '') as s from (select h.cari_id, sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end) t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal) group by 1) x`)).rows[0].s;
  // kasa BAKİYESİ (ekran-kasa sunucu hesabı): Giriş − Çıkış, geçerli satır + geçerli fiş, hesap başına
  f.kasaBakiye = (await g.query(`select coalesce(string_agg(hesap_id || '=' || b::float, ' ' order by hesap_id), '') as s from (
      select h.hesap_id, sum(case when h.veri ->> 'yon' = 'Giriş' then (h.veri ->> 'tutar')::numeric else -(h.veri ->> 'tutar')::numeric end) b
        from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where not h.iptal and (h.fis_id is null or not f.iptal) group by 1) x`)).rows[0].s;
  // kasa İÇERİK ÖZETİ: geçerli satır kümesi
  f.kasaOzet = (await g.query(`select coalesce(md5(string_agg(h.hesap_id || ':' || md5(h.veri::text), ',' order by h.hesap_id, md5(h.veri::text))), '') as s
      from public.kas_hareket h left join public.stk_fis f on f.id = h.fis_id where not h.iptal and (h.fis_id is null or not f.iptal)`)).rows[0].s;
  return f;
}
const fark = (a, b) => Object.fromEntries(TABLOLAR.map((t) => [t, b[t] - a[t]]).filter(([, v]) => v));
const bakiye = (f) => ({ stok: f.stok, cari: f.cari, kasaBakiye: f.kasaBakiye, kasaOzet: f.kasaOzet });

(async () => {
  // giriş rolü (yerel kümede bir kez): Supabase authenticator benzeri — giriş yapar, kendisi yetkisiz, authenticated'a geçebilir
  psql("postgres", `do $$ begin if not exists (select 1 from pg_roles where rolname = 'inc_istemci') then create role inc_istemci login noinherit; end if; end $$; grant authenticated to inc_istemci;`);
  TABAN_MD5 = fisKesMd5(TABAN);
  console.log(`atomik-sina · şablon ${TABAN} · fis_kes md5 ${TABAN_MD5} · ${BOZMA ? "BOZMA (atılabilir kopyalarda istek tekrarı denetimi YOK)" : "normal"}`);
  const kayit = fs.readFileSync(KAYIT, "utf8").split("\n").filter(Boolean).map((x) => JSON.parse(x)).filter((x) => x.yol === "rpc/fis_kes");
  const gorulen = new Set(); const yukler = [];
  for (const x of kayit) { const p = JSON.parse(x.govde).p; if (!p || gorulen.has(p.istek)) continue; gorulen.add(p.istek); yukler.push({ p, eposta: x.eposta }); }
  console.log(`  ${yukler.length} ayrı istek kimliği (${kayit.length} kayıt)`);
  for (const [i, { p, eposta }] of yukler.entries()) {
    console.log(`\n■ yük ${i + 1} · fiş türü ${p.fis && p.fis.tur} · parçalar ${Object.keys(p).filter((k) => p[k] && (Array.isArray(p[k]) ? p[k].length : typeof p[k] === "object")).join(",")} · ${eposta}`);
    // N + T + İ
    let db = yeniDb(); let c = await istemci(db, eposta); let g = await gozcu(db);
    const once = await foto(g);
    let r; try { r = await c.cagir(p); } catch (e) { atlanan++; console.log(`  ⊘ ATLANDI — yük bu tabanda uygulanamadı: ${e.code} ${String(e.message).slice(0, 100)}`); await c.end(); await g.end(); continue; }
    const sonra = await foto(g); const delta = fark(once, sonra);
    console.log(`  N  fiş ${r.fisNo}${r.bagliFisNo ? ` + ${r.bagliFisNo}` : ""} · yazılan ${JSON.stringify(delta)}`);
    let r2; try { r2 = await c.cagir(p); } catch (e) { r2 = { hata: `${e.code} ${e.message}` }; }
    k_("T  yanıt alındıktan sonra aynı istek → zatenVar, aynı fiş", [r2.zatenVar, r2.fisNo], [true, r.fisNo]);
    k_("T  ikinci istek hiçbir şey yazmadı", JSON.stringify(await foto(g)) === JSON.stringify(sonra), true);
    let ip1, ip2;
    try { ip1 = await c.iptal(r.fisNo); } catch (e) { ip1 = { hata: `${e.code} ${String(e.message).slice(0, 80)}` }; }
    const iptalSonra = await foto(g);
    k_("İ  iptal → stok / cari / kasa bakiyesi + kasa özeti başlangıçta", bakiye(iptalSonra), bakiye(once));
    try { ip2 = await c.iptal(r.fisNo); } catch (e) { ip2 = { hata: `${e.code} ${String(e.message).slice(0, 80)}` }; }
    k_("İ  ikinci iptal bakiyeyi değiştirmedi", bakiye(await foto(g)), bakiye(iptalSonra));
    console.log(`     1. iptal ${JSON.stringify(ip1).slice(0, 80)} · 2. iptal ${JSON.stringify(ip2).slice(0, 80)}`);
    await c.end(); await g.end();
    // Y: yanıt kaybı — ilk istek sunucuda tamamlanır, yanıt OKUNMAZ, aynı istek yeniden
    db = yeniDb(); c = await istemci(db, eposta); g = await gozcu(db);
    const yOnce = await foto(g);
    await c.cagir(p).then(() => {}, () => {});          // yanıt atılır (istemci görmedi)
    const yIlk = await foto(g);
    k_("Y  ilk istek sunucuda tamamlandı (yanıt kayboldu)", JSON.stringify(fark(yOnce, yIlk)), JSON.stringify(delta));
    let y2; try { y2 = await c.cagir(p); } catch (e) { y2 = { hata: `${e.code} ${e.message}` }; }
    const yIki = await foto(g);
    k_("Y  aynı istek kimliğiyle yeniden gönderim → zatenVar", y2.zatenVar, true);
    k_("Y  ikinci fiş / hareket YOK (değişim tek seferlik)", JSON.stringify(fark(yOnce, yIki)), JSON.stringify(delta));
    await c.end(); await g.end();
    // E: eşzamanlı iki kopya
    db = yeniDb(); const a = await istemci(db, eposta); const b = await istemci(db, eposta); g = await gozcu(db);
    const eOnce = await foto(g);
    const s2 = await Promise.allSettled([a.cagir(p), b.cagir(p)]);
    const eSonra = await foto(g);
    k_("E  eşzamanlı iki kopya → tek fiş", new Set(s2.filter((x) => x.status === "fulfilled").map((x) => x.value.fisNo)).size, 1);
    k_("E  değişim tek seferlik", JSON.stringify(fark(eOnce, eSonra)), JSON.stringify(delta));
    await a.end(); await b.end(); await g.end();
    if (BOZMA) continue;   // bozma koşusu yalnız tekrar korumasını sınar
    // H: yazdığı her tabloda sonda bilerek hata
    for (const t of Object.keys(delta)) {
      db = yeniDb();
      psql(db, `create function public._sina_hata() returns trigger language plpgsql as 'begin raise exception ''SINAMA: ${t} yazılırken hata''; end';
                create trigger _sina_hata after insert on public.${t} for each row execute function public._sina_hata();`);
      c = await istemci(db, eposta); g = await gozcu(db);
      const hOnce = await foto(g);
      let msg = ""; try { await c.cagir(p); msg = "geçti"; } catch (e) { msg = e.message; }
      k_(`H  ${t} yazılırken hata → reddedildi`, msg, `SINAMA: ${t} yazılırken hata`);
      k_(`H  ${t} hatasında hiçbir tabloda iz yok, bakiyeler aynı`, JSON.stringify(await foto(g)) === JSON.stringify(hOnce), true);
      await c.end(); await g.end();
    }
  }
  const sonMd5 = fisKesMd5(TABAN);
  k_("şablonun fis_kes'i koşu boyunca değişmedi", sonMd5, TABAN_MD5);
  console.log(`\n── atomik-sina (${BOZMA ? "BOZMA" : "normal"}): ${gecen} geçti · ${kalan} kaldı · ${atlanan} yük atlandı ──`);
  for (const ad of kopyalar) psql("postgres", `drop database if exists ${ad}`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA", e); process.exit(2); });
