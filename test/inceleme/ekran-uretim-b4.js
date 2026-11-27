#!/usr/bin/env node
// EKRAN SINAMASI — B4 / B5: ÜRETİM TESLİMİNDE ÇİFT STOK / ÇİFT İŞÇİLİK VE BAYAT "GERİ AL" (28 Kasım; kapsamlı inceleme 25).
// Kullanıcı: "Koruma yalnız 'tamamlandı mı?' kontrolü olmasın; kısmi teslimi ve kalan miktarı da sunucuda, eşzamanlı işlemlere karşı
// kilitleyerek denetlesin. Farklı istek kimlikleriyle iki cihaz teslim yaptığında da fazla stok veya işçilik oluşmamalı. Bayat 'Geri Al',
// geçerli yeni teslimi veya atamanın durumunu değiştirmemeli." Canlıya hizalı, G-25'SİZ taban (EKRAN_DB: inc_ekran_taban kopyası).
// İstemci ISTEMCI_DIZIN (canlıdaki 1.744.37 = main). İki tarayıcı = iki cihaz (ayrı yerel depo), gerçek JWT'li authenticated.
// Supabase'e bağlanmaz.
//
// Her senaryo kendi üretiminde; ölçüm SUNUCUDAN, senaryo başına FARK olarak: mamul stoğu (ekr-bot Siyah/40), hammadde stoğu
// (fin-taban Siyah/40; reçete: Kesim'de çift başına 1), personel cari bakiyeleri (geçerli satır + geçerli fiş; alacak −), üretimin
// geçerli / iptal ÜRT fişleri, atama satırları. Ücret: Dikim 35 ₺ (T1–T7, T9; reçetesiz), Kesim 30 ₺ (reçeteli) + Saya 20 ₺ (T8), tamir 5 ₺.
//   T1 iki cihaz AYNI ANDA tam teslim (10)                  → tek fiş: mamul +10, taban −10, usta −350
//   T2 iki cihaz AYNI ANDA kısmi teslim (6 / 6)             → tek kısmi: +6 / −6 / −210, kalan 4; sonra kalan 4 → +10 / −10 / −350
//   T3 A kısmi 6, bayat B tam 10                            → B reddedilir: +6 / −6 / −210
//   T4 A teslim → A Geri Al → A yeniden teslim → bayat B Geri Al → B reddedilir ya da etkisiz: 1 geçerli fiş, atama teslim, +10 / −350
//   T5 A kısmi 6 → A kalanı (4) teslim → bayat B ilk parçayı Geri Al → kalan parça teslimli kalmalı, defterler değişmemeli
//   T6 yanıt kaybı: teslim sunucuda tamamlanır, yanıt düşer → kullanıcı yeniden "Teslim Al" (YENİ istek) → ikinci fiş YOK;
//      aynı istek ağda iki kez → tek fiş; Geri Al yanıtı düşer, kullanıcı yeniden Geri Al → tek iptal, atama tutarlı
//   T7 tamir: sağlam 7 + tamir 3 (tamirci, 5 ₺) → iki cihaz AYNI ANDA tamiri teslim alır → tek: +3, tamirci −15
//   T8 çok proses + hammadde: Kesim teslim (taban −10, usta −350, mamul YOK) → bayat B Kesim'i yeniden teslim → ret; Saya'yı usta2'ye
//      ver → iki cihaz AYNI ANDA Saya teslimi → tek: mamul +10, usta2 −200
//   T9 son adımda hata: teslimde son yazılan tabloda (car_hareket) hata → bütün defterler DEĞİŞMEDİ; geri almada atama yazımında hata →
//      fiş geçerli, defterler değişmedi
const ORTAK = require("../ekran/ortak-ekran.js");
const { toastlar, O } = ORTAK;
// YAYIN_HTML verilirse sınama test derlemesiyle değil YAYINLANMIŞ paketin kendisiyle koşar (yayin-ekran.js; SHA-256 denetimli).
const YAYIN = process.env.YAYIN_HTML ? require("./yayin-ekran.js") : null;
const { ekranAc, girisYap } = YAYIN || ORTAK;
const DB = process.env.EKRAN_DB || "inc_b4";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);
  // ── FİKSTÜR (gözlemci, süper kullanıcı — sınanan bu değil)
  await q(`insert into public.cariler (id, unvan, tip) values ('fin-usta', 'Fin Usta', 'Personel'), ('fin-usta2', 'Fin Usta2', 'Personel'),
           ('fin-tamirci', 'Fin Tamirci', 'Personel') on conflict (id) do nothing`);
  await q(`insert into public.urunler (id, ad, kategori, birim, olcu_tipi, pasif, surum) values ('fin-taban', 'Fin Taban', 'Hammadde', 'çift', 'Beden', false, 1)
           on conflict (id) do nothing`);
  await q(`insert into public.stk_varyant (id, urun_id, renk_id, olcu_id, min_stok, aktif)
           values ('vry-fin-taban', 'fin-taban', public.stk_renk_coz(null, 'Siyah'), public.stk_olcu_coz(null, '40'), 0, true) on conflict (id) do nothing`);
  await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35, "Kesim": 30, "Saya": 20}'::jsonb,
             recete = '[{"hammaddeUrunId": "fin-taban", "hammaddeAd": "Fin Taban", "mamulRenk": "Siyah", "mamulBeden": "40", "proses": "Kesim", "renk": "Siyah", "beden": "40", "miktar": 1, "birim": "çift"}]'::jsonb
           where id = 'ekr-bot'`);
  // verilmis = false: ilk adım VERİLMEMİŞ — iş ekrandan "İşi Ver" ile verilir (gerçek akış: hammadde verirken düşer)
  const uretim = async (no, adimlar, verilmis = true) => {
    const id = `b4-${no.toLowerCase()}`;
    const pi = adimlar.map((p, i) => ({ proses: p, sira: i + 1, verildiMi: verilmis && i === 0, tamamlandiMi: false, ...(verilmis && i === 0 ? { personelId: "fin-usta" } : {}) }));
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', $3, '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $4::jsonb, '2026-11-28T08:00:00.000Z')
      on conflict (id) do nothing`, [id, no, adimlar[0], JSON.stringify(pi)]);
    if (verilmis) await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
      values ($1, $2, $3, 'fin-usta', '{"40": 10}'::jsonb, 10, true, '2026-11-28T08:10:00.000Z', false, false, 0, '{}'::jsonb) on conflict (id) do nothing`, [`${id}-a`, id, adimlar[0]]);
    return id;
  };
  const ID = {};
  // T1–T7, T9: reçetesiz tek adım (Dikim, 35 ₺) — hammadde yok. T8: Kesim (reçeteli, 30 ₺) + Saya (20 ₺), Kesim ekrandan verilir.
  for (const [no, ad, v] of [["B4T1", ["Dikim"]], ["B4T2", ["Dikim"]], ["B4T3", ["Dikim"]], ["B4T4", ["Dikim"]], ["B4T5", ["Dikim"]], ["B4T6", ["Dikim"]],
    ["B4T7", ["Dikim"]], ["B4T8", ["Kesim", "Saya"], false], ["B4T9", ["Dikim"]], ["B4T10", ["Kesim", "Saya"], false]]) ID[no] = await uretim(no, ad, v !== false);

  // ── ÖLÇÜM (sunucu)
  const stok = async (urun) => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' and olcu_ad = '40'`, [urun]))[0] || {}).m || 0);
  const cari = async (id) => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`, [id]))[0].t);
  const fisler = async (u) => { const r = (await q(`select count(*) filter (where not iptal) g, count(*) filter (where iptal) i from public.stk_fis where uretim_id = $1`, [u]))[0];
    return `${r.g} geçerli / ${r.i} iptal`; };
  const atamalar = async (u) => (await q(`select id, proses, miktar::float m, tamamlandi_mi t, tamir_mi tm, personel_id p from public.uretim_atamalari where uretim_id = $1 order by id`, [u]))
    .map((a) => `${a.proses}:${a.m}${a.tm ? "T" : ""}:${a.p || "-"}:${a.t ? "teslim" : "bekliyor"}`).sort();
  const foto = async () => ({ mamul: await stok("ekr-bot"), taban: await stok("fin-taban"), usta: await cari("fin-usta"), usta2: await cari("fin-usta2"), tamirci: await cari("fin-tamirci") });
  const fark = (a, b) => Object.fromEntries(Object.keys(b).map((x) => [x, Math.round((b[x] - a[x]) * 100) / 100]).filter(([, v]) => v !== 0));
  // DEFTER ÖZETİ (T9): yazılan her tablonun bütün satırları
  const defter = async () => (await q(`select string_agg(t || '=' || n || ':' || m, ' ' order by t) s from (
      select 'stk_fis' t, count(*) n, md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) m from public.stk_fis x
      union all select 'stk_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_hareket x
      union all select 'car_hareket', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.car_hareket x
      union all select 'uretim_atamalari', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.uretim_atamalari x
      union all select 'stk_stok', count(*), md5(coalesce(string_agg(md5(x::text), ',' order by md5(x::text)), '')) from public.stk_stok x) z`))[0].s;

  // ── EKRAN YARDIMCILARI
  const cihaz = async (ad) => { const c = await ekranAc(DB); c.ad = ad; c.sayfa.on("dialog", (d) => d.accept()); return c; };
  const kartAc = async (s, no) => {
    for (let i = 0; i < 20 && !(await s.locator('[data-nav="Üretim"]').count()); i++) await s.waitForTimeout(1000);
    if (!(await s.locator('[data-nav="Üretim"]').count())) console.log(`     ! menü yok: ${(await s.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 400)}`);
    await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200); };
  const dondur = async (c) => { await c.sayfa.route("**/rest/v1/degisiklik**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" })); };
  const yenile = async (c) => {
    if (YAYIN) return YAYIN.yenile(c);
    await c.sayfa.reload(); await c.sayfa.waitForTimeout(500);
    await c.sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
    // menü ([data-nav="Üretim"]) görünene kadar: giriş ekranı çıkarsa giriş yapılır (en çok 40 sn)
    for (let i = 0; i < 40; i++) {
      if (await c.sayfa.locator('[data-nav="Üretim"]').count()) break;
      const sifre = c.sayfa.locator('input[type="password"]:visible');
      if (await sifre.count()) { try { await girisYap(c.sayfa); } catch (x) { /* ekran değişti, yeniden bakılır */ } }
      await c.sayfa.waitForTimeout(1000);
    }
    if (!(await c.sayfa.locator('[data-nav="Üretim"]').count())) console.log(`     ! ${c.ad} yenileme sonrası menü yok: ${(await c.sayfa.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 300)}`);
    await c.sayfa.waitForTimeout(1500);
  };
  // İşi Ver: görünür "Kime" seçimi (⚠ Personel seçin seçenekli) + "İşi Ver" — kartta tek bekleyen adım varken
  const isVer = async (s, no, personel) => {
    if (!(await s.locator('button:has-text("İşi Ver"):visible').count())) await kartAc(s, no);
    await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption(personel);
    await s.waitForTimeout(300); await s.locator('button:has-text("İşi Ver"):visible').last().click(); await s.waitForTimeout(3500);
  };
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")';
  const TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")';
  // teslim formunu doldurur, düğmeyi döndürür (basmaz) — eşzamanlı basış için
  const teslimHazirla = async (s, no, { saglam, tamir = 0, tamirci = null, tamirUcret = null, form = 0 }) => {
    if (!(await s.locator("[data-teslim-al]:visible").count())) await kartAc(s, no);
    const f = s.locator("[data-teslim-al]:visible").nth(form).locator("xpath=ancestor::div[.//table][1]");
    await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill(String(saglam));
    if (tamir) {
      await f.locator("tr", { hasText: "TAMİR" }).locator("input").first().fill(String(tamir)); await s.waitForTimeout(300);
      if (tamirci) await f.locator("label", { hasText: "Tamiri kim yapacak" }).locator("select").selectOption(tamirci);
      if (tamirUcret != null) await f.locator("label", { hasText: "Tamir ücreti" }).locator("input").fill(String(tamirUcret));
    }
    await s.waitForTimeout(300);
    return s.locator("[data-teslim-al]:visible").nth(form);
  };
  const teslim = async (s, no, o) => { const d = await teslimHazirla(s, no, o); await d.click(); await s.waitForTimeout(3500); };
  const geriAlDugmeleri = async (s, no) => {
    for (let tur = 0; tur < 2; tur++) {
      if (await s.locator(GERI + ":visible").count()) return s.locator(GERI + ":visible");
      if (await s.locator(TAM + ":visible").count()) return s.locator(TAM + ":visible");
      const detay = s.getByText("detay / geri al");
      if ((await detay.count()) && (await detay.last().isVisible())) { await detay.last().click(); await s.waitForTimeout(900); continue; }
      await kartAc(s, no);
    }
    return s.locator(TAM + ":visible");
  };
  const geriAl = async (s, no, sira = 0) => { const d = await geriAlDugmeleri(s, no); const n = await d.count(); await d.nth(sira < 0 ? n + sira : sira).click(); await s.waitForTimeout(3500); };
  const toast = async (s) => (await toastlar(s)).replace(/\s+/g, " ").slice(0, 260);
  const ayni = async (...dugmeler) => { await Promise.all(dugmeler.map((d) => d.click())); };

  const A = await cihaz("A"), B = await cihaz("B");
  console.log(`ekran-uretim-b4 · ${DB} · kurallar ${A.ayar.fis_aktif ? "AÇIK" : "KAPALI"} · G-25 nesnesi ${(await q("select count(*) n from pg_proc where proname like 'g25%'"))[0].n}`
    + ` · B4 kurulu ${(await q("select count(*) n from pg_proc where proname like 'b4\\_%'"))[0].n > 0 ? "EVET" : "HAYIR"}`);
  const sonDurum = async (no) => { const u = ID[no]; console.log(`     ${no}: fiş ${await fisler(u)} · atamalar ${JSON.stringify(await atamalar(u))}`); };

  // T1 — iki cihaz aynı anda tam teslim
  { const no = "B4T1", u = ID[no]; console.log(`\n■ T1 · ${no} · iki cihaz AYNI ANDA tam teslim`);
    await kartAc(A.sayfa, no); await kartAc(B.sayfa, no); const o = await foto();
    const da = await teslimHazirla(A.sayfa, no, { saglam: 10 }), db = await teslimHazirla(B.sayfa, no, { saglam: 10 });
    await ayni(da, db); await A.sayfa.waitForTimeout(4000);
    k_("T1 tek teslim: mamul +10, taban −10, usta −350", fark(o, await foto()), { mamul: 10, usta: -350 });
    k_("T1 tek geçerli ÜRT fişi", await fisler(u), "1 geçerli / 0 iptal");
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)}`); await sonDurum(no); }

  // T2 — iki cihaz aynı anda kısmi teslim, sonra kalan
  { const no = "B4T2", u = ID[no]; console.log(`\n■ T2 · ${no} · iki cihaz AYNI ANDA kısmi teslim (6 / 6), sonra kalan 4`);
    await kartAc(A.sayfa, no); await kartAc(B.sayfa, no); const o = await foto();
    const da = await teslimHazirla(A.sayfa, no, { saglam: 6 }), db = await teslimHazirla(B.sayfa, no, { saglam: 6 });
    await ayni(da, db); await A.sayfa.waitForTimeout(4000);
    k_("T2a tek kısmi: +6 / −6 / −210", fark(o, await foto()), { mamul: 6, usta: -210 });
    k_("T2a atamalar: 6 teslim + kalan 4 bekliyor (tek kalan)", await atamalar(u), ["Dikim:4:fin-usta:bekliyor", "Dikim:6:fin-usta:teslim"]);
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)}`);
    await yenile(A); await teslim(A.sayfa, no, { saglam: 4 });
    k_("T2b kalan 4 → toplam +10 / −10 / −350", fark(o, await foto()), { mamul: 10, usta: -350 });
    k_("T2b iki geçerli fiş", await fisler(u), "2 geçerli / 0 iptal"); await sonDurum(no); }

  // T3 — A kısmi 6, bayat B tam 10
  { const no = "B4T3", u = ID[no]; console.log(`\n■ T3 · ${no} · A kısmi 6, bayat B tam 10`);
    await yenile(B); await kartAc(B.sayfa, no); await dondur(B); await kartAc(A.sayfa, no); const o = await foto();
    await teslim(A.sayfa, no, { saglam: 6 });
    if (await B.sayfa.locator("[data-teslim-al]:visible").count()) await teslim(B.sayfa, no, { saglam: 10 });
    k_("T3 yalnız A'nın kısmi teslimi: +6 / −6 / −210", fark(o, await foto()), { mamul: 6, usta: -210 });
    k_("T3 tek geçerli fiş, kalan 4 bekliyor", [await fisler(u), await atamalar(u)], ["1 geçerli / 0 iptal", ["Dikim:4:fin-usta:bekliyor", "Dikim:6:fin-usta:teslim"]]);
    console.log(`     B: ${await toast(B.sayfa)}`); await B.sayfa.unroute("**/rest/v1/degisiklik**"); }

  // T4 — teslim → iptal → yeniden teslim → bayat B iptal
  { const no = "B4T4", u = ID[no]; console.log(`\n■ T4 · ${no} · A teslim → A Geri Al → A yeniden teslim → bayat B Geri Al`);
    await kartAc(A.sayfa, no); const o = await foto();
    await teslim(A.sayfa, no, { saglam: 10 });
    await yenile(B); await kartAc(B.sayfa, no); await dondur(B);
    await geriAl(A.sayfa, no); await teslim(A.sayfa, no, { saglam: 10 });
    const ara = await foto();
    k_("T4a A'nın zinciri: +10 / −10 / −350, 1 geçerli + 1 iptal", [fark(o, ara), await fisler(u)], [{ mamul: 10, usta: -350 }, "1 geçerli / 1 iptal"]);
    await geriAl(B.sayfa, no);
    k_("T4b bayat B'nin Geri Al'ı defterleri DEĞİŞTİRMEDİ", fark(ara, await foto()), {});
    k_("T4b atama teslim, 1 geçerli fiş (tutarlı)", [await atamalar(u), await fisler(u)], [["Dikim:10:fin-usta:teslim"], "1 geçerli / 1 iptal"]);
    console.log(`     B: ${await toast(B.sayfa)}`); await B.sayfa.unroute("**/rest/v1/degisiklik**"); }

  // T5 — kısmi ilk parçanın bayat geri alınması, kalan parça teslimliyken
  { const no = "B4T5", u = ID[no]; console.log(`\n■ T5 · ${no} · A kısmi 6 → bayat B açık → A kalan 4'ü teslim → B ilk parçayı Geri Al`);
    await kartAc(A.sayfa, no); const o = await foto();
    await teslim(A.sayfa, no, { saglam: 6 });
    await yenile(B); await kartAc(B.sayfa, no); await dondur(B);
    await teslim(A.sayfa, no, { saglam: 4 });
    const ara = await foto();
    k_("T5a A: 6 + 4 → +10 / −10 / −350, 2 geçerli", [fark(o, ara), await fisler(u)], [{ mamul: 10, usta: -350 }, "2 geçerli / 0 iptal"]);
    await geriAl(B.sayfa, no, 0);
    const son = await foto();
    console.log(`     B: ${await toast(B.sayfa)}`); await sonDurum(no);
    const at = await atamalar(u), fs = await fisler(u);
    // Kabul edilebilir iki sonuç: (a) B reddedildi — hiçbir şey değişmedi; (b) yalnız İLK parça geri alındı: −6 / +6 / +210, kalan 4 teslimli kaldı
    const red = JSON.stringify(fark(ara, son)) === "{}" && fs === "2 geçerli / 0 iptal" && JSON.stringify(at) === JSON.stringify(["Dikim:4:fin-usta:teslim", "Dikim:6:fin-usta:teslim"]);
    const ilk = JSON.stringify(fark(ara, son)) === JSON.stringify({ mamul: -6, usta: 210 }) && fs === "1 geçerli / 1 iptal" && at.includes("Dikim:4:fin-usta:teslim");
    k_("T5b kalan parçanın teslimi bozulmadı (ret ya da yalnız ilk parça)", red || ilk, true);
    await B.sayfa.unroute("**/rest/v1/degisiklik**"); }

  // T6 — yanıt kaybı ve tekrar gönderme
  { const no = "B4T6", u = ID[no]; console.log(`\n■ T6 · ${no} · yanıt kaybı → yeniden Teslim Al; aynı istek iki kez; Geri Al yanıt kaybı → yeniden Geri Al`);
    await yenile(B); await kartAc(B.sayfa, no); const o = await foto();
    let mod = null, kayipAnahtar = null;
    await B.sayfa.route(/\/rest\/v1\/rpc\/fis_(kes|iptal_toplu)/, async (r) => {
      const istek = r.request();
      const govde = (() => { try { return JSON.parse(istek.postData() || "{}").p || {}; } catch (x) { return {}; } })();
      const anahtar = govde.istek || JSON.stringify(govde.fisler || govde.no || "");
      // "hepKayip": İLK gönderim sunucuya gider ve yanıtı düşer; aynı isteğin otomatik yeniden denemeleri de düşer (ağa çıkmaz) →
      // istemci sonunda "kaydedilemedi" der; kullanıcı yeniden basınca YENİ istek kimliği normal gider.
      if (kayipAnahtar && anahtar === kayipAnahtar) return r.abort("connectionreset");
      if (!mod) return r.fallback();
      const m = mod; mod = null;
      const sahte = { url: () => istek.url(), method: () => istek.method(), headers: () => istek.headers(), postData: () => istek.postData() };
      const bir = await B.k.__yanitla(sahte);
      if (m === "hepKayip") { kayipAnahtar = anahtar; return r.abort("connectionreset"); }
      if (m === "kayip") return r.abort("connectionreset");
      const iki = await B.k.__yanitla(sahte); return r.fulfill(iki);
    });
    mod = "hepKayip"; await teslim(B.sayfa, no, { saglam: 10 }); await B.sayfa.waitForTimeout(6000);
    console.log(`     yanıt kaybı sonrası B: ${await toast(B.sayfa)}`);
    k_("T6a sunucu ilk teslimi yazdı (yanıt kayboldu)", [fark(o, await foto()), await fisler(u)], [{ mamul: 10, usta: -350 }, "1 geçerli / 0 iptal"]);
    console.log(`     B'de teslim formu hâlâ açık (kullanıcı yeniden basabilir): ${(await B.sayfa.locator("[data-teslim-al]:visible").count()) > 0}`);
    if (await B.sayfa.locator("[data-teslim-al]:visible").count()) await teslim(B.sayfa, no, { saglam: 10 });
    kayipAnahtar = null;
    k_("T6b kullanıcı yeniden Teslim Al (yeni istek) → ikinci fiş YOK", [fark(o, await foto()), await fisler(u)], [{ mamul: 10, usta: -350 }, "1 geçerli / 0 iptal"]);
    console.log(`     yeniden Teslim Al sonrası B: ${await toast(B.sayfa)}`);
    await yenile(B); await kartAc(B.sayfa, no);
    mod = "hepKayip"; await geriAl(B.sayfa, no); await B.sayfa.waitForTimeout(6000);
    console.log(`     Geri Al yanıt kaybı sonrası B: ${await toast(B.sayfa)}`);
    k_("T6c Geri Al sunucuda yapıldı (yanıt kayboldu): defterler başlangıçta", [fark(o, await foto()), await fisler(u), await atamalar(u)], [{}, "0 geçerli / 1 iptal", ["Dikim:10:fin-usta:bekliyor"]]);
    const kalanGeri = await geriAlDugmeleri(B.sayfa, no).then((d) => d.count());
    console.log(`     B'de Geri Al hâlâ var: ${kalanGeri > 0}`);
    if (kalanGeri) await geriAl(B.sayfa, no);
    kayipAnahtar = null;
    k_("T6d yeniden Geri Al → değişiklik yok, atama tutarlı", [fark(o, await foto()), await fisler(u), await atamalar(u)], [{}, "0 geçerli / 1 iptal", ["Dikim:10:fin-usta:bekliyor"]]);
    await yenile(B); await kartAc(B.sayfa, no);
    mod = "tekrar"; await teslim(B.sayfa, no, { saglam: 10 });
    k_("T6e aynı istek ağda iki kez → tek fiş", [fark(o, await foto()), await fisler(u)], [{ mamul: 10, usta: -350 }, "1 geçerli / 1 iptal"]);
    await B.sayfa.unroute(/\/rest\/v1\/rpc\/fis_(kes|iptal_toplu)/); }

  // T7 — tamir: iki cihaz aynı anda tamir teslimi
  { const no = "B4T7", u = ID[no]; console.log(`\n■ T7 · ${no} · sağlam 7 + tamir 3 → iki cihaz AYNI ANDA tamiri teslim alır`);
    await kartAc(A.sayfa, no); const o = await foto();
    await teslim(A.sayfa, no, { saglam: 7, tamir: 3, tamirci: "fin-tamirci", tamirUcret: 5 });
    k_("T7a +7 (tamirdeki girmez), taban −10, usta −350", fark(o, await foto()), { mamul: 7, usta: -350 });
    await yenile(A); await yenile(B); await kartAc(A.sayfa, no); await kartAc(B.sayfa, no);
    const o2 = await foto();
    const da = await teslimHazirla(A.sayfa, no, { saglam: 3 }), db = await teslimHazirla(B.sayfa, no, { saglam: 3 });
    await ayni(da, db); await A.sayfa.waitForTimeout(4000);
    k_("T7b tek tamir teslimi: mamul +3, tamirci −15", fark(o2, await foto()), { mamul: 3, tamirci: -15 });
    k_("T7b fişler", await fisler(u), "2 geçerli / 0 iptal");
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)}`); await sonDurum(no); }

  // T8 — çok proses + hammadde (gerçek akış: Kesim ekrandan verilir → hammadde verirken düşer; teslim → Saya ver → Saya teslim)
  { const no = "B4T8", u = ID[no]; console.log(`\n■ T8 · ${no} · Kesim'i ver (hammadde) → teslim → bayat B yeniden Kesim → Saya'yı ver → iki cihaz AYNI ANDA Saya`);
    await yenile(A); await kartAc(A.sayfa, no); const o = await foto();
    await isVer(A.sayfa, no, "fin-usta");
    console.log(`     Kesim iş verme: ${await toast(A.sayfa)} · atamalar ${JSON.stringify(await atamalar(u))} · fiş ${await fisler(u)}`);
    k_("T8a iş verme: defterde değişiklik yok (1.744.37'de hammadde TESLİMDE düşer)", fark(o, await foto()), {});
    await yenile(B); await kartAc(B.sayfa, no); await dondur(B);
    await yenile(A); await kartAc(A.sayfa, no);
    const o1 = await foto();
    await teslim(A.sayfa, no, { saglam: 10 });
    k_("T8b Kesim teslimi: taban −10, usta −300, mamul YOK (ara adım)", fark(o1, await foto()), { taban: -10, usta: -300 });
    if (await B.sayfa.locator("[data-teslim-al]:visible").count()) await teslim(B.sayfa, no, { saglam: 10 });
    k_("T8c bayat B'nin Kesim'i ikinci kez yazılmadı (hammadde de)", fark(o1, await foto()), { taban: -10, usta: -300 });
    console.log(`     B: ${await toast(B.sayfa)} · fiş ${await fisler(u)}`); await B.sayfa.unroute("**/rest/v1/degisiklik**");
    await yenile(A); await kartAc(A.sayfa, no);
    await isVer(A.sayfa, no, "fin-usta2");
    console.log(`     Saya iş verme: ${await toast(A.sayfa)} · atamalar ${JSON.stringify(await atamalar(u))}`);
    await yenile(A); await yenile(B); await kartAc(A.sayfa, no); await kartAc(B.sayfa, no);
    const o2 = await foto(), f2 = await fisler(u);
    const da = await teslimHazirla(A.sayfa, no, { saglam: 10 }), db = await teslimHazirla(B.sayfa, no, { saglam: 10 });
    await ayni(da, db); await A.sayfa.waitForTimeout(4000);
    k_("T8d tek Saya teslimi: mamul +10, usta2 −200", fark(o2, await foto()), { mamul: 10, usta2: -200 });
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)} · fiş önce ${f2} sonra ${await fisler(u)}`); await sonDurum(no);
    k_("T8 toplam: taban −10, usta −300, usta2 −200, mamul +10", fark(o, await foto()), { mamul: 10, taban: -10, usta: -300, usta2: -200 }); }

  // T10 — gerçek akışta kısmi teslim + hammadde: Kesim'i ekrandan ver → 6 teslim → kalan 4 teslim → hammadde toplam 10 düşmeli
  { const no = "B4T10", u = ID[no]; console.log(`\n■ T10 · ${no} · Kesim'i ver → kısmi 6 → kalan 4 (hammadde toplamı)`);
    await yenile(A); await kartAc(A.sayfa, no); const o = await foto();
    await isVer(A.sayfa, no, "fin-usta");
    await yenile(A); await teslim(A.sayfa, no, { saglam: 6 });
    // 1.744.37: ilk teslim VERİLEN işin hammaddesini tümüyle düşer, kalan parça "hammaddeDusuldu" ile gelir
    k_("T10a kısmi 6: taban −10 (verilenin tamamı), usta −180", fark(o, await foto()), { taban: -10, usta: -180 });
    await yenile(A); await teslim(A.sayfa, no, { saglam: 4 });
    k_("T10b kalan 4 sonrası toplam: taban −10, usta −300", fark(o, await foto()), { taban: -10, usta: -300 });
    await sonDurum(no); }

  // T9 — son adımda hata
  { const no = "B4T9", u = ID[no]; console.log(`\n■ T9 · ${no} · son adımda hata (teslim: car_hareket; geri alma: atama yazımı)`);
    await q(`create or replace function public.b4_sinama_boz() returns trigger language plpgsql as $f$ begin raise exception 'SINAMA: son adımda hata'; end $f$`);
    await q(`create trigger b4_sinama_boz after insert on public.car_hareket for each row when (new.uretim_id = 'b4-b4t9') execute function public.b4_sinama_boz()`);
    await yenile(A); await kartAc(A.sayfa, no); const d0 = await defter(), o = await foto();
    await teslim(A.sayfa, no, { saglam: 10 });
    console.log(`     A: ${await toast(A.sayfa)}`);
    k_("T9a teslim son adımda düştü → bütün defterler AYNI", (await defter()) === d0, true);
    k_("T9a bakiyeler ve atama değişmedi", [fark(o, await foto()), await atamalar(u)], [{}, ["Dikim:10:fin-usta:bekliyor"]]);
    await q(`drop trigger b4_sinama_boz on public.car_hareket`);
    await yenile(A); await kartAc(A.sayfa, no); await teslim(A.sayfa, no, { saglam: 10 });
    k_("T9b hatasız teslim", fark(o, await foto()), { mamul: 10, usta: -350 });
    await q(`create trigger b4_sinama_boz after update on public.uretim_atamalari for each row when (new.uretim_id = 'b4-b4t9' and not new.tamamlandi_mi) execute function public.b4_sinama_boz()`);
    const d1 = await defter(), o1 = await foto();
    await geriAl(A.sayfa, no);
    console.log(`     A: ${await toast(A.sayfa)}`);
    k_("T9c geri alma son adımda düştü → bütün defterler AYNI, fiş geçerli", [(await defter()) === d1, await fisler(u), fark(o1, await foto())], [true, "1 geçerli / 0 iptal", {}]);
    await q(`drop trigger b4_sinama_boz on public.uretim_atamalari`); await q(`drop function public.b4_sinama_boz()`); }

  if (YAYIN) { console.log(`\n■ yayın paketi ${require("path").basename(process.env.YAYIN_HTML)} · sha256 ${process.env.YAYIN_SHA}`);
    k_("canlı / G-25 deneme projesine giden istek ya da WebSocket YOK", YAYIN.disIstekler, []); }
  k_("sayfa hatası yok (A)", A.hatalar, []);
  k_("sayfa hatası yok (B)", B.hatalar, []);
  await A.tarayici.close(); await B.tarayici.close();
  console.log(`\n── ekran-uretim-b4: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
