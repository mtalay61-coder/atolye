#!/usr/bin/env node
// BAĞ RİSKLERİ — KALICI SINAMA (28 Kasım). Yalnız yerel PostgreSQL; sunucu düzeyi (istemcinin kullandığı yollar: doğrudan tablo
// yazması = PostgREST, ya da RPC). Her durum şablondan taze veritabanında koşar. Şablon: canlıya hizalı yapı + beş sunucu paketi +
// inceleme tohumu (b1-sina şablonu); bu dosya üstüne hareket / fiş / atama / hesap kayıtları ekler.
//
// AMAÇ: "üst kayıt silinince geçmiş ne oluyor", "var olmayan ya da yanlış üst kayda bağlanan kayıt kabul ediliyor mu" sorularını
// ÖLÇMEK. Beklenen = hedef davranış (geçmiş korunur, yetim / yanlış bağ reddedilir). Bugün KALAN her satır AÇIK bir risktir; ilgili
// paket kapatınca geçer. Bu dosya hiçbir şeyi düzeltmez.
// Kullanım: KOPRU_PG=<pg> node bag-risk.js [şablon]      (vars. b12_b1t)
const { Client } = require(process.env.KOPRU_PG || "pg");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const SABLON = process.argv[2] || "b12_b1t";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const acik = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else { kalan += 1; acik.push(ad); }
  yaz(`  ${ok ? "✓" : "✗ AÇIK"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · hedef ${JSON.stringify(b)}`}`); };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql], { encoding: "utf8" });
let sayac = 0;
const TOHUM = `
set session_replication_role = replica;
insert into public.cariler (id, unvan, tip, para_birimi) values ('inc-usta', 'İnceleme Usta', 'Tedarikçi', 'TRY');
insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, miktar) values ('at-1', 'ur-1', 'Kesim', 'inc-usta', 2);
insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama) values ('ch-1', 'inc-musteri', current_date, 'Borç', 100, 'satış');
insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama, uretim_id) values ('ch-2', 'inc-usta', current_date, 'Alacak', 40, 'işçilik', 'ur-1');
insert into public.stk_fis (id, tur, cari_id, siparis_id, tarih) values ('f-1', 'satis', 'inc-musteri', 'sp-inc-1', current_date);
insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kalem_id, siparis_id, cari_id) values ('h-1', 'f-1', 'vry-inc-40', 'inc-bot', -1, 'kl-inc-40', 'sp-inc-1', 'inc-musteri');
insert into public.siparisler (id, siparis_no, tip, cari_id, durum, tarih, surum) values ('sp-2', 'SAT-9002', 'satis', 'inc-musteri', 'Bekliyor', current_date, 1);
insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-2', 'sp-2', 'inc-bot', 'İnceleme Bot', '1054 - Siyah/Vizon Yılan', '40', 4, 0);
insert into public.stok_rezervasyonlari (id, siparis_id, urun_id, renk, beden, miktar, surum) values ('rz-2', 'sp-2', 'inc-bot', '1054 - Siyah/Vizon Yılan', '40', 1, 1);
insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ('inc-bot-2', 'İnceleme Bot 2', 'Mamul', 'çift', 'Beden', false, 1);
insert into public.hesaplar (id, ad, tur) values ('hs-1', 'İnceleme Kasa', 'kasa');
insert into public.hesap_hareketleri (id, hesap_id, tarih, yon, tutar) values ('hh-1', 'hs-1', current_date, 'Giriş', 50);
set session_replication_role = origin;`;
async function taze() {
  const ad = `bagrisk_${process.pid}_${++sayac}`;
  psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${SABLON}`); psql(ad, TOHUM);
  const c = new Client({ host: process.env.PGHOST || "localhost", database: ad, user: process.env.PGUSER || "postgres" }); await c.connect();
  c.db = ad;
  // istemcinin yolu: işlem + jeton + authenticated rolü. Döner: "tamam" ya da "RET <kod> <ileti>"
  c.ali = async (sql, deg) => { await c.query("begin");
    try { await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', true), set_config('request.headers', '{"x-atolye-surum":"1.744.48"}', true)`);
      await c.query("set local role authenticated"); const r = await c.query(sql, deg); await c.query("commit"); return `tamam (${r.rowCount} satır)`; }
    catch (e) { await c.query("rollback"); return `RET ${e.code} ${String(e.message).replace(/\s+/g, " ").slice(0, 110)}`; } };
  c.say = async (sql, deg) => Number((await c.query(`select count(*)::int n from ${sql}`, deg)).rows[0].n);
  c.bitir = async () => { await c.end(); psql("postgres", `drop database if exists ${ad}`); };
  return c;
}
const arsivde = (c, tablo) => c.say(`public.silinen_arsiv where tablo = $1`, [tablo]);

(async () => {
  yaz(`bag-risk · şablon ${SABLON} · her durum taze kopyada · işlemler Yönetici (Ali) hesabıyla, istemcinin yolundan`);

  yaz("\n■ S · ÜST KAYIT SİLİNİNCE GEÇMİŞ");
  { const c = await taze(); const r = await c.ali(`delete from public.siparisler where id = 'sp-2'`);
    const kalem = await c.say(`public.siparis_kalemleri where siparis_id = 'sp-2'`), rez = await c.say(`public.stok_rezervasyonlari where siparis_id = 'sp-2'`);
    yaz(`  S1 hareketsiz sipariş silme → ${r} · kalan kalem ${kalem} · kalan rezervasyon ${rez} · arşivde: sipariş ${await arsivde(c, "siparisler")}, kalem ${await arsivde(c, "siparis_kalemleri")}, rezervasyon ${await arsivde(c, "stok_rezervasyonlari")}`);
    k_("S1 sipariş silinince kalemleri ve rezervasyonu ya kalır ya da arşive alınır (iz bırakmadan silinmez)",
      [kalem > 0 || (await arsivde(c, "siparis_kalemleri")) > 0, rez > 0 || (await arsivde(c, "stok_rezervasyonlari")) > 0], [true, true]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.siparisler where id = 'sp-inc-1'`);
    yaz(`  S2 stok hareketi olan sipariş silme → ${r}`);
    k_("S2 stok hareketi olan sipariş silinemez; kalemleri ve hareketi yerinde", [/^RET/.test(r), await c.say(`public.siparis_kalemleri where siparis_id = 'sp-inc-1'`), await c.say(`public.stk_hareket where id = 'h-1'`)], [true, 2, 1]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.uretim where id = 'ur-1'`);
    const atama = await c.say(`public.uretim_atamalari where uretim_id = 'ur-1'`), yetim = await c.say(`public.car_hareket h where h.uretim_id = 'ur-1' and not exists (select 1 from public.uretim u where u.id = h.uretim_id)`);
    yaz(`  S3 ataması ve işçilik hareketi olan üretim silme → ${r} · kalan atama ${atama} · üretimi kalmayan işçilik hareketi ${yetim} · arşivde atama ${await arsivde(c, "uretim_atamalari")}`);
    k_("S3 ataması / işçiliği olan üretim silinmez ya da atamaları korunur; işçilik hareketi üretimsiz kalmaz", [atama > 0 || (await arsivde(c, "uretim_atamalari")) > 0, yetim], [true, 0]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.urunler where id = 'inc-bot'`);
    const v = await c.say(`public.stk_varyant v where v.urun_id = 'inc-bot' and not exists (select 1 from public.urunler u where u.id = v.urun_id)`);
    const h = await c.say(`public.stk_hareket x where x.urun_id = 'inc-bot' and not exists (select 1 from public.urunler u where u.id = x.urun_id)`);
    const kl = await c.say(`public.siparis_kalemleri where id in ('kl-inc-40', 'kl-inc-41', 'kl-2') and urun_id is null`), ur = await c.say(`public.uretim where id in ('ur-1', 'ur-2', 'ur-3') and urun_id is null`);
    const rz = await c.say(`public.stok_rezervasyonlari where id in ('rz-1', 'rz-2')`);
    yaz(`  S4 siparişi, üretimi, stok hareketi olan ürün silme → ${r} · ürünsüz varyant ${v} · ürünsüz stok hareketi ${h} · ürün bağı boşalan kalem ${kl} · üretim ${ur} · kalan rezervasyon ${rz}/2`);
    k_("S4 kullanılan ürün silinemez (bağlar boşalmaz, rezervasyon silinmez, varyant / hareket ürünsüz kalmaz)", [/^RET/.test(r), v, h, kl, ur, rz], [true, 0, 0, 0, 0, 2]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.cariler where id = 'inc-musteri'`);
    const ch = await c.say(`public.car_hareket h where h.cari_id = 'inc-musteri' and not exists (select 1 from public.cariler x where x.id = h.cari_id)`);
    const fi = await c.say(`public.stk_fis f where f.cari_id = 'inc-musteri' and not exists (select 1 from public.cariler x where x.id = f.cari_id)`);
    const sp = await c.say(`public.siparisler where id in ('sp-inc-1', 'sp-2') and cari_id is null`);
    yaz(`  S5 hareketi, siparişi, fişi olan cari silme → ${r} · carisiz cari hareketi ${ch} · carisiz fiş ${fi} · cari bağı boşalan sipariş ${sp}`);
    k_("S5 hareketi / siparişi / fişi olan cari silinemez (hareket ve fiş carisiz kalmaz, sipariş bağı boşalmaz)", [/^RET/.test(r), ch, fi, sp], [true, 0, 0, 0]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.cariler where id = 'inc-usta'`);
    const at = await c.say(`public.uretim_atamalari where id = 'at-1' and personel_id is null`), ch = await c.say(`public.car_hareket h where h.id = 'ch-2' and not exists (select 1 from public.cariler x where x.id = h.cari_id)`);
    yaz(`  S6 ataması ve işçilik hareketi olan usta carisi silme → ${r} · kişisi boşalan atama ${at} · carisiz işçilik hareketi ${ch}`);
    k_("S6 ataması / işçilik hareketi olan kişi silinemez", [/^RET/.test(r), at, ch], [true, 0, 0]); await c.bitir(); }
  { const c = await taze(); const r = await c.ali(`delete from public.hesaplar where id = 'hs-1'`);
    const hh = await c.say(`public.hesap_hareketleri where id = 'hh-1'`);
    yaz(`  S7 hareketi olan hesap (eski hesaplar tablosu) silme → ${r} · kalan hesap hareketi ${hh} · arşivde ${await arsivde(c, "hesap_hareketleri")}`);
    k_("S7 hareketi olan hesap silinemez ya da hareketleri korunur", [hh > 0 || (await arsivde(c, "hesap_hareketleri")) > 0], [true]); await c.bitir(); }

  yaz("\n■ Y · VAR OLMAYAN ÜST KAYDA BAĞLANAN KAYIT (yetim)");
  { const c = await taze();
    const y1 = await c.ali(`insert into public.uretim (id, siparis_no, urun_id, renk, surum, rezervasyon_siparis_id) values ('ur-y', 'URT-ur-y', 'inc-bot', 'Siyah', 1, 'yok-siparis')`);
    const y2 = await c.ali(`insert into public.site_talepleri (cari_id, cari_unvan) values ('yok-cari', 'Olmayan')`);
    const y3 = await c.ali(`insert into public.stok_rezervasyonlari (id, siparis_id, urun_id, renk, beden, miktar, surum) values ('rz-y', 'yok-siparis', 'inc-bot', 'Siyah', '40', 1, 1)`);
    const y4 = await c.ali(`update public.urunler set tedarikci_id = 'yok-cari' where id = 'inc-bot'`);
    const y5 = await c.ali(`select public.alt_yaz($1::jsonb)`, [JSON.stringify({ siparis_kalemleri: { satirlar: [{ id: "kl-y", siparis_id: "yok-siparis", urun_id: "inc-bot", urun_ad: "İnceleme Bot", renk: "Siyah", beden: "40", miktar: 1, sira: 0 }] } })]);
    const y6 = await c.ali(`select public.alt_yaz($1::jsonb)`, [JSON.stringify({ siparis_kalemleri: { satirlar: [{ id: "kl-y2", siparis_id: "sp-2", urun_id: "yok-urun", urun_ad: "Olmayan", renk: "Siyah", beden: "40", miktar: 1, sira: 5 }] } })]);
    yaz(`  Y1 üretim.rezervasyon_siparis_id = olmayan sipariş → ${y1}\n  Y2 site talebi, olmayan cari → ${y2}\n  Y3 rezervasyon, olmayan sipariş → ${y3}\n  Y4 ürün.tedarikci_id = olmayan cari → ${y4}\n  Y5 sipariş kalemi, olmayan sipariş → ${y5}\n  Y6 sipariş kalemi, olmayan ürün → ${y6}`);
    k_("Y var olmayan üst kayda bağlanan yazmaların HEPSİ reddedilir [Y1 üretim→sipariş, Y2 site talebi→cari, Y3, Y4, Y5, Y6]", [y1, y2, y3, y4, y5, y6].map((x) => /^RET/.test(x)), [true, true, true, true, true, true]);
    await c.bitir(); }

  yaz("\n■ B · YANLIŞ ÜST KAYDA BAĞLANMA");
  { const c = await taze();
    const b1 = await c.ali(`select public.alt_yaz($1::jsonb)`, [JSON.stringify({ siparis_kalemleri: { satirlar: [{ id: "kl-inc-40", siparis_id: "sp-2", urun_id: "inc-bot", urun_ad: "İnceleme Bot", renk: "1054 - Siyah/Vizon Yılan", beden: "40", miktar: 2, sira: 0 }] } })]);
    const nerede = (await c.query(`select siparis_id from public.siparis_kalemleri where id = 'kl-inc-40'`)).rows[0].siparis_id;
    yaz(`  B1 stok hareketi olan kalemi (kl-inc-40) başka siparişe taşıma → ${b1} · kalem şimdi ${nerede}; hareket h-1 hâlâ siparis_id = sp-inc-1`);
    k_("B1 stok hareketi olan kalem başka siparişe taşınamaz (hareketin siparişi ile kalemin siparişi ayrışmaz)", nerede, "sp-inc-1");
    const b2 = await c.ali(`update public.uretim set urun_id = 'inc-bot-2' where id = 'ur-1'`);
    yaz(`  B2 ataması ve işçilik hareketi olan üretimin ürününü değiştirme → ${b2}`);
    k_("B2 ataması / işçilik hareketi olan üretimin ürünü değiştirilemez", [/^RET/.test(b2), (await c.query(`select urun_id from public.uretim where id = 'ur-1'`)).rows[0].urun_id], [true, "inc-bot"]);
    const b3 = await c.ali(`update public.siparisler set cari_id = 'inc-usta' where id = 'sp-inc-1'`);
    const fisCari = (await c.query(`select cari_id from public.stk_fis where id = 'f-1'`)).rows[0].cari_id;
    yaz(`  B3 fişi kesilmiş siparişin carisini değiştirme → ${b3} · fiş f-1 carisi ${fisCari}`);
    k_("B3 fişi kesilmiş siparişin carisi değiştirilemez (fiş başka caride kalmaz)", /^RET/.test(b3), true);
    await c.bitir(); }

  yaz(`\nSONUÇ: ${gecen} hedefte · ${kalan} AÇIK${acik.length ? "\nAÇIK RİSKLER:\n  - " + acik.join("\n  - ") : ""}`);
  fs.writeFileSync(path.join(__dirname, "sonuc-bag-risk.txt"), satirlar.join("\n") + "\n");
  process.exit(0);   // ölçüm: açık risk "sınama hatası" değildir
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
