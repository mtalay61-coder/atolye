#!/usr/bin/env node
// EKRAN SINAMASI — FASON TİPİNİN ADI DEĞİŞİNCE ÖDEME YÖNÜ DEĞİŞMEZ (Paket F, 28 Kasım). Kalıcı sınama.
// Ekrandan: Tanımlar › Firma › Cari Tipleri'nde "Fasoncu" tipinin adı "Fason Atölye" yapılır. Sonra uygulamanın BELLEĞİNDEKİ ve
// SUNUCUDAKİ veriyle işçilik kuralı (`iscilikBolumu`, istemcinin kendi derlemesinden) çalıştırılır: fason ustanın bölüme bağlı
// prosesteki işçiliği CARİYE yazılmalı. Eski kodda (1.744.48) bölüm tahakkukuna döner → KALIR. Geçmiş tahakkuklara dokunulmaz.
// Yerel PostgreSQL (köprü); ISTEMCI_DIZIN = sınanacak istemcinin çalışma ağacı (test/test.html + test/erp.cjs).
const path = require("path"), fs = require("fs");
const { ekranAc, yenile } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const { iscilikBolumu } = require(path.join(ISTEMCI, "test", "erp.cjs"));
const SABLON = process.env.EKRAN_SABLON || "b12_crlf", DB = "b12_fason";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const yon = (b) => (b ? `bölüm tahakkuku (${b.ad})` : "cariye alacak");
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
(async () => {
  const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
  await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
  const c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect();
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`insert into public.cariler (id, unvan, tip, para_birimi, ek) values ('fs-1', 'Fason Usta', 'Personel', 'TRY', '{"altTip":"Fasoncu"}'), ('ic-1', 'İç Usta', 'Personel', 'TRY', '{}')`);
  await c.query(`insert into public.car_hareket (id, cari_id, tarih, yon, tutar, aciklama) values ('ch-gecmis', 'fs-1', current_date, 'Alacak', 75, 'geçmiş işçilik')`);
  await c.query(`update public.tanimlar set veri = veri || '{"prosesler":[{"id":"p-kesim","ad":"Kesim","sira":1}],"bolumler":[{"id":"b1","ad":"Kesimhane","prosesler":["Kesim"],"personel":[{"cariId":"ic-1"}]}]}'::jsonb where id = 'tekil'`);
  await c.query("commit");
  const a = await ekranAc(DB, { mudahale: async (s) => { await s.addInitScript(() => { window.__TANI_AC = true; }); } });
  const s = a.sayfa;
  const bellek = () => s.evaluate(() => { const g = window.__TANI.current; return { tanimlar: { cariTipleri: g.tanimlar.cariTipleri, bolumler: g.tanimlar.bolumler }, cariler: g.cariler.map((x) => ({ id: x.id, tip: x.tip, altTip: x.altTip, altTipId: x.altTipId })) }; });
  const karar = (v) => yon(iscilikBolumu(v.tanimlar, v.cariler, "Kesim", "fs-1"));
  yaz(`ekran-fason-ad · istemci ${surum()} (${ISTEMCI}) · ${DB} (şablon ${SABLON})`);
  k_("başlangıç: fason ustanın işçiliği cariye", karar(await bellek()), "cariye alacak");
  await s.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click(); await s.waitForTimeout(600);
  await s.locator('[data-tanim-sekme="firma"]').first().click(); await s.waitForTimeout(800);
  const kutu = s.locator('[data-cari-tipi-ad="Fasoncu"]').first();
  k_("Cari Tipleri'nde \"Fasoncu\" satırı var", await kutu.count(), 1);
  await kutu.scrollIntoViewIfNeeded(); await kutu.fill("Fason Atölye"); await kutu.press("Enter"); await s.waitForTimeout(8000);
  const b1 = await bellek();
  yaz(`     ad değişikliğinden sonra bellek: tipler ${JSON.stringify(b1.tanimlar.cariTipleri)} · fason usta ${JSON.stringify(b1.cariler.find((x) => x.id === "fs-1"))}`);
  k_("ekranda (bellekte): tip adı değişti, fason ustanın işçiliği YİNE cariye", [(b1.tanimlar.cariTipleri || []).map((t) => t.ad), karar(b1)], [["Fason Atölye"], "cariye alacak"]);
  const sunucu = async () => ({ tanimlar: (await c.query(`select jsonb_build_object('cariTipleri', veri -> 'cariTipleri', 'bolumler', veri -> 'bolumler') t from public.tanimlar where id = 'tekil'`)).rows[0].t,
    cariler: (await c.query(`select id, tip, ek ->> 'altTip' as "altTip", ek ->> 'altTipId' as "altTipId" from public.cariler`)).rows });
  const s1 = await sunucu();
  k_("sunucudaki veriyle: işçilik YİNE cariye", karar(s1), "cariye alacak");
  k_("sunucuda tip kaydı açık davranış alanı ve kimlik taşıyor; cari tipe kimlikle bağlı",
    [(s1.tanimlar.cariTipleri || []).map((t) => [t.ad, t.fason, !!t.id]), !!(s1.cariler.find((x) => x.id === "fs-1") || {}).altTipId], [[["Fason Atölye", true, true]], true]);
  await yenile(s); await s.waitForTimeout(1500);
  k_("sayfa yenilendikten sonra: işçilik YİNE cariye", karar(await bellek()), "cariye alacak");
  k_("bölüm personeli (İç Usta) bölüme — değişmedi", yon(iscilikBolumu((await bellek()).tanimlar, (await bellek()).cariler, "Kesim", "ic-1")), "bölüm tahakkuku (Kesimhane)");
  k_("geçmiş cari hareketi olduğu gibi (tahakkuklar değiştirilmedi)", (await c.query(`select cari_id, tutar::float t, aciklama from public.car_hareket where id = 'ch-gecmis'`)).rows[0], { cari_id: "fs-1", t: 75, aciklama: "geçmiş işçilik" });
  const red = (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
  k_("reddedilen yazma yok, sayfa hatası yok", [red, a.hatalar], [[], []]);
  yaz(`SONUÇ: ${gecen} geçti · ${kalan} kaldı`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-fason-ad${process.env.SONUC_EK || ""}.txt`), satirlar.join("\n") + "\n");
  await a.tarayici.close(); await a.k.kapat(); await c.end(); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
