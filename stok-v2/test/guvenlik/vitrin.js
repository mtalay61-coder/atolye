#!/usr/bin/env node
// VİTRİN / SİTE / GİRİŞ AKIŞI — sitenin (newdiamond-web) girişsiz yaptığı çağrılar sırasıyla, gerçek veriyle (kalıcı):
//   anon: site_ayarlari, herkese_acik_vitrin, site_kayit_ol → ali (Yönetici, ERP): site_kayit_listesi, site_kayit_onayla →
//   anon: portal_giris (doğru / yanlış şifre), portal(kod), portal_hesap, portal_siparis (boş sepet), portal_cikis.
// Ayrıca girişsiz kullanıcının ERP'ye uzanamadığı (fis_kes, site_kayit_listesi, cariler okuma) ve ERP giriş öncesi `surum`
// okumasının açık olduğu denetlenir. Kullanım: node vitrin.js <veritabanı> <ek> — <ek> kullanıcı adını tekil yapar.
// Çıktı: her adımın sonucu (ok / SQLSTATE) + "beklenen"le karşılaştırma. Çıkış 0: hepsi beklenen.
const { spawnSync } = require("child_process");
const [DB = "atolye_guvenlik", EK = String(Date.now() % 100000)] = process.argv.slice(2);
const KIM = {
  anon: ["anon", ""],
  veli: ["authenticated", '{"email":"veli@atolye.local","role":"authenticated"}'],
  ali: ["authenticated", '{"email":"ali@atolye.local","role":"authenticated"}'],
};
function cagir(kim, ifade) {
  const [rol, claims] = KIM[kim];
  const r = spawnSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-d", DB], { encoding: "utf8",
    input: `\\set VERBOSITY verbose\nbegin; select set_config('request.jwt.claims', '${claims}', true); set local role ${rol};\nselect (${ifade})::text;\ncommit;` });
  if (r.status === 0) return { kod: "ok", deger: r.stdout.trim().split("\n").pop() };
  const m = String(r.stderr).match(/ERROR:\s+([0-9A-Z]{5}):\s*(.*)/);
  return { kod: m ? m[1] : "HATA", deger: m ? m[2].slice(0, 120) : String(r.stderr).slice(0, 200) };
}
const kul = `deneme${EK}`, sifre = "Sifre123!";
const adimlar = [];
const adim = (ad, kim, ifade, beklenen, sinama) => { const s = cagir(kim, ifade); const ok = s.kod === beklenen && (!sinama || sinama(s.deger));
  adimlar.push({ ad, kim, kod: s.kod, beklenen, ok }); if (!ok) console.error(`  ✗ ${ad}: ${s.kod} ${s.deger}`); return s.deger; };

adim("site_ayarlari", "anon", "public.site_ayarlari()", "ok");
adim("herkese_acik_vitrin", "anon", "public.herkese_acik_vitrin()", "ok");
adim("site_kayit_ol", "anon", `public.site_kayit_ol('{"unvan":"Deneme ${EK}","telefon":"5550000"}'::jsonb, '${kul}', '${sifre}')`, "ok");
adim("site_kayit_listesi (girişsiz → kapalı)", "anon", "(select count(*) from public.site_kayit_listesi())", "42501");
adim("site_kayit_listesi (yönetici)", "ali", `(select count(*) from public.site_kayit_listesi() where kullanici = '${kul}')`, "ok", (d) => d === "1");
const talep = adim("site_kayit_listesi (yönetici) → talep kimliği", "ali", `(select id::text from public.site_kayit_listesi() where kullanici = '${kul}')`, "ok");
adim("site_kayit_onayla (yönetici)", "ali", `public.site_kayit_onayla('${talep}', 'c-yeni')`, "ok");
adim("portal_giris (yanlış şifre → boş)", "anon", `coalesce(public.portal_giris('${kul}', 'yanlis-sifre'), 'BOS')`, "ok", (d) => d === "BOS");
const kod = adim("portal_giris", "anon", `public.portal_giris('${kul}', '${sifre}')`, "ok", (d) => d.length >= 16);
adim("portal (müşteri sayfası)", "anon", `public.portal('${kod}')`, "ok");
// portal_hesap: 3 Kasım tarih düzeltmesinden önce 42883 veriyordu (tarih metin < date); ayrıntılı sınama t-portal-hesap.js.
adim("portal_hesap", "anon", `public.portal_hesap('${kod}', null, null)`, "ok");
adim("portal_siparis (boş sepet → ret)", "anon", `public.portal_siparis('${kod}', '[]'::jsonb, 'deneme', null)`, "P0001");
adim("portal_cikis", "anon", `public.portal_cikis('${kod}')`, "ok");
adim("portal (çıkıştan sonra → geçersiz kod)", "anon", `public.portal('${kod}')`, "P0001");
adim("ERP fis_kes (girişsiz → kapalı)", "anon", "public.fis_kes('{}'::jsonb)", "42501");
adim("ERP cariler okuma (girişsiz → kapalı)", "anon", "(select count(*) from public.cariler)", "42501");
adim("ERP surum okuma (girişsiz, giriş öncesi sürüm)", "anon", "(select count(*) from public.surum)", "ok");
adim("yonetici_mi (girişsiz — storage politikası için açık, false döner)", "anon", "public.yonetici_mi()", "ok", (d) => d === "false");
adim("ERP site_hesap_listesi (kullanıcı)", "veli", "(select count(*) from public.site_hesap_listesi())", "ok");
adim("ERP yonetici_mi (yönetici)", "ali", "public.yonetici_mi()", "ok", (d) => d === "true");
adim("ERP yonetici_mi (kullanıcı)", "veli", "public.yonetici_mi()", "ok", (d) => d === "false");

const kirmizi = adimlar.filter((a) => !a.ok).length;
for (const a of adimlar) console.log(`  ${a.ok ? "✓" : "✗"} [${a.kim}] ${a.ad}: ${a.kod}${a.ok ? "" : ` (beklenen ${a.beklenen})`}`);
console.log(`── vitrin.js${process.env.GUVENLIK_SONRA ? " (sıkılaştırmadan sonra)" : " (önce)"}: ${kirmizi ? kirmizi + " kırmızı" : "temiz"} ──`);
process.exit(kirmizi ? 1 : 0);
