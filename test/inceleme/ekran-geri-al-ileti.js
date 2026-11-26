#!/usr/bin/env node
// EKRAN SINAMASI — BAYAT "GERİ AL" İLETİSİ (v1.744.41; inceleme 25 B5'in istemci tarafı). Kullanıcı: "Bayat 'Geri Al' hiçbir şey
// yapmadığında 'geri alındı' bildirimi vermesini ayrı istemci düzeltmesi olarak hazırla. Kullanıcı işlemin sonucunu doğru görmeli."
// Yerel PostgreSQL (gercek-pg-kopru), canlıya hizalı G-25'siz taban + B4 / B5 sunucu paketi (EKRAN_DB). İki tarayıcı = iki cihaz.
//   G1 A teslim → B bayat (yoklama donuk, kart açık) → A Geri Al + yeniden teslim → B Geri Al:
//      B'de "zaten geri alınmıştı … yeni bir değişiklik yapmadı" iletisi; "geri alma işlemi geri alındı" iletisi YOK; B'nin ekranı işi
//      TESLİM ALINMIŞ gösterir (yoklama hâlâ donuk — tazeleme düzeltmenin kendisinden); sunucu değişmedi
//   G2 yanıt kaybı: B Geri Al, sunucu yapar, yanıt düşer, istemci aynı isteği yeniden dener → "zaten geri alınmıştı — kayıtlar geri alınmış
//      durumda" + ekran işi BEKLİYOR (teslim formu açık); sunucu: fiş iptal, atama bekliyor, üretimin ana satırı da geri dönmüş
//   G3 olağan Geri Al (tek cihaz) → eski ileti ("geri alındı"), defterler başlangıçta
const { ekranAc, girisYap, toastlar, O } = require("../ekran/ortak-ekran.js");
const DB = process.env.EKRAN_DB || "inc_ileti";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB }); const q = (s, p) => k0.sorgu(s, p);
  await q(`insert into public.cariler (id, unvan, tip) values ('fin-usta', 'Fin Usta', 'Personel') on conflict (id) do nothing`);
  await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35}'::jsonb where id = 'ekr-bot'`);
  for (const n of ["G1", "G2", "G3"]) {
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
        '[{"proses": "Dikim", "sira": 1, "verildiMi": true, "tamamlandiMi": false, "personelId": "fin-usta"}]'::jsonb, '2026-11-29T08:00:00.000Z') on conflict (id) do nothing`, [`il-${n.toLowerCase()}`, `IL${n}`]);
    await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
      values ($1, $2, 'Dikim', 'fin-usta', '{"40": 10}'::jsonb, 10, true, '2026-11-29T08:10:00.000Z', false, false, 0, '{}'::jsonb) on conflict (id) do nothing`, [`il-${n.toLowerCase()}-a`, `il-${n.toLowerCase()}`]);
  }
  const durum = async (u) => { const r = (await q(`select
      (select coalesce(sum(miktar), 0)::float from public.stk_stok where urun_id = 'ekr-bot' and renk_ad = 'Siyah' and olcu_ad = '40') mamul,
      (select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id
        where h.cari_id = 'fin-usta' and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)) usta,
      (select count(*) filter (where not iptal) || ' geçerli / ' || count(*) filter (where iptal) || ' iptal' from public.stk_fis where uretim_id = $1) fis,
      (select string_agg(case when tamamlandi_mi then 'teslim' else 'bekliyor' end, ',') from public.uretim_atamalari where uretim_id = $1) atama`, [u]))[0]; return r; };
  const cihaz = async () => { const c = await ekranAc(DB); c.sayfa.on("dialog", (d) => d.accept()); return c; };
  const kartAc = async (s, no) => { for (let i = 0; i < 20 && !(await s.locator('[data-nav="Üretim"]').count()); i++) await s.waitForTimeout(1000);
    await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200); };
  const teslim = async (s, no) => { if (!(await s.locator("[data-teslim-al]:visible").count())) await kartAc(s, no);
    await s.locator("[data-teslim-al]:visible").first().click(); await s.waitForTimeout(3500); };
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")', TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")';
  const geriAl = async (s, no) => {
    for (let tur = 0; tur < 2; tur++) {
      for (const sec of [GERI, TAM]) if (await s.locator(sec + ":visible").count()) { await s.locator(sec + ":visible").first().click(); await s.waitForTimeout(4500); return true; }
      const detay = s.getByText("detay / geri al");
      if ((await detay.count()) && (await detay.last().isVisible())) { await detay.last().click(); await s.waitForTimeout(900); continue; }
      await kartAc(s, no);
    }
    return false;
  };
  const toast = async (s) => (await toastlar(s)).replace(/\s+/g, " ");
  const ekran = async (s, no) => { const m = (await s.evaluate(() => document.body.innerText)).replace(/\s+/g, " "); const i = m.indexOf(no);
    return { tamamlandi: new RegExp(`${no}.{0,60}Tamamlandı`).test(m), teslimFormu: await s.locator("[data-teslim-al]:visible").count() > 0 }; };

  const A = await cihaz(), B = await cihaz();
  console.log(`ekran-geri-al-ileti · ${DB} · istemci ${await A.sayfa.evaluate(() => (typeof SURUM !== "undefined" ? SURUM : (window.__SURUM || "?")))} · B4 kurulu ${(await q("select count(*) n from pg_proc where proname like 'b4\\_%'"))[0].n > 0 ? "EVET" : "HAYIR"}`);

  { console.log("\n■ G1 · bayat cihaz, iş arada yeniden teslim alınmış");
    await kartAc(A.sayfa, "ILG1"); await teslim(A.sayfa, "ILG1");
    await kartAc(B.sayfa, "ILG1"); await B.sayfa.route("**/rest/v1/degisiklik**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await geriAl(A.sayfa, "ILG1"); await teslim(A.sayfa, "ILG1");
    const once = await durum("il-g1");
    await geriAl(B.sayfa, "ILG1");
    const t = await toast(B.sayfa); console.log(`     B iletisi: ${t.slice(0, 260)}`);
    k_("G1 ileti: zaten geri alınmıştı, iş yeniden teslim alınmış, yeni değişiklik yok", [/zaten geri alınmıştı/.test(t), /yeniden teslim alınmış/.test(t), /yeni bir değişiklik yapmadı/.test(t)], [true, true, true]);
    k_("G1 'geri alındı' başarı iletisi YOK", /teslim alma işlemi geri alındı/.test(t), false);
    k_("G1 sunucu değişmedi (geçerli teslim duruyor)", await durum("il-g1"), once);
    k_("G1 sunucu: stok 10, usta −350, atama teslim", [once.mamul, once.usta, once.atama, once.fis], [10, -350, "teslim", "1 geçerli / 1 iptal"]);
    await kartAc(B.sayfa, "ILG1");
    k_("G1 B'nin ekranı işi TESLİM ALINMIŞ gösteriyor (yoklama donukken)", await ekran(B.sayfa, "ILG1"), { tamamlandi: true, teslimFormu: false });
    await B.sayfa.unroute("**/rest/v1/degisiklik**"); }

  { console.log("\n■ G2 · yanıt kaybı: Geri Al sunucuda yapıldı, yanıt düştü, istemci yeniden denedi");
    await kartAc(B.sayfa, "ILG2"); await teslim(B.sayfa, "ILG2");
    let ilk = true;
    await B.sayfa.route("**/rest/v1/rpc/fis_iptal_toplu**", async (r) => {
      if (!ilk) return r.fallback(); ilk = false; const i = r.request();
      await B.k.__yanitla({ url: () => i.url(), method: () => i.method(), headers: () => i.headers(), postData: () => i.postData() });
      return r.abort("connectionreset");
    });
    await geriAl(B.sayfa, "ILG2"); await B.sayfa.waitForTimeout(6000);
    const t = await toast(B.sayfa); console.log(`     B iletisi: ${t.slice(0, 260)}`);
    const d = await durum("il-g2");
    k_("G2 sunucu: fiş iptal, atama bekliyor, teslimin stoğu / ödemesi geri", [d.fis, d.atama], ["0 geçerli / 1 iptal", "bekliyor"]);
    k_("G2 ileti: zaten geri alınmıştı — kayıtlar geri alınmış durumda", [/zaten geri alınmıştı/.test(t), /geri alınmış durumda/.test(t)], [true, true]);
    k_("G2 sunucu: üretimin ana satırı da geri döndü (adım tamamlanmadı)", (await q("select asama || '/' || (proses_ilerleme -> 0 ->> 'tamamlandiMi') x from public.uretim where id = 'il-g2'"))[0].x, "Dikim/false");
    await kartAc(B.sayfa, "ILG2");
    if (!(await B.sayfa.locator("[data-teslim-al]:visible").count())) await kartAc(B.sayfa, "ILG2");   // kart açıksa ilk tık kapatır
    k_("G2 B'nin ekranı işi BEKLİYOR gösteriyor (teslim formu açık)", await ekran(B.sayfa, "ILG2"), { tamamlandi: false, teslimFormu: true });
    await B.sayfa.unroute("**/rest/v1/rpc/fis_iptal_toplu**"); }

  { console.log("\n■ G3 · olağan Geri Al (tek cihaz)");
    const o = await durum("il-g3");
    await kartAc(A.sayfa, "ILG3"); await teslim(A.sayfa, "ILG3"); await geriAl(A.sayfa, "ILG3");
    const t = await toast(A.sayfa); const d = await durum("il-g3");
    k_("G3 ileti: geri alındı (eski ileti)", [/teslim alma işlemi geri alındı/.test(t), /zaten geri alınmıştı/.test(t)], [true, false]);
    k_("G3 defterler başlangıçta, fiş iptal, atama bekliyor", [d.mamul - o.mamul, d.usta - o.usta, d.fis, d.atama], [0, 0, "0 geçerli / 1 iptal", "bekliyor"]); }
  k_("sayfa hatası yok", [A.hatalar, B.hatalar], [[], []]);
  await A.tarayici.close(); await B.tarayici.close();
  console.log(`\n── ekran-geri-al-ileti: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
