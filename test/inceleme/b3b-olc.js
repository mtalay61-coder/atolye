#!/usr/bin/env node
// B3b YENİDEN ÖLÇÜM (27 Kasım) — RPC yetki genişliği. YALNIZ yerel PostgreSQL (canlıyla hizalı taban; alt_yaz / car_yaz / stk_yetki /
// yetki_var_mi gövdeleri canlı 25b dökümüyle birebir). Soru: yalnız STOK yetkili personel, kendi modülü olmayan kayıtları RPC ile
// yazabiliyor mu — sipariş kalemi miktarı (alt_yaz), cari hareketi (car_yaz)? Üç paket (B4, B3a, B3a-2) bunu KAPATMAZ; bu betik
// kapatılmış gibi görünmesin diye beklenti YAZMAZ, sonucu raporlar. Cari virmanı fişi (fis_kes, uygulamanın gerçek isteğiyle) ayrıca
// test/ekran/ekran-cari-virman.js 7d adımında ölçülür. Her deneme ayrı işlemde, sonunda GERİ ALINIR.
// Kullanım: KOPRU_PG=<pg> node b3b-olc.js <veritabanı> [<veritabanı> …]
const { Client } = require(process.env.KOPRU_PG || "pg");
const HESAP = [["zeki (listede yok)", "zeki@atolye.local"], ["ayşe (yalnız stok)", "ayse@atolye.local"], ["ali (Yönetici)", "ali@atolye.local"]];
const D = [
  ["alt_yaz: sipariş kalemi miktarını 999 yap", `select public.alt_yaz($1::jsonb)`,
    { siparis_kalemleri: { satirlar: [{ id: "kl-inc-40", siparis_id: "sp-inc-1", urun_id: "inc-bot", urun_ad: "İnceleme Bot", renk: "1054 - Siyah/Vizon Yılan", beden: "40", miktar: 999, sira: 0 }] } },
    `select miktar::text from public.siparis_kalemleri where id = 'kl-inc-40'`],
  ["car_yaz: müşteriye 1.000 ₺ borç hareketi yaz", `select public.car_yaz($1::jsonb)`,
    { satirlar: [{ id: "ch-b3b-olc", cari_id: "inc-musteri", tarih: "2026-11-27", zaman: "2026-11-27T09:00:00.000Z", yon: "borc", tutar: 1000, para_birimi: "TRY", aciklama: "B3b ölçümü" }] },
    `select coalesce(sum(tutar), 0)::text from public.car_hareket where id = 'ch-b3b-olc' and not iptal`],
];
(async () => {
  for (const db of process.argv.slice(2)) {
    const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: "postgres" }); await c.connect();
    const paket = (await c.query(`select (select count(*) from pg_proc where proname like 'b4\\_%')::int b4, (select count(distinct tgrelid) from pg_trigger where tgname = 'b3a_yazma_koru')::int b3a,
      (select count(distinct tgrelid) from pg_trigger where tgname = 'b3a2_alan_koru')::int b3a2`)).rows[0];
    console.log(`\nb3b-olc · ${db} · B4 işlevi ${paket.b4} · B3a ${paket.b3a} tablo · B3a-2 ${paket.b3a2} tablo`);
    for (const [ad, sql, p, oku] of D) {
      console.log(`■ ${ad}`);
      for (const [h, e] of HESAP) {
        await c.query("begin"); let s;
        try {
          await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.44"}', true)`,
            [JSON.stringify({ role: "authenticated", email: e, sub: "00000000-0000-0000-0000-000000000001" })]);
          await c.query("set local role authenticated");
          await c.query(sql, [JSON.stringify(p)]);
          s = `YAZDI · sonra: ${Object.values((await c.query(oku)).rows[0])[0]}`;
        } catch (x) { s = `RET ${x.code} ${String(x.message).slice(0, 110)}`; }
        await c.query("rollback");
        console.log(`   ${h.padEnd(20)} ${s}`);
      }
    }
    await c.end();
  }
})().catch((e) => { console.error("HATA", e); process.exit(2); });
