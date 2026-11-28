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
// PAKET_K=1: her taze kopyaya Paket K (52-k-uygula.sql, CRLF satır sonuyla) kurulur — aynı sınama "önce AÇIK, sonra hedefte" ölçer.
const PAKET_K = process.env.PAKET_K === "1";
const K_SQL = path.join(__dirname, "..", "..", "stok-v2", "guvenlik", "52-k-uygula.sql");
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
insert into public.cariler (id, unvan, tip, para_birimi) values ('inc-temiz', 'İnceleme Temiz', 'Müşteri', 'TRY'), ('inc-temiz-2', 'İnceleme Temiz 2', 'Müşteri', 'TRY');
insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ('inc-bot-3', 'İnceleme Bot 3', 'Mamul', 'çift', 'Beden', false, 1);
insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif) values ('vry-inc3-40', 'inc-bot-3', 'k-1054', 'b-40', 0, true);
insert into public.stk_fis (id, tur, tarih) values ('f-2', 'sayim', current_date);
insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar) values ('h-2', 'f-2', 'vry-inc3-40', 'inc-bot-3', 5);
insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama) values ('ch-yetim', 'silinmis-cari', current_date, 'Borç', 30, 'yetim hareket');
insert into public.stk_fis (id, tur, cari_id, tarih, tutar) values ('f-yetim', 'satis', 'silinmis-cari', current_date, 60);
insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, cari_id) values ('h-yetim', 'f-yetim', 'vry-inc-41', 'inc-bot', -2, 'silinmis-cari');
insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama, fis_id) values ('ch-yetim-fis', 'silinmis-cari', current_date, 'Borç', 60, 'yetim fişin hareketi', 'f-yetim');
insert into public.kas_hareket (id, hesap_id, sira, veri) values ('kh-yetim', 'yok', 1, '{"cariId":"silinmis-cari","tutar":15,"yon":"Giriş","aciklama":"yetim"}');
insert into public.hesaplar (id, ad, tur) values ('hs-1', 'İnceleme Kasa', 'kasa');
insert into public.hesap_hareketleri (id, hesap_id, tarih, yon, tutar) values ('hh-1', 'hs-1', current_date, 'Giriş', 50);
set session_replication_role = origin;`;
async function taze() {
  const ad = `bagrisk_${process.pid}_${++sayac}`;
  psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${SABLON}`); psql(ad, TOHUM);
  if (PAKET_K) { const g = path.join(require("os").tmpdir(), `52k-${process.pid}.crlf.sql`); fs.writeFileSync(g, fs.readFileSync(K_SQL, "utf8").replace(/\r?\n/g, "\r\n"));
    execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", ad, "-f", g], { stdio: ["ignore", "ignore", "pipe"] }); }
  const c = new Client({ host: process.env.PGHOST || "localhost", database: ad, user: process.env.PGUSER || "postgres" }); await c.connect();
  c.db = ad;
  // istemcinin yolu: işlem + jeton + authenticated rolü. Döner: "tamam" ya da "RET <kod> <ileti>"
  c.ali = async (sql, deg) => { await c.query("begin");
    try { await c.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', true), set_config('request.headers', '{"x-atolye-surum":"1.744.48"}', true)`);
      await c.query("set local role authenticated"); const r = await c.query(sql, deg); await c.query("commit"); return `tamam (${r.rowCount} satır)`; }
    catch (e) { await c.query("rollback"); return `RET ${e.code} ${String(e.message).replace(/\s+/g, " ").slice(0, 110)}`; } };
  // ikinci bağlantı (başka cihaz / başka işlem): jetonlu, işlemi ELLE açıp kapatır
  c.baska = async () => { const x = new Client({ host: process.env.PGHOST || "localhost", database: ad, user: process.env.PGUSER || "postgres" }); await x.connect();
    x.basla = async () => { await x.query("begin"); await x.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', true), set_config('request.headers', '{"x-atolye-surum":"1.744.48"}', true)`); };
    x.dene = async (sql, deg) => { try { const r = await x.query(sql, deg); return `tamam (${r.rowCount} satır)`; } catch (e) { return `RET ${e.code} ${String(e.message).replace(/\s+/g, " ").slice(0, 110)}`; } };
    return x; };
  c.say = async (sql, deg) => Number((await c.query(`select count(*)::int n from ${sql}`, deg)).rows[0].n);
  c.bitir = async () => { await c.end(); psql("postgres", `drop database if exists ${ad}`); };
  return c;
}
const arsivde = (c, tablo) => c.say(`public.silinen_arsiv where tablo = $1`, [tablo]);

(async () => {
  yaz(`bag-risk · şablon ${SABLON} · ${PAKET_K ? "PAKET K KURULU" : "paket K YOK (bugünkü canlı kurulum)"} · her durum taze kopyada · işlemler Yönetici (Ali) hesabıyla, istemcinin yolundan`);

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
    k_("B2 üretimin ürünü değiştirilemez (ataması / işçilik hareketi varken)", [/^RET/.test(b2), (await c.query(`select urun_id from public.uretim where id = 'ur-1'`)).rows[0].urun_id], [true, "inc-bot"]);
    const b3 = await c.ali(`update public.siparisler set cari_id = 'inc-usta' where id = 'sp-inc-1'`);
    const fisCari = (await c.query(`select cari_id from public.stk_fis where id = 'f-1'`)).rows[0].cari_id;
    yaz(`  B3 fişi kesilmiş siparişin carisini değiştirme → ${b3} · fiş f-1 carisi ${fisCari}`);
    k_("B3 fişi kesilmiş siparişin carisi değiştirilemez (fiş başka caride kalmaz)", /^RET/.test(b3), true);
    await c.bitir(); }

  { const c = await taze(); const r = await c.ali(`delete from public.urunler where id = 'inc-bot-3'`);
    const h = await c.say(`public.stk_hareket x where x.urun_id = 'inc-bot-3' and not exists (select 1 from public.urunler u where u.id = x.urun_id)`), v = await c.say(`public.stk_varyant v where v.urun_id = 'inc-bot-3' and not exists (select 1 from public.urunler u where u.id = v.urun_id)`);
    yaz(`\n■ S8 siparişi olmayan ama stok hareketi olan ürün silme → ${r} · ürünsüz stok hareketi ${h} · ürünsüz varyant ${v}`);
    k_("S8 stok hareketi olan ürün silinemez (hareket ve varyant ürünsüz kalmaz)", [/^RET/.test(r), h, v], [true, 0, 0]); await c.bitir(); }
  { const c = await taze();
    const k1 = await c.ali(`select public.kas_yaz($1::jsonb)`, [JSON.stringify({ hareketler: { satirlar: [{ id: "kh-y", hesapId: "yok-hesap", cariId: "yok-cari", tutar: 10, yon: "Giriş", tarih: "2026-11-28" }] } })]);
    yaz(`\n■ Y7 kasa hareketi, olmayan cari (kas_yaz) → ${k1} · yazılan satır ${await c.say(`public.kas_hareket where id = 'kh-y'`)}`);
    k_("Y7 olmayan cariye kasa hareketi yazılmaz", await c.say(`public.kas_hareket where id = 'kh-y'`), 0); await c.bitir(); }

  yaz("\n■ E · EŞZAMANLI: silme sürerken yeni kayıt / yeni kayıt yazılırken silme (iki ayrı bağlantı)");
  const yaris = async (ad, cocukSql, yetimSay, temizle) => {
    // E-a: SİLME ÖNCE başlar (işlenmemiş), sonra çocuk kayıt yazılmak istenir
    { const c = await taze(); const a = await c.baska(), b = await c.baska();
      await a.basla(); await a.query("set local role authenticated"); const sil = await a.dene(`delete from public.cariler where id = 'inc-temiz'`);
      await b.basla(); await b.query("set local lock_timeout = '6s'"); const bekleyen = b.dene(cocukSql);
      await new Promise((r) => setTimeout(r, 1200)); await a.query(/^RET/.test(sil) ? "rollback" : "commit");
      const cocuk = await bekleyen; await b.query(/^RET/.test(cocuk) ? "rollback" : "commit");
      const cariVar = await c.say(`public.cariler where id = 'inc-temiz'`), yetim = await c.say(yetimSay);
      yaz(`  ${ad} · silme önce: silme ${sil} · sonra gelen kayıt ${cocuk} → cari ${cariVar ? "duruyor" : "silindi"}, carisiz kayıt ${yetim}`);
      k_(`${ad} silme sürerken yazılan kayıt carisiz kalmaz`, yetim, 0); await a.end(); await b.end(); await c.bitir(); }
    // E-b: ÇOCUK KAYIT ÖNCE yazılır (işlenmemiş), sonra silme istenir
    { const c = await taze(); const a = await c.baska(), b = await c.baska();
      await b.basla(); const cocuk = await b.dene(cocukSql);
      await a.basla(); await a.query("set local role authenticated"); await a.query("set local lock_timeout = '6s'"); const bekleyen = a.dene(`delete from public.cariler where id = 'inc-temiz'`);
      await new Promise((r) => setTimeout(r, 1200)); await b.query(/^RET/.test(cocuk) ? "rollback" : "commit");
      const sil = await bekleyen; await a.query(/^RET/.test(sil) ? "rollback" : "commit");
      const cariVar = await c.say(`public.cariler where id = 'inc-temiz'`), yetim = await c.say(yetimSay);
      yaz(`  ${ad} · kayıt önce: kayıt ${cocuk} · sonra gelen silme ${sil} → cari ${cariVar ? "duruyor" : "silindi"}, carisiz kayıt ${yetim}`);
      k_(`${ad} kayıt yazılırken istenen silme kaydı carisiz bırakmaz`, yetim, 0); await a.end(); await b.end(); await c.bitir(); }
  };
  await yaris("E1 cari hareketi", `insert into public.car_hareket (id, cari_id, tarih, yon, tutar) values ('ch-e', 'inc-temiz', current_date, 'Borç', 5)`,
    `public.car_hareket h where h.id = 'ch-e' and not exists (select 1 from public.cariler x where x.id = h.cari_id)`);
  await yaris("E2 fiş", `insert into public.stk_fis (id, tur, cari_id, tarih) values ('f-e', 'satis', 'inc-temiz', current_date)`,
    `public.stk_fis f where f.id = 'f-e' and not exists (select 1 from public.cariler x where x.id = f.cari_id)`);
  await yaris("E3 sipariş", `insert into public.siparisler (id, siparis_no, tip, cari_id, durum, tarih, surum) values ('sp-e', 'SAT-9100', 'satis', 'inc-temiz', 'Bekliyor', current_date, 1)`,
    `public.siparisler s where s.id = 'sp-e' and (s.cari_id is null or not exists (select 1 from public.cariler x where x.id = s.cari_id))`);
  await yaris("E4 üretim ataması", `insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, miktar) values ('at-e', 'ur-2', 'Kesim', 'inc-temiz', 1)`,
    `public.uretim_atamalari a where a.id = 'at-e' and (a.personel_id is null or not exists (select 1 from public.cariler x where x.id = a.personel_id))`);
  await yaris("E5 kasa hareketi (cari JSON içinde)", `insert into public.kas_hareket (id, hesap_id, sira, veri) values ('kh-e', 'yok', 1, '{"cariId":"inc-temiz","tutar":5}')`,
    `public.kas_hareket h where h.id = 'kh-e' and not exists (select 1 from public.cariler x where x.id = h.veri ->> 'cariId')`);

  yaz("\n■ E6 · EŞZAMANLI: siparişin carisi değişirken fiş kesilir / fiş kesilirken siparişin carisi değişir");
  const celiski6 = `public.stk_fis f join public.siparisler s on s.id = f.siparis_id where f.id = 'f-e6' and not coalesce(f.iptal, false) and s.cari_id is distinct from f.cari_id`;
  { const c = await taze(); const a = await c.baska(), b = await c.baska();
    await a.basla(); await a.query("set local role authenticated"); const deg = await a.dene(`update public.siparisler set cari_id = 'inc-temiz' where id = 'sp-2'`);
    await b.basla(); await b.query("set local lock_timeout = '6s'"); const bek = b.dene(`insert into public.stk_fis (id, tur, cari_id, siparis_id, tarih) values ('f-e6', 'satis', 'inc-musteri', 'sp-2', current_date)`);
    await new Promise((r) => setTimeout(r, 1200)); await a.query(/^RET/.test(deg) ? "rollback" : "commit"); const fis = await bek; await b.query(/^RET/.test(fis) ? "rollback" : "commit");
    yaz(`  cari değişikliği önce: değişiklik ${deg} · sonra gelen fiş ${fis} → çelişen fiş ${await c.say(celiski6)}`);
    k_("E6 cari değişikliği sürerken kesilen fiş başka caride kalmaz", await c.say(celiski6), 0); await a.end(); await b.end(); await c.bitir(); }
  { const c = await taze(); const a = await c.baska(), b = await c.baska();
    await b.basla(); const fis = await b.dene(`insert into public.stk_fis (id, tur, cari_id, siparis_id, tarih) values ('f-e6', 'satis', 'inc-musteri', 'sp-2', current_date)`);
    await a.basla(); await a.query("set local role authenticated"); await a.query("set local lock_timeout = '6s'"); const bek = a.dene(`update public.siparisler set cari_id = 'inc-temiz' where id = 'sp-2'`);
    await new Promise((r) => setTimeout(r, 1200)); await b.query(/^RET/.test(fis) ? "rollback" : "commit"); const deg = await bek; await a.query(/^RET/.test(deg) ? "rollback" : "commit");
    yaz(`  fiş önce: fiş ${fis} · sonra gelen cari değişikliği ${deg} → çelişen fiş ${await c.say(celiski6)}`);
    k_("E6 fiş kesilirken istenen cari değişikliği fişi başka caride bırakmaz", await c.say(celiski6), 0); await a.end(); await b.end(); await c.bitir(); }

  yaz("\n■ E7 · EŞZAMANLI: üretimin ürünü değişirken teslim alınır / teslim alınırken ürün değişir (teslim, sunucudaki gibi üretim satırını kilitler)");
  // Teslim sunucuda `b4_teslim_denetle` ile üretim satırını FOR UPDATE kilitler, sonra fiş ve stok hareketi yazar — burada aynı sıra elle.
  const teslim = async (x) => { const k1 = await x.dene(`select 1 from public.uretim where id = 'ur-2' for update`); if (/^RET/.test(k1)) return k1;
    const k2 = await x.dene(`insert into public.stk_fis (id, tur, uretim_id, tarih) values ('f-e7', 'Üretim', 'ur-2', current_date)`); if (/^RET/.test(k2)) return k2;
    return x.dene(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, uretim_id, kaynak) values ('h-e7', 'f-e7', 'vry-inc-40', 'inc-bot', 3, 'ur-2', 'Üretim')`); };
  const celiski7 = `public.stk_hareket h join public.uretim u on u.id = h.uretim_id where h.id = 'h-e7' and not coalesce(h.iptal, false) and h.miktar > 0 and u.urun_id is distinct from h.urun_id`;
  { const c = await taze(); const a = await c.baska(), b = await c.baska();
    await a.basla(); await a.query("set local role authenticated"); const deg = await a.dene(`update public.uretim set urun_id = 'inc-bot-2' where id = 'ur-2'`);
    await b.basla(); await b.query("set local lock_timeout = '6s'"); const bek = teslim(b);
    await new Promise((r) => setTimeout(r, 1200)); await a.query(/^RET/.test(deg) ? "rollback" : "commit"); const t = await bek; await b.query(/^RET/.test(t) ? "rollback" : "commit");
    yaz(`  ürün değişikliği önce: değişiklik ${deg} · sonra gelen teslim ${t} → ürünü üretimle çelişen mamul girişi ${await c.say(celiski7)}`);
    k_("E7 ürün değişikliği sürerken alınan teslim, üretimin ürünüyle çelişen giriş bırakmaz", await c.say(celiski7), 0); await a.end(); await b.end(); await c.bitir(); }
  { const c = await taze(); const a = await c.baska(), b = await c.baska();
    await b.basla(); const t = await teslim(b);
    await a.basla(); await a.query("set local role authenticated"); await a.query("set local lock_timeout = '6s'"); const bek = a.dene(`update public.uretim set urun_id = 'inc-bot-2' where id = 'ur-2'`);
    await new Promise((r) => setTimeout(r, 1200)); await b.query(/^RET/.test(t) ? "rollback" : "commit"); const deg = await bek; await a.query(/^RET/.test(deg) ? "rollback" : "commit");
    yaz(`  teslim önce: teslim ${t} · sonra gelen ürün değişikliği ${deg} → çelişen giriş ${await c.say(celiski7)}`);
    k_("E7 teslim alınırken istenen ürün değişikliği teslimi çelişkili bırakmaz", await c.say(celiski7), 0); await a.end(); await b.end(); await c.bitir(); }

  yaz("\n■ N · MEVCUT YETİM SATIRDA İŞLEM (üst kaydı önceden silinmiş kayıt; doğrulanmamış yabancı anahtar bunları reddetmemeli)");
  { const c = await taze();
    const satir = (ek) => JSON.stringify({ satirlar: [{ id: "ch-yetim", cari_id: "silinmis-cari", tarih: new Date().toISOString().slice(0, 10), yon: "Borç", tutar: 30, aciklama: "yetim hareket", ...ek }] });
    const n1 = await c.ali(`select public.car_yaz($1::jsonb)`, [satir({ aciklama: "açıklama düzeltildi" })]);
    yaz(`  N1 yetim cari hareketinde açıklama düzeltme (car_yaz, cari aynı) → ${n1} · açıklama "${(await c.query(`select aciklama from public.car_hareket where id = 'ch-yetim'`)).rows[0].aciklama}"`);
    k_("N1 yetim cari hareketinin ilgisiz alanı düzeltilebilir", (await c.query(`select aciklama from public.car_hareket where id = 'ch-yetim'`)).rows[0].aciklama, "açıklama düzeltildi");
    const n2 = await c.ali(`select public.fis_iptal($1::jsonb)`, [JSON.stringify({ no: "f-yetim", sebep: "sınama" })]);
    const ip = (await c.query(`select (select iptal from public.stk_fis where id = 'f-yetim') f, (select iptal from public.stk_hareket where id = 'h-yetim') h, (select iptal from public.car_hareket where id = 'ch-yetim-fis') c`)).rows[0];
    yaz(`  N2 carisi silinmiş fişin iptali (fis_iptal) → ${n2} · iptal: fiş ${ip.f}, stok hareketi ${ip.h}, cari hareketi ${ip.c}`);
    k_("N2 carisi silinmiş fiş iptal edilebilir (fiş + stok hareketi + cari hareketi)", [ip.f, ip.h, ip.c], [true, true, true]);
    const n3 = await c.ali(`select public.car_yaz($1::jsonb)`, [satir({ cari_id: "inc-temiz", aciklama: "var olan cariye bağlandı" })]);
    yaz(`  N3 yetim cari hareketini VAR OLAN cariye bağlama (car_yaz) → ${n3} · cari ${(await c.query(`select cari_id from public.car_hareket where id = 'ch-yetim'`)).rows[0].cari_id}  (bilgi: elle düzeltme yolu; otomatik yapılmaz)`);
    const n4 = await c.ali(`select public.car_yaz($1::jsonb)`, [JSON.stringify({ satirlar: [{ id: "ch-yeni-yetim", cari_id: "silinmis-cari", tarih: new Date().toISOString().slice(0, 10), yon: "Borç", tutar: 5 }] })]);
    yaz(`  N4 silinmiş cariye YENİ hareket (car_yaz) → ${n4}`);
    k_("N4 silinmiş cariye yeni cari hareketi yazılamaz", await c.say(`public.car_hareket where id = 'ch-yeni-yetim'`), 0);
    const x = await c.baska(); await x.basla();
    const n5 = await x.dene(`update public.kas_hareket set veri = veri || '{"aciklama":"düzeltildi"}'::jsonb where id = 'kh-yetim'`); await x.query(/^RET/.test(n5) ? "rollback" : "commit"); await x.end();
    yaz(`  N5 carisi silinmiş kasa hareketinde açıklama düzeltme → ${n5}`);
    k_("N5 carisi silinmiş kasa hareketinin ilgisiz alanı düzeltilebilir", /^tamam/.test(n5), true);
    await c.bitir(); }

  yaz(`\nSONUÇ: ${gecen} hedefte · ${kalan} AÇIK${acik.length ? "\nAÇIK RİSKLER:\n  - " + acik.join("\n  - ") : ""}`);
  fs.writeFileSync(path.join(__dirname, PAKET_K ? "sonuc-bag-risk-paket-k.txt" : "sonuc-bag-risk.txt"), satirlar.join("\n") + "\n");
  process.exit(0);   // ölçüm: açık risk "sınama hatası" değildir
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
