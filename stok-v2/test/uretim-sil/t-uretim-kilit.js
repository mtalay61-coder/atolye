#!/usr/bin/env node
// ÜRETİM SİLME — KİLİT SIRASI (4 Kasım, inceleme). Yalnız yerel PostgreSQL; Supabase'e DOKUNMAZ.
// Kilitlenme senaryosu: üretimin, bir satış siparişi kalemine (K) bağlı teslim fişi var. Aynı kaleme ikinci teslim (fis_kes) kalem
// kilidini aldıktan sonra satırını yazarken üretim kilidini ister (uretim_bag_koru). Aynı anda uretim_sil çalışır.
//   Eski sıra (0649412): uretim_sil ÜRETİM kilidini alıp KALEM kilidini ister; fis_kes KALEM kilidini tutup ÜRETİM kilidini ister →
//     kilitlenme (40P01): PostgreSQL birini geri alır — veri tutarlı ama kullanıcı nedensiz hata görür.
//   Yeni sıra: uretim_sil önce fişlerin kalem / çek / kasa / fiş kilitlerini, sonra üretim satırını, en son üretim kilidini alır
//     (fis_kes ve doğrudan silmeyle aynı sıra) → kilitlenme YOK; teslim tamamlanır, silme araya giren fişi görüp KR010 ile reddeder.
// Her iki sırada da: üretim silinmişse geçerli hareketi kalmaz; reddedilmişse hiçbir şey değişmez.
// Ara sıralamayı zorlamak için yalnız bu sınamada geçici bir tetikleyici (a_t_uyku) ikinci teslimin satırını 2 sn bekletir —
// kalem kilidi alınmış, üretim kilidi henüz istenmemişken (tetikleyiciler ad sırasıyla: a_t_uyku < uretim_bag_koru).
const assert = require("assert/strict");
const { spawn } = require("child_process");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST), "Yalnız yerel PostgreSQL");
const T = require("../f0/ortak");
const { psql, ON } = T;
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const KIM = `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true); set local role authenticated;`;
let hata = 0;
const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
function oturum(s) {
  const metin = `\\set VERBOSITY verbose\nbegin; ${KIM} ${s}; commit;`;
  return new Promise((coz) => { const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]); let err = "";
    c.stderr.on("data", (d) => { err += d; }); c.on("close", (x) => coz(x === 0 ? "tamam" : ((err.match(/ERROR:\s+([0-9A-Z]{5})/) || [])[1] || "hata"))); c.stdin.end(metin); });
}
const teslim = (s, kalemId, adet, ekran, istek, u) => {
  const y = T.teslimYuku({ s, kalemId, adet, ekran, istek });
  y.fis = { ...y.fis, uretimId: u };
  y.stok = { ...y.stok, satirlar: (y.stok.satirlar || []).map((x) => ({ ...x, uretimId: u })) };
  return y;
};

(async () => {
  const yeniSira = /fis_kalem_kilitle/.test(psql("select prosrc from pg_proc where proname = 'uretim_sil'"));
  console.log(`t-uretim-kilit · ${DB} · uretim_sil kilit sırası: ${yeniSira ? "YENİ (kalem → üretim satırı → üretim kilidi)" : "ESKİ (üretim kilidi → kalem)"}`);
  const u = `${ON}-u`, kid = `${ON}-k`;
  psql(`set session_replication_role = replica; insert into public.uretim (id, siparis_no, urun_id, ek) values ('${u}', '${u}-NO', 'u-yeni', '{}');`);
  const s = T.siparisKur(T.sipObj(ON, [T.kalemObj(kid, 20, 0)]));
  const r1 = T.rpc("fis_kes", teslim(s, kid, 2, 0, `${ON}-t1`, u));
  assert(r1.ok, JSON.stringify(r1));
  psql(`create or replace function public.t_uretim_uyku() returns trigger language plpgsql as $f$ begin
          if new.uretim_id = '${u}' then perform pg_sleep(2); end if; return new; end $f$;
        drop trigger if exists a_t_uyku on public.stk_hareket;
        create trigger a_t_uyku before insert on public.stk_hareket for each row execute function public.t_uretim_uyku();`);
  try {
    const ikinci = oturum(`select public.fis_kes($j$${JSON.stringify(teslim(s, kid, 3, 2, `${ON}-t2`, u))}$j$::jsonb)`);
    await T.uyu(600);
    const sil = oturum(`select public.uretim_sil('{"id":"${u}","sebep":"kilit sınaması"}'::jsonb)`);
    const [a, b] = await Promise.all([ikinci, sil]);
    console.log(`  sonuç: ikinci teslim ${a} · uretim_sil ${b}`);
    k("kilitlenme-yok (40P01 yok)", [a, b].includes("40P01") ? "kilitlendi" : "yok", "yok");
    k("teslim-tamamlandi", a, "tamam");
    k("silme-reddedildi (araya fiş girdi)", b, "KR010");
    const d = { uretim: Number(psql(`select count(*) from public.uretim where id = '${u}'`)),
      gecerli: Number(psql(`select count(*) from public.stk_hareket where uretim_id = '${u}' and not iptal`)) };
    k("tutarli (üretim var ⇒ iki teslim geçerli)", d, { uretim: 1, gecerli: 2 });
  } finally {
    psql("drop trigger if exists a_t_uyku on public.stk_hareket; drop function if exists public.t_uretim_uyku();");
  }
  console.log(`── t-uretim-kilit.js: ${hata ? hata + " kırmızı" : "temiz"} ──`);
  process.exit(hata ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
