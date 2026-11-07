#!/usr/bin/env node
// DAVRANIŞ BATARYASI — public şemasındaki (uzantı dışı) HER fonksiyon üç rolle çağrılır ve sonucu (ok ya da SQLSTATE) yazılır:
//   anon (girişsiz: JWT yok), veli (giriş yapmış, Kullanıcı), ali (giriş yapmış, Yönetici — eski-tablolar.sql'deki tanımlar).
// Bağımsız değişkenler türlü NULL. Her rol TEK işlem içinde çalışır ve sonda GERİ ALINIR (ROLLBACK): yan etkisi kalmaz; her
// çağrı kendi alt işleminde (hata sonrakini etkilemez). Kullanım: node davranis.js <veritabanı> > sonuc.json
// Sıkılaştırmadan önce ve sonra çalıştırılır; karsilastir.js farkın yalnız "anon + kapanan fonksiyon → 42501" olduğunu denetler.
const DB = process.argv[2] || "atolye_guvenlik";
const ROLLER = {
  anon: { rol: "anon", claims: "" },
  veli: { rol: "authenticated", claims: '{"email":"veli@atolye.local","role":"authenticated"}' },
  ali: { rol: "authenticated", claims: '{"email":"ali@atolye.local","role":"authenticated"}' },
};
const sql = (rol) => `
begin;
select set_config('request.jwt.claims', '${ROLLER[rol].claims}', true);
set local statement_timeout = '10s';
set local role ${ROLLER[rol].rol};
do $blok$
declare r record; arg text; kod text;
begin
  for r in select p.oid, p.oid::regprocedure::text as imza, p.pronargs, p.proargtypes::oid[] as turler
             from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f'
              and not exists (select 1 from pg_catalog.pg_depend d where d.classid = 'pg_catalog.pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
            order by 2 loop
    select coalesce(string_agg(format('null::%s', pg_catalog.format_type(t, null)), ', ' order by i), '') into arg
      from unnest(r.turler) with ordinality u(t, i);
    begin
      execute format('select %s(%s)', r.oid::regproc::text, arg);
      kod := 'ok';
    exception when others then kod := sqlstate;
    end;
    raise notice 'SONUC|%|%', r.imza, kod;
  end loop;
end $blok$;
rollback;`;
const cikti = {};
for (const rol of Object.keys(ROLLER)) {
  const r = require("child_process").spawnSync("psql", ["-X", "-q", "-d", DB, "-c", sql(rol)], { encoding: "utf8" });
  const err = String(r.stderr || "");
  cikti[rol] = {};
  for (const m of err.matchAll(/SONUC\|([^|]+)\|(\S+)/g)) cikti[rol][m[1]] = m[2];
  if (!Object.keys(cikti[rol]).length) { console.error(`${rol}: sonuç yok\n${err.slice(0, 800)}`); process.exit(2); }
}
console.log(JSON.stringify(cikti, null, 1));
