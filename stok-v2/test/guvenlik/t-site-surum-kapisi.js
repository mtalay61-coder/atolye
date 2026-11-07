#!/usr/bin/env node
// SÜRÜM KAPISI × SİTE (4 Kasım). stk_istemci_koru public'teki her tabloya kuruluydu; site sürüm başlığı göndermediği için
// min_istemci_surum ayarlanınca müşteri girişi AT001 ile reddediliyordu. İstisna AÇIK LİSTE: 5 site tablosu (fis-defteri.sql,
// 7-surum-kapisi-site-istisna.sql). Kapı 1.744.7 iken kahin:
//   KAPSAM  — listedeki 5 tablo kapı dışında; adı site_ ile başlayan YENİ bir tablo (site_gelecek_deneme) kapı İÇİNDE doğar.
//   SİTE    — girişsiz: portal_giris (site_oturumlari, site_giris_kaydi, site_hesaplari), site_kayit_ol (site_kayit_talepleri),
//             portal_siparis (site_talepleri) çalışır; portal_siparis ERP tablolarına HİÇ yazmaz (siparisler, siparis_kalemleri,
//             cariler, stk_*, car_hareket, kas_hareket, lst_kayit, tanimlar, urunler sayıları ve değişiklik sayacı aynı);
//             portal_cikis çalışır.
//   ERP     — giriş yapmış kullanıcının başlıksız yazması AT001; 1.744.7 başlıklı yazması geçer; eski başlık (1.744.6) AT001.
// Kapı sonda kapatılır; deneme tablosu silinir. Kullanım: node t-site-surum-kapisi.js <veritabanı> <site kullanıcısı> <şifre>
const { spawnSync } = require("child_process");
const path = require("path");
const [DB = "atolye_guvenlik", KUL, SIFRE] = process.argv.slice(2);
const q = (s) => { const r = spawnSync("psql", ["-X", "-q", "-At", "-d", DB], { input: `\\set VERBOSITY verbose\n${s}`, encoding: "utf8" });
  const m = String(r.stderr).match(/ERROR:\s+([0-9A-Z]{5})/); return m ? m[1] : r.stdout.trim().split("\n").pop(); };
const ANON = "select set_config('request.jwt.claims','{\"role\":\"anon\"}',true); set local role anon;";
const ALI = (surum) => `select set_config('request.jwt.claims','{"email":"ali@atolye.local","role":"authenticated"}',true);
  ${surum ? `select set_config('request.headers','{"x-atolye-surum":"${surum}"}',true);` : ""} set local role authenticated;`;
let hata = 0; const k = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); };
const SITE5 = ["site_giris_kaydi", "site_hesaplari", "site_kayit_talepleri", "site_oturumlari", "site_talepleri"];
const ERP = ["siparisler", "siparis_kalemleri", "cariler", "urunler", "tanimlar", "stk_fis", "stk_hareket", "stk_varyant", "car_hareket",
  "kas_hareket", "lst_kayit", "degisiklik"];
const sayim = () => q(`select string_agg(t || '=' || n, ' ' order by t) from (${ERP.map((t) =>
  `select '${t}' t, (select count(*) from public.${t})${t === "degisiklik" ? " + coalesce((select sum(extract(epoch from zaman))::bigint from public.degisiklik), 0)" : ""} n`).join(" union all ")}) x`);

// Deneme verisi (yalnız test veritabanı): sitenin cari'sine u-yeni modeli görünür olsun (portal_siparis geçerli sepet ister)
const cari = q(`select cari_id from public.site_hesaplari where kullanici = '${KUL}'`);
q(`set session_replication_role = replica;
  update public.urunler set kategori = 'Mamul', ek = coalesce(ek, '{}') || '{"sitedeGoster":"true"}', pasif = false,
    fiyat_kurallari = '[{"tip":"Satış","kapsam":"cari","deger":"${cari}","fiyat":100}]' where id = 'u-yeni';
  update public.tanimlar set veri = jsonb_set(veri, '{siteGruplari}', '[{"id":"g-deneme","cariIdleri":["${cari}"],"urunIdleri":["u-yeni"]}]') where id = 'tekil';`);
const model = q(`select v.renk || '|' || v.beden from public.varyantlar v where v.urun_id = 'u-yeni' and coalesce(v.renk,'') <> '' and coalesce(v.beden,'') <> '' limit 1`);
const [renk, beden] = model.split("|");

console.log(`t-site-surum-kapisi · ${DB} · site kullanıcısı ${KUL} · model u-yeni ${renk}/${beden}`);
// Gelecekteki site_ tablosu: kaynak (Editor 18) yeniden çalışınca kapının İÇİNDE doğmalı
q("create table if not exists public.site_gelecek_deneme (id int)");
const r18 = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DB, "-f", path.join(__dirname, "../../editor/18-fis-defteri.sql")], { encoding: "utf8" });
if (r18.status !== 0) { console.error("Editor 18 çalışmadı:", r18.stderr.slice(-400)); process.exit(2); }
q("update public.stk_ayar set min_istemci_surum = '1.744.7' where id = 'tekil'");
try {
  const kapida = (t) => q(`select exists (select 1 from pg_trigger where tgname = 'stk_istemci_koru' and tgrelid = 'public.${t}'::regclass)::text`);
  k("KAPSAM.listedeki-5-tablo-kapi-disinda", SITE5.map(kapida), SITE5.map(() => "false"));
  k("KAPSAM.yeni-site_-tablosu-kapi-icinde", kapida("site_gelecek_deneme"), "true");
  k("KAPSAM.erp-tablolari-kapi-icinde", ["siparisler", "stk_hareket", "car_hareket", "tanimlar"].map(kapida), ["true", "true", "true", "true"]);

  const giris = q(`begin; ${ANON} select public.portal_giris('${KUL}', '${SIFRE}'); commit;`);
  k("SITE.portal_giris (oturum + giriş kaydı + hesap)", giris.length >= 16 ? "kod" : giris, "kod");
  const ek = String(Date.now() % 1e6);
  k("SITE.site_kayit_ol (kayıt talebi)", q(`begin; ${ANON} select public.site_kayit_ol('{"unvan":"Kapı ${ek}","telefon":"5551112233"}'::jsonb, 'kapi${ek}', 'Sifre123!'); commit;`), "ok");
  const once = sayim(); const talepOnce = q("select count(*) from public.site_talepleri");
  const sip = q(`begin; ${ANON} select public.portal_siparis('${giris}', '[{"urunId":"u-yeni","renk":"${renk}","beden":"${beden}","miktar":2}]'::jsonb, 'kapı denemesi', null)::text; commit;`);
  k("SITE.portal_siparis (site talebi)", /^[0-9a-z-]{6,}$/i.test(sip) ? "talep" : sip, "talep");
  k("SITE.portal_siparis site_talepleri +1", Number(q("select count(*) from public.site_talepleri")) - Number(talepOnce), 1);
  k("SITE.portal_siparis ERP tablolarına yazmadı", sayim(), once);
  k("SITE.portal_cikis (oturum siler)", q(`begin; ${ANON} select public.portal_cikis('${giris}'); select 'ok'; commit;`), "ok");

  const erpYaz = (surum) => q(`begin; ${ALI(surum)} update public.tanimlar set veri = veri where id = 'tekil'; select 'yazdi'; rollback;`);
  k("ERP.basliksiz-yazma-red", erpYaz(null), "AT001");
  k("ERP.eski-surum-1.744.6-red", erpYaz("1.744.6"), "AT001");
  k("ERP.guncel-1.744.7-gecer", erpYaz("1.744.7"), "yazdi");
} finally {
  q("update public.stk_ayar set min_istemci_surum = null where id = 'tekil'");
  q("drop table if exists public.site_gelecek_deneme");
}
console.log(`── t-site-surum-kapisi.js: ${hata ? hata + " kırmızı" : "temiz"} ──`); process.exit(hata ? 1 : 0);
