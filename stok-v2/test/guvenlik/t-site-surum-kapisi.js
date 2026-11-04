#!/usr/bin/env node
// SÜRÜM KAPISI × SİTE (4 Kasım). stk_istemci_koru public'teki her tabloya kuruluydu; site sürüm başlığı göndermediği için
// min_istemci_surum ayarlanınca müşteri girişi AT001 ile reddediliyordu. Kahin (kapı 1.744.7 iken): site tablolarında tetikleyici
// yok; girişsiz portal_giris çalışır (oturum yazılır); giriş yapmış ERP kullanıcısının başlıksız yazması hâlâ AT001. Kapı sonda kapatılır.
// Kullanım: node t-site-surum-kapisi.js <veritabanı> <site kullanıcısı> <şifre>
const { spawnSync } = require("child_process");
const [DB = "atolye_guvenlik", KUL, SIFRE] = process.argv.slice(2);
const q = (s) => { const r = spawnSync("psql", ["-X", "-q", "-At", "-d", DB], { input: `\\set VERBOSITY verbose\n${s}`, encoding: "utf8" });
  const m = String(r.stderr).match(/ERROR:\s+([0-9A-Z]{5})/); return m ? m[1] : r.stdout.trim().split("\n").pop(); };
let hata = 0; const k = (ad, g, b) => { const ok = g === b; if (!ok) hata += 1; console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${g} · beklenen ${b}`); };
q("update public.stk_ayar set min_istemci_surum = '1.744.7' where id = 'tekil'");
try {
  k("SK.site-tablosunda-tetikleyici-yok", q("select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid where g.tgname = 'stk_istemci_koru' and c.relname like 'site\\_%'"), "0");
  k("SK.site-girisi-calisir", q(`begin; select set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
    select (public.portal_giris('${KUL}', '${SIFRE}') is not null)::text; rollback;`), "true");
  k("SK.erp-basliksiz-yazma-red", q(`begin; select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true);
    set local role authenticated; update public.tanimlar set veri = veri where id = 'tekil'; select 'yazdi'; rollback;`), "AT001");
} finally { q("update public.stk_ayar set min_istemci_surum = null where id = 'tekil'"); }
console.log(`── t-site-surum-kapisi.js: ${hata ? hata + " kırmızı" : "temiz"} ──`); process.exit(hata ? 1 : 0);
