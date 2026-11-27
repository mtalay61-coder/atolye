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
  const yenile = async (c) => {
    for (let deneme = 0; deneme < 3; deneme++) {
      await c.sayfa.reload(); await c.sayfa.waitForTimeout(800);
      await c.sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
      for (let i = 0; i < 30; i++) { if (await (require("../ekran/ortak-ekran.js").uretimMenusuHazir)(c.sayfa)) break;
        if (await c.sayfa.locator('input[type="password"]:visible').count()) { try { await girisYap(c.sayfa); } catch (x) { /* yeniden */ } }
        await c.sayfa.waitForTimeout(1000); }
      if (await (require("../ekran/ortak-ekran.js").uretimMenusuHazir)(c.sayfa)) break;
    }
    await c.sayfa.waitForTimeout(1500);
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
  // G4 — iki cihaz aynı işi AYNI ANDA verir: biri yazar, öteki sürüm çakışmasıyla reddedilir → o cihazda "verildi" DENMEZ
  { console.log("\n■ G4 · iki cihazdan eşzamanlı İşi Ver");
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ('il-g4', 'ILG4', 'ILG4', 'ekr-bot', 'Dikim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
        '[{"proses": "Dikim", "sira": 1, "verildiMi": false, "tamamlandiMi": false}]'::jsonb, now()) on conflict (id) do nothing`);
    await yenile(A); await yenile(B);
    const hazir = async (s) => { await kartAc(s, "ILG4");
      await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption("fin-usta"); await s.waitForTimeout(300);
      return s.locator('button:has-text("İşi Ver"):visible').last(); };
    const da = await hazir(A.sayfa), db = await hazir(B.sayfa);
    await Promise.all([da.click(), db.click()]); await A.sayfa.waitForTimeout(6000);
    const ta = await toast(A.sayfa), tb = await toast(B.sayfa);
    console.log(`     A: ${ta.slice(0, 200)}\n     B: ${tb.slice(0, 200)}`);
    const verildi = [ta, tb].filter((t) => /Fin Usta'a verildi/.test(t)).length, verilemedi = [ta, tb].filter((t) => /İş VERİLEMEDİ/.test(t)).length;
    k_("G4 yalnız BİR cihaz 'verildi' dedi, öteki 'İş VERİLEMEDİ'", [verildi, verilemedi], [1, 1]);
    k_("G4 sunucuda tek atama (10)", (await q("select count(*)::int n, sum(miktar)::float m from public.uretim_atamalari where uretim_id = 'il-g4'"))[0], { n: 1, m: 10 }); }

  // G5 — ara proses (ataması yok): bayat cihaz eski tamamlanmayı geri alır, adım arada yeniden tamamlanmış → sonuç FİŞTEN doğrulanır
  { console.log("\n■ G5 · ara prosesin bayat geri alınması (fiş üzerinden doğrulama)");
    await q(`insert into public.cariler (id, unvan, tip) values ('fin-usta2', 'Fin Usta2', 'Personel'), ('fin-fason', 'Fin Fason', 'Personel') on conflict (id) do nothing`);
    await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35, "Kesim": 30, "Saya": 20}'::jsonb where id = 'ekr-bot'`);
    await q(`update public.tanimlar set veri = jsonb_set(veri, '{araProsesler}', '[{"id": "ap-yik", "ad": "Yıkama", "cariId": "fin-fason", "ucret": 4}]'::jsonb) where id = 'tekil'`);
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ('il-g5', 'ILG5', 'ILG5', 'ekr-bot', 'Saya', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $1::jsonb, now()) on conflict (id) do nothing`,
      [JSON.stringify([{ proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: true, personelId: "fin-usta", tamamlanmaTarihi: "2026-11-29T09:00:00.000Z" },
        { proses: "Yıkama", sira: 1.5, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, araProsesMi: true, araProsesId: "ap-yik", araProsesCariId: "fin-fason" },
        { proses: "Saya", sira: 2, verildiMi: false, tamamlandiMi: false }])]);
    await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamamlanma_tarihi, sonuc, tamir_mi, tamir_ucret, ek)
      values ('il-g5-a', 'il-g5', 'Kesim', 'fin-usta', '{"40": 10}'::jsonb, 10, true, now(), true, now(), '{"saglam": {"40": 10}, "tamir": [], "hurda": []}'::jsonb, false, 0, '{"fisNo": "ILG5-Kesim"}'::jsonb) on conflict (id) do nothing`);
    const fason = async () => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id
      where h.cari_id = 'fin-fason' and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`))[0].t);
    const fisG5 = async () => (await q(`select count(*) filter (where not iptal) || ' geçerli / ' || count(*) filter (where iptal) || ' iptal' x from public.stk_fis where uretim_id = 'il-g5'`))[0].x;
    const sayaVer = async (s) => { if (!(await s.locator('button:has-text("İşi Ver"):visible').count())) await kartAc(s, "ILG5");
      await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption("fin-usta2"); await s.waitForTimeout(300);
      await s.locator('button:has-text("İşi Ver"):visible').last().click(); await s.waitForTimeout(4500); };
    const vermeGeri = async (s) => { if (!(await s.locator('button[title^="Yanlış personele/miktarla"]:visible').count())) await kartAc(s, "ILG5");
      await s.locator('button[title^="Yanlış personele/miktarla"]:visible').last().click(); await s.waitForTimeout(4000); };
    const araGeri = async (s) => {
      const D = 'button:has-text("Bu Ara Prosesi Geri Al"):visible';
      for (let tur = 0; tur < 3 && !(await s.locator(D).count()); tur++) {
        const d = s.getByText("detay / geri al");
        let acildi = false;
        for (let i = 0; i < await d.count(); i++) if (await d.nth(i).isVisible()) { await d.nth(i).click(); await s.waitForTimeout(700); acildi = true; if (await s.locator(D).count()) break; }
        if (!acildi) await kartAc(s, "ILG5");
      }
      await s.locator(D).last().click(); await s.waitForTimeout(4500); };
    await yenile(A); await sayaVer(A.sayfa);                 // Yıkama tamamlandı (F1), Saya verildi
    k_("G5 hazırlık: Yıkama fişi F1 kesildi (fason −40)", [await fason(), await fisG5()], [-40, "1 geçerli / 0 iptal"]);
    await yenile(A); await vermeGeri(A.sayfa);               // Saya verme geri (ara proses tamamlanmış kalır)
    await yenile(B); await kartAc(B.sayfa, "ILG5"); await B.sayfa.route("**/rest/v1/degisiklik**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await yenile(A); await araGeri(A.sayfa);                 // F1 iptal
    k_("G5 hazırlık: A ara prosesi geri aldı (fason 0)", [await fason(), await fisG5()], [0, "0 geçerli / 1 iptal"]);
    await yenile(A); await sayaVer(A.sayfa);                 // Yıkama yeniden tamamlandı (F2)
    const once = [await fason(), await fisG5()];
    k_("G5 hazırlık: adım yeniden tamamlandı (F2, fason −40)", once, [-40, "1 geçerli / 1 iptal"]);
    await araGeri(B.sayfa);                                   // bayat B: F1'i (zaten iptal) geri almaya çalışır
    const t = await toast(B.sayfa); console.log(`     B iletisi: ${t.slice(0, 280)}`);
    k_("G5 ileti: zaten geri alınmıştı, adım yeniden tamamlanmış, yeni değişiklik yok", [/zaten geri alınmıştı/.test(t), /yeniden tamamlanmış/.test(t), /yeni bir değişiklik yapmadı/.test(t)], [true, true, true]);
    k_("G5 'geri alındı' başarı iletisi YOK", /tamamlanması geri alındı/.test(t), false);
    k_("G5 sunucu değişmedi (F2 geçerli, fason −40, Saya ataması duruyor)", [await fason(), await fisG5(), (await q("select count(*)::int n from public.uretim_atamalari where uretim_id = 'il-g5' and proses = 'Saya'"))[0].n], [-40, "1 geçerli / 1 iptal", 1]);
    await B.sayfa.unroute("**/rest/v1/degisiklik**"); }
  k_("sayfa hatası yok", [A.hatalar, B.hatalar], [[], []]);
  await A.tarayici.close(); await B.tarayici.close();
  console.log(`\n── ekran-geri-al-ileti: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
