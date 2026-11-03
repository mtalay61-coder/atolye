#!/usr/bin/env node
// MÜŞTERİ PORTALI HESAP EKSTRESİ — portal_hesap tarih karşılaştırması (3 Kasım düzeltmesi). Yalnız yerel PostgreSQL.
// Cari v2'den (1.727) beri cari_hareketleri.tarih METİN; eski tanım `h.tarih < bas` (date) → 42883, hesap sayfası açılmıyordu.
// Kurulum: test carisi + site hesabı (yönetici site_hesap_kaydet) + üç cari hareketi (tetikleyicisiz, doğrudan):
//   E: 120 gün önce Borç 100 (dönem öncesi → devir), I: 10 gün önce Borç 40 (dönemde), A: 5 gün önce Alacak 15, saatli ISO metin
//   (dönemde; "2026-…T10:00:00Z" biçimi de gün olarak doğru okunmalı).
// Kahin (girişsiz, portal_giris kodu ile): varsayılan dönem (son 3 ay) → devir 100, hareketler [I, A] gün sırasıyla, bakiye 125;
// açık dönem (bugün−130 … bugün−100) → yalnız E, devir 0. Eski tanım (git HEAD~ yerine depodaki ESKI_SITE dosyası verilirse) 42883.
// Kullanım: node t-portal-hesap.js <veritabanı> [eski-site-portal.sql]
const { spawnSync } = require("child_process");
const fs = require("fs");
const [DB = "atolye_guvenlik", ESKI] = process.argv.slice(2);
const sql = (s, rol = null, claims = "") => {
  const girdi = `\\set VERBOSITY verbose\nbegin; select set_config('request.jwt.claims', '${claims}', true);${rol ? ` set local role ${rol};` : ""}\n${s};\ncommit;`;
  const r = spawnSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: girdi, encoding: "utf8" });
  if (r.status === 0) return { ok: true, cikti: r.stdout.trim().split("\n").pop() };
  const m = String(r.stderr).match(/ERROR:\s+([0-9A-Z]{5}):\s*(.*)/);
  return { ok: false, kod: m ? m[1] : "HATA", hata: m ? m[2] : r.stderr };
};
const ALI = '{"email":"ali@atolye.local","role":"authenticated"}';
let hata = 0;
const kontrol = (ad, gercek, beklenen) => { const ok = JSON.stringify(gercek) === JSON.stringify(beklenen); if (!ok) hata += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] gerçek ${JSON.stringify(gercek)} · beklenen ${JSON.stringify(beklenen)}`); };
const on = `ph${Date.now() % 1e7}`, cari = `${on}-c`, kul = `${on}kul`, sifre = "Sifre123!";
const gun = (n) => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };

const hazir = sql(`insert into public.cariler (id, unvan, tip, ek) values ('${cari}', 'Portal Deneme ${on}', 'Müşteri', '{}');
  set local session_replication_role = replica;
  insert into public.car_hareket (id, cari_id, tarih, yon, tutar, para_birimi, defter) values
    ('${on}-E', '${cari}', '${gun(120)}', 'Borç', 100, 'TRY', 'Genel'),
    ('${on}-I', '${cari}', '${gun(10)}', 'Borç', 40, 'TRY', 'Genel'),
    ('${on}-A', '${cari}', '${gun(5)}T10:00:00.000Z', 'Alacak', 15, 'TRY', 'Genel')`);
if (!hazir.ok) { console.error("kurulum düştü:", hazir.hata); process.exit(2); }
const hesap = sql(`select public.site_hesap_kaydet('${cari}', '${kul}', '${sifre}')`, "authenticated", ALI);
if (!hesap.ok) { console.error("site hesabı kurulamadı:", hesap.hata); process.exit(2); }
const kod = sql(`select public.portal_giris('${kul}', '${sifre}')`, "anon").cikti;
const oku = (bas, bit) => {
  const r = sql(`select public.portal_hesap('${kod}', ${bas ? `'${bas}'` : "null"}, ${bit ? `'${bit}'` : "null"})::text`, "anon");
  if (!r.ok) return { kod: r.kod };
  const h = JSON.parse(r.cikti).hesap[0];
  return { devir: h.devir, bakiye: h.bakiye, hareketler: h.hareketler.map((x) => `${x.aciklama || ""}${x.tutar}:${String(x.tarih).slice(0, 10)}`) };
};
console.log(`t-portal-hesap · ${DB}`);
kontrol("PH.varsayilan-donem", oku(), { devir: { TRY: 100 }, bakiye: { TRY: 125 }, hareketler: [`40:${gun(10)}`, `15:${gun(5)}`] });
kontrol("PH.acik-donem", oku(gun(130), gun(100)), { devir: {}, bakiye: { TRY: 125 }, hareketler: [`100:${gun(120)}`] });
kontrol("PH.ters-donem-red", oku(gun(1), gun(10)), { kod: "P0001" });
if (ESKI) {   // düzeltmeden ÖNCEKİ tanım: aynı veriyle 42883 vermeli (hatanın kendisi)
  const s = fs.readFileSync(ESKI, "utf8"); const i = s.indexOf("create or replace function public.portal_hesap("); const j = s.indexOf("$$;", i) + 3;
  const yukle = sql(s.slice(i, j));
  kontrol("PH.eski-tanim-42883", yukle.ok ? oku() : { yukleme: yukle.hata }, { kod: "42883" });
  const ii = fs.readFileSync(require("path").join(__dirname, "../../../site-portal.sql"), "utf8");
  sql(ii.slice(ii.indexOf("create or replace function public.portal_hesap("), ii.indexOf("$$;", ii.indexOf("create or replace function public.portal_hesap(")) + 3));
  kontrol("PH.yeni-tanim-geri", oku().devir, { TRY: 100 });
}
console.log(`── t-portal-hesap.js: ${hata ? hata + " kırmızı" : "temiz"} ──`);
process.exit(hata ? 1 : 0);
