#!/usr/bin/env node
// REÇETE RENGİ ↔ KİMLİK ÇELİŞKİSİNDE TÜKETİM (28 Kasım) — canlıdaki 27181 reçetesinin altı satırının YEREL kopyası.
// Reçete satırında hammadde rengi "KAHVE" yazıyor, renk kimliği ise etkin "Siyah" kaydını gösteriyor. Hammaddede hem Kahve hem
// Siyah varyantı var. Soru: gerçek istemci teslim aldığında stok HANGİ varyanttan düşüyor? Ölçüm ekrandan, gerçek teslimle.
// Canlıdaki gibi iki durum: astarın "Kahve" varyantı PASİF ve Tanımlar'da olmayan renk kaydına bağlı; tabanınki etkin kayda.
// Karşılaştırma için ikinci üretim: aynı reçete, renk adı birebir "Kahve" (kimlik yine Siyah).
// Yalnız yerel PostgreSQL (EKRAN_SABLON, vars. b12_crlf). ISTEMCI_DIZIN = sınanacak istemci (vars. yayındaki sürümün ağacı).
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const GERCEK = !!process.env.KOPRU_SUPABASE;   // yerel Supabase: giriş ekrandan, istekler gerçek API'den
const SB_PG = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (GERCEK && !process.env.KOPRU_SUPABASE_DB) process.env.KOPRU_SUPABASE_DB = SB_PG;
const G = path.join(__dirname, "..", "..", "stok-v2", "guvenlik"), PAKET_V = process.env.PAKET_V === "1" || /_vo?$/.test(process.env.EKRAN_SABLON || "");
const psqlSon = (args) => { const c = execFileSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env }).toString().trim().split("\n"); return c[c.length - 1]; };
const ORTAK = process.env.ORTAK_EKRAN || path.join(__dirname, "../ekran/ortak-ekran.js");
const { ekranAc, toastlar, O } = require(ORTAK);
const { Client } = require(process.env.KOPRU_PG || "pg");
const ISTEMCI = process.env.ISTEMCI_DIZIN || path.join(__dirname, "..", "..");
const SABLON = process.env.EKRAN_SABLON || "b12_crlf", DB = "b12_rrenk";
const satirlar = []; const yaz = (...a) => { const s = a.join(" "); satirlar.push(s); console.log(s); };
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1; yaz(`  ${ok ? "✓" : "✗ KALDI"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · beklenen ${JSON.stringify(b)}`}`); };
const BEKLENEN_RET = process.env.PAKET_V === "1" || /_vo?$/.test(process.env.EKRAN_SABLON || "") ? ["KAHVE", "Kahve"] : [];
const kisa = (s, n = 300) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const surum = () => (fs.readFileSync(path.join(ISTEMCI, "src/015-sabitler.jsx"), "utf8").match(/const SURUM = "([^"]+)"/) || [])[1];
const tur = async (AD, baslik) => {
  let c;
  if (GERCEK) { execFileSync("bash", [path.join(__dirname, "../sb/sb-sifirla.sh"), "paketli"], { stdio: ["ignore", "pipe", "pipe"] });
    psqlSon([SB_PG, "-f", path.join(G, "26-b1-uygula.sql")]); psqlSon([SB_PG, "-f", path.join(G, "52-k-uygula.sql")]);
    if (PAKET_V) psqlSon([SB_PG, "-f", path.join(G, "59-v-uygula.sql")]);
    psqlSon([SB_PG, "-c", "notify pgrst, 'reload schema'"]); c = new Client({ connectionString: SB_PG }); await c.connect();
  } else { const y = new Client({ host: "localhost", database: "postgres", user: "postgres" }); await y.connect();
    await y.query(`drop database if exists ${DB}`); await y.query(`create database ${DB} template ${SABLON}`); await y.end();
    c = new Client({ host: "localhost", database: DB, user: "postgres" }); await c.connect(); } await c.query("begin"); await c.query("set local session_replication_role = replica");
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
  await c.query("commit"); if (GERCEK) await new Promise((r) => setTimeout(r, 1500));
  const stok = async () => { const r = (await c.query(`select v.id, coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float m from public.stk_varyant v left join public.stk_hareket h on h.varyant_id = v.id
    where v.urun_id in ('h-astar', 'h-taban') group by v.id order by v.id`)).rows; return Object.fromEntries(r.map((x) => [x.id.replace("v-", ""), x.m])); };
  const fisSatir = async (uid) => (await c.query(`select h.varyant_id, h.miktar::float m, (select s.ad || case when s.aktif then '' else ' (pasif kayıt)' end from public.stk_varyant v join public.stk_renk s on s.id = v.renk_id where v.id = h.varyant_id) renk,
     h.ek ->> 'renk' yazan from public.stk_hareket h where h.uretim_id = $1 and h.miktar < 0 and not coalesce(h.iptal, false) order by h.varyant_id`, [uid])).rows.map((x) => `${x.varyant_id} ${x.m} [varyantın rengi: ${x.renk}]`);
  const a = await ekranAc(GERCEK ? undefined : DB, {}); const s = a.sayfa; s.on("dialog", (d) => d.accept().catch(() => {}));
  const teslim = async (no) => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200);
    const f = s.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
    await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10"); await s.waitForTimeout(300);
    await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(5000); };
  // KISMİ DEĞİŞİKLİK ÖLÇÜSÜ: teslimin dokunduğu bütün tablolar (fiş, stok hareketi, cari hareketi, atama, üretim, varyant, renk).
  const iz = async () => (await c.query(`select (select count(*) from public.stk_fis)::int fis, (select count(*) from public.stk_hareket)::int stok_hareketi, (select count(*) from public.car_hareket)::int cari_hareketi,
     (select count(*) from public.stk_varyant)::int varyant, (select count(*) from public.stk_renk)::int renk, (select count(*) from public.kas_hareket)::int kasa_hareketi,
     (select tamamlandi_mi from public.uretim_atamalari where id = 'rr-rr1-a') atama_teslim, (select asama from public.uretim where id = 'rr-rr1') asama,
     (select md5(proses_ilerleme::text || ek::text) from public.uretim where id = 'rr-rr1') uretim_ozet`)).rows[0];
  const i0 = await iz();
  const s0 = await stok(); yaz(`\n■ ${baslik} — 10 çift teslim; reçeteye göre tüketim: astar 20, taban 10`); yaz(`  başlangıç: ${JSON.stringify(s0)}`);
  await teslim("RR1"); const s1 = await stok();
  yaz(`  bildirim: ${kisa(await toastlar(s))}`);
  yaz(`  teslimden sonra: ${JSON.stringify(s1)}`); yaz(`  kesilen fişin çıkış satırları: ${JSON.stringify(await fisSatir("rr-rr1"))}`);
  const i1 = await iz(); const degisen = Object.keys(i1).filter((k) => String(i1[k]) !== String(i0[k]));
  yaz(`  kayıt sayıları önce → sonra: ${Object.keys(i1).filter((k) => k !== "uretim_ozet").map((k) => `${k} ${i0[k]}→${i1[k]}`).join(" · ")} · üretim kaydı ${i0.uretim_ozet === i1.uretim_ozet ? "aynı" : "DEĞİŞTİ"}`);
  if (BEKLENEN_RET.includes(AD)) k_(`"${AD}": teslim reddedildi ve HİÇBİR tabloda değişiklik kalmadı (fiş, stok, cari, kasa, atama, üretim, varyant, renk)`, [degisen, JSON.stringify(s1) === JSON.stringify(s0)], [[], true]);
  else if (PAKET_V) k_(`"${AD}": meşru teslim geçti (atama teslim alındı, fiş kesildi, yeni varyant açılmadı)`, [i1.atama_teslim, i1.fis - i0.fis >= 1, i1.varyant - i0.varyant], [true, true, 0]);
  yaz(`  DEĞİŞEN: ${JSON.stringify(Object.fromEntries(Object.keys(s1).filter((k) => s1[k] !== s0[k]).map((k) => [k, s1[k] - (s0[k] || 0)])))}`);
  const red = (a.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
  yaz(`  yeni açılan varyant: ${JSON.stringify((await c.query(`select v.id, v.urun_id, v.renk_id, s.ad, s.aktif from public.stk_varyant v left join public.stk_renk s on s.id = v.renk_id where v.urun_id in ('h-astar', 'h-taban') and v.id not like 'v-%'`)).rows)}`);
  yaz(`  yeni renk kaydı: ${JSON.stringify((await c.query(`select id, ad, tur from public.stk_renk where id not in ('rk-pasif', 'rk-etkin', 'r-siyah', 'r-vizon', 'k-1054', 'srenk-b0f70f1be079')`)).rows)} · reddedilen yazma: ${JSON.stringify(red)} · sayfa hatası: ${JSON.stringify(a.hatalar)}`);
  await a.tarayici.close(); await a.k.kapat(); await c.end();
};
(async () => {
  yaz(`ekran-recete-renk-tuketim · istemci ${surum()} · ${GERCEK ? `GERÇEK API KİPİ (yerel Supabase; giriş ekrandan) · Paket K kurulu · Paket V ${PAKET_V ? "KURULU" : "yok"}` : `PostgreSQL kipi (şablon ${SABLON})`}`);
  yaz(`  kurulum: ASTAR ve TABAN hammaddelerinde birer "Kahve" ve "Siyah" varyantı, her biri 100 stok. ASTAR'ın Kahve'si PASİF ve Tanımlar'da olmayan renk kaydına, TABAN'ınki etkin kayda bağlı (canlıdaki gibi).`);
  await tur("KAHVE", `1 · reçetede renk adı "KAHVE", kimlik Siyah (canlıdaki altı satırın biçimi)`);
  await tur("Kahve", `2 · karşılaştırma: renk adı birebir "Kahve", kimlik yine Siyah`);
  await tur("Siyah", `3 · karşılaştırma: renk adı "Siyah", kimlik Siyah (uyumlu satır)`);
  if (GERCEK) {
    yaz(`\n■ 4 · MEŞRU İLK STOK GİRİŞİ — gerçek giriş (yerel Auth) + gerçek API; hesap: yerel sınama kullanıcısı`);
    const U = process.env.KOPRU_SUPABASE, A = process.env.KOPRU_SUPABASE_ANAHTAR;
    const g = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: A, "Content-Type": "application/json" }, body: JSON.stringify({ email: "ali@atolye.local", password: "yerel-sinama" }) })).json();
    const rpc = async (ad, govde) => { const r = await fetch(`${U}/rest/v1/rpc/${ad}`, { method: "POST", headers: { apikey: A, Authorization: `Bearer ${g.access_token}`, "Content-Type": "application/json", "x-atolye-surum": surum() }, body: JSON.stringify(govde) });
      const t = await r.text(); return { durum: r.status, metin: kisa(t, 200) }; };
    const c = new Client({ connectionString: SB_PG }); await c.connect();
    const say = async (kosul) => Number((await c.query(`select count(*)::int n from public.stk_varyant v left join public.stk_renk r on r.id = v.renk_id where v.urun_id = 'h-astar' and ${kosul}`)).rows[0].n);
    const y1 = await rpc("stk_varyant_ac", { p: { urunId: "h-astar", renk: "Vizon Yılan", olcu: "40" } });
    yaz(`  ASTAR'da hiç olmayan renk (Vizon Yılan) için ilk varyant → HTTP ${y1.durum} ${y1.durum >= 400 ? y1.metin : ""}`);
    k_("üründe olmayan renk için ilk varyant açılır", [y1.durum < 300, await say(`r.ad = 'Vizon Yılan'`)], [true, 1]);
    const y2 = await rpc("stk_varyant_ac", { p: { urunId: "h-astar", renk: "Siyah", olcu: "41" } });
    k_("var olan rengin üründe olmayan bedeni (41) için ilk varyant açılır", [y2.durum < 300, await say(`r.ad = 'Siyah' and v.olcu_id = 'b-41'`)], [true, 1]);
    const y3 = await rpc("stk_varyant_ac", { p: { urunId: "h-astar", renk: "Kahve", olcu: "40" } });
    yaz(`  ASTAR'da pasif kayıttaki "Kahve" adıyla ikinci varyant isteği → HTTP ${y3.durum} ${y3.metin}`);
    k_(`aynı adla ikinci varyant isteği ${PAKET_V ? "reddedilir (KR060), varyant sayısı değişmez" : "(paketsiz) ikinci varyantı AÇAR"}`, [/KR060/.test(y3.metin), await say(`r.ad = 'Kahve' and v.olcu_id = 'b-40'`)], PAKET_V ? [true, 1] : [false, 2]);
    // STOK GİRİŞ FİŞİ — gerçek istemci (giriş ekrandan), gerçek API: yeni açılan varyanta 25, var olan Siyah / 40 varyantına 5.
    const hrk = async () => Object.fromEntries((await c.query(`select coalesce(r.ad, '-') || ' / ' || coalesce(o.ad, '-') || case when r.aktif then '' else ' (pasif renk kaydı)' end || ' [' || v.id || ']' a,
       coalesce(sum(h.miktar) filter (where not coalesce(h.iptal, false)), 0)::float m from public.stk_varyant v left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id
       left join public.stk_hareket h on h.varyant_id = v.id where v.urun_id = 'h-astar' group by 1 order by 1`)).rows.map((x) => [x.a, x.m]));
    const fisSay = async () => Number((await c.query(`select count(*)::int n from public.stk_fis`)).rows[0].n);
    const a2 = await ekranAc(undefined, {}); const s2 = a2.sayfa; s2.on("dialog", (d) => d.accept().catch(() => {}));
    const giris = async (renk, miktar) => { await O.modulAc(s2, "Stok"); await s2.waitForTimeout(800);
      if (!(await s2.locator("[data-stok-giris-seridi]").count())) { await s2.locator('button[title^="Bağımsız stok girişi"]').first().click(); await s2.waitForTimeout(500); }
      await s2.locator("[data-stok-giris-urun]").first().selectOption("h-astar"); await s2.waitForTimeout(300);
      await s2.locator("[data-stok-giris-renk]").first().selectOption(renk); await s2.waitForTimeout(300);
      await s2.locator('[data-stok-giris-miktar="40"]').first().fill(String(miktar));
      await s2.locator("[data-stok-giris-seridi] .btn-save").first().click(); await s2.waitForTimeout(5000); return kisa(await toastlar(s2), 160); };
    const h0 = await hrk(), f0 = await fisSay();
    const b1 = await giris("Vizon Yılan", 25); const h1 = await hrk(), f1 = await fisSay();
    const fark = (o, n) => Object.fromEntries(Object.keys(n).filter((k) => n[k] !== o[k]).map((k) => [k.replace(/ \[.*$/, ""), n[k] - (o[k] || 0)]));
    yaz(`  ekrandan stok girişi: ASTAR · Vizon Yılan · 40 → 25 · bildirim: ${b1}`); yaz(`  değişen varyantlar: ${JSON.stringify(fark(h0, h1))} · yeni fiş ${f1 - f0}`);
    k_("ilk stok giriş fişi: 25 yalnız yeni açılan Vizon Yılan / 40 varyantına yazıldı, başka varyant değişmedi, tek fiş kesildi", [fark(h0, h1), f1 - f0], [{ "Vizon Yılan / 40": 25 }, 1]);
    const b2 = await giris("Siyah", 5); const h2 = await hrk(), f2 = await fisSay();
    yaz(`  ekrandan stok girişi: ASTAR · Siyah · 40 → 5 · bildirim: ${b2}`); yaz(`  değişen varyantlar: ${JSON.stringify(fark(h1, h2))} · yeni fiş ${f2 - f1}`);
    k_("var olan varyanta giriş: 5 yalnız Siyah / 40 varyantına yazıldı", [fark(h1, h2), f2 - f1], [{ "Siyah / 40": 5 }, 1]);
    const red2 = (a2.k.gunluk || []).filter((x) => !["GET", "HEAD", "OPTIONS"].includes(x.m) && x.durum >= 400).map((x) => `${x.m} ${x.yol.slice(0, 40)} ${x.durum} ${x.kod || ""}`);
    k_("stok girişlerinde reddedilen yazma ve sayfa hatası yok; ASTAR'da varyant sayısı girişlerle değişmedi", [red2, a2.hatalar, Object.keys(h2).length - Object.keys(h0).length], [[], [], 0]);
    await a2.tarayici.close(); await a2.k.kapat();
    await c.end();
  }
  yaz(`\nSONUÇ: ${gecen} geçti · ${kalan} kaldı`);
  fs.writeFileSync(path.join(__dirname, `sonuc-ekran-recete-renk-tuketim${process.env.SONUC_EK || ""}${GERCEK ? "-supabase" : ""}.txt`), satirlar.join("\n") + "\n");
  process.exit(0);
})().catch((e) => { console.error("SINAMA DÜZENEĞİ HATASI:", e.stack || e); process.exit(2); });
