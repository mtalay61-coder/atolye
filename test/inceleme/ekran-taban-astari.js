#!/usr/bin/env node
// TABAN ASTARI ÖLÇÜ GRUBU ONARIMI — YEREL SINAMA (28 Kasım). Canlıdaki kimliklerle kopya: ürünün ölçü tipi Boyut, JUT [Boyut] varyantı,
// 36–42 varyantları Beden kayıtlarında (hepsi hareketsiz; sınamada 36'ya 100 açılış stoku verilir ki korunup korunmadığı ölçülsün).
// Ölçülen: (1) onarımdan ÖNCE gerçek istemciyle 36'ya stok girişi ne yapıyor, (2) onarım yalnız olcu_id'yi mi değiştiriyor,
// (3) onarımdan SONRA giriş mevcut varyanta mı yazılıyor, (4) geri alma ilk duruma döndürüyor mu.
// Yalnız yerel PostgreSQL. EKRAN_SABLON: b12_vo (K + V + Ö, vars.) | b12_k_crlf (yalnız K — bugünkü canlı).
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const { ekranAc, toastlar, O } = require(path.join(__dirname, "../ekran/ortak-ekran.js"));
const { Client } = require(process.env.KOPRU_PG || "pg");
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik"), SABLON = process.env.EKRAN_SABLON || "b12_vo", DB = "b12_ta", TAM = /_vo$/.test(SABLON);
const C = [["36", "vry-f1afa0598d2f464baa37f9aca719726b", "olcu-mvwf90xm-f30d", "olcu-mwngldrp-j8oh"], ["37", "vry-ddd8cbcbbac3438d85252ef99d0282ab", "olcu-mvwf90xm-aamo", "olcu-mwngldrp-wkwq"],
  ["38", "vry-93fb8745f97b40de80f665067dc95252", "olcu-mvwf90xm-k59x", "olcu-mwngldrp-58si"], ["39", "vry-749aa48caf9547068e0342bb157bfa06", "olcu-mvwf90xm-hfpg", "olcu-mwngldrp-gt2k"],
  ["40", "vry-1666208574f949ecb5698881b6a31aed", "olcu-mvwf90xm-qpqw", "olcu-mwngldrp-nwtx"], ["41", "vry-b1fde0f1627748dab6ead09b66146a8f", "olcu-mvwf90xm-07tn", "olcu-mwngldrp-192w"],
  ["42", "vry-52e47db113c54cb39f60090faf9e55a6", "olcu-mwdd947i-1b8s", "olcu-mwngldrp-xm78"]];
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1; yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const kisa = (s, n = 230) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const crlf = (ad) => { const g = path.join(os.tmpdir(), `${process.pid}-${ad}`); fs.writeFileSync(g, fs.readFileSync(path.join(G, ad), "utf8").replace(/\r?\n/g, "\r\n")); return g; };
const psql = (dosya) => { try { return execFileSync("psql", ["-X", "-q", "-A", "-t", "-F", " | ", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-h", "localhost", "-d", DB, "-f", dosya], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim(); } catch (e) { return "HATA: " + kisa(String(e.stderr || e.message), 300); } };
(async () => {
  const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect(); await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
  const c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect(); await c.query("begin"); await c.query("set local session_replication_role = replica");
  await c.query(`update public.stk_olcu set aktif = false, ad = ad || ' eski' where id in ('b-40', 'b-41')`);   // tohumdaki 40 / 41 [Beden] canlı kimlikli kayıtlarla çakışmasın
  for (const [ad, , beden, boyut] of C) await c.query(`insert into public.stk_olcu (id, ad, tur, aktif) values ($1, $3, 'Beden', true), ($2, $3, 'Boyut', true)`, [beden, boyut, ad]);
  await c.query(`insert into public.stk_olcu (id, ad, tur, aktif) values ('olcu-mwbunija-1enz', 'JUT', 'Boyut', true)`);
  await c.query(`update public.tanimlar set veri = jsonb_set(veri, '{bedenler}', $1::jsonb) where id = 'tekil'`, [JSON.stringify([...C.flatMap(([ad, , beden, boyut]) => [{ id: beden, ad, tip: "Beden" }, { id: boyut, ad, tip: "Boyut" }]), { id: "olcu-mwbunija-1enz", ad: "JUT", tip: "Boyut" }])]);
  await c.query(`insert into public.urunler (id, ad, kategori, malzeme_tipi, olcu_tipi, birim, stok_no) values ('h-ta', 'TABAN ASTARI', 'Hammadde', 'Astar', 'Boyut', 'çift', 7)`);
  for (const [, v, beden] of C) await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ($1, 'h-ta', null, $2)`, [v, beden]);
  await c.query(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id) values ('vry-f65548e06a9d46b6a60e34231e2532f2', 'h-ta', null, 'olcu-mwbunija-1enz')`);
  await c.query(`insert into public.stk_fis (id, tur, tarih) values ('f-acilis', 'Sayım', now())`); await c.query(`insert into public.stk_hareket (id, fis_id, varyant_id, urun_id, miktar, kaynak, tarih) values ('h-ac', 'f-acilis', $1, 'h-ta', 100, 'Sayım', now())`, [C[0][1]]);
  await c.query("commit");
  const foto = async () => (await c.query(`select jsonb_object_agg(v.id, jsonb_build_object('olcu_id', v.olcu_id, 'olcu', (select o.ad || ' [' || o.tur || ']' from public.stk_olcu o where o.id = v.olcu_id), 'diger', md5((to_jsonb(v) - 'olcu_id')::text),
      'hareket', (select count(*) from public.stk_hareket h where h.varyant_id = v.id), 'net', (select coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float from public.stk_hareket h where h.varyant_id = v.id))) v,
      (select md5(string_agg(to_jsonb(o)::text, '|' order by o.id)) from public.stk_olcu o) olculer, (select md5(to_jsonb(u)::text) from public.urunler u where u.id = 'h-ta') urun from public.stk_varyant v where v.urun_id = 'h-ta'`)).rows[0];
  const ozet = (f) => Object.values(f.v).map((x) => `${x.olcu} net ${x.net}`).sort().join(" · ");
  const giris = async (etiket) => { const a = await ekranAc(DB, {}); const s = a.sayfa; s.on("dialog", (d) => d.accept().catch(() => {}));
    await O.modulAc(s, "Stok"); await s.waitForTimeout(800); await s.locator('button[title^="Bağımsız stok girişi"]').first().click(); await s.waitForTimeout(500);
    await s.locator("[data-stok-giris-urun]").first().selectOption("h-ta"); await s.waitForTimeout(400);
    const n = await s.locator("[data-stok-giris-renk] option").count(); if (n > 1) await s.locator("[data-stok-giris-renk]").first().selectOption({ index: n - 1 }).catch(() => {}); await s.waitForTimeout(300);
    await s.locator('[data-stok-giris-miktar="36"]').first().fill("12"); await s.locator("[data-stok-giris-seridi] .btn-save").first().click(); await s.waitForTimeout(5000);
    const red = (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.durum} ${x.kod || ""}`);
    const t = kisa(await toastlar(s), 150); await a.tarayici.close(); await a.k.kapat(); const f = await foto(); yaz(`  ${etiket}: bildirim "${t}" · ret ${JSON.stringify(red)}\n    varyantlar: ${ozet(f)}`); return { f, red, t }; };
  yaz(`ekran-taban-astari · PostgreSQL kipi (şablon ${SABLON}${TAM ? " = Paket K + V + Ö" : " = Paket K (bugünkü canlı)"}) · istemci ${(fs.readFileSync(path.join(process.env.ISTEMCI_DIZIN, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1]}`);
  const f0 = await foto(); yaz(`\n■ 0 · ÖNCE: ${ozet(f0)}`);
  const plan = psql(path.join(G, "64-taban-astari-onkosul-salt-okur.sql")).split("\n"); k_("önkoşul sorgusu: yedi varyantın yedisi 'hazır'", plan.filter((x) => /hazır — yalnız olcu_id/.test(x)).length, 7);
  yaz(`\n■ 1 · ONARIMDAN ÖNCE gerçek istemciyle stok girişi: 36 → +12`);
  const g1 = await giris("giriş");
  if (TAM) k_("Paket Ö kuruluyken onarımdan önce giriş açık hatayla reddedilir (KR062), hiçbir şey yazılmaz", [/KR062/.test(g1.t), Object.keys(g1.f.v).length, g1.f.v[C[0][1]].net], [true, 8, 100]);
  else yaz(`    (bugünkü canlı kurulum: giriş Beden kaydındaki mevcut varyanta yazılır — ürün ayarıyla çelişen ama çalışan durum)`);
  const f1 = await foto();
  yaz(`\n■ 2 · ONARIM (64-taban-astari-uygula.sql, CRLF, iki kez)`);
  const u1 = psql(crlf("64-taban-astari-uygula.sql")), u2 = psql(crlf("64-taban-astari-uygula.sql")); if (/HATA/.test(u1 + u2)) yaz(`  ${u1}\n  ${u2}`);
  const f2 = await foto(); yaz(`  sonra: ${ozet(f2)}`);
  k_("yedi varyantın ölçü kaydı aynı adlı Boyut kaydı oldu", C.map(([, v]) => f2.v[v].olcu_id), C.map((x) => x[3]));
  k_("yedi varyantta olcu_id DIŞINDAKİ bütün sütunlar, hareket sayısı ve stok aynı; JUT varyantı hiç değişmedi", [C.map(([, v]) => [f2.v[v].diger, f2.v[v].hareket, f2.v[v].net]), f2.v["vry-f65548e06a9d46b6a60e34231e2532f2"]],
    [C.map(([, v]) => [f1.v[v].diger, f1.v[v].hareket, f1.v[v].net]), f1.v["vry-f65548e06a9d46b6a60e34231e2532f2"]]);
  k_("varyant sayısı aynı (yeni varyant yok); hiçbir ölçü kaydı ve ürün kaydı değişmedi", [Object.keys(f2.v).length, f2.olculer, f2.urun], [Object.keys(f1.v).length, f1.olculer, f1.urun]);
  k_("ikinci çalıştırma hata vermedi", /HATA/.test(u2), false);
  yaz(`\n■ 3 · ONARIMDAN SONRA gerçek istemciyle stok girişi: 36 → +12`);
  const g3 = await giris("giriş");
  if (TAM) k_("giriş MEVCUT 36 varyantına yazıldı (+12), yeni varyant açılmadı, ret yok", [g3.f.v[C[0][1]].net - f2.v[C[0][1]].net, Object.keys(g3.f.v).length, g3.red], [12, 8, []]);
  else yaz(`    (Paket Ö YOKKEN onarım tek başına yapılırsa: yeni varyant sayısı ${Object.keys(g3.f.v).length - 8} — sunucu "36"yı yine Beden kaydına çözer)`);
  yaz(`\n■ 4 · GERİ ALMA DOSYASI (CRLF)`); const f3 = await foto();
  const gr = psql(crlf("64-taban-astari-geri-al.sql")); if (/HATA/.test(gr)) yaz(`  ${gr}`); const f4 = await foto();
  k_("geri almadan sonra yedi varyantın ölçü kaydı ilk Beden kayıtları; diğer sütunlar ve stok aynı", [C.map(([, v]) => f4.v[v].olcu_id), C.map(([, v]) => [f4.v[v].diger, f4.v[v].net])], [C.map((x) => x[2]), C.map(([, v]) => [f3.v[v].diger, f3.v[v].net])]);
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-taban-astari${TAM ? "-kvo" : "-k"}.txt`), satirlar.join("\n") + "\n"); await c.end(); process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
