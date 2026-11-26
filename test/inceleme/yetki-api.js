#!/usr/bin/env node
// DOĞRUDAN API YETKİ MATRİSİ (26 Kasım, kapsamlı inceleme). YALNIZ YEREL PostgreSQL; Supabase'e bağlanmaz.
// Her deneme, PostgREST'in bir isteği nasıl çalıştırdığının eşdeğeri: ayrı işlem · SET LOCAL ROLE anon|authenticated ·
// request.jwt.claims (e-posta) · request.headers (x-atolye-surum). Deneme sonunda işlem GERİ ALINIR (taban değişmez).
// Sonuç yalnız "hata verdi / vermedi" değildir: başarılı yazmada etkilenen satır sayısı ve yazılan değer okunur; retlerde
// SQLSTATE + iletinin kendisi yazılır (doğru gerekçe mi?).
// Kullanım: KOPRU_PG=<pg modülü> node yetki-api.js <veritabanı> [çıktı.json]
const { Client } = require(process.env.KOPRU_PG || "pg");
const db = process.argv[2] || "inc_taban";
const HESAP = {
  anon: null,
  "zeki (listede yok)": "zeki@atolye.local",
  "ayşe (yalnız stok)": "ayse@atolye.local",
  "ali (Yönetici)": "ali@atolye.local",
};
// [ad, sql, doğrulama sql'i (aynı işlemde, yazmadan sonra — gerçekten değişti mi?)]
// BEKLENEN (olması gereken): anon · zeki · ayşe · ali. Y = yazabilmeli, R = 42501 ile reddedilmeli, K = KRnnn kural reddi.
// Ayşe yalnız STOK modülünde yetkili: ürün kartı yazabilir; cari, sipariş, Tanımlar (renk) yazamamalı. Zeki listede yok: hiçbir şey.
const BEKLENEN = {
  "ürün adını değiştir (urunler UPDATE)": "RRYY", "ürün sil (urunler DELETE)": "RRRY",
  "sipariş miktarı (siparis_kalemleri UPDATE)": "RRRY", "sipariş kalemi rengi (bağı kopar)": "RRRY",
  "siparişi iptal et (siparisler UPDATE durum)": "RRRK", "sipariş sil (siparisler DELETE)": "RRRY",
  "Tanımlar: renk adını değiştir": "RRRY", "Tanımlar: bütün renkleri sil": "RRRY",
  "Tanımlar: kullanıcı listesine kendini Yönetici ekle": "RRRY", "Tanımlar: giriş denetimini kapat": "RRRY",
  "varyantı doğrudan sil (stk_varyant DELETE)": "RRRR", "stok fişi doğrudan ekle (stk_fis INSERT)": "RRRR",
  "cari unvanı (cariler UPDATE)": "RRRY", "cari sil (cariler DELETE)": "RRRY",
  "cari hareketi doğrudan ekle (car_hareket INSERT)": "RRRR", "ürün sürümünü elle düşür (urunler.surum)": "RRYY",
};
const DENEME = [
  ["ürün adını değiştir (urunler UPDATE)", `update public.urunler set ad = 'Kırık Ad' where id = 'inc-bot'`,
    `select ad from public.urunler where id = 'inc-bot'`],
  ["ürün sil (urunler DELETE)", `delete from public.urunler where id = 'inc-bot'`, `select count(*) from public.urunler where id = 'inc-bot'`],
  ["sipariş miktarı (siparis_kalemleri UPDATE)", `update public.siparis_kalemleri set miktar = 999 where id = 'kl-inc-40'`,
    `select miktar from public.siparis_kalemleri where id = 'kl-inc-40'`],
  ["sipariş kalemi rengi (bağı kopar)", `update public.siparis_kalemleri set renk = 'Yok Renk' where id = 'kl-inc-41'`,
    `select renk from public.siparis_kalemleri where id = 'kl-inc-41'`],
  ["siparişi iptal et (siparisler UPDATE durum)", `update public.siparisler set durum = 'İptal' where id = 'sp-inc-1'`,
    `select durum from public.siparisler where id = 'sp-inc-1'`],
  ["sipariş sil (siparisler DELETE)", `delete from public.siparisler where id = 'sp-inc-1'`, `select count(*) from public.siparisler where id = 'sp-inc-1'`],
  ["Tanımlar: renk adını değiştir", `update public.tanimlar set veri = jsonb_set(veri, '{renkler,1,ad}', '"Bozuk Ad"') where id = 'tekil'`,
    `select (select ad from public.stk_renk where id = 'r-vizon') || ' / kombi: ' || (select ad from public.stk_renk where id = 'k-1054')`],
  ["Tanımlar: bütün renkleri sil", `update public.tanimlar set veri = jsonb_set(jsonb_set(veri, '{renkler}', '[]'), '{renkKombinasyonlari}', '[]') where id = 'tekil'`,
    `select count(*) filter (where aktif) || ' etkin renk' from public.stk_renk where tur in ('renk', 'model')`],
  ["Tanımlar: kullanıcı listesine kendini Yönetici ekle", `update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (veri -> 'kullanicilar') || '[{"eposta":"zeki@atolye.local","rol":"Yönetici"}]') where id = 'tekil'`,
    `select jsonb_array_length(veri -> 'kullanicilar') from public.tanimlar where id = 'tekil'`],
  ["Tanımlar: giriş denetimini kapat", `update public.tanimlar set veri = jsonb_set(veri, '{girisAktifMi}', 'false') where id = 'tekil'`,
    `select veri ->> 'girisAktifMi' from public.tanimlar where id = 'tekil'`],
  ["varyantı doğrudan sil (stk_varyant DELETE)", `delete from public.stk_varyant where id = 'vry-inc-41'`, `select count(*) from public.stk_varyant where id = 'vry-inc-41'`],
  ["stok fişi doğrudan ekle (stk_fis INSERT)", `insert into public.stk_fis (id, tur, aciklama) values ('fis-sahte', 'giris', 'sahte')`,
    `select count(*) from public.stk_fis where id = 'fis-sahte'`],
  ["cari unvanı (cariler UPDATE)", `update public.cariler set unvan = 'Kırık' where id = 'inc-musteri'`, `select unvan from public.cariler where id = 'inc-musteri'`],
  ["cari sil (cariler DELETE)", `delete from public.cariler where id = 'inc-musteri'`, `select count(*) from public.cariler where id = 'inc-musteri'`],
  ["cari hareketi doğrudan ekle (car_hareket INSERT)", `insert into public.car_hareket (id, cari_id, tutar, yon) values ('ch-sahte', 'inc-musteri', 1000, 'borc')`,
    `select count(*) from public.car_hareket where id = 'ch-sahte'`],
  ["ürün sürümünü elle düşür (urunler.surum)", `update public.urunler set surum = 0 where id = 'inc-bot'`, `select surum from public.urunler where id = 'inc-bot'`],
];

(async () => {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: process.env.PGUSER || "postgres" });
  await c.connect();
  const sonuc = [];
  for (const [ad, sql, dogrula] of DENEME) {
    for (const [hesap, eposta] of Object.entries(HESAP)) {
      await c.query("begin");
      let s;
      try {
        await c.query(`select set_config('request.headers', $1, true)`, [JSON.stringify({ "x-atolye-surum": "1.744.37" })]);
        if (eposta) await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "authenticated", email: eposta, sub: require("crypto").createHash("md5").update(eposta).digest("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5") })]);
        else await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
        await c.query(`set local role ${eposta ? "authenticated" : "anon"}`);
        await c.query("savepoint d");
        try {
          const r = await c.query(sql);
          let deger = null;
          try { deger = Object.values((await c.query(dogrula)).rows[0] || {})[0]; } catch (e) { deger = `okunamadı: ${e.code}`; }
          s = { sonuc: r.rowCount > 0 ? "YAZDI" : "0 satır", satir: r.rowCount, deger };
        } catch (e) {
          await c.query("rollback to savepoint d");
          s = { sonuc: "RET", kod: e.code, ileti: String(e.message).slice(0, 110) };
        }
      } finally { await c.query("rollback"); }
      sonuc.push({ ad, hesap, ...s });
    }
  }
  await c.end();
  let son = ""; const hesaplar = Object.keys(HESAP); const ozet = { UYUMLU: 0, "AÇIK": 0, "FAZLA KISIT": 0 };
  for (const r of sonuc) {
    if (r.ad !== son) { console.log(`\n■ ${r.ad}`); son = r.ad; }
    const b = (BEKLENEN[r.ad] || "????")[hesaplar.indexOf(r.hesap)];
    const g = r.sonuc === "YAZDI" ? "Y" : r.sonuc === "RET" ? (/^KR/.test(r.kod || "") ? "K" : r.kod === "42501" ? "R" : "H") : "0";
    // H = başka hata (gerekçe yanlış: ör. tür hatası) · 0 = yetkili ama 0 satır. İkisi de beklenene uymaz.
    const karar = g === b ? "UYUMLU" : g === "Y" ? "AÇIK" : "FAZLA KISIT";
    ozet[karar] += 1; r.karar = karar; r.beklenen = b;
    console.log(`   ${karar === "UYUMLU" ? "✓" : "✗"} ${r.hesap.padEnd(20)} ${r.sonuc.padEnd(8)} ${r.sonuc === "RET" ? `${r.kod} ${r.ileti}` : `satır ${r.satir} · sonra: ${r.deger}`}${karar === "UYUMLU" ? "" : `   ← ${karar} (beklenen ${b})`}`);
  }
  console.log(`\n── yetki-api ${db}: ${ozet.UYUMLU} uyumlu · ${ozet["AÇIK"]} AÇIK (yetkisiz yazdı) · ${ozet["FAZLA KISIT"]} fazla kısıt / yanlış gerekçe ──`);
  if (process.argv[3]) require("fs").writeFileSync(process.argv[3], JSON.stringify(sonuc, null, 1));
})().catch((e) => { console.error("HATA", e); process.exit(1); });
