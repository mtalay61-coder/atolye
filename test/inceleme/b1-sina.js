#!/usr/bin/env node
// B1 SINAMASI — tanim_renk_ad_degistir (stok-v2/guvenlik/26-b1-renk-ad-degistir.sql). YALNIZ yerel PostgreSQL.
// Her durum ŞABLONDAN yeni bir veritabanında (createdb -T) koşar; iki ayrı bağlantı = iki cihaz. Sonuç "hata verdi" değil: kayıtların
// renk metni, bağlı olup olmadıkları, sürümleri, miktarları ve Tanımlar hâli tek tek karşılaştırılır.
// Kullanım: KOPRU_PG=<pg> node b1-sina.js <şablon-db>   (şablon: inc_taban + 26-b1 + bu dosyanın TOHUM'u, aşağıda kurulur)
const { Client } = require(process.env.KOPRU_PG || "pg");
const { execFileSync } = require("child_process");
const SABLON = process.argv[2] || "inc_b1t";
let gecen = 0, kalan = 0; const satirlar = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); ok ? gecen++ : kalan++;
  const s = `  ${ok ? "✓" : "✗"} ${ad}: ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`; console.log(s); satirlar.push(s); return ok; };
const psql = (db, sql) => execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db, "-c", sql], { encoding: "utf8" });
let sayac = 0;
async function yeniDb() {
  const ad = `inc_b1_${process.pid}_${++sayac}`;
  psql("postgres", `drop database if exists ${ad}`); psql("postgres", `create database ${ad} template ${SABLON}`);
  return ad;
}
async function baglan(db, eposta) {
  const c = new Client({ host: process.env.PGHOST || "localhost", database: db, user: process.env.PGUSER || "postgres" });
  await c.connect();
  c.olarak = async (fn) => {   // PostgREST eşdeğeri: işlem + rol + jeton
    await c.query("begin");
    try {
      if (eposta) {
        await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.headers', '{"x-atolye-surum":"1.744.38"}', true)`, [JSON.stringify({ role: "authenticated", email: eposta })]);
        await c.query("set local role authenticated");
      }
      const r = await fn(c); await c.query("commit"); return r;
    } catch (e) { await c.query("rollback"); throw e; }
  };
  return c;
}
const RPC = (c, p) => c.query("select public.tanim_renk_ad_degistir($1::jsonb) as r", [JSON.stringify(p)]).then((x) => x.rows[0].r);
const DEGIS = { renk_id: "r-vizon", yeni_ad: "Vizon Deri", eski_ad: "Vizon Yılan" };
const ESKI = "1054 - Siyah/Vizon Yılan", YENI = "1054 - Siyah/Vizon Deri";

// Bütün bağların fotoğrafı (sunucudan)
async function foto(c) {
  const q = async (s) => (await c.query(s)).rows;
  return {
    tanim: (await q(`select (select r ->> 'ad' from jsonb_array_elements(veri -> 'renkler') r where r ->> 'id' = 'r-vizon') as a from public.tanimlar`))[0].a,
    stk: (await q(`select string_agg(id || '=' || ad, ' | ' order by id) as a from public.stk_renk`))[0].a,
    kalem: (await q(`select string_agg(id || ':' || renk || ':' || miktar::float, ' | ' order by id) as a from public.siparis_kalemleri`))[0].a,
    bagsiz: (await q(`select count(*)::int as n from public.siparis_kalemleri kl where not exists (select 1 from public.stk_varyant v join public.stk_renk r on r.id = v.renk_id
                        where v.urun_id = kl.urun_id and v.aktif and public.stk_nrm(r.ad) = public.stk_nrm(kl.renk))`))[0].n,
    sipSurum: (await q(`select string_agg(id || ':' || surum, ' | ' order by id) as a from public.siparisler`))[0].a,
    uretim: (await q(`select string_agg(id || ':' || renk || ':s' || surum, ' | ' order by id) as a from public.uretim`))[0].a,
    rez: (await q(`select string_agg(id || ':' || renk || ':s' || surum, ' | ' order by id) as a from public.stok_rezervasyonlari`))[0].a,
    koli: (await q(`select string_agg(id || ':' || (select string_agg(x ->> 'renk', ',') from jsonb_array_elements(veri -> 'kalemler') x), ' | ' order by id) as a from public.lst_kayit where tablo = 'koliler'`))[0].a,
    recete: (await q(`select string_agg(coalesce(r ->> 'mamulRenk', '-') || '/' || coalesce(r ->> 'mamulRenkId', '-') || '>' || coalesce(r ->> 'renk', '-') || '/' || coalesce(r ->> 'renkId', '-'), ' | ' order by o)
                        as a from public.urunler, jsonb_array_elements(recete) with ordinality e(r, o) where id = 'inc-bot'`))[0].a,
    resim: (await q(`select string_agg(k, ',' order by k) as a from public.urunler, jsonb_object_keys(renk_resimleri) k where id = 'inc-bot'`))[0].a,
    barkod: (await q(`select string_agg(b ->> 'renk', ',') as a from public.urunler, jsonb_array_elements(harici_barkodlar) b where id = 'inc-bot'`))[0].a,
    urunSurum: (await q(`select surum from public.urunler where id = 'inc-bot'`))[0].surum,
  };
}
const SONRA = (ilk) => ({
  ...ilk,
  tanim: "Vizon Deri",
  stk: "k-1054=1054 - Siyah/Vizon Deri | r-siyah=Siyah | r-vizon=Vizon Deri",
  kalem: `kl-inc-40:${YENI}:2 | kl-inc-41:${YENI}:3`,
  sipSurum: ilk.sipSurum.replace(/sp-inc-1:(\d+)/, (m, s) => `sp-inc-1:${Number(s) + 1}`),
  uretim: `ur-1:${YENI}:s2 | ur-2:Siyah:s1 | ur-3:Vizon Deri:s2`,
  rez: `rz-1:Vizon Deri:s5`,
  koli: `ko-1:${YENI},Siyah`,
  // reçete: [kombi etiketi → yeni etiket, kimlik yok] [düz ad, damgasız → yeni ad + damga] [ÇELİŞKİ: damga r-vizon, ad Siyah → DOKUNULMAZ]
  // [başka rengin damgası r-siyah, ad Vizon Yılan → DOKUNULMAZ (damga başka renk)]
  recete: `${YENI}/->Vizon Deri/r-vizon | Siyah/->Siyah/r-vizon | ${YENI}/->Vizon Yılan/r-siyah`,
  resim: `${YENI},Siyah`,
  barkod: `${YENI},Siyah`,
  urunSurum: ilk.urunSurum + 1,
});

(async () => {
  // ŞABLON tohumu (inc_taban'a ek): üretim, rezervasyon, koli (lst_kayit), ürün reçetesi / resim / barkod
  if (process.env.SABLON_KUR) {
    psql("postgres", `drop database if exists ${SABLON}`); psql("postgres", `create database ${SABLON} template inc_taban`);
    execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", SABLON, "-f", process.env.SABLON_KUR], { stdio: "inherit" });
    psql(SABLON, `
      insert into public.uretim (id, urun_id, renk, surum) values ('ur-1', 'inc-bot', '${ESKI}', 1), ('ur-2', 'inc-bot', 'Siyah', 1), ('ur-3', 'inc-bot', 'vizon  yılan', 1);
      insert into public.stok_rezervasyonlari (id, urun_id, renk, beden, miktar, surum) values ('rz-1', 'inc-bot', 'VİZON YILAN', '40', 1, 4);
      insert into public.lst_kayit (tablo, id, sira, veri) values ('koliler', 'ko-1', 1, '{"id":"ko-1","kalemler":[{"renk":"${ESKI}","beden":"40","miktar":2},{"renk":"Siyah","beden":"41","miktar":1}]}');
      update public.urunler set
        recete = '[{"mamulRenk":"${ESKI}","renk":"Vizon Yılan"},{"mamulRenk":"Siyah","renk":"Siyah","renkId":"r-vizon"},{"mamulRenk":"${ESKI}","renk":"Vizon Yılan","renkId":"r-siyah"}]',
        renk_resimleri = '{"${ESKI}":"resim-1","Siyah":"resim-2"}',
        harici_barkodlar = '[{"renk":"${ESKI}","beden":"40","barkod":"111"},{"renk":"Siyah","beden":"41","barkod":"222"}]'
      where id = 'inc-bot';`);
  }

  console.log("\n■ D1 — tam güncelleme (Yönetici): bütün bağlar tek işlemde, miktarlar aynı, sürümler arttı");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    const once = await foto(a);
    const r = await a.olarak((c) => RPC(c, DEGIS));
    k_("dönüş", { kalem: r.kalem, siparis: r.siparis, uretim: r.uretim, rez: r.rezervasyon, koli: r.koli, urun: r.urun, celiski: r.celiskili_recete_satiri },
      { kalem: 2, siparis: 1, uretim: 2, rez: 1, koli: 1, urun: 1, celiski: 1 });
    const sonra = await foto(a); const b = SONRA(once);
    for (const x of Object.keys(b)) k_(`D1 ${x}`, sonra[x], b[x]);
    k_("D1 bağsız kalem", sonra.bagsiz, 0); await a.end(); }

  console.log("\n■ D2 — ad değişikliğinden SONRA bayat cihaz eski adla yeni kalem / üretim / koli yazar → güncel ada çevrilir, bağlı");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local"); const b = await baglan(db, "ali@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    await b.olarak(async (c) => {
      await c.query(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-bayat', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', $1, '40', 7, 9)`, [ESKI]);
      await c.query(`insert into public.uretim (id, urun_id, renk, surum) values ('ur-bayat', 'inc-bot', 'Vizon Yılan', 1)`);
    });
    const f = await foto(a);
    k_("D2 bayat kalem yeni adda", f.kalem.includes(`kl-bayat:${YENI}:7`), true);
    k_("D2 bayat üretim yeni adda", f.uretim.includes("ur-bayat:Vizon Deri"), true);
    k_("D2 bağsız kalem", f.bagsiz, 0);
    await a.end(); await b.end(); }

  for (const sira of ["önce kalem (açık işlem), sonra ad değişikliği", "önce ad değişikliği (açık işlem), sonra kalem"]) {
    console.log(`\n■ D3 — eşzamanlı: ${sira}`);
    const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local"); const b = await baglan(db, "ali@atolye.local");
    const kalemEkle = (c) => c.query(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-es', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', $1, '41', 6, 8)`, [ESKI]);
    await b.query("begin"); await a.query("begin");
    await a.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', true)`); await a.query("set local role authenticated");
    let bekledi = false;
    if (sira.startsWith("önce kalem")) {
      await kalemEkle(b);                                   // b'nin işlemi açık
      const p = RPC(a, DEGIS).then((r) => r);               // a kilitte beklemeli
      await new Promise((r) => setTimeout(r, 700));
      const kilit = (await b.query(`select count(*)::int as n from pg_locks where not granted`)).rows[0].n; bekledi = kilit > 0;
      await b.query("commit"); await p; await a.query("commit");
    } else {
      await RPC(a, DEGIS);                                   // a'nın işlemi açık (kilitler alındı)
      const p = kalemEkle(b);                                // b kilitte beklemeli
      await new Promise((r) => setTimeout(r, 700));
      const kilit = (await a.query(`select count(*)::int as n from pg_locks where not granted`)).rows[0].n; bekledi = kilit > 0;
      await a.query("commit"); await p; await b.query("commit");
    }
    const f = await foto(a);
    k_(`D3 ikinci işlem kilitte bekledi`, bekledi, true);
    k_(`D3 eşzamanlı kalem yeni adda`, f.kalem.includes(`kl-es:${YENI}:6`), true);
    k_(`D3 bağsız kalem`, f.bagsiz, 0);
    await a.end(); await b.end();
  }

  console.log("\n■ D4 — sonda bilerek hata (ürünler güncellenirken) → TAM geri alma");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    psql(db, `create function public._sina_hata() returns trigger language plpgsql as 'begin raise exception ''SINAMA: son adımda hata''; end';
              create trigger _sina_hata before update on public.urunler for each row execute function public._sina_hata();`);
    const once = await foto(a);
    let hata = ""; try { await a.olarak((c) => RPC(c, DEGIS)); } catch (e) { hata = e.message; }
    k_("D4 hata iletisi", hata, "SINAMA: son adımda hata");
    const sonra = await foto(a);
    for (const x of Object.keys(once)) k_(`D4 ${x} değişmedi`, sonra[x], once[x]);
    k_("D4 eski ad defteri boş", Number(psql(db, "select count(*) from public.tanim_ad_gecmisi").trim()), 0);
    await a.end(); }

  console.log("\n■ D5 — yetki: listede olmayan / Tanımlar yetkisi olmayan reddedilir, hiçbir şey değişmez");
  for (const [kim, eposta] of [["zeki (listede yok)", "zeki@atolye.local"], ["ayşe (yalnız stok)", "ayse@atolye.local"]]) {
    const db = await yeniDb(); const a = await baglan(db, eposta); const s = await baglan(db, null);
    const once = await foto(s);
    let hata = ""; try { await a.olarak((c) => RPC(c, DEGIS)); } catch (e) { hata = `${e.code} ${e.message}`; }
    k_(`D5 ${kim} ret`, hata, "42501 Bu işlem için yetkiniz yok (tanimlar: duzenleme)");
    k_(`D5 ${kim} değişiklik yok`, JSON.stringify(await foto(s)) === JSON.stringify(once), true);
    await a.end(); await s.end();
  }

  console.log("\n■ D6 — bayat istek (eski ad tutmuyor) · aynı ad başka renkte · boş ad · istek tekrarı");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    const once = await foto(a);
    const dene = async (p) => { try { await a.olarak((c) => RPC(c, p)); return "geçti"; } catch (e) { return e.message.split(" — ")[0]; } };
    k_("D6 bayat istek", await dene({ ...DEGIS, eski_ad: "Vizon Rugan" }), 'KR021: renk adı bu arada değişmiş (şimdi "Vizon Yılan", istekte "Vizon Rugan")');
    k_("D6 aynı ad başka renkte", await dene({ ...DEGIS, yeni_ad: "siyah" }), 'KR022: "siyah" adında bir renk zaten var');
    k_("D6 boş ad", await dene({ ...DEGIS, yeni_ad: "  " }), "KR023: yeni ad boş olamaz");
    k_("D6 retlerden sonra değişiklik yok", JSON.stringify(await foto(a)) === JSON.stringify(once), true);
    const r1 = await a.olarak((c) => RPC(c, DEGIS)); const f1 = await foto(a);
    const r2 = await a.olarak((c) => RPC(c, DEGIS)); const f2 = await foto(a);
    k_("D6 tekrar: ikinci istek 'zaten'", [r1.zaten, r2.zaten], [false, true]);
    k_("D6 tekrar: ikinci istek hiçbir şeyi değiştirmedi (sürümler dahil)", JSON.stringify(f2) === JSON.stringify(f1), true);
    await a.end(); }

  // ESKİ AD DEFTERİ (2. sürüm, 27 Kasım): zincir, geri dönüş, eski adın başka renge verilmesi, belirsizlik, silinmiş renk.
  const bayatKalem = (c, id, renk) => c.query(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ($1, 'sp-inc-1', 'inc-bot', 'İnceleme Bot', $2, '40', 1, 9)`, [id, renk]);
  const kalemRengi = async (c, id) => ((await c.query("select renk from public.siparis_kalemleri where id = $1", [id])).rows[0] || {}).renk || null;
  const hataKodu = async (fn) => { try { await fn(); return "geçti"; } catch (e) { return `${e.code} ${String(e.message).split(" — ")[0]}`; } };

  console.log("\n■ D7 — A → B → C: iki eski ad da (düz + kombinasyon) güncel C'ye bağlanır");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    await a.olarak((c) => RPC(c, { renk_id: "r-vizon", yeni_ad: "Vizon Rugan", eski_ad: "Vizon Deri" }));
    await a.olarak(async (c) => { await bayatKalem(c, "kl-a", ESKI); await bayatKalem(c, "kl-b", YENI); await c.query(`insert into public.uretim (id, urun_id, renk, surum) values ('ur-a', 'inc-bot', 'Vizon Yılan', 1), ('ur-b', 'inc-bot', 'vizon deri', 1)`); });
    k_("D7 kalem A (en eski etiket) → C", await kalemRengi(a, "kl-a"), "1054 - Siyah/Vizon Rugan");
    k_("D7 kalem B (ara etiket) → C", await kalemRengi(a, "kl-b"), "1054 - Siyah/Vizon Rugan");
    k_("D7 üretim düz adlar → C", psql(db, "select string_agg(renk, ',' order by id) from public.uretim where id in ('ur-a','ur-b')").trim(), "Vizon Rugan,Vizon Rugan");
    k_("D7 bağsız kalem", (await foto(a)).bagsiz, 0); await a.end(); }

  console.log("\n■ D8 — A → B → A: A yeniden aynı rengin güncel adı; B ile gelen bayat kayıt A'ya bağlanır");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    await a.olarak((c) => RPC(c, { renk_id: "r-vizon", yeni_ad: "Vizon Yılan", eski_ad: "Vizon Deri" }));
    await a.olarak(async (c) => { await bayatKalem(c, "kl-a", ESKI); await bayatKalem(c, "kl-b", YENI); });
    k_("D8 güncel adla gelen kalem değişmez", await kalemRengi(a, "kl-a"), ESKI);
    k_("D8 ara adla (B) gelen bayat kalem → A", await kalemRengi(a, "kl-b"), ESKI);
    k_("D8 bağsız kalem", (await foto(a)).bagsiz, 0); await a.end(); }

  console.log("\n■ D9 — eski ad BAŞKA renge verilemez (KR026): ad değişikliğiyle de, Tanımlar'da yeni renkle de; Yönetici serbest bırakınca verilir");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local"); const ay = await baglan(db, "ayse@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    const once = await foto(a);
    k_("D9 Siyah → 'Vizon Yılan' (sunucu fonksiyonu)", await hataKodu(() => a.olarak((c) => RPC(c, { renk_id: "r-siyah", yeni_ad: "Vizon Yılan", eski_ad: "Siyah" }))),
      'KR026 KR026: "Vizon Yılan" başka bir rengin eski adı');
    k_("D9 Tanımlar'a yeni renk 'vizon yılan'", await hataKodu(() => a.olarak((c) => c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id":"r-yeni","ad":"vizon yılan"}]') where id = 'tekil'`))),
      'KR026 KR026: "vizon yılan" başka bir rengin eski adı');
    k_("D9 retlerden sonra değişiklik yok", JSON.stringify(await foto(a)) === JSON.stringify(once), true);
    k_("D9 personel serbest bırakamaz", await hataKodu(() => ay.olarak((c) => c.query("select public.tanim_eski_ad_serbest($1::jsonb)", [JSON.stringify({ eski_ad: "Vizon Yılan" })]))),
      "42501 Eski renk adını yalnız Yönetici serbest bırakabilir");
    await a.olarak((c) => c.query("select public.tanim_eski_ad_serbest($1::jsonb)", [JSON.stringify({ eski_ad: "Vizon Yılan" })]));
    k_("D9 Yönetici serbest bıraktı → yeni renk verilebilir", await hataKodu(() => a.olarak((c) => c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id":"r-yeni","ad":"Vizon Yılan"}]') where id = 'tekil'`))), "geçti");
    await a.olarak((c) => bayatKalem(c, "kl-y", "Vizon Yılan"));
    k_("D9 serbest bırakılan adla gelen kayıt eski renge ÇEVRİLMEZ (yeni rengin adı)", await kalemRengi(a, "kl-y"), "Vizon Yılan");
    await a.end(); await ay.end(); }

  console.log("\n■ D10 — geçmişten kalan belirsizlik: eski ad hem başka etkin rengin adı (koruma öncesi) → KR025, sessiz eşleme YOK");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    // koruma öncesi durumu kur: başka renge eski adı ver (jetonsuz bağlantı = yönetim; tetikleyici bakmaz)
    psql(db, `update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id":"r-yeni","ad":"Vizon Yılan"}]') where id = 'tekil'`);
    const kalemOnce = psql(db, "select count(*) from public.siparis_kalemleri").trim();
    k_("D10 bayat kalem reddedildi", await hataKodu(() => a.olarak((c) => bayatKalem(c, "kl-z", "Vizon Yılan"))),
      'KR025 KR025: "Vizon Yılan" hem etkin bir rengin adı hem başka bir rengin eski adı');
    k_("D10 kalem yazılmadı", psql(db, "select count(*) from public.siparis_kalemleri").trim(), kalemOnce);
    // iki rengin eski adı (koruma öncesi): defteri elle kur
    psql(db, `insert into public.tanim_ad_gecmisi (renk_id, eski_ad, eski_nrm, yeni_ad) values ('r-siyah', 'Eski Ortak', 'eski ortak', 'Siyah'), ('r-vizon', 'Eski Ortak', 'eski ortak', 'Vizon Deri')`);
    k_("D10 iki rengin eski adı → KR025", await hataKodu(() => a.olarak((c) => bayatKalem(c, "kl-o", "Eski Ortak"))),
      'KR025 KR025: "Eski Ortak" birden çok rengin eski adı');
    await a.end(); }

  console.log("\n■ D11 — eski adın rengi silinmiş → KR027; eski adla DURAN kaydın başka alanı (miktar) düzeltilebilir");
  { const db = await yeniDb(); const a = await baglan(db, "ali@atolye.local");
    psql(db, `insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-eski', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', 'Vizon Yılan', '40', 1, 9)`);
    psql(db, `update public.siparis_kalemleri set renk = 'Vizon Yılan' where id = 'kl-eski'`);
    // Vizon Yılan → Deri; kl-eski düz adla, RPC onu da çevirir. Sonra rengi sil (kombinasyonuyla).
    await a.olarak((c) => RPC(c, DEGIS));
    psql(db, `update public.tanimlar set veri = jsonb_set(jsonb_set(veri, '{renkler}', (select jsonb_agg(r) from jsonb_array_elements(veri -> 'renkler') r where r ->> 'id' <> 'r-vizon')), '{renkKombinasyonlari}', '[]') where id = 'tekil'`);
    // eski adla DURAN geçmiş kayıt (tetikleyicisiz kurulur — koruma öncesinden kalmış gibi)
    psql(db, `set session_replication_role = replica; update public.siparis_kalemleri set renk = 'Vizon Yılan' where id = 'kl-eski'`);
    k_("D11 silinmiş rengin eski adıyla yeni kayıt → KR027", await hataKodu(() => a.olarak((c) => bayatKalem(c, "kl-s", "Vizon Yılan"))),
      'KR027 KR027: "Vizon Yılan" silinmiş ya da pasif bir rengin eski adı');
    k_("D11 eski adla duran kaydın miktarı düzeltilebilir (renk aynı → bakılmaz)", await hataKodu(() => a.olarak((c) => c.query(`update public.siparis_kalemleri set miktar = 9, renk = 'Vizon Yılan' where id = 'kl-eski'`))), "geçti");
    await a.end(); }

  // BOZMA PROVASI — korumalar kaldırılınca aynı sınamalar kırmızıya döner mi?
  console.log("\n■ B-1 — BOZMA: eski ad tetikleyicisi kaldırıldı → D2 yakalamalı");
  { const db = await yeniDb(); psql(db, "drop trigger tanim_ad_guncelle on public.siparis_kalemleri");
    const a = await baglan(db, "ali@atolye.local"); await a.olarak((c) => RPC(c, DEGIS));
    await a.olarak((c) => c.query(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-bayat', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', $1, '40', 7, 9)`, [ESKI]));
    const f = await foto(a);
    k_("B-1 (bozuk) bağsız kalem VAR — sınama yakaladı", f.bagsiz > 0, true); await a.end(); }

  // B-2: Kilit yalnız "ad değişikliği işlemi AÇIKKEN başka cihaz yazar" sırasında belirleyici: o an eski ad defteri ve yeni stk_renk adı
  // henüz işlenmemiş (görünmez), tetikleyici eski adı tanıyamaz. Kilit varsa yazma bekler, işlem bitince tetikleyici yeni adı görür (D3-2).
  // Öbür sırada (önce kalem) degisiklik sayacının tek satırı iki işlemi zaten sıraya soktuğu için kilitsiz de doğru çıkar — bu yüzden
  // bozma bu sırayla yapılır. (Yan bulgu: degisiklik_bump bütün yazmaları tek satırda sıraya sokuyor — inceleme raporuna.)
  console.log("\n■ B-2 — BOZMA: tablo kilidi kaldırıldı → D3 (önce ad değişikliği) yakalamalı");
  { const db = await yeniDb();
    const tanim = psql(db, "select pg_get_functiondef('public.tanim_renk_ad_degistir(jsonb)'::regprocedure)");
    const bozuk = tanim.replace(/  lock table public\.siparis_kalemleri[^;]*;/, "").replace(/if to_regclass\('public\.lst_kayit'\) is not null then execute 'lock table[^;]*; end if;/, "");
    if (bozuk === tanim) throw new Error("bozma uygulanamadı");
    const c0 = new Client({ host: "localhost", database: db, user: "postgres" }); await c0.connect(); await c0.query(bozuk); await c0.end();
    const a = await baglan(db, "ali@atolye.local"); const b = await baglan(db, "ali@atolye.local");
    await a.query("begin");
    await a.query(`select set_config('request.jwt.claims', '{"role":"authenticated","email":"ali@atolye.local"}', true)`); await a.query("set local role authenticated");
    await RPC(a, DEGIS);                                   // a'nın işlemi AÇIK
    await b.query("begin");
    // kilit yok → b'nin eklemesi beklemez; tetikleyici a'nın işlenmemiş eski ad defterini göremez. b yalnız sayaç satırında a'yı bekler.
    const p = b.query(`insert into public.siparis_kalemleri (id, siparis_id, urun_id, urun_ad, renk, beden, miktar, sira) values ('kl-es', 'sp-inc-1', 'inc-bot', 'İnceleme Bot', $1, '41', 6, 8)`, [ESKI]);
    await new Promise((r) => setTimeout(r, 700));
    await a.query("commit"); await p; await b.query("commit");
    const f = await foto(a);
    k_("B-2 (bozuk) eşzamanlı kalem ESKİ adda — sınama yakaladı", f.kalem.includes(`kl-es:${ESKI}:6`), true);
    k_("B-2 (bozuk) bağsız kalem VAR", f.bagsiz > 0, true);
    await a.end(); await b.end(); }

  console.log("\n■ B-3 — BOZMA: eşleme ilk (sessiz) sürüme döndürüldü + eski ad koruması kaldırıldı → D10 yakalamalı");
  { const db = await yeniDb();
    psql(db, `drop trigger tanim_ad_gecmisi_koru on public.tanimlar;
      create or replace function public.tanim_ad_guncel(x text) returns text language plpgsql stable security definer set search_path = public as '
      declare n text := public.stk_nrm(x); g text;
      begin
        if n is null then return x; end if;
        if exists (select 1 from public.stk_renk s where s.aktif and public.stk_nrm(s.ad) = n) then return x; end if;
        select s.ad into g from public.tanim_ad_gecmisi h join public.stk_renk s on s.id = h.renk_id and s.aktif where h.eski_nrm = n order by h.zaman desc, h.id desc limit 1;
        return coalesce(g, x);
      end';`);
    const a = await baglan(db, "ali@atolye.local");
    await a.olarak((c) => RPC(c, DEGIS));
    await a.olarak((c) => c.query(`update public.tanimlar set veri = jsonb_set(veri, '{renkler}', (veri -> 'renkler') || '[{"id":"r-yeni","ad":"Vizon Yılan"}]') where id = 'tekil'`));
    const r = await hataKodu(() => a.olarak((c) => bayatKalem(c, "kl-z", "Vizon Yılan")));
    k_("B-3 (bozuk) eski ad başka renge verildi VE bayat kalem SESSİZCE yazıldı — sınama yakaladı", r === "geçti", true);
    await a.end(); }

  console.log(`\n── b1-sina: ${gecen} geçti · ${kalan} kaldı ──`);
  for (let i = 1; i <= sayac; i++) psql("postgres", `drop database if exists inc_b1_${process.pid}_${i}`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error("HATA", e); process.exit(2); });
