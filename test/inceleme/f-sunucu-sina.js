#!/usr/bin/env node
// PAKET F (sunucu) SINAMASI (28 Kasım) — fason işareti ve ödeme yönü sunucuda korunuyor mu. Yalnız yerel PostgreSQL; istemcinin yolu
// (jetonlu authenticated + `x-atolye-surum` başlığı). Her durum taze kopyada. PAKET_F=0: paket kurulmadan (bugünkü durum) ölçer.
// "Fason mu" hesabı sınamada istemcinin kuralıyla (cariFasonMu) yapılır: tip kimlikle / adla bulunur, açık alan varsa o, yoksa adı tam
// "Fasoncu". Hedef: eski istemci ve yetkisiz kullanıcı bir kişinin ödeme yönünü değiştiremez; geçmiş hareketlere dokunulmaz.
const { Client } = require(process.env.KOPRU_PG || "pg");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const SABLON = process.argv[2] || "b12_crlf", PAKET = process.env.PAKET_F !== "0";
const F_SQL = path.join(__dirname, "..", "..", "stok-v2", "guvenlik", "54-f-uygula.sql");
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0; const acik = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else { kalan += 1; acik.push(ad); }
  yaz(`  ${ok ? "✓" : "✗ AÇIK"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · hedef ${JSON.stringify(b)}`}`); };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql], { encoding: "utf8" });
let sayac = 0;
const TOHUM = `set session_replication_role = replica;
insert into public.cariler (id, unvan, tip, para_birimi, ek) values ('fs-1', 'Fason Usta', 'Personel', 'TRY', '{"altTip":"Fasoncu"}'), ('kg-1', 'Kargo Firması', 'Tedarikçi', 'TRY', '{"altTip":"Kargo"}');
insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama) values ('ch-f-gecmis', 'fs-1', current_date, 'Alacak', 75, 'geçmiş işçilik');
update public.tanimlar set veri = jsonb_set(veri || '{"cariTipleri":[{"ad":"Fasoncu","temel":"Personel"},{"ad":"Kargo","temel":"Tedarikçi"}]}'::jsonb, '{kullanicilar}', (veri -> 'kullanicilar') ||
  '[{"id":"u-cem","kullaniciAdi":"Cem","eposta":"cem@atolye.local","rol":"Personel","yetkiler":{"cari":{"goruntuleme":true,"duzenleme":true,"kaydetme":true}}},
    {"id":"u-murat","kullaniciAdi":"Murat","eposta":"murat@atolye.local","rol":"Personel","yetkiler":{"cari":{"goruntuleme":true,"duzenleme":true,"kaydetme":true},"muhasebe":{"goruntuleme":true,"duzenleme":true,"kaydetme":true}}}]'::jsonb) where id = 'tekil';
set session_replication_role = origin;`;
async function taze() {
  const ad = `fsina_${process.pid}_${++sayac}`; psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${SABLON}`); psql(ad, TOHUM);
  if (PAKET) { const g = path.join(os.tmpdir(), `54f-${process.pid}.crlf.sql`); fs.writeFileSync(g, fs.readFileSync(F_SQL, "utf8").replace(/\r?\n/g, "\r\n")); execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", ad, "-f", g], { stdio: ["ignore", "ignore", "pipe"] }); }
  const c = new Client({ host: "localhost", database: ad, user: "postgres" }); await c.connect();
  c.yap = async (kim, surum, sql, deg) => { await c.query("begin");
    try { if (kim) { await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', $2, true)`, [JSON.stringify({ role: "authenticated", email: `${kim}@atolye.local` }), JSON.stringify(surum ? { "x-atolye-surum": surum } : {})]); await c.query("set local role authenticated"); }
      const r = await c.query(sql, deg); await c.query("commit"); return `tamam (${r.rowCount})`; }
    catch (e) { await c.query("rollback"); return `RET ${e.code} ${String(e.message).replace(/\s+/g, " ").slice(0, 120)}`; } };
  c.tipler = async () => (await c.query(`select veri -> 'cariTipleri' t from public.tanimlar where id = 'tekil'`)).rows[0].t;
  c.fason = async (id) => { const t = await c.tipler(); const x = (await c.query(`select ek ->> 'altTip' a, ek ->> 'altTipId' i from public.cariler where id = $1`, [id])).rows[0];
    const tip = (x.i && t.find((y) => y.id === x.i)) || t.find((y) => y.ad === x.a); return tip ? (typeof tip.fason === "boolean" ? tip.fason : tip.ad === "Fasoncu") : x.a === "Fasoncu"; };
  c.tipYaz = (kim, surum, liste) => c.yap(kim, surum, `update public.tanimlar set veri = jsonb_set(veri, '{cariTipleri}', $1::jsonb) where id = 'tekil'`, [JSON.stringify(liste)]);
  c.cariTip = (kim, surum, id, ek) => c.yap(kim, surum, `update public.cariler set ek = ek || $2::jsonb where id = $1`, [id, JSON.stringify(ek)]);
  c.bitir = async () => { await c.end(); psql("postgres", `drop database if exists ${ad}`); };
  return c;
}
const ESKI = "1.744.48", YENI = "1.744.50";
(async () => {
  yaz(`f-sunucu-sina · şablon ${SABLON} · ${PAKET ? "PAKET F (sunucu) KURULU" : "paket F YOK (bugünkü kurulum)"} · eski istemci ${ESKI}, yeni ${YENI}`);
  yaz("\n■ ESKİ İSTEMCİ (açık kalmış sekme) — Yönetici hesabıyla bile ödeme yönünü değiştirememeli");
  { const c = await taze();
    const r1 = await c.tipYaz("ali", ESKI, [{ ad: "Fason Atölye", temel: "Personel" }, { ad: "Kargo", temel: "Tedarikçi" }]);
    const r2 = await c.cariTip("ali", ESKI, "fs-1", { altTip: "Fason Atölye" });
    yaz(`  E1 eski istemci tipin adını değiştirir (Tanımlar) → ${r1}\n  E2 eski istemci carinin tip adını taşır → ${r2}\n     sonuç: tipler ${JSON.stringify(await c.tipler())} · fason usta fason mu: ${await c.fason("fs-1")}`);
    k_("E1–E2 eski istemcinin ad değişikliğinden sonra fason ustanın işçiliği YİNE cariye", await c.fason("fs-1"), true); await c.bitir(); }
  { const c = await taze(); await c.tipYaz("ali", YENI, [{ ad: "Fason Atölye", temel: "Personel", id: "ctip-1", fason: true }, { ad: "Kargo", temel: "Tedarikçi" }]); await c.cariTip("ali", YENI, "fs-1", { altTip: "Fason Atölye", altTipId: "ctip-1" });
    const r = await c.tipYaz("ali", ESKI, [{ ad: "Fason Atölye", temel: "Personel" }, { ad: "Kargo", temel: "Tedarikçi" }, { ad: "Nakliye", temel: "Tedarikçi" }]);
    const t = await c.tipler();
    yaz(`  E3 yeni istemci alanı yazdıktan sonra eski istemci cari tiplerini kaydeder (alanları bilmez) → ${r}\n     sonuç: ${JSON.stringify(t)}`);
    k_("E3 eski istemci fason alanını ve tip kimliğini SİLEMEZ; ödeme yönü değişmez", [(t.find((x) => x.ad === "Fason Atölye") || {}).fason, (t.find((x) => x.ad === "Fason Atölye") || {}).id, await c.fason("fs-1")], [true, "ctip-1", true]);
    const r4 = await c.yap("ali", ESKI, `update public.tanimlar set veri = jsonb_set(veri, '{birimler}', '[{"id":"b-x","ad":"koli"}]'::jsonb) where id = 'tekil'`);
    const r5 = await c.yap("ali", ESKI, `update public.cariler set unvan = 'Fason Usta A.Ş.' where id = 'fs-1'`);
    yaz(`  E4 eski istemci Tanımlar'ın BAŞKA bölümünü kaydeder (cari tipleri aynı) → ${r4}\n  E5 eski istemci carinin ünvanını değiştirir → ${r5}`);
    k_("E4–E5 eski istemcinin ilgisiz kayıtları ENGELLENMEZ", [/^tamam/.test(r4), /^tamam/.test(r5)], [true, true]); await c.bitir(); }

  yaz("\n■ YENİ İSTEMCİ — ad değişir, davranış değişmez; alan düşürülemez");
  { const c = await taze();
    const r1 = await c.tipYaz("ali", YENI, [{ ad: "Fason Atölye", temel: "Personel", id: "ctip-1", fason: true }, { ad: "Kargo", temel: "Tedarikçi" }]);
    const ara = await c.fason("fs-1");
    const r2 = await c.cariTip("ali", YENI, "fs-1", { altTip: "Fason Atölye", altTipId: "ctip-1" });
    yaz(`  Y1 tip adı + kimlik + fason alanı (Tanımlar) → ${r1} · (cari henüz eski adda: fason ${ara})\n  Y2 cari tip adı + kimliği → ${r2}`);
    k_("Y1–Y2 yeni istemcinin ad değişikliği geçer; her adımda fason usta fason kalır", [/^tamam/.test(r1), ara, /^tamam/.test(r2), await c.fason("fs-1")], [true, true, true, true]);
    const r3 = await c.tipYaz("ali", YENI, [{ ad: "Fason Atölye", temel: "Personel", id: "ctip-1" }, { ad: "Kargo", temel: "Tedarikçi" }]);
    yaz(`  Y3 fason alanı kayıttan düşürülür (alanı göndermeyen yazma) → ${r3}`);
    k_("Y3 bir kez yazılmış fason alanı düşürülemez; ödeme yönü değişmez", [(((await c.tipler()).find((x) => x.id === "ctip-1")) || {}).fason, await c.fason("fs-1")], [true, true]);
    k_("geçmiş cari hareketi olduğu gibi", (await c.query(`select cari_id, tutar::float t from public.car_hareket where id = 'ch-f-gecmis'`)).rows[0], { cari_id: "fs-1", t: 75 }); await c.bitir(); }

  yaz("\n■ YETKİ — fason durumunu kim değiştirebilir (sunucu kuralı; ekrandaki kutudan bağımsız)");
  { const c = await taze(); const L = (f) => [{ ad: "Fasoncu", temel: "Personel", id: "ctip-1", fason: f }, { ad: "Kargo", temel: "Tedarikçi" }];
    await c.tipYaz("ali", YENI, L(true));
    const r1 = await c.tipYaz("cem", YENI, L(false)); const f1 = await c.fason("fs-1");
    const r2 = await c.tipYaz("cem", YENI, [...L(true), { ad: "Dış Usta", temel: "Personel", id: "ctip-2", fason: true }]);
    const r3 = await c.tipYaz("cem", YENI, [...L(true), { ad: "Nakliye", temel: "Tedarikçi", id: "ctip-3", fason: false }]);
    const r4 = await c.cariTip("cem", YENI, "fs-1", { altTip: "Kargo", altTipId: null }); const f4 = await c.fason("fs-1");
    const r5 = await c.cariTip("cem", YENI, "kg-1", { altTip: "Fasoncu", altTipId: "ctip-1" }); const f5 = await c.fason("kg-1");
    yaz(`  Cem (cari: düzenleme + kaydetme; muhasebe YOK):\n   K1 fason işaretini kapatır → ${r1}\n   K2 fason işaretli YENİ tip açar → ${r2}\n   K3 fason OLMAYAN yeni tip açar → ${r3}\n   K4 fason ustayı fason olmayan tipe alır → ${r4}\n   K5 fason olmayan cariyi fason tipe alır → ${r5}`);
    k_("K1, K2, K4, K5 muhasebe yetkisi olmayan kullanıcı kimsenin ödeme yönünü değiştiremez", [/^RET/.test(r1), f1, /^RET/.test(r2), /^RET/.test(r4), f4, /^RET/.test(r5), f5], [true, true, true, true, true, true, false]);
    k_("K3 fason olmayan yeni tip açmak engellenmez (cari yetkisi yeter)", /^tamam/.test(r3), true);
    const m1 = await c.cariTip("murat", YENI, "kg-1", { altTip: "Fasoncu", altTipId: "ctip-1" }); const a1 = await c.tipYaz("ali", YENI, L(false));
    yaz(`  Murat (cari + muhasebe düzenleme): cariyi fason tipe alır → ${m1}\n  Ali (Yönetici): fason işaretini kapatır → ${a1}`);
    k_("muhasebe düzenleme yetkisi olan ve Yönetici değiştirebilir", [/^tamam/.test(m1), /^tamam/.test(a1)], [true, true]);
    const j = await c.yap(null, null, `update public.tanimlar set veri = jsonb_set(veri, '{cariTipleri}', '[{"ad":"Fasoncu","temel":"Personel"}]'::jsonb) where id = 'tekil'`);
    yaz(`  jetonsuz bağlantı (SQL Editor) → ${j}  (bilgi: öteki korumalardaki gibi kuralın dışında)`); await c.bitir(); }

  yaz("\n■ TESLİM — bayat istemci fason kişinin işçiliğini bölüm tahakkukuna yazamaz");
  { const c = await taze();
    await c.query(`insert into public.cariler (id, unvan, tip, para_birimi, ek) values ('ic-1', 'İç Usta', 'Personel', 'TRY', '{}')`);
    await c.query(`insert into public.uretim (id, siparis_no, urun_id, renk, surum, ek) values ('ur-f', 'URT-ur-f', 'inc-bot', 'Siyah', 1, '{"bolumTahakkuklari":[{"id":"tah-eski","bolumId":"b1","personelId":"fs-1","tutar":10}]}')`).catch(async () => {
      await c.query(`insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ('f-urun', 'F Ürün', 'Mamul', 'çift', 'Beden', false, 1)`);
      await c.query(`insert into public.uretim (id, siparis_no, urun_id, renk, surum, ek) values ('ur-f', 'URT-ur-f', 'f-urun', 'Siyah', 1, '{"bolumTahakkuklari":[{"id":"tah-eski","bolumId":"b1","personelId":"fs-1","tutar":10}]}')`); });
    const ekle = (kim, id, kisi) => c.yap(kim, ESKI, `update public.uretim set ek = jsonb_set(ek, '{bolumTahakkuklari}', (ek -> 'bolumTahakkuklari') || $1::jsonb) where id = 'ur-f'`, [JSON.stringify([{ id, bolumId: "b1", personelId: kisi, tutar: 350 }])]);
    const t1 = await ekle("ali", "tah-1", "fs-1"), t2 = await ekle("ali", "tah-2", "ic-1");
    const t3 = await c.yap("ali", ESKI, `update public.uretim set ek = ek || '{"not":"başka alan"}'::jsonb where id = 'ur-f'`);
    const idler = (await c.query(`select array(select e ->> 'id' from jsonb_array_elements(ek -> 'bolumTahakkuklari') e order by 1) a from public.uretim where id = 'ur-f'`)).rows[0].a;
    yaz(`  T1 fason usta için YENİ bölüm tahakkuku → ${t1}\n  T2 fason olmayan kişi için bölüm tahakkuku → ${t2}\n  T3 eski tahakkuku olan üretimde başka alan → ${t3}\n     üretimdeki tahakkuklar: ${JSON.stringify(idler)}`);
    k_("T1 fason kişi için yeni bölüm tahakkuku yazılamaz; T2 fason olmayan için yazılır; T3 eski tahakkuk ve ilgisiz alan etkilenmez", [/^RET/.test(t1), /^tamam/.test(t2), /^tamam/.test(t3), idler], [true, true, true, ["tah-2", "tah-eski"]]); await c.bitir(); }

  yaz(`\nSONUÇ: ${gecen} hedefte · ${kalan} AÇIK${acik.length ? "\nAÇIK:\n  - " + acik.join("\n  - ") : ""}`);
  fs.writeFileSync(path.join(__dirname, PAKET ? "sonuc-f-sunucu-sina.txt" : "sonuc-f-sunucu-sina-paketsiz.txt"), satirlar.join("\n") + "\n");
  process.exit(0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
