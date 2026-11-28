#!/usr/bin/env node
// REÇETE RENGİ ↔ KİMLİK ÇELİŞKİSİNDE TÜKETİM (28 Kasım) — canlıdaki 27181 reçetesinin altı satırının YEREL kopyası.
// Reçete satırında hammadde rengi "KAHVE" yazıyor, renk kimliği ise etkin "Siyah" kaydını gösteriyor. Hammaddede hem Kahve hem
// Siyah varyantı var. Soru: gerçek istemci teslim aldığında stok HANGİ varyanttan düşüyor? Ölçüm ekrandan, gerçek teslimle.
// Canlıdaki gibi iki durum: astarın "Kahve" varyantı PASİF ve Tanımlar'da olmayan renk kaydına bağlı; tabanınki etkin kayda.
// Karşılaştırma için ikinci üretim: aynı reçete, renk adı birebir "Kahve" (kimlik yine Siyah).
// Yalnız yerel PostgreSQL (EKRAN_SABLON, vars. b12_crlf). ISTEMCI_DIZIN = sınanacak istemci (vars. yayındaki sürümün ağacı).
const fs = require("fs"), path = require("path");
const ORTAK = process.env.ORTAK_EKRAN || path.join(__dirname, "../ekran/ortak-ekran.js");
const { ekranAc, toastlar, O } = require(ORTAK);
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const SABLON = process.env.EKRAN_SABLON || "b12_crlf", DB = "b12_rrenk";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
const kisa = (s, n = 300) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
const tur = async (AD, baslik) => {
  const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
  await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
  const c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect(); await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.stk_renk (id, ad, tur, aktif) values ('rk-pasif', 'Kahve', 'renk', false), ('rk-etkin', 'Kahve', 'renk', true)`);
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id":"rk-etkin","ad":"Kahve","barkodKodu":"78"}]'::jsonb)
     || '{"prosesler":[{"id":"p-dikim","ad":"Dikim","sira":1}]}'::jsonb where id = 'tekil'`);
  await c.query(`insert into public.urunler (id, ad, kategori, malzeme_tipi, olcu_tipi, birim, stok_no) values ('h-astar', 'ASTAR', 'Hammadde', 'Deri', 'Beden', 'desi', 910), ('h-taban', 'TABAN', 'Hammadde', 'Taban', 'Beden', 'çift', 905)`);
  await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('v-astar-kahve', 'h-astar', 'rk-pasif', 'b-40'), ('v-astar-siyah', 'h-astar', 'r-siyah', 'b-40'),
     ('v-taban-kahve', 'h-taban', 'rk-etkin', 'b-40'), ('v-taban-siyah', 'h-taban', 'r-siyah', 'b-40')`);
  await c.query(`insert into public.stk_fis (id, tur, tarih) values ('f-acilis', 'Sayım', now())`);
  for (const [v, u] of [["v-astar-kahve", "h-astar"], ["v-astar-siyah", "h-astar"], ["v-taban-kahve", "h-taban"], ["v-taban-siyah", "h-taban"]])
    await c.query(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih) values ($1, 'f-acilis', $2, $3, 100, 'Sayım', now())`, [`h-ac-${v}`, v, u]);
  const recete = (ad) => JSON.stringify(["h-astar", "h-taban"].map((h, i) => ({ id: `rc-${i}`, hammaddeUrunId: h, hammaddeAd: h === "h-astar" ? "ASTAR" : "TABAN", renk: ad, renkId: "r-siyah", beden: "40",
    mamulRenk: "Siyah", mamulBeden: "40", proses: "Dikim", miktar: i === 0 ? 2 : 1, birim: i === 0 ? "desi" : "çift" })));
  await c.query(`update public.urunler set recete = $1::jsonb where id = 'ekr-bot'`, [recete(AD)]);
  for (const no of ["RR1"]) { const id = `rr-${no.toLowerCase()}`;
    await c.query(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $3::jsonb, '2026-11-28T08:00:00.000Z')`,
      [id, no, JSON.stringify([{ proses: "Dikim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "ekr-usta" }])]);
    await c.query(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
      values ($1, $2, 'Dikim', null, '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb)`, [`${id}-a`, id]); }
  await c.query("commit");
  const stok = async () => { const r = (await c.query(`select v.id, coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float m from public.stk_varyant v left join public.stk_hareket h on h.varyant_id = v.id
    where v.urun_id in ('h-astar', 'h-taban') group by v.id order by v.id`)).rows; return Object.fromEntries(r.map((x) => [x.id.replace("v-", ""), x.m])); };
  const fisSatir = async (uid) => (await c.query(`select h.varyant_id, h.miktar::float m, (select s.ad || case when s.aktif then '' else ' (pasif kayıt)' end from public.stk_varyant v join public.stk_renk s on s.id = v.renk_id where v.id = h.varyant_id) renk,
     h.ek ->> 'renk' yazan from public.stk_hareket h where h.uretim_id = $1 and h.miktar < 0 and not coalesce(h.iptal, false) order by h.varyant_id`, [uid])).rows.map((x) => `${x.varyant_id} ${x.m} [varyantın rengi: ${x.renk}]`);
  const a = await ekranAc(DB, {}); const s = a.sayfa; s.on("dialog", (d) => d.accept().catch(() => {}));
  const teslim = async (no) => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200);
    const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
    await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10"); await s.waitForTimeout(300);
    await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(5000); };
  const s0 = await stok(); yaz(`\n■ ${baslik} — 10 çift teslim; reçeteye göre tüketim: astar 20, taban 10`); yaz(`  başlangıç: ${JSON.stringify(s0)}`);
  await teslim("RR1"); const s1 = await stok();
  yaz(`  bildirim: ${kisa(await toastlar(s))}`);
  yaz(`  teslimden sonra: ${JSON.stringify(s1)}`); yaz(`  kesilen fişin çıkış satırları: ${JSON.stringify(await fisSatir("rr-rr1"))}`);
  yaz(`  DEĞİŞEN: ${JSON.stringify(Object.fromEntries(Object.keys(s1).filter((k) => s1[k] !== s0[k]).map((k) => [k, s1[k] - (s0[k] || 0)])))}`);
  const red = (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
  yaz(`  yeni açılan varyant: ${JSON.stringify((await c.query(`select v.id, v.urun_id, v.renk_id, s.ad, s.aktif from public.stk_varyant v left join public.stk_renk s on s.id = v.renk_id where v.urun_id in ('h-astar', 'h-taban') and v.id not like 'v-%'`)).rows)}`);
  yaz(`  yeni renk kaydı: ${JSON.stringify((await c.query(`select id, ad, tur from public.stk_renk where id not in ('rk-pasif', 'rk-etkin', 'r-siyah', 'r-vizon', 'k-1054', 'srenk-b0f70f1be079')`)).rows)} · reddedilen yazma: ${JSON.stringify(red)} · sayfa hatası: ${JSON.stringify(a.hatalar)}`);
  await a.tarayici.close(); await a.k.kapat(); await c.end();
};
(async () => {
  yaz(`ekran-recete-renk-tuketim · istemci ${surum()} · PostgreSQL kipi (şablon ${SABLON})`);
  yaz(`  kurulum: ASTAR ve TABAN hammaddelerinde birer "Kahve" ve "Siyah" varyantı, her biri 100 stok. ASTAR'ın Kahve'si PASİF ve Tanımlar'da olmayan renk kaydına, TABAN'ınki etkin kayda bağlı (canlıdaki gibi).`);
  await tur("KAHVE", `1 · reçetede renk adı "KAHVE", kimlik Siyah (canlıdaki altı satırın biçimi)`);
  await tur("Kahve", `2 · karşılaştırma: renk adı birebir "Kahve", kimlik yine Siyah`);
  await tur("Siyah", `3 · karşılaştırma: renk adı "Siyah", kimlik Siyah (uyumlu satır)`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-recete-renk-tuketim${process.env.SONUC_EK || ""}.txt`), satirlar.join("\n") + "\n");
  process.exit(0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
