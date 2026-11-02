#!/usr/bin/env node
// R1b — KARŞILANANIN TEK YAZARI SUNUCU (v1.742.3). Yerel PostgreSQL (kos.sh veritabanı, KURALLAR AÇIK); Supabase'e DOKUNMAZ.
//
// Sorun (kontrol raporu, 31 Ekim): uygulamanın karşılanan türetme efekti (100-app.jsx `siparisKarsilananlariHesapla` →
// saveSiparisler) ve sipariş düzenleme / planlama gibi köprü yazmaları kalem satırını EKRANDAKİ karşılananla MUTLAK yazıyor
// (alt_yaz). Eski veriyle çalışan bir cihaz, sunucunun atomik olarak artırdığı değeri ezebiliyordu. Canlıdaki eski sürüm de bu
// efekti çalıştırdığı için korumanın SUNUCUDA olması gerekir.
// Ölçülen (her biri yerel PG'de, gerçek alt_yaz / fis_kes çağrılarıyla, ayrı bağlantılardan):
//   1) Eski veriyle iki cihaz (eski sürümün türetme efekti: alt_yaz karşılanan 5) aynı anda yazarken başka kullanıcı 5 teslim eder
//   2) Sipariş düzenleme (fiyat değişikliği) ekrandaki eski karşılananı (0) taşır — karşılanan EZİLMEMELİ, fiyat yazılmalı
//   3) 20'lik kaleme eşzamanlı 24 teslim — fazla 4 sipariş kaydında görünmeli (karşılanan = stok hareketleri)
//   4) Yeni kalem eklenirken karşılanan yazılır (ekleme serbest)
//   5) Eski uygulama fis_kes içinden mutlak karşılanan gönderir (artis yok) — fiş işlemi içinde serbest (geriye uyum)
//   6) Fiş sistemi KAPALIYKEN (v2 modülleri etkin değil) mutlak yazma bugünkü gibi çalışır
const { execFileSync, spawn } = require("child_process");
const DB = process.env.STOK_V2_DB || "atolye_stok_v2_sinama";
const psql = (sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB], { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
function rpcAyri(ad, p, { bekleSn = 0 } = {}) {
  const sql = `begin;
    select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true);
    set local role authenticated;
    select 'SONUC:' || public.${ad}($j$${JSON.stringify(p)}$j$::jsonb)::text;
    ${bekleSn ? `select pg_sleep(${bekleSn});` : ""}
    commit;`;
  return new Promise((coz) => {
    const c = spawn("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", DB]);
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.on("data", (d) => { err += d; });
    c.on("close", (kod) => { const s = (out.match(/SONUC:(.*)/) || [])[1]; coz({ ok: kod === 0 && !!s, sonuc: s ? JSON.parse(s) : null, hata: err.trim() }); });
    c.stdin.end(sql);
  });
}
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); }
};
const K = Date.now().toString(36);
const kalem = (id) => { const r = psql(`select coalesce(karsilanan, 0) || '|' || coalesce(fiyat, 0) from public.siparis_kalemleri where id = '${id}';`).split("|"); return { karsilanan: Number(r[0]), fiyat: Number(r[1]) }; };
const stokToplam = (id) => Number(psql(`select coalesce(-sum(h.miktar), 0) from public.stk_hareket h join public.stk_fis f on f.id = h.fis_id where h.kalem_id = '${id}' and not h.iptal and not f.iptal;`));
function siparisAc(no, miktar, karsilanan = 0) {
  const sip = `sip-b-${K}-${no}`, kal = `k-b-${K}-${no}`;
  psql(`insert into public.siparisler (id, siparis_no, tip, cari_id, durum) values ('${sip}', 'SB-${no}', 'Satış', 'c-yeni', 'Bekliyor');
        insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, karsilanan, fiyat, para_birimi, birim, sira)
        values ('${kal}', '${sip}', 'u-yeni', 'Yeni Ürün', 'Siyah', null, ${miktar}, ${karsilanan}, 100, 'TRY', 'çift', 0);`);
  return { sip, kal };
}
// Yeni uygulamanın teslim yükü (artis ile) — 081 siparisTeslimSunucuYuku biçimi
const teslimYuku = ({ sip, kal }, istek, adet, ekrandaKarsilanan) => ({ istek,
  fis: { aile: "stok", tur: "Satış", onek: "SF", cariId: "c-yeni", siparisId: sip, siparisNo: "SB" },
  stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: -adet, kaynak: "Satış", siparisId: sip, kalemId: kal, siparisNo: "SB" }] },
  alt: { siparis_kalemleri: { satirlar: [{ id: kal, siparis_id: sip, miktar: 20, karsilanan: Math.min(20, ekrandaKarsilanan + adet) }], artis: [{ id: kal, miktar: adet }] } } });
// Eski sürümün türetme efekti / sipariş düzenleme: köprü alt_yaz, kalem satırı MUTLAK (038 altV2Yuku)
const kalemSatiri = ({ sip, kal }, alanlar) => ({ siparis_kalemleri: { satirlar: [{ id: kal, siparis_id: sip, urun_id: "u-yeni", urun_ad: "Yeni Ürün", renk: "Siyah", miktar: 20, ...alanlar }] } });

(async () => {
  console.log(`  kurallar açık: ${psql("select public.fis_kural_aktif();")} · v2 modülleri: ${psql("select aktif and cari_aktif and alt_aktif and kasa_aktif from public.stk_ayar where id = 'tekil';")}`);

  console.log("1) Eski veriyle iki cihaz karşılananı mutlak yazarken (5) başka kullanıcı 5 teslim eder");
  const s1 = siparisAc(1, 20);
  await rpcAyri("fis_kes", teslimYuku(s1, `b-${K}-1a`, 5, 0));
  const [t1, x1, y1] = await Promise.all([
    rpcAyri("fis_kes", teslimYuku(s1, `b-${K}-1b`, 5, 0), { bekleSn: 0.8 }),
    (async () => { await uyu(200); return rpcAyri("alt_yaz", kalemSatiri(s1, { karsilanan: 5 })); })(),
    (async () => { await uyu(300); return rpcAyri("alt_yaz", kalemSatiri(s1, { karsilanan: 5 })); })(),
  ]);
  const d1 = kalem(s1.kal);
  console.log(`    SONUÇ → stok hareketleri: ${stokToplam(s1.kal)} · karşılanan: ${d1.karsilanan}`);
  bekle("1: üç istek de kabul edildi", [t1.ok, x1.ok, y1.ok], [true, true, true]);
  bekle("1: karşılanan = stok hareketleri = 10", [d1.karsilanan, stokToplam(s1.kal)], [10, 10]);

  console.log("2) Sipariş düzenleme: fiyat 120 yapılır, satırda ekrandaki eski karşılanan (0) var");
  const r2 = await rpcAyri("alt_yaz", kalemSatiri(s1, { karsilanan: 0, fiyat: 120 }));
  const d2 = kalem(s1.kal);
  console.log(`    SONUÇ → fiyat: ${d2.fiyat} · karşılanan: ${d2.karsilanan}`);
  bekle("2: fiyat yazıldı, karşılanan ezilmedi (10)", [r2.ok, d2.fiyat, d2.karsilanan], [true, 120, 10]);

  console.log("3) 20'lik kaleme eşzamanlı 24 teslim (önce 14, sonra iki kullanıcı 5'er; ikisinin ekranında 14)");
  const s3 = siparisAc(3, 20);
  await rpcAyri("fis_kes", teslimYuku(s3, `b-${K}-3a`, 14, 0));
  // F3: bu hesap testi bilerek fazla teslim kurar; artık açık yönetici onayı/gerekçe zorunlu.
  const onay = (p) => ({ ...p, fazlaTeslimOnayi: { onay: true, gerekce: "R1b: onaylı fazla miktar kırpılmamalı" } });
  const [g, h] = await Promise.all([rpcAyri("fis_kes", onay(teslimYuku(s3, `b-${K}-3g`, 5, 14)), { bekleSn: 0.5 }),
    (async () => { await uyu(150); return rpcAyri("fis_kes", onay(teslimYuku(s3, `b-${K}-3h`, 5, 14))); })()]);
  const d3 = kalem(s3.kal);
  console.log(`    SONUÇ → stok hareketleri: ${stokToplam(s3.kal)} · karşılanan: ${d3.karsilanan} (miktar 20)`);
  bekle("3: iki fiş, stok 24, karşılanan 24 — fazla 4 sipariş kaydında görünüyor", [g.ok, h.ok, stokToplam(s3.kal), d3.karsilanan], [true, true, 24, 24]);

  console.log("4) Yeni kalem eklenir (karşılanan 0)");
  const s4 = { sip: s1.sip, kal: `k-b-${K}-yeni` };
  const r4 = await rpcAyri("alt_yaz", kalemSatiri(s4, { karsilanan: 0, fiyat: 90 }));
  bekle("4: kalem eklendi, karşılanan 0", [r4.ok, kalem(s4.kal).karsilanan, kalem(s4.kal).fiyat], [true, 0, 90]);

  console.log("5) Eski uygulama (artis yok) fis_kes içinden mutlak karşılanan gönderir — fiş işlemi içinde serbest");
  const s5 = siparisAc(5, 20);
  const y5 = teslimYuku(s5, `b-${K}-5`, 3, 0);
  delete y5.alt.siparis_kalemleri.artis;
  const r5 = await rpcAyri("fis_kes", y5);
  bekle("5: kabul edildi, karşılanan 3", [r5.ok, kalem(s5.kal).karsilanan], [true, 3]);

  console.log("6) Fiş sistemi KAPALI (v2 modülleri etkin değil): mutlak yazma bugünkü gibi");
  const s6 = siparisAc(6, 20, 2);
  const r6 = psql(`begin;
    update public.stk_ayar set alt_aktif = false where id = 'tekil';
    select public.alt_yaz($j$${JSON.stringify(kalemSatiri(s6, { karsilanan: 7 }))}$j$::jsonb) is not null;
    select karsilanan from public.siparis_kalemleri where id = '${s6.kal}';
    rollback;`).split("\n").pop();
  bekle("6: karşılanan 7 yazıldı (koruma devrede değil)", Number(r6), 7);

  // Temizlik YOK (F2, 2 Kasım): teslim geçmişi olan kalem / sipariş silinemez (KR002); kimlikler koşuya özgü (K).
  console.log(hata ? "── R1b HATALI ──" : "── R1b temiz ──");
  process.exit(hata);
})().catch((e) => { console.error(e); process.exit(1); });
